import Phaser from 'phaser';
import { COMBAT_NOTE_GLYPH_TEXTURE_KEY } from '@combat/CombatNoteGlyph';
import { createCombatNotePacketViewModel } from '@combat/CombatNotePacketView';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

export class CombatNotePacketPresenter {
  sync(
    scene: Phaser.Scene,
    viewGraph: CombatSceneViewGraph,
    runtime: CombatRuntime,
    notePacketElapsedMs: number,
    vfxSnapshot: CombatVfxSnapshot,
  ): void {
    const notePacketView = viewGraph.notePacket.view;
    const instances = createCombatNotePacketViewModel(
      runtime.notePacket,
      {
        x: notePacketView.anchorX,
        y: notePacketView.anchorY,
      },
      notePacketElapsedMs,
    );
    const activeIds = new Set(instances.map((instance) => instance.id));
    const packetIntakeActive = vfxSnapshot.noteFlights.some(
      (flight) => flight.direction === 'packet-to-slot',
    );

    for (const [id, glyph] of notePacketView.glyphs.entries()) {
      if (activeIds.has(id)) {
        continue;
      }

      glyph.destroy();
      notePacketView.glyphs.delete(id);
    }

    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index]!;
      let glyph = notePacketView.glyphs.get(instance.id);

      if (!glyph) {
        glyph = scene.add.image(instance.x, instance.y, COMBAT_NOTE_GLYPH_TEXTURE_KEY);
        glyph.setOrigin(0.5, 0.5);
        notePacketView.glyphs.set(instance.id, glyph);
      }

      glyph.setDepth(notePacketView.depth + index * 0.01);
      glyph.setPosition(instance.x, instance.y);
      glyph.setTint(instance.tint);
      glyph.setAlpha(packetIntakeActive ? 0.15 : 1);
      glyph.setScale(instance.scale);
    }
  }

  destroyGlyphs(viewGraph: CombatSceneViewGraph): void {
    viewGraph.notePacket.view.glyphs.forEach((glyph) => glyph.destroy());
    viewGraph.notePacket.view.glyphs.clear();
  }

  destroy(): void {
    // Caller must handle glyph cleanup via destroyGlyphs if needed.
  }
}
