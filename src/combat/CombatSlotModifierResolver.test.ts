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

  it('returns radius multiplier for aoe-radius-scale on a zone pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'moss-patch', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' }],
    });

    expect(resolveSlotModifierMutations(runtime, 0)).toEqual({
      bonusNotes: 0,
      colorFilter: null,
      projectileCountBonus: 0,
      volleyShotCountBonus: 0,
      radiusMultiplier: 1.5,
      extraBeamCount: 0,
      doubleActivation: false,
    });
  });

  it('returns defaults for aoe-radius-scale on a projectile pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'ruby-needle', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' }],
    });

    const mutations = resolveSlotModifierMutations(runtime, 0);
    expect(mutations.radiusMultiplier).toBe(1);
  });

  it('returns defaults for aoe-radius-scale on a beam pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'heatline', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' }],
    });

    const mutations = resolveSlotModifierMutations(runtime, 0);
    expect(mutations.radiusMultiplier).toBe(1);
  });

  it('returns radius multiplier for aoe-radius-scale on an explosion pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'moss-patch', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' }],
    });

    expect(resolveSlotModifierMutations(runtime, 0)).toEqual({
      bonusNotes: 0,
      colorFilter: null,
      projectileCountBonus: 0,
      volleyShotCountBonus: 0,
      radiusMultiplier: 1.5,
      extraBeamCount: 0,
      doubleActivation: false,
    });
  });

  it('returns radius multiplier for aoe-radius-scale on an explosion pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'bass-bomb', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' }],
    });

    expect(resolveSlotModifierMutations(runtime, 0)).toEqual({
      bonusNotes: 0,
      colorFilter: null,
      projectileCountBonus: 0,
      volleyShotCountBonus: 0,
      radiusMultiplier: 1.5,
      extraBeamCount: 0,
      doubleActivation: false,
    });
  });

  it('returns defaults for projectile-bonus on a non-projectile pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'bass-bomb', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-one-projectile' }],
    });

    expect(resolveSlotModifierMutations(runtime, 0)).toEqual({
      bonusNotes: 0,
      colorFilter: null,
      projectileCountBonus: 0,
      volleyShotCountBonus: 0,
      radiusMultiplier: 1,
      extraBeamCount: 0,
      doubleActivation: false,
    });
  });

  it('returns projectile bonuses for projectile-bonus on a projectile pawn', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'ruby-needle', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-one-projectile' }],
    });

    expect(resolveSlotModifierMutations(runtime, 0)).toEqual({
      bonusNotes: 0,
      colorFilter: null,
      projectileCountBonus: 1,
      volleyShotCountBonus: 1,
      radiusMultiplier: 1,
      extraBeamCount: 0,
      doubleActivation: false,
    });
  });
});
