import { pushCombatSlowApplied } from './CombatRuntimeEvents';
import type { CombatRuntime } from './CombatRuntime';

export function advanceCombatStatuses(runtime: CombatRuntime): void {
  for (const [enemyRuntimeId, status] of runtime.enemyStatuses.entries()) {
    if (status.expiresAtMs <= runtime.combatElapsedMs) {
      runtime.enemyStatuses.delete(enemyRuntimeId);
    }
  }
}

export function applyEnemySlow(
  runtime: CombatRuntime,
  enemyRuntimeId: string,
  slowMultiplier: number,
  durationMs: number,
): void {
  const expiresAtMs = runtime.combatElapsedMs + durationMs;
  const currentStatus = runtime.enemyStatuses.get(enemyRuntimeId);

  if (!currentStatus || slowMultiplier < currentStatus.slowMultiplier) {
    runtime.enemyStatuses.set(enemyRuntimeId, {
      enemyRuntimeId,
      slowMultiplier,
      expiresAtMs,
    });
  } else {
    currentStatus.expiresAtMs = expiresAtMs;
  }

  pushCombatSlowApplied(runtime, enemyRuntimeId, slowMultiplier, durationMs);
}

export function getEnemyMoveSpeedMultiplier(
  runtime: CombatRuntime,
  enemyRuntimeId: string,
): number {
  return runtime.enemyStatuses.get(enemyRuntimeId)?.slowMultiplier ?? 1;
}

export function clearCombatEnemyStatuses(runtime: CombatRuntime): void {
  runtime.enemyStatuses.clear();
}
