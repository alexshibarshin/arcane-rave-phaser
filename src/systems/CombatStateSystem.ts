import Phaser from 'phaser';
import { advanceCombatRuntime, type CombatRuntime } from '@combat/CombatRuntime';
import { publishCombatStateTransition } from '@combat/CombatHudEvents';
import { SimulationSystem } from './SimulationSystem';

export class CombatStateSystem extends SimulationSystem {
  constructor(
    scene: Phaser.Scene,
    private readonly getRuntime: () => CombatRuntime | undefined,
  ) {
    super(scene);
  }

  update(delta: number): void {
    const runtime = this.getRuntime();

    if (!runtime) {
      return;
    }

    const previousState = runtime.state;
    advanceCombatRuntime(runtime, delta);

    if (runtime.state !== previousState) {
      publishCombatStateTransition(previousState, runtime.state);
    }
  }
}
