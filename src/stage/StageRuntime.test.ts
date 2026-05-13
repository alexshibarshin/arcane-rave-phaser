import { describe, expect, it } from 'vitest';
import {
  createStageRuntime,
  buildStageWaveEnemyPayload,
  type StageRuntime,
} from '@stage/StageRuntime';
import type { StageConfig } from '@config/StageConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';

function makeStageConfig(overrides: Partial<StageConfig> = {}): StageConfig {
  return {
    id: 'test-stage',
    displayName: 'Test Stage',
    totalWaves: 3,
    initialCoins: 20,
    slotModifierCountWeights: { 0: 1, 1: 3, 2: 2, 3: 1 },
    waves: [
      {
        kind: 'normal',
        tags: ['Red', 'Fast'],
        specialEnemyId: null,
        subWaves: [
          {
            id: 'sub-1',
            startTimeMs: 0,
            spawnIntervalMs: 800,
            enemies: { 'enemy-red-basic': 2 },
          },
        ],
      },
    ],
    hpMultipliers: [1.0, 1.2, 1.5],
    ...overrides,
  };
}

describe('StageRuntime', () => {
  it('stores the stageConfig passed to createStageRuntime', () => {
    const config = makeStageConfig();
    const runtime = createStageRuntime(config);

    // The runtime should expose and store the full stage config
    expect(runtime.stageConfig).toBe(config);
  });

  it('stores a per-run reposition cost override when provided', () => {
    const runtime = createStageRuntime(makeStageConfig(), undefined, undefined, Math.random, {
      repositionCost: 0,
    });

    expect(runtime.repositionCost).toBe(0);
  });

  describe('buildStageWaveEnemyPayload', () => {
    it('returns subWaves and enemyStatOverrides with scaled HP for a valid wave index', () => {
      const config = makeStageConfig({
        totalWaves: 2,
        waves: [
          {
            kind: 'normal',
            tags: ['Red'],
            specialEnemyId: null,
            subWaves: [
              {
                id: 'sub-1',
                startTimeMs: 0,
                spawnIntervalMs: 900,
                enemies: { 'enemy-red-basic': 2, 'enemy-green-fast': 1 },
              },
              {
                id: 'sub-2',
                startTimeMs: 3000,
                spawnIntervalMs: 800,
                enemies: { 'enemy-blue-tank': 1 },
              },
            ],
          },
          {
            kind: 'boss',
            tags: ['Red', 'Boss'],
            specialEnemyId: 'iron-kick',
            subWaves: [
              {
                id: 'sub-1',
                startTimeMs: 0,
                spawnIntervalMs: 900,
                enemies: { 'enemy-red-basic': 1 },
              },
            ],
          },
        ],
        hpMultipliers: [1.5, 2.0],
      });

      const payload = buildStageWaveEnemyPayload(config, 0);

      // Returns the sub-waves as-is
      expect(payload.subWaves).toEqual(config.waves![0]!.subWaves);
      expect(payload.subWaves.length).toBe(2);

      // Has enemyStatOverrides for each distinct enemy ID
      const overrides = payload.enemyStatOverrides;
      expect(Object.keys(overrides).length).toBeGreaterThan(0);

      // Each override has a positive scaled maxHp
      for (const enemyId of Object.keys(overrides)) {
        const override = overrides[enemyId]!;
        expect(override.maxHp).toBeGreaterThan(0);

        // Verify the HP was actually scaled (not equal to the original)
        const def = CombatContentConfig.ENEMY_DEFINITIONS.find((e) => e.id === enemyId);
        expect(def).toBeDefined();
        if (def) {
          // With multiplier 1.5, HP should be different from original
          expect(override.maxHp).not.toBe(def.maxHp);
        }
      }
    });

    it('returns empty subWaves and empty overrides for an out-of-range wave index', () => {
      const config = makeStageConfig({ totalWaves: 1 });

      const payload = buildStageWaveEnemyPayload(config, 5);

      expect(payload.subWaves).toEqual([]);
      expect(payload.enemyStatOverrides).toEqual({});
    });

    it('returns empty subWaves and empty overrides when stageConfig has no waves', () => {
      const config = makeStageConfig({ waves: undefined });

      const payload = buildStageWaveEnemyPayload(config, 0);

      expect(payload.subWaves).toEqual([]);
      expect(payload.enemyStatOverrides).toEqual({});
    });

    it('uses hpMultiplier of 1.0 when the multiplier array does not have an entry for the wave', () => {
      const config = makeStageConfig({
        totalWaves: 2,
        waves: [
          {
            kind: 'normal',
            tags: ['Red'],
            specialEnemyId: null,
            subWaves: [
              {
                id: 'sub-1',
                startTimeMs: 0,
                spawnIntervalMs: 800,
                enemies: { 'enemy-red-basic': 1 },
              },
            ],
          },
        ],
        hpMultipliers: undefined,
      });

      const payload = buildStageWaveEnemyPayload(config, 0);

      const overrides = payload.enemyStatOverrides;
      expect(Object.keys(overrides).length).toBeGreaterThan(0);
      const basicOverride = overrides['enemy-red-basic'];
      expect(basicOverride).toBeDefined();

      const def = CombatContentConfig.ENEMY_DEFINITIONS.find((e) => e.id === 'enemy-red-basic');
      if (def && basicOverride) {
        // With default multiplier 1.0, HP should equal original
        expect(basicOverride.maxHp).toBe(def.maxHp);
      }
    });

    it('throws when an enemy ID in the wave is unknown', () => {
      const config = makeStageConfig({
        totalWaves: 1,
        waves: [
          {
            kind: 'normal',
            tags: ['Red'],
            specialEnemyId: null,
            subWaves: [
              {
                id: 'sub-1',
                startTimeMs: 0,
                spawnIntervalMs: 800,
                enemies: { 'nonexistent-enemy-zzz': 1 },
              },
            ],
          },
        ],
      });

      expect(() => buildStageWaveEnemyPayload(config, 0)).toThrow();
    });
  });
});
