import Phaser from 'phaser';
import { CombatContentConfig, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { SLOT_MODIFIER_CONFIG, type SlotModifierDefinition } from '@config/SlotModifierConfig';
import type { StageRuntime } from '@stage/StageRuntime';
import {
  findPawnDefinition,
  createRuleLabelContainer,
  getPawnAccentColor,
  getPawnTooltipDescription,
  createModifierEffectLabel,
} from './StageRenderHelpers';
import { isPawnCompatibleWithModifier } from './ModifierCompatibility';
import { showCompatibilityLink } from './ModifierLinkEffect';
import type { StageRecordView } from './StageRecordView';
import type { ModifierTooltipState } from './ModifierTooltipBridge';

interface StagePawnTooltipState {
  pawnId: string;
  tier: number;
  slotIndex?: number;
}

export class StageTooltipController {
  readonly container: Phaser.GameObjects.Container;

  private sprite!: Phaser.GameObjects.Image;
  private title!: Phaser.GameObjects.Text;
  private meta!: Phaser.GameObjects.Text;
  private tierStars!: Phaser.GameObjects.Text;
  private rule!: Phaser.GameObjects.Container;
  private description!: Phaser.GameObjects.Text;

  private inspectedPawn: StagePawnTooltipState | null = null;
  private inspectedModifier: ModifierTooltipState | null = null;
  private holdTimer?: Phaser.Time.TimerEvent;
  private modifierHoldTimer?: Phaser.Time.TimerEvent;
  private dragLocked = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly recordView: StageRecordView,
    private readonly getRuntime: () => StageRuntime,
  ) {
    this.container = this.createTooltipContainer();
  }

  private createTooltipContainer(): Phaser.GameObjects.Container {
    const width = this.scene.scale.width - 64;
    const height = 146;
    const container = this.scene.add.container(this.scene.scale.width / 2, 144);
    const background = this.scene.add.graphics();
    background.fillStyle(0x08111b, 0.96);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 24);
    background.lineStyle(2, 0x5dd7ff, 0.45);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 24);

    const leftColumnWidth = Math.round(width * 0.35);
    background.lineStyle(1, 0x163148, 0.85);
    background.strokeLineShape(
      new Phaser.Geom.Line(-width / 2 + leftColumnWidth, -height / 2 + 18, -width / 2 + leftColumnWidth, height / 2 - 18),
    );

    this.title = this.scene.add.text(-width / 2 + leftColumnWidth / 2, -height / 2 + 22, '', {
      color: '#f5f7ff',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '20px',
      align: 'center',
      wordWrap: { width: leftColumnWidth - 24 },
    }).setOrigin(0.5, 0.5);
    this.sprite = this.scene.add.image(-width / 2 + leftColumnWidth / 2, 4, CombatContentConfig.PAWN_SPRITE_TEXTURE_KEY, 0);
    this.sprite.setDisplaySize(88, 88);
    this.tierStars = this.scene.add.text(-width / 2 + leftColumnWidth / 2, 42, '', {
      color: '#ffd166',
      fontFamily: 'monospace',
      fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.tierStars.setStroke('#7a4f00', 5);

    this.meta = this.scene.add.text(-width / 2 + leftColumnWidth + 22, -height / 2 + 26, '', {
      color: '#06111a',
      backgroundColor: '#8fd0ea',
      fontFamily: 'monospace',
      fontSize: '13px',
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
    }).setOrigin(0, 0.5);
    this.rule = this.scene.add.container(-width / 2 + leftColumnWidth + 160, -height / 2 + 26);
    this.description = this.scene.add.text(-width / 2 + leftColumnWidth + 22, -height / 2 + 56, '', {
      color: '#d9e9f8',
      fontFamily: 'monospace',
      fontSize: '14px',
      lineSpacing: 4,
      wordWrap: { width: width - leftColumnWidth - 44 },
    });

    container.add([
      background,
      this.title,
      this.sprite,
      this.tierStars,
      this.meta,
      this.rule,
      this.description,
    ]);
    container.setVisible(false);
    container.setAlpha(0);
    return container;
  }

  bindPawnInspection(container: Phaser.GameObjects.Container, tooltipState: StagePawnTooltipState): void {
    container.on('pointerdown', () => {
      this.clearHoldTimers();
      this.holdTimer = this.scene.time.delayedCall(150, () => {
        this.showPawnTooltip(tooltipState);
      });
    });

    container.on('pointerout', () => {
      if (!this.dragLocked) {
        this.hidePawnTooltip();
      }
      this.clearHoldTimers();
    });
  }

  bindModifierInspection(
    iconView: { container: Phaser.GameObjects.Container; modifierId: string; slotIndex: number },
  ): void {
    const state: ModifierTooltipState = { modifierId: iconView.modifierId, slotIndex: iconView.slotIndex };
    iconView.container.on('pointerdown', () => {
      this.clearHoldTimers();
      this.modifierHoldTimer = this.scene.time.delayedCall(150, () => {
        this.showModifierTooltip(state);
      });
    });
    iconView.container.on('pointerout', () => {
      if (!this.dragLocked) {
        this.hideModifierTooltip();
      }
      this.clearHoldTimers();
    });
  }

  setDragLocked(locked: boolean): void {
    this.dragLocked = locked;
  }

  clearOnPointerUp(): void {
    if (!this.dragLocked) {
      this.hidePawnTooltip();
      this.hideModifierTooltip();
    }
    this.clearHoldTimers();
  }

  showCompatibilityLinkIfApplicable(slotIndex: number): void {
    const runtime = this.getRuntime();
    const pawnId = runtime.build.slots[slotIndex]?.pawnId;
    const slotAssignment = runtime.slotModifiers.find((assignment) => assignment.slotIndex === slotIndex);

    if (!pawnId || !slotAssignment) {
      return;
    }

    if (!isPawnCompatibleWithModifier(pawnId, slotAssignment.modifierId)) {
      return;
    }

    const iconView = this.recordView.getModifierIconView(slotIndex);
    const pawnView = this.recordView.getSlotPawnContainer(slotIndex);
    if (!iconView || !pawnView) {
      return;
    }

    showCompatibilityLink(this.scene, iconView.container, pawnView);
  }

  showPawnTooltip(state: StagePawnTooltipState): void {
    const pawn = findPawnDefinition(state.pawnId);
    if (!pawn) {
      return;
    }

    this.inspectedModifier = null;
    this.inspectedPawn = state;
    this.sprite.setVisible(true);
    this.sprite.setTexture(pawn.art.textureKey, pawn.art.frame);
    this.title.setText(pawn.displayName);
    this.sprite.setPosition(this.sprite.x, 2 + pawn.art.offsetY * 0.24);
    this.tierStars.setVisible(true);
    this.tierStars.setText('★'.repeat(state.tier));
    this.meta.setText(pawn.type === 'generator' ? 'Generator' : 'Finisher');
    this.meta.setBackgroundColor(pawn.type === 'generator' ? '#78d9ff' : '#ffa0bf');
    this.description.setText(getPawnTooltipDescription(pawn, state.tier));
    this.rule.removeAll(true);
    const rule = createRuleLabelContainer(this.scene, pawn, getPawnAccentColor(pawn.color));
    this.rule.add(rule);

    this.container.setVisible(true);
    this.container.setAlpha(1);
    if (typeof state.slotIndex === 'number') {
      this.showCompatibilityLinkIfApplicable(state.slotIndex);
    }
  }

  hidePawnTooltip(): void {
    this.inspectedPawn = null;
    if (this.inspectedModifier === null) {
      this.container.setVisible(false);
      this.container.setAlpha(0);
    }
  }

  showModifierTooltip(state: ModifierTooltipState): void {
    const modifier = SLOT_MODIFIER_CONFIG.getModifierById(state.modifierId);
    if (!modifier) {
      return;
    }

    this.inspectedPawn = null;
    this.inspectedModifier = state;
    this.sprite.setVisible(false);
    this.title.setText(modifier.displayName);
    this.meta.setText(modifier.rarity === 'premium' ? 'Premium' : 'Common');
    this.meta.setBackgroundColor(modifier.rarity === 'premium' ? '#d9a6ff' : '#8fd0ea');
    this.tierStars.setVisible(false);
    this.tierStars.setText('');
    this.description.setText(modifier.shortDescription);
    this.rule.removeAll(true);
    this.rule.add(createModifierEffectLabel(this.scene, modifier));
    this.container.setVisible(true);
    this.container.setAlpha(1);
    this.showCompatibilityLinkIfApplicable(state.slotIndex);
  }

  hideModifierTooltip(): void {
    this.inspectedModifier = null;
    if (this.inspectedPawn === null) {
      this.container.setVisible(false);
      this.container.setAlpha(0);
    }
  }

  isVisible(): boolean {
    return this.inspectedPawn !== null || this.inspectedModifier !== null;
  }

  destroy(): void {
    this.clearHoldTimers();
    this.container.destroy();
  }

  private clearHoldTimers(): void {
    this.holdTimer?.remove(false);
    this.holdTimer = undefined;
    this.modifierHoldTimer?.remove(false);
    this.modifierHoldTimer = undefined;
  }
}
