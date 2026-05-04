import { describe, expect, it } from 'vitest';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { GameConfig } from '@config/GameConfig';

describe('CombatLayoutConfig', () => {
  it('defines the portrait combat viewport and major layout anchors from config', () => {
    expect(GameConfig.VIEWPORT_WIDTH).toBe(720);
    expect(GameConfig.VIEWPORT_HEIGHT).toBe(1280);

    expect(CombatLayoutConfig).toMatchObject({
      RECORD_CENTER_X: 360,
      RECORD_CENTER_Y: 1160,
      RECORD_RADIUS: 350,
      BASE_X: 360,
      BASE_Y: 1160,
      BASE_WIDTH: 200,
      BASE_HEIGHT: 180,
      BASE_HP_BAR_WIDTH: 180,
      BASE_HP_BAR_HEIGHT: 18,
      NOTE_PACKET_ANCHOR_Y: 1050,
      ENEMY_ZONE_TOP: 120,
      ENEMY_ZONE_BOTTOM: 1200,
      HUD_PADDING_X: 24,
      HUD_PADDING_Y: 20,
    });
  });

  it('declares named combat render layers instead of scattered magic depths', () => {
    expect(CombatLayoutConfig.DEPTH).toEqual({
      BACKGROUND: 0,
      ENEMY_LANE_DECORATIONS: 100,
      RECORD_BASE: 200,
      RECORD_DETAILS: 300,
      TIME_CONTROLS: 400,
      BASE: 500,
      PAWNS: 600,
      NOTE_PACKET: 700,
      VFX: 800,
      HUD: 900,
      OVERLAY: 1000,
    });
  });
});
