import { describe, expect, it } from 'vitest';
import {
  createCombatHudBridgeEvents,
  createCombatStateTransitionEvents,
  getCombatOverlayActions,
  getCombatOverlayText,
} from './CombatHudBridge';
import { createCombatRuntime } from './CombatRuntime';

describe('CombatHudBridge', () => {
  it('creates typed HUD snapshot events from the combat runtime source of truth', () => {
    const runtime = createCombatRuntime();

    const events = createCombatHudBridgeEvents(runtime);

    expect(events).toHaveLength(7);

    expect(events[0]).toEqual({ event: 'combat:state-changed', payload: { state: 'preview' } });

    expect(events[1]).toMatchObject({
      event: 'combat:hud-wave-updated',
      payload: { current: expect.any(Number), total: expect.any(Number) },
    });

    expect(events[2]).toMatchObject({
      event: 'combat:hud-enemies-updated',
      payload: { remaining: expect.any(Number) },
    });

    expect(events[3]!.event).toBe('combat:hud-base-hp-updated');

    expect(events[4]).toEqual({ event: 'combat:note-packet-changed', payload: { color: null, count: 0 } });

    expect(events[5]).toMatchObject({
      event: 'combat:chrono-updated',
      payload: { current: expect.any(Number), max: expect.any(Number) },
    });

    expect(events[6]).toEqual({
      event: 'combat:time-control-updated',
      payload: { requestedMode: 'idle', activeMode: 'idle', activeIntensity: 0 },
    });
  });

  it('creates semantic transition events for paused, resumed, and combat end states', () => {
    expect(createCombatStateTransitionEvents('running', 'paused')).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'paused' },
      },
      {
        event: 'combat:pause-opened',
        payload: undefined,
      },
    ]);

    expect(createCombatStateTransitionEvents('paused', 'running')).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'running' },
      },
      {
        event: 'combat:pause-closed',
        payload: undefined,
      },
    ]);

    const runtime = createCombatRuntime();

    const victoryEvents = createCombatStateTransitionEvents('running', 'victory', runtime);
    expect(victoryEvents[0]).toEqual({
      event: 'combat:state-changed',
      payload: { state: 'victory' },
    });
    expect(victoryEvents[1]).toMatchObject({
      event: 'combat:ended',
      payload: {
        outcome: 'victory',
        chronoCurrent: expect.any(Number),
        chronoMax: expect.any(Number),
      },
    });

    const defeatEvents = createCombatStateTransitionEvents('running', 'defeat', runtime);
    expect(defeatEvents[0]).toEqual({
      event: 'combat:state-changed',
      payload: { state: 'defeat' },
    });
    expect(defeatEvents[1]).toMatchObject({
      event: 'combat:ended',
      payload: {
        outcome: 'defeat',
        chronoCurrent: expect.any(Number),
        chronoMax: expect.any(Number),
      },
    });
  });

  it('maps combat states to passive HUD overlay text', () => {
    expect(getCombatOverlayText('preview')).toBeNull();
    expect(getCombatOverlayText('running')).toBeNull();
    expect(getCombatOverlayText('paused')).toBe('Paused');
    expect(getCombatOverlayText('victory')).toBe('Victory');
    expect(getCombatOverlayText('defeat')).toBe('Defeat');
  });

  it('maps overlay actions for paused and result states', () => {
    expect(getCombatOverlayActions('preview')).toEqual([]);
    expect(getCombatOverlayActions('running')).toEqual([]);
    expect(getCombatOverlayActions('paused')).toEqual(['Resume', 'Restart']);
    expect(getCombatOverlayActions('victory')).toEqual(['Restart']);
    expect(getCombatOverlayActions('defeat')).toEqual(['Restart']);
  });
});
