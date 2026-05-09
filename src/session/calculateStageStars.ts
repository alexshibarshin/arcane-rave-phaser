import { CombatBalanceConfig } from '../config/CombatBalanceConfig';

interface StarThresholds {
  threeStarMinRatio: number;
  twoStarMinRatio: number;
}

export function calculateStageStars(
  remainingBaseHp: number,
  maxBaseHp: number,
  thresholds?: StarThresholds,
): { stars: number } {
  if (remainingBaseHp <= 0 || maxBaseHp <= 0) return { stars: 0 };

  const ratio = Math.min(remainingBaseHp / maxBaseHp, 1);
  const t = thresholds ?? {
    threeStarMinRatio: CombatBalanceConfig.STAR_THRESHOLDS.THREE_STAR_MIN_RATIO,
    twoStarMinRatio: CombatBalanceConfig.STAR_THRESHOLDS.TWO_STAR_MIN_RATIO,
  };

  if (ratio > t.threeStarMinRatio) return { stars: 3 };
  if (ratio >= t.twoStarMinRatio) return { stars: 2 };
  return { stars: 1 };
}
