import { describe, expect, it } from 'vitest';
import { createStageWavePreview } from '@stage/StageWavePreview';
import type { StageWaveDefinition } from '@config/StageConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';

function makeWaveDefinition(overrides: Partial<StageWaveDefinition> = {}): StageWaveDefinition {
  return {
    kind: 'normal',
    tags: ['Red', 'Fast'],
    specialEnemyId: null,
    subWaves: [
      {
        id: 'sub-1',
        startTimeMs: 0,
        spawnIntervalMs: 800,
        enemies: { 'enemy-red-basic': 2 },
      },
    ],
    ...overrides,
  };
}

describe('createStageWavePreview', () => {
  it('returns StageWavePreviewModel for a normal wave with tags and null special enemy', () => {
    const wave = makeWaveDefinition({
      kind: 'normal',
      tags: ['Red', 'Single-Target', 'Fast'],
      specialEnemyId: null,
    });
    const preview = createStageWavePreview(wave, 3, 10);

    expect(preview.waveNumber).toBe(3);
    expect(preview.totalWaves).toBe(10);
    expect(preview.waveKind).toBe('normal');
    expect(preview.tags).toEqual(['Red', 'Single-Target', 'Fast']);
    expect(preview.specialEnemyId).toBeNull();
    expect(preview.specialEnemyName).toBeNull();
  });

  it('resolves specialEnemyName when specialEnemyId references a known special enemy', () => {
    // Use a special enemy that exists in CombatContentConfig.ENEMY_DEFINITIONS
    const specialEnemies = CombatContentConfig.ENEMY_DEFINITIONS.filter((e) => e.isSpecial && e.displayName);
    expect(specialEnemies.length).toBeGreaterThan(0);
    const specialEnemyId = specialEnemies[0]!.id;

    const wave = makeWaveDefinition({
      kind: 'boss',
      tags: ['Red', 'Boss'],
      specialEnemyId,
    });
    const preview = createStageWavePreview(wave, 10, 10);

    expect(preview.waveKind).toBe('boss');
    expect(preview.specialEnemyId).toBe(specialEnemyId);
    expect(typeof preview.specialEnemyName).toBe('string');
    expect(preview.specialEnemyName!.trim().length).toBeGreaterThan(0);
  });

  it('returns null specialEnemyName when specialEnemyId is unknown', () => {
    const wave = makeWaveDefinition({
      kind: 'elite',
      tags: ['Blue', 'Elite'],
      specialEnemyId: 'nonexistent-enemy-id',
    });
    const preview = createStageWavePreview(wave, 5, 10);

    expect(preview.specialEnemyId).toBe('nonexistent-enemy-id');
    expect(preview.specialEnemyName).toBeNull();
  });
});
