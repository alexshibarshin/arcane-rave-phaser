import Phaser from 'phaser';
import type { MergeResult } from '@stage/MergeStrategy';
import { createMergeChoiceCard } from './MergeChoiceCard';

const MODAL_WIDTH = 624;
const HEADER_HEIGHT = 96;
const CARD_GAP = 18;
const PANEL_PADDING = 24;

export function createChooseMergeModal(
  scene: Phaser.Scene,
  choices: MergeResult[],
  onSelect: (choiceIndex: number) => void,
): Phaser.GameObjects.Container {
  const viewportW = scene.scale.width;
  const viewportH = scene.scale.height;
  const cardHeight = 164;
  const cardsHeight = choices.length * cardHeight + Math.max(0, choices.length - 1) * CARD_GAP;
  const modalHeight = HEADER_HEIGHT + cardsHeight + PANEL_PADDING * 2;
  const panelX = (viewportW - MODAL_WIDTH) / 2;
  const panelY = (viewportH - modalHeight) / 2;

  const overlay = scene.add.rectangle(0, 0, viewportW, viewportH, 0x000000, 0.64).setOrigin(0, 0);
  overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, viewportW, viewportH), Phaser.Geom.Rectangle.Contains);

  const panel = scene.add.graphics();
  panel.fillStyle(0x111926, 1);
  panel.fillRoundedRect(panelX, panelY, MODAL_WIDTH, modalHeight, 26);
  panel.lineStyle(2, 0x57d9ff, 0.42);
  panel.strokeRoundedRect(panelX, panelY, MODAL_WIDTH, modalHeight, 26);
  panel.fillStyle(0x15263a, 0.5);
  panel.fillRoundedRect(panelX + 18, panelY + 18, MODAL_WIDTH - 36, HEADER_HEIGHT - 18, 18);

  const title = scene.add.text(viewportW / 2, panelY + 42, 'Choose merge result', {
    color: '#f5f7ff',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '28px',
    fontStyle: 'bold',
  }).setOrigin(0.5, 0.5);

  const subtitle = scene.add.text(viewportW / 2, panelY + 74, 'Tap one upgraded pawn to finish the merge.', {
    color: '#8cc7e5',
    fontFamily: 'monospace',
    fontSize: '16px',
    align: 'center',
  }).setOrigin(0.5, 0.5);

  const container = scene.add.container(0, 0, [overlay, panel, title, subtitle]);
  const cardsStartY = panelY + HEADER_HEIGHT + PANEL_PADDING + cardHeight / 2;

  choices.forEach((choice, index) => {
    const card = createMergeChoiceCard(scene, viewportW / 2, cardsStartY + index * (cardHeight + CARD_GAP), choice);
    card.container.on('pointerdown', () => onSelect(index));
    container.add(card.container);
  });

  container.setDepth(9000);
  container.setAlpha(0);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 180,
    ease: 'Sine.easeOut',
  });

  return container;
}
