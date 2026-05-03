import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { GameConfig } from '@config/GameConfig';
import { createCombatLayoutPlan } from './CombatLayout';

export interface CombatRenderModel {
  background: {
    depth: number;
    width: number;
    height: number;
  };
  enemyLane: {
    depth: number;
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  record: {
    base: {
      depth: number;
      centerX: number;
      centerY: number;
      radius: number;
    };
    slots: Array<{
      index: number;
      depth: number;
      innerRadius: number;
      outerRadius: number;
      startAngleDeg: number;
      centerAngleDeg: number;
      endAngleDeg: number;
    }>;
  };
  base: {
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  baseHpBar: {
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  notePacketAnchor: {
    depth: number;
    x: number;
    y: number;
  };
  needle: {
    depth: number;
    baseX: number;
    baseY: number;
    tipX: number;
    tipY: number;
  };
  timeControls: Array<{
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  hud: {
    depth: number;
    pause: {
      x: number;
      y: number;
      align: 'left';
    };
    wave: {
      x: number;
      y: number;
      align: 'center';
    };
    enemies: {
      x: number;
      y: number;
      align: 'right';
    };
  };
}

export function createCombatRenderModel(): CombatRenderModel {
  const layout = createCombatLayoutPlan();
  const hpBarY = layout.base.y + layout.base.height / 2 + 24;
  const timeControlsY = layout.record.centerY - layout.record.radius - 72;

  return {
    background: {
      depth: CombatLayoutConfig.DEPTH.BACKGROUND,
      width: GameConfig.VIEWPORT_WIDTH,
      height: GameConfig.VIEWPORT_HEIGHT,
    },
    enemyLane: {
      depth: CombatLayoutConfig.DEPTH.ENEMY_LANE_DECORATIONS,
      top: layout.enemyLane.top,
      bottom: layout.enemyLane.bottom,
      left: CombatLayoutConfig.HUD_PADDING_X,
      right: GameConfig.VIEWPORT_WIDTH - CombatLayoutConfig.HUD_PADDING_X,
    },
    record: {
      base: {
        depth: CombatLayoutConfig.DEPTH.RECORD_BASE,
        centerX: layout.record.centerX,
        centerY: layout.record.centerY,
        radius: layout.record.radius,
      },
      slots: layout.record.slots.map((slot) => ({
        index: slot.index,
        depth: CombatLayoutConfig.DEPTH.RECORD_DETAILS,
        innerRadius: layout.record.radius / 2,
        outerRadius: layout.record.radius,
        startAngleDeg: slot.startAngleDeg,
        centerAngleDeg: slot.centerAngleDeg,
        endAngleDeg: slot.endAngleDeg,
      })),
    },
    base: {
      depth: CombatLayoutConfig.DEPTH.BASE,
      ...layout.base,
    },
    baseHpBar: {
      depth: CombatLayoutConfig.DEPTH.BASE,
      x: layout.base.x,
      y: hpBarY,
      width: CombatLayoutConfig.BASE_HP_BAR_WIDTH,
      height: CombatLayoutConfig.BASE_HP_BAR_HEIGHT,
    },
    notePacketAnchor: {
      depth: CombatLayoutConfig.DEPTH.NOTE_PACKET,
      ...layout.notePacketAnchor,
    },
    needle: {
      depth: CombatLayoutConfig.DEPTH.BASE,
      ...layout.needle,
    },
    timeControls: [
      {
        depth: CombatLayoutConfig.DEPTH.TIME_CONTROLS,
        x: layout.record.centerX - 120,
        y: timeControlsY,
        width: 84,
        height: 40,
      },
      {
        depth: CombatLayoutConfig.DEPTH.TIME_CONTROLS,
        x: layout.record.centerX + 120,
        y: timeControlsY,
        width: 84,
        height: 40,
      },
    ],
    hud: {
      depth: CombatLayoutConfig.DEPTH.HUD,
      pause: {
        x: CombatLayoutConfig.HUD_PADDING_X,
        y: CombatLayoutConfig.HUD_PADDING_Y,
        align: 'left',
      },
      wave: {
        x: GameConfig.VIEWPORT_WIDTH / 2,
        y: CombatLayoutConfig.HUD_PADDING_Y,
        align: 'center',
      },
      enemies: {
        x: GameConfig.VIEWPORT_WIDTH - CombatLayoutConfig.HUD_PADDING_X,
        y: CombatLayoutConfig.HUD_PADDING_Y,
        align: 'right',
      },
    },
  };
}
