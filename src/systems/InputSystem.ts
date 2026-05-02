import Phaser from 'phaser';
import type { SceneSystem } from './SceneSystem.js';

/**
 * Базовый input-adapter для кадра.
 *
 * В scaffold по умолчанию ничего не эмитит: это нейтральная extension point для
 * проектов, которым нужен слой чтения клавиатуры/мыши/тача перед симуляцией.
 */
export class InputSystem implements SceneSystem {
  protected readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(_delta: number): void {
    // Intentionally empty in the scaffold.
  }

  destroy(): void {
    // Intentionally empty in the scaffold.
  }
}
