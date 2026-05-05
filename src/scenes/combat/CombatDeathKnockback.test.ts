import { describe, expect, it } from 'vitest';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { computeDeathKnockbackOffset } from './CombatDeathKnockback';

describe('computeDeathKnockbackOffset', () => {
  it('returns a normalized offset with the configured magnitude', () => {
    const result = computeDeathKnockbackOffset(
      { x: 10, y: 20 },
      { x: 34, y: 52 },
    );

    expect(Math.hypot(result.x, result.y)).toBeCloseTo(
      CombatVisualConfig.ENEMY.KNOCKBACK_MAGNITUDE_PX,
    );
    expect(result.x).toBeCloseTo(0.6 * CombatVisualConfig.ENEMY.KNOCKBACK_MAGNITUDE_PX);
    expect(result.y).toBeCloseTo(0.8 * CombatVisualConfig.ENEMY.KNOCKBACK_MAGNITUDE_PX);
  });

  it('returns no knockback when origin and target are the same point', () => {
    const result = computeDeathKnockbackOffset(
      { x: 42, y: 84 },
      { x: 42, y: 84 },
    );

    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('supports custom knockback magnitudes', () => {
    const result = computeDeathKnockbackOffset(
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      10,
    );

    expect(result).toEqual({ x: 6, y: 8 });
  });
});
