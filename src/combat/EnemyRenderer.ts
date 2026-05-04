import * as Phaser from 'phaser';
import {
  drawRectangle,
  drawTrapezoid,
  drawWideRectangle,
  drawOval,
  drawVShape,
  drawHexagon,
  drawThinRectangle,
  drawCapsule,
  drawShortLeg,
  drawCrown,
  drawHeadBasic,
  drawHeadTank,
  drawHeadFast,
  drawHeadRanged,
  drawHeadSwarm,
  drawHeadBoss,
} from './EnemyShapePrimitives';

// ─── Archetype render functions ─────────────────────────────────────────────

/**
 * Draw a basic enemy: rounded-rect torso, circle head, line limbs, dot eyes.
 */
export function renderBasicEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const bodyHalfWidth = bodyWidth / 2;
  const bodyHalfHeight = bodyHeight / 2;

  // Torso — rounded rectangle (first primitive: fill + outline in accent color)
  g.fillStyle(color, 1.0);
  g.lineStyle(3, color, 0.35);
  g.fillRoundedRect(
    -bodyHalfWidth,
    -bodyHalfHeight + 12,
    bodyWidth,
    bodyHeight - 20,
    22,
  );
  g.strokeRoundedRect(
    -bodyHalfWidth,
    -bodyHalfHeight + 12,
    bodyWidth,
    bodyHeight - 20,
    22,
  );

  // Head — circle (white/grey outline, no fill)
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.strokeCircle(0, -bodyHalfHeight + 10, 26);

  // Arms — diagonal lines (white/grey)
  g.lineStyle(3, 0xe8fbff, 0.6);
  g.strokeLineShape(new Phaser.Geom.Line(-18, 8, -34, 28));
  g.strokeLineShape(new Phaser.Geom.Line(18, 8, 34, 28));

  // Legs — diagonal lines (white/grey)
  g.strokeLineShape(new Phaser.Geom.Line(-14, 28, -24, 54));
  g.strokeLineShape(new Phaser.Geom.Line(14, 28, 24, 54));

  // Eyes — white dots
  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-10, -bodyHalfHeight + 8, 4);
  g.fillCircle(10, -bodyHalfHeight + 8, 4);
}

/**
 * Draw a tank enemy: wide armor rectangle, two short legs, square head.
 * Wide, heavy appearance.
 */
export function renderTankEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const bodyHalfWidth = bodyWidth / 2;
  const bodyHalfHeight = bodyHeight / 2;

  // Armor — wide rectangle (first primitive: fill + outline in accent color)
  g.fillStyle(color, 1.0);
  g.lineStyle(3, color, 0.35);
  drawWideRectangle(g, bodyWidth, bodyHeight * 0.6, 4);

  // Legs — two short rectangles at bottom, spaced apart (outline only in accent color)
  const legWidth = bodyWidth * 0.15;
  const legHeight = bodyHeight * 0.35;
  const legSpacing = bodyWidth * 0.25;
  const legY = bodyHalfHeight - legHeight / 2;

  g.lineStyle(3, color, 0.35);
  g.strokeRoundedRect(-legSpacing - legWidth / 2, legY, legWidth, legHeight, 2);
  g.strokeRoundedRect(legSpacing - legWidth / 2, legY, legWidth, legHeight, 2);

  // Head — square (white/grey outline, no fill)
  const headSize = bodyWidth * 0.45;
  const headY = -bodyHalfHeight + bodyHeight * 0.3 + headSize / 2;
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.strokeRect(-headSize / 2, headY - headSize / 2, headSize, headSize);

  // Eyes — white dots
  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-headSize * 0.18, headY, 3);
  g.fillCircle(headSize * 0.18, headY, 3);
}

/**
 * Draw a fast enemy: oval body, V-shape stabilizers, elongated oval head.
 * Narrow, aerodynamic appearance.
 */
export function renderFastEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const bodyHalfWidth = bodyWidth / 2;
  const bodyHalfHeight = bodyHeight / 2;

  // Body — oval in center (first primitive: fill + outline in accent color)
  g.fillStyle(color, 1.0);
  g.lineStyle(3, color, 0.35);
  drawOval(g, bodyWidth, bodyHeight * 0.7);

  // Stabilizers — V-shape at bottom (outline only in accent color)
  const vWidth = bodyWidth * 0.4;
  const vDepth = bodyHeight * 0.2;
  g.lineStyle(3, color, 0.35);
  const stabilizerY = bodyHeight * 0.15;
  g.strokeLineShape(new Phaser.Geom.Line(-vWidth / 2, stabilizerY - vDepth, 0, stabilizerY + vDepth));
  g.strokeLineShape(new Phaser.Geom.Line(0, stabilizerY + vDepth, vWidth / 2, stabilizerY - vDepth));

  // Head — elongated oval (white/grey outline, no fill)
  const headWidth = bodyWidth * 0.5;
  const headHeight = bodyHeight * 0.35;
  const headY = -bodyHalfHeight + bodyHeight * 0.25;
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.strokeEllipse(0, headY, headWidth, headHeight);

  // Eyes — white dots
  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-headWidth * 0.2, headY, 3);
  g.fillCircle(headWidth * 0.2, headY, 3);
}

/**
 * Draw a ranged enemy: hexagon body, thin-rectangle antenna, semicircle head.
 * Geometric appearance with antenna on top.
 */
export function renderRangedEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const bodyHalfWidth = bodyWidth / 2;
  const bodyHalfHeight = bodyHeight / 2;

  // Body — hexagon centered (first primitive: fill + outline in accent color)
  const hexRadius = bodyWidth * 0.45;
  g.fillStyle(color, 1.0);
  g.lineStyle(3, color, 0.35);
  drawHexagon(g, hexRadius);

  // Antenna — thin rectangle on top (outline only in accent color)
  const antennaWidth = bodyWidth * 0.1;
  const antennaHeight = bodyHeight * 0.25;
  const antennaY = -bodyHalfHeight + bodyHeight * 0.15 - antennaHeight / 2;
  g.lineStyle(3, color, 0.35);
  g.strokeRoundedRect(-antennaWidth / 2, antennaY, antennaWidth, antennaHeight, 2);

  // Head — semicircle (white/grey outline, no fill)
  const headRadius = bodyWidth * 0.25;
  const headY = -bodyHalfHeight + bodyHeight * 0.4;
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.beginPath();
  g.moveTo(-headRadius, headY);
  g.lineTo(headRadius, headY);
  g.arc(0, headY, headRadius, 0, Math.PI, false);
  g.closePath();
  g.strokePath();

  // Eyes — white dots
  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-headRadius * 0.3, headY - headRadius * 0.15, 3);
  g.fillCircle(headRadius * 0.3, headY - headRadius * 0.15, 3);
}

/**
 * Draw a swarm enemy: capsule body, two short legs, diamond head.
 * Small, rounded, cute appearance.
 */
export function renderSwarmEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const bodyHalfWidth = bodyWidth / 2;
  const bodyHalfHeight = bodyHeight / 2;

  // Body — capsule centered (first primitive: fill + outline in accent color)
  g.fillStyle(color, 1.0);
  g.lineStyle(3, color, 0.35);
  drawCapsule(g, bodyWidth * 0.8, bodyHeight * 0.7);

  // Legs — two short rounded rectangles at bottom (outline only in accent color)
  const legWidth = bodyWidth * 0.12;
  const legHeight = bodyHeight * 0.25;
  const legSpacing = bodyWidth * 0.2;
  const legY = bodyHalfHeight - legHeight / 2;

  g.lineStyle(3, color, 0.35);
  g.strokeRoundedRect(-legSpacing - legWidth / 2, legY, legWidth, legHeight, 2);
  g.strokeRoundedRect(legSpacing - legWidth / 2, legY, legWidth, legHeight, 2);

  // Head — diamond (white/grey outline, no fill)
  const headSize = bodyWidth * 0.35;
  const headY = -bodyHalfHeight + bodyHeight * 0.3;
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.beginPath();
  g.moveTo(0, headY - headSize / 2);
  g.lineTo(headSize / 2, headY);
  g.lineTo(0, headY + headSize / 2);
  g.lineTo(-headSize / 2, headY);
  g.closePath();
  g.strokePath();

  // Eyes — white dots
  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-headSize * 0.2, headY, 3);
  g.fillCircle(headSize * 0.2, headY, 3);
}

/**
 * Draw a boss enemy: same as basic but with crown on top of the head.
 * The boss scale (2.5×) is applied by the render model's body dimensions.
 */
export function renderBossEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  renderBasicEnemy(g, bodyWidth, bodyHeight, color);

  // Crown — on top of the head (outline only in accent color)
  const crownWidth = bodyWidth * 0.5;
  const crownHeight = bodyHeight * 0.15;
  const crownY = -bodyHeight / 2 + 12 - crownHeight / 2 - 8;

  g.lineStyle(3, color, 0.35);
  drawCrown(g, crownWidth, crownHeight, 5);
}
