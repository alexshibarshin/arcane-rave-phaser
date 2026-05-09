import { describe, it, expect } from 'vitest';
import { calculateStageStars } from './calculateStageStars';

const T = { threeStarMinRatio: 0.9, twoStarMinRatio: 0.5 };

describe('calculateStageStars', () => {
  it('returns 3 stars when ratio > threeStarMinRatio', () => {
    expect(calculateStageStars(100, 100, T).stars).toBe(3);
    expect(calculateStageStars(91, 100, T).stars).toBe(3);
  });

  it('returns 2 stars when ratio is exactly threeStarMinRatio', () => {
    expect(calculateStageStars(90, 100, T).stars).toBe(2);
  });

  it('returns 2 stars when ratio is between twoStarMinRatio and threeStarMinRatio', () => {
    expect(calculateStageStars(50, 100, T).stars).toBe(2);
  });

  it('returns 2 stars when ratio is exactly twoStarMinRatio', () => {
    expect(calculateStageStars(50, 100, T).stars).toBe(2);
  });

  it('returns 1 star when ratio is below twoStarMinRatio but base alive', () => {
    expect(calculateStageStars(49, 100, T).stars).toBe(1);
    expect(calculateStageStars(1, 100, T).stars).toBe(1);
  });

  it('returns 0 stars when remainingBaseHp is 0', () => {
    expect(calculateStageStars(0, 100, T).stars).toBe(0);
  });

  it('returns 0 stars when remainingBaseHp is negative', () => {
    expect(calculateStageStars(-10, 100, T).stars).toBe(0);
  });

  it('caps ratio at 1.0 when remainingBaseHp exceeds maxBaseHp', () => {
    expect(calculateStageStars(150, 100, T).stars).toBe(3);
  });

  it('returns 0 stars when maxBaseHp is 0', () => {
    expect(calculateStageStars(0, 0, T).stars).toBe(0);
  });

  it('uses CombatBalanceConfig defaults when thresholds not provided', () => {
    // 100/100 with default config (> 0.9) → 3 stars
    const result = calculateStageStars(100, 100);
    expect(result.stars).toBe(3);
  });
});
