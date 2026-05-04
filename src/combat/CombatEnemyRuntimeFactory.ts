import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import type { CombatEnemyRuntime } from './CombatRuntime';

export function createCombatEnemyRuntimes(): CombatEnemyRuntime[] {
  return CombatContentConfig.ENEMY_DEFINITIONS.map((enemy, index) => ({
    runtimeId: `enemy-runtime-${index + 1}`,
    definitionId: enemy.id,
    archetype: enemy.archetype,
    color: enemy.color,
    currentHp: enemy.maxHp,
    maxHp: enemy.maxHp,
    x: CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X[index] ?? CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X[0],
    y: CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_Y[index] ?? CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_Y[0],
    state: 'moving',
    nextAttackAtMs: 0,
    renderContainerName: `enemy-container-${index + 1}`,
  }));
}
