import { CombatContentConfig } from '@config/CombatContentConfig';
import type { CombatWaveDefinition } from '@config/CombatWaveConfig';

export interface StageWavePreviewModel {
  bodyLines: string[];
  archetypeSummary: string;
}

export function createStageWavePreview(
  wave: CombatWaveDefinition,
  currentWave: number,
  totalWaves: number,
): StageWavePreviewModel {
  const enemyTotals = new Map<string, number>();
  const colorTotals = new Map<string, number>();
  let enemyCount = 0;

  for (const subWave of wave.subWaves) {
    for (const [enemyId, count] of Object.entries(subWave.enemies)) {
      enemyCount += count;
      const definition = CombatContentConfig.ENEMY_DEFINITIONS.find((enemy) => enemy.id === enemyId);

      if (!definition) {
        continue;
      }

      enemyTotals.set(definition.archetype, (enemyTotals.get(definition.archetype) ?? 0) + count);
      colorTotals.set(definition.color, (colorTotals.get(definition.color) ?? 0) + count);
    }
  }

  const archetypeSummary = Array.from(enemyTotals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([archetype, count]) => `${capitalize(archetype)} x${count}`)
    .join(', ');

  const colorSummary = Array.from(colorTotals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([color, count]) => `${capitalize(color)} x${count}`)
    .join(', ');

  return {
    bodyLines: [
      `Wave ${currentWave}/${totalWaves}`,
      `Enemies ${enemyCount}`,
      colorSummary,
    ].filter((line) => line.length > 0),
    archetypeSummary: archetypeSummary,
  };
}

function capitalize(value: string): string {
  return value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
}
