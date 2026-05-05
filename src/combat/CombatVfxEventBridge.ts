import { off, on, type EventMap } from '@events/EventBus';
import { CombatVfxSystem, type CombatVfxEvent } from './CombatVfxSystem';

type CombatVfxEventName = CombatVfxEvent['event'];

const COMBAT_VFX_EVENT_NAMES = [
  'combat:slot-activated',
  'combat:enemy-hit',
  'combat:generator-notes-emitted',
  'combat:finisher-consumed-notes',
  'combat:finisher-output-note-emitted',
  'combat:note-packet-color-broke',
  'combat:base-damaged',
  'combat:ended',
] as const satisfies readonly CombatVfxEventName[];

export function bindCombatVfxEvents(system: CombatVfxSystem): () => void {
  const bindings = COMBAT_VFX_EVENT_NAMES.map((event) => {
    const listener = (payload: EventMap[typeof event]): void => {
      system.handleEvent({
        event,
        payload,
      } as CombatVfxEvent);
    };

    on(event, listener);

    return { event, listener };
  });

  return () => {
    for (const binding of bindings) {
      off(binding.event, binding.listener);
    }
  };
}
