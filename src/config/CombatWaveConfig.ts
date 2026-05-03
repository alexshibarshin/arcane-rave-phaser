import {
  CombatContentConfig,
  type CombatContentConfigShape,
} from '@config/CombatContentConfig';

export interface CombatSubWaveConfig {
  id: string;
  startTimeMs: number;
  spawnIntervalMs: number;
  enemies: Record<string, number>;
}

export interface CombatWaveDefinition {
  id: string;
  slotPresetId: string;
  startAngleDeg: number;
  subWaves: CombatSubWaveConfig[];
}

const waveOneSubWaves: CombatSubWaveConfig[] = [
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
];

const combatWaveConfig = {
  WAVES: [
    {
      id: 'wave-1',
      slotPresetId: 'preset-starter-1',
      startAngleDeg: 0,
      subWaves: waveOneSubWaves,
    },
  ] satisfies CombatWaveDefinition[],
} as const;

export function validateCombatWaveConfig(
  waves: readonly CombatWaveDefinition[],
  contentConfig: CombatContentConfigShape,
): void {
  const slotPresetIds = new Set(contentConfig.SLOT_PRESETS.map((preset) => preset.id));
  const enemyIds = new Set(contentConfig.ENEMY_DEFINITIONS.map((enemy) => enemy.id));

  for (const wave of waves) {
    if (!slotPresetIds.has(wave.slotPresetId)) {
      throw new Error(`Combat wave "${wave.id}" references an unknown slot preset.`);
    }

    if (wave.subWaves.length === 0) {
      throw new Error(`Combat wave "${wave.id}" must define at least one sub-wave.`);
    }

    for (const subWave of wave.subWaves) {
      for (const enemyId of Object.keys(subWave.enemies)) {
        if (!enemyIds.has(enemyId)) {
          throw new Error(
            `Combat sub-wave "${subWave.id}" references unknown enemy "${enemyId}".`,
          );
        }
      }
    }
  }
}

validateCombatWaveConfig(combatWaveConfig.WAVES, CombatContentConfig);

export const CombatWaveConfig = combatWaveConfig;
