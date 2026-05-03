import Phaser from 'phaser';
import { createCombatRenderModel } from '@combat/CombatRenderModel';
import { emit, off, on } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';
import { UIScene } from '@scenes/UIScene';

export class HUDScene extends UIScene {
  private pauseLabel?: Phaser.GameObjects.Text;
  private stateLabel?: Phaser.GameObjects.Text;
  private waveLabel?: Phaser.GameObjects.Text;
  private enemiesLabel?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.HUD);
  }

  create(): void {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const model = createCombatRenderModel();
    this.pauseLabel = this.add.text(
      model.hud.pause.x,
      model.hud.pause.y,
      'Pause',
      this.getLabelStyle(model.hud.pause.align),
    );
    this.pauseLabel.setOrigin(0, 0);
    this.pauseLabel.setDepth(model.hud.depth);

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

    on('combat:state-changed', this.handleStateChanged);
    on('combat:hud-wave-updated', this.handleWaveUpdated);
    on('combat:hud-enemies-updated', this.handleEnemiesUpdated);

    emit('combat:hud-ready', { key: this.scene.key });
  }

  private readonly handleStateChanged = (payload: { state: string }): void => {
    this.stateLabel?.setText(`State: ${payload.state}`);
  };

  private readonly handleWaveUpdated = (payload: { current: number; total: number }): void => {
    this.waveLabel?.setText(`Wave ${payload.current}/${payload.total}`);
  };

  private readonly handleEnemiesUpdated = (payload: { remaining: number }): void => {
    this.enemiesLabel?.setText(`Enemies ${payload.remaining}`);
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

  private handleShutdown(): void {
    off('combat:state-changed', this.handleStateChanged);
    off('combat:hud-wave-updated', this.handleWaveUpdated);
    off('combat:hud-enemies-updated', this.handleEnemiesUpdated);
  }
}
