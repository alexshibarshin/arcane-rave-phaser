import { describe, expect, it } from 'vitest';
import {
  createCombatHudBridgeEvents,
  createCombatStateTransitionEvents,
  getCombatOverlayActions,
  getCombatOverlayText,
} from './CombatHudBridge';
import { createCombatRuntime } from './CombatRuntime';
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

    expect(createCombatStateTransitionEvents('running', 'victory')).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'victory' },
      },
      {
        event: 'combat:ended',
        payload: { outcome: 'victory' },
      },
    ]);

    expect(createCombatStateTransitionEvents('running', 'defeat')).toEqual([
      {
        event: 'combat:state-changed',
        payload: { state: 'defeat' },
      },
      {
        event: 'combat:ended',
        payload: { outcome: 'defeat' },
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
