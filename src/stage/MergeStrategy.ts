import { StageFlowConfig } from '@config/StageFlowConfig';

export interface MergeResult {
  pawnId: string;
  tier: number;
}

export interface MergeStrategy {
  /** Returns a resolved result, or null if the strategy requires interactive choice from user */
  tryResolve(pawnId: string, tier: number, deckIds: readonly string[], random: () => number): MergeResult | null;
  /** Returns available choices when tryResolve returns null (for future Choice Upgrade) */
  getChoices(pawnId: string, tier: number, deckIds: readonly string[]): MergeResult[];
}

export class RandomMergeStrategy implements MergeStrategy {
  tryResolve(_pawnId: string, tier: number, deckIds: readonly string[], random: () => number): MergeResult | null {
    const index = Math.floor(random() * deckIds.length);
    return {
      pawnId: deckIds[index] ?? deckIds[0]!,
      tier: Math.min(tier + 1, StageFlowConfig.MAX_PAWN_TIER),
    };
  }

  getChoices(_pawnId: string, _tier: number, _deckIds: readonly string[]): MergeResult[] {
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

  getChoices(_pawnId: string, _tier: number, _deckIds: readonly string[]): MergeResult[] {
    return [];
  }
}
