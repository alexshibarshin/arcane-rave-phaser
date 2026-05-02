import type { IRenderable } from '../types/index.js';
import Phaser from 'phaser';

/**
 * Абстракция рендера для IRenderable-сущностей.
 *
 * Позволяет отделить lifecycle runtime-объекта от конкретной реализации
 * визуального слоя. Scaffold использует Phaser GameObjects как дефолт, но не
 * навязывает их как единственный вариант.
 */
export interface IRenderer {
  register(entity: IRenderable): void;
  update(entity: IRenderable, delta: number): void;
  destroy(entity: IRenderable): void;
  clear(): void;
}

/**
 * Дефолтный renderer для sprite/image-backed объектов.
 */
export class SpriteRenderer implements IRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  register(_entity: IRenderable): void {
    // Phaser GameObjects already participate in the Scene display list.
  }

  update(_entity: IRenderable, _delta: number): void {
    // Default Phaser-backed objects update themselves through the scene graph.
  }

  destroy(_entity: IRenderable): void {
    // Lifecycle stays owned by the entity/pool layer.
  }

  clear(): void {
    // No-op in the scaffold.
  }
}
