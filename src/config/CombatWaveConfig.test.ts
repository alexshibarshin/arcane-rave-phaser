import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, validateCombatWaveConfig } from '@config/CombatWaveConfig';

describe('CombatWaveConfig', () => {
  it('defines at least one wave with non-empty authored sub-waves', () => {
    expect(CombatWaveConfig.WAVES.length).toBeGreaterThan(0);

    for (const wave of CombatWaveConfig.WAVES) {
      expect(wave.id.trim().length).toBeGreaterThan(0);
      expect(wave.subWaves.length).toBeGreaterThan(0);
    }
  });

  it('keeps sub-wave timing monotonic and enemy counts positive', () => {
    for (const wave of CombatWaveConfig.WAVES) {
      let previousStartTimeMs = Number.NEGATIVE_INFINITY;

      for (const subWave of wave.subWaves) {
        expect(subWave.id.trim().length).toBeGreaterThan(0);
        expect(subWave.startTimeMs).toBeGreaterThanOrEqual(previousStartTimeMs);
        expect(subWave.spawnIntervalMs).toBeGreaterThan(0);

        const enemyEntries = Object.entries(subWave.enemies);
        expect(enemyEntries.length).toBeGreaterThan(0);

        for (const [, count] of enemyEntries) {
          expect(Number.isInteger(count)).toBe(true);
          expect(count).toBeGreaterThan(0);
        }

        previousStartTimeMs = subWave.startTimeMs;
      }
    }
  });

  it('keeps wave references bound to known slot presets and enemies', () => {
    const slotPresetIds = new Set(CombatContentConfig.SLOT_PRESETS.map((preset) => preset.id));
    const enemyIds = new Set(CombatContentConfig.ENEMY_DEFINITIONS.map((enemy) => enemy.id));

    for (const wave of CombatWaveConfig.WAVES) {
      expect(slotPresetIds.has(wave.slotPresetId)).toBe(true);
      expect(wave.subWaves.length).toBeGreaterThan(0);

      for (const subWave of wave.subWaves) {
        for (const enemyId of Object.keys(subWave.enemies)) {
          expect(enemyIds.has(enemyId)).toBe(true);
        }
      }
    }
  });

  it('rejects waves that reference an unknown slot preset', () => {
    const firstWave = CombatWaveConfig.WAVES[0];

    expect(firstWave).toBeDefined();
    expect(() =>
      validateCombatWaveConfig(
        [
          {
            ...firstWave!,
            slotPresetId: 'missing-preset',
          },
        ],
        CombatContentConfig,
      ),
    ).toThrow(/slot preset/i);
  });

  it('rejects sub-waves that reference unknown enemy definitions', () => {
    const firstWave = CombatWaveConfig.WAVES[0];

    expect(firstWave).toBeDefined();
    expect(() =>
      validateCombatWaveConfig(
        [
          {
            ...firstWave!,
            subWaves: firstWave!.subWaves.map((subWave, index) =>
              index === 0
                ? {
                    ...subWave,
                    enemies: {
                      ...subWave.enemies,
                      'missing-enemy': 1,
                    },
                  }
                : subWave,
            ),
          },
        ],
        CombatContentConfig,
      ),
    ).toThrow(/unknown enemy/i);
  });
});
