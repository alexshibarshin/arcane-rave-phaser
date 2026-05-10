import { describe, expect, it } from 'vitest';
import { CombatTimeControlConfig } from '@config/CombatTimeControlConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { STAGE_CONFIGS, type StageConfig, type StageWaveDefinition } from '@config/StageConfig';
import { createStageRuntime, requestStageWaveStart } from '@stage/StageRuntime';
import {
  createStageFlowCoordinationState,
  dispatchStageFlowIntent,
  type StageFlowCommand,
  type StageFlowCoordinationState,
} from '@stage/StageFlowCoordinator';

function makeWaveDef(kind: StageWaveDefinition['kind'] = 'normal', tags: string[] = ['Red']): StageWaveDefinition {
  return {
    kind,
    tags,
    specialEnemyId: kind !== 'normal' ? 'iron-kick' : null,
    subWaves: [
      {
        id: 'sub-1',
        startTimeMs: 0,
        spawnIntervalMs: 800,
        enemies: { 'enemy-red-basic': 2 },
      },
    ],
  };
}

function makeStageConfig(overrides: Partial<StageConfig> = {}): StageConfig {
  const base = STAGE_CONFIGS[0]!;
  const totalWaves = overrides.totalWaves ?? base.totalWaves;
  return {
    id: base.id,
    displayName: base.displayName,
    totalWaves,
    initialCoins: base.initialCoins,
    slotModifierCountWeights: base.slotModifierCountWeights,
    slotModifierWeightOverrides: base.slotModifierWeightOverrides,
    waves: Array.from({ length: totalWaves }, (_, i) => makeWaveDef(i === totalWaves - 1 ? 'boss' : 'normal')),
    hpMultipliers: Array.from({ length: totalWaves }, () => 1.0),
    ...overrides,
  };
}

function getCommandTypes(commands: StageFlowCommand[]): string[] {
  return commands.map((command) => command.type);
}

describe('StageFlowCoordinator', () => {
  it('publishes the initial snapshot and build intro on stage initialization', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
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
        coins: expect.any(Number),
        currentWave: 1,
        totalWaves: 2,
        canStartWave: true,
        wavePreview: {
          waveNumber: 1,
          totalWaves: 2,
          waveKind: 'normal',
          tags: expect.any(Array),
          specialEnemyId: null,
          specialEnemyName: null,
        },
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
      pendingCombatResolution: null,
    });
  });

  it('transitions into combat with a phase change, snapshot, outro, and launch command', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
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
      pendingCombatResolution: null,
    });
    expect(commands[3]).toMatchObject({
      type: 'stage:launch-combat-phase',
      payload: {
        waveIndex: 0,
        totalWaves: 2,
        stageManaged: true,
        allowRestart: false,
        chronoCurrent: expect.any(Number),
        chronoMax: expect.any(Number),
        slotPawns: Array.from({ length: 8 }, () => ({ pawnId: null, tier: null })),
        slotPawnIds: Array(8).fill(null),
        slotPawnTiers: Array(8).fill(null),
        slotModifiers: runtime.slotModifiers,
        subWaves: [{ id: 'sub-1', startTimeMs: 0, spawnIntervalMs: 800, enemies: { 'enemy-red-basic': 2 } }],
        enemyStatOverrides: { 'enemy-red-basic': { maxHp: expect.any(Number) } },
      },
    });
  });

  it('queues a combat return transition after victory before resolving the build phase', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
    const coordination = createStageFlowCoordinationState();
    requestStageWaveStart(runtime);

    const commands = dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-ended',
      outcome: 'victory',
      chronoRemaining: 55,
      remainingBaseHp: 80,
    });

    expect(getCommandTypes(commands)).toEqual([
      'stage:play-combat-phase-return',
    ]);
    expect(
      coordination.pendingCombatResolution,
    ).toMatchObject({ outcome: 'victory', chronoRemaining: 55, remainingBaseHp: 80 });
    expect(runtime.phase).toBe('combat');
    expect(runtime.currentWaveIndex).toBe(0);
    expect(runtime.coins).toBeGreaterThan(0);
    expect(runtime.chrono.current).toBeGreaterThan(0);
    expect(runtime.lastCombatOutcome).toBeNull();
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: true,
      pendingCombatLaunch: false,
      pendingBuildIntro: false,
      pendingCombatResolution: {
        outcome: 'victory',
        chronoRemaining: 55,
        remainingBaseHp: 80,
      },
    });
    expect(commands[0]).toMatchObject({
      type: 'stage:play-combat-phase-return',
      payload: { outcome: 'victory' },
    });
  });

  it('resolves queued victory return into build once the combat return finishes', () => {
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
    const coordination = createStageFlowCoordinationState();
    requestStageWaveStart(runtime);
    dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-ended',
      outcome: 'victory',
      chronoRemaining: 55,
      remainingBaseHp: 80,
    });

    const commands = dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-return-finished',
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
    expect(runtime.coins).toBeGreaterThan(StageFlowConfig.INITIAL_COINS);
    expect(runtime.chrono.current).toBeGreaterThan(0);
    expect(runtime.chrono.current).toBeLessThanOrEqual(CombatTimeControlConfig.CHRONO_MAX);
    expect(runtime.lastCombatOutcome).toBe('victory');
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: false,
      pendingCombatLaunch: false,
      pendingBuildIntro: true,
      pendingCombatResolution: null,
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
    const runtime = createStageRuntime(makeStageConfig({ totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
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
      pendingCombatResolution: null,
    });

    expect(
      dispatchStageFlowIntent(runtime, coordination, {
        type: 'stage:combat-ended',
        outcome: 'defeat',
        chronoRemaining: 12,
        remainingBaseHp: 0,
      }),
    ).toEqual([]);
    expect(runtime.phase).toBe('build');
    expect(coordination).toEqual<StageFlowCoordinationState>({
      isTransitioning: true,
      pendingCombatLaunch: false,
      pendingBuildIntro: false,
      pendingCombatResolution: null,
    });
  });

  it('emits stage:return-to-lobby with stars on stage completion', () => {
    const stageId = 'stage-1';
    const runtime = createStageRuntime(makeStageConfig({ id: stageId, totalWaves: 1, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
    const coordination = createStageFlowCoordinationState();
    requestStageWaveStart(runtime);
    dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-ended',
      outcome: 'victory',
      chronoRemaining: 88,
      remainingBaseHp: 95,
    });

    const commands = dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-return-finished',
    });

    expect(runtime.phase).toBe('stage_complete');
    const returnCommand = commands.find((c) => c.type === 'stage:return-to-lobby');
    expect(returnCommand).toBeDefined();
    expect(returnCommand).toMatchObject({
      type: 'stage:return-to-lobby',
      payload: {
        stageId,
        stars: expect.any(Number),
        remainingBaseHp: 95,
      },
    });
    expect(returnCommand!.payload.stars).toBeGreaterThan(0);
  });

  it('emits stage:return-to-lobby with stars on defeat', () => {
    const stageId = 'stage-1';
    const runtime = createStageRuntime(makeStageConfig({ id: stageId, totalWaves: 2, initialCoins: StageFlowConfig.INITIAL_COINS }), undefined, () => 0);
    const coordination = createStageFlowCoordinationState();
    requestStageWaveStart(runtime);

    const commands = dispatchStageFlowIntent(runtime, coordination, {
      type: 'stage:combat-ended',
      outcome: 'defeat',
      chronoRemaining: 0,
      remainingBaseHp: 50,
    });

    expect(runtime.phase).toBe('stage_failed');
    const returnCommand = commands.find((c) => c.type === 'stage:return-to-lobby');
    expect(returnCommand).toBeDefined();
    expect(returnCommand).toMatchObject({
      type: 'stage:return-to-lobby',
      payload: {
        stageId,
        stars: expect.any(Number),
        remainingBaseHp: 50,
      },
    });
    expect(returnCommand!.payload.stars).toBeGreaterThan(0);
  });
});
