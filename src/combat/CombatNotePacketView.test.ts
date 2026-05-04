import { describe, expect, it } from 'vitest';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { createCombatRuntime, setCombatNotePacket } from './CombatRuntime';
import { createCombatRenderModel } from './CombatRenderModel';
import { createCombatNotePacketViewModel } from './CombatNotePacketView';

describe('CombatNotePacketView', () => {
  it('animates all packet notes with deterministic phase-shifted motion', () => {
    const runtime = createCombatRuntime();
    const renderModel = createCombatRenderModel();

    setCombatNotePacket(runtime, 'green', 3);

    expect(createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 0)).toEqual([
      {
        id: 'note-packet:green:0',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x - 25,
        y: renderModel.notePacketAnchor.y - 3,
        scale: 0.75,
      },
      {
        id: 'note-packet:green:1',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x,
        y: renderModel.notePacketAnchor.y - 4,
        scale: 0.75,
      },
      {
        id: 'note-packet:green:2',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x + 25,
        y: renderModel.notePacketAnchor.y + 2,
        scale: 0.75,
      },
    ]);

    expect(
      createCombatNotePacketViewModel(runtime.notePacket, renderModel.notePacketAnchor, 375),
    ).toEqual([
      {
        id: 'note-packet:green:0',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x - 25,
        y: renderModel.notePacketAnchor.y + 1,
        scale: 0.75,
      },
      {
        id: 'note-packet:green:1',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x,
        y: renderModel.notePacketAnchor.y - 3,
        scale: 0.75,
      },
      {
        id: 'note-packet:green:2',
        color: 'green',
        tint: CombatVisualConfig.NOTE_COLORS.green,
        x: renderModel.notePacketAnchor.x + 25,
        y: renderModel.notePacketAnchor.y - 3,
        scale: 0.75,
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
