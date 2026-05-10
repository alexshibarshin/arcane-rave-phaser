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

export class CombatZoneRenderer {
  private readonly fillViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly ringViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly fillPool: Phaser.GameObjects.Image[] = [];
  private readonly ringPool: Phaser.GameObjects.Image[] = [];

  sync(scene: Phaser.Scene, viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const activeIds = new Set(runtime.zones.map((zone) => zone.runtimeId));
    reclaimImageViews(this.fillViews, this.fillPool, activeIds);
    reclaimImageViews(this.ringViews, this.ringPool, activeIds);

    for (const zone of runtime.zones) {
      let fillView = this.fillViews.get(zone.runtimeId);
      let ringView = this.ringViews.get(zone.runtimeId);

      if (!fillView) {
        fillView = acquirePooledImage(scene, viewGraph, this.fillPool, COMBAT_VFX_GLOW_TEXTURE_KEY);
        fillView.setBlendMode(Phaser.BlendModes.ADD);
        this.fillViews.set(zone.runtimeId, fillView);
      }

      if (!ringView) {
        ringView = acquirePooledImage(scene, viewGraph, this.ringPool, COMBAT_VFX_RING_TEXTURE_KEY);
        ringView.setBlendMode(Phaser.BlendModes.ADD);
        this.ringViews.set(zone.runtimeId, ringView);
      }

      const pulse = 0.92 + Math.sin(
        runtime.combatElapsedMs * 0.006 + zone.centerX * 0.01,
      ) * 0.05;
      const fillScale = (zone.radius * pulse) / (RING_BASE_SIZE_PX / 2);
      const ringScale = (zone.radius * pulse) / (RING_BASE_SIZE_PX / 2);

      fillView.setDepth(CombatLayoutConfig.DEPTH.VFX - 0.03);
      fillView.setPosition(zone.centerX, zone.centerY);
      fillView.setTint(CombatVisualConfig.NOTE_COLORS[zone.color]);
      fillView.setAlpha(0.12);
      fillView.setScale(fillScale);
      fillView.setVisible(true);

      ringView.setDepth(CombatLayoutConfig.DEPTH.VFX - 0.02);
      ringView.setPosition(zone.centerX, zone.centerY);
      ringView.setTint(CombatVisualConfig.NOTE_COLORS[zone.color]);
      ringView.setAlpha(0.85);
      ringView.setScale(ringScale);
      ringView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.fillViews, this.fillPool);
    clearPooledImageMaps(this.ringViews, this.ringPool);
  }
}
