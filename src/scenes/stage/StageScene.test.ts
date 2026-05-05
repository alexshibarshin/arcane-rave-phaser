import { describe, expect, it } from 'vitest';
import {
  canStageStartWave,
  createStageRuntime,
  requestStageWaveStart,
  resolveStageCombatOutcome,
} from '@stage/StageRuntime';

describe('StageRuntime', () => {
  it('creates a build-phase runtime for authored stages', () => {
    const runtime = createStageRuntime({ totalWaves: 3, initialCoins: 6 });

    expect(runtime).toEqual({
      phase: 'build',
      currentWaveIndex: 0,
      totalWaves: 3,
      coins: 6,
      lastCombatOutcome: null,
    });
    expect(canStageStartWave(runtime)).toBe(true);
  });

  it('starts combat only from build phase with a valid next wave', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: 6 });

    expect(requestStageWaveStart(runtime)).toBe(true);
    expect(runtime.phase).toBe('combat');
    expect(requestStageWaveStart(runtime)).toBe(false);
  });

  it('returns to build, increments wave, and grants reward after non-final victory', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: 6 });
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'victory',
      rewardCoins: 3,
    });

    expect(nextPhase).toBe('build');
    expect(runtime.currentWaveIndex).toBe(1);
    expect(runtime.coins).toBe(9);
    expect(runtime.lastCombatOutcome).toBe('victory');
    expect(canStageStartWave(runtime)).toBe(true);
  });

  it('completes the stage after final-wave victory', () => {
    const runtime = createStageRuntime({ totalWaves: 1, initialCoins: 6 });
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'victory',
      rewardCoins: 3,
    });

    expect(nextPhase).toBe('stage_complete');
    expect(runtime.phase).toBe('stage_complete');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBe(9);
    expect(canStageStartWave(runtime)).toBe(false);
  });

  it('fails the stage on defeat without granting reward', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: 6 });
    requestStageWaveStart(runtime);

    const nextPhase = resolveStageCombatOutcome(runtime, {
      outcome: 'defeat',
      rewardCoins: 3,
    });

    expect(nextPhase).toBe('stage_failed');
    expect(runtime.phase).toBe('stage_failed');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBe(6);
    expect(runtime.lastCombatOutcome).toBe('defeat');
    expect(canStageStartWave(runtime)).toBe(false);
  });
});
