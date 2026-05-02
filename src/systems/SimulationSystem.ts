import Phaser from 'phaser';
import type { SceneSystem } from './SceneSystem.js';

/**
 * Базовая система симуляции.
 *
 * Это нейтральный hook для game-specific логики, которую нужно выполнять после
 * input-фазы и до update renderable-объектов.
 */
export class SimulationSystem implements SceneSystem {
  protected readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Обновить систему в simulation-фазе кадра. */
  update(_delta: number): void {
    // Intentionally empty in the scaffold.
  }

  destroy(): void {
    // Intentionally empty in the scaffold.
  }
}
