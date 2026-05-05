import Phaser from 'phaser';
import { CombatWaveConfig, getCombatWaveDefinition } from '@config/CombatWaveConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { SceneKeys } from '@config/GameConfig';
import { emit, off, on } from '@events/EventBus';
import {
  canStageStartWave,
  createStageRuntime,
  requestStageWaveStart,
  resolveStageCombatOutcome,
  type StageRuntime,
} from '@stage/StageRuntime';
import { createStageWavePreview } from '@stage/StageWavePreview';

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
  private buildFrame?: Phaser.GameObjects.Rectangle;

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
    on('stage:start-wave-requested', this.handleStartWaveRequested);
    on('combat:ended', this.handleCombatEnded);

    this.publishSnapshot();
    this.syncPresentation();
    emit('scene:ready', { key: this.scene.key });
    emit('stage:scene-ready', { key: this.scene.key, phase: this.runtime.phase });
    emit('game:ready');
  }

  private renderBuildPhaseLayout(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x09101a, 1);
    this.add.ellipse(width / 2, height - 150, width * 0.88, width * 0.88, 0x111b28, 0.95);
    this.add.ellipse(width / 2, height - 150, width * 0.68, width * 0.68, 0x0b1118, 0.98);
    this.add.rectangle(width / 2, height - 150, 12, 12, 0x8ef7ff, 1);
    this.add.rectangle(width / 2, 140, width - 72, 2, 0x57d9ff, 0.5);

    this.titleLabel = this.add.text(width / 2, 88, 'Arcane Rave', {
      color: '#f2f6ff',
      fontFamily: 'monospace',
      fontSize: '42px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.phaseLabel = this.add.text(56, 170, '', {
      color: '#8ef7ff',
      fontFamily: 'monospace',
      fontSize: '22px',
    });

    this.coinsLabel = this.add.text(width - 56, 170, '', {
      color: '#ffe08e',
      fontFamily: 'monospace',
      fontSize: '22px',
      align: 'right',
    }).setOrigin(1, 0);

    this.buildFrame = this.add.rectangle(width / 2, 420, width - 96, 360, 0x101b29, 0.92);
    this.buildFrame.setStrokeStyle(2, 0x57d9ff, 0.7);

    this.waveLabel = this.add.text(width / 2, 280, '', {
      color: '#f2f6ff',
      fontFamily: 'monospace',
      fontSize: '34px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.previewTitleLabel = this.add.text(82, 336, '', {
      color: '#8db8d8',
      fontFamily: 'monospace',
      fontSize: '20px',
    });

    this.previewBodyLabel = this.add.text(82, 382, '', {
      color: '#d7e7f5',
      fontFamily: 'monospace',
      fontSize: '22px',
      lineSpacing: 10,
    });

    this.statusLabel = this.add.text(width / 2, 846, '', {
      color: '#d7e7f5',
      fontFamily: 'monospace',
      fontSize: '22px',
      align: 'center',
      wordWrap: { width: width - 120 },
    }).setOrigin(0.5, 0.5);

    this.startWaveButton = this.add.text(width / 2, height - 130, 'Start Wave', {
      color: '#08131d',
      backgroundColor: '#8ef7ff',
      fontFamily: 'monospace',
      fontSize: '30px',
      align: 'center',
      padding: {
        left: 28,
        right: 28,
        top: 18,
        bottom: 18,
      },
    }).setOrigin(0.5, 0.5);
    this.startWaveButton.setInteractive({ useHandCursor: true });
    this.startWaveButton.on('pointerdown', this.handleStartWavePressed);
  }

  private readonly handleStartWavePressed = (): void => {
    emit('stage:start-wave-requested');
  };

  private readonly handleStartWaveRequested = (): void => {
    if (!requestStageWaveStart(this.runtime)) {
      return;
    }

    emit('stage:phase-changed', { phase: this.runtime.phase });
    this.publishSnapshot();
    this.syncPresentation();

    this.scene.launch(SceneKeys.COMBAT, {
      waveIndex: this.runtime.currentWaveIndex,
      totalWaves: this.runtime.totalWaves,
      stageManaged: true,
      allowRestart: false,
    });
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

    this.publishSnapshot();
    this.syncPresentation();
  };

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
    this.statusLabel?.setText(getStatusLabel(this.runtime));

    this.startWaveButton?.setVisible(canStartWave);
    this.startWaveButton?.setAlpha(canStartWave ? 1 : 0.55);
    this.startWaveButton?.disableInteractive();

    if (canStartWave) {
      this.startWaveButton?.setInteractive({ useHandCursor: true });
    }

    const buildVisible = this.runtime.phase !== 'combat';
    this.buildFrame?.setVisible(buildVisible);
    this.waveLabel?.setVisible(buildVisible);
    this.previewTitleLabel?.setVisible(buildVisible);
    this.previewBodyLabel?.setVisible(buildVisible);
    this.statusLabel?.setVisible(buildVisible);
    this.phaseLabel?.setVisible(true);
    this.coinsLabel?.setVisible(true);
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

  private handleShutdown(): void {
    off('stage:start-wave-requested', this.handleStartWaveRequested);
    off('combat:ended', this.handleCombatEnded);
    this.startWaveButton?.off('pointerdown', this.handleStartWavePressed);
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
    return 'Shape your build, read the next wave, then launch combat manually.';
  }

  if (runtime.phase === 'combat') {
    return 'Combat is active. Return comes automatically when the wave resolves.';
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
