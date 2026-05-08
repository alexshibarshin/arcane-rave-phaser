import Phaser from 'phaser';
import { StageFlowConfig } from '@config/StageFlowConfig';
import type { StageRuntime } from '@stage/StageRuntime';
import {
  purchaseStagePawnIntoSlot,
  purchaseStagePawnIntoMergeSlot,
  mergeStagePawnSlots,
  repositionStagePawn,
} from '@stage/StageRuntime';
import type { StageRecordView } from './StageRecordView';
import type { StageShopView } from './StageShopView';
import type { StageTooltipController } from './StageTooltipController';

type DragPayload =
  | {
      kind: 'shop-offer';
      offerIndex: number;
      pawnId: string;
      homeX: number;
      homeY: number;
    }
  | {
      kind: 'slot-pawn';
      slotIndex: number;
      pawnId: string;
      tier: number;
      homeX: number;
      homeY: number;
    };

export interface StageDragCallbacks {
  onApplied: () => void;
  onFailed: () => void;
  onStatusChanged: (message: string | null) => void;
}

export class StageDragController {
  private activeDropSlotIndex: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly recordView: StageRecordView,
    private readonly shopView: StageShopView,
    private readonly tooltipController: StageTooltipController,
    private readonly getRuntime: () => StageRuntime,
    private readonly isTransitioning: () => boolean,
    private readonly callbacks: StageDragCallbacks,
  ) {}

  bind(): void {
    this.scene.input.on(
      Phaser.Input.Events.DRAG_START,
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (!(gameObject instanceof Phaser.GameObjects.Container)) {
          return;
        }

        const payload = this.resolvePayload(gameObject);
        if (!payload || this.getRuntime().phase !== 'build' || this.isTransitioning()) {
          return;
        }

        gameObject.setDepth(5000);
        gameObject.setScale(1.06);
        this.tooltipController.setDragLocked(true);
      },
    );

    this.scene.input.on(
      Phaser.Input.Events.DRAG,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (!(gameObject instanceof Phaser.GameObjects.Container)) {
          return;
        }

        const payload = this.resolvePayload(gameObject);
        if (!payload) {
          return;
        }

        gameObject.x = dragX;
        gameObject.y = dragY;
        this.updateActiveDropSlot(pointer.worldX, pointer.worldY);
      },
    );

    this.scene.input.on(
      Phaser.Input.Events.DRAG_END,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (!(gameObject instanceof Phaser.GameObjects.Container)) {
          return;
        }

        const payload = this.resolvePayload(gameObject);
        if (!payload) {
          return;
        }

        const targetSlotIndex = this.getClosestSlotIndex(pointer.worldX, pointer.worldY);
        gameObject.setDepth(0);
        gameObject.setScale(1);

        let applied = false;
        let errorMsg: string | null = null;
        const runtime = this.getRuntime();

        if (payload.kind === 'shop-offer' && targetSlotIndex !== null) {
          applied = purchaseStagePawnIntoSlot(runtime, payload.offerIndex, targetSlotIndex);
          if (!applied) {
            applied = purchaseStagePawnIntoMergeSlot(runtime, payload.offerIndex, targetSlotIndex);
          }
          errorMsg = applied
            ? null
            : `Need ${StageFlowConfig.SHOP_PURCHASE_COST} coins and either an empty slot or a matching same-tier pawn.`;
        }

        if (payload.kind === 'slot-pawn' && targetSlotIndex !== null) {
          applied = mergeStagePawnSlots(runtime, payload.slotIndex, targetSlotIndex);
          errorMsg = applied ? null : `Need ${StageFlowConfig.REPOSITION_COST} coin and a different destination slot to move.`;

          if (!applied) {
            applied = repositionStagePawn(runtime, payload.slotIndex, targetSlotIndex);
            errorMsg = applied
              ? null
              : 'Need matching duplicate to merge, or 1 coin and a different destination slot to move.';
          }
        }

        this.clearSlotHighlights();
        this.tooltipController.setDragLocked(false);
        this.callbacks.onStatusChanged(errorMsg);

        if (applied) {
          this.callbacks.onApplied();
          if (targetSlotIndex !== null) {
            this.tooltipController.showCompatibilityLinkIfApplicable(targetSlotIndex);
          }
        } else {
          gameObject.x = payload.homeX;
          gameObject.y = payload.homeY;
          this.callbacks.onFailed();
        }
      },
    );

    this.scene.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.tooltipController.clearOnPointerUp();
    });
  }

  unbind(): void {
    this.scene.input.off(Phaser.Input.Events.DRAG_START);
    this.scene.input.off(Phaser.Input.Events.DRAG);
    this.scene.input.off(Phaser.Input.Events.DRAG_END);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP);
  }

  private resolvePayload(gameObject: Phaser.GameObjects.Container): DragPayload | null {
    const shopCard = this.shopView.cardViews.find((cv) => cv.container === gameObject);
    if (shopCard) {
      return {
        kind: 'shop-offer',
        offerIndex: shopCard.offerIndex,
        pawnId: shopCard.pawnId,
        homeX: gameObject.getData('homeX') as number,
        homeY: gameObject.getData('homeY') as number,
      };
    }

    const slotView = this.recordView.slotViews.find((sv) => sv.pawnContainer === gameObject);
    if (slotView) {
      const runtime = this.getRuntime();
      const pawnInstance = runtime.build.slots[slotView.slotIndex];
      return {
        kind: 'slot-pawn',
        slotIndex: slotView.slotIndex,
        pawnId: pawnInstance?.pawnId ?? '',
        tier: pawnInstance?.tier ?? 1,
        homeX: gameObject.getData('homeX') as number,
        homeY: gameObject.getData('homeY') as number,
      };
    }

    return null;
  }

  private updateActiveDropSlot(worldX: number, worldY: number): void {
    const slotIndex = this.getClosestSlotIndex(worldX, worldY);
    if (slotIndex === this.activeDropSlotIndex) {
      return;
    }

    this.activeDropSlotIndex = slotIndex;
    this.recordView.slotViews.forEach((slotView) => {
      slotView.glow.setAlpha(slotView.slotIndex === slotIndex ? 1 : 0);
    });
  }

  private clearSlotHighlights(): void {
    this.activeDropSlotIndex = null;
    this.recordView.slotViews.forEach((slotView) => slotView.glow.setAlpha(0));
  }

  private getClosestSlotIndex(worldX: number, worldY: number): number | null {
    const runtime = this.getRuntime();
    if (runtime.phase !== 'build' || !this.recordView.container) {
      return null;
    }

    let closestSlotIndex: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const slotView of this.recordView.slotViews) {
      const slotWorldX = this.recordView.container.x + slotView.anchorX;
      const slotWorldY = this.recordView.container.y + slotView.anchorY;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, slotWorldX, slotWorldY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestSlotIndex = slotView.slotIndex;
      }
    }

    return closestDistance <= 88 ? closestSlotIndex : null;
  }
}
