import { describe, expect, it } from 'vitest';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import {
  COMBAT_SLOT_COUNT,
  createCombatLayoutPlan,
  getCombatSlotCenterAngle,
} from './CombatLayout';

describe('CombatLayout', () => {
  it('defines an 8-slot record with slot 0 centered under the fixed 12:00 needle', () => {
    expect(COMBAT_SLOT_COUNT).toBe(8);

    const plan = createCombatLayoutPlan();

    expect(plan.record.centerX).toBe(CombatLayoutConfig.RECORD_CENTER_X);
    expect(plan.record.centerY).toBe(CombatLayoutConfig.RECORD_CENTER_Y);
    expect(plan.record.radius).toBe(CombatLayoutConfig.RECORD_RADIUS);
    expect(plan.record.slots).toHaveLength(COMBAT_SLOT_COUNT);

    expect(getCombatSlotCenterAngle(0)).toBe(-90);
    expect(plan.record.slots[0]).toMatchObject({
      index: 0,
      centerAngleDeg: -90,
      startAngleDeg: -112.5,
      endAngleDeg: -67.5,
    });
    expect(plan.record.slots[1]?.centerAngleDeg).toBe(-45);
    expect(plan.record.slots[7]?.centerAngleDeg).toBe(225);
  });

  it('captures the static world anchors needed by the first combat composition', () => {
    const plan = createCombatLayoutPlan();

    expect(plan.enemyLane).toEqual({
      top: CombatLayoutConfig.ENEMY_ZONE_TOP,
      bottom: CombatLayoutConfig.ENEMY_ZONE_BOTTOM,
      centerX: CombatLayoutConfig.RECORD_CENTER_X,
    });
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
    expect(plan.needle.baseX).toBe(CombatLayoutConfig.BASE_X);
    expect(plan.needle.tipY).toBe(
      CombatLayoutConfig.RECORD_CENTER_Y - CombatLayoutConfig.RECORD_RADIUS,
    );
  });
});
