import Phaser from 'phaser';
import { CombatContentConfig, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { SynergyVisualSystem } from '@systems/SynergyVisualSystem';
import { getStageBuildSlotPawnIds, type StagePawnInstance, type StageBuildState } from '@stage/StageBuild';
import { createModifierIcons, type ModifierIconView } from './ModifierIconRenderer';
import type { SlotModifierAssignment } from '@modifiers/SlotModifierAssignment';
import type { StageRuntime } from '@stage/StageRuntime';
import {
  findPawnDefinition,
  createPawnSprite,
  createRuleLabelContainer,
  getPawnAccentColor,
  getPolarOffset,
} from './StageRenderHelpers';

export interface StageRecordSlotView {
  slotIndex: number;
  anchorX: number;
  anchorY: number;
  zone: Phaser.GameObjects.Zone;
  glow: Phaser.GameObjects.Graphics;
  mergeHighlight: Phaser.GameObjects.Graphics;
  pawnContainer?: Phaser.GameObjects.Container;
  innerLabel?: Phaser.GameObjects.Container;
}

export class StageRecordView {
  readonly container: Phaser.GameObjects.Container;
  readonly slotViews: StageRecordSlotView[] = [];
  readonly modifierIconViews: ModifierIconView[] = [];
  readonly pawnLayer: Phaser.GameObjects.Container;
  readonly innerLabelLayer: Phaser.GameObjects.Container;

  private synergySystem?: SynergyVisualSystem;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getRuntime: () => StageRuntime,
  ) {
    this.container = scene.add.container(
      StagePresentationConfig.RECORD_CENTER_X,
      StagePresentationConfig.BUILD_RECORD_CENTER_Y,
    );
    this.pawnLayer = scene.add.container(0, 0);
    this.innerLabelLayer = scene.add.container(0, 0);
  }

  create(): void {
    const graphics = this.scene.add.graphics();
    const slotCount = CombatContentConfig.SLOT_COUNT;
    const radius = StagePresentationConfig.BUILD_RECORD_RADIUS;
    const innerRadius = radius * 0.64;
    const labelRadius = radius * 0.82;
    const pawnRadius = radius * 0.68;

    graphics.fillStyle(0x16111f, 1);
    graphics.fillCircle(0, 0, radius);
    graphics.lineStyle(12, 0x2a1f39, 1);
    graphics.strokeCircle(0, 0, radius - 6);
    graphics.lineStyle(2, 0x5bdfff, 0.22);
    graphics.strokeCircle(0, 0, innerRadius);
    graphics.fillStyle(0x0a0e15, 1);
    graphics.fillCircle(0, 0, StagePresentationConfig.BUILD_RECORD_INNER_RADIUS);
    this.container.add(graphics);

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const startAngleDeg = -90 + (360 / slotCount) * slotIndex - (360 / slotCount) / 2;
      const endAngleDeg = startAngleDeg + 360 / slotCount;
      const angleDeg = -90 + (360 / slotCount) * slotIndex;
      const chipAnchor = getPolarOffset(angleDeg, labelRadius);
      const pawnAnchor = getPolarOffset(angleDeg, pawnRadius);

      const slotArc = this.scene.add.graphics();
      slotArc.fillStyle(slotIndex % 2 === 0 ? 0x19253a : 0x111b2b, 0.34);
      fillSector(slotArc, 0, 0, radius - 18, startAngleDeg, endAngleDeg);
      slotArc.lineStyle(2, slotIndex === 0 ? 0xffd166 : 0x71c8ff, slotIndex === 0 ? 0.9 : 0.44);
      strokeSector(slotArc, 0, 0, radius - 18, startAngleDeg, endAngleDeg);

      const slotChip = this.scene.add.graphics();
      slotChip.fillStyle(slotIndex % 3 === 0 ? 0x14283a : 0x0f1724, 1);
      slotChip.fillRoundedRect(chipAnchor.x - 24, chipAnchor.y - 16, 48, 32, 12);
      slotChip.lineStyle(2, slotIndex % 3 === 0 ? 0xff7ab6 : 0x57d9ff, 0.7);
      slotChip.strokeRoundedRect(chipAnchor.x - 24, chipAnchor.y - 16, 48, 32, 12);

      const label = this.scene.add.text(chipAnchor.x, chipAnchor.y, `${slotIndex + 1}`, {
        color: '#d9e9f8',
        fontFamily: 'monospace',
        fontSize: '18px',
      }).setOrigin(0.5, 0.5);

      const glow = this.scene.add.graphics();
      glow.setAlpha(0);
      glow.fillStyle(0x8ef7ff, 0.35);
      glow.fillCircle(pawnAnchor.x, pawnAnchor.y, 46);
      glow.lineStyle(3, 0x8ef7ff, 1);
      glow.strokeCircle(pawnAnchor.x, pawnAnchor.y, 52);

      const zone = this.scene.add.zone(pawnAnchor.x, pawnAnchor.y, 120, 120);
      zone.setRectangleDropZone(120, 120);
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive();

      const mergeHighlight = this.scene.add.graphics();
      mergeHighlight.setAlpha(0);

      this.container.add([slotArc, slotChip, label, glow, zone, mergeHighlight]);

      this.slotViews.push({
        slotIndex,
        anchorX: pawnAnchor.x,
        anchorY: pawnAnchor.y,
        zone,
        glow,
        mergeHighlight,
      });
    }

    const needle = this.scene.add.graphics();
    needle.lineStyle(6, 0xb7f9ff, 0.95);
    needle.beginPath();
    needle.moveTo(0, -radius - 72);
    needle.lineTo(0, -radius + 6);
    needle.strokePath();
    needle.fillStyle(0xffd166, 1);
    needle.fillTriangle(0, -radius - 8, -12, -radius + 18, 12, -radius + 18);

    const centerGlow = this.scene.add.graphics();
    centerGlow.fillStyle(0x8ef7ff, 0.22);
    centerGlow.fillCircle(0, 0, 40);
    centerGlow.lineStyle(2, 0x8ef7ff, 0.7);
    centerGlow.strokeCircle(0, 0, 58);

    const centerCapibara = this.scene.add.image(0, 0, CombatLayoutConfig.BASE_SPRITE_TEXTURE_KEY);
    centerCapibara.setDisplaySize(
      StagePresentationConfig.BUILD_RECORD_CENTER_CAPIBARA_SIZE,
      StagePresentationConfig.BUILD_RECORD_CENTER_CAPIBARA_SIZE,
    );
    centerCapibara.setOrigin(0.5, 0.5);

    this.container.add([this.innerLabelLayer, this.pawnLayer, centerGlow, centerCapibara, needle]);
  }

  createModifierIcons(runtime: StageRuntime): void {
    this.modifierIconViews.length = 0;
    const icons = createModifierIcons(
      this.scene,
      runtime.slotModifiers,
      this.container,
      StagePresentationConfig.BUILD_RECORD_RADIUS,
    );
    for (const icon of icons) {
      this.modifierIconViews.push(icon);
    }
  }

  createSynergySystem(): void {
    this.synergySystem = new SynergyVisualSystem({
      scene: this.scene,
      pawnDefinitions: CombatContentConfig.PAWN_DEFINITIONS,
      slotCount: CombatContentConfig.SLOT_COUNT,
      recordCenterX: this.container.x,
      recordCenterY: this.container.y,
      recordRadius: StagePresentationConfig.BUILD_RECORD_RADIUS,
      depth: 30,
    });
    this.synergySystem.create();
  }

  updateSynergy(): void {
    const runtime = this.getRuntime();
    this.synergySystem?.updateBuildState(getStageBuildSlotPawnIds(runtime.build));
  }

  updateSynergyVisuals(time: number, delta: number): void {
    this.synergySystem?.update(time, delta);
  }

  refresh(runtime: StageRuntime): void {
    this.slotViews.forEach((slotView) => {
      slotView.pawnContainer?.destroy();
      slotView.pawnContainer = undefined;
      slotView.innerLabel?.destroy();
      slotView.innerLabel = undefined;
    });

    for (const slotView of this.slotViews) {
      const pawnInstance = runtime.build.slots[slotView.slotIndex];
      if (!pawnInstance) {
        continue;
      }

      const pawnDefinition = findPawnDefinition(pawnInstance.pawnId);
      if (!pawnDefinition) {
        continue;
      }

      const pawnContainer = this.createSlotPawn(
        slotView.anchorX,
        slotView.anchorY,
        slotView.slotIndex,
        pawnDefinition,
        pawnInstance,
      );
      slotView.pawnContainer = pawnContainer;
      this.pawnLayer.add(pawnContainer);

      const accent = getPawnAccentColor(pawnDefinition.color);
      const innerLabel = createRuleLabelContainer(this.scene, pawnDefinition, accent);
      const innerRadius = StagePresentationConfig.BUILD_RECORD_INNER_RADIUS * 0.82;
      const angleDeg = -90 + (360 / 8) * slotView.slotIndex;
      const innerPos = getPolarOffset(angleDeg, innerRadius);
      innerLabel.x = innerPos.x;
      innerLabel.y = innerPos.y;
      slotView.innerLabel = innerLabel;
      this.innerLabelLayer.add(innerLabel);
    }

    this.updateSynergy();
  }

  private createSlotPawn(
    x: number,
    y: number,
    slotIndex: number,
    pawn: CombatPawnDefinition,
    pawnInstance: StagePawnInstance,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const spriteSize = 82;
    const sprite = createPawnSprite(this.scene, pawn, spriteSize);
    sprite.y = -2;

    const stars = this.scene.add.text(0, 46, '★'.repeat(pawnInstance.tier), {
      color: '#ffd166',
      fontFamily: 'monospace',
      fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
      align: 'center',
    }).setOrigin(0.5, 0.5);
    stars.setStroke('#7a4f00', 5);

    container.add([sprite, stars]);
    container.setSize(88, 92);
    container.setData('homeX', x);
    container.setData('homeY', y);
    container.setInteractive(
      new Phaser.Geom.Circle(
        container.width / 2 + pawn.art.offsetX,
        container.height / 2 + pawn.art.offsetY - 2,
        spriteSize * 0.44,
      ),
      Phaser.Geom.Circle.Contains,
    );
    this.scene.input.setDraggable(container);
    if (container.input) {
      container.input.cursor = 'grab';
    }

    return container;
  }

  showMergeHighlights(slotIndices: number[], accentColor: number): void {
    for (const slotView of this.slotViews) {
      if (slotIndices.includes(slotView.slotIndex)) {
        this.drawMergeHighlightRing(slotView.mergeHighlight, slotView.anchorX, slotView.anchorY, accentColor);
        slotView.mergeHighlight.setAlpha(1);
      } else {
        slotView.mergeHighlight.setAlpha(0);
      }
    }
  }

  hideMergeHighlights(): void {
    for (const slotView of this.slotViews) {
      slotView.mergeHighlight.setAlpha(0);
    }
  }

  private drawMergeHighlightRing(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    accentColor: number,
  ): void {
    gfx.clear();
    gfx.fillStyle(accentColor, 0.15);
    gfx.fillCircle(x, y, 52);
    gfx.lineStyle(3, accentColor, 0.65);
    gfx.strokeCircle(x, y, 50);
    gfx.lineStyle(2, accentColor, 0.35);
    gfx.strokeCircle(x, y, 62);
  }

  getSlotPawnContainer(slotIndex: number): Phaser.GameObjects.Container | undefined {
    return this.slotViews[slotIndex]?.pawnContainer;
  }

  getModifierIconView(slotIndex: number): ModifierIconView | undefined {
    return this.modifierIconViews.find((view) => view.slotIndex === slotIndex);
  }

  destroy(): void {
    this.synergySystem?.destroy();
    this.synergySystem = undefined;
    this.slotViews.forEach((view) => {
      view.pawnContainer?.destroy();
      view.pawnContainer = undefined;
      view.innerLabel?.destroy();
      view.innerLabel = undefined;
      view.mergeHighlight.destroy();
    });
  }
}

function fillSector(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): void {
  graphics.beginPath();
  graphics.moveTo(centerX, centerY);
  graphics.slice(
    centerX,
    centerY,
    radius,
    Phaser.Math.DegToRad(startAngleDeg),
    Phaser.Math.DegToRad(endAngleDeg),
    false,
  );
  graphics.closePath();
  graphics.fillPath();
}

function strokeSector(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): void {
  graphics.beginPath();
  graphics.moveTo(centerX, centerY);
  graphics.slice(
    centerX,
    centerY,
    radius,
    Phaser.Math.DegToRad(startAngleDeg),
    Phaser.Math.DegToRad(endAngleDeg),
    false,
  );
  graphics.closePath();
  graphics.strokePath();
}
