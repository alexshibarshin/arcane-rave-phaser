import { getCombatPawnDefinitionById, type CombatPawnDefinition, type CombatTargetingRule } from '@config/CombatContentConfig';
import { applyCombatHit } from './CombatDamage';
import { createRuntimeEffectId, resolveTarget } from './CombatTargeting';
import { pushCombatZoneSpawned, pushCombatZoneTicked } from './CombatRuntimeEvents';
import type { CombatRuntime, CombatSourceSnapshot, CombatZoneRuntime } from './CombatRuntime';

export function createTargetedZone(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  damagePerTick: number,
  radius: number,
  durationMs: number,
  tickIntervalMs: number,
  targeting: CombatTargetingRule,
): void {
  const target = resolveTarget(runtime, targeting);

  if (!target) {
    return;
  }

  spawnZone(
    runtime,
    pawn,
    slotIndex,
    sourceSnapshot,
    target.x,
    target.y,
    radius,
    damagePerTick,
    durationMs,
    tickIntervalMs,
    pawn.ability.secondaryEffect?.kind === 'next-slot-damage-buff'
      ? pawn.ability.secondaryEffect.damageBonusPercent
      : null,
  );
}

export function spawnZone(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  centerX: number,
  centerY: number,
  radius: number,
  damagePerTick: number,
  durationMs: number,
  tickIntervalMs: number,
  nextSlotDamageBuffPercent: number | null,
): void {
  const zone: CombatZoneRuntime = {
    runtimeId: createRuntimeEffectId(runtime, 'zone'),
    pawnId: pawn.id,
    slotIndex,
    color: pawn.color,
    centerX,
    centerY,
    radius,
    damagePerTick,
    tickIntervalMs,
    nextTickAtMs: runtime.combatElapsedMs,
    expiresAtMs: runtime.combatElapsedMs + durationMs,
    sourceSnapshot,
    nextSlotDamageBuffPercent,
  };

  runtime.zones.push(zone);
  pushCombatZoneSpawned(runtime, zone.runtimeId, slotIndex, pawn.id);
}

export function advanceCombatZones(runtime: CombatRuntime): void {
  const remainingZones: CombatZoneRuntime[] = [];

  for (const zone of runtime.zones) {
    const pawn = getCombatPawnDefinitionById(zone.pawnId);

    if (!pawn) {
      continue;
    }

    while (zone.nextTickAtMs <= runtime.combatElapsedMs && zone.expiresAtMs >= zone.nextTickAtMs) {
      let hitCount = 0;

      for (const enemy of runtime.enemies) {
        if (!enemy.spawned || enemy.state === 'dead' || enemy.currentHp <= 0) {
          continue;
        }

        if (Math.hypot(enemy.x - zone.centerX, enemy.y - zone.centerY) > zone.radius) {
          continue;
        }

        hitCount += 1;
        applyCombatHit({
          runtime,
          enemy,
          slotIndex: zone.slotIndex,
          pawn,
          baseDamage: zone.damagePerTick,
          sourceSnapshot: zone.sourceSnapshot,
          attackerColor: zone.color,
        });
      }

      pushCombatZoneTicked(runtime, zone.runtimeId, zone.slotIndex, zone.pawnId, hitCount);
      zone.nextTickAtMs += zone.tickIntervalMs;
    }

    if (zone.expiresAtMs > runtime.combatElapsedMs) {
      remainingZones.push(zone);
    }
  }

  runtime.zones = remainingZones;
}

export function clearCombatZones(runtime: CombatRuntime): void {
  runtime.zones = [];
}
