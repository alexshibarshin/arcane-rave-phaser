import { COMBAT_NEEDLE_ANGLE_DEGREES } from './CombatLayout';
import type { CombatRuntime, CombatSlotRuntime } from './CombatRuntime';

export interface CombatSlotCrossing {
  slotIndex: number;
  crossingAngle: number;
}

export function advanceCombatRotation(
  runtime: CombatRuntime,
  deltaMs: number,
): CombatSlotCrossing[] {
  runtime.record.previousAngle = runtime.record.currentAngle;
  runtime.record.currentAngle -=
    runtime.record.rotationSpeedDegPerSecond * (deltaMs / 1000);

  return runtime.slots
    .flatMap((slot) =>
      detectCombatSlotCrossings(
        slot,
        runtime.record.previousAngle,
        runtime.record.currentAngle,
      ),
    )
    .sort((left, right) => right.crossingAngle - left.crossingAngle);
}

export function detectCombatSlotCrossings(
  slot: CombatSlotRuntime,
  previousAngle: number,
  currentAngle: number,
): CombatSlotCrossing[] {
  if (slot.sectorCenterAngleDeg === null || currentAngle >= previousAngle) {
    return [];
  }

  const baseCrossingAngle = COMBAT_NEEDLE_ANGLE_DEGREES - slot.sectorCenterAngleDeg;
  const firstCycle = Math.floor((currentAngle - baseCrossingAngle) / 360);
  const lastCycle = Math.floor((previousAngle - baseCrossingAngle) / 360);
  const crossings: CombatSlotCrossing[] = [];

  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    const crossingAngle = baseCrossingAngle + cycle * 360;

    if (crossingAngle <= previousAngle && crossingAngle > currentAngle) {
      crossings.push({
        slotIndex: slot.slotIndex,
        crossingAngle,
      });
    }
  }

  return crossings;
}
