import { describe, expect, it } from 'vitest';
import {
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

function makeStageConfig(overrides: Partial<StageConfig>): StageConfig {
  const base = STAGE_CONFIGS[0]!;
  return {
    id: base.id,
    displayName: base.displayName,
    totalWaves: base.totalWaves,
    initialCoins: base.initialCoins,
    waveDefinitions: base.waveDefinitions,
    slotModifierCountWeights: base.slotModifierCountWeights,
    slotModifierWeightOverrides: base.slotModifierWeightOverrides,
    ...overrides,
  };
}

describe('StageRuntime', () => {
  it('creates a build-phase runtime for authored stages', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 3, initialCoins: 6 }), () => 0);

    expect(runtime).toEqual({
      phase: 'build',
      currentWaveIndex: 0,
      totalWaves: 3,
      coins: 6,
      chrono: {
        current: CombatTimeControlConfig.CHRONO_START,
        max: CombatTimeControlConfig.CHRONO_MAX,
      },
      lastCombatOutcome: null,
      build: {
        slots: Array(8).fill(null),
        shopOffers: [
          'ruby-needle',
          'ruby-needle',
          'ruby-needle',
        ],
        shopPurchaseCounts: {},
        rerollCount: 0,
      },
      slotModifiers: [],
    });
    expect(canStageStartWave(runtime)).toBe(true);
  });

  it('starts combat only from build phase with a valid next wave', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }));

    expect(requestStageWaveStart(runtime)).toBe(true);
    expect(runtime.phase).toBe('combat');
    expect(requestStageWaveStart(runtime)).toBe(false);
  });

  it('returns to build, increments wave, and grants reward after non-final victory', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), () => 0);
    purchaseStagePawnIntoSlot(runtime, 0, 0);
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'victory',
      rewardCoins: 3,
      chronoRemaining: 41,
      random: () => 0.5,
    });

    expect(nextPhase).toBe('build');
    expect(runtime.currentWaveIndex).toBe(1);
    expect(runtime.coins).toBe(4);
    expect(runtime.chrono.current).toBe(
      Math.min(CombatTimeControlConfig.CHRONO_MAX, 41 + CombatTimeControlConfig.CHRONO_WAVE_RECOVERY),
    );
    expect(runtime.lastCombatOutcome).toBe('victory');
    expect(runtime.build.slots[0]).toEqual({ pawnId: 'ruby-needle', tier: 1 });
    expect(runtime.build.shopOffers).toEqual([
      'thorn-fan',
      'thorn-fan',
      'thorn-fan',
    ]);
    expect(canStageStartWave(runtime)).toBe(true);
  });

  it('uses the current build slots as the combat loadout', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), () => 0);
    purchaseStagePawnIntoSlot(runtime, 0, 0);

    expect(getStageCombatLoadout(runtime)[0]).toBe('ruby-needle');
    expect(getStageCombatLoadout(runtime).slice(1).every((slot) => slot === null)).toBe(true);
  });

  it('keeps merged pawn tiers aligned with pawn ids in the combat loadout snapshot', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 12 }), () => 0);

    purchaseStagePawnIntoSlot(runtime, 0, 0);
    purchaseStagePawnIntoSlot(runtime, 0, 1);
    expect(mergeStagePawnSlots(runtime, 0, 1, () => 0.5)).toBe(true);

    expect(runtime.build.slots[1]).toEqual({ pawnId: 'thorn-fan', tier: 2 });
    expect(runtime.coins).toBe(6);
    expect(getStageCombatLoadout(runtime)[1]).toBe('thorn-fan');
    expect(getStageCombatLoadoutSlots(runtime)[1]).toEqual({
      pawnId: 'thorn-fan',
      tier: 2,
    });
  });

  it('grants merge reward coins when buying a matching pawn from the shop into a merge', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 10 }), () => 0);

    purchaseStagePawnIntoSlot(runtime, 0, 0);

    expect(purchaseStagePawnIntoMergeSlot(runtime, 0, 0, () => 0.5)).toBe(true);
    expect(runtime.coins).toBe(4);
    expect(runtime.build.slots[0]).toEqual({ pawnId: 'thorn-fan', tier: 2 });
  });

  it('disables merge reward coins when the config value is set to zero', () => {
    const originalReward = StageFlowConfig.MERGE_REWARD_COINS;
    (StageFlowConfig as { MERGE_REWARD_COINS: number }).MERGE_REWARD_COINS = 0;

    try {
      const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 12 }), () => 0);

      purchaseStagePawnIntoSlot(runtime, 0, 0);
      purchaseStagePawnIntoSlot(runtime, 0, 1);

      expect(mergeStagePawnSlots(runtime, 0, 1, () => 0.5)).toBe(true);
      expect(runtime.coins).toBe(2);
    } finally {
      (StageFlowConfig as { MERGE_REWARD_COINS: number }).MERGE_REWARD_COINS = originalReward;
    }
  });

  it('rerolls the shop, spends coins, and increases reroll cost inside the build phase', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }), () => 0);

    expect(getStageShopRerollCost(runtime)).toBe(1);
    expect(rerollStageShopOffers(runtime, () => 0.5)).toBe(true);
    expect(runtime.coins).toBe(5);
    expect(runtime.build.shopOffers).toEqual([
      'thorn-fan',
      'thorn-fan',
      'thorn-fan',
    ]);
    expect(runtime.build.rerollCount).toBe(1);
    expect(getStageShopRerollCost(runtime)).toBe(2);
  });

  it('completes the stage after final-wave victory', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 1, initialCoins: 6 }));
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'victory',
      rewardCoins: 3,
      chronoRemaining: CombatTimeControlConfig.CHRONO_MAX,
    });

    expect(nextPhase).toBe('stage_complete');
    expect(runtime.phase).toBe('stage_complete');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBe(9);
    expect(runtime.chrono.current).toBe(CombatTimeControlConfig.CHRONO_MAX);
    expect(canStageStartWave(runtime)).toBe(false);
  });

  it('fails the stage on defeat without granting reward', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: 6 }));
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'defeat',
      rewardCoins: 3,
      chronoRemaining: 12,
    });

    expect(nextPhase).toBe('stage_failed');
    expect(runtime.phase).toBe('stage_failed');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBe(6);
    expect(runtime.chrono.current).toBe(
      Math.min(CombatTimeControlConfig.CHRONO_MAX, 12 + CombatTimeControlConfig.CHRONO_WAVE_RECOVERY),
    );
    expect(runtime.lastCombatOutcome).toBe('defeat');
    expect(canStageStartWave(runtime)).toBe(false);
  });
});
