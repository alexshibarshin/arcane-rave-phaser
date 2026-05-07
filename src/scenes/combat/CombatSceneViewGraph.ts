import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import {
  COMBAT_NOTE_GLYPH_TEXTURE_KEY,
  ensureCombatNoteGlyphTexture,
} from '@combat/CombatNoteGlyph';
import {
  COMBAT_VFX_GLOW_TEXTURE_KEY,
  ensureCombatVfxTextures,
} from '@combat/CombatVfxTextures';
import { createCombatEnemyViewRegistry, type CombatEnemyViewRegistry } from '@combat/CombatEnemyViewRegistry';
import { createCombatRenderModel, type CombatRenderModel } from '@combat/CombatRenderModel';

export interface CombatSlotView {
  sectorPulse: Phaser.GameObjects.Graphics;
  zonePulse: Phaser.GameObjects.Graphics;
  pawnGlow: Phaser.GameObjects.Image;
  uprightContainer: Phaser.GameObjects.Container;
  rotatingContent: Phaser.GameObjects.Container;
  anchorLocalX: number;
  anchorLocalY: number;
}

export interface CombatBaseHpBarView {
  fill: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CombatNotePacketView {
  anchorX: number;
  anchorY: number;
  depth: number;
  anchorDecor: Phaser.GameObjects.Graphics;
  glyphs: Map<string, Phaser.GameObjects.Image>;
}

export interface CombatPresentationAnchors {
  getSlotAnchor(slotIndex: number): { x: number; y: number; hasPawn: boolean } | null;
  getEnemyAnchor(enemyId: string): { x: number; y: number } | null;
  getNotePacketAnchor(): { x: number; y: number };
  getBaseAnchor(): { x: number; y: number };
}

export interface CombatSceneViewGraph {
  record: {
    container: Phaser.GameObjects.Container;
    slotViews: Map<number, CombatSlotView>;
  };
  base: {
    root: Phaser.GameObjects.Image;
    restX: number;
    restY: number;
    vfxAnchorOffsetY: number;
    hpBar: CombatBaseHpBarView;
  };
  notePacket: {
    view: CombatNotePacketView;
  };
  effects: {
    enemyLayer: Phaser.GameObjects.Layer;
    transientLayer: Phaser.GameObjects.Layer;
    damageNumberLayer: Phaser.GameObjects.Layer;
  };
  anchors: CombatPresentationAnchors;
  enemies: CombatEnemyViewRegistry;
  needle: {
    tipX: number;
    tipY: number;
  };
  destroy(): void;
}

interface CreateCombatSceneViewGraphOptions {
  scene: Phaser.Scene;
  waveIndex?: number;
  slotPawns?: Array<{ pawnId: string | null; tier: number | null }>;
  slotPawnIds?: Array<string | null>;
}

export function createCombatSceneViewGraph(
  options: CreateCombatSceneViewGraphOptions,
): CombatSceneViewGraph {
  ensureCombatNoteGlyphTexture(options.scene);
  ensureCombatVfxTextures(options.scene);

  const renderModel = createCombatRenderModel({
    waveIndex: options.waveIndex,
    slotPawns: options.slotPawns,
    slotPawnIds: options.slotPawnIds,
  });

  const enemyLayer = options.scene.add.layer();
  enemyLayer.setDepth(CombatLayoutConfig.DEPTH.PAWNS);

  const transientLayer = options.scene.add.layer();
  transientLayer.setDepth(CombatLayoutConfig.DEPTH.VFX);

  const damageNumberLayer = options.scene.add.layer();
  damageNumberLayer.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.45);

  renderBackground(options.scene, renderModel);
  renderEnemyLane(options.scene, renderModel);
  renderTimeControlBackplates(options.scene, renderModel);
  const record = renderRecord(options.scene, renderModel);
  const base = renderBase(options.scene, renderModel);
  renderNeedle(options.scene, renderModel);
  const hpBar = renderBaseHpBar(options.scene, renderModel);
  const notePacketView = renderNotePacketAnchor(options.scene, renderModel);

  const enemies = createCombatEnemyViewRegistry({
    scene: options.scene,
    enemyLayer,
    renderModel,
  });

  return {
    record,
    base: {
      root: base.root,
      restX: base.restX,
      restY: base.restY,
      vfxAnchorOffsetY: base.vfxAnchorOffsetY,
      hpBar,
    },
    notePacket: {
      view: notePacketView,
    },
    effects: {
      enemyLayer,
      transientLayer,
      damageNumberLayer,
    },
    anchors: {
      getSlotAnchor(slotIndex) {
        const slotView = record.slotViews.get(slotIndex);
        const slotPawnId = options.slotPawnIds?.[slotIndex] ?? null;

        if (!slotView) {
          return null;
        }

        const matrix = slotView.uprightContainer.getWorldTransformMatrix();
        const point = matrix.transformPoint(slotView.anchorLocalX, slotView.anchorLocalY);

        return {
          x: point.x,
          y: point.y,
          hasPawn: slotPawnId !== null,
        };
      },
      getEnemyAnchor(enemyId) {
        return enemies.getEnemyAnchor(enemyId);
      },
      getNotePacketAnchor() {
        return {
          x: notePacketView.anchorX,
          y: notePacketView.anchorY,
        };
      },
      getBaseAnchor() {
        return {
          x: base.root.x,
          y: base.root.y + base.vfxAnchorOffsetY,
        };
      },
    },
    enemies,
    needle: {
      tipX: renderModel.needle.tipX,
      tipY: renderModel.needle.tipY,
    },
    destroy() {
      enemies.clear();
      notePacketView.glyphs.forEach((glyph) => glyph.destroy());
      notePacketView.glyphs.clear();
      enemyLayer.destroy();
      transientLayer.destroy();
      damageNumberLayer.destroy();
      record.container.destroy();
      base.root.destroy();
      hpBar.fill.destroy();
      hpBar.label.destroy();
      notePacketView.anchorDecor.destroy();
    },
  };
}

function renderBackground(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): void {
  const graphics = scene.add.graphics();

  graphics.setDepth(model.background.depth);
  graphics.fillGradientStyle(0x07111d, 0x07111d, 0x120c24, 0x120c24, 1);
  graphics.fillRect(0, 0, model.background.width, model.background.height);
  graphics.lineStyle(2, 0x17304a, 0.45);
  graphics.strokeRect(
    20,
    model.enemyLane.top,
    model.background.width - 40,
    model.enemyLane.bottom - model.enemyLane.top,
  );
}

function renderEnemyLane(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): void {
  const graphics = scene.add.graphics();
  const width = model.enemyLane.right - model.enemyLane.left;
  const height = model.enemyLane.bottom - model.enemyLane.top;

  graphics.setDepth(model.enemyLane.depth);
  graphics.fillStyle(0x11263a, 0.45);
  graphics.fillRoundedRect(model.enemyLane.left, model.enemyLane.top, width, height, 24);
  graphics.lineStyle(2, 0x56d6ff, 0.3);
  graphics.strokeRoundedRect(model.enemyLane.left, model.enemyLane.top, width, height, 24);

  const label = scene.add.text(model.record.base.centerX, model.enemyLane.top + 28, 'ENEMY LANE', {
    color: '#7bdfff',
    fontFamily: 'monospace',
    fontSize: '20px',
  });

  label.setOrigin(0.5, 0.5);
  label.setDepth(model.enemyLane.depth);
}

function renderRecord(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): CombatSceneViewGraph['record'] {
  const recordContainer = scene.add.container(model.record.base.centerX, model.record.base.centerY);
  const base = scene.add.graphics();
  const slotViews = new Map<number, CombatSlotView>();

  recordContainer.setDepth(model.record.base.depth);
  base.fillStyle(0x16111f, 1);
  base.fillCircle(0, 0, model.record.base.radius);
  base.lineStyle(10, 0x2a1f39, 1);
  base.strokeCircle(0, 0, model.record.base.radius - 4);
  base.fillStyle(0x0b0f17, 1);
  base.fillCircle(0, 0, 92);
  recordContainer.add(base);

  for (const slot of model.record.slots) {
    const graphics = scene.add.graphics();
    const sectorPulse = scene.add.graphics();
    const zonePulse = scene.add.graphics();
    const rotatingInnerAnchor = scene.add.container(slot.innerAnchor.x, slot.innerAnchor.y);
    const uprightContainer = scene.add.container(slot.outerAnchor.x, slot.outerAnchor.y);
    const pawnGlow = scene.add.image(0, 0, COMBAT_VFX_GLOW_TEXTURE_KEY);

    rotatingInnerAnchor.setRotation(Phaser.Math.DegToRad(slot.innerLabelRotationDeg));
    pawnGlow.setTint(slot.presentation.accentColor);
    pawnGlow.setBlendMode(Phaser.BlendModes.ADD);
    pawnGlow.setAlpha(0);
    pawnGlow.setScale(
      slot.pawn === null
        ? CombatVfxConfig.SLOT.EMPTY_GLOW_SCALE
        : CombatVfxConfig.SLOT.PAWN_GLOW_SCALE,
    );
    uprightContainer.add(pawnGlow);

    graphics.fillStyle(slot.index === 0 ? 0x2f365f : 0x22263a, 0.3);
    fillSector(graphics, 0, 0, slot.outerRadius, slot.startAngleDeg, slot.endAngleDeg);
    graphics.fillStyle(0x0b1320, 0.55);
    fillSector(graphics, 0, 0, slot.innerRadius, slot.startAngleDeg, slot.endAngleDeg);
    graphics.lineStyle(2, slot.index === 0 ? 0xffd166 : 0x81a4c5, 0.9);
    strokeSector(graphics, 0, 0, slot.outerRadius, slot.startAngleDeg, slot.endAngleDeg);

    sectorPulse.fillStyle(0xc8fbff, 0.4);
    fillSector(sectorPulse, 0, 0, slot.outerRadius, slot.startAngleDeg, slot.endAngleDeg);
    sectorPulse.lineStyle(4, 0xf9ff8f, 0.95);
    strokeSector(sectorPulse, 0, 0, slot.outerRadius, slot.startAngleDeg, slot.endAngleDeg);
    sectorPulse.setAlpha(0);

    zonePulse.fillStyle(0x9be7ff, 0.5);
    fillSector(zonePulse, 0, 0, slot.innerRadius, slot.startAngleDeg, slot.endAngleDeg);
    zonePulse.setAlpha(0);

    renderSlotInnerRotatingPresentation(scene, slot, rotatingInnerAnchor);
    renderSlotUprightPresentation(scene, slot, uprightContainer);

    recordContainer.add([
      graphics,
      sectorPulse,
      zonePulse,
      rotatingInnerAnchor,
      uprightContainer,
    ]);

    const construct = slot.presentation.upright.construct;
    slotViews.set(slot.index, {
      sectorPulse,
      zonePulse,
      pawnGlow,
      uprightContainer,
      rotatingContent: rotatingInnerAnchor,
      anchorLocalX: construct?.spriteOffsetX ?? 0,
      anchorLocalY: (construct?.spriteOffsetY ?? 0) - 2,
    });
  }

  return {
    container: recordContainer,
    slotViews,
  };
}

function renderTimeControlBackplates(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): void {
  for (const backplate of [
    model.timeControls.rewindButton,
    model.timeControls.fastForwardButton,
  ]) {
    const graphics = scene.add.graphics();

    graphics.setDepth(model.timeControls.depth);
    graphics.fillStyle(0x121826, 0.75);
    graphics.fillRoundedRect(
      backplate.x - backplate.width / 2,
      backplate.y - backplate.height / 2,
      backplate.width,
      backplate.height,
      16,
    );
    graphics.lineStyle(2, 0x54708f, 0.6);
    graphics.strokeRoundedRect(
      backplate.x - backplate.width / 2,
      backplate.y - backplate.height / 2,
      backplate.width,
      backplate.height,
      16,
    );
  }

  const chronoBar = model.timeControls.chronoBar;
  const barGraphics = scene.add.graphics();

  barGraphics.setDepth(model.timeControls.depth);
  barGraphics.fillStyle(0x121826, 0.78);
  barGraphics.fillRoundedRect(
    chronoBar.x - chronoBar.width / 2,
    chronoBar.y - chronoBar.height / 2,
    chronoBar.width,
    chronoBar.height,
    chronoBar.height / 2,
  );
  barGraphics.lineStyle(2, 0x54708f, 0.55);
  barGraphics.strokeRoundedRect(
    chronoBar.x - chronoBar.width / 2,
    chronoBar.y - chronoBar.height / 2,
    chronoBar.width,
    chronoBar.height,
    chronoBar.height / 2,
  );
}

function renderBase(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): {
  root: Phaser.GameObjects.Image;
  restX: number;
  restY: number;
  vfxAnchorOffsetY: number;
} {
  const restY = model.base.y + CombatLayoutConfig.BASE_SPRITE_OFFSET_Y;
  const sprite = scene.add.image(
    model.base.x,
    restY,
    CombatLayoutConfig.BASE_SPRITE_TEXTURE_KEY,
  );

  sprite.setDepth(model.base.depth);
  sprite.setDisplaySize(
    CombatLayoutConfig.BASE_SPRITE_DISPLAY_WIDTH,
    CombatLayoutConfig.BASE_SPRITE_DISPLAY_HEIGHT,
  );
  sprite.setOrigin(0.5, 0.5);

  return {
    root: sprite,
    restX: model.base.x,
    restY,
    vfxAnchorOffsetY:
      CombatLayoutConfig.BASE_VFX_ANCHOR_OFFSET_Y - CombatLayoutConfig.BASE_SPRITE_OFFSET_Y,
  };
}

function renderNeedle(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): void {
  const graphics = scene.add.graphics();
  const markerHalfWidth = 14;
  const markerHeight = 24;

  graphics.setDepth(model.needle.depth);
  graphics.lineStyle(2, 0xffefb3, 0.8);
  graphics.fillStyle(0xffd166, 0.98);
  graphics.fillTriangle(
    model.needle.tipX,
    model.needle.tipY - 6,
    model.needle.tipX - markerHalfWidth,
    model.needle.tipY + markerHeight - 6,
    model.needle.tipX + markerHalfWidth,
    model.needle.tipY + markerHeight - 6,
  );
  graphics.strokeTriangle(
    model.needle.tipX,
    model.needle.tipY - 6,
    model.needle.tipX - markerHalfWidth,
    model.needle.tipY + markerHeight - 6,
    model.needle.tipX + markerHalfWidth,
    model.needle.tipY + markerHeight - 6,
  );
}

function renderBaseHpBar(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): CombatBaseHpBarView {
  const x = model.baseHpBar.x - model.baseHpBar.width / 2;
  const y = model.baseHpBar.y - model.baseHpBar.height / 2;
  const frame = scene.add.graphics();
  const fill = scene.add.graphics();

  frame.setDepth(model.baseHpBar.depth);
  frame.fillStyle(0x201927, 1);
  frame.fillRoundedRect(x, y, model.baseHpBar.width, model.baseHpBar.height, 10);
  fill.setDepth(model.baseHpBar.depth);

  const label = scene.add.text(model.baseHpBar.x, model.baseHpBar.y + 26, 'BASE HP 100/100', {
    color: '#bde7c7',
    fontFamily: 'monospace',
    fontSize: '16px',
  });
  label.setOrigin(0.5, 0.5);
  label.setDepth(model.baseHpBar.depth);

  return {
    fill,
    label,
    x,
    y,
    width: model.baseHpBar.width,
    height: model.baseHpBar.height,
  };
}

function renderNotePacketAnchor(
  scene: Phaser.Scene,
  model: CombatRenderModel,
): CombatNotePacketView {
  const graphics = scene.add.graphics();

  graphics.setDepth(model.notePacketAnchor.depth);
  graphics.lineStyle(3, 0xff89c6, 0.9);
  graphics.strokeCircle(model.notePacketAnchor.x, model.notePacketAnchor.y, 36);
  graphics.lineStyle(2, 0xff89c6, 0.4);
  graphics.strokeCircle(model.notePacketAnchor.x, model.notePacketAnchor.y, 54);

  return {
    anchorX: model.notePacketAnchor.x,
    anchorY: model.notePacketAnchor.y,
    depth: model.notePacketAnchor.depth,
    anchorDecor: graphics,
    glyphs: new Map(),
  };
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

function renderSlotInnerRotatingPresentation(
  scene: Phaser.Scene,
  slot: CombatRenderModel['record']['slots'][number],
  container: Phaser.GameObjects.Container,
): void {
  const ruleLabel = slot.presentation.rotating.ruleLabel;
  const emptyLabel = slot.presentation.rotating.emptyLabel;
  const fontSizePx =
    ruleLabel === null
      ? CombatVisualConfig.EMPTY_LABEL_FONT_SIZE_PX
      : CombatVisualConfig.RULE_LABEL_FONT_SIZE_PX;

  if (ruleLabel) {
    const glyphs = ruleLabel.segments.map((segment) => {
      const glyph = scene.add.text(0, 0, segment.text, {
        color: `#${segment.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'monospace',
        fontSize: `${fontSizePx}px`,
        fontStyle: segment.isNoteGlyph ? 'bold' : 'normal',
      });

      glyph.setOrigin(0, 0.5);
      return glyph;
    });
    const totalWidth = glyphs.reduce((width, glyph) => width + glyph.width, 0);
    let offsetX = -totalWidth / 2;

    for (const glyph of glyphs) {
      glyph.setPosition(offsetX, 0);
      offsetX += glyph.width;
      container.add(glyph);
    }

    return;
  }

  const text = scene.add.text(0, 0, emptyLabel?.text ?? '', {
    color: `#${(emptyLabel?.color ?? 0xffffff).toString(16).padStart(6, '0')}`,
    fontFamily: 'monospace',
    fontSize: `${fontSizePx}px`,
    align: 'center',
  });

  text.setOrigin(0.5, 0.5);
  container.add(text);
}

function renderSlotUprightPresentation(
  scene: Phaser.Scene,
  slot: CombatRenderModel['record']['slots'][number],
  container: Phaser.GameObjects.Container,
): void {
  const construct = slot.presentation.upright.construct;
  const tierStars = slot.presentation.upright.tierStars;

  if (!construct) {
    const emptyDock = scene.add.graphics();

    emptyDock.lineStyle(2, 0x4c6580, 0.6);
    emptyDock.strokeCircle(0, 0, CombatVisualConfig.SLOT.CONSTRUCT_RADIUS - 6);
    emptyDock.lineStyle(2, 0x4c6580, 0.25);
    emptyDock.strokeCircle(0, 0, CombatVisualConfig.SLOT.CONSTRUCT_RADIUS + 10);
    container.add(emptyDock);
    return;
  }

  const sprite = scene.add.image(construct.spriteOffsetX, construct.spriteOffsetY - 2, construct.spriteTextureKey, construct.spriteFrame);
  sprite.setOrigin(0.5, 0.5);
  sprite.setDisplaySize(86, 86);

  container.add(sprite);

  if (tierStars) {
    const stars = scene.add.text(0, 46, '★'.repeat(tierStars.count), {
      color: `#${tierStars.color.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
      fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
    });

    stars.setOrigin(0.5, 0.5);
    container.add(stars);
  }
}
