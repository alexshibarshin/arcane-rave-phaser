import type { CombatBeamAbilityDefinition, CombatPawnDefinition } from '@config/CombatContentConfig';
import { createBeam, DEFAULT_SWEEP_ARC_DEG } from './CombatBeams';
import { selectFrontmostEnemy, selectFrontmostEnemyExcluding } from './CombatTargeting';
import type { CombatBeamRuntime, CombatRuntime, CombatSourceSnapshot } from './CombatRuntime';

export function spawnExtraBeams(
  runtime: CombatRuntime,
  slotIndex: number,
  pawn: CombatPawnDefinition,
  ability: CombatBeamAbilityDefinition,
  sourceSnapshot: CombatSourceSnapshot,
  extraBeamCount: number,
): void {
  for (let i = 0; i < extraBeamCount; i++) {
    if (ability.pattern === 'lock-on-beam') {
      spawnExtraLockOnBeam(runtime, slotIndex, pawn, ability, sourceSnapshot);
    } else if (ability.pattern === 'sweeping-beam') {
      spawnExtraSweepingBeam(runtime, slotIndex, pawn, ability, sourceSnapshot);
    }
  }
}

function spawnExtraLockOnBeam(
  runtime: CombatRuntime,
  slotIndex: number,
  pawn: CombatPawnDefinition,
  ability: CombatBeamAbilityDefinition,
  sourceSnapshot: CombatSourceSnapshot,
): void {
  const existingBeam = findLastBeamForSlot(runtime, slotIndex);
  const firstTargetId = existingBeam?.targetEnemyRuntimeId;

  if (!firstTargetId) {
    const fallbackTarget = selectFrontmostEnemy(runtime);
    if (fallbackTarget) {
      createBeam(
        runtime, pawn, slotIndex, sourceSnapshot, ability.damage, ability.durationMs,
        ability.tickIntervalMs ?? null, 'lock-on', null, null, null,
        fallbackTarget,
      );
    }
    return;
  }

  const secondTarget = selectFrontmostEnemyExcluding(runtime, [firstTargetId]);

  if (!secondTarget) {
    return;
  }

  createBeam(
    runtime, pawn, slotIndex, sourceSnapshot, ability.damage, ability.durationMs,
    ability.tickIntervalMs ?? null, 'lock-on', null, null, null,
    secondTarget,
  );
}

function spawnExtraSweepingBeam(
  runtime: CombatRuntime,
  slotIndex: number,
  pawn: CombatPawnDefinition,
  ability: CombatBeamAbilityDefinition,
  sourceSnapshot: CombatSourceSnapshot,
): void {
  const sweepArcDeg = ability.sweepArcDeg ?? DEFAULT_SWEEP_ARC_DEG;
  const reverseSweepArcDeg = -sweepArcDeg;

  createBeam(
    runtime, pawn, slotIndex, sourceSnapshot, ability.damage, ability.durationMs,
    ability.tickIntervalMs ?? null, 'sweeping',
    reverseSweepArcDeg,
    ability.sweepLengthPx ?? null,
    ability.sweepHitRadiusPx ?? null,
  );
}

function findLastBeamForSlot(runtime: CombatRuntime, slotIndex: number): CombatBeamRuntime | undefined {
  for (let i = runtime.beams.length - 1; i >= 0; i--) {
    if (runtime.beams[i]!.slotIndex === slotIndex) {
      return runtime.beams[i];
    }
  }
  return undefined;
}
