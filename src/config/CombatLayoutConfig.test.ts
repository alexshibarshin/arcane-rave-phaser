import { describe, expect, it } from 'vitest';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { GameConfig } from '@config/GameConfig';

describe('CombatLayoutConfig', () => {
  it('keeps core combat anchors inside the viewport with ordered vertical zones', () => {
    expect(CombatLayoutConfig.RECORD_CENTER_X).toBe(GameConfig.VIEWPORT_WIDTH / 2);
    expect(CombatLayoutConfig.BASE_X).toBe(GameConfig.VIEWPORT_WIDTH / 2);
    expect(CombatLayoutConfig.NOTE_PACKET_ANCHOR_X).toBe(GameConfig.VIEWPORT_WIDTH / 2);

    expect(CombatLayoutConfig.ENEMY_ZONE_TOP).toBeLessThan(CombatLayoutConfig.ENEMY_ZONE_BOTTOM);
    expect(CombatLayoutConfig.ENEMY_SPAWN_Y).toBeLessThan(CombatLayoutConfig.ENEMY_ZONE_TOP);
    expect(CombatLayoutConfig.ENEMY_SPAWN_X_MIN).toBeGreaterThanOrEqual(0);
    expect(CombatLayoutConfig.ENEMY_SPAWN_X_MAX).toBeLessThanOrEqual(GameConfig.VIEWPORT_WIDTH);
    expect(CombatLayoutConfig.ENEMY_SPAWN_X_MIN).toBeLessThan(CombatLayoutConfig.ENEMY_SPAWN_X_MAX);
  });

  it('declares render depths in strictly increasing layer order', () => {
    const depths = Object.values(CombatLayoutConfig.DEPTH);

    expect(depths.length).toBeGreaterThan(0);

    for (let index = 1; index < depths.length; index += 1) {
      expect(depths[index]).toBeGreaterThan(depths[index - 1]!);
    }
  });
});
