import { describe, expect, it } from 'vitest';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { createCombatRenderModel } from './CombatRenderModel';

describe('CombatRenderModel', () => {
  it('exposes the first static combat composition as config-driven world anchors', () => {
    const model = createCombatRenderModel();

    expect(model.background.depth).toBe(CombatLayoutConfig.DEPTH.BACKGROUND);
    expect(model.enemyLane).toMatchObject({
      depth: CombatLayoutConfig.DEPTH.ENEMY_LANE_DECORATIONS,
      top: CombatLayoutConfig.ENEMY_ZONE_TOP,
      bottom: CombatLayoutConfig.ENEMY_ZONE_BOTTOM,
    });
    expect(model.record.base.depth).toBe(CombatLayoutConfig.DEPTH.RECORD_BASE);
    expect(model.record.slots).toHaveLength(8);
    expect(model.record.slots[0]).toMatchObject({
      index: 0,
      depth: CombatLayoutConfig.DEPTH.RECORD_DETAILS,
      outerRadius: CombatLayoutConfig.RECORD_RADIUS,
      innerRadius: CombatLayoutConfig.RECORD_RADIUS / 2,
      centerAngleDeg: -90,
    });
    expect(model.base.depth).toBe(CombatLayoutConfig.DEPTH.BASE);
    expect(model.baseHpBar.depth).toBe(CombatLayoutConfig.DEPTH.BASE);
    expect(model.notePacketAnchor.depth).toBe(CombatLayoutConfig.DEPTH.NOTE_PACKET);
    expect(model.needle.depth).toBe(CombatLayoutConfig.DEPTH.BASE);
  });

  it('defines the top HUD placeholder anchors without scene-local magic numbers', () => {
    const model = createCombatRenderModel();

    expect(model.hud.depth).toBe(CombatLayoutConfig.DEPTH.HUD);
    expect(model.hud.pause).toEqual({
      x: CombatLayoutConfig.HUD_PADDING_X,
      y: CombatLayoutConfig.HUD_PADDING_Y,
      align: 'left',
    });
    expect(model.hud.wave.x).toBe(CombatLayoutConfig.RECORD_CENTER_X);
    expect(model.hud.enemies.align).toBe('right');
  });
});
