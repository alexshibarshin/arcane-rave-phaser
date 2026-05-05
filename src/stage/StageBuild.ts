import { CombatContentConfig } from '@config/CombatContentConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';

export interface StageBuildState {
  slots: Array<string | null>;
  shopOffers: string[];
  shopPurchaseCounts: Record<string, number>;
}

export function createStageBuildState(random: () => number = Math.random): StageBuildState {
  return {
    slots: Array.from({ length: CombatContentConfig.SLOT_COUNT }, () => null),
    shopOffers: drawStageShopOffers(random),
    shopPurchaseCounts: {},
  };
}

export function drawStageShopOffers(random: () => number = Math.random): string[] {
  return Array.from({ length: StageFlowConfig.SHOP_OFFER_COUNT }, () => {
    const index = Math.floor(random() * CombatContentConfig.PAWN_DEFINITIONS.length);
    return CombatContentConfig.PAWN_DEFINITIONS[index]?.id ?? CombatContentConfig.PAWN_DEFINITIONS[0]!.id;
  });
}

export function purchaseStagePawn(
  build: StageBuildState,
  coins: number,
  offerIndex: number,
  slotIndex: number,
): boolean {
  if (coins < StageFlowConfig.SHOP_PURCHASE_COST) {
    return false;
  }

  if (!isValidSlotIndex(slotIndex) || build.slots[slotIndex] !== null) {
    return false;
  }

  const offer = build.shopOffers[offerIndex];
  if (!offer) {
    return false;
  }

  build.slots[slotIndex] = offer;
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

function isValidSlotIndex(slotIndex: number): boolean {
  return slotIndex >= 0 && slotIndex < CombatContentConfig.SLOT_COUNT;
}
