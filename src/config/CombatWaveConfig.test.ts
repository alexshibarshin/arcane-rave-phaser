import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, validateCombatWaveConfig } from '@config/CombatWaveConfig';

describe('CombatWaveConfig', () => {
  it('keeps the authored starter wave and the full-archetype coverage wave available', () => {
    const waveIds = CombatWaveConfig.WAVES.map((wave) => wave.id);

    expect(waveIds).toContain('wave-1');
    expect(waveIds).toContain('wave-3');
  });

  it('defines wave-3 with one enemy per archetype across red, green, and blue sub-waves', () => {
    const testWave = CombatWaveConfig.WAVES.find((wave) => wave.id === 'wave-3');

    expect(testWave?.id).toBe('wave-3');
    expect(testWave?.slotPresetId).toBe('preset-starter-1');
    expect(testWave?.subWaves).toHaveLength(3);
    expect(testWave?.subWaves.map((subWave) => subWave.id)).toEqual([
      'wave-test-all-red',
      'wave-test-all-green',
      'wave-test-all-blue',
    ]);
    expect(testWave?.subWaves.map((subWave) => subWave.startTimeMs)).toEqual([0, 3000, 6000]);
    expect(testWave?.subWaves.map((subWave) => subWave.spawnIntervalMs)).toEqual([
      1200,
      1200,
      1200,
    ]);

    for (const subWave of testWave?.subWaves ?? []) {
      expect(Object.values(subWave.enemies)).toEqual([1, 1, 1, 1, 1, 1]);
      expect(Object.keys(subWave.enemies)).toHaveLength(6);
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
