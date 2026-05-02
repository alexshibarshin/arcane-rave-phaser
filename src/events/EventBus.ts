import { Events } from 'phaser';

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
