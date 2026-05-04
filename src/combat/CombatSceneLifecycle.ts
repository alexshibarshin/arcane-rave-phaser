export interface CombatSceneLifecycleController {
  isActive(key: string): boolean;
  stop(key: string): void;
  restart(): void;
}

export function getCombatPresentationDelta(
  state: 'preview' | 'running' | 'paused' | 'victory' | 'defeat',
  deltaMs: number,
): number {
  return state === 'paused' ? 0 : deltaMs;
}

export function restartCombatScenes(
  controller: CombatSceneLifecycleController,
  overlaySceneKey: string | null,
): void {
  if (overlaySceneKey && controller.isActive(overlaySceneKey)) {
    controller.stop(overlaySceneKey);
  }

  controller.restart();
}
