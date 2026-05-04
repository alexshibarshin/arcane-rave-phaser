import Phaser from 'phaser';
import { SceneKeys } from '@config/GameConfig';
import { resolveCombatControlIntent } from '@combat/CombatControlIntent';
import { restartCombatScenes } from '@combat/CombatSceneLifecycle';
import { publishCombatStateTransition } from '@combat/CombatHudEvents';
import { emit } from '@events/EventBus';
import { setCombatState, type CombatRuntime } from '@combat/CombatRuntime';
import { InputSystem } from './InputSystem';

export class CombatDebugInputSystem extends InputSystem {
  private pauseKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private victoryKey?: Phaser.Input.Keyboard.Key;
  private defeatKey?: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    private readonly getRuntime: () => CombatRuntime | undefined,
  ) {
    super(scene);
  }

  update(): void {
    const keyboard = this.scene.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.pauseKey ??= keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.restartKey ??= keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.victoryKey ??= keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
    this.defeatKey ??= keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    const runtime = this.getRuntime();

    if (!runtime) {
      return;
    }

    if (
      this.restartKey
      && Phaser.Input.Keyboard.JustDown(this.restartKey)
      && resolveCombatControlIntent(runtime.state, { restartPressed: true }) === 'restart'
    ) {
      restartCombatScenes(this.scene.scene, SceneKeys.HUD);
      emit('combat:restarted');
      return;
    }

    if (this.pauseKey && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      const nextState = runtime.state === 'paused' ? 'running' : 'paused';

      if (
        runtime.state === 'preview'
        || runtime.state === 'running'
        || runtime.state === 'paused'
      ) {
        this.transition(runtime, nextState);
      }
    }

    if (this.victoryKey && Phaser.Input.Keyboard.JustDown(this.victoryKey)) {
      if (runtime.state === 'running' || runtime.state === 'paused') {
        this.transition(runtime, 'victory');
      }
    }

    if (this.defeatKey && Phaser.Input.Keyboard.JustDown(this.defeatKey)) {
      if (runtime.state === 'running' || runtime.state === 'paused') {
        this.transition(runtime, 'defeat');
      }
    }
  }

  private transition(
    runtime: CombatRuntime,
    nextState: CombatRuntime['state'],
  ): void {
    const previousState = runtime.state;

    if (!setCombatState(runtime, nextState)) {
      return;
    }

    publishCombatStateTransition(previousState, nextState);
  }
}
