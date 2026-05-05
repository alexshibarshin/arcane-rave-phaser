import {
  CombatWaveConfig,
  type CombatSubWaveConfig,
  type CombatWaveDefinition,
} from '@config/CombatWaveConfig';
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

    while (bag.enemyRuntimeIds.length > 0 && runtime.waveElapsedMs >= bag.nextSpawnAtMs) {
      const enemyRuntimeId = bag.enemyRuntimeIds.shift();

      if (!enemyRuntimeId) {
        continue;
      }

      const enemy = runtime.enemies.find((entry) => entry.runtimeId === enemyRuntimeId);

      if (!enemy) {
        continue;
      }

      enemy.spawned = true;
      enemy.state = 'moving';
      enemy.nextAttackAtMs = 0;
      enemy.x = selectEnemySpawnX(random, runtime.spawn.lastSpawnX);
      enemy.y = CombatLayoutConfig.ENEMY_SPAWN_Y;
      runtime.spawn.lastSpawnX = enemy.x;
      bag.nextSpawnAtMs += bag.intervalMs;
    }
  }
}

export function calculateCombatEnemiesRemaining(runtime: CombatRuntime): number {
  const livingEnemies = runtime.enemies.filter(
    (enemy) => enemy.spawned && enemy.state !== 'dead',
  ).length;

  const pendingInBags = Array.from(runtime.wave.spawnBags.values()).reduce(
    (sum, bag) => sum + bag.enemyRuntimeIds.length,
    0,
  );

  const pendingInSubWaves = runtime.wave.pendingSubWaves.reduce(
    (sum, subWave) =>
      sum + Object.values(subWave.enemies).reduce((a, b) => a + b, 0),
    0,
  );

  return livingEnemies + pendingInBags + pendingInSubWaves;
}

export function createInitialCombatWaveState(): CombatRuntime['wave'] {
  const initialWave = CombatWaveConfig.WAVES[0];

  return {
    currentWaveIndex: 0,
    totalWaves: CombatWaveConfig.WAVES.length,
    currentWaveId: initialWave?.id ?? null,
    activeSubWaves: [],
    pendingSubWaves: [...(initialWave?.subWaves ?? [])],
    spawnBags: new Map(),
    enemiesRemaining: countWaveEnemies(initialWave),
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
    Array.from(spawnBags.values()).flatMap((bag) => bag.enemyRuntimeIds),
  );

  const enemyRuntimeIds: string[] = Object.entries(subWave.enemies).flatMap(
    ([definitionId, count]) => {
      const matchingEnemies = runtime.enemies.filter(
        (enemy) =>
          enemy.definitionId === definitionId
          && !enemy.spawned
          && !alreadyAllocatedIds.has(enemy.runtimeId),
      );

      for (const enemy of matchingEnemies.slice(0, count)) {
        alreadyAllocatedIds.add(enemy.runtimeId);
      }

      return matchingEnemies.slice(0, count).map((enemy) => enemy.runtimeId);
    },
  );

  spawnBags.set(subWave.id, {
    enemyRuntimeIds: shuffleArray(enemyRuntimeIds, random),
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

function countWaveEnemies(wave: CombatWaveDefinition | undefined): number {
  return (wave?.subWaves ?? []).reduce(
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
