import Phaser from 'phaser';
import { getCombatOverlayActions, getCombatOverlayText } from '@combat/CombatHudBridge';
import { createCombatRenderModel } from '@combat/CombatRenderModel';
import { emit, off, on } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { UIScene } from '@scenes/UIScene';
import type { CombatState, CombatTimeControlMode } from '@combat/CombatRuntime';

export class HUDScene extends UIScene {
  private allowRestart = true;
  private currentState: CombatState = 'preview';
  private heldTimeControlMode: CombatTimeControlMode = 'idle';
  private activeTimeControlMode: CombatTimeControlMode = 'idle';
  private activeTimeControlIntensity = 0;
  private chronoCurrent = 0;
  private chronoMax = 0;
  private readonly renderModel = createCombatRenderModel();
  private pauseButton?: Phaser.GameObjects.Container;
  private rewindButton?: Phaser.GameObjects.Container;
  private fastForwardButton?: Phaser.GameObjects.Container;
  private stateLabel?: Phaser.GameObjects.Text;
  private waveLabel?: Phaser.GameObjects.Text;
  private enemiesLabel?: Phaser.GameObjects.Text;
  private chronoLabel?: Phaser.GameObjects.Text;
  private chronoFill?: Phaser.GameObjects.Graphics;
  private chronoGlow?: Phaser.GameObjects.Graphics;
  private chronoSparkLayer?: Phaser.GameObjects.Layer;
  private chronoSparkTimer?: Phaser.Time.TimerEvent;
  private overlayBackdrop?: Phaser.GameObjects.Rectangle;
  private overlayLabel?: Phaser.GameObjects.Text;
  private overlayResumeButton?: Phaser.GameObjects.Text;
  private overlayRestartButton?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.HUD);
  }

  init(data: { allowRestart?: boolean } = {}): void {
    this.allowRestart = data.allowRestart ?? true;
  }

  create(): void {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const model = this.renderModel;
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

    this.chronoGlow = this.add.graphics();
    this.chronoGlow.setDepth(model.timeControls.depth + 0.05);

    this.chronoFill = this.add.graphics();
    this.chronoFill.setDepth(model.timeControls.depth + 0.1);

    this.chronoLabel = this.add.text(
      model.timeControls.chronoBar.x,
      model.timeControls.chronoBar.y + 26,
      'Chrono 0/0',
      {
        color: '#bfefff',
        fontFamily: 'monospace',
        fontSize: `${CombatVisualConfig.TIME_CONTROL.LABEL_FONT_SIZE_PX}px`,
        align: 'center',
      },
    );
    this.chronoLabel.setOrigin(0.5, 0.5);
    this.chronoLabel.setDepth(model.timeControls.depth + 0.15);

    this.rewindButton = this.createTimeControlButton(
      model.timeControls.rewindButton.x,
      model.timeControls.rewindButton.y,
      model.timeControls.rewindButton.width,
      model.timeControls.rewindButton.height,
      'rewind',
    );
    this.fastForwardButton = this.createTimeControlButton(
      model.timeControls.fastForwardButton.x,
      model.timeControls.fastForwardButton.y,
      model.timeControls.fastForwardButton.width,
      model.timeControls.fastForwardButton.height,
      'fast-forward',
    );
    this.chronoSparkLayer = this.add.layer();
    this.chronoSparkLayer.setDepth(model.timeControls.depth + 0.2);
    this.input.on('pointerup', this.handlePointerReleased, this);

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
    on('combat:chrono-updated', this.handleChronoUpdated);
    on('combat:time-control-updated', this.handleTimeControlUpdated);

    this.renderChronoBar();
    emit('combat:hud-ready', { key: this.scene.key });
  }

  private readonly handleStateChanged = (payload: { state: CombatState }): void => {
    this.currentState = payload.state;
    this.stateLabel?.setText(`State: ${payload.state}`);
    this.syncOverlay(payload.state);
    this.syncTimeControlAvailability();
  };

  private readonly handleWaveUpdated = (payload: { current: number; total: number }): void => {
    this.waveLabel?.setText(`Wave ${payload.current}/${payload.total}`);
  };

  private readonly handleEnemiesUpdated = (payload: { remaining: number }): void => {
    this.enemiesLabel?.setText(`Enemies ${payload.remaining}`);
  };

  private readonly handleChronoUpdated = (payload: { current: number; max: number }): void => {
    this.chronoCurrent = payload.current;
    this.chronoMax = payload.max;
    this.renderChronoBar();
  };

  private readonly handleTimeControlUpdated = (payload: {
    requestedMode: CombatTimeControlMode;
    activeMode: CombatTimeControlMode;
    activeIntensity: number;
  }): void => {
    this.activeTimeControlMode = payload.activeMode;
    this.activeTimeControlIntensity = payload.activeIntensity;
    this.renderChronoBar();
    this.syncTimeControlVisuals();
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

  private readonly handlePointerReleased = (): void => {
    this.releaseHeldTimeControl();
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
      new Phaser.Geom.Rectangle(0, 0, hitWidth, hitHeight),
      Phaser.Geom.Rectangle.Contains,
    );
    if (container.input) {
      container.input.cursor = 'pointer';
    }
    container.on('pointerdown', this.handlePausePressed);
    return container;
  }

  private createTimeControlButton(
    x: number,
    y: number,
    width: number,
    height: number,
    mode: Extract<CombatTimeControlMode, 'rewind' | 'fast-forward'>,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const background = this.add.graphics();
    const glyph = this.add.graphics();
    const glow = this.add.graphics();
    const hitTarget = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001);
    const radius = 20;
    const direction = mode === 'rewind' ? -1 : 1;

    glow.fillStyle(0x9be7ff, 0.16);
    glow.fillRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, radius + 6);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(CombatVisualConfig.TIME_CONTROL.INACTIVE_GLOW_ALPHA);

    background.fillStyle(0x08131d, 0.94);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    background.lineStyle(3, 0x57d9ff, 0.78);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);

    glyph.fillStyle(0xdefcff, 1);
    this.drawTimeControlTriangle(glyph, -direction * 22, 0, 28, 36, direction < 0);
    this.drawTimeControlTriangle(glyph, direction * 22, 0, 28, 36, direction < 0);

    hitTarget.setOrigin(0.5, 0.5);
    container.add([glow, background, glyph, hitTarget]);
    container.setDataEnabled();
    container.data?.set('glow', glow);
    container.setDepth(CombatLayoutConfig.DEPTH.HUD);
    container.setSize(width, height);
    hitTarget.setInteractive({ useHandCursor: true });
    if (hitTarget.input) {
      hitTarget.input.cursor = 'pointer';
    }
    hitTarget.on('pointerdown', () => this.handleTimeControlPressed(mode));
    return container;
  }

  private drawTimeControlTriangle(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    pointsLeft: boolean,
  ): void {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (pointsLeft) {
      graphics.fillTriangle(
        centerX - halfWidth,
        centerY,
        centerX + halfWidth,
        centerY - halfHeight,
        centerX + halfWidth,
        centerY + halfHeight,
      );
      return;
    }

    graphics.fillTriangle(
      centerX + halfWidth,
      centerY,
      centerX - halfWidth,
      centerY - halfHeight,
      centerX - halfWidth,
      centerY + halfHeight,
    );
  }

  private handleTimeControlPressed(mode: Extract<CombatTimeControlMode, 'rewind' | 'fast-forward'>): void {
    if (this.currentState !== 'preview' && this.currentState !== 'running') {
      return;
    }

    this.heldTimeControlMode = mode;
    emit('combat:time-control-requested', { mode });
    this.syncTimeControlVisuals();
  }

  private releaseHeldTimeControl(): void {
    if (this.heldTimeControlMode === 'idle') {
      return;
    }

    this.heldTimeControlMode = 'idle';
    emit('combat:time-control-requested', { mode: 'idle' });
    this.syncTimeControlVisuals();
  }

  private renderChronoBar(): void {
    const bar = this.renderModel.timeControls.chronoBar;
    const ratio = this.chronoMax <= 0 ? 0 : Phaser.Math.Clamp(this.chronoCurrent / this.chronoMax, 0, 1);
    const fillWidth = Math.max(0, bar.width * ratio);
    const radius = bar.height / 2;
    const activeColor =
      this.activeTimeControlMode === 'rewind'
        ? CombatVisualConfig.TIME_CONTROL.BAR_FILL_COLOR
        : CombatVisualConfig.TIME_CONTROL.BAR_ACTIVE_COLOR;
    const isActive = this.activeTimeControlMode !== 'idle' && this.activeTimeControlIntensity > 0;

    this.chronoGlow?.clear();
    if (isActive) {
      this.chronoGlow?.fillStyle(activeColor, 0.18 + 0.2 * this.activeTimeControlIntensity);
      this.chronoGlow?.fillRoundedRect(
        bar.x - bar.width / 2 - 8,
        bar.y - bar.height / 2 - 8,
        bar.width + 16,
        bar.height + 16,
        radius + 6,
      );
    }

    this.chronoFill?.clear();
    this.chronoFill?.fillStyle(CombatVisualConfig.TIME_CONTROL.BAR_EMPTY_COLOR, 0.92);
    this.chronoFill?.fillRoundedRect(
      bar.x - bar.width / 2,
      bar.y - bar.height / 2,
      bar.width,
      bar.height,
      radius,
    );
    this.chronoFill?.fillStyle(CombatVisualConfig.TIME_CONTROL.BAR_LOW_COLOR, 0.3);
    this.chronoFill?.fillRoundedRect(
      bar.x - bar.width / 2,
      bar.y - bar.height / 2,
      bar.width,
      bar.height,
      radius,
    );

    if (fillWidth > 0) {
      this.chronoFill?.fillStyle(activeColor, 0.95);
      this.chronoFill?.fillRoundedRect(
        bar.x - bar.width / 2,
        bar.y - bar.height / 2,
        fillWidth,
        bar.height,
        radius,
      );
    }

    this.chronoFill?.lineStyle(2, CombatVisualConfig.TIME_CONTROL.BAR_FRAME_COLOR, 0.88);
    this.chronoFill?.strokeRoundedRect(
      bar.x - bar.width / 2,
      bar.y - bar.height / 2,
      bar.width,
      bar.height,
      radius,
    );

    this.chronoLabel?.setText(`Chrono ${Math.round(this.chronoCurrent)}/${Math.round(this.chronoMax)}`);
  }

  private syncTimeControlAvailability(): void {
    const isVisible = this.currentState === 'preview' || this.currentState === 'running';

    this.rewindButton?.setVisible(isVisible);
    this.fastForwardButton?.setVisible(isVisible);
    this.chronoFill?.setVisible(isVisible);
    this.chronoGlow?.setVisible(isVisible);
    this.chronoLabel?.setVisible(isVisible);
    this.chronoSparkLayer?.setVisible(isVisible);

    if (!isVisible) {
      this.releaseHeldTimeControl();
    }
  }

  private syncTimeControlVisuals(): void {
    this.updateTimeControlButtonState(this.rewindButton, this.heldTimeControlMode === 'rewind');
    this.updateTimeControlButtonState(
      this.fastForwardButton,
      this.heldTimeControlMode === 'fast-forward',
    );
    this.toggleChronoSparkTimer(
      this.activeTimeControlMode !== 'idle' && this.activeTimeControlIntensity > 0,
    );
  }

  private updateTimeControlButtonState(
    button: Phaser.GameObjects.Container | undefined,
    isHeld: boolean,
  ): void {
    const glow = button?.data?.get('glow') as Phaser.GameObjects.Graphics | undefined;

    glow?.setAlpha(
      isHeld
        ? CombatVisualConfig.TIME_CONTROL.ACTIVE_GLOW_ALPHA
        : CombatVisualConfig.TIME_CONTROL.INACTIVE_GLOW_ALPHA,
    );
    button?.setScale(isHeld ? 1.04 : 1);
  }

  private toggleChronoSparkTimer(shouldRun: boolean): void {
    if (shouldRun) {
      if (!this.chronoSparkTimer) {
        this.chronoSparkTimer = this.time.addEvent({
          delay: CombatVisualConfig.TIME_CONTROL.SPARK_INTERVAL_MS,
          loop: true,
          callback: this.emitChronoSpark,
          callbackScope: this,
        });
      }
      return;
    }

    this.chronoSparkTimer?.destroy();
    this.chronoSparkTimer = undefined;
  }

  private emitChronoSpark(): void {
    if (!this.chronoSparkLayer || this.activeTimeControlMode === 'idle') {
      return;
    }

    const bar = this.renderModel.timeControls.chronoBar;
    const spark = this.add.circle(
      Phaser.Math.Between(bar.x - bar.width / 2, bar.x + bar.width / 2),
      bar.y + Phaser.Math.Between(-5, 5),
      Phaser.Math.Between(2, 4),
      this.activeTimeControlMode === 'rewind'
        ? CombatVisualConfig.TIME_CONTROL.BAR_FILL_COLOR
        : CombatVisualConfig.TIME_CONTROL.BAR_ACTIVE_COLOR,
      0.95,
    );
    spark.setBlendMode(Phaser.BlendModes.ADD);
    this.chronoSparkLayer.add(spark);

    const direction = this.activeTimeControlMode === 'rewind' ? -1 : 1;
    const driftX =
      Phaser.Math.Between(
        CombatVisualConfig.TIME_CONTROL.SPARK_MIN_SPEED_PX,
        CombatVisualConfig.TIME_CONTROL.SPARK_MAX_SPEED_PX,
      ) * direction;

    this.tweens.add({
      targets: spark,
      x: spark.x + driftX,
      y: spark.y - Phaser.Math.Between(10, 24),
      alpha: 0,
      scaleX: 0.25,
      scaleY: 0.25,
      duration: CombatVisualConfig.TIME_CONTROL.SPARK_LIFETIME_MS,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  private syncOverlay(state: CombatState): void {
    const overlayText = getCombatOverlayText(state);
    const overlayActions = getCombatOverlayActions(state).filter(
      (action) => this.allowRestart || action !== 'Restart',
    );
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
    this.releaseHeldTimeControl();
    this.chronoSparkTimer?.destroy();
    this.allowRestart = true;
    this.currentState = 'preview';
    this.heldTimeControlMode = 'idle';
    this.activeTimeControlMode = 'idle';
    this.activeTimeControlIntensity = 0;
    this.input.off('pointerup', this.handlePointerReleased, this);
    off('combat:state-changed', this.handleStateChanged);
    off('combat:hud-wave-updated', this.handleWaveUpdated);
    off('combat:hud-enemies-updated', this.handleEnemiesUpdated);
    off('combat:chrono-updated', this.handleChronoUpdated);
    off('combat:time-control-updated', this.handleTimeControlUpdated);
    this.pauseButton?.off('pointerdown', this.handlePausePressed);
    this.overlayResumeButton?.off('pointerdown', this.handleResumePressed);
    this.overlayRestartButton?.off('pointerdown', this.handleRestartPressed);
  }
}
