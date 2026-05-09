import Phaser from 'phaser';
import { SceneKeys, GameConfig } from '../../config/GameConfig';
import { getAllStageConfigs, getStageConfig } from '../../config/StageRegistry';
import { SessionProgressStore } from '../../session/SessionProgressStore';
import { buildLobbyCards, type LobbyCardModel } from './LobbyCardBuilder';
import { buildLobbyDetailModel } from './LobbyDetailBuilder';
import { createPillTag } from '../../ui/PillTag';
import { createSpecialEnemyCard } from '../../ui/SpecialEnemyCard';
import { createResultModal, type ResultModalData } from '../../ui/ResultModal';

/** Glow color mapping for dominant color tags */
const COLOR_TAG_GLOW: Record<string, string> = {
  Red: '#FF6B6B',
  Green: '#6BFF8B',
  Blue: '#6B9BFF',
};

const VIEWPORT_W = GameConfig.VIEWPORT_WIDTH;

// Layout constants (top 35% = ~448px for cards area)
const HEADER_Y = 42;
const CARD_AREA_TOP = 72;
const CARD_WIDTH = 688;
const CARD_HEIGHT = 120;
const CARD_GAP = 12;
const CARD_X = 16;

// Card visual presets
const BG_DEFAULT = 0x1a1e24;
const BG_HOVER = 0x1f2430;
const BG_SELECTED = 0x1c2230;
const BORDER_DEFAULT = 0x2a3040;
const BORDER_HOVER = 0x3a4050;
const BORDER_SELECTED = 0x4a60a0;

const STAR_SIZE = 24;
const STAR_GAP = 6;
const STAR_AREA_X = 20;
const NAME_X = 140;
const NAME_FONT_SIZE = '30px';
const HP_FONT_SIZE = '20px';
const HEADER_FONT_SIZE = '15px';

const FILLED_STAR_COLOR = '#FFD700';
const EMPTY_STAR_COLOR = 'rgba(255,255,255,0.3)';
const HEADER_COLOR = 'rgba(255,255,255,0.3)';
const NAME_COLOR = '#EAEAEA';
const HP_COLOR = 'rgba(255,255,255,0.55)';

const VIEWPORT_H = GameConfig.VIEWPORT_HEIGHT;

// Detail panel layout (bottom ~65% of viewport)
const DETAIL_PANEL_TOP = 476;
const DETAIL_START_BTN_W = 280;
const DETAIL_START_BTN_H = 56;
const DETAIL_START_BTN_Y_OFFSET = 32;
const DETAIL_CARDS_Y_OFFSET = 24;
const DETAIL_RESULT_Y_OFFSET = 16;
const DETAIL_TAGS_Y_OFFSET = 16;
const DETAIL_NAME_Y_OFFSET = 64;

interface LobbyState {
  selectedStageId: string | null;
  showResultModal: boolean;
  resultStageId: string | null;
}

export class LobbyScene extends Phaser.Scene {
  private state_: LobbyState = {
    selectedStageId: null,
    showResultModal: false,
    resultStageId: null,
  };

  private cardContainers: Phaser.GameObjects.Container[] = [];
  private cardModels: LobbyCardModel[] = [];
  private detailContainer: Phaser.GameObjects.Container | null = null;
  private resultModalContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: SceneKeys.LOBBY });
  }

  create(data?: { showResult?: boolean; stageId?: string }): void {
    this.cameras.main.setBackgroundColor('#101418');

    // Restore or resolve initial selection
    const lastId = SessionProgressStore.getLastSelectedStageId();
    const initialSelectedId =
      data?.stageId ?? lastId ?? getAllStageConfigs()[0]?.id ?? null;

    this.state_ = {
      selectedStageId: initialSelectedId,
      showResultModal: data?.showResult ?? false,
      resultStageId: data?.stageId ?? null,
    };

    if (this.state_.selectedStageId) {
      SessionProgressStore.setLastSelectedStageId(this.state_.selectedStageId);
    }

    this.drawHeader();
    this.buildCards();
    this.refreshDetailPanel();

    if (this.state_.showResultModal && this.state_.resultStageId) {
      this.showResultModal(this.state_.resultStageId);
    }

    this.events.on('shutdown', this.onShutdown, this);
  }

  private onShutdown(): void {
    this.cardContainers.forEach((c) => c.destroy());
    this.cardContainers = [];
    if (this.detailContainer) {
      this.detailContainer.destroy();
      this.detailContainer = null;
    }
    if (this.resultModalContainer) {
      this.resultModalContainer.destroy();
      this.resultModalContainer = null;
    }
  }

  /* ---------- Header ---------- */

  private drawHeader(): void {
    this.add
      .text(VIEWPORT_W / 2, HEADER_Y, 'STAGE SELECT', {
        fontFamily: 'Arial, sans-serif',
        fontSize: HEADER_FONT_SIZE,
        color: HEADER_COLOR,
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0.5);
  }

  /* ---------- Cards ---------- */

  private buildCards(): void {
    const configs = getAllStageConfigs();
    this.cardModels = buildLobbyCards(
      configs,
      (id) => SessionProgressStore.getResult(id),
      this.state_.selectedStageId,
    );

    this.cardContainers.forEach((c) => c.destroy());
    this.cardContainers = [];

    this.cardModels.forEach((model, index) => {
      const y = CARD_AREA_TOP + index * (CARD_HEIGHT + CARD_GAP);
      const container = this.createCard(model, y);
      this.cardContainers.push(container);
    });
  }

  private createCard(model: LobbyCardModel, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(CARD_X + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
    const bg = this.add.graphics();
    const border = this.add.graphics();

    // Background (added first → bottom layer)
    const bgColor = model.isSelected ? BG_SELECTED : BG_DEFAULT;
    const borderColor = model.isSelected ? BORDER_SELECTED : BORDER_DEFAULT;
    const borderWidth = model.isSelected ? 2 : 1;

    this.drawCardBg(bg, bgColor);
    this.drawCardBorder(border, borderColor, borderWidth);

    container.add(bg);
    container.add(border);

    // Stars (on top of bg/border)
    const starTexts = this.buildStarTexts(model.stars);
    starTexts.forEach((t) => container.add(t));

    // Stage name (with glow if dominantColorTag present)
    const nameGlowColor = model.dominantColorTag
      ? COLOR_TAG_GLOW[model.dominantColorTag] ?? null
      : null;
    const { nameText, glowText } = this.buildNameText(model.displayName, nameGlowColor);
    if (glowText) container.add(glowText);
    container.add(nameText);

    // Best HP
    if (model.bestHp !== null) {
      const hpText = this.buildHpText(model.bestHp);
      container.add(hpText);
    }

    // Interactivity
    const hitArea = new Phaser.Geom.Rectangle(
      -CARD_WIDTH / 2,
      -CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
    );
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    container.on('pointerdown', () => {
      this.selectStage(model.stageId);
    });

    container.on('pointerover', () => {
      if (!model.isSelected) {
        this.drawCardBg(bg, BG_HOVER);
        this.drawCardBorder(border, BORDER_HOVER, 1);
        this.tweens.add({
          targets: container,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 120,
          ease: 'Sine.easeOut',
        });
      }
    });

    container.on('pointerout', () => {
      if (!model.isSelected) {
        this.drawCardBg(bg, BG_DEFAULT);
        this.drawCardBorder(border, BORDER_DEFAULT, 1);
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 80,
          ease: 'Sine.easeOut',
        });
      }
    });

    return container;
  }

  private drawCardBg(graphics: Phaser.GameObjects.Graphics, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(
      -CARD_WIDTH / 2,
      -CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
      8,
    );
  }

  private drawCardBorder(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
    width: number,
  ): void {
    graphics.clear();
    graphics.lineStyle(width, color, 1);
    graphics.strokeRoundedRect(
      -CARD_WIDTH / 2,
      -CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
      8,
    );
  }

  /* ---------- Star rendering ---------- */

  private buildStarTexts(stars: number): Phaser.GameObjects.Text[] {
    const startX = -CARD_WIDTH / 2 + STAR_AREA_X + STAR_SIZE / 2;

    return [0, 1, 2].map((i) => {
      const x = startX + i * (STAR_SIZE + STAR_GAP);
      const filled = stars > i;
      return this.add
        .text(0, 0, filled ? '★' : '☆', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${STAR_SIZE}px`,
          color: filled ? FILLED_STAR_COLOR : EMPTY_STAR_COLOR,
          shadow: {
            offsetX: 0,
            offsetY: 0,
            color: filled ? '#FFD700' : '#000',
            blur: filled ? 6 : 0,
            fill: filled,
          },
        })
        .setOrigin(0.5, 0.5)
        .setX(x);
    });
  }

  /* ---------- Name with glow ---------- */

  private buildNameText(
    name: string,
    glowColor: string | null,
  ): { nameText: Phaser.GameObjects.Text; glowText: Phaser.GameObjects.Text | null } {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: NAME_FONT_SIZE,
      color: NAME_COLOR,
    };

    const nameText = this.add
      .text(NAME_X - CARD_WIDTH / 2, 0, name, textStyle)
      .setOrigin(0, 0.5);

    let glowText: Phaser.GameObjects.Text | null = null;

    if (glowColor) {
      glowText = this.add
        .text(nameText.x, nameText.y, name, {
          fontFamily: 'Arial, sans-serif',
          fontSize: NAME_FONT_SIZE,
          color: glowColor,
          shadow: {
            offsetX: 0,
            offsetY: 0,
            color: glowColor,
            blur: 8,
            fill: true,
          },
        })
        .setOrigin(0, 0.5)
        .setAlpha(0.35);
    }

    return { nameText, glowText };
  }

  /* ---------- HP display ---------- */

  private buildHpText(hp: number): Phaser.GameObjects.Text {
    return this.add
      .text(CARD_WIDTH / 2 - 20, 0, `${hp} HP`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: HP_FONT_SIZE,
        color: HP_COLOR,
      })
      .setOrigin(1, 0.5);
  }

  /* ---------- Selection ---------- */

  private selectStage(stageId: string): void {
    if (this.state_.selectedStageId === stageId) return;
    this.state_.selectedStageId = stageId;
    SessionProgressStore.setLastSelectedStageId(stageId);
    this.refreshCards();
    this.refreshDetailPanel();
  }

  private refreshCards(): void {
    this.buildCards();
  }

  /* ========== DETAIL PANEL ========== */

  private refreshDetailPanel(): void {
    // Destroy old panel if exists
    if (this.detailContainer) {
      this.detailContainer.destroy();
      this.detailContainer = null;
    }

    const model = buildLobbyDetailModel(
      this.state_.selectedStageId,
      (id) => getStageConfig(id),
      (id) => SessionProgressStore.getResult(id),
    );

    if (!model) return;

    this.detailContainer = this.add.container(0, 0);
    let currentY = DETAIL_PANEL_TOP;

    // Stage name with color-tinted glow
    const glowColor = model.dominantColorTag
      ? COLOR_TAG_GLOW[model.dominantColorTag] ?? null
      : null;
    const { nameText, glowText } = this.buildDetailNameText(model.displayName, glowColor, currentY);
    if (glowText) this.detailContainer.add(glowText);
    this.detailContainer.add(nameText);
    currentY = currentY + DETAIL_NAME_Y_OFFSET + 40;

    // Pill tags row
    if (model.stageTags.length > 0) {
      const tagsRow = this.createPillTagsRow(model.stageTags, currentY);
      this.detailContainer.add(tagsRow);
      currentY = currentY + 28 + DETAIL_TAGS_Y_OFFSET;
    }

    // Elite & Boss special enemy cards
    currentY = currentY + DETAIL_CARDS_Y_OFFSET;
    const enemyCards = this.createEnemyCardsRow(model, currentY);
    if (enemyCards) {
      this.detailContainer.add(enemyCards);
      currentY = currentY + 260 + DETAIL_RESULT_Y_OFFSET;
    } else {
      currentY = currentY + DETAIL_RESULT_Y_OFFSET;
    }

    // Session result
    if (model.sessionResult) {
      const resultRow = this.createSessionResultRow(model.sessionResult, currentY);
      this.detailContainer.add(resultRow);
      currentY = currentY + 28 + DETAIL_START_BTN_Y_OFFSET;
    } else {
      currentY = currentY + DETAIL_START_BTN_Y_OFFSET;
    }

    // Start button
    const startBtn = this.createStartButton(currentY);
    this.detailContainer.add(startBtn);
  }

  private buildDetailNameText(
    name: string,
    glowColor: string | null,
    y: number,
  ): { nameText: Phaser.GameObjects.Text; glowText: Phaser.GameObjects.Text | null } {
    const nameText = this.add
      .text(VIEWPORT_W / 2, y, name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: '#EAEAEA',
      })
      .setOrigin(0.5, 0);

    let glowText: Phaser.GameObjects.Text | null = null;
    if (glowColor) {
      glowText = this.add
        .text(VIEWPORT_W / 2, y, name, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '40px',
          color: glowColor,
          shadow: {
            offsetX: 0,
            offsetY: 0,
            color: glowColor,
            blur: 6,
            fill: true,
          },
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.4);
    }

    return { nameText, glowText };
  }

  private createPillTagsRow(tags: string[], y: number): Phaser.GameObjects.Container {
    const row = this.add.container(0, y);
    const pillGap = 8;

    // Calculate total width for centering
    let totalWidth = 0;
    const pills: Phaser.GameObjects.Container[] = [];

    tags.forEach((tag) => {
      const pill = createPillTag(this, tag);
      pills.push(pill);
      totalWidth += pill.getBounds().width;
    });
    totalWidth += pillGap * (pills.length - 1);

    let x = VIEWPORT_W / 2 - totalWidth / 2;
    pills.forEach((pill) => {
      pill.setPosition(x, 0);
      row.add(pill);
      x += pill.getBounds().width + pillGap;
    });

    return row;
  }

  private createEnemyCardsRow(
    model: ReturnType<typeof buildLobbyDetailModel>,
    y: number,
  ): Phaser.GameObjects.Container | null {
    if (!model || (!model.eliteEnemyId && !model.bossEnemyId)) return null;

    const row = this.add.container(0, y);
    const cardGap = 16;
    const cardWidth = 280;
    const totalWidth = (model.eliteEnemyId ? cardWidth : 0) +
      (model.bossEnemyId ? cardWidth : 0) +
      (model.eliteEnemyId && model.bossEnemyId ? cardGap : 0);

    let x = VIEWPORT_W / 2 - totalWidth / 2;

    if (model.eliteEnemyId) {
      const eliteCard = createSpecialEnemyCard(this, model.eliteEnemyId, 'lobby');
      eliteCard.setPosition(x, 0);
      row.add(eliteCard);
      x += cardWidth + cardGap;
    }

    if (model.bossEnemyId) {
      const bossCard = createSpecialEnemyCard(this, model.bossEnemyId, 'lobby');
      bossCard.setPosition(x, 0);
      row.add(bossCard);
    }

    return row;
  }

  private createSessionResultRow(
    result: { stars: number; bestHp: number },
    y: number,
  ): Phaser.GameObjects.Container {
    const row = this.add.container(0, y);

    // Stars
    const starSize = 20;
    const starGap = 4;
    const totalStarsWidth = 3 * (starSize + starGap) - starGap;
    const starStartX = VIEWPORT_W / 2 - totalStarsWidth / 2 - 60;

    for (let i = 0; i < 3; i++) {
      const filled = result.stars > i;
      const starX = starStartX + i * (starSize + starGap);
      const starText = this.add
        .text(starX, starSize / 2, filled ? '★' : '☆', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${starSize}px`,
          color: filled ? '#FFD700' : 'rgba(255,255,255,0.3)',
        })
        .setOrigin(0, 0.5);
      row.add(starText);
    }

    // "Best:" label + stars + HP
    const bestLabel = this.add
      .text(starStartX - 60, starSize / 2, 'Best:', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: 'rgba(255,255,255,0.45)',
      })
      .setOrigin(0, 0.5);
    row.add(bestLabel);

    const hpText = this.add
      .text(starStartX + totalStarsWidth + 12, starSize / 2, `${result.bestHp} HP`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#FFFFFF',
      })
      .setOrigin(0, 0.5);
    row.add(hpText);

    return row;
  }

  private createStartButton(y: number): Phaser.GameObjects.Container {
    const container = this.add.container(VIEWPORT_W / 2 - DETAIL_START_BTN_W / 2, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a4060, 1);
    bg.fillRoundedRect(0, 0, DETAIL_START_BTN_W, DETAIL_START_BTN_H, 8);
    bg.lineStyle(2, 0x4a80d0, 1);
    bg.strokeRoundedRect(0, 0, DETAIL_START_BTN_W, DETAIL_START_BTN_H, 8);

    const text = this.add
      .text(DETAIL_START_BTN_W / 2, DETAIL_START_BTN_H / 2, 'START', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);

    container.add(bg);
    container.add(text);

    // Interactivity
    container.setSize(DETAIL_START_BTN_W, DETAIL_START_BTN_H);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, DETAIL_START_BTN_W, DETAIL_START_BTN_H),
      Phaser.Geom.Rectangle.Contains,
    );

    container.on('pointerdown', () => {
      if (this.state_.selectedStageId) {
        this.scene.start(SceneKeys.STAGE, { stageId: this.state_.selectedStageId });
      }
    });

    // Pulsing glow
    this.tweens.add({
      targets: bg,
      alpha: 0.7,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  /* ========== RESULT MODAL ========== */

  private showResultModal(stageId: string): void {
    const config = getStageConfig(stageId);
    if (!config) return;

    const result = SessionProgressStore.getResult(stageId);
    if (!result) return;

    const modalData: ResultModalData = {
      stageId,
      stageName: config.displayName,
      stars: result.stars,
      remainingBaseHp: result.bestRemainingBaseHp ?? 0,
    };

    this.resultModalContainer = createResultModal(
      this,
      modalData,
      () => {
        // RETRY: start a fresh run
        if (this.resultModalContainer) {
          this.resultModalContainer.destroy();
          this.resultModalContainer = null;
        }
        this.state_.showResultModal = false;
        this.scene.start(SceneKeys.STAGE, { stageId });
      },
      () => {
        // CLOSE: dismiss modal, select the stage card
        if (this.resultModalContainer) {
          this.resultModalContainer.destroy();
          this.resultModalContainer = null;
        }
        this.state_.showResultModal = false;
        // Stage is already selected, detail panel already refreshed
      },
    );
  }
}
