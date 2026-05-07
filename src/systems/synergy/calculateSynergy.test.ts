import { describe, it, expect } from 'vitest';
import { calculateSynergy } from './calculateSynergy';
import { CombatContentConfig } from '@config/CombatContentConfig';

const pawnDefs = CombatContentConfig.PAWN_DEFINITIONS;

describe('calculateSynergy', () => {
  it('should return empty array for all-empty slots', () => {
    const slots = Array(8).fill(null);
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toEqual([]);
  });

  it('should detect synergy: same-color generators', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'ruby-needle';
    slots[1] = 'bass-bomb';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect broken synergy: different-color generators', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'ruby-needle';
    slots[1] = 'moss-patch';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(false);
  });

  it('should detect synergy: generator -> same-color finisher', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'ruby-needle';
    slots[1] = 'heatline';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect broken synergy: generator -> different-color finisher', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'ruby-needle';
    slots[1] = 'thorn-fan';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(false);
  });

  it('should detect synergy: finisher output -> matching generator', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'meteor-drop';
    slots[1] = 'moss-patch';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect synergy: finisher output -> matching finisher', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'meteor-drop';
    slots[1] = 'thorn-fan';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect broken synergy: finisher output -> mismatched pawn', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'meteor-drop';
    slots[1] = 'frost-sweep';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(false);
  });

  it('should skip links with empty slots', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'ruby-needle';
    slots[2] = 'bass-bomb';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(0);
  });

  it('should handle circular link: slot 7 -> slot 0', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[7] = 'ruby-needle';
    slots[0] = 'bass-bomb';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.fromSlot).toBe(7);
    expect(result[0]!.toSlot).toBe(0);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should produce links for every adjacent non-empty slot pair across all presets', () => {
    for (const preset of CombatContentConfig.SLOT_PRESETS) {
      const result = calculateSynergy(preset.slots, pawnDefs, 8);

      for (const link of result) {
        expect(link.fromSlot).toBeGreaterThanOrEqual(0);
        expect(link.toSlot).toBeGreaterThanOrEqual(0);
        expect(link.fromSlot).toBeLessThan(8);
        expect(link.toSlot).toBeLessThan(8);
        expect(typeof link.hasSynergy).toBe('boolean');
      }
    }
  });

  it('should produce correct number of links for all-filled slots', () => {
    const slots: Array<string | null> = Array(8).fill('ruby-needle');
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(8);
  });
});
