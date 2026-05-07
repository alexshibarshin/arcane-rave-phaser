import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import {
  CombatContentConfig,
  type CombatBeamAbilityDefinition,
  type CombatExplosionAbilityDefinition,
  type CombatFinisherPawnDefinition,
  type CombatPawnDefinition,
  type CombatProjectileAbilityDefinition,
  type CombatZoneAbilityDefinition,
} from '@config/CombatContentConfig';
import { createBeam } from './CombatBeams';
import { createImmediateTargetedExplosion, queueDelayedExplosion } from './CombatExplosions';
import { applyNextSlotDamageBuff, consumePendingSlotDamageBuff, readPendingSlotDamageBuff } from './CombatPawnBuffs';
import { queueProjectileVolley, spawnShotgunProjectiles, spawnSingleProjectile } from './CombatProjectiles';
import {
  createDirectionToEnemy,
  getSlotOrigin,
  selectFrontmostEnemy,
} from './CombatTargeting';
import {
  pushCombatFinisherConsumedNotes,
  pushCombatFinisherOutputNoteEmitted,
  pushCombatGeneratorNotesEmitted,
  pushCombatNotePacketChanged,
  pushCombatNotePacketColorBroke,
  pushCombatPawnResolved,
  pushCombatSlotActivated,
} from './CombatRuntimeEvents';
import { createTargetedZone } from './CombatZones';
import {
  setCombatNotePacket,
  type CombatRuntime,
  type CombatSlotRuntime,
  type NoteColor,
} from './CombatRuntime';
import type { CombatSlotCrossing } from './CombatRotation';

const pawnDefinitionsById = new Map(
  CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => [pawn.id, pawn]),
);

export function resolveCombatActivations(
  runtime: CombatRuntime,
  crossings: CombatSlotCrossing[],
): void {
  for (const crossing of crossings) {
    const slot = runtime.slots[crossing.slotIndex];

    if (!slot) {
      continue;
    }

    slot.activationVisualState = 'active';
    pushCombatSlotActivated(runtime, slot.slotIndex);

    if (slot.pawnId === null) {
      consumePendingSlotDamageBuff(runtime, slot.slotIndex);
      continue;
    }

    const pawn = pawnDefinitionsById.get(slot.pawnId);

    if (!pawn) {
      consumePendingSlotDamageBuff(runtime, slot.slotIndex);
      continue;
    }

    const pendingBuff = readPendingSlotDamageBuff(runtime, slot.slotIndex);
    const consumedNotes = pawn.type === 'finisher'
      ? getFinisherConsumedNotes(runtime, pawn.color)
      : 0;
    const finisherDamageMultiplier = pawn.type === 'finisher'
      ? getFinisherConsumedNotesMultiplier(consumedNotes)
      : 1;
    const nextSlotBuffBonusPercent = pendingBuff?.damageBonusPercent ?? 0;
    const sourceSnapshot = {
      damageMultiplier:
        finisherDamageMultiplier
        * (1 + nextSlotBuffBonusPercent)
        * getTierDamageMultiplier(slot.pawnTier),
      finisherConsumedNotes: consumedNotes,
      finisherDamageMultiplier,
      nextSlotBuffBonusPercent,
    } as const;

    pushCombatPawnResolved(runtime, slot.slotIndex, pawn.id, pawn.type);

    if (pawn.type === 'finisher') {
      pushCombatFinisherConsumedNotes(runtime, {
        slotIndex: slot.slotIndex,
        pawnId: pawn.id,
        color: pawn.color,
        consumedNotes,
        multiplier: finisherDamageMultiplier,
      });
    }

    resolvePawnAbility(runtime, slot, pawn, sourceSnapshot);
    applyNoteRuleMutation(runtime, slot, pawn);
    consumePendingSlotDamageBuff(runtime, slot.slotIndex);
  }
}

function resolvePawnAbility(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
  sourceSnapshot: {
    damageMultiplier: number;
    finisherConsumedNotes: number;
    finisherDamageMultiplier: number;
    nextSlotBuffBonusPercent: number;
  },
): void {
  switch (pawn.ability.primaryArchetype) {
    case 'projectile':
      resolveProjectileAbility(runtime, slot, pawn, pawn.ability, sourceSnapshot);
      return;
    case 'explosion':
      resolveExplosionAbility(runtime, slot, pawn, pawn.ability, sourceSnapshot);
      return;
    case 'beam':
      resolveBeamAbility(runtime, slot, pawn, pawn.ability, sourceSnapshot);
      return;
    case 'zone':
      resolveZoneAbility(runtime, slot, pawn, pawn.ability, sourceSnapshot);
      return;
  }
}

function resolveProjectileAbility(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
  ability: CombatProjectileAbilityDefinition,
  sourceSnapshot: {
    damageMultiplier: number;
    finisherConsumedNotes: number;
    finisherDamageMultiplier: number;
    nextSlotBuffBonusPercent: number;
  },
): void {
  const origin = getSlotOrigin(slot);
  const target = selectFrontmostEnemy(runtime);

  if (!origin || !target) {
    return;
  }

  if (ability.pattern === 'single-shot') {
    const direction = createDirectionToEnemy(origin.x, origin.y, target);
    spawnSingleProjectile({
      runtime,
      pawn,
      slotIndex: slot.slotIndex,
      color: pawn.color,
      originX: origin.x,
      originY: origin.y,
      directionX: direction.x,
      directionY: direction.y,
      damage: ability.damage,
      projectileSpeedPxPerSec: ability.projectileSpeed,
      projectileLifetimeMs: ability.projectileLifetimeMs,
      sourceSnapshot,
    });
    return;
  }

  if (ability.pattern === 'shotgun-spread') {
    spawnShotgunProjectiles(
      runtime,
      pawn,
      slot.slotIndex,
      sourceSnapshot,
      ability.projectileCount ?? 1,
      ability.coneAngleDeg ?? 0,
      ability.projectileSpeed,
      ability.projectileLifetimeMs,
      ability.damage,
    );
    return;
  }

  queueProjectileVolley(
    runtime,
    pawn,
    slot.slotIndex,
    sourceSnapshot,
    ability.volleyShotCount ?? 1,
    ability.volleyIntervalMs ?? 1,
    ability.projectileSpeed,
    ability.projectileLifetimeMs,
    ability.damage,
  );
}

function resolveExplosionAbility(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
  ability: CombatExplosionAbilityDefinition,
  sourceSnapshot: {
    damageMultiplier: number;
    finisherConsumedNotes: number;
    finisherDamageMultiplier: number;
    nextSlotBuffBonusPercent: number;
  },
): void {
  if (ability.pattern === 'targeted-burst') {
    createImmediateTargetedExplosion(
      runtime,
      pawn,
      slot.slotIndex,
      sourceSnapshot,
      ability.damage,
      ability.radius,
      ability.targeting,
    );
    return;
  }

  queueDelayedExplosion(
    runtime,
    pawn,
    slot.slotIndex,
    sourceSnapshot,
    ability.damage,
    ability.radius,
    ability.delayMs ?? 0,
    ability.targeting,
  );
}

function resolveBeamAbility(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
  ability: CombatBeamAbilityDefinition,
  sourceSnapshot: {
    damageMultiplier: number;
    finisherConsumedNotes: number;
    finisherDamageMultiplier: number;
    nextSlotBuffBonusPercent: number;
  },
): void {
  createBeam(
    runtime,
    pawn,
    slot.slotIndex,
    sourceSnapshot,
    ability.damage,
    ability.durationMs,
    ability.tickIntervalMs ?? null,
    ability.pattern === 'lock-on-beam' ? 'lock-on' : 'sweeping',
    ability.pattern === 'sweeping-beam' ? ability.sweepArcDeg ?? null : null,
    ability.pattern === 'sweeping-beam' ? ability.sweepLengthPx ?? null : null,
    ability.pattern === 'sweeping-beam' ? ability.sweepHitRadiusPx ?? null : null,
  );
}

function resolveZoneAbility(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
  ability: CombatZoneAbilityDefinition,
  sourceSnapshot: {
    damageMultiplier: number;
    finisherConsumedNotes: number;
    finisherDamageMultiplier: number;
    nextSlotBuffBonusPercent: number;
  },
): void {
  createTargetedZone(
    runtime,
    pawn,
    slot.slotIndex,
    sourceSnapshot,
    ability.damage,
    ability.radius,
    ability.durationMs,
    ability.tickIntervalMs,
    ability.targeting,
  );

  if (ability.secondaryEffect?.kind === 'next-slot-damage-buff') {
    applyNextSlotDamageBuff(runtime, slot.slotIndex, pawn.id, ability.secondaryEffect.damageBonusPercent);
  }
}

function applyNoteRuleMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
): void {
  if (pawn.type === 'generator') {
    applyGeneratorPacketMutation(runtime, slot, pawn.id, pawn.color);
    return;
  }

  applyFinisherPacketMutation(runtime, slot, pawn);
}

function applyGeneratorPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
): void {
  const previousColor = runtime.notePacket.color;
  const previousCount = runtime.notePacket.count;
  let emittedNotes = 2;

  if (previousColor === null || previousCount <= 0) {
    setCombatNotePacket(runtime, color, 2);
    pushCombatGeneratorNotesEmitted(runtime, slot, pawnId, color, emittedNotes);
    pushCombatNotePacketChanged(runtime);
    return;
  }

  if (previousColor === color) {
    const nextCount = Math.min(previousCount + 2, CombatBalanceConfig.NOTE_PACKET_CAPACITY);
    emittedNotes = Math.max(0, nextCount - previousCount);

    setCombatNotePacket(runtime, color, nextCount);
    pushCombatGeneratorNotesEmitted(runtime, slot, pawnId, color, emittedNotes);
    pushCombatNotePacketChanged(runtime);
    return;
  }

  pushCombatNotePacketColorBroke(runtime, previousColor, color);
  setCombatNotePacket(runtime, color, 2);
  pushCombatGeneratorNotesEmitted(runtime, slot, pawnId, color, emittedNotes);
  pushCombatNotePacketChanged(runtime);
}

function applyFinisherPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatFinisherPawnDefinition,
): void {
  if (runtime.notePacket.color !== null && runtime.notePacket.color !== pawn.color) {
    pushCombatNotePacketColorBroke(runtime, runtime.notePacket.color, pawn.outputNoteColor);
  }

  setCombatNotePacket(runtime, pawn.outputNoteColor, 1);
  pushCombatFinisherOutputNoteEmitted(runtime, slot, pawn.id, pawn.outputNoteColor);
  pushCombatNotePacketChanged(runtime);
}

function getFinisherConsumedNotes(runtime: CombatRuntime, color: NoteColor): number {
  if (runtime.notePacket.color !== color || runtime.notePacket.count <= 0) {
    return 0;
  }

  return Math.min(runtime.notePacket.count, CombatBalanceConfig.NOTE_PACKET_CAPACITY);
}

function getFinisherConsumedNotesMultiplier(consumedNotes: number): number {
  const normalizedConsumedNotes = Math.max(
    0,
    Math.min(consumedNotes, CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER.length - 1),
  );

  return CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER[normalizedConsumedNotes] ?? 0.75;
}

function getTierDamageMultiplier(pawnTier: number | null): number {
  const normalizedTier = Math.max(1, pawnTier ?? 1);
  const multiplierIndex = Math.min(
    normalizedTier - 1,
    CombatBalanceConfig.PAWN_TIER_DAMAGE_MULTIPLIER.length - 1,
  );

  return CombatBalanceConfig.PAWN_TIER_DAMAGE_MULTIPLIER[multiplierIndex] ?? 1;
}
