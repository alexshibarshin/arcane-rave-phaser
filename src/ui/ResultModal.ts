import Phaser from 'phaser';

const MODAL_WIDTH = 520;
const CORNER_RADIUS = 8;
const BG_COLOR = 0x161a22;
const BORDER_COLOR = 0x252d3a;
const FONT_FAMILY = 'Arial, sans-serif';
const VICTORY_COLOR = '#4AE04A';
const DEFEAT_COLOR = '#E04A4A';
const STAR_SIZE = 40;
const STAR_GAP = 12;
const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 52;
const BUTTON_GAP = 16;

export interface ResultModalData {
  stageId: string;
  stageName: string;
  stars: number;
  remainingBaseHp: number;
}

export function createResultModal(
  scene: Phaser.Scene,
  result: ResultModalData,
  onRetry: () => void,
  onClose: () => void,
): Phaser.GameObjects.Container {
  const viewportW = scene.scale.width;
  const viewportH = scene.scale.height;
  const isVictory = result.stars > 0;

  const titleY = 32;
  const nameY = titleY + 52;
  const starsY = nameY + 56;
  const hpY = starsY + 64;
  const buttonsY = hpY + 48;
  const modalHeight = buttonsY + BUTTON_HEIGHT + 32;

  // Overlay
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.6);
  overlay.fillRect(0, 0, viewportW, viewportH);

  // Modal panel
  const panelX = (viewportW - MODAL_WIDTH) / 2;
  const panelY = (viewportH - modalHeight) / 2;

  const panel = scene.add.graphics();
  panel.fillStyle(BG_COLOR, 1);
  panel.fillRoundedRect(panelX, panelY, MODAL_WIDTH, modalHeight, CORNER_RADIUS);
  panel.lineStyle(1, BORDER_COLOR, 1);
  panel.strokeRoundedRect(panelX, panelY, MODAL_WIDTH, modalHeight, CORNER_RADIUS);

  const centerX = viewportW / 2;

  // Victory/Defeat label
  const outcomeColor = isVictory ? VICTORY_COLOR : DEFEAT_COLOR;
  const outcomeText = scene.add.text(centerX, panelY + titleY, isVictory ? 'VICTORY' : 'DEFEAT', {
    fontFamily: FONT_FAMILY,
    fontSize: '36px',
    color: outcomeColor,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);

  // Stage name
  const nameText = scene.add.text(centerX, panelY + nameY, result.stageName, {
    fontFamily: FONT_FAMILY,
    fontSize: '24px',
    color: '#FFFFFF',
  }).setOrigin(0.5, 0);

  // Stars
  const starTexts: Phaser.GameObjects.Text[] = [];
  const totalStarsWidth = 3 * (STAR_SIZE + STAR_GAP) - STAR_GAP;
  const starStartX = centerX - totalStarsWidth / 2;

  for (let i = 0; i < 3; i++) {
    const filled = result.stars > i;
    const starX = starStartX + i * (STAR_SIZE + STAR_GAP);
    const starText = scene.add.text(starX, panelY + starsY, filled ? '★' : '☆', {
      fontFamily: FONT_FAMILY,
      fontSize: `${STAR_SIZE}px`,
      color: filled ? '#FFD700' : 'rgba(255,255,255,0.3)',
    }).setOrigin(0, 0.5);
    starTexts.push(starText);
  }

  // Base HP
  const hpText = scene.add.text(centerX, panelY + hpY, `${result.remainingBaseHp} HP remaining`, {
    fontFamily: FONT_FAMILY,
    fontSize: '20px',
    color: '#FFFFFF',
  }).setOrigin(0.5, 0);

  // Buttons
  const buttonsContainer = scene.add.container(0, 0);

  const retryX = centerX - BUTTON_WIDTH - BUTTON_GAP / 2;
  const retryBtn = createButton(scene, 'RETRY', {
    x: retryX,
    y: panelY + buttonsY,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    bgColor: 0x2a4060,
    borderColor: 0x4a80d0,
  });
  retryBtn.setInteractive(
    new Phaser.Geom.Rectangle(retryX, panelY + buttonsY, BUTTON_WIDTH, BUTTON_HEIGHT),
    Phaser.Geom.Rectangle.Contains,
  );
  retryBtn.on('pointerdown', onRetry);
  buttonsContainer.add(retryBtn);

  const closeX = centerX + BUTTON_GAP / 2;
  const closeBtn = createButton(scene, 'CLOSE', {
    x: closeX,
    y: panelY + buttonsY,
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    bgColor: 0x2a2a2a,
    borderColor: 0x404040,
  });
  closeBtn.setInteractive(
    new Phaser.Geom.Rectangle(closeX, panelY + buttonsY, BUTTON_WIDTH, BUTTON_HEIGHT),
    Phaser.Geom.Rectangle.Contains,
  );
  closeBtn.on('pointerdown', onClose);
  buttonsContainer.add(closeBtn);

  // Root container
  const container = scene.add.container(0, 0);
  container.add(overlay);
  container.add(panel);
  container.add(outcomeText);
  container.add(nameText);
  starTexts.forEach((s) => container.add(s));
  container.add(hpText);
  container.add(buttonsContainer);

  // Fade-in
  container.setAlpha(0);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 200,
    ease: 'Sine.easeOut',
  });

  return container;
}

interface ButtonStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: number;
  borderColor: number;
}

function createButton(scene: Phaser.Scene, label: string, style: ButtonStyle): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(style.bgColor, 1);
  bg.fillRoundedRect(style.x, style.y, style.width, style.height, 8);
  bg.lineStyle(2, style.borderColor, 1);
  bg.strokeRoundedRect(style.x, style.y, style.width, style.height, 8);

  const text = scene.add.text(
    style.x + style.width / 2,
    style.y + style.height / 2,
    label,
    {
      fontFamily: FONT_FAMILY,
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    },
  ).setOrigin(0.5, 0.5);

  return scene.add.container(0, 0, [bg, text]);
}
