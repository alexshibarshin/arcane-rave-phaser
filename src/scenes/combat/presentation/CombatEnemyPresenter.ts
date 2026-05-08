import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

/**
 * Thin adapter that syncs enemy runtime state into viewGraph views.
 * Interface is nearly as complex as implementation — exists for
 * consistent subsystem decomposition, not for deep leverage.
 */
export class CombatEnemyPresenter {
  sync(viewGraph: CombatSceneViewGraph, runtime: CombatRuntime, deltaMs: number): void {
    const elapsedMs = runtime.combatElapsedMs;

    for (const enemy of runtime.enemies) {
      const existingView = viewGraph.enemies.getEnemyView(enemy.runtimeId);

      if (enemy.state === 'dead' && existingView === null) {
        continue;
      }

      viewGraph.enemies.syncEnemyView(enemy, {
        deltaMs,
        elapsedMs,
        needlePoint: {
          x: viewGraph.needle.tipX,
          y: viewGraph.needle.tipY,
        },
      });
    }
  }

  syncDeadRemoval(viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    for (const enemy of runtime.enemies) {
      if (enemy.state === 'dead') {
        const enemyView = viewGraph.enemies.getEnemyView(enemy.runtimeId);

        if (enemyView && enemyView.animation.deathProgress >= 1) {
          viewGraph.enemies.removeEnemyView(enemy.runtimeId);
        }
      }
    }
  }

  destroy(): void {
    // No owned resources.
  }
}
