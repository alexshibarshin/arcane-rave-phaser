import { describe, expect, it } from 'vitest';
import { redlineRoutineConfig } from './RedlineRoutine';
import { getStageConfig } from '@config/StageRegistry';
import type { StageConfig } from '@config/StageConfig';

describe('redlineRoutineConfig', () => {
  it('exports a StageConfig object with required fields', () => {
    const cfg: StageConfig = redlineRoutineConfig;

    expect(cfg.id).toBe('redline-routine');
    expect(cfg.displayName).toBe('Redline Routine');
    expect(cfg.totalWaves).toBeGreaterThan(0);
    expect(typeof cfg.initialCoins).toBe('number');
    expect(cfg.waves).toBeInstanceOf(Array);
    expect(cfg.slotModifierCountWeights).toBeDefined();
    expect(cfg.stageTags).toBeDefined();
    expect(cfg.eliteEnemyId).toBeDefined();
    expect(cfg.bossEnemyId).toBeDefined();
    expect(cfg.hpMultipliers).toBeDefined();
    expect(cfg.waves).toBeDefined();
  });

  it('is retrievable from StageRegistry by id', () => {
    const found = getStageConfig('redline-routine');
    expect(found).toBeDefined();
    expect(found!.id).toBe('redline-routine');
  });

  it('has hpMultipliers length equal to totalWaves', () => {
    const cfg = redlineRoutineConfig;
    expect(cfg.hpMultipliers).toBeDefined();
    expect(cfg.hpMultipliers!.length).toBe(cfg.totalWaves);
  });

  it('has monotonically non-decreasing hpMultipliers', () => {
    const multipliers = redlineRoutineConfig.hpMultipliers!;
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]!).toBeGreaterThanOrEqual(multipliers[i - 1]!);
    }
  });

  it('has no duplicate sub-wave IDs across the stage', () => {
    const ids = redlineRoutineConfig.waves!.flatMap((w) => w.subWaves.map((s) => s.id));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has at least 1 enemy in every sub-wave', () => {
    for (const wave of redlineRoutineConfig.waves!) {
      for (const subWave of wave.subWaves) {
        const totalEnemies = Object.values(subWave.enemies).reduce((a, b) => a + b, 0);
        expect(totalEnemies).toBeGreaterThan(0);
      }
    }
  });

  it('has wave 5 as elite with specialEnemyId iron-kick', () => {
    const wave5 = redlineRoutineConfig.waves![4]!;
    expect(wave5.kind).toBe('elite');
    expect(wave5.specialEnemyId).toBe('iron-kick');
  });

  it('has wave 10 as boss with specialEnemyId redline-headliner', () => {
    const wave10 = redlineRoutineConfig.waves![9]!;
    expect(wave10.kind).toBe('boss');
    expect(wave10.specialEnemyId).toBe('redline-headliner');
  });
});
