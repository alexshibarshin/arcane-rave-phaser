import Phaser from 'phaser';
import type { CombatPawnDefinition } from '@config/CombatContentConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { createPawnSelectionCard } from '../../ui/PawnSelectionCard';
import { findPawnDefinition } from '../../ui/PawnDisplay';

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
  private sellOverlay?: Phaser.GameObjects.Container;
  private sellOverlayText?: Phaser.GameObjects.Text;
  private sellPriceText?: Phaser.GameObjects.Text;
  private sellOverlayBg?: Phaser.GameObjects.Graphics;
  private lastOffersRef?: string[];
  private lastCoins?: number;
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
      `Drag to buy  •  Move ${StageFlowConfig.REPOSITION_COST}c`,
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
    if (this.lastOffersRef === offers && this.lastCoins === coins) {
      return;
    }
    this.lastOffersRef = offers;
    this.lastCoins = coins;
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
    const width = StagePresentationConfig.SHOP_CARD_WIDTH;
    const height = StagePresentationConfig.SHOP_CARD_HEIGHT;
    const price = pawn.shopPrice;
    const affordable = coins >= price;
    const top = -height / 2;
    const card = createPawnSelectionCard(this.scene, x, y, pawn, {
      width,
      height,
      radius: StagePresentationConfig.SHOP_BORDER_RADIUS,
      affordable,
    });
    const container = card.container;

    const priceChip = this.scene.add.text(0, top + 137, `${price}c`, {
      color: '#071019',
      backgroundColor: '#ffe08e',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '16px',
      align: 'center',
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5, 0.5);

    container.add(priceChip);
    container.setData('homeX', x);
    container.setData('homeY', y);
    this.scene.input.setDraggable(container);
    if (container.input) {
      container.input.cursor = 'grab';
    }

    return {
      offerIndex,
      pawnId: pawn.id,
      container,
    };
  }

  showSellOverlay(price: number): void {
    if (this.sellOverlay) {
      return;
    }

    const width = StagePresentationConfig.SHOP_PANEL_WIDTH;
    const height = StagePresentationConfig.SHOP_PANEL_HEIGHT;
    const x = -width / 2;
    const y = -height / 2;

    this.sellOverlay = this.scene.add.container(0, 0);

    // Dark semi-transparent background
    this.sellOverlayBg = this.scene.add.graphics();
    this.sellOverlayBg.fillStyle(0x050a10, 0.75);
    this.sellOverlayBg.fillRoundedRect(x, y, width, height, StagePresentationConfig.SHOP_BORDER_RADIUS);
    // Border
    this.sellOverlayBg.lineStyle(2, 0xff6b6b, 0.9);
    this.sellOverlayBg.strokeRoundedRect(x, y, width, height, StagePresentationConfig.SHOP_BORDER_RADIUS);
    this.sellOverlay!.add(this.sellOverlayBg);

    // Sell text
    this.sellOverlayText = this.scene.add.text(0, y + height / 2 - 14, 'Drag here to SELL', {
      color: '#ff9b9b',
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.sellOverlay!.add(this.sellOverlayText);

    // Price text
    this.sellPriceText = this.scene.add.text(0, y + height / 2 + 18, `+${price}c`, {
      color: '#ffe08e',
      fontFamily: 'monospace',
      fontSize: '32px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.sellOverlay!.add(this.sellPriceText);

    this.container.add(this.sellOverlay);
    this.sellOverlay!.setAlpha(0);

    this.scene.tweens.add({
      targets: this.sellOverlay!,
      alpha: 1,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  hideSellOverlay(): void {
    if (!this.sellOverlay) {
      return;
    }

    this.scene.tweens.killTweensOf(this.sellOverlay);
    this.scene.tweens.add({
      targets: this.sellOverlay,
      alpha: 0,
      duration: 150,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.sellOverlay?.destroy();
        this.sellOverlay = undefined;
        this.sellOverlayText = undefined;
        this.sellPriceText = undefined;
        this.sellOverlayBg = undefined;
      },
    });
  }

  containsSellOverlayPoint(worldX: number, worldY: number): boolean {
    if (!this.sellOverlay) {
      return false;
    }

    const container = this.container;
    const worldX0 = container.x;
    const worldY0 = container.y;
    const localX = worldX - worldX0;
    const localY = worldY - worldY0;
    const width = StagePresentationConfig.SHOP_PANEL_WIDTH;
    const height = StagePresentationConfig.SHOP_PANEL_HEIGHT;
    return (
      localX >= -width / 2 &&
      localX <= width / 2 &&
      localY >= -height / 2 &&
      localY <= height / 2
    );
  }

  isSellOverlayVisible(): boolean {
    return this.sellOverlay !== undefined;
  }

  destroy(): void {
    this.cardViews.forEach((card) => card.container.destroy());
    this.cardViews.length = 0;
    this.emptyLabel?.destroy();
    this.emptyLabel = undefined;
    this.sellOverlay?.destroy();
    this.sellOverlay = undefined;
  }
}
