import { setCombatState, type CombatRuntime } from './CombatRuntime';

export function evaluateCombatOutcome(runtime: CombatRuntime): void {
  if (runtime.state !== 'running') {
    return;
  }

  if (runtime.wave.enemiesRemaining <= 0) {
    setCombatState(runtime, 'victory');
  }
}
