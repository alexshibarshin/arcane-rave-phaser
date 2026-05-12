import { describe, expect, it } from 'vitest';
import { resolveStageDropTarget } from './StageDropTarget';

describe('resolveStageDropTarget', () => {
  it('prefers a valid slot over the sell overlay during slot drags', () => {
    expect(resolveStageDropTarget({
      closestSlotIndex: 5,
      sellOverlayVisible: true,
      sellOverlayContainsPoint: true,
      canSell: true,
      activeDragKind: 'slot-pawn',
    })).toEqual({ kind: 'slot', slotIndex: 5 });
  });

  it('returns sell when no slot is matched and the sell overlay contains the point', () => {
    expect(resolveStageDropTarget({
      closestSlotIndex: null,
      sellOverlayVisible: true,
      sellOverlayContainsPoint: true,
      canSell: true,
      activeDragKind: 'slot-pawn',
    })).toEqual({ kind: 'sell' });
  });

  it('returns none when neither a slot nor sell target matches', () => {
    expect(resolveStageDropTarget({
      closestSlotIndex: null,
      sellOverlayVisible: false,
      sellOverlayContainsPoint: false,
      canSell: true,
      activeDragKind: 'shop-offer',
    })).toEqual({ kind: 'none' });
  });
});
