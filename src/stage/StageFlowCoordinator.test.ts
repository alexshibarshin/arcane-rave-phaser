import { describe, expect, it } from 'vitest';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { SceneKeys } from '@config/GameConfig';
import { createStageRuntime, requestStageWaveStart } from '@stage/StageRuntime';
import {
  createStageFlowCoordinationState,
  dispatchStageFlowIntent,
  type StageFlowCommand,
  type StageFlowCoordinationState,
} from '@stage/StageFlowCoordinator';

function getCommandTypes(commands: StageFlowCommand[]): string[] {
  return commands.map((command) => command.type);
}

describe('StageFlowCoordinator', () => {
  it('publishes the initial snapshot and build intro on stage initialization', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }, () => 0);
    const coordination = createStageFlowCoordinationState();

    const commands = dispatchStageFlowIntent(runtime, coordination, { type: 'stage:initialized' });

    expect(getCommandTypes(commands)).toEqual([
      'stage:publish-snapshot',
      'stage:play-build-phase-intro',
    ]);
    expect(commands[0]).toMatchObject({
      type: 'stage:publish-snapshot',
      payload: {
        phase: 'build',
        coins: StageFlowConfig.INITIAL_COINS,
        currentWave: 1,
        totalWaves: 2,
        canStartWave: true,
        previewTitle: 'Wave 1/2',
        previewBody: 'Enemies 6\nBlue x2, Green x1, Red x3',
      },
    });
    expect(commands[1]).toMatchObject({
      type: 'stage:play-build-phase-intro',
      payload: { fromCombat: false },
    });
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: false,
      pendingCombatLaunch: false,
      pendingBuildIntro: true,
    });
  });

  it('transitions into combat with a phase change, snapshot, outro, and launch command', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }, () => 0);
    const coordination = createStageFlowCoordinationState();

    const commands = dispatchStageFlowIntent(runtime, coordination, { type: 'stage:start-wave-requested' });

    expect(getCommandTypes(commands)).toEqual([
      'stage:publish-phase-changed',
      'stage:publish-snapshot',
      'stage:play-combat-phase-outro',
      'stage:launch-combat-phase',
    ]);
    expect(runtime.phase).toBe('combat');
    expect(runtime.lastCombatOutcome).toBeNull();
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: true,
      pendingCombatLaunch: true,
      pendingBuildIntro: false,
    });
    expect(commands[3]).toMatchObject({
      type: 'stage:launch-combat-phase',
      payload: {
        waveIndex: 0,
        totalWaves: 2,
        stageManaged: true,
        allowRestart: false,
        slotPawns: Array.from({ length: 8 }, () => ({ pawnId: null, tier: null })),
        slotPawnIds: Array(8).fill(null),
        slotPawnTiers: Array(8).fill(null),
      },
    });
  });

  it('resolves combat, stops combat scenes, refreshes build state, and reopens build intro after victory', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }, () => 0);
    const coordination = createStageFlowCoordinationState();
    requestStageWaveStart(runtime);

    const commands = dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-ended',
      outcome: 'victory',
    });

    expect(getCommandTypes(commands)).toEqual([
      'stage:stop-combat-phase-scenes',
      'stage:publish-phase-changed',
      'stage:refresh-build-phase',
      'stage:publish-snapshot',
      'stage:play-build-phase-intro',
    ]);
    expect(runtime.phase).toBe('build');
    expect(runtime.currentWaveIndex).toBe(1);
    expect(runtime.coins).toBe(StageFlowConfig.INITIAL_COINS + StageFlowConfig.WAVE_CLEAR_REWARD_COINS);
    expect(runtime.lastCombatOutcome).toBe('victory');
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: false,
      pendingCombatLaunch: false,
      pendingBuildIntro: true,
    });
    expect(commands[0]).toMatchObject({
      type: 'stage:stop-combat-phase-scenes',
      payload: { sceneKeys: [SceneKeys.HUD, SceneKeys.COMBAT] },
    });
    expect(commands[1]).toMatchObject({
      type: 'stage:publish-phase-changed',
      payload: { phase: 'build' },
    });
    expect(commands[4]).toMatchObject({
      type: 'stage:play-build-phase-intro',
      payload: { fromCombat: true },
    });
  });

  it('ignores invalid transition intents', () => {
    const runtime = createStageRuntime({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }, () => 0);
    const coordination = createStageFlowCoordinationState();

    coordination.isTransitioning = true;

    expect(
      dispatchStageFlowIntent(runtime, coordination, { type: 'stage:start-wave-requested' }),
    ).toEqual([]);
    expect(runtime.phase).toBe('build');
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: true,
      pendingCombatLaunch: false,
      pendingBuildIntro: false,
    });

    expect(
      dispatchStageFlowIntent(runtime, coordination, {
        type: 'stage:combat-ended',
        outcome: 'defeat',
      }),
    ).toEqual([]);
    expect(runtime.phase).toBe('build');
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: true,
      pendingCombatLaunch: false,
      pendingBuildIntro: false,
    });
  });
});
