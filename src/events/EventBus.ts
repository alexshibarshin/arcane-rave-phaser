import { Events } from 'phaser';
import type { CombatState, NoteColor } from '@combat/CombatRuntime';

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
  'combat:scene-ready': { key: string; state: CombatState };
  'combat:hud-ready': { key: string };
  'combat:restarted': void;
  'combat:state-changed': { state: CombatState };
  'combat:pause-opened': void;
  'combat:pause-closed': void;
  'combat:ended': { outcome: 'victory' | 'defeat' };
  'combat:hud-wave-updated': { current: number; total: number };
  'combat:hud-enemies-updated': { remaining: number };
  'combat:hud-base-hp-updated': { current: number; max: number };
  'combat:slot-activated': { slotIndex: number };
  'combat:note-packet-changed': { color: NoteColor | null; count: number };
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
