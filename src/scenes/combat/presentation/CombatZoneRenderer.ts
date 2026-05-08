import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import { clearGraphicsMap, reclaimGraphicsViews } from './CombatVfxPoolUtils';

export class CombatZoneRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Graphics>();

  sync(scene: Phaser.Scene, viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const activeIds = new Set(runtime.zones.map((zone) => zone.runtimeId));
    reclaimGraphicsViews(this.views, activeIds);

    for (const zone of runtime.zones) {
      let zoneView = this.views.get(zone.runtimeId);

      if (!zoneView) {
        zoneView = scene.add.graphics();
        viewGraph.effects.transientLayer.add(zoneView);
        this.views.set(zone.runtimeId, zoneView);
      }

      const pulse = 0.92 + Math.sin(
        runtime.combatElapsedMs * 0.006 + zone.centerX * 0.01,
      ) * 0.05;
      zoneView.clear();
      zoneView.setDepth(CombatLayoutConfig.DEPTH.VFX - 0.03);
      zoneView.fillStyle(CombatVisualConfig.NOTE_COLORS[zone.color], 0.12);
      zoneView.fillCircle(zone.centerX, zone.centerY, zone.radius * pulse);
      zoneView.lineStyle(3, CombatVisualConfig.NOTE_COLORS[zone.color], 0.85);
      zoneView.strokeCircle(zone.centerX, zone.centerY, zone.radius * pulse);
      zoneView.lineStyle(1, 0xffffff, 0.22);
      zoneView.strokeCircle(zone.centerX, zone.centerY, zone.radius * 0.72);
    }
  }

  destroy(): void {
    clearGraphicsMap(this.views);
  }
}
