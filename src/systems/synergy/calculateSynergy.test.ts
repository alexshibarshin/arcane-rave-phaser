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
    slots[0] = 'pawn-red-generator';
    slots[1] = 'pawn-red-generator';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect broken synergy: different-color generators', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-generator';
    slots[1] = 'pawn-green-generator';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(false);
  });

  it('should detect synergy: generator -> same-color finisher', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-generator';
    slots[1] = 'pawn-red-finisher';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect broken synergy: generator -> different-color finisher', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-generator';
    slots[1] = 'pawn-green-finisher';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(false);
  });

  it('should detect synergy: finisher output -> matching generator', () => {
    // red-finisher outputs green, green-generator consumes green
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-finisher';
    slots[1] = 'pawn-green-generator';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect synergy: finisher output -> matching finisher', () => {
    // red-finisher outputs green, green-finisher consumes green
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-finisher';
    slots[1] = 'pawn-green-finisher';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should detect broken synergy: finisher output -> mismatched pawn', () => {
    // red-finisher outputs green, blue-generator consumes blue
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-finisher';
    slots[1] = 'pawn-blue-generator';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasSynergy).toBe(false);
  });

  it('should skip links with empty slots', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[0] = 'pawn-red-generator';
    slots[2] = 'pawn-red-generator';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(0);
  });

  it('should handle circular link: slot 7 -> slot 0', () => {
    const slots: Array<string | null> = Array(8).fill(null);
    slots[7] = 'pawn-red-generator';
    slots[0] = 'pawn-red-generator';
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(1);
    expect(result[0]!.fromSlot).toBe(7);
    expect(result[0]!.toSlot).toBe(0);
    expect(result[0]!.hasSynergy).toBe(true);
  });

  it('should handle full preset: starter-1', () => {
    const preset = CombatContentConfig.SLOT_PRESETS[0]!;
    const result = calculateSynergy(preset.slots, pawnDefs, 8);

    const synergyLinks = result.filter((l) => l.hasSynergy);

    // starter-1: red-gen, red-fin, null, green-gen, green-fin, null, blue-gen, blue-fin
    // 0->1: red-gen outputs red, red-fin input red = synergy
    // 1->2: null, skip
    // 2->3: null, skip
    // 3->4: green-gen outputs green, green-fin input green = synergy
    // 4->5: null, skip
    // 5->6: null, skip
    // 6->7: blue-gen outputs blue, blue-fin input blue = synergy
    // 7->0: blue-fin outputs red, red-gen input red = synergy
    expect(synergyLinks.length).toBe(4);
  });

  it('should produce correct number of links for all-filled slots', () => {
    const slots: Array<string | null> = Array(8).fill('pawn-red-generator');
    const result = calculateSynergy(slots, pawnDefs, 8);
    expect(result).toHaveLength(8);
  });
});
