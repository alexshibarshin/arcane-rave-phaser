import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import type { CombatEnemyRuntime } from './CombatRuntime';
import type { CombatWaveDefinition } from '@config/CombatWaveConfig';

export function createCombatEnemyRuntimes(
  waveDefinition: CombatWaveDefinition,
): CombatEnemyRuntime[] {
  const totalSpawnsPerDefinition = new Map<string, number>();

  for (const subWave of waveDefinition.subWaves) {
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

    for (let i = 0; i < count; i += 1) {
      const index = runtimeIndex++;

      runtimes.push({
        runtimeId: `enemy-runtime-${index + 1}`,
        definitionId: enemy.id,
        archetype: enemy.archetype,
        color: enemy.color,
        currentHp: enemy.maxHp,
        maxHp: enemy.maxHp,
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
