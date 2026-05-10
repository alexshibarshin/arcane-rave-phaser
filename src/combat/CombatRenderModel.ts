import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import {
  CombatContentConfig,
  type CombatEnemyDefinition,
  type CombatPawnDefinition,
  type NoteColor,
  type PawnType,
} from '@config/CombatContentConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { GameConfig } from '@config/GameConfig';
import type { SubWaveDefinition } from '@config/StageConfig';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import { createCombatLayoutPlan } from './CombatLayout';

interface CombatRenderPawnModel {
  id: string;
  displayName: string;
  type: PawnType;
  color: NoteColor;
  constructFamily: string;
  silhouetteKey: string;
  pedestalStyleKey: string;
  spriteTextureKey: string;
  spriteFrame: number;
  spriteOffsetX: number;
  spriteOffsetY: number;
  tierStars: number;
  ruleLabel: string;
}

interface CombatRuleLabelSegment {
  text: string;
  color: number;
  isNoteGlyph: boolean;
}

interface CombatSlotPresentationModel {
  accentColor: number;
  rotating: {
    pedestal: null;
    ruleLabel: {
      text: string;
      segments: CombatRuleLabelSegment[];
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
      spriteTextureKey: string;
      spriteFrame: number;
      spriteOffsetX: number;
      spriteOffsetY: number;
      color: number;
    } | null;
    tierStars: {
      count: number;
      color: number;
    } | null;
  };
}

interface CombatEnemyRenderModel {
  runtimeId: string;
  definitionId: string;
  container: {
    name: string;
    x: number;
    y: number;
    depth: number;
    sortY: number;
  };
  body: {
    family: string;
    silhouetteKey: string;
    variantKey: string;
    color: number;
    width: number;
    height: number;
  };
  hpBar: {
    offsetY: number;
    width: number;
    height: number;
  };
  attachments: {
    hitFlash: {
      x: number;
      y: number;
    };
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
  timeControls: {
    depth: number;
    rewindButton: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    fastForwardButton: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    chronoBar: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  hud: {
    depth: number;
    pause: {
      x: number;
      y: number;
      width: number;
      height: number;
      hitWidth: number;
      hitHeight: number;
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
    overlay: {
      label: {
        x: number;
        y: number;
      };
      primaryAction: {
        x: number;
        y: number;
      };
      secondaryAction: {
        x: number;
        y: number;
      };
    };
  };
  enemies: CombatEnemyRenderModel[];
}

export interface CreateCombatRenderModelOptions {
  waveIndex?: number;
  slotPawns?: Array<{ pawnId: string | null; tier: number | null }>;
  slotPawnIds?: Array<string | null>;
  subWaves?: SubWaveDefinition[];
}

export function createCombatRenderModel(
  options: CreateCombatRenderModelOptions = {},
): CombatRenderModel {
  const layout = createCombatLayoutPlan();
  const innerZoneRadius = layout.record.radius * CombatLayoutConfig.RECORD_INNER_ZONE_RADIUS_RATIO;
  const hpBarY = layout.base.y + layout.base.height / 2 + 24;
  const timeControlsY = layout.record.centerY - layout.record.radius - CombatLayoutConfig.TIME_CONTROL_Y_OFFSET;
  const pawnDefinitionsById = new Map(
    CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => [pawn.id, pawn]),
  );
  const enemyDefinitionsById = new Map(
    CombatContentConfig.ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
  );
  const slotPawns = resolveRenderSlotPawns(options, []);

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
        innerRadius: innerZoneRadius,
        outerRadius: layout.record.radius,
        startAngleDeg: slot.startAngleDeg,
        centerAngleDeg: slot.centerAngleDeg,
        endAngleDeg: slot.endAngleDeg,
        innerAnchor: getPolarOffset(
          slot.centerAngleDeg,
          innerZoneRadius * CombatVisualConfig.SLOT.INNER_ZONE_OFFSET_RATIO,
        ),
        innerLabelRotationDeg: getInnerLabelRotationDeg(slot.centerAngleDeg),
        outerAnchor: getPolarOffset(
          slot.centerAngleDeg,
          layout.record.radius * CombatVisualConfig.SLOT.OUTER_ZONE_OFFSET_RATIO,
        ),
        pawn: createSlotPawnRenderModel(
          slotPawns[slot.index]?.pawnId ?? null,
          slotPawns[slot.index]?.tier ?? null,
          pawnDefinitionsById,
        ),
        presentation: createSlotPresentationModel(
          slotPawns[slot.index]?.pawnId ?? null,
          slotPawns[slot.index]?.tier ?? null,
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
    timeControls: {
      depth: CombatLayoutConfig.DEPTH.TIME_CONTROLS,
      rewindButton: {
        x: layout.record.centerX - CombatLayoutConfig.TIME_CONTROL_BUTTON_OFFSET_X,
        y: timeControlsY,
        width: CombatLayoutConfig.TIME_CONTROL_BUTTON_WIDTH,
        height: CombatLayoutConfig.TIME_CONTROL_BUTTON_HEIGHT,
      },
      fastForwardButton: {
        x: layout.record.centerX + CombatLayoutConfig.TIME_CONTROL_BUTTON_OFFSET_X,
        y: timeControlsY,
        width: CombatLayoutConfig.TIME_CONTROL_BUTTON_WIDTH,
        height: CombatLayoutConfig.TIME_CONTROL_BUTTON_HEIGHT,
      },
      chronoBar: {
        x: layout.record.centerX,
        y: timeControlsY,
        width: CombatLayoutConfig.TIME_CONTROL_BAR_WIDTH,
        height: CombatLayoutConfig.TIME_CONTROL_BAR_HEIGHT,
      },
    },
    hud: {
      depth: CombatLayoutConfig.DEPTH.HUD,
      pause: {
        x: CombatLayoutConfig.HUD_PADDING_X,
        y: CombatLayoutConfig.HUD_PADDING_Y,
        width: 52,
        height: 52,
        hitWidth: 80,
        hitHeight: 80,
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
      overlay: {
        label: {
          x: GameConfig.VIEWPORT_WIDTH / 2,
          y: GameConfig.VIEWPORT_HEIGHT / 2,
        },
        primaryAction: {
          x: GameConfig.VIEWPORT_WIDTH / 2,
          y: GameConfig.VIEWPORT_HEIGHT / 2 + 92,
        },
        secondaryAction: {
          x: GameConfig.VIEWPORT_WIDTH / 2,
          y: GameConfig.VIEWPORT_HEIGHT / 2 + 160,
        },
      },
    },
    enemies: createCombatEnemyRuntimes(options.subWaves ?? []).flatMap((enemyRuntime) => {
      const definition = enemyDefinitionsById.get(enemyRuntime.definitionId);

      return definition ? [createEnemyRenderModel(enemyRuntime, definition)] : [];
    }),
  };
}

function resolveRenderSlotPawns(
  options: CreateCombatRenderModelOptions,
  fallbackPawnIds: Array<string | null>,
): Array<{ pawnId: string | null; tier: number | null }> {
  if (options.slotPawns) {
    return options.slotPawns.map((slot) => ({
      pawnId: slot?.pawnId ?? null,
      tier: slot?.pawnId === null ? null : Math.max(1, slot?.tier ?? 1),
    }));
  }

  const slotPawnIds = options.slotPawnIds ?? fallbackPawnIds;

  return slotPawnIds.map((pawnId) => ({
    pawnId: pawnId ?? null,
    tier: pawnId === null ? null : 1,
  }));
}

function createEnemyRenderModel(
  enemyRuntime: ReturnType<typeof createCombatEnemyRuntimes>[number],
  definition: CombatEnemyDefinition,
): CombatEnemyRenderModel {
  const scaleMultiplier =
    CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS[
      definition.archetype as keyof typeof CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS
    ] ?? 1;
  const bodyWidth = CombatVisualConfig.ENEMY.BASE_BODY_WIDTH * scaleMultiplier;
  const bodyHeight = CombatVisualConfig.ENEMY.BASE_BODY_HEIGHT * scaleMultiplier;
  const hpBarWidth = Math.max(
    CombatVisualConfig.ENEMY.HP_BAR_WIDTH,
    Math.round(CombatVisualConfig.ENEMY.HP_BAR_WIDTH * Math.min(scaleMultiplier, 1.9)),
  );
  const hpBarOffsetY = Math.round(
    CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y - (bodyHeight - CombatVisualConfig.ENEMY.BASE_BODY_HEIGHT) * 0.45,
  );

  return {
    runtimeId: enemyRuntime.runtimeId,
    definitionId: definition.id,
    container: {
      name: enemyRuntime.renderContainerName,
      x: enemyRuntime.x,
      y: enemyRuntime.y,
      depth: CombatLayoutConfig.DEPTH.PAWNS,
      sortY: enemyRuntime.y,
    },
    body: {
      family: definition.archetype,
      silhouetteKey: `enemy-${definition.archetype}`,
      variantKey: definition.visualKey,
      color: CombatVisualConfig.NOTE_COLORS[definition.color],
      width: bodyWidth,
      height: bodyHeight,
    },
    hpBar: {
      offsetY: hpBarOffsetY,
      width: hpBarWidth,
      height: CombatVisualConfig.ENEMY.HP_BAR_HEIGHT,
    },
    attachments: {
      hitFlash: {
        x: 0,
        y: CombatVisualConfig.ENEMY.HIT_FLASH_OFFSET_Y,
      },
    },
  };
}

function createSlotPawnRenderModel(
  pawnId: string | null,
  pawnTier: number | null,
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
    displayName: pawnDefinition.displayName,
    type: pawnDefinition.type,
    color: pawnDefinition.color,
    constructFamily: pawnDefinition.visualFamilyKey,
    silhouetteKey: pawnDefinition.visualSilhouetteKey,
    pedestalStyleKey: pawnDefinition.pedestalStyleKey,
    spriteTextureKey: pawnDefinition.art.textureKey,
    spriteFrame: pawnDefinition.art.frame,
    spriteOffsetX: pawnDefinition.art.offsetX,
    spriteOffsetY: pawnDefinition.art.offsetY,
    tierStars: normalizePawnTier(pawnId, pawnTier),
    ruleLabel: pawnDefinition.type === 'generator' ? '+♪♪' : '♪♪♪ > ♪',
  };
}

function createSlotPresentationModel(
  pawnId: string | null,
  pawnTier: number | null,
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
  const ruleLabel = createRuleLabelText(pawnDefinition);

  return {
    accentColor,
    rotating: {
      pedestal: null,
      ruleLabel: {
        text: ruleLabel,
        segments: createRuleLabelSegments(pawnDefinition),
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
        spriteTextureKey: pawnDefinition.art.textureKey,
        spriteFrame: pawnDefinition.art.frame,
        spriteOffsetX: pawnDefinition.art.offsetX,
        spriteOffsetY: pawnDefinition.art.offsetY,
        color: accentColor,
      },
      tierStars: {
        count: normalizePawnTier(pawnId, pawnTier),
        color: 0xffd166,
      },
    },
  };
}

function normalizePawnTier(pawnId: string | null, pawnTier: number | null): number {
  if (pawnId === null) {
    return 0;
  }

  return Math.max(1, pawnTier ?? 1);
}

function getNoteColorValue(color: NoteColor): number {
  return CombatVisualConfig.NOTE_COLORS[color];
}

function createRuleLabelText(pawnDefinition: CombatPawnDefinition): string {
  return pawnDefinition.type === 'generator' ? '+♪♪' : '♪♪♪ > ♪';
}

function createRuleLabelSegments(
  pawnDefinition: CombatPawnDefinition,
): CombatRuleLabelSegment[] {
  const white = 0xffffff;
  const absorbedColor = getNoteColorValue(pawnDefinition.color);

  if (pawnDefinition.type === 'generator') {
    return [
      { text: '+', color: white, isNoteGlyph: false },
      { text: '♪', color: absorbedColor, isNoteGlyph: true },
      { text: '♪', color: absorbedColor, isNoteGlyph: true },
    ];
  }

  const emittedColor = getNoteColorValue(pawnDefinition.outputNoteColor);

  return [
    { text: '♪', color: absorbedColor, isNoteGlyph: true },
    { text: '♪', color: absorbedColor, isNoteGlyph: true },
    { text: '♪', color: absorbedColor, isNoteGlyph: true },
    { text: ' ', color: white, isNoteGlyph: false },
    { text: '>', color: white, isNoteGlyph: false },
    { text: ' ', color: white, isNoteGlyph: false },
    { text: '♪', color: emittedColor, isNoteGlyph: true },
  ];
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
