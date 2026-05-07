import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import {
  CombatContentConfig,
  type CombatFinisherPawnDefinition,
  type CombatPawnDefinition,
} from '@config/CombatContentConfig';
import { consumePendingSlotDamageBuff, readPendingSlotDamageBuff } from './CombatPawnBuffs';
import { resolveSlotModifierMutations, type SlotModifierMutations } from '@modifiers/SlotModifierResolver';
import {
  pushCombatFinisherConsumedNotes,
  pushCombatFinisherOutputNoteEmitted,
  pushCombatGeneratorNotesEmitted,
  pushCombatNotePacketChanged,
  pushCombatNotePacketColorBroke,
  pushCombatPawnResolved,
  pushCombatSlotActivated,
} from './CombatRuntimeEvents';
import {
  setCombatNotePacket,
  type CombatRuntime,
  type CombatScheduledActivationRuntime,
  type CombatSlotRuntime,
  type NoteColor,
} from './CombatRuntime';
import type { CombatSlotCrossing } from './CombatRotation';
import { ABILITY_EXECUTORS } from './abilities/executors';

const pawnDefinitionsById = new Map(
  CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => [pawn.id, pawn]),
);

export function resolveCombatActivations(
  runtime: CombatRuntime,
  crossings: CombatSlotCrossing[],
  options: {
    scheduledActivations?: CombatScheduledActivationRuntime[];
  } = {},
): void {
  for (const crossing of crossings) {
    const slot = runtime.slots[crossing.slotIndex];

    if (!slot) {
      continue;
    }

    resolveSlotActivation(runtime, slot, { allowDoubleActivation: true });
  }

  for (const scheduledActivation of options.scheduledActivations ?? []) {
    const slot = runtime.slots[scheduledActivation.slotIndex];

    if (!slot) {
      continue;
    }

    resolveSlotActivation(runtime, slot, { allowDoubleActivation: false });
  }
}

function resolveSlotActivation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  options: {
    allowDoubleActivation: boolean;
  },
): void {
  slot.activationVisualState = 'active';
  pushCombatSlotActivated(runtime, slot.slotIndex);

  if (slot.pawnId === null) {
    consumePendingSlotDamageBuff(runtime, slot.slotIndex);
    return;
  }

  const pawn = pawnDefinitionsById.get(slot.pawnId);

  if (!pawn) {
    consumePendingSlotDamageBuff(runtime, slot.slotIndex);
    return;
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
  };

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

  if (!options.allowDoubleActivation) {
    return;
  }

  const mutations = resolveSlotModifierMutations(runtime, slot.slotIndex);

  if (!mutations.doubleActivation || mutations.extraActivations <= 0) {
    return;
  }

  scheduleDoubleActivation(runtime, slot.slotIndex, mutations.extraActivations, mutations.activationDelayMs);
}

function scheduleDoubleActivation(
  runtime: CombatRuntime,
  slotIndex: number,
  extraActivations: number,
  activationDelayMs: number,
): void {
  for (let index = 0; index < extraActivations; index += 1) {
    runtime.scheduledActivations.push({
      slotIndex,
      triggerAtMs: runtime.combatElapsedMs + activationDelayMs * (index + 1),
    });
  }
}

export function resolvePawnAbility(
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
  const mutations = resolveSlotModifierMutations(runtime, slot.slotIndex);
  ABILITY_EXECUTORS[pawn.ability.primaryArchetype].execute({ runtime, slot, pawn, sourceSnapshot, mutations });
}

function applyNoteRuleMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatPawnDefinition,
): void {
  const mutations = resolveSlotModifierMutations(runtime, slot.slotIndex);
  const outputColor = pawn.type === 'generator' ? pawn.color : pawn.outputNoteColor;
  const bonusNotes = mutations.colorFilter !== null && mutations.colorFilter !== outputColor
    ? 0
    : mutations.bonusNotes;

  if (pawn.type === 'generator') {
    applyGeneratorPacketMutation(runtime, slot, pawn.id, pawn.color, bonusNotes);
    return;
  }

  applyFinisherPacketMutation(runtime, slot, pawn, bonusNotes);
}

function applyGeneratorPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
  bonusNotes = 0,
): void {
  const previousColor = runtime.notePacket.color;
  const previousCount = runtime.notePacket.count;
  const baseCount = 2 + bonusNotes;
  let emittedNotes = Math.min(baseCount, CombatBalanceConfig.NOTE_PACKET_CAPACITY);

  if (previousColor === null || previousCount <= 0) {
    setCombatNotePacket(runtime, color, Math.min(baseCount, CombatBalanceConfig.NOTE_PACKET_CAPACITY));
    pushCombatGeneratorNotesEmitted(runtime, slot, pawnId, color, emittedNotes);
    pushCombatNotePacketChanged(runtime);
    return;
  }

  if (previousColor === color) {
    const nextCount = Math.min(previousCount + baseCount, CombatBalanceConfig.NOTE_PACKET_CAPACITY);
    emittedNotes = Math.max(0, nextCount - previousCount);

    setCombatNotePacket(runtime, color, nextCount);
    pushCombatGeneratorNotesEmitted(runtime, slot, pawnId, color, emittedNotes);
    pushCombatNotePacketChanged(runtime);
    return;
  }

  pushCombatNotePacketColorBroke(runtime, previousColor, color);
  setCombatNotePacket(runtime, color, Math.min(baseCount, CombatBalanceConfig.NOTE_PACKET_CAPACITY));
  pushCombatGeneratorNotesEmitted(runtime, slot, pawnId, color, emittedNotes);
  pushCombatNotePacketChanged(runtime);
}

function applyFinisherPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatFinisherPawnDefinition,
  bonusNotes = 0,
): void {
  const emittedNotes = Math.min(1 + bonusNotes, CombatBalanceConfig.NOTE_PACKET_CAPACITY);

  if (runtime.notePacket.color !== null && runtime.notePacket.color !== pawn.color) {
    pushCombatNotePacketColorBroke(runtime, runtime.notePacket.color, pawn.outputNoteColor);
  }

  setCombatNotePacket(
    runtime,
    pawn.outputNoteColor,
    emittedNotes,
  );
  pushCombatFinisherOutputNoteEmitted(runtime, slot, pawn.id, pawn.outputNoteColor, emittedNotes);
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
