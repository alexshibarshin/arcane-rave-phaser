import { getCombatPawnDefinitionById, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { applyCombatHit } from './CombatDamage';
import { spawnZone } from './CombatZones';
import { createRuntimeEffectId, getNearbyTargetableEnemies, resolveTarget } from './CombatTargeting';
import type { CombatTargetingRule } from '@config/CombatContentConfig';
import {
  pushCombatDelayedExplosionSpawned,
} from './CombatRuntimeEvents';
import type {
  CombatPendingExplosionRuntime,
  CombatRuntime,
  CombatSourceSnapshot,
} from './CombatRuntime';

export function createImmediateTargetedExplosion(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  damage: number,
  radius: number,
  targeting: CombatTargetingRule,
): void {
  const target = resolveTarget(runtime, targeting);

  if (!target) {
    return;
  }

  const candidateEnemies = getNearbyTargetableEnemies(runtime, {
    minX: target.x - radius,
    maxX: target.x + radius,
    minY: target.y - radius,
    maxY: target.y + radius,
    paddingPx: 0,
  });

  for (const enemy of candidateEnemies) {
    if (Math.hypot(enemy.x - target.x, enemy.y - target.y) > radius) {
      continue;
    }

    applyCombatHit({
      runtime,
      enemy,
      slotIndex,
      pawn,
      baseDamage: damage,
      sourceSnapshot,
      attackerColor: pawn.color,
    });
  }
}

export function queueDelayedExplosion(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  damage: number,
  radius: number,
  delayMs: number,
  targeting: CombatTargetingRule,
): void {
  const target = resolveTarget(runtime, targeting);

  if (!target) {
    return;
  }

  const pendingExplosion: CombatPendingExplosionRuntime = {
    runtimeId: createRuntimeEffectId(runtime, 'pending-explosion'),
    pawnId: pawn.id,
    slotIndex,
    color: pawn.color,
    centerX: target.x,
    centerY: target.y,
    radius,
    damage,
    detonateAtMs: runtime.combatElapsedMs + delayMs,
    sourceSnapshot,
    burnZoneOnDetonate: pawn.ability.secondaryEffect?.kind === 'burn-zone-on-detonation'
      ? {
          radius: pawn.ability.secondaryEffect.zoneRadius,
          durationMs: pawn.ability.secondaryEffect.zoneDurationMs,
          tickIntervalMs: pawn.ability.secondaryEffect.tickIntervalMs,
          damagePerTick: pawn.ability.secondaryEffect.damagePerTick,
        }
      : null,
  };

  runtime.pendingExplosions.push(pendingExplosion);
  pushCombatDelayedExplosionSpawned(runtime, pendingExplosion.runtimeId, slotIndex, pawn.id);
}

export function advanceCombatPendingExplosions(runtime: CombatRuntime): void {
  const remainingExplosions: CombatPendingExplosionRuntime[] = [];

  for (const pendingExplosion of runtime.pendingExplosions) {
    if (pendingExplosion.detonateAtMs > runtime.combatElapsedMs) {
      remainingExplosions.push(pendingExplosion);
      continue;
    }

    detonatePendingExplosion(runtime, pendingExplosion);
  }

  runtime.pendingExplosions = remainingExplosions;
}

export function clearCombatPendingExplosions(runtime: CombatRuntime): void {
  runtime.pendingExplosions = [];
}

function detonatePendingExplosion(runtime: CombatRuntime, pendingExplosion: CombatPendingExplosionRuntime): void {
  const pawn = getCombatPawnDefinitionById(pendingExplosion.pawnId);

  if (!pawn) {
    return;
  }

  const candidateEnemies = getNearbyTargetableEnemies(runtime, {
    minX: pendingExplosion.centerX - pendingExplosion.radius,
    maxX: pendingExplosion.centerX + pendingExplosion.radius,
    minY: pendingExplosion.centerY - pendingExplosion.radius,
    maxY: pendingExplosion.centerY + pendingExplosion.radius,
    paddingPx: 0,
  });

  for (const enemy of candidateEnemies) {
    if (Math.hypot(enemy.x - pendingExplosion.centerX, enemy.y - pendingExplosion.centerY) > pendingExplosion.radius) {
      continue;
    }

    applyCombatHit({
      runtime,
      enemy,
      slotIndex: pendingExplosion.slotIndex,
      pawn,
      baseDamage: pendingExplosion.damage,
      sourceSnapshot: pendingExplosion.sourceSnapshot,
      attackerColor: pendingExplosion.color,
    });
  }

  if (pendingExplosion.burnZoneOnDetonate) {
    spawnZone(
      runtime,
      pawn,
      pendingExplosion.slotIndex,
      pendingExplosion.sourceSnapshot,
      pendingExplosion.centerX,
      pendingExplosion.centerY,
      pendingExplosion.burnZoneOnDetonate.radius,
      pendingExplosion.burnZoneOnDetonate.damagePerTick,
      pendingExplosion.burnZoneOnDetonate.durationMs,
      pendingExplosion.burnZoneOnDetonate.tickIntervalMs,
      null,
    );
  }
}
