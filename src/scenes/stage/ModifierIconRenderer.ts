import type Phaser from 'phaser';
import { CombatContentConfig } from '@config/CombatContentConfig';
import {
  SLOT_MODIFIER_CONFIG,
  type SlotModifierDefinition,
} from '@config/SlotModifierConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import type { StageRuntime } from '@stage/StageRuntime';

const ICON_OFFSET_PX = 40;
const ICON_RADIUS_PX = 28;

export interface ModifierIconView {
  slotIndex: number;
  modifierId: string;
  container: Phaser.GameObjects.Container;
}

export function createModifierIcons(
  scene: Phaser.Scene,
  stageRuntime: StageRuntime,
  recordGroup: Phaser.GameObjects.Container,
): ModifierIconView[] {
  const views: ModifierIconView[] = [];
  const slotCount = CombatContentConfig.SLOT_COUNT;
  const iconDistance = StagePresentationConfig.BUILD_RECORD_RADIUS + ICON_OFFSET_PX;
  const visible = stageRuntime.phase === 'build';

  for (const assignment of stageRuntime.slotModifiers) {
    const modifier = SLOT_MODIFIER_CONFIG.getModifierById(assignment.modifierId);
    if (!modifier) {
      continue;
    }

    const angleDeg = -90 + (360 / slotCount) * assignment.slotIndex;
    const { x, y } = getPolarOffset(angleDeg, iconDistance);
    const container = scene.add.container(x, y);
    const badge = scene.add.graphics();
    const glyph = scene.add.text(0, 0, getModifierGlyph(modifier), {
      color: '#071019',
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    drawModifierBadge(badge, modifier);
    container.add([badge, glyph]);
    container.setVisible(visible);
    recordGroup.add(container);

    views.push({
      slotIndex: assignment.slotIndex,
      modifierId: assignment.modifierId,
      container,
    });
  }

  return views;
}

function drawModifierBadge(
  graphics: Phaser.GameObjects.Graphics,
  modifier: SlotModifierDefinition,
): void {
  const palette = getModifierPalette(modifier);

  if (modifier.effectKind === 'projectile-bonus' || modifier.effectKind === 'beam-count-bonus') {
    const diamond = [
      { x: 0, y: -ICON_RADIUS_PX },
      { x: ICON_RADIUS_PX, y: 0 },
      { x: 0, y: ICON_RADIUS_PX },
      { x: -ICON_RADIUS_PX, y: 0 },
    ];
    graphics.fillStyle(palette.fill, 1);
    graphics.fillPoints(diamond, true, true);
    graphics.lineStyle(3, palette.stroke, 1);
    graphics.strokePoints(diamond, true, true);
    return;
  }

  graphics.fillStyle(palette.glow, modifier.rarity === 'premium' ? 0.42 : 0.26);
  graphics.fillCircle(0, 0, ICON_RADIUS_PX + 6);
  graphics.fillStyle(palette.fill, 1);
  graphics.fillCircle(0, 0, ICON_RADIUS_PX);
  graphics.lineStyle(modifier.rarity === 'premium' ? 4 : 3, palette.stroke, 1);
  graphics.strokeCircle(0, 0, ICON_RADIUS_PX + (modifier.rarity === 'premium' ? 2 : 0));
}

function getModifierPalette(modifier: SlotModifierDefinition): {
  fill: number;
  stroke: number;
  glow: number;
} {
  if (modifier.rarity === 'premium' || modifier.iconKey.includes('double')) {
    return { fill: 0xc86dff, stroke: 0xffd2ff, glow: 0x8e3df5 };
  }

  if (modifier.effectKind === 'output-note-bonus' || modifier.effectKind === 'color-output-note-bonus') {
    return { fill: 0xf5bd52, stroke: 0xfff0c8, glow: 0xffd166 };
  }

  return { fill: 0x5cc7ff, stroke: 0xd6f6ff, glow: 0x2aa7ff };
}

function getModifierGlyph(modifier: SlotModifierDefinition): string {
  switch (modifier.iconKey) {
    case 'mod-plus-one-output-note':
      return '+1';
    case 'mod-plus-one-red-output-note':
      return 'R+';
    case 'mod-plus-one-green-output-note':
      return 'G+';
    case 'mod-plus-one-blue-output-note':
      return 'B+';
    case 'mod-plus-one-projectile':
      return 'P';
    case 'mod-plus-fifty-aoe-radius':
      return 'AoE';
    case 'mod-plus-one-extra-beam':
      return 'Bm';
    case 'mod-plus-two-output-notes':
      return '+2';
    case 'mod-double-activation':
      return 'x2';
    default:
      return '?';
  }
}

function getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}
