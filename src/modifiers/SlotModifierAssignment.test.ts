import { describe, it, expect } from 'vitest';
import { generateStageSlotModifiers } from './SlotModifierAssignment';
import { STAGE_CONFIGS, type StageConfig } from '@config/StageConfig';
import { SLOT_MODIFIER_CONFIG, type SlotModifierDefinition } from '@config/SlotModifierConfig';

function mockRng(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length]!;
    i++;
    return value;
  };
}

function testStageConfig(overrides: Partial<StageConfig>): StageConfig {
  const base = STAGE_CONFIGS[0]!;
  return {
    id: base.id,
    displayName: base.displayName,
    totalWaves: base.totalWaves,
    initialCoins: base.initialCoins,
    slotModifierCountWeights: base.slotModifierCountWeights,
    slotModifierWeightOverrides: base.slotModifierWeightOverrides,
    ...overrides,
  };
}

describe('generateStageSlotModifiers', () => {
  it('returns empty array when count weight 0 is the only positive weight', () => {
    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 },
    });

    const result = generateStageSlotModifiers(
      mockRng([0.5]),
      stageConfig,
      SLOT_MODIFIER_CONFIG.modifiers,
    );

    expect(result).toEqual([]);
  });

  it('produces exactly 1 modifier when only count weight 1 is positive', () => {
    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 1, 2: 0, 3: 0 },
    });

    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.3, 0.5]),
      stageConfig,
      SLOT_MODIFIER_CONFIG.modifiers,
    );

    expect(result).toHaveLength(1);
    const assignment = result[0]!;
    expect(assignment.slotIndex).toBeGreaterThanOrEqual(0);
    expect(assignment.slotIndex).toBeLessThanOrEqual(7);
    expect(typeof assignment.modifierId).toBe('string');
    expect(assignment.modifierId.length).toBeGreaterThan(0);
  });

  it('produces exactly 3 modifiers when only count weight 3 is positive', () => {
    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 },
    });

    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.1, 0.3, 0.7, 0.1, 0.2, 0.9]),
      stageConfig,
      SLOT_MODIFIER_CONFIG.modifiers,
    );

    expect(result).toHaveLength(3);
  });

  it('produces slot indices that are unique and in range 0-7', () => {
    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 },
    });

    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.1, 0.3, 0.7, 0.1, 0.2, 0.9]),
      stageConfig,
      SLOT_MODIFIER_CONFIG.modifiers,
    );

    const indices = result.map((a) => a.slotIndex);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(indices.length);
    indices.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(7);
    });
  });

  it('never selects more than 1 premium modifier', () => {
    // Pool with premium weighted heavily so RNG would pick it if allowed.
    const pool: SlotModifierDefinition[] = [
      {
        id: 'premium-a',
        rarity: 'premium',
        defaultWeight: 100,
        displayName: 'Premium A',
        shortDescription: '',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
      {
        id: 'premium-b',
        rarity: 'premium',
        defaultWeight: 100,
        displayName: 'Premium B',
        shortDescription: '',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
      {
        id: 'common-a',
        rarity: 'common',
        defaultWeight: 1,
        displayName: 'Common A',
        shortDescription: '',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
    ];

    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 },
    });

    // RNG: first slot picks premium-a, second slot picks premium-b (high weight),
    // but premium cap blocks it so common-a is chosen.
    // count=3, slot1 rng=0.1, mod rng=0.5 (premium-a),
    // slot2 rng=0.3, mod rng=0.01 (would be premium-b, but cap blocks → common-a),
    // slot3 rng=0.7, mod rng=0.01 (would be premium-b, cap blocks → common-a).
    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.1, 0.01, 0.3, 0.01, 0.7, 0.01]),
      stageConfig,
      pool,
    );

    const premiumIds = result
      .map((a) => pool.find((m) => m.id === a.modifierId))
      .filter((m): m is SlotModifierDefinition => m?.rarity === 'premium');
    expect(premiumIds.length).toBeLessThanOrEqual(1);
  });

  it('never selects a modifier with defaultWeight 0', () => {
    const pool: SlotModifierDefinition[] = [
      {
        id: 'zero-weight',
        rarity: 'common',
        defaultWeight: 0,
        displayName: 'Zero Weight',
        shortDescription: 'Should never appear.',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
      {
        id: 'normal',
        rarity: 'common',
        defaultWeight: 1,
        displayName: 'Normal',
        shortDescription: 'The only option.',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
    ];

    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 1, 2: 0, 3: 0 },
    });

    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.5, 0.01]),
      stageConfig,
      pool,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.modifierId).toBe('normal');
  });

  it('excludes a modifier when stage override sets its weight to 0', () => {
    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 1, 2: 0, 3: 0 },
      slotModifierWeightOverrides: { 'normal': 0, 'zero-weight': 1 },
    });

    const pool: SlotModifierDefinition[] = [
      {
        id: 'zero-weight',
        rarity: 'common',
        defaultWeight: 0,
        displayName: 'Zero Global',
        shortDescription: 'Global weight 0 but override to 1.',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
      {
        id: 'normal',
        rarity: 'common',
        defaultWeight: 1,
        displayName: 'Normal',
        shortDescription: 'Global weight 1 but override to 0.',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
    ];

    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.5, 0.01]),
      stageConfig,
      pool,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.modifierId).toBe('zero-weight');
  });

  it('allows common modifiers to repeat across slots within one stage', () => {
    // Pool with a single common modifier so it must repeat if count > 1.
    const pool: SlotModifierDefinition[] = [
      {
        id: 'only-common',
        rarity: 'common',
        defaultWeight: 1,
        displayName: 'Only',
        shortDescription: 'The only modifier.',
        iconKey: 'test',
        effectKind: 'output-note-bonus',
        effectParams: { bonusNoteCount: 1 },
      },
    ];

    const stageConfig = testStageConfig({
      slotModifierCountWeights: { 0: 0, 1: 0, 2: 1, 3: 0 },
    });

    const result = generateStageSlotModifiers(
      mockRng([0.5, 0.1, 0.5, 0.01, 0.01]),
      stageConfig,
      pool,
    );

    expect(result).toHaveLength(2);
    expect(result[0]!.modifierId).toBe('only-common');
    expect(result[1]!.modifierId).toBe('only-common');
    expect(result[0]!.slotIndex).not.toBe(result[1]!.slotIndex);
  });
});
