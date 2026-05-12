import { CombatContentConfig } from '@config/CombatContentConfig';

export type DeckZone = 'deck' | 'collection';

export interface DeckDragTarget {
  zone: DeckZone;
  index: number;
}

const ALL_PAWN_IDS = CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => pawn.id);

export function getCollectionPawnIds(activeDeckIds: readonly string[]): string[] {
  const activeSet = new Set(activeDeckIds);
  return ALL_PAWN_IDS.filter((pawnId) => !activeSet.has(pawnId));
}

export function swapDeckSelection(
  activeDeckIds: readonly string[],
  source: DeckDragTarget,
  target: DeckDragTarget,
): string[] {
  const nextDeckIds = [...activeDeckIds];
  const collectionPawnIds = getCollectionPawnIds(activeDeckIds);

  if (source.zone === 'collection' && target.zone === 'collection') {
    return nextDeckIds;
  }

  if (source.zone === 'deck' && target.zone === 'deck') {
    if (source.index === target.index) {
      return nextDeckIds;
    }

    const sourcePawnId = nextDeckIds[source.index];
    const targetPawnId = nextDeckIds[target.index];
    if (!sourcePawnId || !targetPawnId) {
      return nextDeckIds;
    }

    nextDeckIds[source.index] = targetPawnId;
    nextDeckIds[target.index] = sourcePawnId;
    return nextDeckIds;
  }

  const sourcePawnId = source.zone === 'deck'
    ? nextDeckIds[source.index]
    : collectionPawnIds[source.index];
  const targetPawnId = target.zone === 'deck'
    ? nextDeckIds[target.index]
    : collectionPawnIds[target.index];

  if (!sourcePawnId || !targetPawnId) {
    return nextDeckIds;
  }

  if (source.zone === 'deck' && target.zone === 'collection') {
    nextDeckIds[source.index] = targetPawnId;
    return nextDeckIds;
  }

  if (source.zone === 'collection' && target.zone === 'deck') {
    nextDeckIds[target.index] = sourcePawnId;
    return nextDeckIds;
  }

  return nextDeckIds;
}
