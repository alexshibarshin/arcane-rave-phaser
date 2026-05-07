import { describe, expect, it } from 'vitest';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import {
  advanceAnimationState,
  expireAnimationTimers,
  computeAnimationTransform,
  type CombatAnimationState,
} from './CombatAnimationTransforms';

const baseAnim: CombatAnimationState = {
  idlePulsePhase: 0,
  moveHopPhase: 0,
  attackFlashAt: 0,
  hitFlashAt: 0,
  deathProgress: 0,
  deathStartX: 0,
  deathStartY: 0,
  deathKnockbackX: 0,
  deathKnockbackY: 0,
  deathDurationMs: 500,
  lastState: null,
};

describe('advanceAnimationState', () => {
  it('increments idle and move phases using their configured periods', () => {
    const result = advanceAnimationState(baseAnim, 'moving', 1000);

    expect(result.idlePulsePhase).toBeGreaterThan(0);
    expect(result.moveHopPhase).toBeGreaterThan(0);
    expect(result.attackFlashAt).toBe(0);
    expect(result.hitFlashAt).toBe(0);
    expect(result.deathProgress).toBe(0);
    expect(result.lastState).toBe('moving');
  });

  it('increments idle phase for attacking state without resetting flash timers', () => {
    const attackingAnim: CombatAnimationState = {
      ...baseAnim,
      attackFlashAt: 100,
      hitFlashAt: 90,
    };
    const result = advanceAnimationState(attackingAnim, 'attacking', 1000);

    expect(result.idlePulsePhase).toBeGreaterThan(0);
    expect(result.moveHopPhase).toBe(0);
    expect(result.attackFlashAt).toBe(100);
    expect(result.hitFlashAt).toBe(90);
    expect(result.deathProgress).toBe(0);
    expect(result.lastState).toBe('attacking');
  });

  it('preserves attackFlashAt for attacking state when already set', () => {
    const animWithAttack: CombatAnimationState = {
      ...baseAnim,
      attackFlashAt: 100,
    };
    const result = advanceAnimationState(animWithAttack, 'attacking', 1000);

    expect(result.attackFlashAt).toBe(100);
  });

  it('increments deathProgress for dead state', () => {
    const result = advanceAnimationState(baseAnim, 'dead', 250);

    expect(result.deathProgress).toBe(0.5);
  });

  it('caps deathProgress at 1', () => {
    const result = advanceAnimationState(baseAnim, 'dead', 1000);

    expect(result.deathProgress).toBe(1);
  });

  it('resets all phases for dead state except deathProgress', () => {
    const animWithPhases: CombatAnimationState = {
      ...baseAnim,
      idlePulsePhase: 10,
      moveHopPhase: 10,
      attackFlashAt: 50,
      hitFlashAt: 50,
    };
    const result = advanceAnimationState(animWithPhases, 'dead', 100);

    expect(result.idlePulsePhase).toBe(0);
    expect(result.moveHopPhase).toBe(0);
    expect(result.attackFlashAt).toBe(0);
    expect(result.hitFlashAt).toBe(0);
    expect(result.lastState).toBe('dead');
  });

  it('does not mutate the input object', () => {
    const originalIdlePhase = baseAnim.idlePulsePhase;
    advanceAnimationState(baseAnim, 'moving', 1000);

    expect(baseAnim.idlePulsePhase).toBe(originalIdlePhase);
  });
});

describe('expireAnimationTimers', () => {
  it('does not clear attackFlashAt when not yet expired', () => {
    const anim: CombatAnimationState = {
      ...baseAnim,
      attackFlashAt: 900,
    };
    const result = expireAnimationTimers(anim, 950);

    expect(result.attackFlashAt).toBe(900);
  });

  it('clears attackFlashAt when expired beyond ATTACK_FLASH_DURATION_MS', () => {
    const anim: CombatAnimationState = {
      ...baseAnim,
      attackFlashAt: 800,
    };
    const result = expireAnimationTimers(anim, 1000);

    expect(result.attackFlashAt).toBe(0);
  });

  it('does not clear hitFlashAt when not yet expired', () => {
    const anim: CombatAnimationState = {
      ...baseAnim,
      hitFlashAt: 75,
    };
    const result = expireAnimationTimers(anim, 90);

    expect(result.hitFlashAt).toBe(75);
  });

  it('clears hitFlashAt when expired beyond HIT_FLASH_DURATION_MS', () => {
    const anim: CombatAnimationState = {
      ...baseAnim,
      hitFlashAt: 1,
    };
    const result = expireAnimationTimers(anim, 100);

    expect(result.hitFlashAt).toBe(0);
  });

  it('does not mutate the input object', () => {
    const anim: CombatAnimationState = {
      ...baseAnim,
      attackFlashAt: 800,
    };
    expireAnimationTimers(anim, 1000);

    expect(anim.attackFlashAt).toBe(800);
  });
});

describe('computeAnimationTransform', () => {
  const attackAt = (flashAt: number): { anim: CombatAnimationState; elapsed: number } => ({
    anim: { ...baseAnim, attackFlashAt: flashAt },
    elapsed: flashAt,
  });

  const hitAt = (flashAt: number): { anim: CombatAnimationState; elapsed: number } => ({
    anim: { ...baseAnim, hitFlashAt: flashAt },
    elapsed: flashAt,
  });

  const attackStartedAt = (flashAt: number): CombatAnimationState => ({
    ...baseAnim,
    attackFlashAt: flashAt,
  });

  it('returns a neutral idle transform when no higher-priority state is active', () => {
    const result = computeAnimationTransform({
      anim: baseAnim,
      enemyState: 'idle',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBe(1);
    expect(result.yShift).toBe(0);
    expect(result.tint).toBeNull();
    expect(result.alpha).toBe(1);
  });

  it('returns hop offset for moving state', () => {
    const movingAnim: CombatAnimationState = {
      ...baseAnim,
      moveHopPhase: Math.PI / 2,
    };
    const result = computeAnimationTransform({
      anim: movingAnim,
      enemyState: 'moving',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBe(1);
    expect(result.yShift).toBeGreaterThan(0);
    expect(result.tint).toBeNull();
  });

  it('returns negative hop at PI*1.5 phase', () => {
    const movingAnim: CombatAnimationState = {
      ...baseAnim,
      moveHopPhase: Math.PI * 1.5,
    };
    const result = computeAnimationTransform({
      anim: movingAnim,
      enemyState: 'moving',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.yShift).toBeLessThan(0);
  });

  it('returns white tint and lunge for attack state at start', () => {
    const { anim, elapsed } = attackAt(1);
    const result = computeAnimationTransform({
      anim,
      enemyState: 'attacking',
      elapsed,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBe(0xffffff);
    expect(result.yShift).toBe(0);
    expect(result.alpha).toBe(1);
  });

  it('tint clears after 30% of attack duration', () => {
    const resultEarly = computeAnimationTransform({
      anim: attackStartedAt(22),
      enemyState: 'attacking',
      elapsed: 22,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });
    expect(resultEarly.tint).toBe(0xffffff);

    const resultEdge = computeAnimationTransform({
      anim: attackStartedAt(45),
      enemyState: 'attacking',
      elapsed: 90,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });
    expect(resultEdge.tint).toBeNull();
  });

  it('attack lunge peaks at middle of duration', () => {
    const earlyResult = computeAnimationTransform({
      anim: attackStartedAt(75),
      enemyState: 'attacking',
      elapsed: 90,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });
    const result = computeAnimationTransform({
      anim: attackStartedAt(75),
      enemyState: 'attacking',
      elapsed: 150,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.yShift).toBeGreaterThan(earlyResult.yShift);
  });

  it('scales lunge by scaleMultiplier', () => {
    const baseline = computeAnimationTransform({
      anim: attackStartedAt(75),
      enemyState: 'attacking',
      elapsed: 150,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });
    const result = computeAnimationTransform({
      anim: attackStartedAt(75),
      enemyState: 'attacking',
      elapsed: 150,
      deltaMs: 16.67,
      scaleMultiplier: 2.5,
    });

    expect(result.yShift).toBeCloseTo(baseline.yShift * 2.5);
  });

  it('attack overrides move hop while active', () => {
    const movingAttackAnim: CombatAnimationState = {
      ...attackStartedAt(75),
      moveHopPhase: Math.PI / 2,
    };
    const result = computeAnimationTransform({
      anim: movingAttackAnim,
      enemyState: 'moving',
      elapsed: 150,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.yShift).toBe(4);
    expect(result.tint).toBeNull();
  });

  it('returns white tint for hit state', () => {
    const { anim, elapsed } = hitAt(1);
    const result = computeAnimationTransform({
      anim,
      enemyState: 'moving',
      elapsed,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBe(0xffffff);
    expect(result.scale).toBe(1);
    expect(result.yShift).toBe(0);
  });

  it('hit flash overrides move hop', () => {
    const { anim, elapsed } = hitAt(1);
    const hitAnim: CombatAnimationState = {
      ...anim,
      moveHopPhase: Math.PI / 2,
    };
    const result = computeAnimationTransform({
      anim: hitAnim,
      enemyState: 'moving',
      elapsed,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBe(0xffffff);
    expect(result.yShift).toBe(0);
  });

  it('hit flash overrides attack', () => {
    const { anim: hitAnim, elapsed: hitElapsed } = hitAt(1);
    const { anim: attackAnim } = attackAt(1);
    const combined: CombatAnimationState = {
      ...hitAnim,
      ...attackAnim,
    };
    const result = computeAnimationTransform({
      anim: combined,
      enemyState: 'attacking',
      elapsed: hitElapsed,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBe(0xffffff);
    expect(result.yShift).toBe(0);
  });

  it('death overrides all other states', () => {
    const deathAnim: CombatAnimationState = {
      ...baseAnim,
      deathProgress: 0.5,
      hitFlashAt: 1,
      attackFlashAt: 1,
      moveHopPhase: Math.PI / 2,
    };
    const result = computeAnimationTransform({
      anim: deathAnim,
      enemyState: 'moving',
      elapsed: 1,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBeLessThan(1);
    expect(result.alpha).toBeLessThan(1);
    expect(result.tint).toBeNull();
    expect(result.yShift).toBe(0);
  });

  it('death scales down to 0 at progress=1', () => {
    const deathAnim: CombatAnimationState = {
      ...baseAnim,
      deathProgress: 1,
    };
    const result = computeAnimationTransform({
      anim: deathAnim,
      enemyState: 'dead',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBe(0);
    expect(result.alpha).toBe(0);
  });

  it('death keeps full scale during the configured startup delay', () => {
    const delayProgress = CombatVisualConfig.ANIMATION.DEATH_SCALE_DELAY_RATIO / 2;
    const deathAnim: CombatAnimationState = {
      ...baseAnim,
      deathProgress: delayProgress,
    };
    const result = computeAnimationTransform({
      anim: deathAnim,
      enemyState: 'dead',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBe(1);
    expect(result.alpha).toBeCloseTo(1 - delayProgress);
  });

  it('death applies knockback offset', () => {
    const deathAnim: CombatAnimationState = {
      ...baseAnim,
      deathProgress: 0.5,
      deathKnockbackX: 10,
      deathKnockbackY: -5,
    };
    const result = computeAnimationTransform({
      anim: deathAnim,
      enemyState: 'dead',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.xShift).toBeGreaterThan(0);
    expect(result.yShift).toBeLessThan(0);
  });

  it('death knockback reaches the full offset at progress=1', () => {
    const deathAnim: CombatAnimationState = {
      ...baseAnim,
      deathProgress: 1,
      deathKnockbackX: 10,
      deathKnockbackY: -5,
    };
    const result = computeAnimationTransform({
      anim: deathAnim,
      enemyState: 'dead',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.xShift).toBe(10);
    expect(result.yShift).toBe(-5);
  });

  it('idle pulse oscillates with phase', () => {
    const idleAnim: CombatAnimationState = {
      ...baseAnim,
      idlePulsePhase: Math.PI / 2,
    };
    const result = computeAnimationTransform({
      anim: idleAnim,
      enemyState: 'idle',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBeGreaterThan(1);
  });

  it('idle pulse goes below 1 at PI*1.5 phase', () => {
    const idleAnim: CombatAnimationState = {
      ...baseAnim,
      idlePulsePhase: Math.PI * 1.5,
    };
    const result = computeAnimationTransform({
      anim: idleAnim,
      enemyState: 'idle',
      elapsed: 0,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.scale).toBeLessThan(1);
  });

  it('expired attack falls back to move hop for moving enemies', () => {
    const movingOnlyResult = computeAnimationTransform({
      anim: {
        ...baseAnim,
        moveHopPhase: Math.PI / 2,
      },
      enemyState: 'moving',
      elapsed: 200,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });
    const result = computeAnimationTransform({
      anim: {
        ...attackAt(1).anim,
        moveHopPhase: Math.PI / 2,
      },
      enemyState: 'moving',
      elapsed: 200,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBeNull();
    expect(result.yShift).toBe(movingOnlyResult.yShift);
  });

  it('expired hit flash falls back to move hop for moving enemies', () => {
    const movingOnlyResult = computeAnimationTransform({
      anim: {
        ...baseAnim,
        moveHopPhase: Math.PI / 2,
      },
      enemyState: 'moving',
      elapsed: 100,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });
    const result = computeAnimationTransform({
      anim: {
        ...hitAt(1).anim,
        moveHopPhase: Math.PI / 2,
      },
      enemyState: 'moving',
      elapsed: 100,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBeNull();
    expect(result.yShift).toBe(movingOnlyResult.yShift);
  });

  it('attack at the duration boundary is no longer active', () => {
    const result = computeAnimationTransform({
      anim: attackAt(1).anim,
      enemyState: 'idle',
      elapsed: 151,
      deltaMs: 16.67,
      scaleMultiplier: 1,
    });

    expect(result.tint).toBeNull();
    expect(result.scale).toBe(1);
  });
});
