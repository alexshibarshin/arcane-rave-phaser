import { describe, expect, it } from 'vitest';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { createCombatRuntime, setCombatNotePacket } from './CombatRuntime';
import { createCombatRenderModel } from './CombatRenderModel';
import { createCombatNotePacketViewModel } from './CombatNotePacketView';

describe('CombatNotePacketView', () => {
  it('creates one glyph per packet visual while keeping ids, tint, and horizontal spacing stable', () => {
    const runtime = createCombatRuntime();
    const renderModel = createCombatRenderModel();

    setCombatNotePacket(runtime, 'green', 3);

    const atStart = createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 0);
    const later = createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 375);

    expect(atStart).toHaveLength(runtime.notePacket.visuals.length);
    expect(atStart.map((instance) => instance.id)).toEqual(runtime.notePacket.visuals);
    expect(atStart.every((instance) => instance.tint === CombatVisualConfig.NOTE_COLORS.green)).toBe(true);
    expect(atStart.every((instance) => instance.scale === CombatVisualConfig.NOTE_PACKET.GLYPH_SCALE)).toBe(
      true,
    );

    const xOffsets = atStart.map((instance) => instance.x - renderModel.notePacketAnchor.x);
    expect(xOffsets).toEqual([
      -CombatVisualConfig.NOTE_PACKET.SPACING_X,
      0,
      CombatVisualConfig.NOTE_PACKET.SPACING_X,
    ]);

    expect(later.map((instance) => instance.id)).toEqual(atStart.map((instance) => instance.id));
    expect(later.map((instance) => instance.x)).toEqual(atStart.map((instance) => instance.x));
    expect(later.some((instance, index) => instance.y !== atStart[index]?.y)).toBe(true);
  });

  it('returns no instances for an empty packet', () => {
    const runtime = createCombatRuntime();
    const renderModel = createCombatRenderModel();

    expect(createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 0)).toEqual(
      [],
    );
  });
});
