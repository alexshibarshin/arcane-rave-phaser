import { describe, it, expect } from 'vitest';
import { buildLobbyCards, type LobbyCardModel } from './LobbyCardBuilder';
import type { StageConfig } from '../../config/StageConfig';
import type { StageResult } from '../../session/SessionProgressStore';

function makeStageConfig(overrides: Partial<StageConfig> & { id: string; displayName: string }): StageConfig {
  return {
    totalWaves: 10,
    initialCoins: 0,
    waveDefinitions: [],
    slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 },
    ...overrides,
  };
}

describe('buildLobbyCards', () => {
  const configs: StageConfig[] = [
    makeStageConfig({ id: 'stage-a', displayName: 'Stage A', stageTags: ['Red', 'Fast'] }),
    makeStageConfig({ id: 'stage-b', displayName: 'Stage B', stageTags: ['Blue', 'Crowd'] }),
    makeStageConfig({ id: 'stage-c', displayName: 'Stage C', stageTags: ['Green'] }),
  ];

  it('returns a card for each config in the same order', () => {
    const cards = buildLobbyCards(configs, () => null, null);
    expect(cards).toHaveLength(3);
    expect(cards[0]!.stageId).toBe('stage-a');
    expect(cards[1]!.stageId).toBe('stage-b');
    expect(cards[2]!.stageId).toBe('stage-c');
  });

  it('sets displayName from config', () => {
    const cards = buildLobbyCards(configs, () => null, null);
    expect(cards[0]!.displayName).toBe('Stage A');
  });

  it('sets dominantColorTag from the first color tag', () => {
    const cards = buildLobbyCards(configs, () => null, null);
    expect(cards[0]!.dominantColorTag).toBe('Red');
    expect(cards[1]!.dominantColorTag).toBe('Blue');
  });

  it('uses undefined dominantColorTag when stageTags is missing or has no color tag', () => {
    const noColorConfigs: StageConfig[] = [
      makeStageConfig({ id: 'no-tags', displayName: 'No Tags' }),
      makeStageConfig({ id: 'non-color', displayName: 'Non Color', stageTags: ['Single-Target', 'Tanky'] }),
    ];
    const cards = buildLobbyCards(noColorConfigs, () => null, null);
    expect(cards[0]!.dominantColorTag).toBeUndefined();
    expect(cards[1]!.dominantColorTag).toBeUndefined();
  });

  it('returns 0 stars and null bestHp for unplayed stages', () => {
    const cards = buildLobbyCards(configs, () => null, null);
    expect(cards[0]!.stars).toBe(0);
    expect(cards[0]!.bestHp).toBeNull();
  });

  it('returns stars and bestHp from the progress store result', () => {
    const getResult = (stageId: string): StageResult | null => {
      if (stageId === 'stage-a') return { stageId: 'stage-a', stars: 2, bestRemainingBaseHp: 75 };
      return null;
    };
    const cards = buildLobbyCards(configs, getResult, null);
    expect(cards[0]!.stars).toBe(2);
    expect(cards[0]!.bestHp).toBe(75);
    expect(cards[1]!.stars).toBe(0);
    expect(cards[1]!.bestHp).toBeNull();
  });

  it('returns bestHp null when stars is 0 even if a result exists with 0 stars', () => {
    const getResult = (): StageResult | null => ({ stageId: 'stage-a', stars: 0, bestRemainingBaseHp: 50 });
    const cards = buildLobbyCards(configs, getResult, null);
    expect(cards[0]!.stars).toBe(0);
    expect(cards[0]!.bestHp).toBeNull();
  });

  it('marks the card with selectedStageId as selected', () => {
    const cards = buildLobbyCards(configs, () => null, 'stage-b');
    expect(cards[0]!.isSelected).toBe(false);
    expect(cards[1]!.isSelected).toBe(true);
    expect(cards[2]!.isSelected).toBe(false);
  });

  it('marks no card as selected when selectedStageId is null', () => {
    const cards = buildLobbyCards(configs, () => null, null);
    for (const card of cards) {
      expect(card.isSelected).toBe(false);
    }
  });

  it('marks no card as selected when selectedStageId does not match any config', () => {
    const cards = buildLobbyCards(configs, () => null, 'nonexistent');
    for (const card of cards) {
      expect(card.isSelected).toBe(false);
    }
  });
});
