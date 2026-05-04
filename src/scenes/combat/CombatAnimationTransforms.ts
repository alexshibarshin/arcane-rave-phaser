import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { CombatEnemyState } from '@combat/CombatRuntime';

export interface CombatAnimationState {
  idlePulsePhase: number;
  moveHopPhase: number;
  attackFlashAt: number;
  hitFlashAt: number;
  deathProgress: number;
  deathStartX: number;
  deathStartY: number;
  deathKnockbackX: number;
  deathKnockbackY: number;
  deathDurationMs: number;
  lastState: CombatEnemyState | null;
}

export interface CombatAnimationTransformInput {
  anim: CombatAnimationState;
  enemyState: 'moving' | 'attacking' | 'dead' | string;
  elapsed: number;
  deltaMs: number;
  scaleMultiplier: number;
}

export interface CombatAnimationTransformOutput {
  scale: number;
  yShift: number;
  tint: number | null;
  alpha: number;
  xShift: number;
}

const IDLE_PULSE_PERIOD_MS = CombatVisualConfig.ANIMATION.IDLE_PULSE_PERIOD_MS;
const MOVE_HOP_PERIOD_MS = CombatVisualConfig.ANIMATION.MOVE_HOP_PERIOD_MS;
const ATTACK_FLASH_DURATION_MS = CombatVisualConfig.ANIMATION.ATTACK_FLASH_DURATION_MS;
const HIT_FLASH_DURATION_MS = CombatVisualConfig.ANIMATION.HIT_FLASH_DURATION_MS;

/**
 * Advance animation phases for a given enemy state.
 *
 * Returns a new animation state object with updated phases.
 * Does NOT modify the input object.
 */
export function advanceAnimationState(
  anim: CombatAnimationState,
  enemyState: CombatEnemyState,
  deltaMs: number,
): CombatAnimationState {
  const idleDeltaRad = (Math.PI * 2 * deltaMs) / IDLE_PULSE_PERIOD_MS;
  const moveDeltaRad = (Math.PI * 2 * deltaMs) / MOVE_HOP_PERIOD_MS;
  const result: CombatAnimationState = { ...anim };

  switch (enemyState) {
    case 'moving':
      result.idlePulsePhase += idleDeltaRad;
      result.moveHopPhase += moveDeltaRad;
      result.deathProgress = 0;
      break;

    case 'attacking':
      result.idlePulsePhase += idleDeltaRad;
      result.moveHopPhase = 0;
      result.deathProgress = 0;
      break;

    case 'dead':
      result.idlePulsePhase = 0;
      result.moveHopPhase = 0;
      result.attackFlashAt = 0;
      result.hitFlashAt = 0;
      result.deathProgress = Math.min(
        1,
        result.deathProgress + deltaMs / result.deathDurationMs,
      );
      break;
  }

  result.lastState = enemyState;

  return result;
}

/**
 * Expire flash timers that have elapsed beyond their duration.
 *
 * Returns a new animation state object with cleared timers if expired.
 */
export function expireAnimationTimers(
  anim: CombatAnimationState,
  elapsed: number,
): CombatAnimationState {
  const result: CombatAnimationState = { ...anim };

  if (
    anim.attackFlashAt !== 0
    && (elapsed - anim.attackFlashAt) >= ATTACK_FLASH_DURATION_MS
  ) {
    result.attackFlashAt = 0;
  }

  if (
    anim.hitFlashAt !== 0
    && (elapsed - anim.hitFlashAt) >= HIT_FLASH_DURATION_MS
  ) {
    result.hitFlashAt = 0;
  }

  return result;
}

/**
 * Compute the visual transform for the current animation state.
 *
 * Applies priority: death > hit > attack > move > idle.
 */
export function computeAnimationTransform(
  input: CombatAnimationTransformInput,
): CombatAnimationTransformOutput {
  const { anim, enemyState, elapsed, scaleMultiplier } = input;

  if (anim.deathProgress > 0) {
    return computeDeathTransform(anim);
  }

  if (anim.hitFlashAt > 0 && (elapsed - anim.hitFlashAt) < HIT_FLASH_DURATION_MS) {
    return computeHitTransform();
  }

  if (anim.attackFlashAt > 0 && (elapsed - anim.attackFlashAt) < ATTACK_FLASH_DURATION_MS) {
    return computeAttackTransform(anim, elapsed, scaleMultiplier);
  }

  if (enemyState === 'moving') {
    return computeMoveTransform(anim);
  }

  return computeIdleTransform(anim);
}

function computeIdleTransform(anim: CombatAnimationState): CombatAnimationTransformOutput {
  const pulse = Math.sin(anim.idlePulsePhase) * 0.02; // ±2%

  return {
    scale: 1 + pulse,
    yShift: 0,
    tint: null,
    alpha: 1,
    xShift: 0,
  };
}

function computeMoveTransform(anim: CombatAnimationState): CombatAnimationTransformOutput {
  const hop = Math.sin(anim.moveHopPhase) * 3; // ±3px

  return {
    scale: 1,
    yShift: hop,
    tint: null,
    alpha: 1,
    xShift: 0,
  };
}

function computeAttackTransform(
  anim: CombatAnimationState,
  elapsed: number,
  scaleMultiplier: number,
): CombatAnimationTransformOutput {
  const attackElapsed = elapsed - anim.attackFlashAt;
  const attackProgress = attackElapsed / ATTACK_FLASH_DURATION_MS; // 0→1
  const lungeAmount = Math.sin(attackProgress * Math.PI) * 4 * scaleMultiplier;
  const shouldTint = attackProgress < 0.3;

  return {
    scale: 1,
    yShift: lungeAmount,
    tint: shouldTint ? 0xffffff : null,
    alpha: 1,
    xShift: 0,
  };
}

function computeHitTransform(): CombatAnimationTransformOutput {
  return {
    scale: 1,
    yShift: 0,
    tint: 0xffffff,
    alpha: 1,
    xShift: 0,
  };
}

function computeDeathTransform(anim: CombatAnimationState): CombatAnimationTransformOutput {
  const progress = anim.deathProgress;

  return {
    scale: 1 - progress,
    yShift: anim.deathKnockbackY,
    tint: null,
    alpha: 1 - progress,
    xShift: anim.deathKnockbackX,
  };
}
