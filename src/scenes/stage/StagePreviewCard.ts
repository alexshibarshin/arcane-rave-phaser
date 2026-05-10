import Phaser from 'phaser';
import type { StageWavePreviewModel } from '@config/StageConfig';
import { createPillTag, measurePillTagWidth } from '../../ui/PillTag';
import { createSpecialEnemyCard } from '../../ui/SpecialEnemyCard';

export interface PreviewCardState {
  waveLabel: Phaser.GameObjects.Text | null;
  pillContainers: Phaser.GameObjects.Container[];
  enemyCard: Phaser.GameObjects.Container | null;
}

const PREVIEW_CARD_PADDING_TOP = 18;
const WAVE_LABEL_FONT_SIZE = '18px';
const WAVE_LABEL_COLOR = '#f5f7ff';
const PILL_GAP = 8;
const ENEMY_CARD_TOP_MARGIN = 12;
const TERMINAL_FONT_SIZE = '17px';
const TERMINAL_FONT_COLOR = '#d9e9f8';
const FONT_FAMILY = 'monospace';

/**
 * Populate the preview card container with pill tags and optional special enemy card.
 * Destroys previous state objects before creating new ones.
 */
export function populatePreviewCard(
  scene: Phaser.Scene,
  previewCard: Phaser.GameObjects.Container,
  wavePreview: StageWavePreviewModel | null,
  previousState?: PreviewCardState,
  terminalText?: string,
): PreviewCardState {
  // Destroy previous dynamic content (background stays intact — managed by caller)
  if (previousState) {
    previousState.waveLabel?.destroy();
    for (const pill of previousState.pillContainers) {
      pill.destroy();
    }
    previousState.enemyCard?.destroy();
  }

  if (wavePreview === null) {
    // Terminal state
    const terminalLabel = terminalText
      ? scene.add.text(0, 0, terminalText, {
          color: TERMINAL_FONT_COLOR,
          fontFamily: FONT_FAMILY,
          fontSize: TERMINAL_FONT_SIZE,
          lineSpacing: 6,
          align: 'center',
        }).setOrigin(0.5, 0)
      : null;

    if (terminalLabel) {
      previewCard.add(terminalLabel);
    }

    return {
      waveLabel: null,
      pillContainers: [],
      enemyCard: null,
    };
  }

  let currentY = PREVIEW_CARD_PADDING_TOP;

  // Wave label
  const waveLabelText = `WAVE ${wavePreview.waveNumber}/${wavePreview.totalWaves}`;
  const waveLabel = scene.add.text(0, currentY, waveLabelText, {
    color: WAVE_LABEL_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: WAVE_LABEL_FONT_SIZE,
    align: 'center',
  }).setOrigin(0.5, 0);
  previewCard.add(waveLabel);

  currentY += waveLabel.height + 10;

  // Pill tags row — centered horizontally
  const pillContainers: Phaser.GameObjects.Container[] = [];
  const maxPills = Math.min(wavePreview.tags.length, 4);
  const displayTags = wavePreview.tags.slice(0, maxPills);

  if (displayTags.length > 0) {
    // Calculate total pill width for centering
    let totalPillWidth = 0;
    for (const tag of displayTags) {
      totalPillWidth += measurePillTagWidth(scene, tag);
    }
    totalPillWidth += (displayTags.length - 1) * PILL_GAP;

    let pillX = -totalPillWidth / 2;
    for (const tag of displayTags) {
      const pill = createPillTag(scene, tag);
      const pillWidth = measurePillTagWidth(scene, tag);
      pill.setPosition(pillX, currentY);
      previewCard.add(pill);
      pillContainers.push(pill);
      pillX += pillWidth + PILL_GAP;
    }

    currentY += 28 + ENEMY_CARD_TOP_MARGIN;
  }

  // Special enemy card for elite/boss waves
  let enemyCard: Phaser.GameObjects.Container | null = null;
  if (
    wavePreview.specialEnemyId &&
    (wavePreview.waveKind === 'elite' || wavePreview.waveKind === 'boss')
  ) {
    enemyCard = createSpecialEnemyCard(scene, wavePreview.specialEnemyId, 'wave-preview');
    // Center the enemy card horizontally (wave-preview variant is 140px wide)
    enemyCard.setPosition(-70, currentY);
    previewCard.add(enemyCard);
  }

  return {
    waveLabel,
    pillContainers,
    enemyCard,
  };
}
