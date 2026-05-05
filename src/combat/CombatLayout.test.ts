import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import {
  COMBAT_SLOT_COUNT,
  createCombatLayoutPlan,
  getCombatSlotCenterAngle,
} from './CombatLayout';

describe('CombatLayout', () => {
  it('derives one slot per configured combat slot with evenly spaced sector centers', () => {
    const plan = createCombatLayoutPlan();

    expect(COMBAT_SLOT_COUNT).toBe(CombatContentConfig.SLOT_COUNT);
    expect(plan.record.slots).toHaveLength(COMBAT_SLOT_COUNT);

    const slotStep = 360 / COMBAT_SLOT_COUNT;

    for (let index = 0; index < COMBAT_SLOT_COUNT; index += 1) {
      expect(getCombatSlotCenterAngle(index)).toBe(-90 + slotStep * index);
      expect(plan.record.slots[index]?.centerAngleDeg).toBe(getCombatSlotCenterAngle(index));
    }
  });

  it('reuses layout config anchors instead of scene-local geometry', () => {
    const plan = createCombatLayoutPlan();

    expect(plan.record.centerX).toBe(CombatLayoutConfig.RECORD_CENTER_X);
    expect(plan.record.centerY).toBe(CombatLayoutConfig.RECORD_CENTER_Y);
    expect(plan.record.radius).toBe(CombatLayoutConfig.RECORD_RADIUS);
    expect(plan.enemyLane.top).toBe(CombatLayoutConfig.ENEMY_ZONE_TOP);
    expect(plan.enemyLane.bottom).toBe(CombatLayoutConfig.ENEMY_ZONE_BOTTOM);
    expect(plan.base).toEqual({
      x: CombatLayoutConfig.BASE_X,
      y: CombatLayoutConfig.BASE_Y,
      width: CombatLayoutConfig.BASE_WIDTH,
      height: CombatLayoutConfig.BASE_HEIGHT,
    });
    expect(plan.notePacketAnchor).toEqual({
      x: CombatLayoutConfig.NOTE_PACKET_ANCHOR_X,
      y: CombatLayoutConfig.NOTE_PACKET_ANCHOR_Y,
    });
  });
});
