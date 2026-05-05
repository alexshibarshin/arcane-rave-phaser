import { describe, expect, it } from 'vitest';
import { resolveCombatControlIntent } from './CombatControlIntent';

describe('CombatControlIntent', () => {
  it('only allows restart from paused, victory, and defeat states', () => {
    expect(resolveCombatControlIntent('preview', { restartPressed: true })).toBeNull();
    expect(resolveCombatControlIntent('running', { restartPressed: true })).toBeNull();
    expect(resolveCombatControlIntent('paused', { restartPressed: true })).toBe('restart');
    expect(resolveCombatControlIntent('victory', { restartPressed: true })).toBe('restart');
    expect(resolveCombatControlIntent('defeat', { restartPressed: true })).toBe('restart');
  });
});
