import Phaser from 'phaser';
import {
  CombatContentConfig,
  getScaledPawnDamage,
  getCombatPawnDefinitionById,
  type CombatPawnDefinition,
} from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatWaveConfig, getCombatWaveDefinition } from '@config/CombatWaveConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { STAGE_CONFIGS } from '@config/StageConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { SceneKeys } from '@config/GameConfig';
import { emit, off, on } from '@events/EventBus';
import {
  createStageRuntime,
  getStageShopRerollCost,
  mergeStagePawnSlots,
  purchaseStagePawnIntoMergeSlot,
  purchaseStagePawnIntoSlot,
  repositionStagePawn,
  rerollStageShopOffers,
  type StageRuntime,
} from '@stage/StageRuntime';
import { getStageBuildSlotPawnIds, type StagePawnInstance } from '@stage/StageBuild';
import { createStageWavePreview } from '@stage/StageWavePreview';
import { getStageCoinFeedback } from './StageCoinFeedback';
import {
  createStageFlowCoordinationState,
  dispatchStageFlowIntent,
  type StageFlowCommand,
  type StageFlowCoordinationState,
  type StageFlowIntent,
} from '@stage/StageFlowCoordinator';
import { SynergyVisualSystem } from '@systems/SynergyVisualSystem';
import type { SlotModifierAssignment } from '@stage/StageSlotModifiers';
import { createModifierIcons, type ModifierIconView } from './ModifierIconRenderer';
import { isPawnCompatibleWithModifier } from './ModifierCompatibility';
import { bindModifierInspection, type ModifierTooltipState } from './ModifierTooltipBridge';
import { showCompatibilityLink } from './ModifierLinkEffect';
import { SLOT_MODIFIER_CONFIG, type SlotModifierDefinition } from '@config/SlotModifierConfig';

interface StageRecordSlotView {
  slotIndex: number;
  anchorX: number;
  anchorY: number;
  zone: Phaser.GameObjects.Zone;
  glow: Phaser.GameObjects.Graphics;
  pawnContainer?: Phaser.GameObjects.Container;
  innerLabel?: Phaser.GameObjects.Container;
}

interface StageShopCardView {
  offerIndex: number;
  pawnId: string;
  container: Phaser.GameObjects.Container;
}

interface StagePawnTooltipState {
  pawnId: string;
  tier: number;
  slotIndex?: number;
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
      tier: number;
      homeX: number;
      homeY: number;
    };

export class StageScene extends Phaser.Scene {
  private runtime!: StageRuntime;
  private phaseLabel?: Phaser.GameObjects.Text;
  private coinsGlowLabel?: Phaser.GameObjects.Text;
  private coinsLabel?: Phaser.GameObjects.Text;
  private coinFeedbackLabel?: Phaser.GameObjects.Text;
  private waveLabel?: Phaser.GameObjects.Text;
  private previewBodyLabel?: Phaser.GameObjects.Text;
  private previewArchetypeLabel?: Phaser.GameObjects.Text;
  private archetypeTooltipContainer?: Phaser.GameObjects.Container;
  private statusLabel?: Phaser.GameObjects.Text;
  private startWaveButton?: Phaser.GameObjects.Text;
  private previewCard?: Phaser.GameObjects.Container;
  private recordContainer?: Phaser.GameObjects.Container;
  private recordPawnLayer?: Phaser.GameObjects.Container;
  private recordInnerLabelLayer?: Phaser.GameObjects.Container;
  private shopPanel?: Phaser.GameObjects.Container;
  private shopCardsLayer?: Phaser.GameObjects.Container;
  private shopEmptyLabel?: Phaser.GameObjects.Text;
  private rerollButton?: Phaser.GameObjects.Text;
  private tooltipContainer?: Phaser.GameObjects.Container;
  private tooltipSprite?: Phaser.GameObjects.Image;
  private tooltipTitle?: Phaser.GameObjects.Text;
  private tooltipMeta?: Phaser.GameObjects.Text;
  private tooltipTierStars?: Phaser.GameObjects.Text;
  private tooltipRule?: Phaser.GameObjects.Container;
  private tooltipDescription?: Phaser.GameObjects.Text;
  private readonly slotViews: StageRecordSlotView[] = [];
  private readonly shopCardViews: StageShopCardView[] = [];
  private modifierIconViews: ModifierIconView[] = [];
  private activeDropSlotIndex: number | null = null;
  private inspectedPawn: StagePawnTooltipState | null = null;
  private inspectedModifier: ModifierTooltipState | null = null;
  private tooltipHoldTimer?: Phaser.Time.TimerEvent;
  private modifierTooltipHoldTimer?: Phaser.Time.TimerEvent;
  private combatReturnTimer?: Phaser.Time.TimerEvent;
  private tooltipLockedByDrag = false;
  private transientStatusText: string | null = null;
  private lastPresentedCoins: number | null = null;
  private readonly stageFlowCoordination: StageFlowCoordinationState = createStageFlowCoordinationState();
  private synergySystem?: SynergyVisualSystem;

  constructor() {
    super({ key: SceneKeys.STAGE });
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.runtime = createStageRuntime(STAGE_CONFIGS[0]!);

    this.renderBuildPhaseLayout();
    this.bindDragEvents();
    on('stage:start-wave-requested', this.handleStartWaveRequested);
    on('combat:ended', this.handleCombatEnded);

    this.refreshBuildUI();
    this.runStageFlowIntent({ type: 'stage:initialized' });
    emit('scene:ready', { key: this.scene.key });
    emit('stage:scene-ready', { key: this.scene.key, phase: this.runtime.phase });
    emit('game:ready');
  }

  update(time: number, delta: number): void {
    this.synergySystem?.update(time, delta);
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
    this.previewCard = this.createPreviewCard();
    this.recordContainer = this.createBuildRecord();
    this.createSynergySystem();
    this.shopPanel = this.createShopPanel();
    this.tooltipContainer = this.createPawnTooltip();

    this.phaseLabel = this.add.text(52, 50, '', {
      color: '#8ef7ff',
      fontFamily: 'monospace',
      fontSize: '22px',
    });

    this.coinsGlowLabel = this.add.text(width - 52, 50, '', {
      color: '#fff0b8',
      fontFamily: 'monospace',
      fontSize: '22px',
      align: 'right',
    }).setOrigin(1, 0).setAlpha(0).setScale(1);
    this.coinsGlowLabel.setBlendMode(Phaser.BlendModes.ADD);
    this.coinsGlowLabel.setShadow(0, 0, '#ffe08e', 22, true, true);

    this.coinsLabel = this.add.text(width - 52, 50, '', {
      color: '#ffe08e',
      fontFamily: 'monospace',
      fontSize: '22px',
      align: 'right',
    }).setOrigin(1, 0);
    this.coinsLabel.setShadow(0, 0, '#6f5317', 8, false, true);

    this.coinFeedbackLabel = this.add.text(width / 2, StagePresentationConfig.COIN_FEEDBACK_Y, '', {
      color: '#8ef7b2',
      fontFamily: 'monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      stroke: '#071019',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5, 0.5).setAlpha(0).setVisible(false);
    this.coinFeedbackLabel.setShadow(0, 8, '#071019', 16, true, true);

    this.waveLabel = this.add.text(width / 2, 60, '', {
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
    graphics.lineStyle(2, 0x56d6ff, 0.5);
    graphics.strokeRoundedRect(x, y, width, height, 28);

    this.previewBodyLabel = this.add.text(x + 28, y + 20, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '17px',
      lineSpacing: 6,
      align: 'left',
    });

    container.add([graphics, this.previewBodyLabel]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    this.previewArchetypeLabel = this.add.text(x + 28, y + 20, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '15px',
      lineSpacing: 6,
      align: 'left',
    }).setAlpha(0).setVisible(false);

    container.add(this.previewArchetypeLabel);
    this.archetypeTooltipContainer = container;

    container.on('pointerdown', () => {
      if (!this.previewArchetypeLabel) return;
      const visible = this.previewArchetypeLabel.visible;
      this.previewArchetypeLabel.setVisible(!visible);
      this.previewArchetypeLabel.setAlpha(!visible ? 1 : 0);
    });

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
      glow.fillStyle(0x8ef7ff, 0.35);
      glow.fillCircle(pawnAnchor.x, pawnAnchor.y, 46);
      glow.lineStyle(3, 0x8ef7ff, 1);
      glow.strokeCircle(pawnAnchor.x, pawnAnchor.y, 52);

      const zone = this.add.zone(pawnAnchor.x, pawnAnchor.y, 120, 120);
      zone.setRectangleDropZone(120, 120);
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive();

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
    centerGlow.fillCircle(0, 0, 40);
    centerGlow.lineStyle(2, 0x8ef7ff, 0.7);
    centerGlow.strokeCircle(0, 0, 58);

    const centerCapibara = this.add.image(0, 0, CombatLayoutConfig.BASE_SPRITE_TEXTURE_KEY);
    centerCapibara.setDisplaySize(
      StagePresentationConfig.BUILD_RECORD_CENTER_CAPIBARA_SIZE,
      StagePresentationConfig.BUILD_RECORD_CENTER_CAPIBARA_SIZE,
    );
    centerCapibara.setOrigin(0.5, 0.5);

    this.recordPawnLayer = this.add.container(0, 0);
    this.recordInnerLabelLayer = this.add.container(0, 0);
    container.add([this.recordInnerLabelLayer, this.recordPawnLayer, centerGlow, centerCapibara, needle]);
    this.modifierIconViews = createModifierIcons(this, this.runtime, container);
    for (const iconView of this.modifierIconViews) {
      bindModifierInspection(
        this,
        iconView,
        { modifierId: iconView.modifierId, slotIndex: iconView.slotIndex },
        (state) => this.showModifierTooltip(state),
        () => this.hideModifierTooltip(),
      );
    }

    return container;
  }

  private createShopPanel(): Phaser.GameObjects.Container {
    const width = StagePresentationConfig.SHOP_PANEL_WIDTH;
    const height = StagePresentationConfig.SHOP_PANEL_HEIGHT;
    const container = this.add.container(this.scale.width / 2, StagePresentationConfig.SHOP_PANEL_Y);
    const background = this.add.graphics();
    const x = -width / 2;
    const y = -height / 2;

    background.fillStyle(0x08111b, 0.98);
    background.fillRoundedRect(x, y, width, height, StagePresentationConfig.SHOP_BORDER_RADIUS);
    background.fillStyle(0x11263a, 0.38);
    background.fillRoundedRect(x + 20, y + 18, width - 40, 52, StagePresentationConfig.SHOP_BORDER_RADIUS);
    background.lineStyle(2, 0x57d9ff, 0.5);
    background.strokeRoundedRect(x, y, width, height, StagePresentationConfig.SHOP_BORDER_RADIUS);

    const title = this.add.text(x + 32, y + 30, 'SHOP', {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '28px',
    });
    const subtitle = this.add.text(
      x + 132,
      y + 40,
      `Buy ${StageFlowConfig.SHOP_PURCHASE_COST}c  •  Move ${StageFlowConfig.REPOSITION_COST}c`,
      {
        color: '#7fbddb',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '15px',
      },
    );

    this.rerollButton = this.add.text(x + width - 122, y + 30, '', {
      color: '#071019',
      backgroundColor: '#ffe08e',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '18px',
      align: 'center',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
    }).setOrigin(0.5, 0);
    this.rerollButton.setInteractive({ useHandCursor: true });
    this.rerollButton.on('pointerdown', this.handleRerollPressed);

    this.shopCardsLayer = this.add.container(0, 0);
    container.add([background, title, subtitle, this.rerollButton, this.shopCardsLayer]);
    return container;
  }

  private createPawnTooltip(): Phaser.GameObjects.Container {
    const width = this.scale.width - 64;
    const height = 146;
    const container = this.add.container(this.scale.width / 2, 144);
    const background = this.add.graphics();
    background.fillStyle(0x08111b, 0.96);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 24);
    background.lineStyle(2, 0x5dd7ff, 0.45);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 24);

    const leftColumnWidth = Math.round(width * 0.35);
    background.lineStyle(1, 0x163148, 0.85);
    background.strokeLineShape(
      new Phaser.Geom.Line(-width / 2 + leftColumnWidth, -height / 2 + 18, -width / 2 + leftColumnWidth, height / 2 - 18),
    );

    this.tooltipTitle = this.add.text(-width / 2 + leftColumnWidth / 2, -height / 2 + 22, '', {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '20px',
      align: 'center',
      wordWrap: { width: leftColumnWidth - 24 },
    }).setOrigin(0.5, 0.5);
    this.tooltipSprite = this.add.image(-width / 2 + leftColumnWidth / 2, 4, CombatContentConfig.PAWN_SPRITE_TEXTURE_KEY, 0);
    this.tooltipSprite.setDisplaySize(88, 88);
    this.tooltipTierStars = this.add.text(-width / 2 + leftColumnWidth / 2, 42, '', {
      color: '#ffd166',
      fontFamily: 'monospace',
      fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.tooltipTierStars.setStroke('#7a4f00', 5);

    this.tooltipMeta = this.add.text(-width / 2 + leftColumnWidth + 22, -height / 2 + 26, '', {
      color: '#06111a',
      backgroundColor: '#8fd0ea',
      fontFamily: 'monospace',
      fontSize: '13px',
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
    }).setOrigin(0, 0.5);
    this.tooltipRule = this.add.container(-width / 2 + leftColumnWidth + 160, -height / 2 + 26);
    this.tooltipDescription = this.add.text(-width / 2 + leftColumnWidth + 22, -height / 2 + 56, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '14px',
      lineSpacing: 4,
      wordWrap: { width: width - leftColumnWidth - 44 },
    });

    container.add([
      background,
      this.tooltipTitle,
      this.tooltipSprite,
      this.tooltipTierStars,
      this.tooltipMeta,
      this.tooltipRule,
      this.tooltipDescription,
    ]);
    container.setVisible(false);
    container.setAlpha(0);
    return container;
  }

  private createSynergySystem(): void {
    const center = this.recordContainer!;
    this.synergySystem = new SynergyVisualSystem({
      scene: this,
      pawnDefinitions: CombatContentConfig.PAWN_DEFINITIONS,
      slotCount: CombatContentConfig.SLOT_COUNT,
      recordCenterX: center.x,
      recordCenterY: center.y,
      recordRadius: StagePresentationConfig.BUILD_RECORD_RADIUS,
      depth: 30,
    });
    this.synergySystem.create();
    this.synergySystem.updateBuildState(getStageBuildSlotPawnIds(this.runtime.build));
  }

  private bindDragEvents(): void {
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (!this.isInteractiveBuildObject(gameObject)) {
          return;
        }

        const payload = gameObject.getData('dragPayload') as DragPayload | undefined;
        if (!payload || this.runtime.phase !== 'build' || this.stageFlowCoordination.isTransitioning) {
          return;
        }

        gameObject.setDepth(5000);
        gameObject.setScale(1.06);
        this.tooltipLockedByDrag = true;
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
        let errorMsg: string | null = null;

        if (payload.kind === 'shop-offer' && targetSlotIndex !== null) {
          applied = purchaseStagePawnIntoSlot(this.runtime, payload.offerIndex, targetSlotIndex);
          if (!applied) {
            applied = purchaseStagePawnIntoMergeSlot(this.runtime, payload.offerIndex, targetSlotIndex);
          }
          errorMsg = applied
            ? null
            : `Need ${StageFlowConfig.SHOP_PURCHASE_COST} coins and either an empty slot or a matching same-tier pawn.`;
        }

        if (payload.kind === 'slot-pawn' && targetSlotIndex !== null) {
          applied = mergeStagePawnSlots(this.runtime, payload.slotIndex, targetSlotIndex);
          errorMsg = applied ? null : `Need ${StageFlowConfig.REPOSITION_COST} coin and a different destination slot to move.`;

          if (!applied) {
            applied = repositionStagePawn(this.runtime, payload.slotIndex, targetSlotIndex);
            errorMsg = applied
              ? null
              : 'Need matching duplicate to merge, or 1 coin and a different destination slot to move.';
          }
        }

        this.transientStatusText = errorMsg;

        this.clearSlotHighlights();
        this.tooltipLockedByDrag = false;

        if (applied) {
          this.refreshBuildUI();
          if (targetSlotIndex !== null) {
            this.showCompatibilityLinkIfApplicable(targetSlotIndex);
          }
          this.publishSnapshot();
          this.hidePawnTooltip();
          this.hideModifierTooltip();
        } else {
          gameObject.x = payload.homeX;
          gameObject.y = payload.homeY;
          this.syncPresentation();
          this.hidePawnTooltip();
          this.hideModifierTooltip();
        }
      },
    );

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!this.tooltipLockedByDrag) {
        this.hidePawnTooltip();
        this.hideModifierTooltip();
      }
      this.clearTooltipHoldTimer();
    });
  }

  private refreshBuildUI(): void {
    this.refreshRecordPawnViews();
    this.refreshShopCards();
    this.syncPresentation();
    this.synergySystem?.updateBuildState(getStageBuildSlotPawnIds(this.runtime.build));
  }

  private refreshRecordPawnViews(): void {
    this.slotViews.forEach((slotView) => {
      slotView.pawnContainer?.destroy();
      slotView.pawnContainer = undefined;
      slotView.innerLabel?.destroy();
      slotView.innerLabel = undefined;
    });

    for (const slotView of this.slotViews) {
      const pawnInstance = this.runtime.build.slots[slotView.slotIndex];
      if (!pawnInstance) {
        continue;
      }

      const pawnDefinition = findPawnDefinition(pawnInstance.pawnId);
      if (!pawnDefinition || !this.recordPawnLayer || !this.recordInnerLabelLayer) {
        continue;
      }

      const pawnContainer = this.createSlotPawn(
        slotView.anchorX,
        slotView.anchorY,
        slotView.slotIndex,
        pawnDefinition,
        pawnInstance,
      );
      slotView.pawnContainer = pawnContainer;
      this.recordPawnLayer.add(pawnContainer);

      const accent = getPawnAccentColor(pawnDefinition.color);
      const innerLabel = createRuleLabelContainer(this, pawnDefinition, accent);
      const innerRadius = StagePresentationConfig.BUILD_RECORD_INNER_RADIUS * 0.82;
      const angleDeg = -90 + (360 / 8) * slotView.slotIndex;
      const innerPos = getPolarOffset(angleDeg, innerRadius);
      innerLabel.x = innerPos.x;
      innerLabel.y = innerPos.y;
      slotView.innerLabel = innerLabel;
      this.recordInnerLabelLayer.add(innerLabel);
    }
  }

  private createSlotPawn(
    x: number,
    y: number,
    slotIndex: number,
    pawn: CombatPawnDefinition,
    pawnInstance: StagePawnInstance,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const spriteSize = 82;
    const sprite = createPawnSprite(this, pawn, spriteSize);
    sprite.y = -2;

    const stars = this.add.text(0, 46, '★'.repeat(pawnInstance.tier), {
      color: '#ffd166',
      fontFamily: 'monospace',
      fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    stars.setStroke('#7a4f00', 5);

    container.add([sprite, stars]);
    container.setSize(88, 92);
    container.setInteractive(
      new Phaser.Geom.Circle(
        container.width / 2 + pawn.art.offsetX,
        container.height / 2 + pawn.art.offsetY - 2,
        spriteSize * 0.44,
      ),
      Phaser.Geom.Circle.Contains,
    );
    this.input.setDraggable(container);
    container.setData('dragPayload', {
      kind: 'slot-pawn',
      slotIndex,
      pawnId: pawn.id,
      tier: pawnInstance.tier,
      homeX: x,
      homeY: y,
    } satisfies DragPayload);

    if (container.input) {
      container.input.cursor = 'grab';
    }

    this.bindPawnInspection(container, { pawnId: pawn.id, tier: pawnInstance.tier, slotIndex });

    return container;
  }

  private refreshShopCards(): void {
    if (!this.shopCardsLayer) {
      return;
    }

    const oldCards = [...this.shopCardViews];
    this.shopCardViews.length = 0;

    const cards = this.runtime.build.shopOffers;
    const totalWidth =
      cards.length * StagePresentationConfig.SHOP_CARD_WIDTH
      + Math.max(0, cards.length - 1) * StagePresentationConfig.SHOP_CARD_GAP;
    const startX = -totalWidth / 2 + StagePresentationConfig.SHOP_CARD_WIDTH / 2;

    const createNewCards = () => {
      oldCards.forEach((card) => card.container.destroy());

      if (cards.length === 0) {
        if (!this.shopEmptyLabel) {
          this.shopEmptyLabel = this.add.text(0, 34, 'No offers', {
            color: '#7fbddb',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: '16px',
            align: 'center',
          }).setOrigin(0.5, 0.5);
          this.shopCardsLayer?.add(this.shopEmptyLabel);
        }
        this.shopEmptyLabel.setVisible(true).setAlpha(1);
        return;
      }

      if (this.shopEmptyLabel) {
        this.shopEmptyLabel.setVisible(false);
      }

      cards.forEach((pawnId, offerIndex) => {
        const pawn = findPawnDefinition(pawnId);
        if (!pawn) {
          return;
        }

        const x = startX + offerIndex * (StagePresentationConfig.SHOP_CARD_WIDTH + StagePresentationConfig.SHOP_CARD_GAP);
        const cardView = this.createShopCard(x, 30, offerIndex, pawn);
        cardView.container.setAlpha(0).setScale(0.92);
        this.shopCardViews.push(cardView);
        this.shopCardsLayer?.add(cardView.container);

        this.tweens.add({
          targets: cardView.container,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 220,
          delay: offerIndex * 50,
          ease: 'Back.easeOut',
        });
      });
    };

    if (oldCards.length > 0) {
      for (const card of oldCards) {
        this.tweens.add({
          targets: card.container,
          alpha: 0,
          scaleX: 0.92,
          scaleY: 0.92,
          duration: 110,
          ease: 'Sine.easeIn',
        });
      }
      this.time.delayedCall(120, createNewCards);
    } else {
      createNewCards();
    }
  }

  private createShopCard(
    x: number,
    y: number,
    offerIndex: number,
    pawn: CombatPawnDefinition,
  ): StageShopCardView {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    const width = StagePresentationConfig.SHOP_CARD_WIDTH;
    const height = StagePresentationConfig.SHOP_CARD_HEIGHT;
    const left = -width / 2;
    const top = -height / 2;
    const accent = getPawnAccentColor(pawn.color);
    const affordable = this.runtime.coins >= StageFlowConfig.SHOP_PURCHASE_COST;
    const borderAlpha = affordable ? 0.88 : 0.48;
    const radius = StagePresentationConfig.SHOP_BORDER_RADIUS;

    graphics.fillStyle(0x0b1520, 1);
    graphics.fillRoundedRect(left, top, width, height, radius);
    graphics.fillStyle(accent, 0.08);
    graphics.fillRoundedRect(left + 12, top + 12, width - 24, 68, 16);
    graphics.lineStyle(2, accent, borderAlpha);
    graphics.strokeRoundedRect(left, top, width, height, radius);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeRoundedRect(left + 12, top + 12, width - 24, height - 24, 16);

    const hoverGlow = this.add.graphics();
    hoverGlow.lineStyle(2, accent, 1);
    hoverGlow.strokeRoundedRect(left, top, width, height, radius);
    hoverGlow.setAlpha(0);

    const title = this.add.text(0, top + 74, formatPawnTitle(pawn), {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '17px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    const spriteFrame = createPawnSprite(this, pawn, 86);
    spriteFrame.y = top + 26;

    const ruleLabel = createRuleLabelContainer(this, pawn, accent);
    ruleLabel.x = 0;
    ruleLabel.y = top + 102;

    const priceChip = this.add.text(0, top + 137, `${StageFlowConfig.SHOP_PURCHASE_COST}c`, {
      color: '#071019',
      backgroundColor: '#ffe08e',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '16px',
      align: 'center',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5, 0.5);

    container.add([graphics, hoverGlow, spriteFrame, title, ruleLabel, priceChip]);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
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

    container.on('pointerover', () => {
      if (this.tooltipLockedByDrag) return;
      this.tweens.killTweensOf(container);
      this.tweens.killTweensOf(hoverGlow);
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: hoverGlow, alpha: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    container.on('pointerout', () => {
      this.tweens.killTweensOf(container);
      this.tweens.killTweensOf(hoverGlow);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: hoverGlow, alpha: 0, duration: 150, ease: 'Sine.easeOut' });
    });

    this.bindPawnInspection(container, { pawnId: pawn.id, tier: 1 });

    return {
      offerIndex,
      pawnId: pawn.id,
      container,
    };
  }

  private readonly handleStartWavePressed = (): void => {
    emit('stage:start-wave-requested');
  };

  private readonly handleRerollPressed = (): void => {
    if (this.runtime.phase !== 'build' || this.stageFlowCoordination.isTransitioning) {
      return;
    }

    const rerollCost = getStageShopRerollCost(this.runtime);
    const applied = rerollStageShopOffers(this.runtime);
    this.transientStatusText = applied ? null : `Need ${rerollCost} coins to reroll.`;

    if (applied) {
      this.refreshBuildUI();
      this.publishSnapshot();
      return;
    }

    this.syncPresentation();
  };

  private readonly handleStartWaveRequested = (): void => {
    this.runStageFlowIntent({ type: 'stage:start-wave-requested' });
  };

  private readonly handleCombatEnded = (
    payload: { outcome: 'victory' | 'defeat'; chronoCurrent: number; chronoMax: number },
  ): void => {
    this.runStageFlowIntent({
      type: 'stage:combat-ended',
      outcome: payload.outcome,
      chronoRemaining: payload.chronoCurrent,
    });
  };

  private playCombatPhaseOutro(onComplete: () => void): void {
    if (!this.recordContainer || !this.shopPanel || !this.previewCard) {
      onComplete();
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
        onComplete();
      },
    });
  }

  private launchCombatScene(payload: {
    waveIndex: number;
    totalWaves: number;
    stageManaged: true;
    allowRestart: false;
    chronoCurrent: number;
    chronoMax: number;
    slotPawns: Array<{ pawnId: string | null; tier: number | null }>;
    slotPawnIds: Array<string | null>;
    slotPawnTiers: Array<number | null>;
    slotModifiers: SlotModifierAssignment[];
  }): void {
    this.scene.launch(SceneKeys.COMBAT, payload);
    this.stageFlowCoordination.isTransitioning = false;
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
      ? StagePresentationConfig.COMBAT_TO_BUILD_RECORD_START_Y
      : StagePresentationConfig.BUILD_RECORD_CENTER_Y;
    const previewStartY = fromCombat
      ? StagePresentationConfig.PREVIEW_CARD_Y - 72
      : StagePresentationConfig.PREVIEW_CARD_Y;
    const shopStartY = fromCombat
      ? StagePresentationConfig.SHOP_PANEL_Y + 300
      : StagePresentationConfig.SHOP_PANEL_Y + 170;

    this.cameras.main.setZoom(fromCombat ? StagePresentationConfig.COMBAT_TO_BUILD_CAMERA_START_ZOOM : 1);
    this.recordContainer.setY(recordStartY);
    this.recordContainer.setScale(
      fromCombat ? StagePresentationConfig.COMBAT_TO_BUILD_RECORD_START_SCALE : 1,
    );
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
      ease: fromCombat ? 'Cubic.easeOut' : 'Back.easeOut',
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
    const canStartWave = this.canStageStartWave();
    const wave = canStartWave ? getCombatWaveDefinition(this.runtime.currentWaveIndex) : null;
    const preview = wave
      ? createStageWavePreview(wave, currentWave, this.runtime.totalWaves)
      : null;

    const coinsText = `Coins ${this.runtime.coins}`;
    this.phaseLabel?.setText(getPhaseLabel(this.runtime.phase));
    this.coinsGlowLabel?.setText(coinsText);
    this.coinsLabel?.setText(coinsText);
    this.waveLabel?.setText(
      this.runtime.totalWaves > 0
        ? `Wave ${currentWave}/${this.runtime.totalWaves}`
        : 'No Waves Configured',
    );
    if (preview) {
      this.previewBodyLabel?.setText(preview.bodyLines.join('\n'));
      this.previewArchetypeLabel?.setText(preview.archetypeSummary);
    } else {
      this.previewBodyLabel?.setText(getTerminalBody(this.runtime));
      this.previewArchetypeLabel?.setText('');
    }
    this.statusLabel?.setText(this.transientStatusText ?? getStatusLabel(this.runtime));

    this.startWaveButton?.setVisible(canStartWave);
    this.startWaveButton?.setAlpha(canStartWave ? 1 : 0.45);
    this.startWaveButton?.disableInteractive();
    this.rerollButton?.setText(`Reroll ${getStageShopRerollCost(this.runtime)}c`);
    this.rerollButton?.setAlpha(this.runtime.coins >= getStageShopRerollCost(this.runtime) ? 1 : 0.45);
    this.rerollButton?.disableInteractive();

    if (canStartWave && !this.stageFlowCoordination.isTransitioning) {
      this.startWaveButton?.setInteractive({ useHandCursor: true });
    }

    if (this.runtime.phase === 'build' && !this.stageFlowCoordination.isTransitioning) {
      this.rerollButton?.setInteractive({ useHandCursor: true });
    }

    const buildVisible = this.runtime.phase !== 'combat';
    this.recordContainer?.setVisible(buildVisible);
    this.shopPanel?.setVisible(buildVisible);
    this.previewCard?.setVisible(buildVisible);
    this.waveLabel?.setVisible(buildVisible);
    this.statusLabel?.setVisible(buildVisible);
    this.tooltipContainer?.setVisible(buildVisible && (this.inspectedPawn !== null || this.inspectedModifier !== null));
    this.modifierIconViews.forEach((view) => {
      view.container.setVisible(buildVisible);
    });

    this.playCoinFeedbackIfNeeded();
  }

  private showCompatibilityLinkIfApplicable(slotIndex: number): void {
    const pawnId = this.runtime.build.slots[slotIndex]?.pawnId;
    const slotAssignment = this.runtime.slotModifiers.find((assignment) => assignment.slotIndex === slotIndex);

    if (!pawnId || !slotAssignment) {
      return;
    }

    if (!isPawnCompatibleWithModifier(pawnId, slotAssignment.modifierId)) {
      return;
    }

    const iconView = this.modifierIconViews.find((view) => view.slotIndex === slotIndex);
    const pawnView = this.slotViews.find((view) => view.slotIndex === slotIndex)?.pawnContainer;
    if (!iconView || !pawnView) {
      return;
    }

    showCompatibilityLink(this, iconView.container, pawnView);
  }

  private bindPawnInspection(
    container: Phaser.GameObjects.Container,
    tooltipState: StagePawnTooltipState,
  ): void {
    container.on('pointerdown', () => {
      this.clearTooltipHoldTimer();
      this.tooltipHoldTimer = this.time.delayedCall(150, () => {
        this.showPawnTooltip(tooltipState);
      });
    });

    container.on('pointerout', () => {
      if (!this.tooltipLockedByDrag) {
        this.hidePawnTooltip();
      }
      this.clearTooltipHoldTimer();
    });
  }

  private showPawnTooltip(state: StagePawnTooltipState): void {
    const pawn = findPawnDefinition(state.pawnId);
    if (!pawn || !this.tooltipContainer || !this.tooltipSprite || !this.tooltipTitle || !this.tooltipMeta || !this.tooltipTierStars || !this.tooltipRule || !this.tooltipDescription) {
      return;
    }

    this.inspectedModifier = null;
    this.inspectedPawn = state;
    this.tooltipSprite.setVisible(true);
    this.tooltipSprite.setTexture(pawn.art.textureKey, pawn.art.frame);
    this.tooltipTitle.setText(pawn.displayName);
    this.tooltipSprite.setPosition(this.tooltipSprite.x, 2 + pawn.art.offsetY * 0.24);
    this.tooltipTierStars.setVisible(true);
    this.tooltipTierStars.setText('★'.repeat(state.tier));
    this.tooltipMeta.setText(pawn.type === 'generator' ? 'Generator' : 'Finisher');
    this.tooltipMeta.setBackgroundColor(pawn.type === 'generator' ? '#78d9ff' : '#ffa0bf');
    this.tooltipDescription.setText(getPawnTooltipDescription(pawn, state.tier));
    this.tooltipRule.removeAll(true);
    const rule = createRuleLabelContainer(this, pawn, getPawnAccentColor(pawn.color));
    this.tooltipRule.add(rule);

    this.tooltipContainer.setVisible(true);
    this.tooltipContainer.setAlpha(1);
    if (typeof state.slotIndex === 'number') {
      this.showCompatibilityLinkIfApplicable(state.slotIndex);
    }
  }

  private hidePawnTooltip(): void {
    this.inspectedPawn = null;
    if (this.inspectedModifier === null) {
      this.tooltipContainer?.setVisible(false);
      this.tooltipContainer?.setAlpha(0);
    }
  }

  private showModifierTooltip(state: ModifierTooltipState): void {
    const modifier = SLOT_MODIFIER_CONFIG.getModifierById(state.modifierId);
    if (!modifier || !this.tooltipContainer || !this.tooltipSprite || !this.tooltipTitle || !this.tooltipMeta || !this.tooltipTierStars || !this.tooltipRule || !this.tooltipDescription) {
      return;
    }

    this.inspectedPawn = null;
    this.inspectedModifier = state;
    this.tooltipSprite.setVisible(false);
    this.tooltipTitle.setText(modifier.displayName);
    this.tooltipMeta.setText(modifier.rarity === 'premium' ? 'Premium' : 'Common');
    this.tooltipMeta.setBackgroundColor(modifier.rarity === 'premium' ? '#d9a6ff' : '#8fd0ea');
    this.tooltipTierStars.setVisible(false);
    this.tooltipTierStars.setText('');
    this.tooltipDescription.setText(modifier.shortDescription);
    this.tooltipRule.removeAll(true);
    this.tooltipRule.add(createModifierEffectLabel(this, modifier));
    this.tooltipContainer.setVisible(true);
    this.tooltipContainer.setAlpha(1);
    this.showCompatibilityLinkIfApplicable(state.slotIndex);
  }

  private hideModifierTooltip(): void {
    this.inspectedModifier = null;
    if (this.inspectedPawn === null) {
      this.tooltipContainer?.setVisible(false);
      this.tooltipContainer?.setAlpha(0);
    }
  }

  private clearTooltipHoldTimer(): void {
    this.tooltipHoldTimer?.remove(false);
    this.tooltipHoldTimer = undefined;
    this.modifierTooltipHoldTimer?.remove(false);
    this.modifierTooltipHoldTimer = undefined;
  }

  private playCombatPhaseReturn(
    outcome: 'victory' | 'defeat',
    onComplete: () => void,
  ): void {
    this.combatReturnTimer?.remove(false);
    this.combatReturnTimer = undefined;

    const delayMs = outcome === 'victory'
      ? StagePresentationConfig.COMBAT_VICTORY_HOLD_MS
      : 0;

    if (delayMs <= 0) {
      onComplete();
      return;
    }

    this.combatReturnTimer = this.time.delayedCall(delayMs, () => {
      this.combatReturnTimer = undefined;
      onComplete();
    });
  }

  private publishSnapshot(): void {
    const canStartWave = this.canStageStartWave();
    const currentWave = Math.min(this.runtime.currentWaveIndex + 1, Math.max(1, this.runtime.totalWaves));
    const wave = canStartWave ? getCombatWaveDefinition(this.runtime.currentWaveIndex) : null;
    const preview = wave
      ? createStageWavePreview(wave, currentWave, this.runtime.totalWaves)
      : { bodyLines: [getTerminalBody(this.runtime)], archetypeSummary: '' };

    emit('stage:snapshot-updated', {
      phase: this.runtime.phase,
      coins: this.runtime.coins,
      currentWave,
      totalWaves: this.runtime.totalWaves,
      canStartWave,
      previewTitle: preview.bodyLines[0] ?? '',
      previewBody: preview.bodyLines.slice(1).join('\n'),
    });
  }

  private canStageStartWave(): boolean {
    return this.runtime.phase === 'build' && this.runtime.currentWaveIndex < this.runtime.totalWaves;
  }

  private playCoinFeedbackIfNeeded(): void {
    const feedback = getStageCoinFeedback(this.lastPresentedCoins, this.runtime.coins, this.runtime.phase);
    this.lastPresentedCoins = this.runtime.coins;

    if (!feedback || !this.coinFeedbackLabel || !this.coinsGlowLabel) {
      return;
    }

    this.tweens.killTweensOf(this.coinFeedbackLabel);
    this.tweens.killTweensOf(this.coinsGlowLabel);

    this.coinFeedbackLabel
      .setText(feedback.label)
      .setColor(feedback.color)
      .setY(StagePresentationConfig.COIN_FEEDBACK_Y)
      .setScale(0.78)
      .setAlpha(0)
      .setVisible(true);

    this.coinsGlowLabel
      .setScale(1)
      .setAlpha(0.18);

    this.tweens.add({
      targets: this.coinFeedbackLabel,
      y: StagePresentationConfig.COIN_FEEDBACK_Y - StagePresentationConfig.COIN_FEEDBACK_FLOAT_Y,
      scaleX: StagePresentationConfig.COIN_FEEDBACK_SCALE,
      scaleY: StagePresentationConfig.COIN_FEEDBACK_SCALE,
      alpha: 1,
      duration: StagePresentationConfig.COIN_FEEDBACK_DURATION_MS * 0.42,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 40,
      onComplete: () => {
        this.coinFeedbackLabel?.setVisible(false).setAlpha(0).setScale(1);
      },
    });

    this.tweens.add({
      targets: this.coinsGlowLabel,
      alpha: 0.95,
      scaleX: StagePresentationConfig.COIN_LABEL_GLOW_SCALE,
      scaleY: StagePresentationConfig.COIN_LABEL_GLOW_SCALE,
      duration: StagePresentationConfig.COIN_LABEL_GLOW_DURATION_MS,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.coinsGlowLabel?.setAlpha(0).setScale(1);
      },
    });
  }

  private runStageFlowIntent(intent: StageFlowIntent): void {
    const commands = dispatchStageFlowIntent(this.runtime, this.stageFlowCoordination, intent);
    this.executeStageFlowCommands(commands);
  }

  private executeStageFlowCommands(commands: StageFlowCommand[]): void {
    for (let index = 0; index < commands.length; index += 1) {
      const command = commands[index]!;
      switch (command.type) {
        case 'stage:publish-snapshot':
          emit('stage:snapshot-updated', command.payload);
          this.syncPresentation();
          break;
        case 'stage:publish-phase-changed':
          emit('stage:phase-changed', command.payload);
          break;
        case 'stage:play-build-phase-intro':
          this.playBuildPhaseIntro(command.payload.fromCombat);
          break;
        case 'stage:play-combat-phase-return':
          this.playCombatPhaseReturn(command.payload.outcome, () => {
            this.runStageFlowIntent({ type: 'stage:combat-return-finished' });
          });
          return;
        case 'stage:play-combat-phase-outro':
          this.transientStatusText = null;
          this.playCombatPhaseOutro(() => {
            const remainingCommands = commands.slice(index + 1);
            if (remainingCommands.length > 0) {
              this.executeStageFlowCommands(remainingCommands);
            }
          });
          return;
        case 'stage:launch-combat-phase':
          this.launchCombatScene(command.payload);
          break;
        case 'stage:stop-combat-phase-scenes':
          this.stopCombatPhaseScenes(command.payload.sceneKeys);
          break;
        case 'stage:refresh-build-phase':
          this.transientStatusText = null;
          this.refreshBuildUI();
          break;
      }
    }
  }

  private stopCombatPhaseScenes(sceneKeys: readonly [typeof SceneKeys.HUD, typeof SceneKeys.COMBAT]): void {
    for (const sceneKey of sceneKeys) {
      if (this.scene.isActive(sceneKey)) {
        this.scene.stop(sceneKey);
      }
    }
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
    this.combatReturnTimer?.remove(false);
    this.combatReturnTimer = undefined;
    off('stage:start-wave-requested', this.handleStartWaveRequested);
    off('combat:ended', this.handleCombatEnded);
    this.startWaveButton?.off('pointerdown', this.handleStartWavePressed);
    this.rerollButton?.off('pointerdown', this.handleRerollPressed);
    this.input.off(Phaser.Input.Events.DRAG_START);
    this.input.off(Phaser.Input.Events.DRAG);
    this.input.off(Phaser.Input.Events.DRAG_END);
    this.input.off(Phaser.Input.Events.POINTER_UP);
    if (this.coinFeedbackLabel) {
      this.tweens.killTweensOf(this.coinFeedbackLabel);
    }
    if (this.coinsGlowLabel) {
      this.tweens.killTweensOf(this.coinsGlowLabel);
    }
    this.synergySystem?.destroy();
    this.clearTooltipHoldTimer();
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
    return 'Drag cards to slots to buy. Hold for pawn details.';
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
  return pawn.displayName;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function findPawnDefinition(id: string): CombatPawnDefinition | undefined {
  return getCombatPawnDefinitionById(id);
}

function createPawnSprite(
  scene: Phaser.Scene,
  pawn: CombatPawnDefinition,
  size: number,
): Phaser.GameObjects.Image {
  const sprite = scene.add.image(pawn.art.offsetX, pawn.art.offsetY, pawn.art.textureKey, pawn.art.frame);
  sprite.setOrigin(0.5, 0.5);
  sprite.setDisplaySize(size, size);
  return sprite;
}

function getPawnTooltipDescription(
  pawn: CombatPawnDefinition,
  tier: number,
): string {
  const damage = getScaledPawnDamage(pawn.ability.damage, tier);
  const secondary = pawn.ability.secondaryEffect;

  switch (pawn.ability.primaryArchetype) {
    case 'projectile':
      if (pawn.ability.pattern === 'single-shot') {
        return `Single precise shot for ${damage} damage.`;
      }
      if (pawn.ability.pattern === 'shotgun-spread') {
        const healSuffix = secondary?.kind === 'base-heal-from-damage'
          ? ` Heals the base for ${Math.round(secondary.healPercent * 100)}% of damage dealt.`
          : '';
        return `Burst of ${pawn.ability.projectileCount ?? 1} projectiles for ${damage} damage each.${healSuffix}`;
      }
      if (secondary?.kind === 'bounce-on-hit') {
        return `Burst of ${pawn.ability.volleyShotCount ?? 1} shots for ${damage} damage. Each shot can bounce once.`;
      }
      if (secondary?.kind === 'split-on-hit') {
        return `Burst of ${pawn.ability.volleyShotCount ?? 1} shots for ${damage} damage. On hit, each shot splits into ${secondary.childCount}.`;
      }
      return `Burst volley of ${pawn.ability.volleyShotCount ?? 1} shots for ${damage} damage.`;
    case 'explosion':
      if (pawn.ability.pattern === 'delayed-blast') {
        const burnSuffix = secondary?.kind === 'burn-zone-on-detonation'
          ? ` Leaves a burning zone for ${formatSeconds(secondary.zoneDurationMs)}.`
          : '';
        return `After ${formatSeconds(pawn.ability.delayMs ?? 0)}, detonates for ${damage} damage in a ${pawn.ability.radius} radius.${burnSuffix}`;
      }
      if (secondary?.kind === 'high-hp-bonus-damage') {
        return `Targeted burst for ${damage} damage in a ${pawn.ability.radius} radius. Deals +${Math.round(secondary.bonusDamagePercent * 100)}% to high-HP targets.`;
      }
      return `Targeted burst for ${damage} damage in a ${pawn.ability.radius} radius.`;
    case 'beam':
      if (pawn.ability.pattern === 'lock-on-beam') {
        return `Locks a beam for ${formatSeconds(pawn.ability.durationMs)}, ticking ${damage} damage every ${formatSeconds(pawn.ability.tickIntervalMs ?? 0)}. If the target dies, the beam jumps to the next frontmost enemy.`;
      }
      if (secondary?.kind === 'slow-on-hit') {
        return `Deploys a static emitter that sweeps a beam upward for ${formatSeconds(pawn.ability.durationMs)}. New crossings take ${damage} damage and ${Math.round((1 - secondary.slowMultiplier) * 100)}% slow for ${formatSeconds(secondary.durationMs)}.`;
      }
      return `Deploys a static emitter that sweeps a beam upward for ${formatSeconds(pawn.ability.durationMs)} dealing ${damage} damage on crossings.`;
    case 'zone':
      if (secondary?.kind === 'next-slot-damage-buff') {
        return `Creates a ${pawn.ability.radius}-radius field for ${formatSeconds(pawn.ability.durationMs)}. Buffs the next slot by ${Math.round(secondary.damageBonusPercent * 100)}% damage.`;
      }
      return `Creates a ${pawn.ability.radius}-radius zone for ${formatSeconds(pawn.ability.durationMs)}, dealing ${damage} damage every ${formatSeconds(pawn.ability.tickIntervalMs)}.`;
  }
}

function formatSeconds(durationMs: number): string {
  const seconds = durationMs / 1000;
  return Number.isInteger(seconds) ? `${seconds} sec.` : `${seconds.toFixed(1)} sec.`;
}

function getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = Phaser.Math.DegToRad(angleDeg);

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function createRuleLabelContainer(
  scene: Phaser.Scene,
  pawn: CombatPawnDefinition,
  accentColor: number,
): Phaser.GameObjects.Container {
  const white = '#f5f7ff';
  const accentHex = `#${accentColor.toString(16).padStart(6, '0')}`;

  let glyphs: Array<{ text: string; color: string; fontSize: number }>;

  if (pawn.type === 'generator') {
    glyphs = [
      { text: '+', color: white, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
    ];
  } else {
    const outputHex = (pawn as any).outputNoteColor
      ? `#${getPawnAccentColor((pawn as any).outputNoteColor).toString(16).padStart(6, '0')}`
      : accentHex;
    glyphs = [
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '>', color: white, fontSize: 20 },
      { text: '♪', color: outputHex, fontSize: 20 },
    ];
  }

  const textObjects = glyphs.map((g) => {
    const text = scene.add.text(0, 0, g.text, {
      color: g.color,
      fontFamily: 'monospace',
      fontSize: `${g.fontSize}px`,
      fontStyle: g.text === '>' ? 'normal' : 'bold',
    });
    text.setOrigin(0.5, 0.5);
    return text;
  });

  const totalWidth = textObjects.reduce((w, t) => w + t.width, 0);
  let offsetX = -totalWidth / 2;

  for (const text of textObjects) {
    text.x = offsetX;
    offsetX += text.width;
  }

  const container = scene.add.container(0, 0, textObjects);
  return container;
}

function createModifierEffectLabel(
  scene: Phaser.Scene,
  modifier: SlotModifierDefinition,
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, formatModifierEffectLabel(modifier.effectKind), {
    color: '#071019',
    backgroundColor: getModifierEffectLabelColor(modifier.effectKind),
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: { left: 8, right: 8, top: 5, bottom: 5 },
  }).setOrigin(0, 0.5);
}

function formatModifierEffectLabel(effectKind: SlotModifierDefinition['effectKind']): string {
  switch (effectKind) {
    case 'output-note-bonus':
      return 'Extra Notes';
    case 'color-output-note-bonus':
      return 'Color Notes';
    case 'projectile-bonus':
      return 'Projectile';
    case 'aoe-radius-scale':
      return 'AoE';
    case 'beam-count-bonus':
      return 'Beam';
    case 'double-activation':
      return 'Double Act';
  }
}

function getModifierEffectLabelColor(effectKind: SlotModifierDefinition['effectKind']): string {
  switch (effectKind) {
    case 'output-note-bonus':
    case 'color-output-note-bonus':
      return '#ffd58a';
    case 'projectile-bonus':
    case 'beam-count-bonus':
      return '#9bdcff';
    case 'aoe-radius-scale':
      return '#9ff0ba';
    case 'double-activation':
      return '#d9a6ff';
  }
}
