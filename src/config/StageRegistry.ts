import { STAGE_CONFIGS, type StageConfig } from '@config/StageConfig';

export function getStageConfig(stageId: string): StageConfig | undefined {
  return STAGE_CONFIGS.find((s) => s.id === stageId);
}

export function getAllStageConfigs(): StageConfig[] {
  return [...STAGE_CONFIGS];
}
