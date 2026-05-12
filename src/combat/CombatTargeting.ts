import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import type { CombatTargetingRule } from '@config/CombatContentConfig';
import { createCombatLayoutPlan } from './CombatLayout';
import type { CombatEnemyRuntime, CombatRuntime, CombatSlotRuntime } from './CombatRuntime';

const ENEMY_COLLISION_RADIUS_PX = 22;
const combatLayout = createCombatLayoutPlan();

export interface ResolveTargetOptions {
  excludedEnemyRuntimeIds?: string[];
  random?: () => number;
}

const TARGETING_STRATEGIES: Record<
  CombatTargetingRule,
  (runtime: CombatRuntime, options: ResolveTargetOptions) => CombatEnemyRuntime | null
> = {
  'frontmost-enemy': (runtime, options) =>
    selectFrontmostEnemyExcluding(runtime, options.excludedEnemyRuntimeIds ?? []),
  'random-enemy': (runtime, options) =>
    selectRandomEnemy(runtime, options.random),
};

export function resolveTarget(
  runtime: CombatRuntime,
  rule: CombatTargetingRule,
  options: ResolveTargetOptions = {},
): CombatEnemyRuntime | null {
  return TARGETING_STRATEGIES[rule](runtime, options);
}

export function selectFrontmostEnemy(runtime: CombatRuntime): CombatEnemyRuntime | null {
  return selectFrontmostEnemyExcluding(runtime, []);
}

export function selectFrontmostEnemyExcluding(
  runtime: CombatRuntime,
  excludedEnemyRuntimeIds: string[],
): CombatEnemyRuntime | null {
  const snapshot = getCombatTargetingSnapshot(runtime);

  if (excludedEnemyRuntimeIds.length === 0) {
    return snapshot.frontmostEnemy;
  }

  const excludedIds = excludedEnemyRuntimeIds.length > 0
    ? new Set(excludedEnemyRuntimeIds)
    : null;

  for (const enemy of snapshot.targetableEnemies) {
    if (excludedIds?.has(enemy.runtimeId)) {
      continue;
    }

    return enemy;
  }

  return null;
}

export function selectRandomEnemy(
  runtime: CombatRuntime,
  random: () => number = Math.random,
): CombatEnemyRuntime | null {
  const targetableEnemies = getCombatTargetingSnapshot(runtime).targetableEnemies;

  if (targetableEnemies.length === 0) {
    return null;
  }

  return targetableEnemies[Math.floor(random() * targetableEnemies.length)] ?? null;
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

export function getTargetableEnemies(runtime: CombatRuntime): CombatEnemyRuntime[] {
  return getCombatTargetingSnapshot(runtime).targetableEnemies;
}

export function getNearbyTargetableEnemies(
  runtime: CombatRuntime,
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    paddingPx?: number;
  },
): CombatEnemyRuntime[] {
  const snapshot = getCombatTargetingSnapshot(runtime);
  const paddingPx = bounds.paddingPx ?? ENEMY_COLLISION_RADIUS_PX;
  const minRow = Math.floor((bounds.minY - paddingPx) / CombatBalanceConfig.TARGETING_BUCKET_HEIGHT_PX);
  const maxRow = Math.floor((bounds.maxY + paddingPx) / CombatBalanceConfig.TARGETING_BUCKET_HEIGHT_PX);
  const candidates: CombatEnemyRuntime[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    const rowEnemies = snapshot.bucketsByRow.get(row);

    if (!rowEnemies) {
      continue;
    }

    for (const enemy of rowEnemies) {
      if (
        enemy.x < bounds.minX - paddingPx
        || enemy.x > bounds.maxX + paddingPx
        || enemy.y < bounds.minY - paddingPx
        || enemy.y > bounds.maxY + paddingPx
      ) {
        continue;
      }

      candidates.push(enemy);
    }
  }

  return candidates;
}

export function invalidateCombatTargeting(runtime: CombatRuntime): void {
  runtime.targeting.dirty = true;
}

export function createRuntimeEffectId(runtime: CombatRuntime, prefix: string): string {
  const id = runtime.ids.nextEffectId++;
  return `${prefix}-${id}`;
}

function getCombatTargetingSnapshot(runtime: CombatRuntime): CombatRuntime['targeting'] {
  if (!runtime.targeting.dirty) {
    return runtime.targeting;
  }

  const targetableEnemies: CombatEnemyRuntime[] = [];
  const bucketsByRow = new Map<number, CombatEnemyRuntime[]>();

  for (const enemy of runtime.enemies) {
    if (!isEnemyTargetable(enemy)) {
      continue;
    }

    targetableEnemies.push(enemy);
  }

  targetableEnemies.sort((left, right) => distanceToBase(runtime, left) - distanceToBase(runtime, right));

  for (const enemy of targetableEnemies) {
    const row = Math.floor(enemy.y / CombatBalanceConfig.TARGETING_BUCKET_HEIGHT_PX);
    const rowEnemies = bucketsByRow.get(row);

    if (rowEnemies) {
      rowEnemies.push(enemy);
      continue;
    }

    bucketsByRow.set(row, [enemy]);
  }

  runtime.targeting.targetableEnemies = targetableEnemies;
  runtime.targeting.frontmostEnemy = targetableEnemies[0] ?? null;
  runtime.targeting.bucketsByRow = bucketsByRow;
  runtime.targeting.dirty = false;

  return runtime.targeting;
}
