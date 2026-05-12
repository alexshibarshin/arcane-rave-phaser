import { StageFlowConfig } from '@config/StageFlowConfig';

export interface MergeResult {
  pawnId: string;
  tier: number;
}

export interface MergeStrategy {
  /** Returns a resolved result, or null if the strategy requires interactive choice from user */
  tryResolve(pawnId: string, tier: number, deckIds: readonly string[], random: () => number): MergeResult | null;
  /** Returns available choices when tryResolve returns null (for future Choice Upgrade) */
  getChoices(pawnId: string, tier: number, deckIds: readonly string[], random: () => number): MergeResult[];
}

export class RandomMergeStrategy implements MergeStrategy {
  tryResolve(_pawnId: string, tier: number, deckIds: readonly string[], random: () => number): MergeResult | null {
    const index = Math.floor(random() * deckIds.length);
    return {
      pawnId: deckIds[index] ?? deckIds[0]!,
      tier: Math.min(tier + 1, StageFlowConfig.MAX_PAWN_TIER),
    };
  }

  getChoices(_pawnId: string, _tier: number, _deckIds: readonly string[], _random: () => number): MergeResult[] {
    return [];
  }
}

export class FixedMergeStrategy implements MergeStrategy {
  tryResolve(pawnId: string, tier: number, _deckIds: readonly string[], _random: () => number): MergeResult | null {
    return {
      pawnId,
      tier: Math.min(tier + 1, StageFlowConfig.MAX_PAWN_TIER),
    };
  }

  getChoices(_pawnId: string, _tier: number, _deckIds: readonly string[], _random: () => number): MergeResult[] {
    return [];
  }
}

export class ChooseMergeStrategy implements MergeStrategy {
  tryResolve(_pawnId: string, _tier: number, _deckIds: readonly string[], _random: () => number): MergeResult | null {
    return null;
  }

  getChoices(_pawnId: string, tier: number, deckIds: readonly string[], random: () => number): MergeResult[] {
    const pool = [...deckIds];
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const current = pool[index]!;
      pool[index] = pool[swapIndex]!;
      pool[swapIndex] = current;
    }

    const nextTier = Math.min(tier + 1, StageFlowConfig.MAX_PAWN_TIER);
    return pool.slice(0, 3).map((pawnId) => ({
      pawnId,
      tier: nextTier,
    }));
  }
}
