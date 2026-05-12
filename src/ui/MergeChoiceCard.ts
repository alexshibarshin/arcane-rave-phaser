import Phaser from 'phaser';
import type { MergeResult } from '@stage/MergeStrategy';
import { createPawnSprite, createRuleLabelContainer, findPawnDefinition, getPawnAccentColor, getPawnTooltipDescription } from './PawnDisplay';

export interface MergeChoiceCardView {
  container: Phaser.GameObjects.Container;
  width: number;
  height: number;
}

export function createMergeChoiceCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  mergeResult: MergeResult,
): MergeChoiceCardView {
  const pawn = findPawnDefinition(mergeResult.pawnId);
  if (!pawn) {
    throw new Error(`Unknown pawn "${mergeResult.pawnId}" in merge choice card.`);
  }

  const width = 560;
  const height = 164;
  const radius = 22;
  const accent = getPawnAccentColor(pawn.color);
  const leftColumnWidth = 176;
  const left = -width / 2;
  const top = -height / 2;

  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const hoverGlow = scene.add.graphics();

  bg.fillStyle(0x0a1320, 1);
  bg.fillRoundedRect(left, top, width, height, radius);
  bg.fillStyle(accent, 0.12);
  bg.fillRoundedRect(left + 14, top + 14, leftColumnWidth - 28, height - 28, 16);
  bg.lineStyle(2, accent, 0.9);
  bg.strokeRoundedRect(left, top, width, height, radius);
  bg.lineStyle(1, 0xffffff, 0.08);
  bg.strokeRoundedRect(left + 14, top + 14, width - 28, height - 28, 18);
  bg.lineStyle(1, 0x163148, 0.9);
  bg.strokeLineShape(new Phaser.Geom.Line(left + leftColumnWidth, top + 18, left + leftColumnWidth, top + height - 18));

  hoverGlow.lineStyle(3, accent, 1);
  hoverGlow.strokeRoundedRect(left - 2, top - 2, width + 4, height + 4, radius + 2);
  hoverGlow.setAlpha(0);

  const title = scene.add.text(left + leftColumnWidth / 2, top + 28, pawn.displayName, {
    color: '#f5f7ff',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '21px',
    align: 'center',
    wordWrap: { width: leftColumnWidth - 28 },
  }).setOrigin(0.5, 0.5);

  const sprite = createPawnSprite(scene, pawn, 88);
  sprite.x = left + leftColumnWidth / 2;
  sprite.y = -10;

  const tierStars = scene.add.text(left + leftColumnWidth / 2, top + height - 28, '★'.repeat(mergeResult.tier), {
    color: '#ffd166',
    fontFamily: 'monospace',
    fontSize: '18px',
    align: 'center',
  }).setOrigin(0.5, 0.5);
  tierStars.setStroke('#7a4f00', 5);

  const meta = scene.add.text(left + leftColumnWidth + 22, top + 28, pawn.type === 'generator' ? 'Generator' : 'Finisher', {
    color: '#06111a',
    backgroundColor: pawn.type === 'generator' ? '#78d9ff' : '#ffa0bf',
    fontFamily: 'monospace',
    fontSize: '15px',
    padding: { left: 12, right: 12, top: 7, bottom: 7 },
  }).setOrigin(0, 0.5);

  const rule = createRuleLabelContainer(scene, pawn, accent);
  rule.x = left + width - 92;
  rule.y = top + 28;

  const description = scene.add.text(left + leftColumnWidth + 22, top + 58, getPawnTooltipDescription(pawn, mergeResult.tier), {
    color: '#d9e9f8',
    fontFamily: 'monospace',
    fontSize: '17px',
    lineSpacing: 5,
    wordWrap: { width: width - leftColumnWidth - 44 },
  });

  container.add([bg, hoverGlow, title, sprite, tierStars, meta, rule, description]);
  container.setSize(width, height);
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

  container.on('pointerover', () => {
    scene.tweens.killTweensOf(container);
    scene.tweens.killTweensOf(hoverGlow);
    scene.tweens.add({ targets: container, scaleX: 1.015, scaleY: 1.015, duration: 120, ease: 'Sine.easeOut' });
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
