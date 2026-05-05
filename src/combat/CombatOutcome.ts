import { setCombatState, type CombatRuntime } from './CombatRuntime';

export function evaluateCombatOutcome(runtime: CombatRuntime): void {
  if (runtime.state !== 'running') {
    return;
  }

  const allSubWavesActivated = runtime.wave.pendingSubWaves.length === 0;
  const allBagsEmpty = Array.from(runtime.wave.spawnBags.values()).every(
    (bag) => bag.enemyRuntimeIds.length === 0,
  );
  const noLivingEnemies = runtime.enemies.every(
    (enemy) => !enemy.spawned || enemy.state === 'dead',
  );

  if (allSubWavesActivated && allBagsEmpty && noLivingEnemies) {
    setCombatState(runtime, 'victory');
  }
}
