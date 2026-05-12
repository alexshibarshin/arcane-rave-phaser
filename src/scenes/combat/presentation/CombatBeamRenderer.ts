import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import { COMBAT_VFX_BEAM_TEXTURE_KEY } from '@combat/CombatVfxTextures';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import {
  acquirePooledImage,
  clearPooledImageMaps,
  reclaimImageViews,
} from './CombatVfxPoolUtils';

export class CombatBeamRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly activeIds = new Set<string>();

  sync(scene: Phaser.Scene, viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    this.activeIds.clear();

    for (const beam of runtime.beams) {
      this.activeIds.add(beam.runtimeId);
    }

    reclaimImageViews(this.views, this.pool, this.activeIds);

    for (const beam of runtime.beams) {
      let beamView = this.views.get(beam.runtimeId);

      if (!beamView) {
        beamView = acquirePooledImage(
          scene,
          viewGraph,
          this.pool,
          COMBAT_VFX_BEAM_TEXTURE_KEY,
        );
        beamView.setBlendMode(Phaser.BlendModes.ADD);
        beamView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.05);
        beamView.setTint(CombatVisualConfig.NOTE_COLORS[beam.color]);
        beamView.setAlpha(0.9);
        this.views.set(beam.runtimeId, beamView);
      }

      let from: { x: number; y: number };
      let to: { x: number; y: number } | null = null;

      if (beam.beamType === 'sweeping') {
        from = { x: beam.originX, y: beam.originY };
      } else {
        const slotRuntime = runtime.slots[beam.slotIndex];
        const slotPosition = slotRuntime?.worldPosition;

        if (!slotPosition) {
          beamView.setVisible(false);
          continue;
        }

        from = { x: slotPosition.x, y: slotPosition.y };
      }

      if (beam.beamType === 'lock-on') {
        to = beam.targetEnemyRuntimeId
          ? viewGraph.anchors.getEnemyAnchor(beam.targetEnemyRuntimeId)
          : null;
      } else if (
        beam.sweepStartAngleRad !== null
        && beam.sweepEndAngleRad !== null
        && beam.sweepLengthPx !== null
      ) {
        const progress = Math.min(
          1,
          Math.max(
            0,
            (runtime.combatElapsedMs - beam.startedAtMs)
              / Math.max(1, beam.expiresAtMs - beam.startedAtMs),
          ),
        );
        const angle =
          beam.sweepStartAngleRad
          + (beam.sweepEndAngleRad - beam.sweepStartAngleRad) * progress;
        to = {
          x: from.x + Math.cos(angle) * beam.sweepLengthPx,
          y: from.y + Math.sin(angle) * beam.sweepLengthPx,
        };
      }

      if (!to) {
        beamView.setVisible(false);
        continue;
      }

      const deltaX = to.x - from.x;
      const deltaY = to.y - from.y;
      const length = Math.hypot(deltaX, deltaY);
      beamView.setPosition((from.x + to.x) / 2, (from.y + to.y) / 2);
      beamView.setRotation(Math.atan2(deltaY, deltaX));
      beamView.setScale(
        length / CombatVfxConfig.TEXTURES.BEAM_WIDTH_PX,
        beam.beamType === 'lock-on' ? 0.9 : 0.65,
      );
      beamView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.views, this.pool);
  }
}
