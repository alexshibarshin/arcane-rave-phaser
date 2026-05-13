import Phaser from 'phaser';
import { StageFlowConfig } from '@config/StageFlowConfig';
import type { StageRuntime } from '@stage/StageRuntime';
import {
  attemptMergeStagePawnSlots,
  attemptPurchaseStagePawnIntoMergeSlot,
  getStageRepositionCost,
  purchaseStagePawnIntoSlot,
  repositionStagePawn,
} from '@stage/StageRuntime';
import { getMergeTargets, getMergeTargetsForPawn } from '@stage/StageBuild';
import { findPawnDefinition, getPawnAccentColor } from './StageRenderHelpers';
import type { StageRecordView } from './StageRecordView';
import type { StageShopView } from './StageShopView';
import type { StageTooltipController } from './StageTooltipController';
import { resolveStageDropTarget } from './StageDropTarget';

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
  onPending: () => void;
  onStatusChanged: (message: string | null) => void;
  onSellDragStart?: (pawnId: string, tier: number, slotIndex: number) => void;
  onSellAttempt?: (slotIndex: number) => boolean;
  onSellDragEnd?: () => void;
}

export class StageDragController {
  private activeDropSlotIndex: number | null = null;
  private activeDragPayload: DragPayload | null = null;

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
        this.updateMergeHighlights(payload);
        this.activeDragPayload = payload;

        if (payload.kind === 'slot-pawn') {
          this.callbacks.onSellDragStart?.(payload.pawnId, payload.tier, payload.slotIndex);
        }
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

        const target = this.getDropTarget(pointer.worldX, pointer.worldY);
        gameObject.setDepth(0);
        gameObject.setScale(1);

        let applied = false;
        let pending = false;
        let errorMsg: string | null = null;
        const runtime = this.getRuntime();

        if (target.kind === 'sell') {
          const slotIndex = payload.kind === 'slot-pawn' ? payload.slotIndex : -1;
          applied = this.callbacks.onSellAttempt?.(slotIndex) ?? false;
          if (applied) {
            this.callbacks.onSellDragEnd?.();
          }
        } else if (payload.kind === 'shop-offer' && target.kind === 'slot' && target.slotIndex !== undefined) {
          const targetSlotIndex = target.slotIndex!;
          const def = findPawnDefinition(payload.pawnId);
          const price = def?.shopPrice ?? StageFlowConfig.SHOP_PURCHASE_COST;
          applied = purchaseStagePawnIntoSlot(runtime, payload.offerIndex, targetSlotIndex);
          if (!applied) {
            const mergeResult = attemptPurchaseStagePawnIntoMergeSlot(runtime, payload.offerIndex, targetSlotIndex);
            applied = mergeResult === 'applied';
            pending = mergeResult === 'pending';
          }
          errorMsg = applied || pending
            ? null
            : `Need ${price} coins and either an empty slot or a matching same-tier pawn.`;
        }

        if (payload.kind === 'slot-pawn' && target.kind === 'slot') {
          const targetSlotIndex = target.slotIndex!;
          if (targetSlotIndex !== null) {
            const repositionCost = getStageRepositionCost(runtime);
            const mergeResult = attemptMergeStagePawnSlots(runtime, payload.slotIndex, targetSlotIndex);
            applied = mergeResult === 'applied';
            pending = mergeResult === 'pending';
            errorMsg = applied || pending
              ? null
              : repositionCost > 0
                ? `Need ${repositionCost} coin and a different destination slot to move.`
                : 'Need a different destination slot to move.';

            if (!applied && !pending) {
              applied = repositionStagePawn(runtime, payload.slotIndex, targetSlotIndex);
              errorMsg = applied
                ? null
                : repositionCost > 0
                  ? `Need matching duplicate to merge, or ${repositionCost} coin and a different destination slot to move.`
                  : 'Need matching duplicate to merge, or a different destination slot to move.';
            }
          }
        }

        this.clearSlotHighlights();
        this.tooltipController.setDragLocked(false);
        this.callbacks.onStatusChanged(errorMsg);

        if (payload.kind === 'slot-pawn') {
          this.callbacks.onSellDragEnd?.();
        }

        if (applied) {
          this.callbacks.onApplied();
          if (target.kind === 'slot' && target.slotIndex !== undefined) {
            this.tooltipController.showCompatibilityLinkIfApplicable(target.slotIndex!);
          }
        } else if (pending) {
          gameObject.x = payload.homeX;
          gameObject.y = payload.homeY;
          this.callbacks.onPending();
        } else {
          gameObject.x = payload.homeX;
          gameObject.y = payload.homeY;
          this.callbacks.onFailed();
        }

        this.activeDragPayload = null;
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

  getDropTarget(worldX: number, worldY: number): { kind: 'sell' | 'slot' | 'none'; slotIndex?: number } {
    return resolveStageDropTarget({
      closestSlotIndex: this.getClosestSlotIndex(worldX, worldY),
      sellOverlayVisible: this.shopView.isSellOverlayVisible(),
      sellOverlayContainsPoint: this.shopView.containsSellOverlayPoint(worldX, worldY),
      canSell: this.callbacks.onSellAttempt !== undefined,
      activeDragKind: this.activeDragPayload?.kind ?? null,
    });
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

  private updateMergeHighlights(payload: DragPayload): void {
    const runtime = this.getRuntime();
    let targetIndices: number[];

    if (payload.kind === 'slot-pawn') {
      targetIndices = getMergeTargets(runtime.build, payload.slotIndex);
    } else {
      targetIndices = getMergeTargetsForPawn(runtime.build, { pawnId: payload.pawnId, tier: 1 });
    }

    if (targetIndices.length === 0) {
      this.recordView.hideMergeHighlights();
      return;
    }

    const def = findPawnDefinition(payload.pawnId);
    const accentColor = def ? getPawnAccentColor(def.color) : 0x8ef7ff;
    this.recordView.showMergeHighlights(targetIndices, accentColor);
  }

  private clearSlotHighlights(): void {
    this.activeDropSlotIndex = null;
    this.recordView.slotViews.forEach((slotView) => slotView.glow.setAlpha(0));
    this.recordView.hideMergeHighlights();
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
