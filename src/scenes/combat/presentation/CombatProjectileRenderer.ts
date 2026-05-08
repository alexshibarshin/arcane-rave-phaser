import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { COMBAT_VFX_GLOW_TEXTURE_KEY } from '@combat/CombatVfxTextures';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import {
  acquirePooledImage,
  clearPooledImageMaps,
  reclaimImageViews,
} from './CombatVfxPoolUtils';

export class CombatProjectileRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];

  sync(scene: Phaser.Scene, viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const activeIds = new Set(runtime.projectiles.map((p) => p.runtimeId));
    reclaimImageViews(this.views, this.pool, activeIds);

    for (const projectile of runtime.projectiles) {
      let projectileView = this.views.get(projectile.runtimeId);

      if (!projectileView) {
        projectileView = acquirePooledImage(
          scene,
          viewGraph,
          this.pool,
          COMBAT_VFX_GLOW_TEXTURE_KEY,
        );
        projectileView.setBlendMode(Phaser.BlendModes.ADD);
        this.views.set(projectile.runtimeId, projectileView);
      }

      projectileView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.12);
      projectileView.setPosition(projectile.x, projectile.y);
      projectileView.setTint(CombatVisualConfig.NOTE_COLORS[projectile.color]);
      projectileView.setAlpha(0.95);
      projectileView.setScale(0.22, 0.22);
      projectileView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.views, this.pool);
  }
}
