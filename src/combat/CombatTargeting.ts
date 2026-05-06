import { createCombatLayoutPlan } from './CombatLayout';
import type { CombatEnemyRuntime, CombatRuntime, CombatSlotRuntime } from './CombatRuntime';

const ENEMY_COLLISION_RADIUS_PX = 22;
const combatLayout = createCombatLayoutPlan();

export function selectFrontmostEnemy(runtime: CombatRuntime): CombatEnemyRuntime | null {
  return selectFrontmostEnemyExcluding(runtime, []);
}

export function selectFrontmostEnemyExcluding(
  runtime: CombatRuntime,
  excludedEnemyRuntimeIds: string[],
): CombatEnemyRuntime | null {
  let frontmostEnemy: CombatEnemyRuntime | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of runtime.enemies) {
    if (!isEnemyTargetable(enemy) || excludedEnemyRuntimeIds.includes(enemy.runtimeId)) {
      continue;
    }

    const distance = distanceToBase(runtime, enemy);

    if (distance < bestDistance) {
      bestDistance = distance;
      frontmostEnemy = enemy;
    }
  }

  return frontmostEnemy;
}

export function selectRandomEnemy(
  runtime: CombatRuntime,
  random: () => number = Math.random,
): CombatEnemyRuntime | null {
  const candidates = runtime.enemies.filter(isEnemyTargetable);

  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  const index = Math.floor(random() * candidates.length);
  return candidates[index] ?? candidates[0] ?? null;
}

export function getSlotOrigin(slot: CombatSlotRuntime): { x: number; y: number } | null {
  return slot.worldPosition;
}

export function isEnemyTargetable(enemy: CombatEnemyRuntime): boolean {
  return enemy.spawned && enemy.state !== 'dead' && enemy.currentHp > 0;
}

export function pointIntersectsEnemy(
  x: number,
  y: number,
  enemy: CombatEnemyRuntime,
): boolean {
  return Math.hypot(enemy.x - x, enemy.y - y) <= ENEMY_COLLISION_RADIUS_PX;
}

export function segmentIntersectsEnemy(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  enemy: CombatEnemyRuntime,
): boolean {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0.0001) {
    return pointIntersectsEnemy(startX, startY, enemy);
  }

  const projection = ((enemy.x - startX) * dx + (enemy.y - startY) * dy) / lengthSquared;
  const clampedProjection = Math.min(1, Math.max(0, projection));
  const closestX = startX + dx * clampedProjection;
  const closestY = startY + dy * clampedProjection;

  return Math.hypot(enemy.x - closestX, enemy.y - closestY) <= ENEMY_COLLISION_RADIUS_PX;
}

export function createDirectionToEnemy(
  originX: number,
  originY: number,
  enemy: CombatEnemyRuntime,
): { x: number; y: number } {
  return normalizeVector(enemy.x - originX, enemy.y - originY);
}

export function rotateDirection(
  direction: { x: number; y: number },
  angleDeg: number,
): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return normalizeVector(
    direction.x * cos - direction.y * sin,
    direction.x * sin + direction.y * cos,
  );
}

export function createVolleyAngles(count: number, coneAngleDeg: number): number[] {
  if (count <= 1) {
    return [0];
  }

  const step = coneAngleDeg / (count - 1);
  const start = -coneAngleDeg / 2;
  return Array.from({ length: count }, (_, index) => start + step * index);
}

export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= 0.0001) {
    return { x: 0, y: -1 };
  }

  return {
    x: x / magnitude,
    y: y / magnitude,
  };
}

export function distanceToBase(runtime: CombatRuntime, enemy: CombatEnemyRuntime): number {
  return Math.hypot(
    enemy.x - combatLayout.base.x,
    enemy.y - combatLayout.base.y,
  );
}

export function createRuntimeEffectId(runtime: CombatRuntime, prefix: string): string {
  const id = runtime.ids.nextEffectId++;
  return `${prefix}-${id}`;
}
