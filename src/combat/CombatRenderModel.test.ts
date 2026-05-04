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
    expect(model.record.slots[0]?.innerAnchor.x).toBeCloseTo(0);
    expect(model.record.slots[0]?.innerAnchor.y).toBeCloseTo(
      (-CombatLayoutConfig.RECORD_RADIUS / 2) * 0.85,
    );
    expect(model.record.slots[0]?.outerAnchor.x).toBeCloseTo(0);
    expect(model.record.slots[0]?.outerAnchor.y).toBeCloseTo(
      -CombatLayoutConfig.RECORD_RADIUS * 0.8,
    );
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

  it('maps the starter preset into occupied and empty slot visual primitives', () => {
    const model = createCombatRenderModel();

    expect(model.record.slots).toHaveLength(8);
    expect(model.record.slots[0]).toMatchObject({
      pawn: {
        id: 'pawn-red-generator',
        type: 'generator',
        color: 'red',
        constructFamily: 'generator',
        silhouetteKey: 'generator-red',
        pedestalStyleKey: 'pedestal-red',
        tierStars: 1,
        ruleLabel: '+♪♪',
      },
    });
    expect(model.record.slots[1]).toMatchObject({
      pawn: {
        id: 'pawn-green-finisher',
        type: 'finisher',
        color: 'green',
        constructFamily: 'finisher',
        silhouetteKey: 'finisher-green',
        pedestalStyleKey: 'pedestal-green',
        tierStars: 2,
        ruleLabel: '♪♪♪ > ♪',
      },
    });
    expect(model.record.slots[2]?.pawn).toBeNull();
    expect(model.record.slots[7]).toMatchObject({
      pawn: {
        id: 'pawn-blue-finisher',
        color: 'blue',
        ruleLabel: '♪♪♪ > ♪',
      },
    });
  });

  it('organizes slot visuals into rotating and upright ownership groups', () => {
    const model = createCombatRenderModel();

    expect(model.record.slots[0]).toMatchObject({
      presentation: {
        accentColor: 0xff5f7a,
        rotating: {
          pedestal: null,
          ruleLabel: {
            text: '+♪♪',
          },
          emptyLabel: null,
        },
        upright: {
          pedestal: {
            styleKey: 'pedestal-red',
          },
          construct: {
            family: 'generator',
            silhouetteKey: 'generator-red',
          },
          tierStars: {
            count: 1,
          },
        },
      },
    });
    expect(model.record.slots[2]).toMatchObject({
      presentation: {
        rotating: {
          pedestal: null,
          ruleLabel: null,
          emptyLabel: {
            text: 'EMPTY',
          },
        },
        upright: {
          pedestal: null,
          construct: null,
          tierStars: null,
        },
      },
    });
  });

  it('orients inner rule labels to match each sector heading', () => {
    const model = createCombatRenderModel();

    expect(model.record.slots[0]?.innerLabelRotationDeg).toBe(0);
    expect(model.record.slots[4]?.innerLabelRotationDeg).toBe(180);
    expect(model.record.slots[6]?.innerLabelRotationDeg).toBe(270);
  });

  it('describes all enemy runtime instances as shared container render units with y-sort anchors', () => {
    const model = createCombatRenderModel();

    // wave-1-a: 2 red + 1 green = 3
    // wave-1-b: 2 blue + 1 red = 3
    // Total: 3 red + 1 green + 2 blue = 6
    expect(model.enemies).toHaveLength(6);

    const firstThree = model.enemies.slice(0, 3);
    expect(firstThree).toEqual([
      {
        runtimeId: 'enemy-runtime-1',
        definitionId: 'enemy-red-basic',
        container: {
          name: 'enemy-container-1',
          x: 180,
          y: 240,
          depth: CombatLayoutConfig.DEPTH.PAWNS,
          sortY: 240,
        },
        body: {
          family: 'basic',
          silhouetteKey: 'enemy-basic',
          variantKey: 'enemy-basic-red',
          color: 0xff5f7a,
          width: 31,
          height: 36,
        },
        hpBar: {
          offsetY: -25,
          width: 23,
          height: 4,
        },
        attachments: {
          hitFlash: {
            x: 0,
            y: -3,
          },
        },
      },
      {
        runtimeId: 'enemy-runtime-2',
        definitionId: 'enemy-red-basic',
        container: {
          name: 'enemy-container-2',
          x: 360,
          y: 320,
          depth: CombatLayoutConfig.DEPTH.PAWNS,
          sortY: 320,
        },
        body: {
          family: 'basic',
          silhouetteKey: 'enemy-basic',
          variantKey: 'enemy-basic-red',
          color: 0xff5f7a,
          width: 31,
          height: 36,
        },
        hpBar: {
          offsetY: -25,
          width: 23,
          height: 4,
        },
        attachments: {
          hitFlash: {
            x: 0,
            y: -3,
          },
        },
      },
      {
        runtimeId: 'enemy-runtime-3',
        definitionId: 'enemy-red-basic',
        container: {
          name: 'enemy-container-3',
          x: 540,
          y: 400,
          depth: CombatLayoutConfig.DEPTH.PAWNS,
          sortY: 400,
        },
        body: {
          family: 'basic',
          silhouetteKey: 'enemy-basic',
          variantKey: 'enemy-basic-red',
          color: 0xff5f7a,
          width: 31,
          height: 36,
        },
        hpBar: {
          offsetY: -25,
          width: 23,
          height: 4,
        },
        attachments: {
          hitFlash: {
            x: 0,
            y: -3,
          },
        },
      },
    ]);

    const lastThree = model.enemies.slice(3);
    expect(lastThree).toEqual([
      {
        runtimeId: 'enemy-runtime-4',
        definitionId: 'enemy-green-basic',
        container: {
          name: 'enemy-container-4',
          x: 180,
          y: 240,
          depth: CombatLayoutConfig.DEPTH.PAWNS,
          sortY: 240,
        },
        body: {
          family: 'basic',
          silhouetteKey: 'enemy-basic',
          variantKey: 'enemy-basic-green',
          color: 0x63f5a6,
          width: 31,
          height: 36,
        },
        hpBar: {
          offsetY: -25,
          width: 23,
          height: 4,
        },
        attachments: {
          hitFlash: {
            x: 0,
            y: -3,
          },
        },
      },
      {
        runtimeId: 'enemy-runtime-5',
        definitionId: 'enemy-blue-basic',
        container: {
          name: 'enemy-container-5',
          x: 180,
          y: 240,
          depth: CombatLayoutConfig.DEPTH.PAWNS,
          sortY: 240,
        },
        body: {
          family: 'basic',
          silhouetteKey: 'enemy-basic',
          variantKey: 'enemy-basic-blue',
          color: 0x5db7ff,
          width: 31,
          height: 36,
        },
        hpBar: {
          offsetY: -25,
          width: 23,
          height: 4,
        },
        attachments: {
          hitFlash: {
            x: 0,
            y: -3,
          },
        },
      },
      {
        runtimeId: 'enemy-runtime-6',
        definitionId: 'enemy-blue-basic',
        container: {
          name: 'enemy-container-6',
          x: 180,
          y: 240,
          depth: CombatLayoutConfig.DEPTH.PAWNS,
          sortY: 240,
        },
        body: {
          family: 'basic',
          silhouetteKey: 'enemy-basic',
          variantKey: 'enemy-basic-blue',
          color: 0x5db7ff,
          width: 31,
          height: 36,
        },
        hpBar: {
          offsetY: -25,
          width: 23,
          height: 4,
        },
        attachments: {
          hitFlash: {
            x: 0,
            y: -3,
          },
        },
      },
    ]);
  });
});
