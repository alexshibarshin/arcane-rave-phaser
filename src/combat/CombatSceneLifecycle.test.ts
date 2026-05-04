import { describe, expect, it, vi } from 'vitest';
import { getCombatPresentationDelta, restartCombatScenes } from './CombatSceneLifecycle';

describe('CombatSceneLifecycle', () => {
  it('stops the active HUD overlay before restarting combat for a hard reset', () => {
    const stop = vi.fn();
    const restart = vi.fn();
    const scenePlugin = {
      isActive: vi.fn((key: string) => key === 'hud'),
      stop,
      restart,
    };

    restartCombatScenes(scenePlugin, 'hud');

    expect(scenePlugin.isActive).toHaveBeenCalledWith('hud');
    expect(stop).toHaveBeenCalledWith('hud');
    expect(restart).toHaveBeenCalledOnce();
    const stopCallOrder = stop.mock.invocationCallOrder[0];
    const restartCallOrder = restart.mock.invocationCallOrder[0];

    expect(stopCallOrder).toBeDefined();
    expect(restartCallOrder).toBeDefined();

    if (stopCallOrder === undefined || restartCallOrder === undefined) {
      return;
    }

    expect(stopCallOrder).toBeLessThan(restartCallOrder);
  });

  it('restarts combat even when there is no active overlay scene to stop', () => {
    const stop = vi.fn();
    const restart = vi.fn();
    const scenePlugin = {
      isActive: vi.fn(() => false),
      stop,
      restart,
    };

    restartCombatScenes(scenePlugin, 'hud');

    expect(stop).not.toHaveBeenCalled();
    expect(restart).toHaveBeenCalledOnce();
  });

  it('freezes scene-level presentation timers while combat is paused', () => {
    expect(getCombatPresentationDelta('running', 16)).toBe(16);
    expect(getCombatPresentationDelta('preview', 16)).toBe(16);
    expect(getCombatPresentationDelta('paused', 16)).toBe(0);
    expect(getCombatPresentationDelta('victory', 16)).toBe(16);
    expect(getCombatPresentationDelta('defeat', 16)).toBe(16);
  });
});
