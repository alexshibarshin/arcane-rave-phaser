export interface CombatSubWaveConfig {
  id: string;
  startTimeMs: number;
  spawnIntervalMs: number;
  enemies: Record<string, number>;
}

export interface CombatWaveDefinition {
  id: string;
  startAngleDeg: number;
  subWaves: CombatSubWaveConfig[];
}

export const CombatWaveConfig = {
  WAVES: [
    {
      id: 'wave-1',
      startAngleDeg: 0,
      subWaves: [],
    },
  ] satisfies CombatWaveDefinition[],
} as const;
