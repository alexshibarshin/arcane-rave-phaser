import Phaser from 'phaser';
import { CombatContentConfig, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import {
  createRuleLabelContainer,
  findPawnDefinition,
  getPawnAccentColor,
  getPawnTooltipDescription,
} from './PawnDisplay';

export interface PawnTooltipPanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  emptyText?: string;
}

export class PawnTooltipPanel {
  readonly container: Phaser.GameObjects.Container;

  private readonly background: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly tierStars: Phaser.GameObjects.Text;
  private readonly meta: Phaser.GameObjects.Text;
  private readonly rule: Phaser.GameObjects.Container;
  private readonly description: Phaser.GameObjects.Text;
  private readonly emptyLabel: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: PawnTooltipPanelOptions,
  ) {
    this.container = scene.add.container(options.x, options.y);
    this.background = scene.add.graphics();
    this.container.add(this.background);

    const width = options.width;
    const height = options.height;
    this.drawBackground(width, height);

    const leftColumnWidth = Math.round(width * 0.35);

    this.title = scene.add.text(-width / 2 + leftColumnWidth / 2, -height / 2 + 24, '', {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '20px',
      align: 'center',
      wordWrap: { width: leftColumnWidth - 24 },
    }).setOrigin(0.5, 0.5);

    this.sprite = scene.add.image(-width / 2 + leftColumnWidth / 2, 8, CombatContentConfig.PAWN_SPRITE_TEXTURE_KEY, 0);
    this.sprite.setDisplaySize(96, 96);

    this.tierStars = scene.add.text(-width / 2 + leftColumnWidth / 2, 48, '', {
      color: '#ffd166',
      fontFamily: 'monospace',
      fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.tierStars.setStroke('#7a4f00', 5);

    this.meta = scene.add.text(-width / 2 + leftColumnWidth + 22, -height / 2 + 28, '', {
      color: '#06111a',
      backgroundColor: '#8fd0ea',
      fontFamily: 'monospace',
      fontSize: '15px',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
    }).setOrigin(0, 0.5);

    this.rule = scene.add.container(-width / 2 + leftColumnWidth + 160, -height / 2 + 28);

    this.description = scene.add.text(-width / 2 + leftColumnWidth + 22, -height / 2 + 60, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '18px',
      lineSpacing: 6,
      wordWrap: { width: width - leftColumnWidth - 44 },
    });

    this.emptyLabel = scene.add.text(0, 0, options.emptyText ?? 'Hold a card to inspect', {
      color: 'rgba(217,233,248,0.38)',
      fontFamily: 'monospace',
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.container.add([
      this.title,
      this.sprite,
      this.tierStars,
      this.meta,
      this.rule,
      this.description,
      this.emptyLabel,
    ]);

    this.showEmptyState();
  }

  showPawnById(pawnId: string, tier: number): void {
    const pawn = findPawnDefinition(pawnId);
    if (!pawn) {
      this.showEmptyState();
      return;
    }

    this.populatePawn(pawn, tier);
  }

  showEmptyState(): void {
    this.emptyLabel.setVisible(true);
    this.title.setVisible(false);
    this.sprite.setVisible(false);
    this.tierStars.setVisible(false);
    this.meta.setVisible(false);
    this.rule.setVisible(false);
    this.description.setVisible(false);
    this.rule.removeAll(true);
  }

  destroy(): void {
    this.container.destroy();
  }

  private populatePawn(pawn: CombatPawnDefinition, tier: number): void {
    this.emptyLabel.setVisible(false);
    this.title.setVisible(true);
    this.sprite.setVisible(true);
    this.tierStars.setVisible(true);
    this.meta.setVisible(true);
    this.rule.setVisible(true);
    this.description.setVisible(true);

    this.sprite.setTexture(pawn.art.textureKey, pawn.art.frame);
    this.title.setText(pawn.displayName);
    this.sprite.setPosition(this.sprite.x, 2 + pawn.art.offsetY * 0.24);
    this.tierStars.setText('★'.repeat(tier));
    this.meta.setText(pawn.type === 'generator' ? 'Generator' : 'Finisher');
    this.meta.setBackgroundColor(pawn.type === 'generator' ? '#78d9ff' : '#ffa0bf');
    this.description.setText(getPawnTooltipDescription(pawn, tier));
    this.rule.removeAll(true);
    this.rule.add(createRuleLabelContainer(this.scene, pawn, getPawnAccentColor(pawn.color)));
  }

  private drawBackground(width: number, height: number): void {
    this.background.clear();
    this.background.fillStyle(0x08111b, 0.96);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 24);
    this.background.lineStyle(2, 0x5dd7ff, 0.45);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 24);

    const leftColumnWidth = Math.round(width * 0.35);
    this.background.lineStyle(1, 0x163148, 0.85);
    this.background.strokeLineShape(
      new Phaser.Geom.Line(-width / 2 + leftColumnWidth, -height / 2 + 20, -width / 2 + leftColumnWidth, height / 2 - 20),
    );
  }
}
