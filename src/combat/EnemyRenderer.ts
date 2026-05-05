import * as Phaser from 'phaser';
import {
  drawWideRectangle,
  drawOval,
  drawHexagon,
  drawCapsule,
} from './EnemyShapePrimitives';

// ─── Archetype render functions ─────────────────────────────────────────────

/**
 * Draw a basic enemy: rectangle torso + shoulder trapezoid + triangle head.
 * This replaces the old stick-figure silhouette from the pre-overhaul visual.
 */
export function renderBasicEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const bodyHalfWidth = bodyWidth / 2;
  const bodyHalfHeight = bodyHeight / 2;
  const mutedOutlineAlpha = 0.35;
  const torsoWidth = bodyWidth * 0.68;
  const torsoHeight = bodyHeight * 0.52;
  const torsoY = bodyHeight * 0.1;
  const shoulderTopWidth = bodyWidth;
  const shoulderBottomWidth = bodyWidth * 0.74;
  const shoulderHeight = bodyHeight * 0.3;
  const shoulderTopY = -bodyHalfHeight + bodyHeight * 0.22;
  const headSize = bodyWidth * 0.42;
  const headCenterY = shoulderTopY - headSize * 0.55;
  const eyeRadius = Math.max(2, bodyWidth * 0.045);
  const eyeOffsetX = headSize * 0.16;
  const eyeOffsetY = headSize * 0.1;

  // Torso — accent-filled primitive.
  g.fillStyle(color, 1.0);
  g.fillRect(-torsoWidth / 2, torsoY - torsoHeight / 2, torsoWidth, torsoHeight);
  g.lineStyle(3, color, mutedOutlineAlpha);
  g.strokeRect(-torsoWidth / 2, torsoY - torsoHeight / 2, torsoWidth, torsoHeight);

  // Shoulders — trapezoid outline only.
  g.beginPath();
  g.moveTo(-shoulderTopWidth / 2, shoulderTopY);
  g.lineTo(shoulderTopWidth / 2, shoulderTopY);
  g.lineTo(shoulderBottomWidth / 2, shoulderTopY + shoulderHeight);
  g.lineTo(-shoulderBottomWidth / 2, shoulderTopY + shoulderHeight);
  g.closePath();
  g.strokePath();

  // Head — triangle outline, no fill.
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.beginPath();
  g.moveTo(0, headCenterY - headSize / 2);
  g.lineTo(headSize / 2, headCenterY + headSize / 2);
  g.lineTo(-headSize / 2, headCenterY + headSize / 2);
  g.closePath();
  g.strokePath();

  // Eyes — white dots
  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-eyeOffsetX, headCenterY + eyeOffsetY, eyeRadius);
  g.fillCircle(eyeOffsetX, headCenterY + eyeOffsetY, eyeRadius);
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
 * Draw a boss enemy: same silhouette family as basic with crown and horned head.
 */
export function renderBossEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  const mutedOutlineAlpha = 0.35;
  const torsoWidth = bodyWidth * 0.68;
  const torsoHeight = bodyHeight * 0.52;
  const torsoY = bodyHeight * 0.1;
  const shoulderTopWidth = bodyWidth;
  const shoulderBottomWidth = bodyWidth * 0.74;
  const shoulderHeight = bodyHeight * 0.3;
  const shoulderTopY = -bodyHeight / 2 + bodyHeight * 0.22;
  const headSize = bodyWidth * 0.42;
  const headCenterY = shoulderTopY - headSize * 0.48;
  const hornWidth = headSize * 0.24;
  const hornHeight = headSize * 0.22;
  const crownWidth = bodyWidth * 0.52;
  const crownHeight = bodyHeight * 0.14;
  const crownBaseY = headCenterY - headSize * 0.86;
  const eyeRadius = Math.max(2, bodyWidth * 0.04);
  const eyeOffsetX = headSize * 0.16;
  const eyeOffsetY = headSize * 0.08;

  g.fillStyle(color, 1.0);
  g.fillRect(-torsoWidth / 2, torsoY - torsoHeight / 2, torsoWidth, torsoHeight);
  g.lineStyle(3, color, mutedOutlineAlpha);
  g.strokeRect(-torsoWidth / 2, torsoY - torsoHeight / 2, torsoWidth, torsoHeight);

  g.beginPath();
  g.moveTo(-shoulderTopWidth / 2, shoulderTopY);
  g.lineTo(shoulderTopWidth / 2, shoulderTopY);
  g.lineTo(shoulderBottomWidth / 2, shoulderTopY + shoulderHeight);
  g.lineTo(-shoulderBottomWidth / 2, shoulderTopY + shoulderHeight);
  g.closePath();
  g.strokePath();

  // Crown — outline accessory above the head.
  g.beginPath();
  g.moveTo(-crownWidth / 2, crownBaseY + crownHeight);
  g.lineTo(-crownWidth / 2, crownBaseY + crownHeight * 0.35);
  g.lineTo(-crownWidth * 0.22, crownBaseY - crownHeight * 0.25);
  g.lineTo(0, crownBaseY + crownHeight * 0.15);
  g.lineTo(crownWidth * 0.22, crownBaseY - crownHeight * 0.25);
  g.lineTo(crownWidth / 2, crownBaseY + crownHeight * 0.35);
  g.lineTo(crownWidth / 2, crownBaseY + crownHeight);
  g.closePath();
  g.strokePath();

  // Horned triangle head — outline only.
  g.lineStyle(3, 0xe8fbff, 0.8);
  g.beginPath();
  g.moveTo(0, headCenterY - headSize / 2);
  g.lineTo(headSize / 2, headCenterY + headSize / 2);
  g.lineTo(-headSize / 2, headCenterY + headSize / 2);
  g.closePath();
  g.strokePath();

  g.beginPath();
  g.moveTo(-headSize * 0.24, headCenterY - headSize * 0.22);
  g.lineTo(-headSize * 0.44, headCenterY - headSize * 0.52 - hornHeight);
  g.lineTo(-headSize * 0.08, headCenterY - headSize * 0.42);
  g.closePath();
  g.strokePath();

  g.beginPath();
  g.moveTo(headSize * 0.24, headCenterY - headSize * 0.22);
  g.lineTo(headSize * 0.44, headCenterY - headSize * 0.52 - hornHeight);
  g.lineTo(headSize * 0.08, headCenterY - headSize * 0.42);
  g.closePath();
  g.strokePath();

  g.fillStyle(0xe8fbff, 0.95);
  g.fillCircle(-eyeOffsetX, headCenterY + eyeOffsetY, eyeRadius);
  g.fillCircle(eyeOffsetX, headCenterY + eyeOffsetY, eyeRadius);
}
