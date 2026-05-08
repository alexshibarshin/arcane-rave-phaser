import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { COMBAT_VFX_GLOW_TEXTURE_KEY } from '@combat/CombatVfxTextures';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import {
  acquirePooledImage,
  clearPooledImageMaps,
  reclaimImageViews,
} from './CombatVfxPoolUtils';

export class CombatBaseHitFlashRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];

  sync(
    scene: Phaser.Scene,
    viewGraph: CombatSceneViewGraph,
    vfxSnapshot: CombatVfxSnapshot,
  ): void {
    const activeIds = new Set(
      vfxSnapshot.baseHitFlashes.map((flash) => flash.id),
    );
    reclaimImageViews(this.views, this.pool, activeIds);

    for (const flash of vfxSnapshot.baseHitFlashes) {
      let flashView = this.views.get(flash.id);

      if (!flashView) {
        flashView = acquirePooledImage(
          scene,
          viewGraph,
          this.pool,
          COMBAT_VFX_GLOW_TEXTURE_KEY,
        );
        flashView.setBlendMode(Phaser.BlendModes.ADD);
        this.views.set(flash.id, flashView);
      }

      flashView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.4);
      flashView.setPosition(flash.x, flash.y);
      flashView.setTint(0xff8f7a);
      flashView.setAlpha(flash.alpha * 0.8);
      flashView.setScale(flash.scale * 1.3);
      flashView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.views, this.pool);
  }
}
