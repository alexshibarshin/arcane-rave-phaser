import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import {
  CombatContentConfig,
  type CombatPawnDefinition,
} from '@config/CombatContentConfig';
import type {
  CombatEnemyRuntime,
  CombatRuntime,
  CombatSourceSnapshot,
  NoteColor,
} from './CombatRuntime';
import {
  pushCombatBaseHealed,
  pushCombatEnemyDied,
  pushCombatEnemyHit,
} from './CombatRuntimeEvents';
import { invalidateCombatTargeting } from './CombatTargeting';

export interface CombatHitResolutionOptions {
  runtime: CombatRuntime;
  enemy: CombatEnemyRuntime;
  slotIndex: number;
  pawn: CombatPawnDefinition;
  baseDamage: number;
  sourceSnapshot: CombatSourceSnapshot;
  attackerColor: NoteColor;
  healPercent?: number;
}

export interface CombatHitResolution {
  finalDamage: number;
  actualHpRemoved: number;
}

export function applyCombatHit(options: CombatHitResolutionOptions): CombatHitResolution {
  const finalDamage = calculateFinalDamage(
    options.baseDamage,
    options.sourceSnapshot,
    options.enemy,
    options.attackerColor,
    options.pawn,
  );
  const previousHp = options.enemy.currentHp;
  options.enemy.currentHp = Math.max(0, options.enemy.currentHp - finalDamage);
  const actualHpRemoved = previousHp - options.enemy.currentHp;

  pushCombatEnemyHit(options.runtime, {
    enemyId: options.enemy.runtimeId,
    slotIndex: options.slotIndex,
    attackerColor: options.attackerColor,
    damage: finalDamage,
    currentHp: options.enemy.currentHp,
    maxHp: options.enemy.maxHp,
    wasWeaknessHit: resolveWeaknessMultiplier(options.attackerColor, options.enemy.color) > 1,
  });

  if (actualHpRemoved > 0 && options.healPercent && options.runtime.state !== 'defeat') {
    const healAmount = Math.round(actualHpRemoved * options.healPercent);
    if (healAmount > 0) {
      const previousBaseHp = options.runtime.baseHp;
      options.runtime.baseHp = Math.min(CombatBalanceConfig.BASE_HP, options.runtime.baseHp + healAmount);
      const appliedHeal = options.runtime.baseHp - previousBaseHp;

      if (appliedHeal > 0) {
        pushCombatBaseHealed(options.runtime, appliedHeal);
      }
    }
  }

  if (options.enemy.currentHp <= 0 && options.enemy.state !== 'dead') {
    options.enemy.state = 'dead';
    options.runtime.wave.enemiesRemaining = Math.max(0, options.runtime.wave.enemiesRemaining - 1);
    invalidateCombatTargeting(options.runtime);
    pushCombatEnemyDied(options.runtime, options.enemy.runtimeId);
  }

  return {
    finalDamage,
    actualHpRemoved,
  };
}

export function calculateFinalDamage(
  baseDamage: number,
  sourceSnapshot: CombatSourceSnapshot,
  enemy: CombatEnemyRuntime,
  attackerColor: NoteColor,
  pawn: CombatPawnDefinition,
): number {
  let damage = baseDamage * sourceSnapshot.damageMultiplier;

  const secondaryEffect = pawn.ability.secondaryEffect;
  if (secondaryEffect?.kind === 'high-hp-bonus-damage') {
    const hpRatio = enemy.maxHp > 0 ? enemy.currentHp / enemy.maxHp : 0;
    if (hpRatio >= secondaryEffect.thresholdRatio) {
      damage *= 1 + secondaryEffect.bonusDamagePercent;
    }
  }

  damage *= resolveWeaknessMultiplier(attackerColor, enemy.color);
  return Math.max(0, Math.round(damage));
}

function resolveWeaknessMultiplier(attackerColor: NoteColor, targetColor: NoteColor): number {
  const weakTarget = CombatContentConfig.WEAKNESS_ADVANTAGE[attackerColor];
  return weakTarget === targetColor ? CombatBalanceConfig.WEAKNESS_MULTIPLIER : 1;
}
