import { describe, expect, it } from 'vitest';
import {
  CombatContentConfig,
  validateCombatContentConfig,
} from '@config/CombatContentConfig';

describe('CombatContentConfig', () => {
  it('defines the six starter pawn definitions with finisher output color rotation', () => {
    expect(CombatContentConfig.PAWN_DEFINITIONS).toEqual([
      {
        id: 'pawn-red-generator',
        type: 'generator',
        color: 'red',
        baseDamage: 10,
        visualFamilyKey: 'generator',
        visualSilhouetteKey: 'generator-red',
        pedestalStyleKey: 'pedestal-red',
      },
      {
        id: 'pawn-green-generator',
        type: 'generator',
        color: 'green',
        baseDamage: 10,
        visualFamilyKey: 'generator',
        visualSilhouetteKey: 'generator-green',
        pedestalStyleKey: 'pedestal-green',
      },
      {
        id: 'pawn-blue-generator',
        type: 'generator',
        color: 'blue',
        baseDamage: 10,
        visualFamilyKey: 'generator',
        visualSilhouetteKey: 'generator-blue',
        pedestalStyleKey: 'pedestal-blue',
      },
      {
        id: 'pawn-red-finisher',
        type: 'finisher',
        color: 'red',
        baseDamage: 20,
        outputNoteColor: 'green',
        visualFamilyKey: 'finisher',
        visualSilhouetteKey: 'finisher-red',
        pedestalStyleKey: 'pedestal-red',
      },
      {
        id: 'pawn-green-finisher',
        type: 'finisher',
        color: 'green',
        baseDamage: 20,
        outputNoteColor: 'blue',
        visualFamilyKey: 'finisher',
        visualSilhouetteKey: 'finisher-green',
        pedestalStyleKey: 'pedestal-green',
      },
      {
        id: 'pawn-blue-finisher',
        type: 'finisher',
        color: 'blue',
        baseDamage: 20,
        outputNoteColor: 'red',
        visualFamilyKey: 'finisher',
        visualSilhouetteKey: 'finisher-blue',
        pedestalStyleKey: 'pedestal-blue',
      },
    ]);
  });

  it('defines the three starter enemy color variants from one placeholder stat block', () => {
    expect(CombatContentConfig.ENEMY_DEFINITIONS).toEqual([
      {
        id: 'enemy-red-basic',
        archetype: 'basic',
        color: 'red',
        maxHp: 30,
        moveSpeedPxPerSec: 70,
        attackRangePx: 170,
        attackCooldownMs: 1000,
        attackDamage: 5,
        visualKey: 'enemy-basic-red',
      },
      {
        id: 'enemy-green-basic',
        archetype: 'basic',
        color: 'green',
        maxHp: 30,
        moveSpeedPxPerSec: 70,
        attackRangePx: 170,
        attackCooldownMs: 1000,
        attackDamage: 5,
        visualKey: 'enemy-basic-green',
      },
      {
        id: 'enemy-blue-basic',
        archetype: 'basic',
        color: 'blue',
        maxHp: 30,
        moveSpeedPxPerSec: 70,
        attackRangePx: 170,
        attackCooldownMs: 1000,
        attackDamage: 5,
        visualKey: 'enemy-basic-blue',
      },
    ]);
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
});
