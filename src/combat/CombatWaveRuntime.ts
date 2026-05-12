import type { CombatSubWaveConfig } from '@config/CombatWaveConfig';
import type { SubWaveDefinition } from '@config/StageConfig';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import type { CombatRuntime } from './CombatRuntime';

export function initializeCombatWaveRuntime(
  runtime: CombatRuntime,
  random: () => number,
): void {
  activatePendingCombatSubWaves(runtime, random);
}

export function activatePendingCombatSubWaves(
  runtime: CombatRuntime,
  random: () => number,
): void {
  const toActivate: CombatSubWaveConfig[] = [];

  for (const subWave of runtime.wave.pendingSubWaves) {
    if (runtime.waveElapsedMs >= subWave.startTimeMs) {
      toActivate.push(subWave);
    }
  }

  for (const subWave of toActivate) {
    activateCombatSubWave(runtime, subWave, random);
  }
}

export function spawnCombatEnemies(
  runtime: CombatRuntime,
  random: () => number,
): void {
  for (const subWave of runtime.wave.activeSubWaves) {
    const bag = runtime.wave.spawnBags.get(subWave.id);

    if (!bag) {
      continue;
    }

    let spawnedThisStep = 0;

    while (
      bag.nextEnemyIndex < bag.enemyRuntimeIds.length
      && runtime.waveElapsedMs >= bag.nextSpawnAtMs
      && spawnedThisStep < CombatBalanceConfig.MAX_ENEMY_SPAWNS_PER_STEP
    ) {
      const enemyRuntimeId = bag.enemyRuntimeIds[bag.nextEnemyIndex];
      bag.nextEnemyIndex += 1;

      if (!enemyRuntimeId) {
        continue;
      }

      const enemy = runtime.enemyById.get(enemyRuntimeId);

      if (!enemy) {
        continue;
      }

      enemy.spawned = true;
      enemy.state = 'moving';
      enemy.nextAttackAtMs = 0;
      enemy.x = selectEnemySpawnX(random, runtime.wave.lastSpawnX);
      enemy.y = CombatLayoutConfig.ENEMY_SPAWN_Y;
      runtime.wave.lastSpawnX = enemy.x;
      bag.nextSpawnAtMs += bag.intervalMs;
      runtime.targeting.dirty = true;
      spawnedThisStep += 1;
    }
  }
}

export function createInitialCombatWaveState(
  currentWaveIndex: number,
  totalWaves: number,
  subWaves: SubWaveDefinition[],
): CombatRuntime['wave'] {
  return {
    currentWaveIndex,
    totalWaves,
    currentWaveId: null,
    activeSubWaves: [],
    pendingSubWaves: [...subWaves],
    spawnBags: new Map(),
    enemiesRemaining: countSubWaveEnemies(subWaves),
    lastSpawnX: null,
  };
}

function activateCombatSubWave(
  runtime: CombatRuntime,
  subWave: CombatSubWaveConfig,
  random: () => number,
): void {
  const { activeSubWaves, pendingSubWaves, spawnBags } = runtime.wave;
  const index = pendingSubWaves.indexOf(subWave);

  if (index === -1) {
    return;
  }

  pendingSubWaves.splice(index, 1);
  activeSubWaves.push(subWave);

  const alreadyAllocatedIds = new Set(
    Array.from(spawnBags.values()).flatMap((bag) => bag.enemyRuntimeIds.slice(bag.nextEnemyIndex)),
  );

  const enemyRuntimeIds: string[] = [];

  for (const [definitionId, count] of Object.entries(subWave.enemies)) {
    const queue = runtime.enemyQueuesByDefinitionId.get(definitionId) ?? [];
    let queueIndex = runtime.enemyQueueCursorByDefinitionId.get(definitionId) ?? 0;
    let allocated = 0;

    while (queueIndex < queue.length && allocated < count) {
      const enemy = queue[queueIndex];
      queueIndex += 1;

      if (!enemy || enemy.spawned || alreadyAllocatedIds.has(enemy.runtimeId)) {
        continue;
      }

      enemyRuntimeIds.push(enemy.runtimeId);
      alreadyAllocatedIds.add(enemy.runtimeId);
      allocated += 1;
    }

    runtime.enemyQueueCursorByDefinitionId.set(definitionId, queueIndex);
  }

  spawnBags.set(subWave.id, {
    enemyRuntimeIds: shuffleArray(enemyRuntimeIds, random),
    nextEnemyIndex: 0,
    nextSpawnAtMs: subWave.startTimeMs,
    intervalMs: subWave.spawnIntervalMs,
  });
}

function selectEnemySpawnX(random: () => number, lastSpawnX: number | null): number {
  let fallbackX: number = CombatLayoutConfig.ENEMY_SPAWN_X_MIN;

  for (let attempt = 0; attempt < CombatBalanceConfig.ENEMY_SPAWN_ATTEMPTS; attempt += 1) {
    const candidateX = Math.round(
      CombatLayoutConfig.ENEMY_SPAWN_X_MIN
      + random() * (CombatLayoutConfig.ENEMY_SPAWN_X_MAX - CombatLayoutConfig.ENEMY_SPAWN_X_MIN),
    );

    fallbackX = candidateX;

    if (
      lastSpawnX === null
      || Math.abs(candidateX - lastSpawnX) >= CombatBalanceConfig.ENEMY_SPAWN_MIN_GAP_PX
    ) {
      return candidateX;
    }
  }

  return fallbackX;
}

function countSubWaveEnemies(subWaves: SubWaveDefinition[]): number {
  return subWaves.reduce(
    (sum, subWave) =>
      sum + Object.values(subWave.enemies).reduce((a, b) => a + b, 0),
    0,
  );
}

function shuffleArray<T>(array: readonly T[], random: () => number): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = shuffled[i] as T;
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp;
  }

  return shuffled;
}
