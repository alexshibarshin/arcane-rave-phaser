import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
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
        baseDamage: CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
        visualFamilyKey: 'generator',
        visualSilhouetteKey: 'generator-red',
        pedestalStyleKey: 'pedestal-red',
      },
      {
        id: 'pawn-green-generator',
        type: 'generator',
        color: 'green',
        baseDamage: CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
        visualFamilyKey: 'generator',
        visualSilhouetteKey: 'generator-green',
        pedestalStyleKey: 'pedestal-green',
      },
      {
        id: 'pawn-blue-generator',
        type: 'generator',
        color: 'blue',
        baseDamage: CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
        visualFamilyKey: 'generator',
        visualSilhouetteKey: 'generator-blue',
        pedestalStyleKey: 'pedestal-blue',
      },
      {
        id: 'pawn-red-finisher',
        type: 'finisher',
        color: 'red',
        baseDamage: CombatBalanceConfig.FINISHER_BASE_DAMAGE,
        outputNoteColor: 'green',
        visualFamilyKey: 'finisher',
        visualSilhouetteKey: 'finisher-red',
        pedestalStyleKey: 'pedestal-red',
      },
      {
        id: 'pawn-green-finisher',
        type: 'finisher',
        color: 'green',
        baseDamage: CombatBalanceConfig.FINISHER_BASE_DAMAGE,
        outputNoteColor: 'blue',
        visualFamilyKey: 'finisher',
        visualSilhouetteKey: 'finisher-green',
        pedestalStyleKey: 'pedestal-green',
      },
      {
        id: 'pawn-blue-finisher',
        type: 'finisher',
        color: 'blue',
        baseDamage: CombatBalanceConfig.FINISHER_BASE_DAMAGE,
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
        maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
        moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
        attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
        attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
        attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
        visualKey: 'enemy-basic-red',
      },
      {
        id: 'enemy-green-basic',
        archetype: 'basic',
        color: 'green',
        maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
        moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
        attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
        attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
        attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
        visualKey: 'enemy-basic-green',
      },
      {
        id: 'enemy-blue-basic',
        archetype: 'basic',
        color: 'blue',
        maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
        moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
        attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
        attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
        attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
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

  it('orders the starter preset into same-color generator to finisher pairs for visible packet intake', () => {
    expect(CombatContentConfig.SLOT_PRESETS[0]?.slots).toEqual([
      'pawn-red-generator',
      'pawn-red-finisher',
      null,
      'pawn-green-generator',
      'pawn-green-finisher',
      null,
      'pawn-blue-generator',
      'pawn-blue-finisher',
    ]);
  });
});
