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

export class CombatPacketBreakRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];

  sync(
    scene: Phaser.Scene,
    viewGraph: CombatSceneViewGraph,
    vfxSnapshot: CombatVfxSnapshot,
  ): void {
    const activeIds = new Set(
      vfxSnapshot.packetBreakBursts.map((burst) => burst.id),
    );
    reclaimImageViews(this.views, this.pool, activeIds);

    for (const burst of vfxSnapshot.packetBreakBursts) {
      let burstView = this.views.get(burst.id);

      if (!burstView) {
        burstView = acquirePooledImage(
          scene,
          viewGraph,
          this.pool,
          COMBAT_VFX_RING_TEXTURE_KEY,
        );
        burstView.setBlendMode(Phaser.BlendModes.ADD);
        this.views.set(burst.id, burstView);
      }

      burstView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.3);
      burstView.setPosition(burst.x, burst.y);
      burstView.setTint(CombatVisualConfig.NOTE_COLORS[burst.nextColor]);
      burstView.setAlpha(burst.alpha);
      burstView.setScale(burst.scale);
      burstView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.views, this.pool);
  }
}
