export interface CombatBaseHpBarFillMetrics {
  width: number;
  ratio: number;
}

export function getCombatBaseHpBarFillMetrics(
  currentHp: number,
  maxHp: number,
  fillWidth: number,
): CombatBaseHpBarFillMetrics {
  if (maxHp <= 0 || fillWidth <= 0) {
    return {
      width: 0,
      ratio: 0,
    };
  }

  const clampedRatio = Math.min(1, Math.max(0, currentHp / maxHp));

  return {
    width: fillWidth * clampedRatio,
    ratio: clampedRatio,
  };
}
