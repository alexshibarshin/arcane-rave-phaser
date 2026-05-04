import { describe, expect, it } from 'vitest';
import {
  CombatContentConfig,
  validateCombatContentConfig,
  type NoteColor,
} from '@config/CombatContentConfig';

describe('CombatContentConfig', () => {
  it('defines a complete non-self weakness cycle across all note colors', () => {
    const noteColors = new Set(CombatContentConfig.NOTE_COLORS);
    const weaknessTargets = Object.values(CombatContentConfig.WEAKNESS_ADVANTAGE);

    expect(weaknessTargets).toHaveLength(CombatContentConfig.NOTE_COLORS.length);
    expect(new Set(weaknessTargets)).toEqual(noteColors);

    for (const color of CombatContentConfig.NOTE_COLORS) {
      expect(CombatContentConfig.WEAKNESS_ADVANTAGE[color]).not.toBe(color);
      expect(noteColors.has(CombatContentConfig.WEAKNESS_ADVANTAGE[color])).toBe(true);
    }
  });

  it('keeps every slot preset aligned with slot count and known pawn definitions', () => {
    const pawnIds = new Set(CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => pawn.id));

    for (const preset of CombatContentConfig.SLOT_PRESETS) {
      expect(preset.slots).toHaveLength(CombatContentConfig.SLOT_COUNT);

      for (const pawnId of preset.slots) {
        expect(pawnId === null || pawnIds.has(pawnId)).toBe(true);
      }
    }
  });

  it('rejects finishers whose output note color matches their own color', () => {
    expect(() =>
      validateCombatContentConfig({
        ...CombatContentConfig,
        PAWN_DEFINITIONS: CombatContentConfig.PAWN_DEFINITIONS.map((pawn) =>
          pawn.id === 'pawn-red-finisher'
            ? { ...pawn, outputNoteColor: 'red' as const }
            : pawn,
        ),
      }),
    ).toThrow(/output note color/i);
  });

  it('rejects slot presets that reference unknown pawns', () => {
    expect(() =>
      validateCombatContentConfig({
        ...CombatContentConfig,
        SLOT_PRESETS: CombatContentConfig.SLOT_PRESETS.map((preset, index) =>
          index === 0
            ? {
                ...preset,
                slots: preset.slots.map((slot, slotIndex) =>
                  slotIndex === 0 ? 'missing-pawn' : slot,
                ),
              }
            : preset,
        ),
      }),
    ).toThrow(/unknown pawn/i);
  });

  it('rejects enemies with colors outside the declared note-color set', () => {
    expect(() =>
      validateCombatContentConfig({
        ...CombatContentConfig,
        ENEMY_DEFINITIONS: CombatContentConfig.ENEMY_DEFINITIONS.map((enemy, index) =>
          index === 0
            ? {
                ...enemy,
                color: 'purple' as NoteColor,
              }
            : enemy,
        ),
      }),
    ).toThrow(/unknown note color/i);
  });
});
