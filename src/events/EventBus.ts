import { Events } from 'phaser';
import type { CombatState, CombatTimeControlMode, NoteColor } from '@combat/CombatRuntime';
import type { StagePhase } from '@stage/StageRuntime';
import type { StageWavePreviewModel } from '@config/StageConfig';

/**
 * Глобальный типизированный EventBus.
 *
 * Все доменные и lifecycle-события объявляются в EventMap.
 */
export const EventBus = new Events.EventEmitter();

export interface EventMap {
  'game:ready': void;
  'scene:ready': { key: string };
  'scene:shutdown': { key: string };
  'ui:ready': void;
  'stage:scene-ready': { key: string; phase: StagePhase };
  'stage:start-wave-requested': void;
  'stage:phase-changed': { phase: StagePhase };
  'stage:snapshot-updated': {
    phase: StagePhase;
    coins: number;
    currentWave: number;
    totalWaves: number;
    canStartWave: boolean;
    wavePreview: StageWavePreviewModel | null;
  };
  'combat:scene-ready': { key: string; state: CombatState };
  'combat:hud-ready': { key: string };
  'combat:restarted': void;
  'combat:restart-requested': void;
  'combat:pause-requested': void;
  'combat:resume-requested': void;
  'combat:time-control-requested': { mode: CombatTimeControlMode };
  'combat:state-changed': { state: CombatState };
  'combat:pause-opened': void;
  'combat:pause-closed': void;
  'combat:ended': { outcome: 'victory' | 'defeat'; chronoCurrent: number; chronoMax: number; remainingBaseHp: number };
  'combat:hud-wave-updated': { current: number; total: number };
  'combat:hud-enemies-updated': { remaining: number };
  'combat:hud-base-hp-updated': { current: number; max: number };
  'combat:chrono-updated': { current: number; max: number };
  'combat:time-control-updated': {
    requestedMode: CombatTimeControlMode;
    activeMode: CombatTimeControlMode;
    activeIntensity: number;
  };
  'combat:slot-activated': { slotIndex: number };
  'combat:pawn-resolved': { slotIndex: number; pawnId: string; pawnType: 'generator' | 'finisher' };
  'combat:enemy-hit': {
    enemyId: string;
    slotIndex: number;
    attackerColor: NoteColor;
    damage: number;
    currentHp: number;
    maxHp: number;
    wasWeaknessHit: boolean;
  };
  'combat:finisher-consumed-notes': {
    slotIndex: number;
    pawnId: string;
    color: NoteColor;
    consumedNotes: number;
    multiplier: number;
  };
  'combat:generator-notes-emitted': {
    slotIndex: number;
    pawnId: string;
    color: NoteColor;
    count: number;
  };
  'combat:finisher-output-note-emitted': {
    slotIndex: number;
    pawnId: string;
    color: NoteColor;
    count: 1;
  };
  'combat:projectile-spawned': { projectileId: string; slotIndex: number; pawnId: string };
  'combat:projectile-hit': { projectileId: string; enemyId: string; slotIndex: number; pawnId: string };
  'combat:beam-started': { beamId: string; slotIndex: number; pawnId: string };
  'combat:beam-ticked': { beamId: string; slotIndex: number; pawnId: string; hitCount: number };
  'combat:zone-spawned': { zoneId: string; slotIndex: number; pawnId: string };
  'combat:zone-ticked': { zoneId: string; slotIndex: number; pawnId: string; hitCount: number };
  'combat:slow-applied': { enemyId: string; slowMultiplier: number; durationMs: number };
  'combat:base-healed': { amount: number; current: number; max: number };
  'combat:pawn-buff-applied': { slotIndex: number; sourcePawnId: string; damageBonusPercent: number };
  'combat:pawn-buff-consumed': { slotIndex: number; sourcePawnId: string; damageBonusPercent: number };
  'combat:delayed-explosion-spawned': { explosionId: string; slotIndex: number; pawnId: string };
  'combat:note-packet-changed': { color: NoteColor | null; count: number };
  'combat:note-packet-color-broke': { previousColor: NoteColor; nextColor: NoteColor };
  'combat:enemy-spawned': { enemyId: string };
  'combat:enemy-died': { enemyId: string; remaining: number };
  'combat:base-damaged': { current: number; max: number };
}

export type EventKey = keyof EventMap;
export type EventPayload<K extends EventKey> = EventMap[K];

export function on<K extends EventKey>(
  event: K,
  listener: (payload: EventPayload<K>) => void,
): Events.EventEmitter {
  return EventBus.on(event, listener);
}

export function once<K extends EventKey>(
  event: K,
  listener: (payload: EventPayload<K>) => void,
): Events.EventEmitter {
  return EventBus.once(event, listener);
}

export function off<K extends EventKey>(
  event: K,
  listener?: (payload: EventPayload<K>) => void,
): Events.EventEmitter {
  return EventBus.off(event, listener);
}

export function emit<K extends EventKey>(
  event: K,
  payload?: EventPayload<K>,
): boolean {
  return EventBus.emit(event, payload);
}
