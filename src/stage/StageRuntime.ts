import { CombatTimeControlConfig } from '@config/CombatTimeControlConfig';
import { CombatContentConfig, getCombatDefaultPawnDeckIds } from '@config/CombatContentConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import type { StageConfig, SubWaveDefinition } from '@config/StageConfig';
import { getCombatPawnDefinitionById, getEnemyDefinitionById } from '@config/CombatContentConfig';
import { SLOT_MODIFIER_CONFIG } from '@config/SlotModifierConfig';
import {
  applyPurchasedStagePawnMergeResult,
  applyStagePawnMergeResult,
  canMergeStagePawnPair,
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
import { RandomMergeStrategy, type MergeStrategy } from './MergeStrategy';
import { generateStageSlotModifiers, type SlotModifierAssignment } from '@modifiers/SlotModifierAssignment';
import type { CombatLoadoutSlot } from '@combat/CombatRuntime';

export type StagePhase = 'build' | 'combat' | 'stage_complete' | 'stage_failed';
export type StageCombatOutcome = 'victory' | 'defeat';
export type StageMergeAttemptResult = 'applied' | 'pending' | 'failed';

export interface PendingStageMerge {
  source: 'slots' | 'shop';
  targetSlotIndex: number;
  fromSlotIndex?: number;
  offerIndex?: number;
  choices: Array<{ pawnId: string; tier: number }>;
}

export interface StageRuntime {
  activeDeckIds: string[];
  phase: StagePhase;
  currentWaveIndex: number;
  totalWaves: number;
  coins: number;
  chrono: {
    current: number;
    max: number;
  };
  lastCombatOutcome: StageCombatOutcome | null;
  build: StageBuildState;
  slotModifiers: SlotModifierAssignment[];
  stageConfig: StageConfig;
  mergeStrategy: MergeStrategy;
  pendingMerge: PendingStageMerge | null;
}

export interface ResolveStageCombatOutcomeOptions {
  outcome: StageCombatOutcome;
  rewardCoins: number;
  chronoRemaining: number;
  random?: () => number;
}

export function createStageRuntime(
  stageConfig: StageConfig,
  activeDeckIds: readonly string[] = getCombatDefaultPawnDeckIds(),
  mergeStrategy?: MergeStrategy,
  random: () => number = Math.random,
): StageRuntime {
  const totalWaves = Math.max(0, stageConfig.totalWaves);
  const initialCoins = Math.max(0, stageConfig.initialCoins);
  const normalizedDeckIds = normalizeStageActiveDeckIds(activeDeckIds);

  return {
    activeDeckIds: normalizedDeckIds,
    phase: totalWaves > 0 ? 'build' : 'stage_complete',
    currentWaveIndex: 0,
    totalWaves,
    coins: initialCoins,
    chrono: {
      current: CombatTimeControlConfig.CHRONO_START,
      max: CombatTimeControlConfig.CHRONO_MAX,
    },
    lastCombatOutcome: null,
    build: createStageBuildState(normalizedDeckIds, random),
    slotModifiers: generateStageSlotModifiers(
      random,
      stageConfig,
      SLOT_MODIFIER_CONFIG.modifiers,
    ),
    stageConfig,
    mergeStrategy: mergeStrategy ?? new RandomMergeStrategy(),
    pendingMerge: null,
  };
}

export function canStageStartWave(runtime: StageRuntime): boolean {
  return runtime.phase === 'build' && runtime.currentWaveIndex < runtime.totalWaves && runtime.pendingMerge === null;
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
  runtime.chrono.current = clampChrono(
    options.chronoRemaining + CombatTimeControlConfig.CHRONO_WAVE_RECOVERY,
    runtime.chrono.max,
  );

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
  runtime.build.shopOffers = drawStageShopOffers(runtime.activeDeckIds, options.random ?? Math.random);
  runtime.build.rerollCount = 0;
  runtime.pendingMerge = null;
  return runtime.phase;
}

export function purchaseStagePawnIntoSlot(
  runtime: StageRuntime,
  offerIndex: number,
  slotIndex: number,
): boolean {
  const offerPawnId = runtime.build.shopOffers[offerIndex];
  if (!offerPawnId) {
    return false;
  }

  const price = getCombatPawnDefinitionById(offerPawnId)?.shopPrice ?? StageFlowConfig.SHOP_PURCHASE_COST;
  const purchased = purchaseStagePawn(runtime.build, runtime.coins, offerIndex, slotIndex, price);

  if (!purchased) {
    return false;
  }

  runtime.coins -= price;
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
  return attemptPurchaseStagePawnIntoMergeSlot(runtime, offerIndex, slotIndex, random) === 'applied';
}

export function attemptPurchaseStagePawnIntoMergeSlot(
  runtime: StageRuntime,
  offerIndex: number,
  slotIndex: number,
  random: () => number = Math.random,
): StageMergeAttemptResult {
  if (runtime.pendingMerge !== null || runtime.phase !== 'build') {
    return 'failed';
  }

  const offerPawnId = runtime.build.shopOffers[offerIndex];
  if (!offerPawnId) {
    return 'failed';
  }

  const price = getCombatPawnDefinitionById(offerPawnId)?.shopPrice ?? StageFlowConfig.SHOP_PURCHASE_COST;
  const targetPawn = runtime.build.slots[slotIndex];
  const purchasedPawn = { pawnId: offerPawnId, tier: 1 };
  if (runtime.coins < price || !canMergeStagePawnPair(purchasedPawn, targetPawn)) {
    return 'failed';
  }
  if (!targetPawn) {
    return 'failed';
  }

  const result = runtime.mergeStrategy.tryResolve(targetPawn.pawnId, targetPawn.tier, runtime.activeDeckIds, random);
  if (result) {
    applyPurchasedStagePawnMergeResult(runtime.build, offerIndex, slotIndex, result);
    runtime.coins -= price;
    grantStageMergeReward(runtime);
    return 'applied';
  }

  const choices = runtime.mergeStrategy.getChoices(targetPawn.pawnId, targetPawn.tier, runtime.activeDeckIds, random);
  if (choices.length === 0) {
    return 'failed';
  }

  runtime.pendingMerge = {
    source: 'shop',
    offerIndex,
    targetSlotIndex: slotIndex,
    choices,
  };
  return 'pending';
}

export function mergeStagePawnSlots(
  runtime: StageRuntime,
  fromSlotIndex: number,
  toSlotIndex: number,
  random: () => number = Math.random,
): boolean {
  return attemptMergeStagePawnSlots(runtime, fromSlotIndex, toSlotIndex, random) === 'applied';
}

export function attemptMergeStagePawnSlots(
  runtime: StageRuntime,
  fromSlotIndex: number,
  toSlotIndex: number,
  random: () => number = Math.random,
): StageMergeAttemptResult {
  if (runtime.pendingMerge !== null || runtime.phase !== 'build') {
    return 'failed';
  }

  const fromPawn = runtime.build.slots[fromSlotIndex];
  const toPawn = runtime.build.slots[toSlotIndex];
  if (!canMergeStagePawnPair(fromPawn, toPawn)) {
    return 'failed';
  }
  if (!toPawn) {
    return 'failed';
  }

  const result = runtime.mergeStrategy.tryResolve(toPawn.pawnId, toPawn.tier, runtime.activeDeckIds, random);
  if (result) {
    applyStagePawnMergeResult(runtime.build, fromSlotIndex, toSlotIndex, result);
    grantStageMergeReward(runtime);
    return 'applied';
  }

  const choices = runtime.mergeStrategy.getChoices(toPawn.pawnId, toPawn.tier, runtime.activeDeckIds, random);
  if (choices.length === 0) {
    return 'failed';
  }

  runtime.pendingMerge = {
    source: 'slots',
    fromSlotIndex,
    targetSlotIndex: toSlotIndex,
    choices,
  };
  return 'pending';
}

export function confirmPendingStageMerge(
  runtime: StageRuntime,
  choiceIndex: number,
): boolean {
  const pendingMerge = runtime.pendingMerge;
  if (!pendingMerge) {
    return false;
  }

  const result = pendingMerge.choices[choiceIndex];
  if (!result) {
    return false;
  }

  if (pendingMerge.source === 'slots') {
    const fromSlotIndex = pendingMerge.fromSlotIndex;
    if (fromSlotIndex === undefined) {
      return false;
    }
    applyStagePawnMergeResult(runtime.build, fromSlotIndex, pendingMerge.targetSlotIndex, result);
  } else {
    const offerIndex = pendingMerge.offerIndex;
    if (offerIndex === undefined) {
      return false;
    }
    const offerPawnId = runtime.build.shopOffers[offerIndex];
    if (!offerPawnId) {
      return false;
    }
    const price = getCombatPawnDefinitionById(offerPawnId)?.shopPrice ?? StageFlowConfig.SHOP_PURCHASE_COST;
    if (runtime.coins < price) {
      return false;
    }
    applyPurchasedStagePawnMergeResult(runtime.build, offerIndex, pendingMerge.targetSlotIndex, result);
    runtime.coins -= price;
  }

  runtime.pendingMerge = null;
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

export function getStageSlotModifiers(runtime: StageRuntime): SlotModifierAssignment[] {
  return runtime.slotModifiers;
}

export function getStageShopRerollCost(runtime: StageRuntime): number {
  return getStageRerollCost(runtime.build);
}

export function sellStagePawnFromSlot(
  runtime: StageRuntime,
  slotIndex: number,
): boolean {
  if (runtime.phase !== 'build' || runtime.pendingMerge !== null) {
    return false;
  }

  const slot = runtime.build.slots[slotIndex];
  if (!slot) {
    return false;
  }

  const pawnDef = getCombatPawnDefinitionById(slot.pawnId);
  if (!pawnDef) {
    return false;
  }

  const shopPrice = pawnDef.shopPrice;
  const tier = slot.tier;
  const fairPrice = shopPrice * Math.pow(2, tier - 1);
  const sellPrice = Math.ceil(fairPrice * StageFlowConfig.SELL_RATIO);

  runtime.build.slots[slotIndex] = null;
  runtime.coins += sellPrice;
  return true;
}

export function rerollStageShopOffers(
  runtime: StageRuntime,
  random: () => number = Math.random,
): boolean {
  if (runtime.pendingMerge !== null || runtime.phase !== 'build') {
    return false;
  }

  const rerollCost = getStageShopRerollCost(runtime);
  const rerolled = rerollStageShop(runtime.build, runtime.activeDeckIds, runtime.coins, random);

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

function normalizeStageActiveDeckIds(activeDeckIds: readonly string[]): string[] {
  if (activeDeckIds.length !== CombatContentConfig.SLOT_COUNT) {
    throw new Error(`Stage runtime requires exactly ${CombatContentConfig.SLOT_COUNT} active deck ids.`);
  }

  const knownPawnIds = new Set(CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => pawn.id));
  const uniqueDeckIds = new Set<string>();

  for (const pawnId of activeDeckIds) {
    if (!knownPawnIds.has(pawnId)) {
      throw new Error(`Stage runtime deck references unknown pawn "${pawnId}".`);
    }
    if (uniqueDeckIds.has(pawnId)) {
      throw new Error(`Stage runtime deck references duplicate pawn "${pawnId}".`);
    }
    uniqueDeckIds.add(pawnId);
  }

  return [...activeDeckIds];
}

function clampChrono(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

export interface StageWaveEnemyPayload {
  subWaves: SubWaveDefinition[];
  enemyStatOverrides: Record<string, { maxHp: number }>;
}

export function buildStageWaveEnemyPayload(
  stageConfig: StageConfig,
  waveIndex: number,
): StageWaveEnemyPayload {
  const waves = stageConfig.waves;
  const wave = waves ? waves[waveIndex] : undefined;

  if (!wave) {
    return { subWaves: [], enemyStatOverrides: {} };
  }

  const multiplier = stageConfig.hpMultipliers?.[waveIndex] ?? 1.0;
  const overrides: Record<string, { maxHp: number }> = {};

  for (const subWave of wave.subWaves) {
    for (const enemyId of Object.keys(subWave.enemies)) {
      if (overrides[enemyId] !== undefined) {
        continue; // already computed
      }

      const definition = getEnemyDefinitionById(enemyId);
      if (!definition) {
        throw new Error(
          `Unknown enemy ID "${enemyId}" in wave ${waveIndex} of stage "${stageConfig.id}"`,
        );
      }

      overrides[enemyId] = {
        maxHp: Math.round(definition.maxHp * multiplier),
      };
    }
  }

  return {
    subWaves: [...wave.subWaves],
    enemyStatOverrides: overrides,
  };
}
