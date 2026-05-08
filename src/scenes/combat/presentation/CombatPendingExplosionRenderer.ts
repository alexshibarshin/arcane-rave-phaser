import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import { clearGraphicsMap, reclaimGraphicsViews } from './CombatVfxPoolUtils';

export class CombatPendingExplosionRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Graphics>();

  sync(scene: Phaser.Scene, viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const activeIds = new Set(
      runtime.pendingExplosions.map((explosion) => explosion.runtimeId),
    );
    reclaimGraphicsViews(this.views, activeIds);

    for (const explosion of runtime.pendingExplosions) {
      let explosionView = this.views.get(explosion.runtimeId);

      if (!explosionView) {
        explosionView = scene.add.graphics();
        viewGraph.effects.transientLayer.add(explosionView);
        this.views.set(explosion.runtimeId, explosionView);
      }

      const progress = Math.min(
        1,
        Math.max(
          0,
          1
            - (explosion.detonateAtMs - runtime.combatElapsedMs)
              / Math.max(1, explosion.detonateAtMs - (explosion.detonateAtMs - 1000)),
        ),
      );
      explosionView.clear();
      explosionView.setDepth(CombatLayoutConfig.DEPTH.VFX - 0.01);
      explosionView.fillStyle(
        CombatVisualConfig.NOTE_COLORS[explosion.color],
        0.08 + progress * 0.08,
      );
      explosionView.fillCircle(explosion.centerX, explosion.centerY, explosion.radius);
      explosionView.lineStyle(3, CombatVisualConfig.NOTE_COLORS[explosion.color], 0.9);
      explosionView.strokeCircle(
        explosion.centerX,
        explosion.centerY,
        explosion.radius * (0.72 + progress * 0.28),
      );
      explosionView.lineStyle(1, 0xffffff, 0.28);
      explosionView.strokeCircle(
        explosion.centerX,
        explosion.centerY,
        explosion.radius * (0.3 + progress * 0.25),
      );
    }
  }

  destroy(): void {
    clearGraphicsMap(this.views);
  }
}
