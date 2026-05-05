import { describe, expect, it } from 'vitest';
import {
  createCombatHudBridgeEvents,
  createCombatStateTransitionEvents,
  getCombatOverlayActions,
  getCombatOverlayText,
} from './CombatHudBridge';
import { createCombatRuntime } from './CombatRuntime';
import { CombatTimeControlConfig } from '@config/CombatTimeControlConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';

describe('CombatHudBridge', () => {
  it('creates typed HUD snapshot events from the combat runtime source of truth', () => {
    const runtime = createCombatRuntime();

    expect(createCombatHudBridgeEvents(runtime)).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'preview' },
      },
      {
        event: 'combat:hud-wave-updated',
        payload: { current: 1, total: CombatWaveConfig.WAVES.length },
      },
      {
        event: 'combat:hud-enemies-updated',
        payload: { remaining: runtime.wave.enemiesRemaining },
      },
      {
        event: 'combat:hud-base-hp-updated',
        payload: { current: 100, max: 100 },
      },
      {
        event: 'combat:note-packet-changed',
        payload: { color: null, count: 0 },
      },
      {
        event: 'combat:chrono-updated',
        payload: { current: CombatTimeControlConfig.CHRONO_START, max: CombatTimeControlConfig.CHRONO_MAX },
      },
      {
        event: 'combat:time-control-updated',
        payload: {
          requestedMode: 'idle',
          activeMode: 'idle',
          activeIntensity: 0,
        },
      },
    ]);
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

    expect(createCombatStateTransitionEvents('running', 'victory', runtime)).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'victory' },
      },
      {
        event: 'combat:ended',
        payload: {
          outcome: 'victory',
          chronoCurrent: CombatTimeControlConfig.CHRONO_START,
          chronoMax: CombatTimeControlConfig.CHRONO_MAX,
        },
      },
    ]);

    expect(createCombatStateTransitionEvents('running', 'defeat', runtime)).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'defeat' },
      },
      {
        event: 'combat:ended',
        payload: {
          outcome: 'defeat',
          chronoCurrent: CombatTimeControlConfig.CHRONO_START,
          chronoMax: CombatTimeControlConfig.CHRONO_MAX,
        },
      },
    ]);
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
