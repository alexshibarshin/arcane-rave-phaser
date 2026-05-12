import Phaser from 'phaser';
import { type CombatPawnDefinition } from '@config/CombatContentConfig';
import {
  createPawnSprite,
  createRuleLabelContainer,
  formatPawnTitle,
  getPawnAccentColor,
} from './PawnDisplay';

export interface PawnSelectionCardStyle {
  width: number;
  height: number;
  radius?: number;
  accentAlpha?: number;
  affordable?: boolean;
  backgroundColor?: number;
}

export interface PawnSelectionCardView {
  container: Phaser.GameObjects.Container;
  width: number;
  height: number;
}

export function createPawnSelectionCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  pawn: CombatPawnDefinition,
  style: PawnSelectionCardStyle,
): PawnSelectionCardView {
  const width = style.width;
  const height = style.height;
  const radius = style.radius ?? 20;
  const accent = getPawnAccentColor(pawn.color);
  const affordable = style.affordable ?? true;
  const borderAlpha = affordable ? 0.88 : 0.48;
  const accentAlpha = style.accentAlpha ?? 0.08;
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  const hoverGlow = scene.add.graphics();
  const left = -width / 2;
  const top = -height / 2;

  graphics.fillStyle(style.backgroundColor ?? 0x0b1520, 1);
  graphics.fillRoundedRect(left, top, width, height, radius);
  graphics.fillStyle(accent, accentAlpha);
  graphics.fillRoundedRect(left + 12, top + 12, width - 24, 68, 16);
  graphics.lineStyle(2, accent, borderAlpha);
  graphics.strokeRoundedRect(left, top, width, height, radius);
  graphics.lineStyle(1, 0xffffff, 0.08);
  graphics.strokeRoundedRect(left + 12, top + 12, width - 24, height - 24, 16);

  hoverGlow.lineStyle(2, accent, 1);
  hoverGlow.strokeRoundedRect(left, top, width, height, radius);
  hoverGlow.setAlpha(0);

  const title = scene.add.text(0, top + 74, formatPawnTitle(pawn), {
    color: '#f5f7ff',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '17px',
    align: 'center',
  }).setOrigin(0.5, 0.5);

  const sprite = createPawnSprite(scene, pawn, 86);
  sprite.y = top + 26;

  const ruleLabel = createRuleLabelContainer(scene, pawn, accent);
  ruleLabel.x = 0;
  ruleLabel.y = top + 102;

  container.add([graphics, hoverGlow, sprite, title, ruleLabel]);
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );

  container.on('pointerover', () => {
    scene.tweens.killTweensOf(container);
    scene.tweens.killTweensOf(hoverGlow);
    scene.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: hoverGlow, alpha: 1, duration: 120, ease: 'Sine.easeOut' });
  });

  container.on('pointerout', () => {
    scene.tweens.killTweensOf(container);
    scene.tweens.killTweensOf(hoverGlow);
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
    scene.tweens.add({ targets: hoverGlow, alpha: 0, duration: 150, ease: 'Sine.easeOut' });
  });

  return { container, width, height };
}
