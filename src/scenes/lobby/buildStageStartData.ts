export interface LobbyStageStartSettings {
  mergeRule: 'random' | 'fixed';
  sellEnabled: boolean;
}

export interface LobbyStageStartData {
  stageId: string;
  activeDeckIds: string[];
  settings: LobbyStageStartSettings;
}

export function buildStageStartData(input: {
  stageId: string;
  activeDeckIds: readonly string[];
  settings: LobbyStageStartSettings;
}): LobbyStageStartData {
  return {
    stageId: input.stageId,
    activeDeckIds: [...input.activeDeckIds],
    settings: { ...input.settings },
  };
}
