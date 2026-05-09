import Phaser from 'phaser';
import { SceneKeys, GameConfig } from '../../config/GameConfig';
import { getAllStageConfigs } from '../../config/StageRegistry';
import { SessionProgressStore } from '../../session/SessionProgressStore';
import { buildLobbyCards, type LobbyCardModel } from './LobbyCardBuilder';

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

interface LobbyState {
  selectedStageId: string | null;
  /** Stored for task 15's result modal */
  showResult: boolean;
  resultStageId: string | null;
}

export class LobbyScene extends Phaser.Scene {
  private state_: LobbyState = {
    selectedStageId: null,
    showResult: false,
    resultStageId: null,
  };

  private cardContainers: Phaser.GameObjects.Container[] = [];
  private cardModels: LobbyCardModel[] = [];

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
      showResult: data?.showResult ?? false,
      resultStageId: data?.stageId ?? null,
    };

    if (this.state_.selectedStageId) {
      SessionProgressStore.setLastSelectedStageId(this.state_.selectedStageId);
    }

    this.drawHeader();
    this.buildCards();

    this.events.on('shutdown', this.onShutdown, this);
  }

  private onShutdown(): void {
    this.cardContainers.forEach((c) => c.destroy());
    this.cardContainers = [];
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

    // Background
    const bgColor = model.isSelected ? BG_SELECTED : BG_DEFAULT;
    const borderColor = model.isSelected ? BORDER_SELECTED : BORDER_DEFAULT;
    const borderWidth = model.isSelected ? 2 : 1;

    this.drawCardBg(bg, bgColor);
    this.drawCardBorder(border, borderColor, borderWidth);

    // Stars
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

    container.add(bg);
    container.add(border);
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
  }

  private refreshCards(): void {
    this.buildCards();
  }
}
