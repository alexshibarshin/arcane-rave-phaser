import { describe, expect, it } from 'vitest';
import { greenroomCollapseConfig } from './GreenroomCollapse';
import { getStageConfig } from '@config/StageRegistry';
import type { StageConfig } from '@config/StageConfig';

describe('greenroomCollapseConfig', () => {
  it('exports a StageConfig object with required fields', () => {
    const cfg: StageConfig = greenroomCollapseConfig;

    expect(cfg.id).toBe('greenroom-collapse');
    expect(cfg.displayName).toBe('Greenroom Collapse');
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
    const found = getStageConfig('greenroom-collapse');
    expect(found).toBeDefined();
    expect(found!.id).toBe('greenroom-collapse');
  });

  it('has hpMultipliers length equal to totalWaves', () => {
    const cfg = greenroomCollapseConfig;
    expect(cfg.hpMultipliers).toBeDefined();
    expect(cfg.hpMultipliers!.length).toBe(cfg.totalWaves);
  });

  it('has monotonically non-decreasing hpMultipliers', () => {
    const multipliers = greenroomCollapseConfig.hpMultipliers!;
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]!).toBeGreaterThanOrEqual(multipliers[i - 1]!);
    }
  });

  it('has no duplicate sub-wave IDs across the stage', () => {
    const ids = greenroomCollapseConfig.waves!.flatMap((w) => w.subWaves.map((s) => s.id));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has at least 1 enemy in every sub-wave', () => {
    for (const wave of greenroomCollapseConfig.waves!) {
      for (const subWave of wave.subWaves) {
        const totalEnemies = Object.values(subWave.enemies).reduce((a, b) => a + b, 0);
        expect(totalEnemies).toBeGreaterThan(0);
      }
    }
  });

  it('has wave 5 as elite with specialEnemyId backstage-blur', () => {
    const wave5 = greenroomCollapseConfig.waves![4]!;
    expect(wave5.kind).toBe('elite');
    expect(wave5.specialEnemyId).toBe('backstage-blur');
  });

  it('has wave 10 as boss with specialEnemyId verdant-encore', () => {
    const wave10 = greenroomCollapseConfig.waves![9]!;
    expect(wave10.kind).toBe('boss');
    expect(wave10.specialEnemyId).toBe('verdant-encore');
    expect(wave10.subWaves.length).toBeGreaterThan(0);
  });

  it('contains all four archetypes (basic, fast, tank, swarm) across its waves', () => {
    const allEnemyIds: string[] = [];
    for (const wave of greenroomCollapseConfig.waves!) {
      for (const subWave of wave.subWaves) {
        allEnemyIds.push(...Object.keys(subWave.enemies));
      }
    }
    const uniqueIds = new Set(allEnemyIds);
    const archetypes = ['basic', 'fast', 'tank', 'swarm'];
    for (const archetype of archetypes) {
      const found = [...uniqueIds].some((id) => id.includes(`-${archetype}`));
      expect(found).toBe(true);
    }
  });

  it('has slotModifierCountWeights that guarantee exactly 3 modifiers', () => {
    const weights = greenroomCollapseConfig.slotModifierCountWeights;
    expect(weights[3]).toBeGreaterThan(0);
    expect(weights[0] + weights[1] + weights[2]).toBe(0);
  });
});
