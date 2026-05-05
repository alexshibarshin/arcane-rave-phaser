/**
 * Глобальные константы.
 *
 * Все базовые параметры приложения и runtime-лимиты хранятся здесь.
 */
export const GameConfig = {
  VIEWPORT_WIDTH: 720,
  VIEWPORT_HEIGHT: 1280,
  BACKGROUND_COLOR: '#101418',
  TARGET_FPS: 60,
  DEFAULT_POOL_CAPACITY: 100,
} as const;

/**
 * Ключи сцен вынесены в общий config, чтобы не размазывать строковые литералы.
 */
export const SceneKeys = {
  BOOT: 'BootScene',
  GAME: 'GameScene',
  UI: 'UIScene',
  COMBAT: 'CombatScene',
  HUD: 'HUDScene',
} as const;
