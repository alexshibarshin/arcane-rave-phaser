import Phaser from 'phaser';

/**
 * Базовая абстракция для любого runtime-объекта с визуальным представлением.
 *
 * Интерфейс intentionally остаётся узким: lifecycle + update + ссылка на
 * Phaser-объект. Более конкретные контракты можно добавлять поверх него в
 * проекте-надстройке.
 */
export interface IRenderable {
  id: number;
  isActive: boolean;
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  init(config: EntityInitConfig): void;
  spawn(x: number, y: number): void;
  despawn(): void;
  update(delta: number): void;
}

/**
 * Конфигурация инициализации renderable-объекта.
 */
export interface EntityInitConfig {
  scene: Phaser.Scene;
  key: string;
  frame?: string | number;
}

/**
 * Универсальная конфигурация координат для спавна/позиционирования.
 */
export interface EntitySpawnConfig {
  x: number;
  y: number;
}
