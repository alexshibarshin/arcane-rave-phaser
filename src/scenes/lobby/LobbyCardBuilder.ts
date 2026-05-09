import type { StageConfig } from '../../config/StageConfig';
import type { StageResult } from '../../session/SessionProgressStore';

/** First color tag from stageTags, or undefined if none match */
function extractDominantColorTag(tags: string[] | undefined): string | undefined {
  if (!tags) return undefined;
  const colorTags = new Set(['Red', 'Blue', 'Green']);
  return tags.find((t) => colorTags.has(t));
}

export interface LobbyCardModel {
  stageId: string;
  displayName: string;
  stars: number;
  bestHp: number | null;
  dominantColorTag: string | undefined;
  isSelected: boolean;
}

export function buildLobbyCards(
  configs: StageConfig[],
  getResult: (stageId: string) => StageResult | null,
  selectedStageId: string | null,
): LobbyCardModel[] {
  return configs.map((config) => {
    const result = getResult(config.id);
    const stars = result ? result.stars : 0;
    const bestHp = stars > 0 ? result?.bestRemainingBaseHp ?? null : null;

    return {
      stageId: config.id,
      displayName: config.displayName,
      stars,
      bestHp,
      dominantColorTag: extractDominantColorTag(config.stageTags),
      isSelected: config.id === selectedStageId,
    };
  });
}
