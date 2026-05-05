export interface CombatSceneSlotPawnSource {
  pawnId: string | null;
}

export function resolveCombatSceneSlotPawnIds(
  slotPawnIds: Array<string | null> | undefined,
  runtime: { slots: CombatSceneSlotPawnSource[] },
): Array<string | null> {
  if (slotPawnIds) {
    return [...slotPawnIds];
  }

  return runtime.slots.map((slot) => slot.pawnId);
}
