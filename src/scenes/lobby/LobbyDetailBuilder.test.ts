import { describe, expect, it } from 'vitest';
import { buildLobbyDetailModel, type LobbyDetailModel } from './LobbyDetailBuilder';
import type { StageConfig } from '../../config/StageConfig';
import type { StageResult } from '../../session/SessionProgressStore';

function makeStageConfig(overrides: Partial<StageConfig> & { id: string; displayName: string }): StageConfig {
  return {
    totalWaves: 10,
    initialCoins: 0,
    slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 },
    ...overrides,
  };
}

describe('buildLobbyDetailModel', () => {
  const stageConfig = makeStageConfig({
    id: 'stage-a',
    displayName: 'Test Stage',
    stageTags: ['Red', 'Single-Target'],
    eliteEnemyId: 'iron-kick',
    bossEnemyId: 'redline-headliner',
  });

  it('returns null when stageId is null', () => {
    const model = buildLobbyDetailModel(null, () => undefined);
    expect(model).toBeNull();
  });

  it('returns null when stage config not found', () => {
    const model = buildLobbyDetailModel('nonexistent', () => undefined);
    expect(model).toBeNull();
  });

  it('returns stageId and displayName from config', () => {
    const model = buildLobbyDetailModel('stage-a', () => stageConfig);
    expect(model).not.toBeNull();
    expect(model!.stageId).toBe('stage-a');
    expect(model!.displayName).toBe('Test Stage');
  });

  it('returns stageTags from config', () => {
    const model = buildLobbyDetailModel('stage-a', () => stageConfig);
    expect(model!.stageTags).toEqual(['Red', 'Single-Target']);
  });

  it('returns empty stageTags array when undefined', () => {
    const configNoTags = makeStageConfig({ id: 'no-tags', displayName: 'No Tags' });
    const model = buildLobbyDetailModel('no-tags', () => configNoTags);
    expect(model!.stageTags).toEqual([]);
  });

  it('returns eliteEnemyId and bossEnemyId from config', () => {
    const model = buildLobbyDetailModel('stage-a', () => stageConfig);
    expect(model!.eliteEnemyId).toBe('iron-kick');
    expect(model!.bossEnemyId).toBe('redline-headliner');
  });

  it('returns null for elite/boss when not defined in config', () => {
    const configNoSpecials = makeStageConfig({ id: 'plain', displayName: 'Plain Stage' });
    const model = buildLobbyDetailModel('plain', () => configNoSpecials);
    expect(model!.eliteEnemyId).toBeNull();
    expect(model!.bossEnemyId).toBeNull();
  });

  it('returns session result (stars and bestHp) when stage completed', () => {
    const result: StageResult = { stageId: 'stage-a', stars: 2, bestRemainingBaseHp: 75 };
    const model = buildLobbyDetailModel('stage-a', () => stageConfig, () => result);
    expect(model!.sessionResult).toEqual({ stars: 2, bestHp: 75 });
  });

  it('returns null sessionResult when no result exists', () => {
    const model = buildLobbyDetailModel('stage-a', () => stageConfig, () => null);
    expect(model!.sessionResult).toBeNull();
  });

  it('returns dominantColorTag from the first color tag in stageTags', () => {
    const model = buildLobbyDetailModel('stage-a', () => stageConfig);
    expect(model!.dominantColorTag).toBe('Red');
  });

  it('returns undefined dominantColorTag when no color tags present', () => {
    const config = makeStageConfig({ id: 'non-color', displayName: 'NC', stageTags: ['Fast'] });
    const model = buildLobbyDetailModel('non-color', () => config);
    expect(model!.dominantColorTag).toBeUndefined();
  });
});
