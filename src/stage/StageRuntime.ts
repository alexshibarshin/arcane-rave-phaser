import { StageFlowConfig } from '@config/StageFlowConfig';
import {
  drawStageShopOffers,
  createStageBuildState,
  moveStagePawn,
  purchaseStagePawn,
  type StageBuildState,
} from './StageBuild';

export type StagePhase = 'build' | 'combat' | 'stage_complete' | 'stage_failed';
export type StageCombatOutcome = 'victory' | 'defeat';

export interface StageRuntime {
  phase: StagePhase;
  currentWaveIndex: number;
  totalWaves: number;
  coins: number;
  lastCombatOutcome: StageCombatOutcome | null;
  build: StageBuildState;
}

export interface CreateStageRuntimeOptions {
  totalWaves: number;
  initialCoins: number;
}

export interface ResolveStageCombatOutcomeOptions {
  outcome: StageCombatOutcome;
  rewardCoins: number;
  random?: () => number;
}

export function createStageRuntime(
  options: CreateStageRuntimeOptions,
  random: () => number = Math.random,
): StageRuntime {
  const totalWaves = Math.max(0, options.totalWaves);
  const initialCoins = Math.max(0, options.initialCoins);

  return {
    phase: totalWaves > 0 ? 'build' : 'stage_complete',
    currentWaveIndex: 0,
    totalWaves,
    coins: initialCoins,
    lastCombatOutcome: null,
    build: createStageBuildState(random),
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
  runtime.build.shopOffers = drawStageShopOffers(options.random ?? Math.random);
  return runtime.phase;
}

export function purchaseStagePawnIntoSlot(
  runtime: StageRuntime,
  offerIndex: number,
  slotIndex: number,
): boolean {
  const purchased = purchaseStagePawn(runtime.build, runtime.coins, offerIndex, slotIndex);

  if (!purchased) {
    return false;
  }

  runtime.coins -= StageFlowConfig.SHOP_PURCHASE_COST;
  return true;
}

export function repositionStagePawn(
  runtime: StageRuntime,
  fromSlotIndex: number,
  toSlotIndex: number,
): boolean {
  const moved = moveStagePawn(runtime.build, runtime.coins, fromSlotIndex, toSlotIndex);

  if (!moved) {
    return false;
  }

  runtime.coins -= StageFlowConfig.REPOSITION_COST;
  return true;
}

export function getStageCombatLoadout(runtime: StageRuntime): Array<string | null> {
  return [...runtime.build.slots];
}
