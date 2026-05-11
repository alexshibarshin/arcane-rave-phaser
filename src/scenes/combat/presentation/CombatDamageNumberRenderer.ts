import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatDamageNumber } from '@combat/CombatDamageNumber';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import type { CombatPresentationEvent } from '../CombatPresentationRuntime';

const MAX_VISIBLE_DAMAGE_NUMBERS = 20;

export class CombatDamageNumberRenderer {
  private readonly active: CombatDamageNumber[] = [];
  private readonly pool: CombatDamageNumber[] = [];
  private scene?: Phaser.Scene;
  private readonly config = {
    fontSizePx: CombatVisualConfig.DAMAGE_NUMBER.FONT_SIZE_PX,
    strokeThicknessPx: CombatVisualConfig.DAMAGE_NUMBER.STROKE_THICKNESS_PX,
    floatDurationMs: CombatVisualConfig.DAMAGE_NUMBER.FLOAT_DURATION_MS,
    floatDistanceY: CombatVisualConfig.DAMAGE_NUMBER.FLOAT_DISTANCE_Y,
  };

  sync(runtime: CombatRuntime): void {
    const elapsed = runtime.combatElapsedMs;

    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const damageNumber = this.active[index]!;
      const ageMs = elapsed - damageNumber.startTime;

      damageNumber.update(ageMs);

      if (!damageNumber.isComplete(ageMs)) {
        continue;
      }

      damageNumber.text.setVisible(false);
      this.active.splice(index, 1);
      this.pool.push(damageNumber);
    }
  }

  handleEvent(
    viewGraph: CombatSceneViewGraph,
    event: CombatPresentationEvent,
    lastCombatElapsedMs: number,
  ): void {
    const config = CombatVisualConfig.DAMAGE_NUMBER;
    this.scene = viewGraph.effects.damageNumberLayer.scene;
    this.layer = viewGraph.effects.damageNumberLayer;

    if (event.event === 'combat:enemy-hit') {
      const enemyView = viewGraph.enemies.getEnemyView(event.payload.enemyId);
      const y = enemyView?.container.y ?? 0;
      const x = enemyView?.container.x ?? 0;

      viewGraph.enemies.markEnemyHit(
        event.payload.enemyId,
        lastCombatElapsedMs,
        event.payload.currentHp,
        event.payload.maxHp,
      );

      this.spawnDamageNumber(
        x,
        y + CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y + config.ENEMY_OFFSET_Y,
        event.payload.damage,
        lastCombatElapsedMs,
      );
      return;
    }

    if (event.event === 'combat:base-damaged') {
      const hpBar = viewGraph.base.hpBar;

      this.spawnDamageNumber(
        hpBar.x + config.BASE_OFFSET_X,
        hpBar.y + config.BASE_OFFSET_Y,
        event.payload.damage,
        lastCombatElapsedMs,
      );
      return;
    }

    if (event.event === 'combat:base-healed') {
      const hpBar = viewGraph.base.hpBar;
      const dn = this.spawnDamageNumber(
        hpBar.x + config.BASE_OFFSET_X,
        hpBar.y + config.BASE_OFFSET_Y - 30,
        -event.payload.amount,
        lastCombatElapsedMs,
      );

      if (dn) {
        dn.text.setColor('#7ef2a1');
      }
    }
  }

  private layer?: Phaser.GameObjects.Layer;

  private spawnDamageNumber(
    x: number,
    y: number,
    value: number,
    startTime: number,
  ): CombatDamageNumber | null {
    if (!this.scene) {
      return null;
    }

    if (this.active.length >= MAX_VISIBLE_DAMAGE_NUMBERS) {
      return null;
    }

    let damageNumber = this.pool.pop();

    if (!damageNumber) {
      damageNumber = new CombatDamageNumber(this.scene, this.config);

      if (this.layer) {
        this.layer.add(damageNumber.text);
      }
    }

    damageNumber.reset(x, y, value, startTime, this.config);
    this.active.push(damageNumber);
    return damageNumber;
  }

  destroy(): void {
    this.active.forEach((dn) => dn.destroy());
    this.pool.forEach((dn) => dn.destroy());
    this.active.length = 0;
    this.pool.length = 0;
  }
}
