import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

export class CombatBasePresenter {
  sync(viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const base = viewGraph.base;
    const sprite = base.root;
    const elapsedMs = runtime.combatElapsedMs;
    const activeMode = runtime.time.activeMode;
    const intensity = runtime.time.activeIntensity;

    const idleBobY = Math.sin(elapsedMs * 0.0021) * 4;
    const idleScale = 1 + Math.sin(elapsedMs * 0.0016 + 0.35) * 0.012;
    const idleAngle = Math.sin(elapsedMs * 0.0011) * 1.2;

    let activeShiftX = 0;
    let activeBobY = 0;
    let activeScaleX = 1;
    let activeScaleY = 1;
    let activeAngle = 0;

    if (activeMode === 'fast-forward') {
      const pulse = elapsedMs * 0.0105;

      activeShiftX = Math.sin(pulse * 0.75) * 2.5 * intensity;
      activeBobY = Math.sin(pulse) * 10 * intensity;
      activeScaleX = 1 + Math.sin(pulse + 0.5) * 0.03 * intensity;
      activeScaleY = 1 + Math.cos(pulse * 1.35) * 0.038 * intensity;
      activeAngle = Math.sin(pulse * 0.9) * 3.2 * intensity;
      sprite.setTint(0xffe6b3);
    } else if (activeMode === 'rewind') {
      const pulse = elapsedMs * 0.0082;

      activeShiftX = Math.sin(pulse * 1.35) * 5.5 * intensity;
      activeBobY = Math.cos(pulse * 0.9) * 5 * intensity;
      activeScaleX = 1 + Math.sin(pulse * 1.2) * 0.018 * intensity;
      activeScaleY = 1 + Math.cos(pulse * 1.8) * 0.024 * intensity;
      activeAngle = -2.2 * intensity + Math.sin(pulse) * 2.4 * intensity;
      sprite.setTint(0xbfe7ff);
    } else {
      sprite.clearTint();
    }

    sprite.setPosition(
      base.restX + activeShiftX,
      base.restY + idleBobY + activeBobY,
    );
    sprite.setScale(idleScale * activeScaleX, idleScale * activeScaleY);
    sprite.setAngle(idleAngle + activeAngle);
  }

  destroy(): void {
    // No owned resources.
  }
}
