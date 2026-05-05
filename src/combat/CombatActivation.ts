import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import {
  CombatContentConfig,
  type CombatFinisherPawnDefinition,
} from '@config/CombatContentConfig';
import {
  pushCombatEnemyDied,
  pushCombatEnemyHit,
  pushCombatFinisherConsumedNotes,
  pushCombatFinisherOutputNoteEmitted,
  pushCombatGeneratorNotesEmitted,
  pushCombatNotePacketChanged,
  pushCombatNotePacketColorBroke,
  pushCombatPawnResolved,
  pushCombatSlotActivated,
} from './CombatRuntimeEvents';
import type { CombatSlotCrossing } from './CombatRotation';
import {
  setCombatNotePacket,
  type CombatEnemyRuntime,
  type CombatRuntime,
  type CombatSlotRuntime,
  type NoteColor,
} from './CombatRuntime';

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
      continue;
    }

    const pawn = pawnDefinitionsById.get(slot.pawnId);

    if (!pawn) {
      continue;
    }

    pushCombatPawnResolved(runtime, slot.slotIndex, pawn.id, pawn.type);

    if (pawn.type === 'generator') {
      resolveGeneratorSlotActivation(runtime, slot, pawn.id, pawn.color, pawn.baseDamage);
      continue;
    }

    resolveFinisherSlotActivation(runtime, slot, pawn);
  }
}

function resolveGeneratorSlotActivation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
  baseDamage: number,
): void {
  const target = selectNearestLivingEnemy(runtime, slot.worldPosition);

  if (target) {
    const weaknessMultiplier = resolveWeakness(color, target.color);
    const damage = Math.round(baseDamage * weaknessMultiplier);
    target.currentHp = Math.max(0, target.currentHp - damage);
    pushCombatEnemyHit(runtime, {
      enemyId: target.runtimeId,
      slotIndex: slot.slotIndex,
      attackerColor: color,
      damage,
      currentHp: target.currentHp,
      maxHp: target.maxHp,
      wasWeaknessHit: weaknessMultiplier > 1,
    });

    if (target.currentHp <= 0 && target.state !== 'dead') {
      target.state = 'dead';
      runtime.wave.enemiesRemaining = Math.max(0, runtime.wave.enemiesRemaining - 1);
      pushCombatEnemyDied(runtime, target.runtimeId);
    }
  }

  applyGeneratorPacketMutation(runtime, slot, pawnId, color);
}

function resolveFinisherSlotActivation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatFinisherPawnDefinition,
): void {
  const consumedNotes = getFinisherConsumedNotes(runtime, pawn.color);
  const consumedMultiplier = getFinisherConsumedNotesMultiplier(consumedNotes);
  const baseDamage = Math.round(pawn.baseDamage * consumedMultiplier);
  const target = selectNearestLivingEnemy(runtime, slot.worldPosition);
  const weaknessMultiplier = target ? resolveWeakness(pawn.color, target.color) : 1;
  const damage = Math.round(baseDamage * weaknessMultiplier);

  pushCombatFinisherConsumedNotes(runtime, {
    slotIndex: slot.slotIndex,
    pawnId: pawn.id,
    color: pawn.color,
    consumedNotes,
    multiplier: consumedMultiplier,
  });

  if (target) {
    target.currentHp = Math.max(0, target.currentHp - damage);
    pushCombatEnemyHit(runtime, {
      enemyId: target.runtimeId,
      slotIndex: slot.slotIndex,
      attackerColor: pawn.color,
      damage,
      currentHp: target.currentHp,
      maxHp: target.maxHp,
      wasWeaknessHit: weaknessMultiplier > 1,
    });

    if (target.currentHp <= 0 && target.state !== 'dead') {
      target.state = 'dead';
      runtime.wave.enemiesRemaining = Math.max(0, runtime.wave.enemiesRemaining - 1);
      pushCombatEnemyDied(runtime, target.runtimeId);
    }
  }

  applyFinisherPacketMutation(runtime, slot, pawn);
}

function selectNearestLivingEnemy(
  runtime: CombatRuntime,
  origin: CombatSlotRuntime['worldPosition'],
): CombatEnemyRuntime | null {
  if (origin === null) {
    return null;
  }

  let nearestEnemy: CombatEnemyRuntime | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of runtime.enemies) {
    if (!enemy.spawned || enemy.state === 'dead' || enemy.currentHp <= 0) {
      continue;
    }

    const distance = Math.hypot(enemy.x - origin.x, enemy.y - origin.y);

    if (distance < nearestDistance) {
      nearestEnemy = enemy;
      nearestDistance = distance;
    }
  }

  return nearestEnemy;
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
    const nextCount = Math.min(
      previousCount + 2,
      CombatBalanceConfig.NOTE_PACKET_CAPACITY,
    );
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

function applyFinisherPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatFinisherPawnDefinition,
): void {
  if (runtime.notePacket.color !== null && runtime.notePacket.color !== pawn.color) {
    pushCombatNotePacketColorBroke(
      runtime,
      runtime.notePacket.color,
      pawn.outputNoteColor,
    );
  }

  setCombatNotePacket(runtime, pawn.outputNoteColor, 1);
  pushCombatFinisherOutputNoteEmitted(runtime, slot, pawn.id, pawn.outputNoteColor);
  pushCombatNotePacketChanged(runtime);
}

function resolveWeakness(attackerColor: NoteColor, targetColor: NoteColor): number {
  const weakTarget = CombatContentConfig.WEAKNESS_ADVANTAGE[attackerColor];

  return weakTarget === targetColor ? CombatBalanceConfig.WEAKNESS_MULTIPLIER : 1;
}
