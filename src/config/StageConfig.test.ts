import { describe, expect, it } from 'vitest';
import { STAGE_CONFIGS, getStageConfig } from '@config/StageConfig';

describe('STAGE_CONFIGS', () => {
  it('contains exactly one MVP stage config', () => {
    expect(STAGE_CONFIGS).toHaveLength(1);
  });

  it('has the required fields on the first entry', () => {
    const stage = STAGE_CONFIGS[0]!;

    expect(stage.id).toBe('stage-1');
    expect(stage.displayName).toBeTruthy();
    expect(stage.totalWaves).toBeGreaterThan(0);
    expect(stage.initialCoins).toBeGreaterThanOrEqual(0);
    expect(stage.waveDefinitions).toBeInstanceOf(Array);
    expect(stage.waveDefinitions.length).toBe(stage.totalWaves);
    expect(stage.slotModifierCountWeights).toBeDefined();
  });

  it('defines slotModifierCountWeights with keys 0-3 and non-negative values', () => {
    const weights = STAGE_CONFIGS[0]!.slotModifierCountWeights;

    expect(weights[0]).toBeGreaterThanOrEqual(0);
    expect(weights[1]).toBeGreaterThanOrEqual(0);
    expect(weights[2]).toBeGreaterThanOrEqual(0);
    expect(weights[3]).toBeGreaterThanOrEqual(0);

    const sum = weights[0] + weights[1] + weights[2] + weights[3];
    expect(sum).toBeGreaterThan(0);
  });
});

describe('getStageConfig', () => {
  it('returns the stage for a known ID', () => {
    expect(getStageConfig('stage-1')).toBe(STAGE_CONFIGS[0]);
  });

  it('returns undefined for an unknown ID', () => {
    expect(getStageConfig('nonexistent')).toBeUndefined();
  });
});
