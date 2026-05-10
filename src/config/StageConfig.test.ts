import { describe, expect, it } from 'vitest';
import { STAGE_CONFIGS, getStageConfig, type StageConfig, type StageWaveDefinition, type StageWavePreviewModel, type SubWaveDefinition } from '@config/StageConfig';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { SceneKeys } from '@config/GameConfig';
import { appSceneKeys } from '@config/AppSceneKeys';
import { getStageConfig as getStageConfigFromRegistry, getAllStageConfigs } from '@config/StageRegistry';

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
      expect(stage.slotModifierCountWeights).toBeDefined();

      // Stage must define wave content via waves
      const hasWaves = stage.waves !== undefined && stage.waves.length > 0;
      expect(hasWaves).toBe(true);
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

describe('SubWaveDefinition', () => {
  const validSubWave: SubWaveDefinition = {
    id: 'sub-1',
    startTimeMs: 0,
    spawnIntervalMs: 500,
    enemies: { 'enemy-a': 3 },
  };

  it('requires id to be a non-empty string', () => {
    expect(validSubWave.id.length).toBeGreaterThan(0);
  });

  it('requires startTimeMs to be non-negative', () => {
    expect(validSubWave.startTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('requires spawnIntervalMs to be positive', () => {
    expect(validSubWave.spawnIntervalMs).toBeGreaterThan(0);
  });

  it('requires enemies to be non-empty with positive integer counts', () => {
    const entries = Object.entries(validSubWave.enemies);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, count] of entries) {
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe('StageWaveDefinition', () => {
  const validWave: StageWaveDefinition = {
    kind: 'normal',
    tags: ['Red'],
    specialEnemyId: null,
    subWaves: [{ id: 'sub-1', startTimeMs: 0, spawnIntervalMs: 500, enemies: { 'enemy-a': 1 } }],
  };

  it('requires kind to be one of normal, elite, boss', () => {
    const validKinds = ['normal', 'elite', 'boss'];
    expect(validKinds).toContain(validWave.kind);
  });

  it('requires tags to be a non-empty array of strings', () => {
    expect(validWave.tags.length).toBeGreaterThan(0);
    for (const tag of validWave.tags) {
      expect(tag.length).toBeGreaterThan(0);
    }
  });

  it('allows specialEnemyId to be null for normal waves', () => {
    expect(validWave.specialEnemyId).toBeNull();
  });

  it('requires subWaves to be a non-empty array with valid SubWaveDefinition entries', () => {
    expect(validWave.subWaves.length).toBeGreaterThan(0);
    for (const subWave of validWave.subWaves) {
      expect(subWave.id.length).toBeGreaterThan(0);
      expect(subWave.spawnIntervalMs).toBeGreaterThan(0);
    }
  });
});

describe('StageWavePreviewModel', () => {
  const validPreview: StageWavePreviewModel = {
    waveNumber: 1,
    totalWaves: 10,
    waveKind: 'normal',
    tags: ['Red'],
    specialEnemyId: null,
    specialEnemyName: null,
  };

  it('has waveNumber >= 1', () => {
    expect(validPreview.waveNumber).toBeGreaterThanOrEqual(1);
  });

  it('has totalWaves >= waveNumber', () => {
    expect(validPreview.totalWaves).toBeGreaterThanOrEqual(validPreview.waveNumber);
  });

  it('has waveKind as one of normal, elite, boss', () => {
    const validKinds = ['normal', 'elite', 'boss'];
    expect(validKinds).toContain(validPreview.waveKind);
  });

  it('has non-empty tags array', () => {
    expect(validPreview.tags.length).toBeGreaterThan(0);
  });

  it('allows specialEnemyId and specialEnemyName to both be null', () => {
    expect(validPreview.specialEnemyId).toBeNull();
    expect(validPreview.specialEnemyName).toBeNull();
  });
});

describe('StageConfig (expanded)', () => {
  const fullStageConfig: StageConfig = {
    id: 'test-stage',
    displayName: 'Test Stage',
    totalWaves: 2,
    initialCoins: 10,
    slotModifierCountWeights: { 0: 1, 1: 3, 2: 2, 3: 1 },
    stageTags: ['Red', 'Single-Target'],
    eliteEnemyId: 'elite-1',
    bossEnemyId: 'boss-1',
    hpMultipliers: [1.0, 1.5],
    waves: [
      {
        kind: 'normal',
        tags: ['Red'],
        specialEnemyId: null,
        subWaves: [{ id: 'sub-1', startTimeMs: 0, spawnIntervalMs: 500, enemies: { 'enemy-a': 1 } }],
      },
    ],
  };

  it('accepts stageTags as an array of 2–4 strings', () => {
    expect(fullStageConfig.stageTags).toBeDefined();
    expect(fullStageConfig.stageTags!.length).toBeGreaterThanOrEqual(2);
    expect(fullStageConfig.stageTags!.length).toBeLessThanOrEqual(4);
  });

  it('accepts eliteEnemyId and bossEnemyId as non-empty strings', () => {
    expect(fullStageConfig.eliteEnemyId).toBeDefined();
    expect(fullStageConfig.eliteEnemyId!.length).toBeGreaterThan(0);
    expect(fullStageConfig.bossEnemyId).toBeDefined();
    expect(fullStageConfig.bossEnemyId!.length).toBeGreaterThan(0);
  });

  it('hpMultipliers length matches totalWaves when both are set', () => {
    expect(fullStageConfig.hpMultipliers).toBeDefined();
    expect(fullStageConfig.hpMultipliers!.length).toBe(fullStageConfig.totalWaves);
    for (const mult of fullStageConfig.hpMultipliers!) {
      expect(mult).toBeGreaterThan(0);
    }
  });

  it('accepts waves as StageWaveDefinition[]', () => {
    expect(fullStageConfig.waves).toBeDefined();
    expect(fullStageConfig.waves!.length).toBeGreaterThan(0);
    expect(fullStageConfig.waves![0]!.kind).toBe('normal');
  });
});

describe('CombatBalanceConfig.STAR_THRESHOLDS', () => {
  it('defines star rating thresholds as ratios between 0 and 1', () => {
    const thresholds = CombatBalanceConfig.STAR_THRESHOLDS;
    expect(thresholds).toBeDefined();
    expect(thresholds.THREE_STAR_MIN_RATIO).toBeGreaterThan(0);
    expect(thresholds.THREE_STAR_MIN_RATIO).toBeLessThanOrEqual(1);
    expect(thresholds.TWO_STAR_MIN_RATIO).toBeGreaterThan(0);
    expect(thresholds.TWO_STAR_MIN_RATIO).toBeLessThanOrEqual(1);
    expect(thresholds.THREE_STAR_MIN_RATIO).toBeGreaterThan(thresholds.TWO_STAR_MIN_RATIO);
  });
});

describe('SceneKeys', () => {
  it('defines LOBBY scene key as a non-empty string', () => {
    expect(SceneKeys.LOBBY).toBeDefined();
    expect(SceneKeys.LOBBY.length).toBeGreaterThan(0);
  });
});

describe('appSceneKeys', () => {
  it('includes LOBBY in registered scene keys', () => {
    expect(appSceneKeys).toContain(SceneKeys.LOBBY);
  });
});

describe('StageRegistry', () => {
  it('returns an array from getAllStageConfigs', () => {
    const configs = getAllStageConfigs();
    expect(Array.isArray(configs)).toBe(true);
  });

  it('returns undefined for an unknown stage ID', () => {
    expect(getStageConfigFromRegistry('nonexistent')).toBeUndefined();
  });

  it('returns a StageConfig for every ID in getAllStageConfigs', () => {
    for (const config of getAllStageConfigs()) {
      const found = getStageConfigFromRegistry(config.id);
      expect(found).toBeDefined();
      expect(found!.id.length).toBeGreaterThan(0);
      expect(found!.totalWaves).toBeGreaterThan(0);
    }
  });
});
