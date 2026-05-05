import { describe, expect, it } from 'vitest';
import { getCombatBaseHpBarFillMetrics } from './CombatBaseHpBar';

describe('CombatBaseHpBar', () => {
  it('converts current hp into a clamped fill width ratio', () => {
    expect(getCombatBaseHpBarFillMetrics(100, 100, 174)).toEqual({
      width: 174,
      ratio: 1,
    });
    expect(getCombatBaseHpBarFillMetrics(50, 100, 174)).toEqual({
      width: 87,
      ratio: 0.5,
    });
    expect(getCombatBaseHpBarFillMetrics(-10, 100, 174)).toEqual({
      width: 0,
      ratio: 0,
    });
    expect(getCombatBaseHpBarFillMetrics(150, 100, 174)).toEqual({
      width: 174,
      ratio: 1,
    });
  });
});
