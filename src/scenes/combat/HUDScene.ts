import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { emit, off, on } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';
import { UIScene } from '@scenes/UIScene';

export class HUDScene extends UIScene {
  private stateLabel?: Phaser.GameObjects.Text;
  private waveLabel?: Phaser.GameObjects.Text;
  private enemiesLabel?: Phaser.GameObjects.Text;
  private baseHpLabel?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.HUD);
  }

  create(): void {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    const { HUD_PADDING_X: x, HUD_PADDING_Y: y } = CombatLayoutConfig;
    this.stateLabel = this.add.text(x, y, 'State: preview', this.getLabelStyle());
    this.waveLabel = this.add.text(x, y + 24, 'Wave: 1/1', this.getLabelStyle());
    this.enemiesLabel = this.add.text(x, y + 48, 'Enemies: 0', this.getLabelStyle());
    this.baseHpLabel = this.add.text(x, y + 72, 'Base HP: 0', this.getLabelStyle());

    on('combat:state-changed', this.handleStateChanged);
    on('combat:hud-wave-updated', this.handleWaveUpdated);
    on('combat:hud-enemies-updated', this.handleEnemiesUpdated);
    on('combat:hud-base-hp-updated', this.handleBaseHpUpdated);

    emit('combat:hud-ready', { key: this.scene.key });
  }

  private readonly handleStateChanged = (payload: { state: string }): void => {
    this.stateLabel?.setText(`State: ${payload.state}`);
  };

  private readonly handleWaveUpdated = (payload: { current: number; total: number }): void => {
    this.waveLabel?.setText(`Wave: ${payload.current}/${payload.total}`);
  };

  private readonly handleEnemiesUpdated = (payload: { remaining: number }): void => {
    this.enemiesLabel?.setText(`Enemies: ${payload.remaining}`);
  };

  private readonly handleBaseHpUpdated = (payload: { current: number; max: number }): void => {
    this.baseHpLabel?.setText(`Base HP: ${payload.current}/${payload.max}`);
  };

  private getLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color: '#f2f6ff',
      fontFamily: 'monospace',
      fontSize: '18px',
    };
  }

  private handleShutdown(): void {
    off('combat:state-changed', this.handleStateChanged);
    off('combat:hud-wave-updated', this.handleWaveUpdated);
    off('combat:hud-enemies-updated', this.handleEnemiesUpdated);
    off('combat:hud-base-hp-updated', this.handleBaseHpUpdated);
  }
}
