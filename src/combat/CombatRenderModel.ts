import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import {
  CombatContentConfig,
  type CombatPawnDefinition,
  type NoteColor,
  type PawnType,
} from '@config/CombatContentConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { GameConfig } from '@config/GameConfig';
import { createCombatLayoutPlan } from './CombatLayout';

interface CombatRenderPawnModel {
  id: string;
  type: PawnType;
  color: NoteColor;
  constructFamily: string;
  silhouetteKey: string;
  pedestalStyleKey: string;
  tierStars: number;
  ruleLabel: string;
}

interface CombatSlotPresentationModel {
  accentColor: number;
  rotating: {
    pedestal: null;
    ruleLabel: {
      text: string;
      color: number;
    } | null;
    emptyLabel: {
      text: string;
      color: number;
    } | null;
  };
  upright: {
    pedestal: {
      styleKey: string;
      color: number;
    } | null;
    construct: {
      family: string;
      silhouetteKey: string;
      color: number;
    } | null;
    tierStars: {
      count: number;
      color: number;
    } | null;
  };
}

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
      innerAnchor: {
        x: number;
        y: number;
      };
      innerLabelRotationDeg: number;
      outerAnchor: {
        x: number;
        y: number;
      };
      pawn: CombatRenderPawnModel | null;
      presentation: CombatSlotPresentationModel;
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
  const pawnDefinitionsById = new Map(
    CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => [pawn.id, pawn]),
  );
  const activeWave = CombatWaveConfig.WAVES[0];
  const activePreset = CombatContentConfig.SLOT_PRESETS.find(
    (preset) => preset.id === activeWave?.slotPresetId,
  );

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
        innerAnchor: getPolarOffset(
          slot.centerAngleDeg,
          (layout.record.radius / 2) * CombatVisualConfig.SLOT.INNER_ZONE_OFFSET_RATIO,
        ),
        innerLabelRotationDeg: getInnerLabelRotationDeg(slot.centerAngleDeg),
        outerAnchor: getPolarOffset(
          slot.centerAngleDeg,
          layout.record.radius * CombatVisualConfig.SLOT.OUTER_ZONE_OFFSET_RATIO,
        ),
        pawn: createSlotPawnRenderModel(
          activePreset?.slots[slot.index] ?? null,
          pawnDefinitionsById,
        ),
        presentation: createSlotPresentationModel(
          activePreset?.slots[slot.index] ?? null,
          pawnDefinitionsById,
        ),
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

function createSlotPawnRenderModel(
  pawnId: string | null,
  pawnDefinitionsById: ReadonlyMap<string, CombatPawnDefinition>,
): CombatRenderPawnModel | null {
  if (pawnId === null) {
    return null;
  }

  const pawnDefinition = pawnDefinitionsById.get(pawnId);

  if (!pawnDefinition) {
    return null;
  }

  return {
    id: pawnDefinition.id,
    type: pawnDefinition.type,
    color: pawnDefinition.color,
    constructFamily: pawnDefinition.visualFamilyKey,
    silhouetteKey: pawnDefinition.visualSilhouetteKey,
    pedestalStyleKey: pawnDefinition.pedestalStyleKey,
    tierStars: pawnDefinition.type === 'generator' ? 1 : 2,
    ruleLabel: pawnDefinition.type === 'generator' ? '+♪♪' : '-all ♪ -> +♪',
  };
}

function createSlotPresentationModel(
  pawnId: string | null,
  pawnDefinitionsById: ReadonlyMap<string, CombatPawnDefinition>,
): CombatSlotPresentationModel {
  const pawnDefinition = pawnId === null ? null : pawnDefinitionsById.get(pawnId) ?? null;

  if (!pawnDefinition) {
    return {
      accentColor: 0x81a4c5,
      rotating: {
        pedestal: null,
        ruleLabel: null,
        emptyLabel: {
          text: CombatVisualConfig.EMPTY_SLOT_LABEL,
          color: 0x86a8c4,
        },
      },
      upright: {
        pedestal: null,
        construct: null,
        tierStars: null,
      },
    };
  }

  const accentColor = getNoteColorValue(pawnDefinition.color);

  return {
    accentColor,
    rotating: {
      pedestal: null,
      ruleLabel: {
        text: pawnDefinition.type === 'generator' ? '+♪♪' : '-all ♪ -> +♪',
        color: accentColor,
      },
      emptyLabel: null,
    },
    upright: {
      pedestal: {
        styleKey: pawnDefinition.pedestalStyleKey,
        color: accentColor,
      },
      construct: {
        family: pawnDefinition.visualFamilyKey,
        silhouetteKey: pawnDefinition.visualSilhouetteKey,
        color: accentColor,
      },
      tierStars: {
        count: pawnDefinition.type === 'generator' ? 1 : 2,
        color: 0xffd166,
      },
    },
  };
}

function getNoteColorValue(color: NoteColor): number {
  return CombatVisualConfig.NOTE_COLORS[color];
}

function getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function getInnerLabelRotationDeg(centerAngleDeg: number): number {
  return PhaserAngleNormalize(centerAngleDeg + 90);
}

function PhaserAngleNormalize(angleDeg: number): number {
  return ((angleDeg % 360) + 360) % 360;
}
