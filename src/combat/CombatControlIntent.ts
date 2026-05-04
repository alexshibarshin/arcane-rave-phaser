import type { CombatState } from './CombatRuntime';

export function resolveCombatControlIntent(
  state: CombatState,
  input: { restartPressed: boolean },
): 'restart' | null {
  if (
    input.restartPressed
    && (state === 'paused' || state === 'victory' || state === 'defeat')
  ) {
    return 'restart';
  }

  return null;
}
