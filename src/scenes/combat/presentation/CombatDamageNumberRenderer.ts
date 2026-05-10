import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatDamageNumber } from '@combat/CombatDamageNumber';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import type { CombatPresentationEvent } from '../CombatPresentationRuntime';

export class CombatDamageNumberRenderer {
  private readonly damageNumbers: CombatDamageNumber[] = [];

  sync(runtime: CombatRuntime): void {
    const elapsed = runtime.combatElapsedMs;

    for (let index = this.damageNumbers.length - 1; index >= 0; index -= 1) {
      const damageNumber = this.damageNumbers[index]!;
      const ageMs = elapsed - damageNumber.startTime;

      damageNumber.update(ageMs);

      if (!damageNumber.isComplete(ageMs)) {
        continue;
      }

      damageNumber.destroy();
      this.damageNumbers.splice(index, 1);
    }
  }

  handleEvent(
    viewGraph: CombatSceneViewGraph,
    event: CombatPresentationEvent,
    lastCombatElapsedMs: number,
  ): void {
    const config = CombatVisualConfig.DAMAGE_NUMBER;

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

      this.damageNumbers.push(
        new CombatDamageNumber(
          viewGraph.effects.damageNumberLayer.scene,
          x,
          y + CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y + config.ENEMY_OFFSET_Y,
          event.payload.damage,
          lastCombatElapsedMs,
          {
            fontSizePx: config.FONT_SIZE_PX,
            floatDurationMs: config.FLOAT_DURATION_MS,
            floatDistanceY: config.FLOAT_DISTANCE_Y,
          },
        ),
      );
      viewGraph.effects.damageNumberLayer.add(
        this.damageNumbers[this.damageNumbers.length - 1]!.text,
      );
      return;
    }

    if (event.event === 'combat:base-damaged') {
      const damage = event.payload.damage;
      const hpBar = viewGraph.base.hpBar;

      this.damageNumbers.push(
        new CombatDamageNumber(
          viewGraph.effects.damageNumberLayer.scene,
          hpBar.x + config.BASE_OFFSET_X,
          hpBar.y + config.BASE_OFFSET_Y,
          damage,
          lastCombatElapsedMs,
          {
            fontSizePx: config.FONT_SIZE_PX,
            floatDurationMs: config.FLOAT_DURATION_MS,
            floatDistanceY: config.FLOAT_DISTANCE_Y,
          },
        ),
      );
      viewGraph.effects.damageNumberLayer.add(
        this.damageNumbers[this.damageNumbers.length - 1]!.text,
      );
      return;
    }

    if (event.event === 'combat:base-healed') {
      const hpBar = viewGraph.base.hpBar;

      this.damageNumbers.push(
        new CombatDamageNumber(
          viewGraph.effects.damageNumberLayer.scene,
          hpBar.x + config.BASE_OFFSET_X,
          hpBar.y + config.BASE_OFFSET_Y - 30,
          -event.payload.amount,
          lastCombatElapsedMs,
          {
            fontSizePx: config.FONT_SIZE_PX,
            floatDurationMs: config.FLOAT_DURATION_MS,
            floatDistanceY: config.FLOAT_DISTANCE_Y,
          },
        ),
      );
      this.damageNumbers[this.damageNumbers.length - 1]!.text.setColor('#7ef2a1');
      viewGraph.effects.damageNumberLayer.add(
        this.damageNumbers[this.damageNumbers.length - 1]!.text,
      );
    }
  }

  destroy(): void {
    this.damageNumbers.forEach((damageNumber) => damageNumber.destroy());
    this.damageNumbers.length = 0;
  }
}
