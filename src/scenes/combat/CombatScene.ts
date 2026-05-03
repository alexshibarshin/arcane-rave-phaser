import { emit } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';
import { GameScene } from '@scenes/GameScene';
import { createCombatRuntime, type CombatRuntime } from '@combat/CombatRuntime';

export class CombatScene extends GameScene {
  private runtime!: CombatRuntime;

  constructor() {
    super(SceneKeys.COMBAT);
  }

  create(): void {
    super.create();
    emit('combat:scene-ready', {
      key: this.scene.key,
      state: this.runtime.state,
    });
    this.publishHudSnapshot();
  }

  protected createSceneContent(): void {
    this.runtime = createCombatRuntime();
  }

  protected getOverlaySceneKey(): string | null {
    return SceneKeys.HUD;
  }

  private publishHudSnapshot(): void {
    emit('combat:state-changed', { state: this.runtime.state });
    emit('combat:hud-wave-updated', {
      current: this.runtime.wave.currentWaveIndex + 1,
      total: this.runtime.wave.totalWaves,
    });
    emit('combat:hud-enemies-updated', {
      remaining: this.runtime.wave.enemiesRemaining,
    });
    emit('combat:hud-base-hp-updated', {
      current: this.runtime.baseHp,
      max: this.runtime.baseHp,
    });
    emit('combat:note-packet-changed', {
      color: this.runtime.notePacket.color,
      count: this.runtime.notePacket.count,
    });
  }
}
