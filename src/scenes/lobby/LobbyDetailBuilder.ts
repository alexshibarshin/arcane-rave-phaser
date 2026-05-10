import type { StageConfig } from '../../config/StageConfig';
import type { StageResult } from '../../session/SessionProgressStore';

export interface LobbyDetailModel {
  stageId: string;
  displayName: string;
  stageTags: string[];
  eliteEnemyId: string | null;
  bossEnemyId: string | null;
  dominantColorTag: string | undefined;
  sessionResult: { stars: number; bestHp: number } | null;
}

/** Extract first color tag from tags array */
function extractDominantColorTag(tags: string[]): string | undefined {
  const colorTags = new Set(['Red', 'Green', 'Blue']);
  return tags.find((t) => colorTags.has(t));
}

/**
 * Build a detail panel data model from a stage ID.
 * Returns null if stageId is null or config not found.
 */
export function buildLobbyDetailModel(
  stageId: string | null,
  getConfig: (id: string) => StageConfig | undefined,
  getResult?: (id: string) => StageResult | null,
): LobbyDetailModel | null {
  if (!stageId) return null;

  const config = getConfig(stageId);
  if (!config) return null;

  const result = getResult ? getResult(stageId) : null;
  const tags = config.stageTags ?? [];

  return {
    stageId: config.id,
    displayName: config.displayName,
    stageTags: tags,
    eliteEnemyId: config.eliteEnemyId ?? null,
    bossEnemyId: config.bossEnemyId ?? null,
    dominantColorTag: extractDominantColorTag(tags),
    sessionResult: result ? { stars: result.stars, bestHp: result.bestRemainingBaseHp ?? 0 } : null,
  };
}
