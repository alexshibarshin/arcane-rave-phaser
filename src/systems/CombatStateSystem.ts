import Phaser from 'phaser';
import { advanceCombatRuntime, type CombatRuntime } from '@combat/CombatRuntime';
import type { CombatRuntimeEvent } from '@combat/CombatRuntimeEvents';
import {
  publishCombatStateTransition,
  publishCombatHudSnapshot,
} from '@combat/CombatHudEvents';
import { SimulationSystem } from './SimulationSystem';

export class CombatStateSystem extends SimulationSystem {
  private onFrameEvents?: (events: CombatRuntimeEvent[]) => void;

  constructor(
    scene: Phaser.Scene,
    private readonly getRuntime: () => CombatRuntime | undefined,
  ) {
    super(scene);
  }

  setFrameEventsHandler(handler: (events: CombatRuntimeEvent[]) => void): void {
    this.onFrameEvents = handler;
  }

  update(delta: number): void {
    const runtime = this.getRuntime();

    if (!runtime) {
      return;
    }

    const previousState = runtime.state;
    advanceCombatRuntime(runtime, delta);

    publishCombatHudSnapshot(runtime);

    if (this.onFrameEvents && runtime.effects.pendingEvents.length > 0) {
      this.onFrameEvents(runtime.effects.pendingEvents);
    }

    if (runtime.state !== previousState) {
      publishCombatStateTransition(previousState, runtime.state, runtime);
    }
  }
}
