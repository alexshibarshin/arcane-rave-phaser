import Phaser from 'phaser';
import { getCombatOverlayActions, getCombatOverlayText } from '@combat/CombatHudBridge';
import { createCombatRenderModel } from '@combat/CombatRenderModel';
import { emit, off, on } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { UIScene } from '@scenes/UIScene';
import type { CombatState } from '@combat/CombatRuntime';

export class HUDScene extends UIScene {
  private pauseButton?: Phaser.GameObjects.Container;
  private stateLabel?: Phaser.GameObjects.Text;
  private waveLabel?: Phaser.GameObjects.Text;
  private enemiesLabel?: Phaser.GameObjects.Text;
  private overlayBackdrop?: Phaser.GameObjects.Rectangle;
  private overlayLabel?: Phaser.GameObjects.Text;
  private overlayResumeButton?: Phaser.GameObjects.Text;
  private overlayRestartButton?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.HUD);
  }

  create(): void {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const model = createCombatRenderModel();
    this.pauseButton = this.createPauseButton(
      model.hud.pause.x,
      model.hud.pause.y,
      model.hud.pause.width,
      model.hud.pause.height,
      model.hud.pause.hitWidth,
      model.hud.pause.hitHeight,
    );
    this.pauseButton.setDepth(model.hud.depth);

    this.waveLabel = this.add.text(
      model.hud.wave.x,
      model.hud.wave.y,
      'Wave 1/1',
      this.getLabelStyle(model.hud.wave.align),
    );
    this.waveLabel.setOrigin(0.5, 0);
    this.waveLabel.setDepth(model.hud.depth);

    this.enemiesLabel = this.add.text(
      model.hud.enemies.x,
      model.hud.enemies.y,
      'Enemies 0',
      this.getLabelStyle(model.hud.enemies.align),
    );
    this.enemiesLabel.setOrigin(1, 0);
    this.enemiesLabel.setDepth(model.hud.depth);

    this.stateLabel = this.add.text(
      model.hud.wave.x,
      model.hud.wave.y + 28,
      'State: preview',
      this.getSecondaryLabelStyle(),
    );
    this.stateLabel.setOrigin(0.5, 0);
    this.stateLabel.setDepth(model.hud.depth);

    this.overlayBackdrop = this.add.rectangle(
      model.background.width / 2,
      model.background.height / 2,
      model.background.width,
      model.background.height,
      0x050914,
      0.58,
    );
    this.overlayBackdrop.setDepth(CombatLayoutConfig.DEPTH.OVERLAY);
    this.overlayBackdrop.setVisible(false);

    this.overlayLabel = this.add.text(
      model.hud.overlay.label.x,
      model.hud.overlay.label.y,
      '',
      {
        color: '#f2f6ff',
        fontFamily: 'monospace',
        fontSize: '48px',
        align: 'center',
      },
    );
    this.overlayLabel.setOrigin(0.5, 0.5);
    this.overlayLabel.setDepth(CombatLayoutConfig.DEPTH.OVERLAY);
    this.overlayLabel.setVisible(false);

    this.overlayResumeButton = this.createOverlayButton(
      model.hud.overlay.primaryAction.x,
      model.hud.overlay.primaryAction.y,
      'Resume',
      this.handleResumePressed,
    );

    this.overlayRestartButton = this.add.text(
      model.hud.overlay.secondaryAction.x,
      model.hud.overlay.secondaryAction.y,
      'Restart',
      this.getOverlayButtonStyle(),
    );
    this.overlayRestartButton.setOrigin(0.5, 0.5);
    this.overlayRestartButton.setDepth(CombatLayoutConfig.DEPTH.OVERLAY);
    this.overlayRestartButton.setInteractive({ useHandCursor: true });
    this.overlayRestartButton.on('pointerdown', this.handleRestartPressed);
    this.overlayRestartButton.setVisible(false);

    on('combat:state-changed', this.handleStateChanged);
    on('combat:hud-wave-updated', this.handleWaveUpdated);
    on('combat:hud-enemies-updated', this.handleEnemiesUpdated);

    emit('combat:hud-ready', { key: this.scene.key });
  }

  private readonly handleStateChanged = (payload: { state: CombatState }): void => {
    this.stateLabel?.setText(`State: ${payload.state}`);
    this.syncOverlay(payload.state);
  };

  private readonly handleWaveUpdated = (payload: { current: number; total: number }): void => {
    this.waveLabel?.setText(`Wave ${payload.current}/${payload.total}`);
  };

  private readonly handleEnemiesUpdated = (payload: { remaining: number }): void => {
    this.enemiesLabel?.setText(`Enemies ${payload.remaining}`);
  };

  private readonly handleRestartPressed = (): void => {
    emit('combat:restart-requested');
  };

  private readonly handlePausePressed = (): void => {
    emit('combat:pause-requested');
  };

  private readonly handleResumePressed = (): void => {
    emit('combat:resume-requested');
  };

  private getLabelStyle(align: 'left' | 'center' | 'right'): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#f2f6ff',
      fontFamily: 'monospace',
      fontSize: '22px',
      align,
    };
  }

  private getSecondaryLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#8db8d8',
      fontFamily: 'monospace',
      fontSize: '16px',
      align: 'center',
    };
  }

  private getOverlayButtonStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#0a1017',
      backgroundColor: '#8ef7ff',
      fontFamily: 'monospace',
      fontSize: '28px',
      align: 'center',
      padding: {
        left: 20,
        right: 20,
        top: 12,
        bottom: 12,
      },
    };
  }

  private createOverlayButton(
    x: number,
    y: number,
    label: string,
    handler: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, this.getOverlayButtonStyle());
    button.setOrigin(0.5, 0.5);
    button.setDepth(CombatLayoutConfig.DEPTH.OVERLAY);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', handler);
    button.setVisible(false);
    return button;
  }

  private createPauseButton(
    x: number,
    y: number,
    width: number,
    height: number,
    hitWidth: number,
    hitHeight: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const background = this.add.graphics();
    const bars = this.add.graphics();
    const innerInset = 4;
    const barWidth = 8;
    const barHeight = 20;
    const barGap = 6;
    const centerX = width / 2;
    const centerY = height / 2;
    const barsStartX = centerX - barGap / 2 - barWidth;
    const barsY = centerY - barHeight / 2;

    background.fillStyle(0x08131d, 0.9);
    background.fillRoundedRect(0, 0, width, height, 14);
    background.lineStyle(2, 0x57d9ff, 0.8);
    background.strokeRoundedRect(1, 1, width - 2, height - 2, 13);
    background.lineStyle(1, 0xa6f6ff, 0.28);
    background.strokeRoundedRect(innerInset, innerInset, width - innerInset * 2, height - innerInset * 2, 10);

    bars.fillStyle(0x8ef7ff, 1);
    bars.fillRoundedRect(barsStartX, barsY, barWidth, barHeight, 3);
    bars.fillRoundedRect(barsStartX + barWidth + barGap, barsY, barWidth, barHeight, 3);
    bars.fillStyle(0xdffdff, 0.2);
    bars.fillRoundedRect(barsStartX, barsY, barWidth, 5, 3);
    bars.fillRoundedRect(barsStartX + barWidth + barGap, barsY, barWidth, 5, 3);

    container.add([background, bars]);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        0,
        0,
        hitWidth,
        hitHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    if (container.input) {
      container.input.cursor = 'pointer';
    }
    container.on('pointerdown', this.handlePausePressed);
    return container;
  }

  private syncOverlay(state: CombatState): void {
    const overlayText = getCombatOverlayText(state);
    const overlayActions = getCombatOverlayActions(state);
    const isVisible = overlayText !== null;

    this.overlayBackdrop?.setVisible(isVisible);
    this.overlayLabel?.setVisible(isVisible);
    this.pauseButton?.setVisible(state === 'preview' || state === 'running');
    this.overlayResumeButton?.setVisible(overlayActions.includes('Resume'));
    this.overlayRestartButton?.setVisible(overlayActions.includes('Restart'));

    if (overlayText) {
      this.overlayLabel?.setText(overlayText);
    }
  }

  private handleShutdown(): void {
    off('combat:state-changed', this.handleStateChanged);
    off('combat:hud-wave-updated', this.handleWaveUpdated);
    off('combat:hud-enemies-updated', this.handleEnemiesUpdated);
    this.pauseButton?.off('pointerdown', this.handlePausePressed);
    this.overlayResumeButton?.off('pointerdown', this.handleResumePressed);
    this.overlayRestartButton?.off('pointerdown', this.handleRestartPressed);
  }
}
