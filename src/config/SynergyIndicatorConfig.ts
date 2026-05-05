import { CombatVisualConfig } from '@config/CombatVisualConfig';

export const SynergyIndicatorConfig = {
  ICON_SIZE: 36,
  ICON_RADIUS_OFFSET_RATIO: 0.76,
  ORB: {
    OUTER_RADIUS_RATIO: 0.5,
    INNER_RADIUS_RATIO: 0.38,
    CORE_RADIUS_RATIO: 0.24,
    RING_LINE_WIDTH: 2,
    GLOW_ALPHA: 0.24,
    BODY_ALPHA: 0.68,
    CORE_ALPHA: 0.78,
  },
  COLORS: {
    SYNERGY: CombatVisualConfig.NOTE_COLORS.green,
    BROKEN: CombatVisualConfig.NOTE_COLORS.red,
    SHELL: 0xe9f7ff,
    CORE: 0xffffff,
    SHADOW: 0x07111d,
  },
  ANIMATION: {
    PULSE_SCALE_AMPLITUDE: 0.15,
    PULSE_SCALE_PERIOD_MS: 600,
    PULSE_BASE_SCALE: 1,
    BASE_ALPHA: 0.82,
    CURRENT_PAIR_ALPHA: 1,
  },
} as const;
