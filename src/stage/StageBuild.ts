import {
  CombatContentConfig,
  getCombatActivePawnDeckIds,
} from '@config/CombatContentConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import type { MergeStrategy } from './MergeStrategy';

export interface StagePawnInstance {
  pawnId: string;
  tier: number;
}

export interface StageBuildState {
  slots: Array<StagePawnInstance | null>;
  shopOffers: string[];
  shopPurchaseCounts: Record<string, number>;
  rerollCount: number;
}

export function createStageBuildState(random: () => number = Math.random): StageBuildState {
  return {
    slots: Array.from({ length: CombatContentConfig.SLOT_COUNT }, () => null),
    shopOffers: drawStageShopOffers(random),
    shopPurchaseCounts: {},
    rerollCount: 0,
  };
}

export function drawStageShopOffers(random: () => number = Math.random): string[] {
  const activeDeckIds = getCombatActivePawnDeckIds();

  return Array.from({ length: StageFlowConfig.SHOP_OFFER_COUNT }, () => {
    const index = Math.floor(random() * activeDeckIds.length);
    return activeDeckIds[index] ?? activeDeckIds[0]!;
  });
}

export function purchaseStagePawn(
  build: StageBuildState,
  coins: number,
  offerIndex: number,
  slotIndex: number,
  price: number,
): boolean {
  if (coins < price) {
    return false;
  }

  if (!isValidSlotIndex(slotIndex) || build.slots[slotIndex] !== null) {
    return false;
  }

  const offer = build.shopOffers[offerIndex];
  if (!offer) {
    return false;
  }

  build.slots[slotIndex] = createStagePawnInstance(offer);
  build.shopOffers.splice(offerIndex, 1);
  build.shopPurchaseCounts[offer] = (build.shopPurchaseCounts[offer] ?? 0) + 1;
  return true;
}

export function purchaseStagePawnMerge(
  build: StageBuildState,
  coins: number,
  offerIndex: number,
  slotIndex: number,
  price: number,
  strategy: MergeStrategy,
  random: () => number = Math.random,
): boolean {
  if (coins < price || !isValidSlotIndex(slotIndex)) {
    return false;
  }

  const offer = build.shopOffers[offerIndex];
  if (!offer) {
    return false;
  }

  const targetPawn = build.slots[slotIndex];
  const purchasedPawn = createStagePawnInstance(offer);

  if (!targetPawn || !canMergeStagePawns(purchasedPawn, targetPawn)) {
    return false;
  }

  const result = strategy.tryResolve(targetPawn.pawnId, targetPawn.tier, random);
  if (!result) {
    return false;
  }

  build.slots[slotIndex] = {
    pawnId: result.pawnId,
    tier: Math.min(result.tier, StageFlowConfig.MAX_PAWN_TIER),
  };
  build.shopOffers.splice(offerIndex, 1);
  build.shopPurchaseCounts[offer] = (build.shopPurchaseCounts[offer] ?? 0) + 1;
  return true;
}

export function moveStagePawn(
  build: StageBuildState,
  coins: number,
  fromSlotIndex: number,
  toSlotIndex: number,
): boolean {
  if (coins < StageFlowConfig.REPOSITION_COST) {
    return false;
  }

  if (!isValidSlotIndex(fromSlotIndex) || !isValidSlotIndex(toSlotIndex) || fromSlotIndex === toSlotIndex) {
    return false;
  }

  const fromPawn = build.slots[fromSlotIndex];
  if (fromPawn == null) {
    return false;
  }

  const toPawn = build.slots[toSlotIndex] ?? null;
  build.slots[fromSlotIndex] = toPawn;
  build.slots[toSlotIndex] = fromPawn;
  return true;
}

export function mergeStagePawn(
  build: StageBuildState,
  fromSlotIndex: number,
  toSlotIndex: number,
  strategy: MergeStrategy,
  random: () => number = Math.random,
): boolean {
  if (!isValidSlotIndex(fromSlotIndex) || !isValidSlotIndex(toSlotIndex) || fromSlotIndex === toSlotIndex) {
    return false;
  }

  const fromPawn = build.slots[fromSlotIndex];
  const toPawn = build.slots[toSlotIndex];

  if (!fromPawn || !toPawn || !canMergeStagePawns(fromPawn, toPawn)) {
    return false;
  }

  const result = strategy.tryResolve(toPawn.pawnId, toPawn.tier, random);
  if (!result) {
    return false;
  }

  build.slots[fromSlotIndex] = null;
  build.slots[toSlotIndex] = {
    pawnId: result.pawnId,
    tier: Math.min(result.tier, StageFlowConfig.MAX_PAWN_TIER),
  };
  return true;
}

export function getStageBuildSlotPawnIds(
  build: StageBuildState,
): Array<string | null> {
  return build.slots.map((slot) => slot?.pawnId ?? null);
}

export function getMergeTargets(
  build: StageBuildState,
  sourceSlotIndex: number,
): number[] {
  const sourcePawn = build.slots[sourceSlotIndex];
  if (!sourcePawn) {
    return [];
  }
  return getMergeTargetsForPawn(build, sourcePawn, sourceSlotIndex);
}

export function getMergeTargetsForPawn(
  build: StageBuildState,
  pawn: StagePawnInstance,
  excludeSlotIndex?: number,
): number[] {
  const targets: number[] = [];
  for (let i = 0; i < build.slots.length; i += 1) {
    if (excludeSlotIndex !== undefined && i === excludeSlotIndex) {
      continue;
    }
    const candidate = build.slots[i];
    if (candidate && canMergeStagePawns(pawn, candidate)) {
      targets.push(i);
    }
  }
  return targets;
}

export function rerollStageShop(
  build: StageBuildState,
  coins: number,
  random: () => number = Math.random,
): boolean {
  if (coins < getStageRerollCost(build)) {
    return false;
  }

  build.shopOffers = drawStageShopOffers(random);
  build.rerollCount += 1;
  return true;
}

export function getStageRerollCost(build: StageBuildState): number {
  return StageFlowConfig.SHOP_REROLL_BASE_COST + build.rerollCount * StageFlowConfig.SHOP_REROLL_INCREMENT;
}

function canMergeStagePawns(left: StagePawnInstance, right: StagePawnInstance): boolean {
  return left.pawnId === right.pawnId && left.tier === right.tier && left.tier < StageFlowConfig.MAX_PAWN_TIER;
}

function createStagePawnInstance(pawnId: string): StagePawnInstance {
  return {
    pawnId,
    tier: 1,
  };
}

function isValidSlotIndex(slotIndex: number): boolean {
  return slotIndex >= 0 && slotIndex < CombatContentConfig.SLOT_COUNT;
}
