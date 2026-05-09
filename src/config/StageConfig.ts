import { CombatWaveConfig, type CombatWaveDefinition } from '@config/CombatWaveConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { redlineRoutineConfig } from '@config/stages/RedlineRoutine';
import { blueNoiseRushConfig } from '@config/stages/BlueNoiseRush';

export interface SubWaveDefinition {
  id: string;
  startTimeMs: number;
  spawnIntervalMs: number;
  enemies: Record<string, number>;
}

export interface StageWaveDefinition {
  kind: 'normal' | 'elite' | 'boss';
  tags: string[];
  specialEnemyId: string | null;
  subWaves: SubWaveDefinition[];
}

export interface StageWavePreviewModel {
  waveNumber: number;
  totalWaves: number;
  waveKind: 'normal' | 'elite' | 'boss';
  tags: string[];
  specialEnemyId: string | null;
  specialEnemyName: string | null;
}

export interface SlotModifierCountWeights {
  0: number;
  1: number;
  2: number;
  3: number;
}

export interface StageConfig {
  id: string;
  displayName: string;
  totalWaves: number;
  initialCoins: number;
  waveDefinitions: CombatWaveDefinition[];
  slotModifierCountWeights: SlotModifierCountWeights;
  slotModifierWeightOverrides?: Record<string, number>;
  stageTags?: string[];
  eliteEnemyId?: string;
  bossEnemyId?: string;
  hpMultipliers?: number[];
  waves?: StageWaveDefinition[];
}

const stageConfigs: StageConfig[] = [
  {
    id: 'stage-1',
    displayName: 'First Contact',
    totalWaves: CombatWaveConfig.WAVES.length,
    initialCoins: StageFlowConfig.INITIAL_COINS,
    waveDefinitions: [...CombatWaveConfig.WAVES],
    slotModifierCountWeights: { 0: 1, 1: 3, 2: 2, 3: 1 },
  },
  redlineRoutineConfig,
  blueNoiseRushConfig,
];

export const STAGE_CONFIGS: readonly StageConfig[] = stageConfigs;

export function getStageConfig(stageId: string): StageConfig | undefined {
  return stageConfigs.find((s) => s.id === stageId);
}
