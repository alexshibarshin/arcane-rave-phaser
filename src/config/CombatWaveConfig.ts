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

const waveTestAllSubWaves: CombatSubWaveConfig[] = [
  {
    id: 'wave-test-all-red',
    startTimeMs: 0,
    spawnIntervalMs: 1200,
    enemies: {
      'enemy-red-basic': 1,
      'enemy-red-tank': 1,
      'enemy-red-fast': 1,
      'enemy-red-ranged': 1,
      'enemy-red-swarm': 1,
      'enemy-red-boss': 1,
    },
  },
  {
    id: 'wave-test-all-green',
    startTimeMs: 3000,
    spawnIntervalMs: 1200,
    enemies: {
      'enemy-green-basic': 1,
      'enemy-green-tank': 1,
      'enemy-green-fast': 1,
      'enemy-green-ranged': 1,
      'enemy-green-swarm': 1,
      'enemy-green-boss': 1,
    },
  },
  {
    id: 'wave-test-all-blue',
    startTimeMs: 6000,
    spawnIntervalMs: 1200,
    enemies: {
      'enemy-blue-basic': 1,
      'enemy-blue-tank': 1,
      'enemy-blue-fast': 1,
      'enemy-blue-ranged': 1,
      'enemy-blue-swarm': 1,
      'enemy-blue-boss': 1,
    },
  },
];

const combatWaveConfig = {
  WAVES: [
    {
      id: 'wave-test-all',
      slotPresetId: 'preset-starter-1',
      startAngleDeg: 0,
      subWaves: waveTestAllSubWaves,
    },
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
