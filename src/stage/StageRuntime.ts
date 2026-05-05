export type StagePhase = 'build' | 'combat' | 'stage_complete' | 'stage_failed';
export type StageCombatOutcome = 'victory' | 'defeat';

export interface StageRuntime {
  phase: StagePhase;
  currentWaveIndex: number;
  totalWaves: number;
  coins: number;
  lastCombatOutcome: StageCombatOutcome | null;
}

export interface CreateStageRuntimeOptions {
  totalWaves: number;
  initialCoins: number;
}

export interface ResolveStageCombatOutcomeOptions {
  outcome: StageCombatOutcome;
  rewardCoins: number;
}

export function createStageRuntime(options: CreateStageRuntimeOptions): StageRuntime {
  const totalWaves = Math.max(0, options.totalWaves);
  const initialCoins = Math.max(0, options.initialCoins);

  return {
    phase: totalWaves > 0 ? 'build' : 'stage_complete',
    currentWaveIndex: 0,
    totalWaves,
    coins: initialCoins,
    lastCombatOutcome: null,
  };
}

export function canStageStartWave(runtime: StageRuntime): boolean {
  return runtime.phase === 'build' && runtime.currentWaveIndex < runtime.totalWaves;
}

export function requestStageWaveStart(runtime: StageRuntime): boolean {
  if (!canStageStartWave(runtime)) {
    return false;
  }

  runtime.phase = 'combat';
  runtime.lastCombatOutcome = null;
  return true;
}

export function resolveStageCombatOutcome(
  runtime: StageRuntime,
  options: ResolveStageCombatOutcomeOptions,
): StagePhase {
  runtime.lastCombatOutcome = options.outcome;

  if (runtime.phase !== 'combat') {
    return runtime.phase;
  }

  if (options.outcome === 'defeat') {
    runtime.phase = 'stage_failed';
    return runtime.phase;
  }

  runtime.coins += Math.max(0, options.rewardCoins);

  if (runtime.currentWaveIndex + 1 >= runtime.totalWaves) {
    runtime.phase = 'stage_complete';
    return runtime.phase;
  }

  runtime.currentWaveIndex += 1;
  runtime.phase = 'build';
  return runtime.phase;
}
