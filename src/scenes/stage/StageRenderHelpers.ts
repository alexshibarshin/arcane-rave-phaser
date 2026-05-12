import Phaser from 'phaser';
import type { CombatPawnDefinition } from '@config/CombatContentConfig';
import type { SlotModifierDefinition } from '@config/SlotModifierConfig';
import {
  createPawnSprite,
  createRuleLabelContainer,
  findPawnDefinition,
  formatPawnTitle,
  getPawnAccentColor,
  getPawnTooltipDescription,
} from '../../ui/PawnDisplay';
export {
  createPawnSprite,
  createRuleLabelContainer,
  findPawnDefinition,
  formatPawnTitle,
  getPawnAccentColor,
  getPawnTooltipDescription,
};

export function getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = Phaser.Math.DegToRad(angleDeg);

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

export function formatModifierEffectLabel(effectKind: SlotModifierDefinition['effectKind']): string {
  switch (effectKind) {
    case 'output-note-bonus':
      return 'Extra Notes';
    case 'color-output-note-bonus':
      return 'Color Notes';
    case 'projectile-bonus':
      return 'Projectile';
    case 'aoe-radius-scale':
      return 'AoE';
    case 'beam-count-bonus':
      return 'Beam';
    case 'double-activation':
      return 'Double Act';
  }
}

export function getModifierEffectLabelColor(effectKind: SlotModifierDefinition['effectKind']): string {
  switch (effectKind) {
    case 'output-note-bonus':
    case 'color-output-note-bonus':
      return '#ffd58a';
    case 'projectile-bonus':
    case 'beam-count-bonus':
      return '#9bdcff';
    case 'aoe-radius-scale':
      return '#9ff0ba';
    case 'double-activation':
      return '#d9a6ff';
  }
}

export function createModifierEffectLabel(
  scene: Phaser.Scene,
  modifier: SlotModifierDefinition,
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, formatModifierEffectLabel(modifier.effectKind), {
    color: '#071019',
    backgroundColor: getModifierEffectLabelColor(modifier.effectKind),
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: { left: 8, right: 8, top: 5, bottom: 5 },
  }).setOrigin(0, 0.5);
}
