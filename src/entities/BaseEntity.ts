import Phaser from 'phaser';
import type { IRenderable, EntityInitConfig } from '../types/index.js';

/**
 * Базовый класс для всех IRenderable-сущностей.
 *
 * Реализует общий жизненный цикл и создаёт базовую Phaser-визуализацию.
 * Подклассы переопределяют поведение через hook-методы, не переписывая общую
 * механику init/spawn/despawn.
 */
export abstract class BaseEntity implements IRenderable {
  id: number = -1;
  isActive: boolean = false;

  protected scene!: Phaser.Scene;
  protected textureKey!: string;
  protected frame?: string | number;
  protected gameObject!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  protected isInitialized = false;

  public get sprite(): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    if (!this.isInitialized) {
      throw new Error('BaseEntity.sprite was accessed before init()');
    }

    return this.gameObject;
  }

  init(config: EntityInitConfig): void {
    if (this.isInitialized) {
      return;
    }

    this.scene = config.scene;
    this.textureKey = config.key;
    this.frame = config.frame;
    this.gameObject = this.createGameObject(config);
    this.scene.add.existing(this.gameObject);
    this.gameObject.setVisible(false);
    this.gameObject.setActive(false);
    this.onInit(config);
    this.isInitialized = true;
  }

  spawn(x: number, y: number): void {
    this.isActive = true;
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.onSpawn(x, y);
  }

  despawn(): void {
    this.isActive = false;
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this.sprite.setPosition(-9999, -9999);
    this.onDespawn();
  }

  abstract update(delta: number): void;

  protected createGameObject(
    config: EntityInitConfig,
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    return new Phaser.GameObjects.Sprite(
      config.scene,
      0,
      0,
      config.key,
      config.frame,
    );
  }

  protected onInit(_config: EntityInitConfig): void {}

  protected onSpawn(_x: number, _y: number): void {}

  protected onDespawn(): void {}
}
