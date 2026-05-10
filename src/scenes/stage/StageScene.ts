import Phaser from 'phaser';
import {
  CombatContentConfig,
  type CombatPawnDefinition,
} from '@config/CombatContentConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { getStageConfig } from '@config/StageRegistry';
import type { StageWavePreviewModel } from '@config/StageConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { SceneKeys } from '@config/GameConfig';
import { emit, off, on } from '@events/EventBus';
import {
  createStageRuntime,
  getStageShopRerollCost,
  rerollStageShopOffers,
  type StageRuntime,
} from '@stage/StageRuntime';
import { createStageWavePreview } from '@stage/StageWavePreview';
import { getStageCoinFeedback } from './StageCoinFeedback';
import {
  createStageFlowCoordinationState,
  dispatchStageFlowIntent,
  type StageFlowCommand,
  type StageFlowCoordinationState,
  type StageFlowIntent,
} from '@stage/StageFlowCoordinator';
import type { SlotModifierAssignment } from '@modifiers/SlotModifierAssignment';
import { StageRecordView } from './StageRecordView';
import { StageShopView } from './StageShopView';
import { StageDragController } from './StageDragController';
import { StageTooltipController } from './StageTooltipController';
import { StageFlowAnimator } from './StageFlowAnimator';
import { handleReturnToLobby } from './handleReturnToLobby';
import { populatePreviewCard, type PreviewCardState } from './StagePreviewCard';

export class StageScene extends Phaser.Scene {
  private runtime!: StageRuntime;
  private phaseLabel?: Phaser.GameObjects.Text;
  private coinsGlowLabel?: Phaser.GameObjects.Text;
  private coinsLabel?: Phaser.GameObjects.Text;
  private coinFeedbackLabel?: Phaser.GameObjects.Text;
  private previewCardState: PreviewCardState | undefined = undefined;
  private statusLabel?: Phaser.GameObjects.Text;
  private startWaveButton?: Phaser.GameObjects.Text;
  private previewCard?: Phaser.GameObjects.Container;
  private transientStatusText: string | null = null;
  private lastPresentedCoins: number | null = null;
  private readonly stageFlowCoordination: StageFlowCoordinationState = createStageFlowCoordinationState();

  private recordView!: StageRecordView;
  private shopView!: StageShopView;
  private dragController!: StageDragController;
  private tooltipController!: StageTooltipController;
  private flowAnimator!: StageFlowAnimator;

  constructor() {
    super({ key: SceneKeys.STAGE });
  }

  create(data?: { stageId?: string }): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const stageId = data?.stageId ?? 'redline-routine';
    const stageConfig = getStageConfig(stageId);

    if (!stageConfig) {
      throw new Error(`Unknown stage ID: ${stageId}`);
    }

    this.runtime = createStageRuntime(stageConfig);

    this.renderLayout();
    this.createAdapters();
    this.wireEvents();

    this.refreshBuildUI();
    this.runStageFlowIntent({ type: 'stage:initialized' });
    emit('scene:ready', { key: this.scene.key });
    emit('stage:scene-ready', { key: this.scene.key, phase: this.runtime.phase });
    emit('game:ready');
  }

  update(time: number, delta: number): void {
    this.recordView.updateSynergyVisuals(time, delta);
  }

  /* ------------------------------------------------------------------ */
  /*  Layout (backdrop, preview, text labels, start button)              */
  /* ------------------------------------------------------------------ */

  private renderLayout(): void {
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
    const width = StagePresentationConfig.PREVIEW_CARD_WIDTH;
    const height = StagePresentationConfig.PREVIEW_CARD_HEIGHT;
    const container = this.add.container(
      StagePresentationConfig.PREVIEW_CARD_X - width / 2,
      StagePresentationConfig.PREVIEW_CARD_Y - height / 2,
    );
    const graphics = this.add.graphics();

    graphics.fillStyle(0x0d1725, 0.92);
    graphics.fillRoundedRect(0, 0, width, height, 28);
    graphics.lineStyle(2, 0x56d6ff, 0.5);
    graphics.strokeRoundedRect(0, 0, width, height, 28);

    container.add(graphics);

    return container;
  }

  /* ------------------------------------------------------------------ */
  /*  Adapters                                                           */
  /* ------------------------------------------------------------------ */

  private createAdapters(): void {
    this.recordView = new StageRecordView(this, () => this.runtime);
    this.recordView.create();
    this.recordView.createSynergySystem();
    this.recordView.createModifierIcons(this.runtime);

    this.shopView = new StageShopView(this, this.handleRerollPressed, () => {
      for (const cardView of this.shopView.cardViews) {
        this.tooltipController.bindPawnInspection(cardView.container, {
          pawnId: cardView.pawnId,
          tier: 1,
        });
      }
    });

    this.tooltipController = new StageTooltipController(this, this.recordView, () => this.runtime);

    for (const iconView of this.recordView.modifierIconViews) {
      this.tooltipController.bindModifierInspection(iconView);
    }

    this.flowAnimator = new StageFlowAnimator(
      this,
      this.recordView.container,
      this.shopView.container,
      this.previewCard!,
    );

    this.dragController = new StageDragController(
      this,
      this.recordView,
      this.shopView,
      this.tooltipController,
      () => this.runtime,
      () => this.stageFlowCoordination.isTransitioning,
      {
        onApplied: () => {
          this.refreshBuildUI();
          this.publishSnapshot();
        },
        onFailed: () => {
          this.syncPresentation();
        },
        onStatusChanged: (msg) => {
          this.transientStatusText = msg;
        },
      },
    );
    this.dragController.bind();
  }

  private refreshBuildUI(): void {
    this.recordView.refresh(this.runtime);
    this.shopView.refresh(
      this.runtime.build.shopOffers,
      this.runtime.coins,
      getStageShopRerollCost(this.runtime),
    );
    this.bindTooltipsToPawns();
    this.syncPresentation();
  }

  private bindTooltipsToPawns(): void {
    for (const slotView of this.recordView.slotViews) {
      if (!slotView.pawnContainer) continue;
      const pawnInstance = this.runtime.build.slots[slotView.slotIndex];
      if (!pawnInstance) continue;
      this.tooltipController.bindPawnInspection(slotView.pawnContainer, {
        pawnId: pawnInstance.pawnId,
        tier: pawnInstance.tier,
        slotIndex: slotView.slotIndex,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Event wiring                                                       */
  /* ------------------------------------------------------------------ */

  private wireEvents(): void {
    on('stage:start-wave-requested', this.handleStartWaveRequested);
    on('combat:ended', this.handleCombatEnded);
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
    payload: { outcome: 'victory' | 'defeat'; chronoCurrent: number; chronoMax: number; remainingBaseHp: number },
  ): void => {
    this.runStageFlowIntent({
      type: 'stage:combat-ended',
      outcome: payload.outcome,
      chronoRemaining: payload.chronoCurrent,
      remainingBaseHp: payload.remainingBaseHp,
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Presentation sync                                                  */
  /* ------------------------------------------------------------------ */

  private syncPresentation(): void {
    const currentWave = Math.min(this.runtime.currentWaveIndex + 1, Math.max(1, this.runtime.totalWaves));
    const canStartWave = this.canStageStartWave();
    const wavePreview = this.buildWavePreview(canStartWave, currentWave);

    const coinsText = `Coins ${this.runtime.coins}`;
    this.phaseLabel?.setText(getPhaseLabel(this.runtime.phase));
    this.coinsGlowLabel?.setText(coinsText);
    this.coinsLabel?.setText(coinsText);
    if (this.previewCard) {
      this.previewCardState = populatePreviewCard(
        this,
        this.previewCard,
        wavePreview,
        StagePresentationConfig.PREVIEW_CARD_WIDTH,
        this.previewCardState,
        wavePreview ? undefined : getTerminalBody(this.runtime),
      );
    }
    this.statusLabel?.setText(this.transientStatusText ?? getStatusLabel(this.runtime));

    this.startWaveButton?.setVisible(canStartWave);
    this.startWaveButton?.setAlpha(canStartWave ? 1 : 0.45);
    this.startWaveButton?.disableInteractive();
    this.shopView.rerollButton.disableInteractive();

    if (canStartWave && !this.stageFlowCoordination.isTransitioning) {
      this.startWaveButton?.setInteractive({ useHandCursor: true });
    }

    if (this.runtime.phase === 'build' && !this.stageFlowCoordination.isTransitioning) {
      this.shopView.rerollButton.setInteractive({ useHandCursor: true });
    }

    const buildVisible = this.runtime.phase !== 'combat';
    this.recordView.container.setVisible(buildVisible);
    this.shopView.container.setVisible(buildVisible);
    this.previewCard?.setVisible(buildVisible);
    this.statusLabel?.setVisible(buildVisible);
    this.tooltipController.container.setVisible(buildVisible && this.tooltipController.isVisible());
    this.recordView.modifierIconViews.forEach((view) => {
      view.container.setVisible(buildVisible);
    });

    this.playCoinFeedbackIfNeeded();
  }

  private buildWavePreview(
    canStartWave: boolean,
    currentWave: number,
  ): StageWavePreviewModel | null {
    if (!canStartWave || !this.runtime.stageConfig.waves) {
      return null;
    }

    const stageWaveDef = this.runtime.stageConfig.waves[this.runtime.currentWaveIndex];
    if (!stageWaveDef) {
      return null;
    }

    return createStageWavePreview(stageWaveDef, currentWave, this.runtime.totalWaves);
  }

  private publishSnapshot(): void {
    const canStartWave = this.canStageStartWave();
    const currentWave = Math.min(this.runtime.currentWaveIndex + 1, Math.max(1, this.runtime.totalWaves));
    const wavePreview = this.buildWavePreview(canStartWave, currentWave);

    emit('stage:snapshot-updated', {
      phase: this.runtime.phase,
      coins: this.runtime.coins,
      currentWave,
      totalWaves: this.runtime.totalWaves,
      canStartWave,
      wavePreview,
    });
  }

  private canStageStartWave(): boolean {
    return this.runtime.phase === 'build' && this.runtime.currentWaveIndex < this.runtime.totalWaves;
  }

  /* ------------------------------------------------------------------ */
  /*  Coin feedback                                                      */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /*  Flow orchestration                                                 */
  /* ------------------------------------------------------------------ */

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
          this.flowAnimator.playBuildIntro(command.payload.fromCombat);
          break;
        case 'stage:play-combat-phase-return':
          this.flowAnimator.playCombatReturn(command.payload.outcome, () => {
            this.runStageFlowIntent({ type: 'stage:combat-return-finished' });
          });
          return;
        case 'stage:play-combat-phase-outro':
          this.transientStatusText = null;
          this.flowAnimator.playCombatOutro(() => {
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
        case 'stage:return-to-lobby': {
          handleReturnToLobby(command.payload);
          this.scene.start(SceneKeys.LOBBY, {
            showResult: true,
            stageId: command.payload.stageId,
          });
          return;
        }
      }
    }
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
    subWaves: Array<{ id: string; startTimeMs: number; spawnIntervalMs: number; enemies: Record<string, number> }>;
    enemyStatOverrides: Record<string, { maxHp: number }>;
  }): void {
    this.scene.launch(SceneKeys.COMBAT, payload);
    this.stageFlowCoordination.isTransitioning = false;
  }

  private stopCombatPhaseScenes(sceneKeys: readonly [typeof SceneKeys.HUD, typeof SceneKeys.COMBAT]): void {
    for (const sceneKey of sceneKeys) {
      if (this.scene.isActive(sceneKey)) {
        this.scene.stop(sceneKey);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Shutdown                                                           */
  /* ------------------------------------------------------------------ */

  private handleShutdown(): void {
    if (this.previewCardState) {
      this.previewCardState.waveLabel?.destroy();
      for (const pill of this.previewCardState.pillContainers) {
        pill.destroy();
      }
      this.previewCardState.enemyCard?.destroy();
      this.previewCardState = undefined;
    }
    this.flowAnimator.destroy();
    off('stage:start-wave-requested', this.handleStartWaveRequested);
    off('combat:ended', this.handleCombatEnded);
    this.startWaveButton?.off('pointerdown', this.handleStartWavePressed);
    this.dragController.unbind();
    if (this.coinFeedbackLabel) {
      this.tweens.killTweensOf(this.coinFeedbackLabel);
    }
    if (this.coinsGlowLabel) {
      this.tweens.killTweensOf(this.coinsGlowLabel);
    }
    this.recordView.destroy();
    this.shopView.destroy();
    this.tooltipController.destroy();
  }
}

/* ------------------------------------------------------------------ */
/*  Module-level helpers                                               */
/* ------------------------------------------------------------------ */

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
