import { describe, expect, it } from 'vitest';
import { blueNoiseRushConfig } from './BlueNoiseRush';
import { getStageConfig } from '@config/StageRegistry';
import type { StageConfig } from '@config/StageConfig';

describe('blueNoiseRushConfig', () => {
  it('exports a StageConfig object with required fields', () => {
    const cfg: StageConfig = blueNoiseRushConfig;

    expect(cfg.id).toBe('blue-noise-rush');
    expect(cfg.displayName).toBe('Blue Noise Rush');
    expect(cfg.totalWaves).toBeGreaterThan(0);
    expect(typeof cfg.initialCoins).toBe('number');
    expect(cfg.waveDefinitions).toBeInstanceOf(Array);
    expect(cfg.slotModifierCountWeights).toBeDefined();
    expect(cfg.stageTags).toBeDefined();
    expect(cfg.eliteEnemyId).toBeDefined();
    expect(cfg.bossEnemyId).toBeDefined();
    expect(cfg.hpMultipliers).toBeDefined();
    expect(cfg.waves).toBeDefined();
  });

  it('is retrievable from StageRegistry by id', () => {
    const found = getStageConfig('blue-noise-rush');
    expect(found).toBeDefined();
    expect(found!.id).toBe('blue-noise-rush');
  });

  it('has hpMultipliers length equal to totalWaves', () => {
    const cfg = blueNoiseRushConfig;
    expect(cfg.hpMultipliers).toBeDefined();
    expect(cfg.hpMultipliers!.length).toBe(cfg.totalWaves);
  });

  it('has monotonically non-decreasing hpMultipliers', () => {
    const multipliers = blueNoiseRushConfig.hpMultipliers!;
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]!).toBeGreaterThanOrEqual(multipliers[i - 1]!);
    }
  });

  it('has no duplicate sub-wave IDs across the stage', () => {
    const ids = blueNoiseRushConfig.waves!.flatMap((w) => w.subWaves.map((s) => s.id));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has at least 1 enemy in every sub-wave', () => {
    for (const wave of blueNoiseRushConfig.waves!) {
      for (const subWave of wave.subWaves) {
        const totalEnemies = Object.values(subWave.enemies).reduce((a, b) => a + b, 0);
        expect(totalEnemies).toBeGreaterThan(0);
      }
    }
  });

  it('has wave 5 as elite with specialEnemyId static-choir', () => {
    const wave5 = blueNoiseRushConfig.waves![4]!;
    expect(wave5.kind).toBe('elite');
    expect(wave5.specialEnemyId).toBe('static-choir');
  });

  it('has wave 10 as boss with specialEnemyId blue-noise-monarch', () => {
    const wave10 = blueNoiseRushConfig.waves![9]!;
    expect(wave10.kind).toBe('boss');
    expect(wave10.specialEnemyId).toBe('blue-noise-monarch');
  });

  it('contains no tank enemies in any sub-wave', () => {
    for (const wave of blueNoiseRushConfig.waves!) {
      for (const subWave of wave.subWaves) {
        const enemyIds = Object.keys(subWave.enemies);
        for (const id of enemyIds) {
          expect(id).not.toContain('tank');
        }
      }
    }
  });
});
