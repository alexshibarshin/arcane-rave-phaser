import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { COMBAT_VFX_RING_TEXTURE_KEY } from '@combat/CombatVfxTextures';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import {
  acquirePooledImage,
  clearPooledImageMaps,
  reclaimImageViews,
} from './CombatVfxPoolUtils';

export class CombatEnemyHitFlashRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];

  sync(
    scene: Phaser.Scene,
    viewGraph: CombatSceneViewGraph,
    vfxSnapshot: CombatVfxSnapshot,
  ): void {
    const activeIds = new Set(
      vfxSnapshot.enemyHitFlashes.map((flash) => flash.id),
    );
    reclaimImageViews(this.views, this.pool, activeIds);

    for (const flash of vfxSnapshot.enemyHitFlashes) {
      let flashView = this.views.get(flash.id);

      if (!flashView) {
        flashView = acquirePooledImage(
          scene,
          viewGraph,
          this.pool,
          COMBAT_VFX_RING_TEXTURE_KEY,
        );
        flashView.setBlendMode(Phaser.BlendModes.ADD);
        this.views.set(flash.id, flashView);
      }

      flashView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.2);
      flashView.setPosition(flash.x, flash.y);
      flashView.setTint(CombatVisualConfig.NOTE_COLORS[flash.color]);
      flashView.setAlpha(flash.alpha);
      flashView.setScale(flash.scale);
      flashView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.views, this.pool);
  }
}
