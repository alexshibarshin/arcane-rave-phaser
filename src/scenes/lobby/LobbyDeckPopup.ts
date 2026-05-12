import Phaser from 'phaser';
import { type CombatPawnDefinition } from '@config/CombatContentConfig';
import { findPawnDefinition } from '../../ui/PawnDisplay';
import { createPawnSelectionCard } from '../../ui/PawnSelectionCard';
import { PawnTooltipPanel } from '../../ui/PawnTooltipPanel';
import { getCollectionPawnIds, swapDeckSelection, type DeckDragTarget } from './DeckSelection';

const HEADER_FONT_SIZE = '15px';
const LABEL_COLOR = 'rgba(255,255,255,0.3)';
const CARD_WIDTH = 160;
const CARD_HEIGHT = 152;
const CARD_GAP_X = 12;
const CARD_GAP_Y = 14;
const SLOT_RADIUS = 20;
const HOLD_DELAY_MS = 150;

interface CardBinding {
  container: Phaser.GameObjects.Container;
  pawnId: string;
  target: DeckDragTarget;
  homeX: number;
  homeY: number;
}

export class LobbyDeckPopup {
  private readonly root: Phaser.GameObjects.Container;
  private readonly tooltipPanel: PawnTooltipPanel;
  private readonly cardLayer: Phaser.GameObjects.Container;
  private readonly slotLayer: Phaser.GameObjects.Container;
  private readonly collectionLayer: Phaser.GameObjects.Container;
  private readonly closeButton: Phaser.GameObjects.Container;
  private readonly closeIcon: Phaser.GameObjects.Container;
  private readonly blocker: Phaser.GameObjects.Zone;

  private readonly cardBindings = new Map<Phaser.GameObjects.Container, CardBinding>();
  private readonly deckSlotRects: Phaser.Geom.Rectangle[] = [];
  private readonly collectionSlotRects: Phaser.Geom.Rectangle[] = [];
  private holdTimer?: Phaser.Time.TimerEvent;
  private activeDrag?: CardBinding;
  private dragLocked = false;
  private deckIds: string[];

  constructor(
    private readonly scene: Phaser.Scene,
    initialDeckIds: readonly string[],
    private readonly onDeckChanged: (deckIds: string[]) => void,
    private readonly onClosed: () => void,
  ) {
    this.deckIds = [...initialDeckIds];
    this.root = scene.add.container(0, 0);
    this.root.setDepth(10_000);

    const background = scene.add.graphics();
    background.fillStyle(0x071019, 0.98);
    background.fillRect(0, 0, scene.scale.width, scene.scale.height);
    this.root.add(background);

    this.blocker = scene.add.zone(0, 0, scene.scale.width, scene.scale.height).setOrigin(0, 0);
    this.blocker.setInteractive();
    this.root.add(this.blocker);

    this.closeIcon = this.createTopCloseButton();
    this.root.add(this.closeIcon);

    this.tooltipPanel = new PawnTooltipPanel(scene, {
      x: scene.scale.width / 2,
      y: 150,
      width: scene.scale.width - 40,
      height: 182,
    });
    this.root.add(this.tooltipPanel.container);

    this.slotLayer = scene.add.container(0, 0);
    this.collectionLayer = scene.add.container(0, 0);
    this.cardLayer = scene.add.container(0, 0);
    this.root.add(this.slotLayer);
    this.root.add(this.collectionLayer);
    this.root.add(this.cardLayer);

    this.root.add(this.createSectionLabel('ACTIVE DECK', 268));
    this.root.add(this.createDivider(642));
    this.root.add(this.createSectionLabel('COLLECTION', 666));

    this.closeButton = this.createBottomCloseButton();
    this.root.add(this.closeButton);

    this.bindGlobalDragHandlers();
    this.render();
  }

  destroy(): void {
    this.clearHoldTimer();
    this.scene.input.off(Phaser.Input.Events.DRAG_START, this.handleDragStart, this);
    this.scene.input.off(Phaser.Input.Events.DRAG, this.handleDrag, this);
    this.scene.input.off(Phaser.Input.Events.DRAG_END, this.handleDragEnd, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.root.destroy(true);
  }

  private render(): void {
    this.cardBindings.clear();
    this.deckSlotRects.length = 0;
    this.collectionSlotRects.length = 0;
    this.slotLayer.removeAll(true);
    this.collectionLayer.removeAll(true);
    this.cardLayer.removeAll(true);
    this.tooltipPanel.showEmptyState();

    this.renderDeckSlots();
    this.renderCollectionSlots();
    this.renderCards();
  }

  private renderDeckSlots(): void {
    const startX = this.getGridStartX(4);
    const startY = 372;

    for (let index = 0; index < 8; index += 1) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + col * (CARD_WIDTH + CARD_GAP_X);
      const y = startY + row * (CARD_HEIGHT + CARD_GAP_Y);
      this.slotLayer.add(this.createDeckSlotFrame(x, y));
      this.deckSlotRects.push(new Phaser.Geom.Rectangle(
        x - CARD_WIDTH / 2,
        y - CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT,
      ));
    }
  }

  private renderCollectionSlots(): void {
    const startX = this.getGridStartX(4);
    const y = 790;

    for (let index = 0; index < 4; index += 1) {
      const x = startX + index * (CARD_WIDTH + CARD_GAP_X);
      this.collectionLayer.add(this.createCollectionSlotFrame(x, y));
      this.collectionSlotRects.push(new Phaser.Geom.Rectangle(
        x - CARD_WIDTH / 2,
        y - CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT,
      ));
    }
  }

  private renderCards(): void {
    this.deckIds.forEach((pawnId, index) => {
      const pawn = findPawnDefinition(pawnId);
      if (!pawn) {
        return;
      }
      const rect = this.deckSlotRects[index];
      if (!rect) {
        return;
      }
      this.addCard(pawn, { zone: 'deck', index }, rect.centerX, rect.centerY);
    });

    const collectionPawnIds = getCollectionPawnIds(this.deckIds);
    collectionPawnIds.forEach((pawnId, index) => {
      const pawn = findPawnDefinition(pawnId);
      if (!pawn) {
        return;
      }
      const rect = this.collectionSlotRects[index];
      if (!rect) {
        return;
      }
      this.addCard(pawn, { zone: 'collection', index }, rect.centerX, rect.centerY);
    });
  }

  private addCard(
    pawn: CombatPawnDefinition,
    target: DeckDragTarget,
    x: number,
    y: number,
  ): void {
    const card = createPawnSelectionCard(this.scene, x, y, pawn, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      radius: SLOT_RADIUS,
    });

    card.container.setData('homeX', x);
    card.container.setData('homeY', y);
    this.scene.input.setDraggable(card.container);
    if (card.container.input) {
      card.container.input.cursor = 'grab';
    }

    const binding: CardBinding = {
      container: card.container,
      pawnId: pawn.id,
      target,
      homeX: x,
      homeY: y,
    };

    card.container.on('pointerdown', () => {
      this.clearHoldTimer();
      this.holdTimer = this.scene.time.delayedCall(HOLD_DELAY_MS, () => {
        this.tooltipPanel.showPawnById(binding.pawnId, 1);
      });
    });

    card.container.on('pointerout', () => {
      if (!this.dragLocked) {
        this.tooltipPanel.showEmptyState();
      }
      this.clearHoldTimer();
    });

    this.cardBindings.set(card.container, binding);
    this.cardLayer.add(card.container);
  }

  private bindGlobalDragHandlers(): void {
    this.scene.input.on(Phaser.Input.Events.DRAG_START, this.handleDragStart, this);
    this.scene.input.on(Phaser.Input.Events.DRAG, this.handleDrag, this);
    this.scene.input.on(Phaser.Input.Events.DRAG_END, this.handleDragEnd, this);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }

  private handleDragStart(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
  ): void {
    if (!(gameObject instanceof Phaser.GameObjects.Container)) {
      return;
    }

    const binding = this.cardBindings.get(gameObject);
    if (!binding) {
      return;
    }

    this.activeDrag = binding;
    this.dragLocked = true;
    gameObject.setDepth(50);
    gameObject.setScale(1.05);
  }

  private handleDrag(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
    dragX: number,
    dragY: number,
  ): void {
    if (!(gameObject instanceof Phaser.GameObjects.Container)) {
      return;
    }

    const binding = this.cardBindings.get(gameObject);
    if (!binding) {
      return;
    }

    gameObject.x = dragX;
    gameObject.y = dragY;
  }

  private handleDragEnd(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
  ): void {
    if (!(gameObject instanceof Phaser.GameObjects.Container)) {
      return;
    }

    const binding = this.cardBindings.get(gameObject);
    if (!binding) {
      return;
    }

    const dropTarget = this.resolveDropTarget(pointer.worldX, pointer.worldY);
    const nextDeckIds = dropTarget
      ? swapDeckSelection(this.deckIds, binding.target, dropTarget)
      : this.deckIds;
    const changed = nextDeckIds.some((pawnId, index) => pawnId !== this.deckIds[index]);

    gameObject.setDepth(0);
    gameObject.setScale(1);
    this.activeDrag = undefined;
    this.dragLocked = false;

    if (!dropTarget || !changed) {
      gameObject.x = binding.homeX;
      gameObject.y = binding.homeY;
      return;
    }

    this.deckIds = nextDeckIds;
    this.onDeckChanged([...this.deckIds]);
    this.render();
  }

  private handlePointerUp(): void {
    if (!this.dragLocked) {
      this.tooltipPanel.showEmptyState();
    }
    this.clearHoldTimer();
  }

  private resolveDropTarget(worldX: number, worldY: number): DeckDragTarget | null {
    const deckIndex = this.deckSlotRects.findIndex((rect) => rect.contains(worldX, worldY));
    if (deckIndex >= 0) {
      return { zone: 'deck', index: deckIndex };
    }

    const collectionIndex = this.collectionSlotRects.findIndex((rect) => rect.contains(worldX, worldY));
    if (collectionIndex >= 0) {
      return { zone: 'collection', index: collectionIndex };
    }

    return null;
  }

  private clearHoldTimer(): void {
    this.holdTimer?.remove(false);
    this.holdTimer = undefined;
  }

  private createSectionLabel(text: string, y: number): Phaser.GameObjects.Text {
    return this.scene.add.text(this.scene.scale.width / 2, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: HEADER_FONT_SIZE,
      color: LABEL_COLOR,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);
  }

  private createDivider(y: number): Phaser.GameObjects.Graphics {
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x27445e, 1);
    divider.strokeLineShape(new Phaser.Geom.Line(28, y, this.scene.scale.width - 28, y));
    return divider;
  }

  private createDeckSlotFrame(x: number, y: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x0d1824, 1);
    graphics.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, SLOT_RADIUS);
    graphics.lineStyle(2, 0x29557a, 1);
    graphics.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, SLOT_RADIUS);
    return graphics;
  }

  private createCollectionSlotFrame(x: number, y: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x0b1420, 1);
    graphics.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, SLOT_RADIUS);
    graphics.lineStyle(1, 0x1f3c57, 0.9);
    graphics.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, SLOT_RADIUS);
    return graphics;
  }

  private createTopCloseButton(): Phaser.GameObjects.Container {
    const x = this.scene.scale.width - 40;
    const y = 36;
    const container = this.scene.add.container(x, y);
    const circle = this.scene.add.graphics();
    circle.fillStyle(0x132131, 1);
    circle.fillCircle(0, 0, 22);
    circle.lineStyle(2, 0x356081, 1);
    circle.strokeCircle(0, 0, 22);

    const label = this.scene.add.text(0, -1, '×', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#f5f7ff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    container.add([circle, label]);
    container.setSize(44, 44);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 22), Phaser.Geom.Circle.Contains);
    container.on('pointerdown', () => this.onClosed());
    return container;
  }

  private createBottomCloseButton(): Phaser.GameObjects.Container {
    const width = 220;
    const height = 56;
    const x = this.scene.scale.width / 2 - width / 2;
    const y = this.scene.scale.height - 88;
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1e2e3f, 1);
    bg.fillRoundedRect(0, 0, width, height, 8);
    bg.lineStyle(2, 0x3f627e, 1);
    bg.strokeRoundedRect(0, 0, width, height, 8);
    const text = this.scene.add.text(width / 2, height / 2, 'Close', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    container.add([bg, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => this.onClosed());
    return container;
  }

  private getGridStartX(columns: number): number {
    const totalWidth = columns * CARD_WIDTH + Math.max(0, columns - 1) * CARD_GAP_X;
    return this.scene.scale.width / 2 - totalWidth / 2 + CARD_WIDTH / 2;
  }
}
