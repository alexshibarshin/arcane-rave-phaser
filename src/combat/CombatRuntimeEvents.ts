import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import type {
  CombatRuntime,
  CombatSlotRuntime,
  NoteColor,
} from './CombatRuntime';

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
    event: 'combat:hud-base-hp-updated';
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
    event: 'combat:note-packet-changed';
    payload: { color: NoteColor | null; count: number };
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
      count: 1;
    };
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

export function pushCombatNotePacketChanged(runtime: CombatRuntime): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:note-packet-changed',
    payload: {
      color: runtime.notePacket.color,
      count: runtime.notePacket.count,
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
): void {
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:finisher-output-note-emitted',
    payload: {
      slotIndex: slot.slotIndex,
      pawnId,
      color,
      count: 1,
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
  pushCombatRuntimeEvent(runtime, {
    event: 'combat:hud-base-hp-updated',
    payload,
  });
}
