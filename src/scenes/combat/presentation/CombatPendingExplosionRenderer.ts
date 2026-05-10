import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { COMBAT_VFX_GLOW_TEXTURE_KEY, COMBAT_VFX_RING_TEXTURE_KEY } from '@combat/CombatVfxTextures';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import {
  acquirePooledImage,
  clearPooledImageMaps,
  reclaimImageViews,
} from './CombatVfxPoolUtils';

const RING_BASE_SIZE_PX = 128;

export class CombatPendingExplosionRenderer {
  private readonly fillViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly ringViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly fillPool: Phaser.GameObjects.Image[] = [];
  private readonly ringPool: Phaser.GameObjects.Image[] = [];

  sync(scene: Phaser.Scene, viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const activeIds = new Set(
      runtime.pendingExplosions.map((explosion) => explosion.runtimeId),
    );
    reclaimImageViews(this.fillViews, this.fillPool, activeIds);
    reclaimImageViews(this.ringViews, this.ringPool, activeIds);

    for (const explosion of runtime.pendingExplosions) {
      let fillView = this.fillViews.get(explosion.runtimeId);
      let ringView = this.ringViews.get(explosion.runtimeId);

      if (!fillView) {
        fillView = acquirePooledImage(scene, viewGraph, this.fillPool, COMBAT_VFX_GLOW_TEXTURE_KEY);
        fillView.setBlendMode(Phaser.BlendModes.ADD);
        this.fillViews.set(explosion.runtimeId, fillView);
      }

      if (!ringView) {
        ringView = acquirePooledImage(scene, viewGraph, this.ringPool, COMBAT_VFX_RING_TEXTURE_KEY);
        ringView.setBlendMode(Phaser.BlendModes.ADD);
        this.ringViews.set(explosion.runtimeId, ringView);
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
      const fillAlpha = 0.08 + progress * 0.08;
      const ringPulse = 0.72 + progress * 0.28;
      const fillScale = explosion.radius / (RING_BASE_SIZE_PX / 2);
      const ringScale = (explosion.radius * ringPulse) / (RING_BASE_SIZE_PX / 2);

      fillView.setDepth(CombatLayoutConfig.DEPTH.VFX - 0.01);
      fillView.setPosition(explosion.centerX, explosion.centerY);
      fillView.setTint(CombatVisualConfig.NOTE_COLORS[explosion.color]);
      fillView.setAlpha(fillAlpha);
      fillView.setScale(fillScale);
      fillView.setVisible(true);

      ringView.setDepth(CombatLayoutConfig.DEPTH.VFX);
      ringView.setPosition(explosion.centerX, explosion.centerY);
      ringView.setTint(CombatVisualConfig.NOTE_COLORS[explosion.color]);
      ringView.setAlpha(0.9);
      ringView.setScale(ringScale);
      ringView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.fillViews, this.fillPool);
    clearPooledImageMaps(this.ringViews, this.ringPool);
  }
}
