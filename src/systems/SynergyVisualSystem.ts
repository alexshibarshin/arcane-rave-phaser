import Phaser from 'phaser';
import type { CombatPawnDefinition } from '@config/CombatContentConfig';
import { SynergyIndicatorConfig } from '@config/SynergyIndicatorConfig';
import { calculateSynergy, type SynergyLink } from './synergy/calculateSynergy';

export type { SynergyLink };

const SYNERGY_PLUS_TEXTURE_KEY = 'synergy-icon-plus';
const SYNERGY_X_TEXTURE_KEY = 'synergy-icon-x';

export interface SynergyVisualSystemConfig {
  scene: Phaser.Scene;
  pawnDefinitions: CombatPawnDefinition[];
  slotCount: number;
  recordCenterX: number;
  recordCenterY: number;
  recordRadius: number;
  depth: number;
}

export class SynergyVisualSystem {
  private scene: Phaser.Scene;
  private pawnDefinitions: CombatPawnDefinition[];
  private slotCount: number;
  private recordCenterX: number;
  private recordCenterY: number;
  private recordRadius: number;
  private depth: number;
  private recordRotationDeg: number = 0;

  private icons: SynergyIcon[] = [];
  private lastSlotState: Array<string | null> | null = null;
  private lastActivatedIndex: number = -1;
  private elapsedMs: number = 0;

  constructor(config: SynergyVisualSystemConfig) {
    this.scene = config.scene;
    this.pawnDefinitions = config.pawnDefinitions;
    this.slotCount = config.slotCount;
    this.recordCenterX = config.recordCenterX;
    this.recordCenterY = config.recordCenterY;
    this.recordRadius = config.recordRadius;
    this.depth = config.depth;
  }

  create(): void {
    this.createTextures();
    this.createIcons();
  }

  update(time: number, delta: number): void {
    this.elapsedMs += delta;

    if (this.lastSlotState === null) {
      return;
    }

    const links = calculateSynergy(
      this.lastSlotState,
      this.pawnDefinitions,
      this.slotCount,
    );
    const linksByFromSlot = new Map(links.map((link) => [link.fromSlot, link]));

    for (const icon of this.icons) {
      const link = linksByFromSlot.get(icon.fromSlot);

      if (!link || link.toSlot !== icon.toSlot) {
        icon.container.setAlpha(0);
        icon.container.setScale(SynergyIndicatorConfig.ANIMATION.PULSE_BASE_SCALE);
        icon.synergyImg.setVisible(false);
        icon.brokenImg.setVisible(false);
        continue;
      }

      icon.hasSynergy = link.hasSynergy;
      icon.isCurrent = this.lastActivatedIndex === -1
        ? false
        : this.lastActivatedIndex === icon.fromSlot;
      icon.synergyImg.setVisible(link.hasSynergy);
      icon.brokenImg.setVisible(!link.hasSynergy);

      const alpha = icon.isCurrent
        ? SynergyIndicatorConfig.ANIMATION.CURRENT_PAIR_ALPHA
        : SynergyIndicatorConfig.ANIMATION.BASE_ALPHA;

      icon.container.setAlpha(alpha);

      if (icon.isCurrent) {
        const pulse = Math.sin(
          (this.elapsedMs * Math.PI * 2) / SynergyIndicatorConfig.ANIMATION.PULSE_SCALE_PERIOD_MS,
        );
        const scale =
          SynergyIndicatorConfig.ANIMATION.PULSE_BASE_SCALE
          + pulse * SynergyIndicatorConfig.ANIMATION.PULSE_SCALE_AMPLITUDE;
        icon.container.setScale(scale);
      } else {
        icon.container.setScale(SynergyIndicatorConfig.ANIMATION.PULSE_BASE_SCALE);
      }
    }
  }

  updateBuildState(slotPawnIds: Array<string | null>): void {
    this.lastSlotState = [...slotPawnIds];
    this.lastActivatedIndex = -1;
  }

  onSlotActivated(slotIndex: number): void {
    this.lastActivatedIndex = slotIndex;
  }

  setRecordLayout(centerX: number, centerY: number, radius: number): void {
    this.recordCenterX = centerX;
    this.recordCenterY = centerY;
    this.recordRadius = radius;
    this.repositionIcons();
  }

  setRecordRotation(rotationDeg: number): void {
    this.recordRotationDeg = rotationDeg;
    this.repositionIcons();
  }

  destroy(): void {
    for (const icon of this.icons) {
      icon.container.destroy();
    }
    this.icons = [];
    this.lastSlotState = null;
    this.lastActivatedIndex = -1;
    this.elapsedMs = 0;
  }

  private createTextures(): void {
    const size = SynergyIndicatorConfig.ICON_SIZE;

    if (!this.scene.textures.exists(SYNERGY_PLUS_TEXTURE_KEY)) {
      const synergyCanvas = document.createElement('canvas');
      synergyCanvas.width = size;
      synergyCanvas.height = size;
      const synergyCtx = synergyCanvas.getContext('2d');

      if (!synergyCtx) {
        return;
      }

      drawOrbIcon(synergyCtx, size, SynergyIndicatorConfig.COLORS.SYNERGY, 'plus');

      this.scene.textures.addCanvas(SYNERGY_PLUS_TEXTURE_KEY, synergyCanvas);
    }

    if (!this.scene.textures.exists(SYNERGY_X_TEXTURE_KEY)) {
      const brokenCanvas = document.createElement('canvas');
      brokenCanvas.width = size;
      brokenCanvas.height = size;
      const brokenCtx = brokenCanvas.getContext('2d');

      if (!brokenCtx) {
        return;
      }

      drawOrbIcon(brokenCtx, size, SynergyIndicatorConfig.COLORS.BROKEN, 'x');

      this.scene.textures.addCanvas(SYNERGY_X_TEXTURE_KEY, brokenCanvas);
    }
  }

  private createIcons(): void {
    const slotCount = this.slotCount;

    for (let i = 0; i < slotCount; i += 1) {
      const container = this.scene.add.container(0, 0);
      container.setDepth(this.depth);

      const synergyImg = this.scene.add.image(0, 0, SYNERGY_PLUS_TEXTURE_KEY);
      synergyImg.setVisible(false);
      container.add(synergyImg);
      const brokenImg = this.scene.add.image(0, 0, SYNERGY_X_TEXTURE_KEY);
      brokenImg.setVisible(false);
      container.add(brokenImg);

      container.setSize(SynergyIndicatorConfig.ICON_SIZE, SynergyIndicatorConfig.ICON_SIZE);

      this.icons.push({
        container,
        fromSlot: i,
        toSlot: (i + 1) % slotCount,
        hasSynergy: null,
        isCurrent: false,
        synergyImg,
        brokenImg,
      });
    }

    this.repositionIcons();
  }

  private repositionIcons(): void {
    const slotCount = this.slotCount;
    const offsetRatio = SynergyIndicatorConfig.ICON_RADIUS_OFFSET_RATIO;
    const iconRadius = this.recordRadius * offsetRatio;

    for (let i = 0; i < slotCount; i += 1) {
      const icon = this.icons[i];
      if (!icon) continue;

      const angleDeg = this.getBoundaryAngle(i);
      const pos = getPolarOffset(angleDeg, iconRadius);

      icon.container.x = pos.x + this.recordCenterX;
      icon.container.y = pos.y + this.recordCenterY;
      icon.container.setRotation(Phaser.Math.DegToRad(angleDeg + 90));
    }
  }

  private getBoundaryAngle(slotIndex: number): number {
    return -90
      + (360 / this.slotCount) * slotIndex
      + (360 / this.slotCount) / 2
      + this.recordRotationDeg;
  }
}

interface SynergyIcon {
  container: Phaser.GameObjects.Container;
  fromSlot: number;
  toSlot: number;
  hasSynergy: boolean | null;
  isCurrent: boolean;
  synergyImg: Phaser.GameObjects.Image;
  brokenImg: Phaser.GameObjects.Image;
}

function getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
  const radians = Phaser.Math.DegToRad(angleDeg);

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function drawOrbIcon(
  context: CanvasRenderingContext2D,
  size: number,
  accentColor: number,
  symbol: 'plus' | 'x',
): void {
  const center = size / 2;
  const outerRadius = size * SynergyIndicatorConfig.ORB.OUTER_RADIUS_RATIO;
  const innerRadius = size * SynergyIndicatorConfig.ORB.INNER_RADIUS_RATIO;
  const coreRadius = size * SynergyIndicatorConfig.ORB.CORE_RADIUS_RATIO;
  const accentHex = `#${accentColor.toString(16).padStart(6, '0')}`;
  const shellHex = `#${SynergyIndicatorConfig.COLORS.SHELL.toString(16).padStart(6, '0')}`;
  const coreHex = `#${SynergyIndicatorConfig.COLORS.CORE.toString(16).padStart(6, '0')}`;
  const shadowHex = `#${SynergyIndicatorConfig.COLORS.SHADOW.toString(16).padStart(6, '0')}`;

  context.clearRect(0, 0, size, size);

  context.fillStyle = accentHex;
  context.globalAlpha = SynergyIndicatorConfig.ORB.GLOW_ALPHA;
  context.beginPath();
  context.arc(center, center, outerRadius, 0, Math.PI * 2);
  context.fill();

  const orbGradient = context.createRadialGradient(
    center - size * 0.18,
    center - size * 0.18,
    coreRadius * 0.35,
    center,
    center,
    innerRadius,
  );
  orbGradient.addColorStop(0, coreHex);
  orbGradient.addColorStop(0.35, shellHex);
  orbGradient.addColorStop(1, accentHex);

  context.globalAlpha = SynergyIndicatorConfig.ORB.BODY_ALPHA;
  context.fillStyle = orbGradient;
  context.beginPath();
  context.arc(center, center, innerRadius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 1;
  context.strokeStyle = shellHex;
  context.lineWidth = SynergyIndicatorConfig.ORB.RING_LINE_WIDTH;
  context.beginPath();
  context.arc(center, center, innerRadius - 1, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = shellHex;
  context.globalAlpha = SynergyIndicatorConfig.ORB.CORE_ALPHA;
  context.beginPath();
  context.arc(center - size * 0.09, center - size * 0.09, coreRadius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.18;
  context.fillStyle = shadowHex;
  context.beginPath();
  context.arc(center + size * 0.08, center + size * 0.1, coreRadius * 0.95, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 1;
  context.strokeStyle = shadowHex;
  context.lineWidth = 5;
  context.lineCap = 'round';
  drawSymbolPath(context, center, size, symbol);
  context.stroke();

  context.strokeStyle = accentHex;
  context.lineWidth = 3.4;
  drawSymbolPath(context, center, size, symbol);
  context.stroke();
}

function drawSymbolPath(
  context: CanvasRenderingContext2D,
  center: number,
  size: number,
  symbol: 'plus' | 'x',
): void {
  context.beginPath();

  if (symbol === 'plus') {
    context.moveTo(center - size * 0.18, center);
    context.lineTo(center + size * 0.18, center);
    context.moveTo(center, center - size * 0.18);
    context.lineTo(center, center + size * 0.18);
    return;
  }

  context.moveTo(center - size * 0.16, center - size * 0.16);
  context.lineTo(center + size * 0.16, center + size * 0.16);
  context.moveTo(center + size * 0.16, center - size * 0.16);
  context.lineTo(center - size * 0.16, center + size * 0.16);
}
