import { describe, expect, it } from 'vitest';
import {
  SLOT_MODIFIER_CONFIG,
  validateSlotModifierConfig,
  type SlotModifierDefinition,
  type SlotModifierEffectKind,
} from '@config/SlotModifierConfig';
import { CombatContentConfig, type NoteColor } from '@config/CombatContentConfig';

describe('SLOT_MODIFIER_CONFIG', () => {
  it('contains exactly 9 modifier definitions', () => {
    expect(SLOT_MODIFIER_CONFIG.modifiers).toHaveLength(9);
  });
});

describe('validateSlotModifierConfig', () => {
  const noteColors = CombatContentConfig.NOTE_COLORS;

  it('passes for the authored catalog', () => {
    expect(() =>
      validateSlotModifierConfig(SLOT_MODIFIER_CONFIG.modifiers, noteColors),
    ).not.toThrow();
  });

  it('rejects duplicate modifier IDs', () => {
    const dupes: SlotModifierDefinition[] = [
      ...SLOT_MODIFIER_CONFIG.modifiers.slice(0, 1),
      ...SLOT_MODIFIER_CONFIG.modifiers,
    ];

    expect(() => validateSlotModifierConfig(dupes, noteColors)).toThrow(
      /duplicate ID/i,
    );
  });

  it('rejects an unknown effectKind', () => {
    const bad = SLOT_MODIFIER_CONFIG.modifiers.map((m, i) =>
      i === 0
        ? { ...m, effectKind: 'nonexistent' as SlotModifierEffectKind }
        : m,
    );

    expect(() => validateSlotModifierConfig(bad, noteColors)).toThrow(
      /unknown effectKind/i,
    );
  });

  it('rejects missing required params for output-note-bonus', () => {
    const bad = SLOT_MODIFIER_CONFIG.modifiers.map((m) =>
      m.id === 'plus-one-output-note'
        ? { ...m, effectParams: {} as SlotModifierDefinition['effectParams'] }
        : m,
    );

    expect(() => validateSlotModifierConfig(bad, noteColors)).toThrow(
      /missing required param bonusNoteCount/i,
    );
  });

  it('rejects negative defaultWeight', () => {
    const bad = SLOT_MODIFIER_CONFIG.modifiers.map((m, i) =>
      i === 0 ? { ...m, defaultWeight: -1 } : m,
    );

    expect(() => validateSlotModifierConfig(bad, noteColors)).toThrow(
      /negative defaultWeight/i,
    );
  });

  it('rejects invalid targetColor in color-output-note-bonus', () => {
    const bad = SLOT_MODIFIER_CONFIG.modifiers.map((m) =>
      m.id === 'plus-one-red-output-note'
        ? {
            ...m,
            effectParams: { bonusNoteCount: 1, targetColor: 'purple' as NoteColor },
          }
        : m,
    );

    expect(() => validateSlotModifierConfig(bad, noteColors)).toThrow(
      /invalid targetColor/i,
    );
  });
});
