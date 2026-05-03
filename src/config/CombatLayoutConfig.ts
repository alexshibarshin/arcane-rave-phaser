import { GameConfig } from '@config/GameConfig';

export const CombatLayoutConfig = {
  HUD_PADDING_X: 24,
  HUD_PADDING_Y: 20,
  BASE_X: GameConfig.VIEWPORT_WIDTH / 2,
  BASE_Y: GameConfig.VIEWPORT_HEIGHT - 120,
} as const;
