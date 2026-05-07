import { describe, expect, it } from 'vitest';
import { STAGE_CONFIGS, getStageConfig } from '@config/StageConfig';

describe('STAGE_CONFIGS', () => {
  it('contains at least one stage config', () => {
    expect(STAGE_CONFIGS.length).toBeGreaterThan(0);
  });

  it('has the required fields on every entry', () => {
    for (const stage of STAGE_CONFIGS) {
      expect(stage.id.length).toBeGreaterThan(0);
      expect(stage.displayName.length).toBeGreaterThan(0);
      expect(stage.totalWaves).toBeGreaterThan(0);
      expect(stage.initialCoins).toBeGreaterThanOrEqual(0);
      expect(stage.waveDefinitions).toBeInstanceOf(Array);
      expect(stage.waveDefinitions.length).toBe(stage.totalWaves);
      expect(stage.slotModifierCountWeights).toBeDefined();
    }
  });

  it('defines slotModifierCountWeights with non-negative values that sum to a positive number', () => {
    for (const stage of STAGE_CONFIGS) {
      const weights = stage.slotModifierCountWeights;
      const keys = Object.keys(weights).map(Number);
      expect(keys.length).toBeGreaterThan(0);

      let sum = 0;
      for (const key of keys) {
        const value = weights[key as keyof typeof weights];
        expect(value).toBeGreaterThanOrEqual(0);
        sum += value;
      }
      expect(sum).toBeGreaterThan(0);
    }
  });
});

describe('getStageConfig', () => {
  it('returns the stage for a known ID', () => {
    const firstId = STAGE_CONFIGS[0]!.id;
    expect(getStageConfig(firstId)).toBe(STAGE_CONFIGS[0]);
  });

  it('returns undefined for an unknown ID', () => {
    expect(getStageConfig('nonexistent')).toBeUndefined();
  });
});
