import { StageFlowConfig } from '@config/StageFlowConfig';
import {
  drawStageShopOffers,
  createStageBuildState,
  getStageRerollCost,
  getStageBuildSlotPawnIds,
  mergeStagePawn,
  moveStagePawn,
  purchaseStagePawn,
  purchaseStagePawnMerge,
  rerollStageShop,
  type StageBuildState,
} from './StageBuild';
import type { CombatLoadoutSlot } from '@combat/CombatRuntime';

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
  runtime.build.rerollCount = 0;
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

export function purchaseStagePawnIntoMergeSlot(
  runtime: StageRuntime,
  offerIndex: number,
  slotIndex: number,
  random: () => number = Math.random,
): boolean {
  const merged = purchaseStagePawnMerge(runtime.build, runtime.coins, offerIndex, slotIndex, random);

  if (!merged) {
    return false;
  }

  runtime.coins -= StageFlowConfig.SHOP_PURCHASE_COST;
  grantStageMergeReward(runtime);
  return true;
}

export function mergeStagePawnSlots(
  runtime: StageRuntime,
  fromSlotIndex: number,
  toSlotIndex: number,
  random: () => number = Math.random,
): boolean {
  const merged = mergeStagePawn(runtime.build, fromSlotIndex, toSlotIndex, random);

  if (!merged) {
    return false;
  }

  grantStageMergeReward(runtime);
  return true;
}

export function getStageCombatLoadout(runtime: StageRuntime): Array<string | null> {
  return getStageBuildSlotPawnIds(runtime.build);
}

export function getStageCombatLoadoutSlots(runtime: StageRuntime): CombatLoadoutSlot[] {
  return runtime.build.slots.map((slot) => ({
    pawnId: slot?.pawnId ?? null,
    tier: slot?.tier ?? null,
  }));
}

export function getStageCombatLoadoutTiers(runtime: StageRuntime): Array<number | null> {
  return runtime.build.slots.map((slot) => slot?.tier ?? null);
}

export function getStageShopRerollCost(runtime: StageRuntime): number {
  return getStageRerollCost(runtime.build);
}

export function rerollStageShopOffers(
  runtime: StageRuntime,
  random: () => number = Math.random,
): boolean {
  const rerollCost = getStageShopRerollCost(runtime);
  const rerolled = rerollStageShop(runtime.build, runtime.coins, random);

  if (!rerolled) {
    return false;
  }

  runtime.coins -= rerollCost;
  return true;
}

function grantStageMergeReward(runtime: StageRuntime): void {
  if (StageFlowConfig.MERGE_REWARD_COINS <= 0) {
    return;
  }

  runtime.coins += StageFlowConfig.MERGE_REWARD_COINS;
}
