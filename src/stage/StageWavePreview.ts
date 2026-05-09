import { getEnemyDefinitionById } from '@config/CombatContentConfig';
import type { StageWaveDefinition, StageWavePreviewModel } from '@config/StageConfig';

export type { StageWavePreviewModel };

export function createStageWavePreview(
  wave: StageWaveDefinition,
  currentWave: number,
  totalWaves: number,
): StageWavePreviewModel {
  let specialEnemyName: string | null = null;

  if (wave.specialEnemyId !== null) {
    const definition = getEnemyDefinitionById(wave.specialEnemyId);
    specialEnemyName = definition?.displayName ?? null;
  }

  return {
    waveNumber: currentWave,
    totalWaves,
    waveKind: wave.kind,
    tags: [...wave.tags],
    specialEnemyId: wave.specialEnemyId,
    specialEnemyName,
  };
}
