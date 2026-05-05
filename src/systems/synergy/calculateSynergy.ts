import type { CombatPawnDefinition, NoteColor } from '@config/CombatContentConfig';

export interface SynergyLink {
  fromSlot: number;
  toSlot: number;
  hasSynergy: boolean;
}

export function calculateSynergy(
  slotPawnIds: Array<string | null>,
  pawnDefinitions: CombatPawnDefinition[],
  slotCount: number,
): SynergyLink[] {
  const links: SynergyLink[] = [];

  for (let i = 0; i < slotCount; i += 1) {
    const toSlot = (i + 1) % slotCount;
    const fromId = slotPawnIds[i];
    const toId = slotPawnIds[toSlot];

    if (fromId === null || toId === null) {
      continue;
    }

    const fromPawn = pawnDefinitions.find((p) => p.id === fromId);
    const toPawn = pawnDefinitions.find((p) => p.id === toId);

    if (!fromPawn || !toPawn) {
      continue;
    }

    const fromOutput = getPawnOutputColor(fromPawn);
    const toInput = getPawnInputColor(toPawn);

    links.push({
      fromSlot: i,
      toSlot,
      hasSynergy: fromOutput === toInput,
    });
  }

  return links;
}

function getPawnOutputColor(pawn: CombatPawnDefinition): NoteColor | null {
  if (pawn.type === 'generator') {
    return pawn.color;
  }

  if (pawn.type === 'finisher') {
    return pawn.outputNoteColor;
  }

  return null;
}

function getPawnInputColor(pawn: CombatPawnDefinition): NoteColor | null {
  return pawn.color;
}
