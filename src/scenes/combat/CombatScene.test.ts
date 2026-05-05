import { describe, expect, it } from 'vitest';
import { resolveCombatSceneSlotPawnIds } from './resolveCombatSceneSlotPawnIds';

describe('CombatScene', () => {
  it('keeps the explicitly provided slot loadout when present', () => {
    const slotPawnIds = ['pawn-red-generator', null, null];

    const result = resolveCombatSceneSlotPawnIds(slotPawnIds, {
      slots: [
        { pawnId: 'pawn-blue-finisher' },
        { pawnId: 'pawn-green-generator' },
        { pawnId: null },
      ],
    });

    expect(result).toEqual(slotPawnIds);
    expect(result).not.toBe(slotPawnIds);
  });

  it('falls back to the runtime slots when combat starts from a wave preset', () => {
    const result = resolveCombatSceneSlotPawnIds(undefined, {
      slots: [
        { pawnId: 'pawn-blue-finisher' },
        { pawnId: null },
        { pawnId: 'pawn-red-generator' },
      ],
    });

    expect(result).toEqual([
      'pawn-blue-finisher',
      null,
      'pawn-red-generator',
    ]);
  });
});
