import { describe, expect, it } from 'vitest';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { createCombatRuntime, setCombatNotePacket } from './CombatRuntime';
import { createCombatRenderModel } from './CombatRenderModel';
import { createCombatNotePacketViewModel } from './CombatNotePacketView';

describe('CombatNotePacketView', () => {
  it('builds individual anchored note instances with deterministic bounce offsets', () => {
    const runtime = createCombatRuntime();
    const renderModel = createCombatRenderModel();

    setCombatNotePacket(runtime, 'green', 3);

    expect(createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 0)).toEqual([
      {
        id: 'note-packet:green:0',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x - 28,
        y: renderModel.notePacketAnchor.y,
        scale: 0.72,
      },
      {
        id: 'note-packet:green:1',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x,
        y: renderModel.notePacketAnchor.y - 6,
        scale: 0.72,
      },
      {
        id: 'note-packet:green:2',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x + 28,
        y: renderModel.notePacketAnchor.y,
        scale: 0.72,
      },
    ]);

    expect(
      createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 375),
    ).toEqual([
      {
        id: 'note-packet:green:0',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x - 28,
        y: renderModel.notePacketAnchor.y,
        scale: 0.72,
      },
      {
        id: 'note-packet:green:1',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x,
        y: renderModel.notePacketAnchor.y + 6,
        scale: 0.72,
      },
      {
        id: 'note-packet:green:2',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x + 28,
        y: renderModel.notePacketAnchor.y,
        scale: 0.72,
      },
    ]);
  });

  it('returns no instances for an empty packet', () => {
    const runtime = createCombatRuntime();
    const renderModel = createCombatRenderModel();

    expect(createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 0)).toEqual(
      [],
    );
  });
});
