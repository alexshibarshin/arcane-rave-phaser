import { CombatContentConfig } from '@config/CombatContentConfig';
import { createCombatLayoutPlan } from './CombatLayout';
import { setCombatState, type CombatRuntime } from './CombatRuntime';
import { pushCombatBaseDamaged } from './CombatRuntimeEvents';
import { getEnemyMoveSpeedMultiplier } from './CombatStatuses';

const combatLayout = createCombatLayoutPlan();
const enemyDefinitionsById = new Map(
  CombatContentConfig.ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
);

export function advanceCombatEnemyPressure(
  runtime: CombatRuntime,
  deltaMs: number,
): void {
  for (const enemy of runtime.enemies) {
    if (!enemy.spawned) {
      continue;
    }

    const definition = enemyDefinitionsById.get(enemy.definitionId);

    if (!definition) {
      continue;
    }

    if (enemy.state === 'attacking') {
      updateEnemyBaseAttacks(runtime, enemy, definition.attackCooldownMs, definition.attackDamage);
      continue;
    }

    if (enemy.state !== 'moving') {
      continue;
    }

    const distanceToBase = Math.hypot(enemy.x - combatLayout.base.x, enemy.y - combatLayout.base.y);

    if (distanceToBase <= definition.attackRangePx) {
      enemy.state = 'attacking';
      enemy.nextAttackAtMs = runtime.combatElapsedMs + definition.attackCooldownMs;
      continue;
    }

    const stepPx =
      definition.moveSpeedPxPerSec
      * getEnemyMoveSpeedMultiplier(runtime, enemy.runtimeId)
      * (deltaMs / 1000);
    const nextY = enemy.y + stepPx;
    const nextDistanceToBase = Math.hypot(enemy.x - combatLayout.base.x, nextY - combatLayout.base.y);

    if (nextDistanceToBase <= definition.attackRangePx) {
      enemy.y = clampEnemyToAttackRange(
        enemy.x,
        combatLayout.base.x,
        combatLayout.base.y,
        definition.attackRangePx,
      );
      enemy.state = 'attacking';
      enemy.nextAttackAtMs = runtime.combatElapsedMs + definition.attackCooldownMs;
      continue;
    }

    enemy.y = nextY;
  }
}

function updateEnemyBaseAttacks(
  runtime: CombatRuntime,
  enemy: CombatRuntime['enemies'][number],
  attackCooldownMs: number,
  attackDamage: number,
): void {
  if (enemy.nextAttackAtMs <= 0) {
    enemy.nextAttackAtMs = attackCooldownMs;
    return;
  }

  while (runtime.state === 'running' && runtime.combatElapsedMs >= enemy.nextAttackAtMs) {
    runtime.baseHp = Math.max(0, runtime.baseHp - attackDamage);
    pushCombatBaseDamaged(runtime, attackDamage);

    if (runtime.baseHp <= 0) {
      setCombatState(runtime, 'defeat');
      return;
    }

    enemy.nextAttackAtMs += attackCooldownMs;
  }
}

function clampEnemyToAttackRange(
  enemyX: number,
  baseX: number,
  baseY: number,
  attackRangePx: number,
): number {
  const deltaX = enemyX - baseX;
  const maxDeltaY = Math.sqrt(Math.max(attackRangePx ** 2 - deltaX ** 2, 0));

  return baseY - maxDeltaY;
}
