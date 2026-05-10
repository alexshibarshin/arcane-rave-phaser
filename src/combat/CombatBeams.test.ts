import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CombatPawnDefinition } from '@config/CombatContentConfig';
import { advanceCombatBeams } from './CombatBeams';
import { createCombatRuntime, setCombatState, type CombatRuntime } from './CombatRuntime';

const mockGetCombatPawnDefinitionById = vi.fn(
  (_id: string): CombatPawnDefinition | undefined => undefined,
);

vi.mock('@config/CombatContentConfig', async () => {
  const actual = await vi.importActual<typeof import('@config/CombatContentConfig')>('@config/CombatContentConfig');

  return {
    ...actual,
    getCombatPawnDefinitionById: (id: string) => mockGetCombatPawnDefinitionById(id),
  };
});

describe('CombatBeams', () => {
  beforeEach(() => {
    mockGetCombatPawnDefinitionById.mockReset();
  });

  it('retargets a lock-on beam to the next frontmost enemy after the current target dies', () => {
    mockGetCombatPawnDefinitionById.mockReturnValue(createTestBeamPawn());

    const runtime = createReadyRuntime();
    const firstTarget = primeEnemy(runtime, 0, { x: 512, y: 480, hp: 5, color: 'green' });
    const secondTarget = primeEnemy(runtime, 1, { x: 512, y: 430, hp: 40, color: 'blue' });

    runtime.beams.push({
      runtimeId: 'beam-1',
      pawnId: 'test-lock-on-beam',
      slotIndex: 0,
      color: 'red',
      beamType: 'lock-on',
      damage: 999,
      startedAtMs: 0,
      expiresAtMs: 1000,
      sourceSnapshot: {
        damageMultiplier: 1,
        finisherConsumedNotes: 0,
        finisherDamageMultiplier: 1,
        nextSlotBuffBonusPercent: 0,
      },
      targetEnemyRuntimeId: firstTarget.runtimeId,
      tickIntervalMs: 100,
      nextTickAtMs: 0,
      originX: 512,
      originY: 640,
      sweepStartAngleRad: null,
      sweepEndAngleRad: null,
      sweepLengthPx: null,
      sweepHitRadiusPx: null,
      previouslyIntersectedEnemyRuntimeIds: [],
      slowOnHit: null,
    });

    advanceCombatBeams(runtime, 0);

    expect(firstTarget.currentHp).toBe(0);
    expect(firstTarget.state).toBe('dead');
    expect(runtime.beams).toHaveLength(1);
    expect(runtime.beams[0]?.targetEnemyRuntimeId).toBe(secondTarget.runtimeId);
  });
});

function createReadyRuntime(): CombatRuntime {
  const runtime = createCombatRuntime(undefined, {
    subWaves: [{ id: 'test', startTimeMs: 0, spawnIntervalMs: 1000, enemies: { 'enemy-red-basic': 3 } }],
  });
  setCombatState(runtime, 'running');
  return runtime;
}

function primeEnemy(
  runtime: CombatRuntime,
  enemyIndex: number,
  options: { x: number; y: number; hp: number; color: 'red' | 'green' | 'blue' },
) {
  const enemy = runtime.enemies[enemyIndex]!;
  enemy.spawned = true;
  enemy.state = 'moving';
  enemy.x = options.x;
  enemy.y = options.y;
  enemy.color = options.color;
  enemy.maxHp = options.hp;
  enemy.currentHp = options.hp;
  return enemy;
}

function createTestBeamPawn(): CombatPawnDefinition {
  return {
    id: 'test-lock-on-beam',
    displayName: 'Test Lock-On Beam',
    type: 'finisher',
    color: 'red',
    baseDamage: 1,
    outputNoteColor: 'red',
    noteRule: {
      family: 'finisher',
      consumedNoteColor: 'red',
      outputNoteColor: 'red',
      emittedNoteCount: 1,
    },
    ability: {
      primaryArchetype: 'beam',
      pattern: 'lock-on-beam',
      targeting: 'frontmost-enemy',
      damage: 1,
      durationMs: 1000,
      tickIntervalMs: 100,
    },
    tooltip: {
      shortDescription: 'Test pawn.',
    },
    art: {
      textureKey: 'test',
      frame: 0,
      frameWidth: 1,
      frameHeight: 1,
      offsetX: 0,
      offsetY: 0,
    },
    isActiveInFirstPlayableDeck: false,
    visualFamilyKey: 'test',
    visualSilhouetteKey: 'test',
    pedestalStyleKey: 'test',
  };
}
