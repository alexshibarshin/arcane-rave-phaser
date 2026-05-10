import { CombatLayoutConfig } from '@config/CombatLayoutConfig';

export const COMBAT_SLOT_COUNT = 8;
const SLOT_ARC_DEGREES = 360 / COMBAT_SLOT_COUNT;
export const COMBAT_NEEDLE_ANGLE_DEGREES = -90;

export interface CombatSlotLayout {
  index: number;
  startAngleDeg: number;
  centerAngleDeg: number;
  endAngleDeg: number;
}

export interface CombatLayoutPlan {
  enemyLane: {
    top: number;
    bottom: number;
    centerX: number;
  };
  record: {
    centerX: number;
    centerY: number;
    radius: number;
    slots: CombatSlotLayout[];
  };
  base: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  notePacketAnchor: {
    x: number;
    y: number;
  };
  needle: {
    baseX: number;
    baseY: number;
    tipX: number;
    tipY: number;
  };
}

export function getCombatSlotCenterAngle(index: number): number {
  return COMBAT_NEEDLE_ANGLE_DEGREES + SLOT_ARC_DEGREES * index;
}

let cachedLayoutPlan: CombatLayoutPlan | null = null;

export function createCombatLayoutPlan(): CombatLayoutPlan {
  if (cachedLayoutPlan) {
    return cachedLayoutPlan;
  }

  const slots = Array.from({ length: COMBAT_SLOT_COUNT }, (_, index) => {
    const centerAngleDeg = getCombatSlotCenterAngle(index);

    return {
      index,
      centerAngleDeg,
      startAngleDeg: centerAngleDeg - SLOT_ARC_DEGREES / 2,
      endAngleDeg: centerAngleDeg + SLOT_ARC_DEGREES / 2,
    };
  });

  cachedLayoutPlan = {
    enemyLane: {
      top: CombatLayoutConfig.ENEMY_ZONE_TOP,
      bottom: CombatLayoutConfig.ENEMY_ZONE_BOTTOM,
      centerX: CombatLayoutConfig.RECORD_CENTER_X,
    },
    record: {
      centerX: CombatLayoutConfig.RECORD_CENTER_X,
      centerY: CombatLayoutConfig.RECORD_CENTER_Y,
      radius: CombatLayoutConfig.RECORD_RADIUS,
      slots,
    },
    base: {
      x: CombatLayoutConfig.BASE_X,
      y: CombatLayoutConfig.BASE_Y,
      width: CombatLayoutConfig.BASE_WIDTH,
      height: CombatLayoutConfig.BASE_HEIGHT,
    },
    notePacketAnchor: {
      x: CombatLayoutConfig.NOTE_PACKET_ANCHOR_X,
      y: CombatLayoutConfig.NOTE_PACKET_ANCHOR_Y,
    },
    needle: {
      baseX: CombatLayoutConfig.BASE_X,
      baseY: CombatLayoutConfig.BASE_Y - CombatLayoutConfig.BASE_HEIGHT / 2,
      tipX: CombatLayoutConfig.RECORD_CENTER_X,
      tipY: CombatLayoutConfig.RECORD_CENTER_Y - CombatLayoutConfig.RECORD_RADIUS,
    },
  };

  return cachedLayoutPlan;
}
