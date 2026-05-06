import { pushCombatPawnBuffApplied, pushCombatPawnBuffConsumed } from './CombatRuntimeEvents';
import type { CombatPawnBuffRuntime, CombatRuntime } from './CombatRuntime';

export function advanceCombatPawnBuffs(_runtime: CombatRuntime): void {
  // MVP buffs have no real-time ticking behavior.
}

export function applyNextSlotDamageBuff(
  runtime: CombatRuntime,
  sourceSlotIndex: number,
  sourcePawnId: string,
  damageBonusPercent: number,
): void {
  const targetSlotIndex = (sourceSlotIndex + 1) % runtime.slots.length;
  const targetSlot = runtime.slots[targetSlotIndex];

  if (!targetSlot || targetSlot.pawnId === null) {
    return;
  }

  const nextBuff: CombatPawnBuffRuntime = {
    kind: 'next-slot-damage-buff',
    slotIndex: targetSlotIndex,
    sourcePawnId,
    damageBonusPercent,
  };
  const currentBuff = runtime.pawnBuffs[targetSlotIndex];

  if (!currentBuff || damageBonusPercent > currentBuff.damageBonusPercent) {
    runtime.pawnBuffs[targetSlotIndex] = nextBuff;
    pushCombatPawnBuffApplied(runtime, targetSlotIndex, sourcePawnId, damageBonusPercent);
  }
}

export function readPendingSlotDamageBuff(
  runtime: CombatRuntime,
  slotIndex: number,
): CombatPawnBuffRuntime | null {
  return runtime.pawnBuffs[slotIndex] ?? null;
}

export function consumePendingSlotDamageBuff(runtime: CombatRuntime, slotIndex: number): void {
  const buff = runtime.pawnBuffs[slotIndex];

  if (!buff) {
    return;
  }

  runtime.pawnBuffs[slotIndex] = null;
  pushCombatPawnBuffConsumed(runtime, slotIndex, buff.sourcePawnId, buff.damageBonusPercent);
}

export function clearCombatPawnBuffs(runtime: CombatRuntime): void {
  runtime.pawnBuffs = Array.from({ length: runtime.slots.length }, () => null);
}
