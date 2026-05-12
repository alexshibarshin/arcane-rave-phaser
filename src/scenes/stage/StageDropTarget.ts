export interface StageDropTarget {
  kind: 'sell' | 'slot' | 'none';
  slotIndex?: number;
}

export function resolveStageDropTarget(input: {
  closestSlotIndex: number | null;
  sellOverlayVisible: boolean;
  sellOverlayContainsPoint: boolean;
  canSell: boolean;
  activeDragKind: 'shop-offer' | 'slot-pawn' | null;
}): StageDropTarget {
  if (input.closestSlotIndex !== null) {
    return { kind: 'slot', slotIndex: input.closestSlotIndex };
  }

  if (
    input.canSell
    && input.activeDragKind === 'slot-pawn'
    && input.sellOverlayVisible
    && input.sellOverlayContainsPoint
  ) {
    return { kind: 'sell' };
  }

  return { kind: 'none' };
}
