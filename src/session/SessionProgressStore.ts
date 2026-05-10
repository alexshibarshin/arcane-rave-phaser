export interface StageResult {
  stageId: string;
  stars: number;
  bestRemainingBaseHp: number | null;
}

interface StageEntry {
  stars: number;
  bestRemainingBaseHp: number | null;
}

function isBetter(newResult: StageResult, oldEntry: StageEntry | undefined): boolean {
  if (!oldEntry) return true;
  if (newResult.stars > oldEntry.stars) return true;
  if (
    newResult.stars === oldEntry.stars &&
    (newResult.bestRemainingBaseHp ?? 0) > (oldEntry.bestRemainingBaseHp ?? 0)
  )
    return true;
  return false;
}

function createStore() {
  const results = new Map<string, StageEntry>();
  let lastSelectedStageId: string | null = null;

  return {
    getResult(stageId: string): StageResult | null {
      const entry = results.get(stageId);
      if (!entry) return null;
      return { stageId, ...entry };
    },

    setResult(stageId: string, result: StageResult): void {
      const oldEntry = results.get(stageId);
      if (!isBetter(result, oldEntry)) return;
      results.set(stageId, {
        stars: result.stars,
        bestRemainingBaseHp: result.bestRemainingBaseHp,
      });
    },

    getLastSelectedStageId(): string | null {
      return lastSelectedStageId;
    },

    setLastSelectedStageId(stageId: string): void {
      lastSelectedStageId = stageId;
    },
  };
}

export const SessionProgressStore = createStore();
