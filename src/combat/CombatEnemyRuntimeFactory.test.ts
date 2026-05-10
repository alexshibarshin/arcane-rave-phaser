import { describe, expect, it } from 'vitest';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import { CombatContentConfig } from '@config/CombatContentConfig';
import type { SubWaveDefinition } from '@config/StageConfig';

describe('CombatEnemyRuntimeFactory', () => {
  it('propagates silhouetteMotif and isSpecial from enemy definitions to runtimes', () => {
    const subWaves: SubWaveDefinition[] = [
      {
        id: 'sub-1',
        startTimeMs: 0,
        spawnIntervalMs: 1000,
        enemies: { 'iron-kick': 1, 'enemy-red-basic': 2 },
      },
    ];

    const runtimes = createCombatEnemyRuntimes(subWaves);

    const ironKick = runtimes.find((e) => e.definitionId === 'iron-kick');
    const redBasic = runtimes.find((e) => e.definitionId === 'enemy-red-basic');

    expect(ironKick).toBeDefined();
    expect(ironKick?.silhouetteMotif).toBe('chevron-armor');
    expect(ironKick?.isSpecial).toBe(true);

    expect(redBasic).toBeDefined();
    expect(redBasic?.isSpecial).toBeFalsy();
    expect(redBasic?.silhouetteMotif).toBeUndefined();
  });

  it('creates enemy runtimes from subWave definitions with HP overrides applied', () => {
    const subWaves: SubWaveDefinition[] = [
      {
        id: 'sub-1',
        startTimeMs: 0,
        spawnIntervalMs: 1000,
        enemies: { 'enemy-red-basic': 2, 'enemy-green-basic': 1 },
      },
      {
        id: 'sub-2',
        startTimeMs: 3000,
        spawnIntervalMs: 800,
        enemies: { 'enemy-red-basic': 1, 'enemy-blue-basic': 2 },
      },
    ];

    const enemyStatOverrides = {
      'enemy-red-basic': { maxHp: 250 },
      'enemy-green-basic': { maxHp: 180 },
      'enemy-blue-basic': { maxHp: 310 },
    };

    const runtimes = createCombatEnemyRuntimes(subWaves, enemyStatOverrides);

    // Total spawns: red-basic=3, green-basic=1, blue-basic=2
    const redRuntimes = runtimes.filter((e) => e.definitionId === 'enemy-red-basic');
    const greenRuntimes = runtimes.filter((e) => e.definitionId === 'enemy-green-basic');
    const blueRuntimes = runtimes.filter((e) => e.definitionId === 'enemy-blue-basic');

    expect(redRuntimes).toHaveLength(3);
    expect(greenRuntimes).toHaveLength(1);
    expect(blueRuntimes).toHaveLength(2);

    for (const rt of redRuntimes) {
      expect(rt.maxHp).toBe(250);
      expect(rt.currentHp).toBe(250);
    }

    for (const rt of greenRuntimes) {
      expect(rt.maxHp).toBe(180);
      expect(rt.currentHp).toBe(180);
    }

    for (const rt of blueRuntimes) {
      expect(rt.maxHp).toBe(310);
      expect(rt.currentHp).toBe(310);
    }
  });
});
