import { describe, expect, it } from 'vitest';
import {
  COMBAT_SLOT_COUNT,
  createCombatLayoutPlan,
  getCombatSlotCenterAngle,
} from './CombatLayout';

describe('CombatLayout', () => {
  it('derives one slot per configured combat slot with evenly spaced sector centers', () => {
    const plan = createCombatLayoutPlan();

    expect(plan.record.slots).toHaveLength(COMBAT_SLOT_COUNT);

    const slotStep = 360 / COMBAT_SLOT_COUNT;

    for (let index = 0; index < COMBAT_SLOT_COUNT; index += 1) {
      expect(getCombatSlotCenterAngle(index)).toBe(-90 + slotStep * index);
      expect(plan.record.slots[index]?.centerAngleDeg).toBe(getCombatSlotCenterAngle(index));
    }
  });

  it('keeps slot arcs contiguous and the derived anchors internally consistent', () => {
    const plan = createCombatLayoutPlan();

    expect(plan.enemyLane.top).toBeLessThan(plan.enemyLane.bottom);
    expect(plan.record.radius).toBeGreaterThan(0);
    expect(plan.base.width).toBeGreaterThan(0);
    expect(plan.base.height).toBeGreaterThan(0);
    expect(plan.needle.tipY).toBeLessThan(plan.record.centerY);
    expect(plan.notePacketAnchor.y).toBeLessThan(plan.base.y);

    for (let index = 0; index < plan.record.slots.length; index += 1) {
      const slot = plan.record.slots[index]!;
      const nextSlot = plan.record.slots[(index + 1) % plan.record.slots.length]!;
      const gapDeg = ((nextSlot.startAngleDeg - slot.endAngleDeg + 540) % 360) - 180;

      expect(gapDeg).toBeCloseTo(0);
    }
  });
});
