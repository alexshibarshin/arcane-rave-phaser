import type { CombatRuntime, CombatState } from './CombatRuntime';

export interface CombatHudEventMap {
  'combat:state-changed': { state: CombatState };
  'combat:pause-opened': void;
  'combat:pause-closed': void;
  'combat:ended': { outcome: 'victory' | 'defeat' };
  'combat:hud-wave-updated': { current: number; total: number };
  'combat:hud-enemies-updated': { remaining: number };
  'combat:hud-base-hp-updated': { current: number; max: number };
  'combat:note-packet-changed': { color: CombatRuntime['notePacket']['color']; count: number };
}

type EventDescriptor<K extends keyof CombatHudEventMap> = {
  event: K;
  payload: CombatHudEventMap[K];
};

export type CombatHudBridgeEvent =
  | EventDescriptor<'combat:state-changed'>
  | EventDescriptor<'combat:pause-opened'>
  | EventDescriptor<'combat:pause-closed'>
  | EventDescriptor<'combat:ended'>
  | EventDescriptor<'combat:hud-wave-updated'>
  | EventDescriptor<'combat:hud-enemies-updated'>
  | EventDescriptor<'combat:hud-base-hp-updated'>
  | EventDescriptor<'combat:note-packet-changed'>;

export function createCombatHudBridgeEvents(
  runtime: CombatRuntime,
): CombatHudBridgeEvent[] {
  return [
    {
      event: 'combat:state-changed',
      payload: { state: runtime.state },
    },
    {
      event: 'combat:hud-wave-updated',
      payload: {
        current: runtime.wave.currentWaveIndex + 1,
        total: runtime.wave.totalWaves,
      },
    },
    {
      event: 'combat:hud-enemies-updated',
      payload: {
        remaining: runtime.wave.enemiesRemaining,
      },
    },
    {
      event: 'combat:hud-base-hp-updated',
      payload: {
        current: runtime.baseHp,
        max: runtime.baseHp,
      },
    },
    {
      event: 'combat:note-packet-changed',
      payload: {
        color: runtime.notePacket.color,
        count: runtime.notePacket.count,
      },
    },
  ];
}

export function createCombatStateTransitionEvents(
  previousState: CombatState,
  nextState: CombatState,
): CombatHudBridgeEvent[] {
  const events: CombatHudBridgeEvent[] = [
    {
      event: 'combat:state-changed',
      payload: { state: nextState },
    },
  ];

  if (nextState === 'paused') {
    events.push({
      event: 'combat:pause-opened',
      payload: undefined,
    });
  }

  if (previousState === 'paused' && nextState === 'running') {
    events.push({
      event: 'combat:pause-closed',
      payload: undefined,
    });
  }

  if (nextState === 'victory' || nextState === 'defeat') {
    events.push({
      event: 'combat:ended',
      payload: { outcome: nextState },
    });
  }

  return events;
}

export function getCombatOverlayText(state: CombatState): string | null {
  switch (state) {
    case 'paused':
      return 'Paused';
    case 'victory':
      return 'Victory';
    case 'defeat':
      return 'Defeat';
    default:
      return null;
  }
}
