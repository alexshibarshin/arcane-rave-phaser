import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, validateCombatWaveConfig } from '@config/CombatWaveConfig';

describe('CombatWaveConfig', () => {
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
