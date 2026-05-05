import Phaser from 'phaser';
import type { IRenderable } from '@app-types/index';
import { ObjectPool } from '@utils/ObjectPool';
import { InputSystem } from '@systems/InputSystem';
import { SimulationSystem } from '@systems/SimulationSystem';
import { emit } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';

/**
 * Базовая runtime-сцена scaffold-проекта.
 *
 * Scene intentionally остаётся почти пустой. Она задаёт fixed frame pipeline и
 * набор hook-методов, через которые concrete-проект может подключать системы,
 * root-объекты и object pools.
 */
export class GameScene extends Phaser.Scene {
  protected readonly rootEntities: IRenderable[] = [];
  protected readonly objectPools: Array<ObjectPool<IRenderable>> = [];
  protected inputSystems: InputSystem[] = [];
  protected simulationSystems: SimulationSystem[] = [];

  constructor(key: string = SceneKeys.GAME) {
    super({ key });
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.rootEntities.length = 0;
    this.objectPools.length = 0;
    this.inputSystems = [];
    this.simulationSystems = [];

    this.inputSystems = this.createInputSystems();
    this.simulationSystems = this.createSimulationSystems();
    this.createSceneContent();

    const overlaySceneKey = this.getOverlaySceneKey();
    const overlaySceneData = this.getOverlaySceneData();

    if (overlaySceneKey && !this.scene.isActive(overlaySceneKey)) {
      this.scene.launch(overlaySceneKey, overlaySceneData);
    }

    emit('scene:ready', { key: this.scene.key });
    emit('game:ready');
  }

  update(_time: number, delta: number): void {
    for (const inputSystem of this.inputSystems) {
      inputSystem.update(delta);
    }

    for (const simulationSystem of this.simulationSystems) {
      simulationSystem.update(delta);
    }

    for (const entity of this.rootEntities) {
      if (entity.isActive) {
        entity.update(delta);
      }
    }

    for (const pool of this.objectPools) {
      pool.update(delta);
    }

    this.cleanupDespawned();
  }

  protected createInputSystems(): InputSystem[] {
    return [new InputSystem(this)];
  }

  protected createSimulationSystems(): SimulationSystem[] {
    return [new SimulationSystem(this)];
  }

  protected createSceneContent(): void {}

  protected getOverlaySceneKey(): string | null {
    return SceneKeys.UI;
  }

  protected getOverlaySceneData(): Record<string, unknown> | undefined {
    return undefined;
  }

  protected registerRootEntity<T extends IRenderable>(entity: T): T {
    this.rootEntities.push(entity);
    return entity;
  }

  protected registerPool<T extends IRenderable>(pool: ObjectPool<T>): ObjectPool<T> {
    this.objectPools.push(pool as ObjectPool<IRenderable>);
    return pool;
  }

  protected cleanupDespawned(): void {}

  private handleShutdown(): void {
    for (const system of this.inputSystems) {
      system.destroy?.();
    }

    for (const system of this.simulationSystems) {
      system.destroy?.();
    }

    for (const pool of this.objectPools) {
      pool.clear();
    }

    this.rootEntities.length = 0;
    this.objectPools.length = 0;
    this.inputSystems = [];
    this.simulationSystems = [];

    emit('scene:shutdown', { key: this.scene.key });
  }
}
