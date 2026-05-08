import Phaser from 'phaser';
import { CombatContentConfig, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import {
  findPawnDefinition,
  createPawnSprite,
  createRuleLabelContainer,
  getPawnAccentColor,
  formatPawnTitle,
} from './StageRenderHelpers';

export interface StageShopCardView {
  offerIndex: number;
  pawnId: string;
  container: Phaser.GameObjects.Container;
}

export class StageShopView {
  readonly container: Phaser.GameObjects.Container;
  readonly cardViews: StageShopCardView[] = [];
  readonly rerollButton: Phaser.GameObjects.Text;
  readonly cardsLayer: Phaser.GameObjects.Container;

  private emptyLabel?: Phaser.GameObjects.Text;
  private onCardsCreated?: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    onReroll: () => void,
    onCardsCreated?: () => void,
  ) {
    this.onCardsCreated = onCardsCreated;
    const width = StagePresentationConfig.SHOP_PANEL_WIDTH;
    const height = StagePresentationConfig.SHOP_PANEL_HEIGHT;
    this.container = scene.add.container(scene.scale.width / 2, StagePresentationConfig.SHOP_PANEL_Y);
    const background = scene.add.graphics();
    const x = -width / 2;
    const y = -height / 2;

    background.fillStyle(0x08111b, 0.98);
    background.fillRoundedRect(x, y, width, height, StagePresentationConfig.SHOP_BORDER_RADIUS);
    background.fillStyle(0x11263a, 0.38);
    background.fillRoundedRect(x + 20, y + 18, width - 40, 52, StagePresentationConfig.SHOP_BORDER_RADIUS);
    background.lineStyle(2, 0x57d9ff, 0.5);
    background.strokeRoundedRect(x, y, width, height, StagePresentationConfig.SHOP_BORDER_RADIUS);

    const title = scene.add.text(x + 32, y + 30, 'SHOP', {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '28px',
    });
    const subtitle = scene.add.text(
      x + 132,
      y + 40,
      `Buy ${StageFlowConfig.SHOP_PURCHASE_COST}c  •  Move ${StageFlowConfig.REPOSITION_COST}c`,
      {
        color: '#7fbddb',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '15px',
      },
    );

    this.rerollButton = scene.add.text(x + width - 122, y + 30, '', {
      color: '#071019',
      backgroundColor: '#ffe08e',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '18px',
      align: 'center',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
    }).setOrigin(0.5, 0);
    this.rerollButton.setInteractive({ useHandCursor: true });
    this.rerollButton.on('pointerdown', onReroll);

    this.cardsLayer = scene.add.container(0, 0);
    this.container.add([background, title, subtitle, this.rerollButton, this.cardsLayer]);
  }

  refresh(offers: string[], coins: number, rerollCost: number): void {
    this.rerollButton.setText(`Reroll ${rerollCost}c`);
    this.rerollButton.setAlpha(coins >= rerollCost ? 1 : 0.45);
    this.renderCards(offers, coins);
  }

  private renderCards(offers: string[], coins: number): void {
    const oldCards = [...this.cardViews];
    this.cardViews.length = 0;

    const totalWidth =
      offers.length * StagePresentationConfig.SHOP_CARD_WIDTH
      + Math.max(0, offers.length - 1) * StagePresentationConfig.SHOP_CARD_GAP;
    const startX = -totalWidth / 2 + StagePresentationConfig.SHOP_CARD_WIDTH / 2;

    const createNewCards = () => {
      oldCards.forEach((card) => card.container.destroy());

      if (offers.length === 0) {
        if (!this.emptyLabel) {
          this.emptyLabel = this.scene.add.text(0, 34, 'No offers', {
            color: '#7fbddb',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: '16px',
            align: 'center',
          }).setOrigin(0.5, 0.5);
          this.cardsLayer.add(this.emptyLabel);
        }
        this.emptyLabel.setVisible(true).setAlpha(1);
        return;
      }

      if (this.emptyLabel) {
        this.emptyLabel.setVisible(false);
      }

      offers.forEach((pawnId, offerIndex) => {
        const pawn = findPawnDefinition(pawnId);
        if (!pawn) {
          return;
        }

        const x = startX + offerIndex * (StagePresentationConfig.SHOP_CARD_WIDTH + StagePresentationConfig.SHOP_CARD_GAP);
        const cardView = this.createShopCard(x, 30, offerIndex, pawn, coins);
        cardView.container.setAlpha(0).setScale(0.92);
        this.cardViews.push(cardView);
        this.cardsLayer.add(cardView.container);

        this.scene.tweens.add({
          targets: cardView.container,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 220,
          delay: offerIndex * 50,
          ease: 'Back.easeOut',
        });
      });

      this.onCardsCreated?.();
    };

    if (oldCards.length > 0) {
      for (const card of oldCards) {
        this.scene.tweens.add({
          targets: card.container,
          alpha: 0,
          scaleX: 0.92,
          scaleY: 0.92,
          duration: 110,
          ease: 'Sine.easeIn',
        });
      }
      this.scene.time.delayedCall(120, createNewCards);
    } else {
      createNewCards();
    }
  }

  private createShopCard(
    x: number,
    y: number,
    offerIndex: number,
    pawn: CombatPawnDefinition,
    coins: number,
  ): StageShopCardView {
    const container = this.scene.add.container(x, y);
    const graphics = this.scene.add.graphics();
    const width = StagePresentationConfig.SHOP_CARD_WIDTH;
    const height = StagePresentationConfig.SHOP_CARD_HEIGHT;
    const left = -width / 2;
    const top = -height / 2;
    const accent = getPawnAccentColor(pawn.color);
    const affordable = coins >= StageFlowConfig.SHOP_PURCHASE_COST;
    const borderAlpha = affordable ? 0.88 : 0.48;
    const radius = StagePresentationConfig.SHOP_BORDER_RADIUS;

    graphics.fillStyle(0x0b1520, 1);
    graphics.fillRoundedRect(left, top, width, height, radius);
    graphics.fillStyle(accent, 0.08);
    graphics.fillRoundedRect(left + 12, top + 12, width - 24, 68, 16);
    graphics.lineStyle(2, accent, borderAlpha);
    graphics.strokeRoundedRect(left, top, width, height, radius);
    graphics.lineStyle(1, 0xffffff, 0.08);
    graphics.strokeRoundedRect(left + 12, top + 12, width - 24, height - 24, 16);

    const hoverGlow = this.scene.add.graphics();
    hoverGlow.lineStyle(2, accent, 1);
    hoverGlow.strokeRoundedRect(left, top, width, height, radius);
    hoverGlow.setAlpha(0);

    const title = this.scene.add.text(0, top + 74, formatPawnTitle(pawn), {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '17px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    const spriteFrame = createPawnSprite(this.scene, pawn, 86);
    spriteFrame.y = top + 26;

    const ruleLabel = createRuleLabelContainer(this.scene, pawn, accent);
    ruleLabel.x = 0;
    ruleLabel.y = top + 102;

    const priceChip = this.scene.add.text(0, top + 137, `${StageFlowConfig.SHOP_PURCHASE_COST}c`, {
      color: '#071019',
      backgroundColor: '#ffe08e',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '16px',
      align: 'center',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5, 0.5);

    container.add([graphics, hoverGlow, spriteFrame, title, ruleLabel, priceChip]);
    container.setSize(width, height);
    container.setData('homeX', x);
    container.setData('homeY', y);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.scene.input.setDraggable(container);
    if (container.input) {
      container.input.cursor = 'grab';
    }

    container.on('pointerover', () => {
      this.scene.tweens.killTweensOf(container);
      this.scene.tweens.killTweensOf(hoverGlow);
      this.scene.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Sine.easeOut' });
      this.scene.tweens.add({ targets: hoverGlow, alpha: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    container.on('pointerout', () => {
      this.scene.tweens.killTweensOf(container);
      this.scene.tweens.killTweensOf(hoverGlow);
      this.scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
      this.scene.tweens.add({ targets: hoverGlow, alpha: 0, duration: 150, ease: 'Sine.easeOut' });
    });

    return {
      offerIndex,
      pawnId: pawn.id,
      container,
    };
  }

  destroy(): void {
    this.cardViews.forEach((card) => card.container.destroy());
    this.cardViews.length = 0;
    this.emptyLabel?.destroy();
    this.emptyLabel = undefined;
  }
}
