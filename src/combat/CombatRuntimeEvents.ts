import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import type {
  CombatRuntime,
  CombatSlotRuntime,
  NoteColor,
} from './CombatRuntime';

/**
 * Frame-buffered discrete combat events.
 *
 * These are produced by pure simulation modules during
 * {@link advanceCombatRuntime} and published atomically at
 * end-of-frame via {@link publishPendingCombatEvents}.
 *
 * Snapshot events ({@link CombatHudBridgeEvent}) and state
 * transitions are published separately — they are NOT buffered
 * through this channel.
 */
export type CombatRuntimeEvent =
  | {
    event: 'combat:slot-activated';
    payload: { slotIndex: number };
  }
  | {
    event: 'combat:base-damaged';
    payload: { current: number; max: number };
  }
  | {
    event: 'combat:pawn-resolved';
    payload: { slotIndex: number; pawnId: string; pawnType: 'generator' | 'finisher' };
  }
  | {
    event: 'combat:enemy-hit';
    payload: {
      enemyId: string;
      slotIndex: number;
      attackerColor: NoteColor;
      damage: number;
      currentHp: number;
      maxHp: number;
      wasWeaknessHit: boolean;
    };
  }
  | {
    event: 'combat:enemy-died';
    payload: { enemyId: string; remaining: number };
  }
  | {
    event: 'combat:note-packet-color-broke';
    payload: { previousColor: NoteColor; nextColor: NoteColor };
  }
  | {
    event: 'combat:finisher-consumed-notes';
    payload: {
      slotIndex: number;
      pawnId: string;
      color: NoteColor;
      consumedNotes: number;
      multiplier: number;
    };
  }
  | {
    event: 'combat:generator-notes-emitted';
    payload: {
      slotIndex: number;
      pawnId: string;
      color: NoteColor;
      count: number;
    };
  }
  | {
    event: 'combat:finisher-output-note-emitted';
    payload: {
      slotIndex: number;
      pawnId: string;
      color: NoteColor;
      count: number;
    };
  }
  | {
    event: 'combat:projectile-spawned';
    payload: { projectileId: string; slotIndex: number; pawnId: string };
  }
  | {
    event: 'combat:projectile-hit';
    payload: { projectileId: string; enemyId: string; slotIndex: number; pawnId: string };
  }
  | {
    event: 'combat:beam-started';
    payload: { beamId: string; slotIndex: number; pawnId: string };
  }
  | {
    event: 'combat:beam-ticked';
    payload: { beamId: string; slotIndex: number; pawnId: string; hitCount: number };
  }
  | {
    event: 'combat:zone-spawned';
    payload: { zoneId: string; slotIndex: number; pawnId: string };
  }
  | {
    event: 'combat:zone-ticked';
    payload: { zoneId: string; slotIndex: number; pawnId: string; hitCount: number };
  }
  | {
    event: 'combat:slow-applied';
    payload: { enemyId: string; slowMultiplier: number; durationMs: number };
  }
  | {
    event: 'combat:base-healed';
    payload: { amount: number; current: number; max: number };
  }
  | {
    event: 'combat:pawn-buff-applied';
    payload: { slotIndex: number; sourcePawnId: string; damageBonusPercent: number };
  }
  | {
    event: 'combat:pawn-buff-consumed';
    payload: { slotIndex: number; sourcePawnId: string; damageBonusPercent: number };
  }
  | {
    event: 'combat:delayed-explosion-spawned';
    payload: { explosionId: string; slotIndex: number; pawnId: string };
  };

export function resetCombatFrameEffects(runtime: CombatRuntime): void {
  runtime.effects.transientIds = [];
  runtime.effects.pendingEvents = [];

  for (const slot of runtime.slots) {
    slot.activationVisualState = 'idle';
  }
}

export function pushCombatRuntimeEvent(
  runtime: CombatRuntime,
  event: CombatRuntimeEvent,
): void {
  runtime.effects.pendingEvents.push(event);
}

export function pushCombatSlotActivated(
  runtime: CombatRuntime,
  slotIndex: number,
): void {
  runtime.effects.transientIds.push(`slot-activated:${slotIndex}`);
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:slot-activated',
    payload: { slotIndex },
  });
}

export function pushCombatPawnResolved(
  runtime: CombatRuntime,
  slotIndex: number,
  pawnId: string,
  pawnType: 'generator' | 'finisher',
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:pawn-resolved',
    payload: {
      slotIndex,
      pawnId,
      pawnType,
    },
  });
}

export function pushCombatEnemyHit(
  runtime: CombatRuntime,
  payload: Extract<CombatRuntimeEvent, { event: 'combat:enemy-hit' }>['payload'],
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:enemy-hit',
    payload,
  });
}

export function pushCombatEnemyDied(
  runtime: CombatRuntime,
  enemyId: string,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:enemy-died',
    payload: {
      enemyId,
      remaining: runtime.wave.enemiesRemaining,
    },
  });
}

export function pushCombatNotePacketColorBroke(
  runtime: CombatRuntime,
  previousColor: NoteColor,
  nextColor: NoteColor,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:note-packet-color-broke',
    payload: {
      previousColor,
      nextColor,
    },
  });
}

export function pushCombatFinisherConsumedNotes(
  runtime: CombatRuntime,
  payload: Extract<CombatRuntimeEvent, { event: 'combat:finisher-consumed-notes' }>['payload'],
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:finisher-consumed-notes',
    payload,
  });
}

export function pushCombatGeneratorNotesEmitted(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
  count: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:generator-notes-emitted',
    payload: {
      slotIndex: slot.slotIndex,
      pawnId,
      color,
      count,
    },
  });
}

export function pushCombatFinisherOutputNoteEmitted(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
  count: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:finisher-output-note-emitted',
    payload: {
      slotIndex: slot.slotIndex,
      pawnId,
      color,
      count,
    },
  });
}

export function pushCombatBaseDamaged(runtime: CombatRuntime): void {
  const payload = {
    current: runtime.baseHp,
    max: CombatBalanceConfig.BASE_HP,
  };

  pushCombatRuntimeEvent(runtime, {
    event: 'combat:base-damaged',
    payload,
  });
}

export function pushCombatProjectileSpawned(
  runtime: CombatRuntime,
  projectileId: string,
  slotIndex: number,
  pawnId: string,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:projectile-spawned',
    payload: { projectileId, slotIndex, pawnId },
  });
}

export function pushCombatProjectileHit(
  runtime: CombatRuntime,
  projectileId: string,
  enemyId: string,
  slotIndex: number,
  pawnId: string,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:projectile-hit',
    payload: { projectileId, enemyId, slotIndex, pawnId },
  });
}

export function pushCombatBeamStarted(
  runtime: CombatRuntime,
  beamId: string,
  slotIndex: number,
  pawnId: string,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:beam-started',
    payload: { beamId, slotIndex, pawnId },
  });
}

export function pushCombatBeamTicked(
  runtime: CombatRuntime,
  beamId: string,
  slotIndex: number,
  pawnId: string,
  hitCount: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:beam-ticked',
    payload: { beamId, slotIndex, pawnId, hitCount },
  });
}

export function pushCombatZoneSpawned(
  runtime: CombatRuntime,
  zoneId: string,
  slotIndex: number,
  pawnId: string,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:zone-spawned',
    payload: { zoneId, slotIndex, pawnId },
  });
}

export function pushCombatZoneTicked(
  runtime: CombatRuntime,
  zoneId: string,
  slotIndex: number,
  pawnId: string,
  hitCount: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:zone-ticked',
    payload: { zoneId, slotIndex, pawnId, hitCount },
  });
}

export function pushCombatSlowApplied(
  runtime: CombatRuntime,
  enemyId: string,
  slowMultiplier: number,
  durationMs: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:slow-applied',
    payload: { enemyId, slowMultiplier, durationMs },
  });
}

export function pushCombatBaseHealed(
  runtime: CombatRuntime,
  amount: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:base-healed',
    payload: {
      amount,
      current: runtime.baseHp,
      max: CombatBalanceConfig.BASE_HP,
    },
  });
}

export function pushCombatPawnBuffApplied(
  runtime: CombatRuntime,
  slotIndex: number,
  sourcePawnId: string,
  damageBonusPercent: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:pawn-buff-applied',
    payload: { slotIndex, sourcePawnId, damageBonusPercent },
  });
}

export function pushCombatPawnBuffConsumed(
  runtime: CombatRuntime,
  slotIndex: number,
  sourcePawnId: string,
  damageBonusPercent: number,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:pawn-buff-consumed',
    payload: { slotIndex, sourcePawnId, damageBonusPercent },
  });
}

export function pushCombatDelayedExplosionSpawned(
  runtime: CombatRuntime,
  explosionId: string,
  slotIndex: number,
  pawnId: string,
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:delayed-explosion-spawned',
    payload: { explosionId, slotIndex, pawnId },
  });
}
