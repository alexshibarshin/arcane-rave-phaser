import { CombatWaveConfig, type CombatWaveDefinition } from '@config/CombatWaveConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';

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
];

export const STAGE_CONFIGS: readonly StageConfig[] = stageConfigs;

export function getStageConfig(stageId: string): StageConfig | undefined {
  return stageConfigs.find((s) => s.id === stageId);
}
