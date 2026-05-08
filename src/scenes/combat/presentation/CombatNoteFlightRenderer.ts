import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { COMBAT_NOTE_GLYPH_TEXTURE_KEY } from '@combat/CombatNoteGlyph';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import {
  acquirePooledImage,
  clearPooledImageMaps,
  reclaimImageViews,
} from './CombatVfxPoolUtils';

export class CombatNoteFlightRenderer {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly pool: Phaser.GameObjects.Image[] = [];

  sync(
    scene: Phaser.Scene,
    viewGraph: CombatSceneViewGraph,
    vfxSnapshot: CombatVfxSnapshot,
  ): void {
    const activeIds = new Set(vfxSnapshot.noteFlights.map((flight) => flight.id));
    reclaimImageViews(this.views, this.pool, activeIds);

    for (const flight of vfxSnapshot.noteFlights) {
      let flightView = this.views.get(flight.id);

      if (!flightView) {
        flightView = acquirePooledImage(
          scene,
          viewGraph,
          this.pool,
          COMBAT_NOTE_GLYPH_TEXTURE_KEY,
        );
        flightView.setBlendMode(Phaser.BlendModes.ADD);
        this.views.set(flight.id, flightView);
      }

      flightView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.1);
      flightView.setPosition(flight.x, flight.y);
      flightView.setTint(CombatVisualConfig.NOTE_COLORS[flight.color]);
      flightView.setAlpha(flight.alpha);
      flightView.setScale(flight.scale);
      flightView.setVisible(true);
    }
  }

  destroy(): void {
    clearPooledImageMaps(this.views, this.pool);
  }
}
