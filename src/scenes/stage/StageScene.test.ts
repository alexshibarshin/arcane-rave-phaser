import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import {
  attemptMergeStagePawnSlots,
  attemptPurchaseStagePawnIntoMergeSlot,
  confirmPendingStageMerge,
  canStageStartWave,
  createStageRuntime,
  getStageCombatLoadout,
  getStageCombatLoadoutSlots,
  getStageShopRerollCost,
  mergeStagePawnSlots,
  purchaseStagePawnIntoMergeSlot,
  purchaseStagePawnIntoSlot,
  rerollStageShopOffers,
  requestStageWaveStart,
  resolveStageCombatOutcome,
} from '@stage/StageRuntime';
import { STAGE_CONFIGS, type StageConfig } from '@config/StageConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { CombatTimeControlConfig } from '@config/CombatTimeControlConfig';
import { ChooseMergeStrategy } from '@stage/MergeStrategy';

function makeStageConfig(overrides: Partial<StageConfig>): StageConfig {
  const base = STAGE_CONFIGS[0]!;
  return {
    id: base.id,
    displayName: base.displayName,
    totalWaves: base.totalWaves,
    initialCoins: base.initialCoins,
    slotModifierCountWeights: base.slotModifierCountWeights,
    slotModifierWeightOverrides: base.slotModifierWeightOverrides,
    ...overrides,
  };
}

describe('StageRuntime', () => {
  const defaultDeckIds = CombatContentConfig.ACTIVE_PAWN_DECK_IDS;

  it('creates a build-phase runtime for authored stages', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 3, initialCoins: 6 }), defaultDeckIds, undefined, () => 0);

    expect(runtime.phase).toBe('build');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.totalWaves).toBe(3);
    expect(runtime.coins).toBe(6);
    expect(runtime.chrono.current).toBeGreaterThan(0);
    expect(runtime.chrono.max).toBeGreaterThan(0);
    expect(runtime.lastCombatOutcome).toBeNull();
    expect(runtime.build.slots).toHaveLength(8);
    expect(runtime.build.slots.every((slot) => slot === null)).toBe(true);
    expect(runtime.build.shopOffers.length).toBeGreaterThan(0);
    expect(runtime.build.shopPurchaseCounts).toEqual({});
    expect(runtime.build.rerollCount).toBe(0);
    expect(runtime.slotModifiers).toEqual([]);
    expect(runtime.pendingMerge).toBeNull();
    expect(canStageStartWave(runtime)).toBe(true);
  });

  it('starts combat only from build phase with a valid next wave', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), defaultDeckIds);

    expect(requestStageWaveStart(runtime)).toBe(true);
    expect(runtime.phase).toBe('combat');
    expect(requestStageWaveStart(runtime)).toBe(false);
  });

  it('returns to build, increments wave, and grants reward after non-final victory', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), defaultDeckIds, undefined, () => 0);
    purchaseStagePawnIntoSlot(runtime, 0, 0);
    const coinsBeforeCombat = runtime.coins;
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'victory',
      rewardCoins: 3,
      chronoRemaining: 41,
      random: () => 0.5,
    });

    expect(nextPhase).toBe('build');
    expect(runtime.currentWaveIndex).toBe(1);
    expect(runtime.coins).toBeGreaterThan(coinsBeforeCombat - 3);
    expect(runtime.chrono.current).toBeGreaterThan(0);
    expect(runtime.chrono.current).toBeLessThanOrEqual(CombatTimeControlConfig.CHRONO_MAX);
    expect(runtime.lastCombatOutcome).toBe('victory');
    expect(runtime.build.slots[0]?.pawnId).toBeTruthy();
    expect(runtime.build.slots[0]?.tier).toBeGreaterThanOrEqual(1);
    expect(runtime.build.shopOffers.length).toBeGreaterThan(0);
    expect(canStageStartWave(runtime)).toBe(true);
  });

  it('uses the current build slots as the combat loadout', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), defaultDeckIds, undefined, () => 0);
    purchaseStagePawnIntoSlot(runtime, 0, 0);

    expect(typeof getStageCombatLoadout(runtime)[0]).toBe('string');
    expect(getStageCombatLoadout(runtime).slice(1).every((slot) => slot === null)).toBe(true);
  });

  it('keeps merged pawn tiers aligned with pawn ids in the combat loadout snapshot', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 12 }), defaultDeckIds, undefined, () => 0);

    purchaseStagePawnIntoSlot(runtime, 0, 0);
    purchaseStagePawnIntoSlot(runtime, 0, 1);
    expect(mergeStagePawnSlots(runtime, 0, 1, () => 0.5)).toBe(true);

    expect(runtime.build.slots[1]?.tier).toBe(2);
    expect(typeof runtime.build.slots[1]?.pawnId).toBe('string');
    expect(runtime.coins).toBeGreaterThanOrEqual(0);
    expect(typeof getStageCombatLoadout(runtime)[1]).toBe('string');
    expect(getStageCombatLoadoutSlots(runtime)[1]?.tier).toBe(2);
    expect(typeof getStageCombatLoadoutSlots(runtime)[1]?.pawnId).toBe('string');
  });

  it('grants merge reward coins when buying a matching pawn from the shop into a merge', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 10 }), defaultDeckIds, undefined, () => 0);

    purchaseStagePawnIntoSlot(runtime, 0, 0);
    const coinsBeforeMerge = runtime.coins;

    expect(purchaseStagePawnIntoMergeSlot(runtime, 0, 0, () => 0.5)).toBe(true);
    expect(runtime.coins).toBeLessThan(coinsBeforeMerge);
    expect(runtime.build.slots[0]?.tier).toBe(2);
    expect(typeof runtime.build.slots[0]?.pawnId).toBe('string');
  });

  it('creates a pending slot merge for choose strategy and resolves it on selection', () => {
    const runtime = createStageRuntime(
      makeStageConfig({ totalWaves: 2, initialCoins: 12 }),
      defaultDeckIds,
      new ChooseMergeStrategy(),
      () => 0,
    );

    purchaseStagePawnIntoSlot(runtime, 0, 0);
    purchaseStagePawnIntoSlot(runtime, 0, 1);

    expect(attemptMergeStagePawnSlots(runtime, 0, 1, () => 0)).toBe('pending');
    expect(runtime.pendingMerge?.source).toBe('slots');
    expect(runtime.pendingMerge?.choices).toHaveLength(3);
    expect(runtime.build.slots[0]?.pawnId).toBe('ruby-needle');
    expect(canStageStartWave(runtime)).toBe(false);

    const chosenResult = runtime.pendingMerge!.choices[1]!;
    expect(confirmPendingStageMerge(runtime, 1)).toBe(true);
    expect(runtime.pendingMerge).toBeNull();
    expect(runtime.build.slots[0]).toBeNull();
    expect(runtime.build.slots[1]?.tier).toBe(2);
    expect(runtime.build.slots[1]?.pawnId).toBe(chosenResult.pawnId);
  });

  it('creates a pending shop merge for choose strategy and only spends coins after choice confirmation', () => {
    const runtime = createStageRuntime(
      makeStageConfig({ totalWaves: 2, initialCoins: 10 }),
      defaultDeckIds,
      new ChooseMergeStrategy(),
      () => 0,
    );

    purchaseStagePawnIntoSlot(runtime, 0, 0);
    const coinsBeforePendingMerge = runtime.coins;

    expect(attemptPurchaseStagePawnIntoMergeSlot(runtime, 0, 0, () => 0)).toBe('pending');
    expect(runtime.pendingMerge?.source).toBe('shop');
    expect(runtime.coins).toBe(coinsBeforePendingMerge);
    expect(runtime.build.shopOffers).toEqual(['ruby-needle', 'ruby-needle']);

    const chosenResult = runtime.pendingMerge!.choices[2]!;
    expect(confirmPendingStageMerge(runtime, 2)).toBe(true);
    expect(runtime.pendingMerge).toBeNull();
    expect(runtime.coins).toBeLessThan(coinsBeforePendingMerge);
    expect(runtime.build.shopOffers).toEqual(['ruby-needle']);
    expect(runtime.build.slots[0]?.tier).toBe(2);
    expect(runtime.build.slots[0]?.pawnId).toBe(chosenResult.pawnId);
  });

  it('disables merge reward coins when the config value is set to zero', () => {
    const originalReward = StageFlowConfig.MERGE_REWARD_COINS;
    (StageFlowConfig as { MERGE_REWARD_COINS: number }).MERGE_REWARD_COINS = 0;

    try {
      const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 12 }), defaultDeckIds, undefined, () => 0);

      purchaseStagePawnIntoSlot(runtime, 0, 0);
      purchaseStagePawnIntoSlot(runtime, 0, 1);
      const coinsBeforeMerge = runtime.coins;

      expect(mergeStagePawnSlots(runtime, 0, 1, () => 0.5)).toBe(true);
      expect(runtime.coins).toBe(coinsBeforeMerge);
    } finally {
      (StageFlowConfig as { MERGE_REWARD_COINS: number }).MERGE_REWARD_COINS = originalReward;
    }
  });

  it('rerolls the shop, spends coins, and increases reroll cost inside the build phase', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), defaultDeckIds, undefined, () => 0);

    const initialCost = getStageShopRerollCost(runtime);
    expect(initialCost).toBeGreaterThan(0);
    expect(rerollStageShopOffers(runtime, () => 0.5)).toBe(true);
    expect(runtime.coins).toBeLessThan(6);
    expect(runtime.build.shopOffers.length).toBeGreaterThan(0);
    expect(runtime.build.rerollCount).toBe(1);
    expect(getStageShopRerollCost(runtime)).toBeGreaterThan(initialCost);
  });

  it('completes the stage after final-wave victory', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 1, initialCoins: 6 }), defaultDeckIds);
    const coinsBeforeCombat = runtime.coins;
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'victory',
      rewardCoins: 3,
      chronoRemaining: CombatTimeControlConfig.CHRONO_MAX,
    });

    expect(nextPhase).toBe('stage_complete');
    expect(runtime.phase).toBe('stage_complete');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBeGreaterThan(coinsBeforeCombat);
    expect(runtime.chrono.current).toBeGreaterThan(0);
    expect(canStageStartWave(runtime)).toBe(false);
  });

  it('fails the stage on defeat without granting reward', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), defaultDeckIds);
    const coinsBeforeCombat = runtime.coins;
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'defeat',
      rewardCoins: 3,
      chronoRemaining: 12,
    });

    expect(nextPhase).toBe('stage_failed');
    expect(runtime.phase).toBe('stage_failed');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBe(coinsBeforeCombat);
    expect(runtime.chrono.current).toBeGreaterThan(0);
    expect(runtime.chrono.current).toBeLessThanOrEqual(CombatTimeControlConfig.CHRONO_MAX);
    expect(runtime.lastCombatOutcome).toBe('defeat');
    expect(canStageStartWave(runtime)).toBe(false);
  });

  it('uses the provided stage deck snapshot for shop offers instead of the config default deck', () => {
    const customDeckIds = [
      'lifebloom-scatter',
      'pulse-garden',
      'prism-volley',
      'pressure-burst',
      'ruby-needle',
      'bass-bomb',
      'heatline',
      'moss-patch',
    ];

    const runtime = createStageRuntime(
      makeStageConfig({ totalWaves: 2, initialCoins: 6 }),
      customDeckIds,
      undefined,
      () => 0,
    );

    expect(runtime.activeDeckIds).toEqual(customDeckIds);
    expect(runtime.build.shopOffers.every((pawnId) => pawnId === 'lifebloom-scatter')).toBe(true);
  });
});
