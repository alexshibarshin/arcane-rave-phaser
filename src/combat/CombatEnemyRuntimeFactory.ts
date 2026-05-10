import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import type { CombatEnemyRuntime } from './CombatRuntime';
import type { SubWaveDefinition } from '@config/StageConfig';

export function createCombatEnemyRuntimes(
  subWaves: SubWaveDefinition[],
  enemyStatOverrides?: Record<string, { maxHp: number }>,
): CombatEnemyRuntime[] {
  const totalSpawnsPerDefinition = new Map<string, number>();

  for (const subWave of subWaves) {
    for (const [definitionId, count] of Object.entries(subWave.enemies)) {
      totalSpawnsPerDefinition.set(
        definitionId,
        (totalSpawnsPerDefinition.get(definitionId) ?? 0) + count,
      );
    }
  }

  const runtimes: CombatEnemyRuntime[] = [];
  let runtimeIndex = 0;

  for (const enemy of CombatContentConfig.ENEMY_DEFINITIONS) {
    const count = totalSpawnsPerDefinition.get(enemy.id) ?? 0;
    const overrideHp = enemyStatOverrides?.[enemy.id]?.maxHp;
    const effectiveMaxHp = overrideHp != null ? overrideHp : enemy.maxHp;

    for (let i = 0; i < count; i += 1) {
      const index = runtimeIndex++;

      runtimes.push({
        runtimeId: `enemy-runtime-${index + 1}`,
        definitionId: enemy.id,
        archetype: enemy.archetype,
        color: enemy.color,
        currentHp: effectiveMaxHp,
        maxHp: effectiveMaxHp,
        x:
          CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X[index]
          ?? CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X[0],
        y:
          CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_Y[index]
          ?? CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_Y[0],
        state: 'moving',
        spawned: false,
        nextAttackAtMs: 0,
        renderContainerName: `enemy-container-${index + 1}`,
        silhouetteMotif: enemy.silhouetteMotif,
        isSpecial: enemy.isSpecial,
      });
    }
  }

  // Handle definition IDs in sub-waves that are not in ENEMY_DEFINITIONS
  // (e.g. special enemies referenced only via enemyStatOverrides)
  for (const [definitionId, count] of totalSpawnsPerDefinition.entries()) {
    if (count === 0) {
      continue;
    }

    const alreadyHandled = CombatContentConfig.ENEMY_DEFINITIONS.some((e) => e.id === definitionId);

    if (alreadyHandled) {
      continue;
    }

    const overrideHp = enemyStatOverrides?.[definitionId]?.maxHp;

    if (overrideHp == null) {
      throw new Error(
        `Enemy "${definitionId}" is not defined in CombatContentConfig and has no stat overrides.`,
      );
    }

    for (let i = 0; i < count; i += 1) {
      const index = runtimeIndex++;

      runtimes.push({
        runtimeId: `enemy-runtime-${index + 1}`,
        definitionId,
        archetype: 'unknown',
        color: 'red',
        currentHp: overrideHp,
        maxHp: overrideHp,
        x:
          CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X[index]
          ?? CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X[0],
        y:
          CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_Y[index]
          ?? CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_Y[0],
        state: 'moving',
        spawned: false,
        nextAttackAtMs: 0,
        renderContainerName: `enemy-container-${index + 1}`,
      });
    }
  }

  return runtimes;
}
