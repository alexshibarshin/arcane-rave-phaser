import Phaser from 'phaser';
import { CombatContentConfig, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { CombatWaveConfig, getCombatWaveDefinition } from '@config/CombatWaveConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { SceneKeys } from '@config/GameConfig';
import { emit, off, on } from '@events/EventBus';
import {
  canStageStartWave,
  createStageRuntime,
  getStageCombatLoadout,
  purchaseStagePawnIntoSlot,
  repositionStagePawn,
  requestStageWaveStart,
  resolveStageCombatOutcome,
  type StageRuntime,
} from '@stage/StageRuntime';
import { createStageWavePreview } from '@stage/StageWavePreview';

interface StageRecordSlotView {
  slotIndex: number;
  anchorX: number;
  anchorY: number;
  zone: Phaser.GameObjects.Zone;
  glow: Phaser.GameObjects.Graphics;
  pawnContainer?: Phaser.GameObjects.Container;
}

interface StageShopCardView {
  offerIndex: number;
  pawnId: string;
  container: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
}

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
      homeX: number;
      homeY: number;
    };

type PendingSelection =
  | {
      kind: 'shop-offer';
      offerIndex: number;
      pawnId: string;
    }
  | {
      kind: 'slot-pawn';
      slotIndex: number;
      pawnId: string;
    };

export class StageScene extends Phaser.Scene {
  private runtime!: StageRuntime;
  private titleLabel?: Phaser.GameObjects.Text;
  private phaseLabel?: Phaser.GameObjects.Text;
  private coinsLabel?: Phaser.GameObjects.Text;
  private waveLabel?: Phaser.GameObjects.Text;
  private previewTitleLabel?: Phaser.GameObjects.Text;
  private previewBodyLabel?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private startWaveButton?: Phaser.GameObjects.Text;
  private previewCard?: Phaser.GameObjects.Container;
  private recordContainer?: Phaser.GameObjects.Container;
  private recordPawnLayer?: Phaser.GameObjects.Container;
  private shopPanel?: Phaser.GameObjects.Container;
  private shopCardsLayer?: Phaser.GameObjects.Container;
  private readonly slotViews: StageRecordSlotView[] = [];
  private readonly shopCardViews: StageShopCardView[] = [];
  private activeDropSlotIndex: number | null = null;
  private isTransitioning = false;
  private transientStatusText: string | null = null;
  private pendingSelection: PendingSelection | null = null;

  constructor() {
    super({ key: SceneKeys.STAGE });
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.runtime = createStageRuntime({
      totalWaves: CombatWaveConfig.WAVES.length,
      initialCoins: StageFlowConfig.INITIAL_COINS,
    });

    this.renderBuildPhaseLayout();
    this.bindDragEvents();
    on('stage:start-wave-requested', this.handleStartWaveRequested);
    on('combat:ended', this.handleCombatEnded);

    this.refreshBuildUI();
    this.publishSnapshot();
    this.syncPresentation();
    this.playBuildPhaseIntro(false);
    emit('scene:ready', { key: this.scene.key });
    emit('stage:scene-ready', { key: this.scene.key, phase: this.runtime.phase });
    emit('game:ready');
  }

  private renderBuildPhaseLayout(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#070d16');

    const backdrop = this.add.graphics();
    backdrop.fillGradientStyle(0x07111d, 0x07111d, 0x150d23, 0x150d23, 1);
    backdrop.fillRect(0, 0, width, height);
    backdrop.fillStyle(0x102235, 0.18);
    backdrop.fillEllipse(width / 2, height * 0.18, width * 0.9, 220);
    backdrop.fillStyle(0x09111d, 0.9);
    backdrop.fillRoundedRect(0, height - 310, width, 310, 40);
    this.add.rectangle(width / 2, StagePresentationConfig.HEADER_LINE_Y, width - 76, 2, 0x57d9ff, 0.46);

    this.previewCard = this.createPreviewCard();
    this.recordContainer = this.createBuildRecord();
    this.shopPanel = this.createShopPanel();

    this.titleLabel = this.add.text(width / 2, StagePresentationConfig.HEADER_Y, 'Arcane Rave', {
      color: '#f5f7ff',
      fontFamily: 'monospace',
      fontSize: '44px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.phaseLabel = this.add.text(52, 176, '', {
      color: '#8ef7ff',
      fontFamily: 'monospace',
      fontSize: '22px',
    });

    this.coinsLabel = this.add.text(width - 52, 176, '', {
      color: '#ffe08e',
      fontFamily: 'monospace',
      fontSize: '22px',
      align: 'right',
    }).setOrigin(1, 0);

    this.waveLabel = this.add.text(width / 2, 204, '', {
      color: '#f5f7ff',
      fontFamily: 'monospace',
      fontSize: '34px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.statusLabel = this.add.text(width / 2, StagePresentationConfig.STATUS_PILL_Y, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '20px',
      align: 'center',
      wordWrap: { width: width - 144 },
    }).setOrigin(0.5, 0.5);

    this.startWaveButton = this.add.text(width / 2, StagePresentationConfig.START_BUTTON_Y, 'Start Wave', {
      color: '#071019',
      backgroundColor: '#8ef7ff',
      fontFamily: 'monospace',
      fontSize: '30px',
      align: 'center',
      padding: {
        left: 30,
        right: 30,
        top: 18,
        bottom: 18,
      },
    }).setOrigin(0.5, 0.5);
    this.startWaveButton.setInteractive({ useHandCursor: true });
    this.startWaveButton.on('pointerdown', this.handleStartWavePressed);
  }

  private createPreviewCard(): Phaser.GameObjects.Container {
    const container = this.add.container(
      StagePresentationConfig.PREVIEW_CARD_X,
      StagePresentationConfig.PREVIEW_CARD_Y,
    );
    const graphics = this.add.graphics();
    const width = StagePresentationConfig.PREVIEW_CARD_WIDTH;
    const height = StagePresentationConfig.PREVIEW_CARD_HEIGHT;
    const x = -width / 2;
    const y = -height / 2;

    graphics.fillStyle(0x0d1725, 0.92);
    graphics.fillRoundedRect(x, y, width, height, 28);
    graphics.fillStyle(0x14314a, 0.35);
    graphics.fillRoundedRect(x + 14, y + 14, width - 28, 52, 18);
    graphics.lineStyle(2, 0x56d6ff, 0.5);
    graphics.strokeRoundedRect(x, y, width, height, 28);
    graphics.lineStyle(1, 0xff7ab6, 0.45);
    graphics.strokeRoundedRect(x + 16, y + 78, width - 32, height - 96, 20);

    const eyebrow = this.add.text(x + 28, y + 28, 'NEXT WAVE PREVIEW', {
      color: '#81cfff',
      fontFamily: 'monospace',
      fontSize: '18px',
    });
    this.previewTitleLabel = this.add.text(x + 28, y + 88, '', {
      color: '#f5f7ff',
      fontFamily: 'monospace',
      fontSize: '24px',
    });
    this.previewBodyLabel = this.add.text(x + 28, y + 130, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '21px',
      lineSpacing: 10,
      wordWrap: { width: width - 56 },
    });

    container.add([graphics, eyebrow, this.previewTitleLabel, this.previewBodyLabel]);
    return container;
  }

  private createBuildRecord(): Phaser.GameObjects.Container {
    const container = this.add.container(
      StagePresentationConfig.RECORD_CENTER_X,
      StagePresentationConfig.BUILD_RECORD_CENTER_Y,
    );
    const graphics = this.add.graphics();
    const slotCount = CombatContentConfig.SLOT_COUNT;
    const radius = StagePresentationConfig.BUILD_RECORD_RADIUS;
    const innerRadius = radius * 0.64;
    const labelRadius = radius * 0.82;
    const pawnRadius = radius * 0.68;

    graphics.fillStyle(0x16111f, 1);
    graphics.fillCircle(0, 0, radius);
    graphics.lineStyle(12, 0x2a1f39, 1);
    graphics.strokeCircle(0, 0, radius - 6);
    graphics.lineStyle(2, 0x5bdfff, 0.22);
    graphics.strokeCircle(0, 0, innerRadius);
    graphics.fillStyle(0x0a0e15, 1);
    graphics.fillCircle(0, 0, StagePresentationConfig.BUILD_RECORD_INNER_RADIUS);
    container.add(graphics);

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const startAngleDeg = -90 + (360 / slotCount) * slotIndex - (360 / slotCount) / 2;
      const endAngleDeg = startAngleDeg + 360 / slotCount;
      const angleDeg = -90 + (360 / slotCount) * slotIndex;
      const chipAnchor = getPolarOffset(angleDeg, labelRadius);
      const pawnAnchor = getPolarOffset(angleDeg, pawnRadius);

      const slotArc = this.add.graphics();
      slotArc.fillStyle(slotIndex % 2 === 0 ? 0x19253a : 0x111b2b, 0.34);
      this.fillSector(slotArc, 0, 0, radius - 18, startAngleDeg, endAngleDeg);
      slotArc.lineStyle(2, slotIndex === 0 ? 0xffd166 : 0x71c8ff, slotIndex === 0 ? 0.9 : 0.44);
      this.strokeSector(slotArc, 0, 0, radius - 18, startAngleDeg, endAngleDeg);

      const slotChip = this.add.graphics();
      slotChip.fillStyle(slotIndex % 3 === 0 ? 0x14283a : 0x0f1724, 1);
      slotChip.fillRoundedRect(chipAnchor.x - 24, chipAnchor.y - 16, 48, 32, 12);
      slotChip.lineStyle(2, slotIndex % 3 === 0 ? 0xff7ab6 : 0x57d9ff, 0.7);
      slotChip.strokeRoundedRect(chipAnchor.x - 24, chipAnchor.y - 16, 48, 32, 12);

      const label = this.add.text(chipAnchor.x, chipAnchor.y, `${slotIndex + 1}`, {
        color: '#d9e9f8',
        fontFamily: 'monospace',
        fontSize: '18px',
      }).setOrigin(0.5, 0.5);

      const glow = this.add.graphics();
      glow.setAlpha(0);
      glow.fillStyle(0x8ef7ff, 0.18);
      glow.fillCircle(pawnAnchor.x, pawnAnchor.y, 46);
      glow.lineStyle(3, 0x8ef7ff, 0.95);
      glow.strokeCircle(pawnAnchor.x, pawnAnchor.y, 52);

      const zone = this.add.zone(pawnAnchor.x, pawnAnchor.y, 120, 120);
      zone.setRectangleDropZone(120, 120);
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive();
      zone.on('pointerdown', () => this.handleSlotPressed(slotIndex));

      container.add([slotArc, slotChip, label, glow, zone]);

      this.slotViews.push({
        slotIndex,
        anchorX: pawnAnchor.x,
        anchorY: pawnAnchor.y,
        zone,
        glow,
      });
    }

    const needle = this.add.graphics();
    needle.lineStyle(6, 0xb7f9ff, 0.95);
    needle.beginPath();
    needle.moveTo(0, -radius - 72);
    needle.lineTo(0, -radius + 6);
    needle.strokePath();
    needle.fillStyle(0xffd166, 1);
    needle.fillTriangle(0, -radius - 8, -12, -radius + 18, 12, -radius + 18);

    const centerGlow = this.add.graphics();
    centerGlow.fillStyle(0x8ef7ff, 0.22);
    centerGlow.fillCircle(0, 0, 32);
    centerGlow.lineStyle(2, 0x8ef7ff, 0.7);
    centerGlow.strokeCircle(0, 0, 48);

    this.recordPawnLayer = this.add.container(0, 0);
    container.add([this.recordPawnLayer, needle, centerGlow]);

    return container;
  }

  private createShopPanel(): Phaser.GameObjects.Container {
    const width = StagePresentationConfig.SHOP_PANEL_WIDTH;
    const height = StagePresentationConfig.SHOP_PANEL_HEIGHT;
    const container = this.add.container(width / 2, StagePresentationConfig.SHOP_PANEL_Y);
    const background = this.add.graphics();
    const x = -width / 2;
    const y = -height / 2;

    background.fillStyle(0x08111b, 0.98);
    background.fillRoundedRect(x, y, width, height, 30);
    background.fillStyle(0x11263a, 0.38);
    background.fillRoundedRect(x + 20, y + 18, width - 40, 52, 20);
    background.lineStyle(2, 0x57d9ff, 0.5);
    background.strokeRoundedRect(x, y, width, height, 30);

    const title = this.add.text(x + 32, y + 30, 'SHOP', {
      color: '#f5f7ff',
      fontFamily: 'monospace',
      fontSize: '28px',
    });
    const subtitle = this.add.text(
      x + 132,
      y + 34,
      `Buy ${StageFlowConfig.SHOP_PURCHASE_COST}c  •  Move ${StageFlowConfig.REPOSITION_COST}c`,
      {
        color: '#7fbddb',
        fontFamily: 'monospace',
        fontSize: '15px',
      },
    );

    this.shopCardsLayer = this.add.container(0, 0);
    container.add([background, title, subtitle, this.shopCardsLayer]);
    return container;
  }

  private bindDragEvents(): void {
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (!this.isInteractiveBuildObject(gameObject)) {
          return;
        }

        const payload = gameObject.getData('dragPayload') as DragPayload | undefined;
        if (!payload || this.runtime.phase !== 'build' || this.isTransitioning) {
          return;
        }

        gameObject.setDepth(5000);
        gameObject.setScale(1.06);
        this.pendingSelection = null;
        this.transientStatusText = null;
        this.syncPresentation();
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (!this.isInteractiveBuildObject(gameObject)) {
          return;
        }

        const payload = gameObject.getData('dragPayload') as DragPayload | undefined;
        if (!payload) {
          return;
        }

        gameObject.x = dragX;
        gameObject.y = dragY;
        this.updateActiveDropSlot(pointer.worldX, pointer.worldY);
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (!this.isInteractiveBuildObject(gameObject)) {
          return;
        }

        const payload = gameObject.getData('dragPayload') as DragPayload | undefined;
        if (!payload) {
          return;
        }

        const targetSlotIndex = this.getClosestSlotIndex(pointer.worldX, pointer.worldY);
        gameObject.setDepth(0);
        gameObject.setScale(1);

        let applied = false;

        if (payload.kind === 'shop-offer' && targetSlotIndex !== null) {
          applied = purchaseStagePawnIntoSlot(this.runtime, payload.offerIndex, targetSlotIndex);
          this.transientStatusText = applied
            ? null
            : `Need ${StageFlowConfig.SHOP_PURCHASE_COST} coins and an empty slot to buy.`;
        }

        if (payload.kind === 'slot-pawn' && targetSlotIndex !== null) {
          applied = repositionStagePawn(this.runtime, payload.slotIndex, targetSlotIndex);
          this.transientStatusText = applied
            ? null
            : `Need ${StageFlowConfig.REPOSITION_COST} coin and a different destination slot to move.`;
        }

        this.clearSlotHighlights();

        if (applied) {
          this.refreshBuildUI();
          this.publishSnapshot();
        } else {
          gameObject.x = payload.homeX;
          gameObject.y = payload.homeY;
          this.syncPresentation();
        }
      },
    );
  }

  private refreshBuildUI(): void {
    this.refreshRecordPawnViews();
    this.refreshShopCards();
    this.syncPresentation();
  }

  private refreshRecordPawnViews(): void {
    this.slotViews.forEach((slotView) => {
      slotView.pawnContainer?.destroy();
      slotView.pawnContainer = undefined;
    });

    for (const slotView of this.slotViews) {
      const pawnId = this.runtime.build.slots[slotView.slotIndex];
      if (!pawnId) {
        continue;
      }

      const pawnDefinition = findPawnDefinition(pawnId);
      if (!pawnDefinition || !this.recordPawnLayer) {
        continue;
      }

      const pawnContainer = this.createSlotPawn(
        slotView.anchorX,
        slotView.anchorY,
        slotView.slotIndex,
        pawnDefinition,
      );
      slotView.pawnContainer = pawnContainer;
      this.recordPawnLayer.add(pawnContainer);
    }
  }

  private createSlotPawn(
    x: number,
    y: number,
    slotIndex: number,
    pawn: CombatPawnDefinition,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const accent = getPawnAccentColor(pawn.color);
    const graphics = this.add.graphics();

    graphics.fillStyle(0x0f1926, 1);
    graphics.fillRoundedRect(-42, -42, 84, 84, 24);
    graphics.fillStyle(accent, 0.16);
    graphics.fillRoundedRect(-34, -34, 68, 22, 12);
    graphics.lineStyle(3, accent, 0.82);
    graphics.strokeRoundedRect(-42, -42, 84, 84, 24);
    graphics.fillStyle(accent, 0.95);
    graphics.fillCircle(0, -10, pawn.type === 'generator' ? 13 : 15);

    if (pawn.type === 'finisher') {
      graphics.lineStyle(4, 0xf7f1ff, 0.9);
      graphics.strokeCircle(0, -10, 22);
    } else {
      graphics.lineStyle(3, 0xdffcff, 0.8);
      graphics.beginPath();
      graphics.moveTo(-16, 12);
      graphics.lineTo(16, 12);
      graphics.strokePath();
    }

    const typeLabel = this.add.text(0, 16, pawn.type === 'generator' ? 'GEN' : 'FIN', {
      color: '#f5f7ff',
      fontFamily: 'monospace',
      fontSize: '16px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    const colorLabel = this.add.text(0, 32, pawn.color.toUpperCase(), {
      color: '#8fb8d3',
      fontFamily: 'monospace',
      fontSize: '11px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    container.add([graphics, typeLabel, colorLabel]);
    container.setSize(92, 92);
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, 46),
      Phaser.Geom.Circle.Contains,
    );
    this.input.setDraggable(container);
    container.setData('dragPayload', {
      kind: 'slot-pawn',
      slotIndex,
      pawnId: pawn.id,
      homeX: x,
      homeY: y,
    } satisfies DragPayload);

    if (container.input) {
      container.input.cursor = 'grab';
    }

    container.on('pointerdown', () => {
      this.pendingSelection = {
        kind: 'slot-pawn',
        slotIndex,
        pawnId: pawn.id,
      };
      this.transientStatusText = `Selected ${formatPawnTitle(pawn)}. Tap another slot to move or swap.`;
      this.syncPresentation();
    });

    return container;
  }

  private refreshShopCards(): void {
    this.shopCardViews.forEach((card) => {
      card.hitZone.destroy();
      card.container.destroy();
    });
    this.shopCardViews.length = 0;

    if (!this.shopCardsLayer) {
      return;
    }

    const cards = this.runtime.build.shopOffers;
    const totalWidth =
      cards.length * StagePresentationConfig.SHOP_CARD_WIDTH
      + Math.max(0, cards.length - 1) * StagePresentationConfig.SHOP_CARD_GAP;
    const startX = -totalWidth / 2 + StagePresentationConfig.SHOP_CARD_WIDTH / 2;

    cards.forEach((pawnId, offerIndex) => {
      const pawn = findPawnDefinition(pawnId);
      if (!pawn) {
        return;
      }

      const x = startX + offerIndex * (StagePresentationConfig.SHOP_CARD_WIDTH + StagePresentationConfig.SHOP_CARD_GAP);
      const cardView = this.createShopCard(x, 30, offerIndex, pawn);
      this.shopCardViews.push(cardView);
      this.shopCardsLayer?.add(cardView.container);
    });
  }

  private createShopCard(
    x: number,
    y: number,
    offerIndex: number,
    pawn: CombatPawnDefinition,
  ): StageShopCardView {
    const container = this.add.container(x, y);
    const hitZone = this.add.zone(x, y, StagePresentationConfig.SHOP_CARD_WIDTH, StagePresentationConfig.SHOP_CARD_HEIGHT);
    const graphics = this.add.graphics();
    const width = StagePresentationConfig.SHOP_CARD_WIDTH;
    const height = StagePresentationConfig.SHOP_CARD_HEIGHT;
    const left = -width / 2;
    const top = -height / 2;
    const accent = getPawnAccentColor(pawn.color);

    graphics.fillStyle(0x101925, 1);
    graphics.fillRoundedRect(left, top, width, height, 22);
    graphics.fillStyle(accent, 0.18);
    graphics.fillRoundedRect(left + 16, top + 14, width - 32, 36, 16);
    graphics.lineStyle(2, accent, 0.72);
    graphics.strokeRoundedRect(left, top, width, height, 22);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeRoundedRect(left + 12, top + 12, width - 24, height - 24, 18);

    const badge = this.add.text(left + 18, top + 22, pawn.type === 'generator' ? 'GEN' : 'FIN', {
      color: '#06111a',
      backgroundColor: Phaser.Display.Color.IntegerToColor(accent).rgba,
      fontFamily: 'monospace',
      fontSize: '14px',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    });

    const title = this.add.text(0, top + 74, formatPawnTitle(pawn), {
      color: '#f5f7ff',
      fontFamily: 'monospace',
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    const subtitle = this.add.text(0, top + 102, getPawnShopSubtitle(pawn), {
      color: '#8fb8d3',
      fontFamily: 'monospace',
      fontSize: '14px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    const price = this.add.text(0, top + 128, `${StageFlowConfig.SHOP_PURCHASE_COST} coins`, {
      color: '#ffe08e',
      fontFamily: 'monospace',
      fontSize: '16px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    container.add([graphics, badge, title, subtitle, price]);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(left, top, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(container);
    container.setData('dragPayload', {
      kind: 'shop-offer',
      offerIndex,
      pawnId: pawn.id,
      homeX: x,
      homeY: y,
    } satisfies DragPayload);

    if (container.input) {
      container.input.cursor = 'grab';
    }

    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      this.pendingSelection = {
        kind: 'shop-offer',
        offerIndex,
        pawnId: pawn.id,
      };
      this.transientStatusText = `Selected ${formatPawnTitle(pawn)}. Tap an empty slot to buy it.`;
      this.syncPresentation();
    });

    this.shopCardsLayer?.add(hitZone);

    return {
      offerIndex,
      pawnId: pawn.id,
      container,
      hitZone,
    };
  }

  private readonly handleStartWavePressed = (): void => {
    emit('stage:start-wave-requested');
  };

  private readonly handleStartWaveRequested = (): void => {
    if (this.isTransitioning || !requestStageWaveStart(this.runtime)) {
      return;
    }

    this.isTransitioning = true;
    this.transientStatusText = null;
    this.pendingSelection = null;
    emit('stage:phase-changed', { phase: this.runtime.phase });
    this.publishSnapshot();
    this.syncPresentation();
    this.playCombatPhaseOutro();
  };

  private readonly handleCombatEnded = (payload: { outcome: 'victory' | 'defeat' }): void => {
    if (this.runtime.phase !== 'combat') {
      return;
    }

    if (this.scene.isActive(SceneKeys.HUD)) {
      this.scene.stop(SceneKeys.HUD);
    }

    if (this.scene.isActive(SceneKeys.COMBAT)) {
      this.scene.stop(SceneKeys.COMBAT);
    }

    const previousPhase = this.runtime.phase;
    resolveStageCombatOutcome(this.runtime, {
      outcome: payload.outcome,
      rewardCoins: StageFlowConfig.WAVE_CLEAR_REWARD_COINS,
    });

    if (this.runtime.phase !== previousPhase) {
      emit('stage:phase-changed', { phase: this.runtime.phase });
    }

    this.transientStatusText = null;
    this.pendingSelection = null;
    this.refreshBuildUI();
    this.publishSnapshot();
    this.playBuildPhaseIntro(true);
  };

  private playCombatPhaseOutro(): void {
    if (!this.recordContainer || !this.shopPanel || !this.previewCard) {
      this.launchCombatScene();
      return;
    }

    this.tweens.killTweensOf(this.recordContainer);
    this.tweens.killTweensOf(this.shopPanel);
    this.tweens.killTweensOf(this.previewCard);
    this.tweens.killTweensOf(this.cameras.main);

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 0.96,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.recordContainer,
      y: StagePresentationConfig.BUILD_RECORD_CENTER_Y + 120,
      scale: 0.94,
      alpha: 0.82,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS,
      ease: 'Cubic.easeIn',
    });
    this.tweens.add({
      targets: this.previewCard,
      y: StagePresentationConfig.PREVIEW_CARD_Y - 38,
      alpha: 0,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS - 60,
      ease: 'Cubic.easeIn',
    });
    this.tweens.add({
      targets: this.shopPanel,
      y: StagePresentationConfig.SHOP_PANEL_Y + 220,
      alpha: 0,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.launchCombatScene();
      },
    });
  }

  private launchCombatScene(): void {
    this.scene.launch(SceneKeys.COMBAT, {
      waveIndex: this.runtime.currentWaveIndex,
      totalWaves: this.runtime.totalWaves,
      stageManaged: true,
      allowRestart: false,
      slotPawnIds: getStageCombatLoadout(this.runtime),
    });
    this.isTransitioning = false;
  }

  private playBuildPhaseIntro(fromCombat: boolean): void {
    if (!this.recordContainer || !this.shopPanel || !this.previewCard) {
      return;
    }

    this.tweens.killTweensOf(this.recordContainer);
    this.tweens.killTweensOf(this.shopPanel);
    this.tweens.killTweensOf(this.previewCard);
    this.tweens.killTweensOf(this.cameras.main);

    const duration = fromCombat
      ? StagePresentationConfig.COMBAT_TO_BUILD_TWEEN_MS
      : StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS;
    const recordStartY = fromCombat
      ? StagePresentationConfig.BUILD_RECORD_CENTER_Y + 84
      : StagePresentationConfig.BUILD_RECORD_CENTER_Y;
    const previewStartY = fromCombat
      ? StagePresentationConfig.PREVIEW_CARD_Y - 32
      : StagePresentationConfig.PREVIEW_CARD_Y;
    const shopStartY = fromCombat
      ? StagePresentationConfig.SHOP_PANEL_Y + 240
      : StagePresentationConfig.SHOP_PANEL_Y + 170;

    this.cameras.main.setZoom(fromCombat ? 0.94 : 1);
    this.recordContainer.setY(recordStartY);
    this.recordContainer.setScale(fromCombat ? 0.95 : 1);
    this.recordContainer.setAlpha(1);
    this.previewCard.setY(previewStartY);
    this.previewCard.setAlpha(fromCombat ? 0 : 1);
    this.shopPanel.setY(shopStartY);
    this.shopPanel.setAlpha(0);

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: this.recordContainer,
      y: StagePresentationConfig.BUILD_RECORD_CENTER_Y,
      scale: 1,
      duration,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: this.previewCard,
      y: StagePresentationConfig.PREVIEW_CARD_Y,
      alpha: 1,
      duration: duration - 80,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: this.shopPanel,
      y: StagePresentationConfig.SHOP_PANEL_Y,
      alpha: 1,
      duration,
      ease: 'Cubic.easeOut',
    });
  }

  private syncPresentation(): void {
    const currentWave = Math.min(this.runtime.currentWaveIndex + 1, Math.max(1, this.runtime.totalWaves));
    const canStartWave = canStageStartWave(this.runtime);
    const wave = canStartWave ? getCombatWaveDefinition(this.runtime.currentWaveIndex) : null;
    const preview = wave
      ? createStageWavePreview(wave, currentWave, this.runtime.totalWaves)
      : null;

    this.phaseLabel?.setText(getPhaseLabel(this.runtime.phase));
    this.coinsLabel?.setText(`Coins ${this.runtime.coins}`);
    this.waveLabel?.setText(
      this.runtime.totalWaves > 0
        ? `Wave ${currentWave}/${this.runtime.totalWaves}`
        : 'No Waves Configured',
    );
    this.previewTitleLabel?.setText(preview?.title ?? 'Stage Status');
    this.previewBodyLabel?.setText(preview?.body ?? getTerminalBody(this.runtime));
    this.statusLabel?.setText(this.transientStatusText ?? getStatusLabel(this.runtime));

    this.startWaveButton?.setVisible(canStartWave);
    this.startWaveButton?.setAlpha(canStartWave ? 1 : 0.45);
    this.startWaveButton?.disableInteractive();

    if (canStartWave && !this.isTransitioning) {
      this.startWaveButton?.setInteractive({ useHandCursor: true });
    }

    const buildVisible = this.runtime.phase !== 'combat';
    this.recordContainer?.setVisible(buildVisible);
    this.shopPanel?.setVisible(buildVisible);
    this.previewCard?.setVisible(buildVisible);
    this.waveLabel?.setVisible(buildVisible);
    this.statusLabel?.setVisible(buildVisible);
  }

  private publishSnapshot(): void {
    const canStartWave = canStageStartWave(this.runtime);
    const currentWave = Math.min(this.runtime.currentWaveIndex + 1, Math.max(1, this.runtime.totalWaves));
    const wave = canStartWave ? getCombatWaveDefinition(this.runtime.currentWaveIndex) : null;
    const preview = wave
      ? createStageWavePreview(wave, currentWave, this.runtime.totalWaves)
      : { title: 'Stage Status', body: getTerminalBody(this.runtime) };

    emit('stage:snapshot-updated', {
      phase: this.runtime.phase,
      coins: this.runtime.coins,
      currentWave,
      totalWaves: this.runtime.totalWaves,
      canStartWave,
      previewTitle: preview.title,
      previewBody: preview.body,
    });
  }

  private updateActiveDropSlot(worldX: number, worldY: number): void {
    const slotIndex = this.getClosestSlotIndex(worldX, worldY);
    if (slotIndex === this.activeDropSlotIndex) {
      return;
    }

    this.activeDropSlotIndex = slotIndex;
    this.slotViews.forEach((slotView) => {
      slotView.glow.setAlpha(slotView.slotIndex === slotIndex ? 1 : 0);
    });
  }

  private clearSlotHighlights(): void {
    this.activeDropSlotIndex = null;
    this.slotViews.forEach((slotView) => slotView.glow.setAlpha(0));
  }

  private getClosestSlotIndex(worldX: number, worldY: number): number | null {
    if (this.runtime.phase !== 'build' || !this.recordContainer) {
      return null;
    }

    let closestSlotIndex: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const slotView of this.slotViews) {
      const slotWorldX = this.recordContainer.x + slotView.anchorX;
      const slotWorldY = this.recordContainer.y + slotView.anchorY;
      const distance = Phaser.Math.Distance.Between(worldX, worldY, slotWorldX, slotWorldY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestSlotIndex = slotView.slotIndex;
      }
    }

    return closestDistance <= 88 ? closestSlotIndex : null;
  }

  private handleSlotPressed(slotIndex: number): void {
    if (this.runtime.phase !== 'build' || this.isTransitioning) {
      return;
    }

    if (!this.pendingSelection) {
      const pawnId = this.runtime.build.slots[slotIndex];
      if (!pawnId) {
        return;
      }

      this.pendingSelection = {
        kind: 'slot-pawn',
        slotIndex,
        pawnId,
      };
      this.transientStatusText = `Selected ${formatPawnTitleFromId(pawnId)}. Tap another slot to move or swap.`;
      this.syncPresentation();
      return;
    }

    let applied = false;

    if (this.pendingSelection.kind === 'shop-offer') {
      applied = purchaseStagePawnIntoSlot(this.runtime, this.pendingSelection.offerIndex, slotIndex);
      this.transientStatusText = applied
        ? null
        : `Need ${StageFlowConfig.SHOP_PURCHASE_COST} coins and an empty slot to buy.`;
    } else {
      applied = repositionStagePawn(this.runtime, this.pendingSelection.slotIndex, slotIndex);
      this.transientStatusText = applied
        ? null
        : `Need ${StageFlowConfig.REPOSITION_COST} coin and a different destination slot to move.`;
    }

    if (!applied) {
      this.syncPresentation();
      return;
    }

    this.pendingSelection = null;
    this.refreshBuildUI();
    this.publishSnapshot();
  }

  private fillSector(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number,
  ): void {
    graphics.beginPath();
    graphics.moveTo(centerX, centerY);
    graphics.slice(
      centerX,
      centerY,
      radius,
      Phaser.Math.DegToRad(startAngleDeg),
      Phaser.Math.DegToRad(endAngleDeg),
      false,
    );
    graphics.closePath();
    graphics.fillPath();
  }

  private strokeSector(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number,
  ): void {
    graphics.beginPath();
    graphics.moveTo(centerX, centerY);
    graphics.slice(
      centerX,
      centerY,
      radius,
      Phaser.Math.DegToRad(startAngleDeg),
      Phaser.Math.DegToRad(endAngleDeg),
      false,
    );
    graphics.closePath();
    graphics.strokePath();
  }

  private isInteractiveBuildObject(
    gameObject: Phaser.GameObjects.GameObject,
  ): gameObject is Phaser.GameObjects.Container {
    return gameObject instanceof Phaser.GameObjects.Container;
  }

  private handleShutdown(): void {
    off('stage:start-wave-requested', this.handleStartWaveRequested);
    off('combat:ended', this.handleCombatEnded);
    this.startWaveButton?.off('pointerdown', this.handleStartWavePressed);
    this.input.off(Phaser.Input.Events.DRAG_START);
    this.input.off(Phaser.Input.Events.DRAG);
    this.input.off(Phaser.Input.Events.DRAG_END);
  }
}

function getPhaseLabel(phase: StageRuntime['phase']): string {
  switch (phase) {
    case 'build':
      return 'Build Phase';
    case 'combat':
      return 'Combat Phase';
    case 'stage_complete':
      return 'Stage Complete';
    case 'stage_failed':
      return 'Stage Failed';
  }
}

function getStatusLabel(runtime: StageRuntime): string {
  if (runtime.phase === 'build') {
    return 'Drag shop cards onto empty slots. Drag placed pawns to move or swap them on the record.';
  }

  if (runtime.phase === 'combat') {
    return 'Combat is active. Camera hands off to the arena until the wave resolves.';
  }

  if (runtime.phase === 'stage_complete') {
    return `All ${runtime.totalWaves} waves cleared. This stage slice is complete.`;
  }

  return 'The base fell. Stage flow stops here for this MVP.';
}

function getTerminalBody(runtime: StageRuntime): string {
  if (runtime.totalWaves === 0) {
    return 'No authored waves are available for this stage.';
  }

  if (runtime.phase === 'stage_complete') {
    return `Cleared ${runtime.totalWaves}/${runtime.totalWaves} waves.\nFinal coins ${runtime.coins}`;
  }

  if (runtime.phase === 'stage_failed') {
    return `Failed on wave ${runtime.currentWaveIndex + 1}/${runtime.totalWaves}.\nFinal coins ${runtime.coins}`;
  }

  return '';
}

function getPawnAccentColor(color: CombatPawnDefinition['color']): number {
  switch (color) {
    case 'red':
      return 0xff7a96;
    case 'green':
      return 0x7ef2a1;
    case 'blue':
      return 0x63d7ff;
  }
}

function formatPawnTitle(pawn: CombatPawnDefinition): string {
  const typeLabel = pawn.type === 'generator' ? 'Generator' : 'Finisher';
  return `${capitalize(pawn.color)} ${typeLabel}`;
}

function formatPawnTitleFromId(pawnId: string): string {
  const pawn = findPawnDefinition(pawnId);
  return pawn ? formatPawnTitle(pawn) : pawnId;
}

function getPawnShopSubtitle(pawn: CombatPawnDefinition): string {
  if (pawn.type === 'generator') {
    return 'Creates 2 notes';
  }

  return `Consumes ${pawn.color} notes`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function findPawnDefinition(id: string): CombatPawnDefinition | undefined {
  return CombatContentConfig.PAWN_DEFINITIONS.find((pawn) => pawn.id === id);
}

function getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = Phaser.Math.DegToRad(angleDeg);

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}
