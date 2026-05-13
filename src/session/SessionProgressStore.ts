import { CombatContentConfig, getCombatDefaultPawnDeckIds } from '@config/CombatContentConfig';

export interface StageResult {
  stageId: string;
  stars: number;
  bestRemainingBaseHp: number | null;
}

interface StageEntry {
  stars: number;
  bestRemainingBaseHp: number | null;
}

function normalizeActiveDeckIds(activeDeckIds: readonly string[]): string[] {
  if (activeDeckIds.length !== CombatContentConfig.SLOT_COUNT) {
    throw new Error(`Session deck must contain exactly ${CombatContentConfig.SLOT_COUNT} pawn ids.`);
  }

  const knownPawnIds = new Set(CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => pawn.id));
  const uniquePawnIds = new Set<string>();

  for (const pawnId of activeDeckIds) {
    if (!knownPawnIds.has(pawnId)) {
      throw new Error(`Session deck references unknown pawn "${pawnId}".`);
    }
    if (uniquePawnIds.has(pawnId)) {
      throw new Error(`Session deck references duplicate pawn "${pawnId}".`);
    }
    uniquePawnIds.add(pawnId);
  }

  return [...activeDeckIds];
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
  let mergeRule: 'random' | 'fixed' | 'choose' = 'random';
  let sellEnabled = true;
  let repositionCostEnabled = true;
  let activeDeckIds = normalizeActiveDeckIds(getCombatDefaultPawnDeckIds());

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

    getMergeRule(): 'random' | 'fixed' | 'choose' {
      return mergeRule;
    },

    setMergeRule(rule: 'random' | 'fixed' | 'choose'): void {
      mergeRule = rule;
    },

    getSellEnabled(): boolean {
      return sellEnabled;
    },

    setSellEnabled(enabled: boolean): void {
      sellEnabled = enabled;
    },

    getRepositionCostEnabled(): boolean {
      return repositionCostEnabled;
    },

    setRepositionCostEnabled(enabled: boolean): void {
      repositionCostEnabled = enabled;
    },

    getActiveDeckIds(): string[] {
      return [...activeDeckIds];
    },

    setActiveDeckIds(nextDeckIds: readonly string[]): void {
      activeDeckIds = normalizeActiveDeckIds(nextDeckIds);
    },
  };
}

export const SessionProgressStore = createStore();
