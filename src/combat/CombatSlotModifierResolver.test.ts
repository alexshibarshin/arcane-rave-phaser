import { describe, expect, it } from 'vitest';
import { createCombatRuntime } from './CombatRuntime';
import { resolveSlotModifierMutations } from './CombatSlotModifierResolver';

describe('resolveSlotModifierMutations', () => {
  it('returns bonus note mutations for output-note-bonus assignments', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'ruby-needle', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-one-output-note' }],
    });

    expect(resolveSlotModifierMutations(runtime, 0)).toEqual({
      bonusNotes: 1,
      colorFilter: null,
      projectileCountBonus: 0,
      volleyShotCountBonus: 0,
      radiusMultiplier: 1,
      extraBeamCount: 0,
      doubleActivation: false,
    });
  });
});
