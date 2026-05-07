import { describe, expect, it } from 'vitest';
import { computeDeathKnockbackOffset } from './CombatDeathKnockback';

describe('computeDeathKnockbackOffset', () => {
  it('returns a normalized offset with a positive magnitude', () => {
    const result = computeDeathKnockbackOffset(
      { x: 10, y: 20 },
      { x: 34, y: 52 },
    );

    expect(Math.hypot(result.x, result.y)).toBeGreaterThan(0);
    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
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
