import { getCombatPawnDefinitionById, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { applyCombatHit } from './CombatDamage';
import { createRuntimeEffectId, getSlotOrigin, selectFrontmostEnemy } from './CombatTargeting';
import { applyEnemySlow } from './CombatStatuses';
import { pushCombatBeamStarted, pushCombatBeamTicked } from './CombatRuntimeEvents';
import type { CombatBeamRuntime, CombatRuntime, CombatSourceSnapshot } from './CombatRuntime';

const DEFAULT_SWEEP_ARC_DEG = 72;
const DEFAULT_SWEEP_LENGTH_PX = 520;
const DEFAULT_SWEEP_HIT_RADIUS_PX = 24;

export function createBeam(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  damage: number,
  durationMs: number,
  tickIntervalMs: number | null,
  beamType: 'lock-on' | 'sweeping',
  sweepArcDeg: number | null,
  sweepLengthPx: number | null,
  sweepHitRadiusPx: number | null,
): void {
  const slot = runtime.slots[slotIndex];
  const origin = slot ? getSlotOrigin(slot) : null;
  const target = selectFrontmostEnemy(runtime);

  if (!slot || !origin || !target) {
    return;
  }

  const targetAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const configuredSweepArcDeg = sweepArcDeg ?? DEFAULT_SWEEP_ARC_DEG;
  const configuredSweepLengthPx = sweepLengthPx ?? DEFAULT_SWEEP_LENGTH_PX;
  const configuredSweepHitRadiusPx = sweepHitRadiusPx ?? DEFAULT_SWEEP_HIT_RADIUS_PX;
  const sweepHalfArcRad = (configuredSweepArcDeg * Math.PI) / 360;
  const beam: CombatBeamRuntime = {
    runtimeId: createRuntimeEffectId(runtime, 'beam'),
    pawnId: pawn.id,
    slotIndex,
    color: pawn.color,
    beamType,
    damage,
    startedAtMs: runtime.combatElapsedMs,
    expiresAtMs: runtime.combatElapsedMs + durationMs,
    sourceSnapshot,
    targetEnemyRuntimeId: beamType === 'lock-on' ? target.runtimeId : null,
    tickIntervalMs,
    nextTickAtMs: tickIntervalMs === null ? null : runtime.combatElapsedMs,
    sweepStartAngleRad: beamType === 'sweeping' ? targetAngle - sweepHalfArcRad : null,
    sweepEndAngleRad: beamType === 'sweeping' ? targetAngle + sweepHalfArcRad : null,
    sweepLengthPx: beamType === 'sweeping' ? configuredSweepLengthPx : null,
    sweepHitRadiusPx: beamType === 'sweeping' ? configuredSweepHitRadiusPx : null,
    previouslyIntersectedEnemyRuntimeIds: [],
    slowOnHit: pawn.ability.secondaryEffect?.kind === 'slow-on-hit'
      ? {
          slowMultiplier: pawn.ability.secondaryEffect.slowMultiplier,
          durationMs: pawn.ability.secondaryEffect.durationMs,
        }
      : null,
  };

  runtime.beams.push(beam);
  pushCombatBeamStarted(runtime, beam.runtimeId, slotIndex, pawn.id);
}

export function advanceCombatBeams(runtime: CombatRuntime, _deltaMs: number): void {
  const remainingBeams: CombatBeamRuntime[] = [];

  for (const beam of runtime.beams) {
    const pawn = getCombatPawnDefinitionById(beam.pawnId);

    if (!pawn || beam.expiresAtMs <= runtime.combatElapsedMs) {
      continue;
    }

    if (beam.beamType === 'lock-on') {
      if (tickLockOnBeam(runtime, beam, pawn)) {
        remainingBeams.push(beam);
      }
      continue;
    }

    tickSweepingBeam(runtime, beam, pawn);
    remainingBeams.push(beam);
  }

  runtime.beams = remainingBeams;
}

export function clearCombatBeams(runtime: CombatRuntime): void {
  runtime.beams = [];
}

function tickLockOnBeam(
  runtime: CombatRuntime,
  beam: CombatBeamRuntime,
  pawn: CombatPawnDefinition,
): boolean {
  let target: CombatRuntime['enemies'][number] | null =
    runtime.enemies.find((enemy) => enemy.runtimeId === beam.targetEnemyRuntimeId)
    ?? null;

  if (!target || !target.spawned || target.state === 'dead' || target.currentHp <= 0) {
    target = selectFrontmostEnemy(runtime);

    if (!target) {
      return false;
    }

    beam.targetEnemyRuntimeId = target.runtimeId;
  }

  if (beam.nextTickAtMs === null || beam.tickIntervalMs === null) {
    return false;
  }

  while (beam.nextTickAtMs <= runtime.combatElapsedMs) {
    applyCombatHit({
      runtime,
      enemy: target,
      slotIndex: beam.slotIndex,
      pawn,
      baseDamage: beam.damage,
      sourceSnapshot: beam.sourceSnapshot,
      attackerColor: beam.color,
    });
    pushCombatBeamTicked(runtime, beam.runtimeId, beam.slotIndex, beam.pawnId, 1);
    beam.nextTickAtMs += beam.tickIntervalMs;
  }

  if (target.currentHp > 0) {
    return true;
  }

  const replacementTarget = selectFrontmostEnemy(runtime);

  if (!replacementTarget) {
    return false;
  }

  beam.targetEnemyRuntimeId = replacementTarget.runtimeId;
  return true;
}

function tickSweepingBeam(
  runtime: CombatRuntime,
  beam: CombatBeamRuntime,
  pawn: CombatPawnDefinition,
): void {
  const slot = runtime.slots[beam.slotIndex];
  const origin = slot ? getSlotOrigin(slot) : null;

  if (
    !origin
    || beam.sweepStartAngleRad === null
    || beam.sweepEndAngleRad === null
    || beam.sweepLengthPx === null
    || beam.sweepHitRadiusPx === null
  ) {
    return;
  }

  const progress = Math.min(1, Math.max(0, (runtime.combatElapsedMs - beam.startedAtMs) / Math.max(1, beam.expiresAtMs - beam.startedAtMs)));
  const angle = beam.sweepStartAngleRad + (beam.sweepEndAngleRad - beam.sweepStartAngleRad) * progress;
  const endX = origin.x + Math.cos(angle) * beam.sweepLengthPx;
  const endY = origin.y + Math.sin(angle) * beam.sweepLengthPx;
  const currentlyIntersected: string[] = [];
  let hitCount = 0;

  for (const enemy of runtime.enemies) {
    if (!enemy.spawned || enemy.state === 'dead' || enemy.currentHp <= 0) {
      continue;
    }

    if (!segmentHitsCircle(origin.x, origin.y, endX, endY, enemy.x, enemy.y, beam.sweepHitRadiusPx)) {
      continue;
    }

    currentlyIntersected.push(enemy.runtimeId);

    if (beam.previouslyIntersectedEnemyRuntimeIds.includes(enemy.runtimeId)) {
      continue;
    }

    hitCount += 1;
    applyCombatHit({
      runtime,
      enemy,
      slotIndex: beam.slotIndex,
      pawn,
      baseDamage: beam.damage,
      sourceSnapshot: beam.sourceSnapshot,
      attackerColor: beam.color,
    });

    if (beam.slowOnHit) {
      applyEnemySlow(runtime, enemy.runtimeId, beam.slowOnHit.slowMultiplier, beam.slowOnHit.durationMs);
    }
  }

  beam.previouslyIntersectedEnemyRuntimeIds = currentlyIntersected;

  if (hitCount > 0) {
    pushCombatBeamTicked(runtime, beam.runtimeId, beam.slotIndex, beam.pawnId, hitCount);
  }
}

function segmentHitsCircle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  centerY: number,
  radius: number,
): boolean {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0.0001) {
    return Math.hypot(centerX - startX, centerY - startY) <= radius;
  }

  const projection = ((centerX - startX) * dx + (centerY - startY) * dy) / lengthSquared;
  const clampedProjection = Math.min(1, Math.max(0, projection));
  const closestX = startX + dx * clampedProjection;
  const closestY = startY + dy * clampedProjection;

  return Math.hypot(centerX - closestX, centerY - closestY) <= radius;
}
