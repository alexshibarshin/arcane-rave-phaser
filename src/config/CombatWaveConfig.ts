export interface CombatSubWaveConfig {
  id: string;
  startTimeMs: number;
  spawnIntervalMs: number;
  enemies: Record<string, number>;
}
