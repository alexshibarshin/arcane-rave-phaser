import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, validateCombatWaveConfig } from '@config/CombatWaveConfig';

describe('CombatWaveConfig', () => {
  it('defines a starter eight-slot preset and a first wave that references it', () => {
    expect(CombatContentConfig.SLOT_PRESETS).toEqual([
      {
        id: 'preset-starter-1',
        slots: [
          'pawn-red-generator',
          'pawn-red-finisher',
          null,
          'pawn-green-generator',
          'pawn-green-finisher',
          null,
          'pawn-blue-generator',
          'pawn-blue-finisher',
        ],
      },
    ]);

    expect(CombatWaveConfig.WAVES).toEqual([
      {
        id: 'wave-1',
        slotPresetId: 'preset-starter-1',
        startAngleDeg: 0,
        subWaves: [
          {
            id: 'wave-1-a',
            startTimeMs: 0,
            spawnIntervalMs: 900,
            enemies: {
              'enemy-red-basic': 2,
              'enemy-green-basic': 1,
            },
          },
          {
            id: 'wave-1-b',
            startTimeMs: 2500,
            spawnIntervalMs: 800,
            enemies: {
              'enemy-blue-basic': 2,
              'enemy-red-basic': 1,
            },
          },
        ],
      },
    ]);
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
});
