import { CombatVisualConfig } from '@config/CombatVisualConfig';

export interface CombatPoint {
  x: number;
  y: number;
}

export function computeDeathKnockbackOffset(
  origin: CombatPoint,
  target: CombatPoint,
  magnitude: number = CombatVisualConfig.ENEMY.KNOCKBACK_MAGNITUDE_PX,
): CombatPoint {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (dx / distance) * magnitude,
    y: (dy / distance) * magnitude,
  };
}
