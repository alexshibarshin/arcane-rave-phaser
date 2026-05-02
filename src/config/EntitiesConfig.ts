import { GameConfig } from './GameConfig.js';

/**
 * Базовые настройки для sprite-backed renderable-объектов.
 *
 * Здесь лежат только scaffold-уровневые значения, не привязанные к конкретному
 * геймплею.
 */
export const EntityConfig = {
  PLACEHOLDER_TEXTURE_KEY: '__placeholder-renderable',
  DEFAULT_ORIGIN_X: 0.5,
  DEFAULT_ORIGIN_Y: 0.5,
  DEFAULT_POOL_CAPACITY: GameConfig.DEFAULT_POOL_CAPACITY,
} as const;
