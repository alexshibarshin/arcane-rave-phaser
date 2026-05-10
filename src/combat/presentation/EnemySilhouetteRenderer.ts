import * as Phaser from 'phaser';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { NoteColor } from '@config/CombatContentConfig';

// ─── Simple geometric shapes (ordinary enemies & base shapes) ─────────────

export function drawCircleShape(
  g: Phaser.GameObjects.Graphics,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  g.fillCircle(0, 0, radius);
}

export function drawDiamondShape(
  g: Phaser.GameObjects.Graphics,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(0, -radius);
  g.lineTo(radius, 0);
  g.lineTo(0, radius);
  g.lineTo(-radius, 0);
  g.closePath();
  g.fillPath();
}

export function drawHexagonShape(
  g: Phaser.GameObjects.Graphics,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.closePath();
  g.fillPath();
}

export function drawDownwardTriangleShape(
  g: Phaser.GameObjects.Graphics,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(0, radius);
  g.lineTo(-radius, -radius * 0.6);
  g.lineTo(radius, -radius * 0.6);
  g.closePath();
  g.fillPath();
}

// ─── Shape dispatch ───────────────────────────────────────────────────────

export function getShapeRadiusForArchetype(archetype: string, baseRadius: number): number {
  switch (archetype) {
    case 'swarm':
      return baseRadius * 0.6;
    case 'tank':
      return baseRadius * 1.2;
    default:
      return baseRadius;
  }
}

export function drawOrdinaryEnemyShape(
  g: Phaser.GameObjects.Graphics,
  archetype: string,
  radius: number,
  color: number,
): void {
  switch (archetype) {
    case 'basic':
      drawCircleShape(g, radius, color);
      break;
    case 'fast':
      drawDiamondShape(g, radius, color);
      break;
    case 'tank':
      drawHexagonShape(g, radius, color);
      break;
    case 'swarm':
      drawDownwardTriangleShape(g, radius, color);
      break;
    default:
      drawCircleShape(g, radius, color);
      break;
  }
}

// ─── Special enemy glow ──────────────────────────────────────────────────

export function getGlowColor(
  color: NoteColor,
  archetype: 'elite' | 'boss',
): number {
  return CombatVisualConfig.ENEMY.GLOW_COLORS[archetype][color];
}

export function getGlowAlpha(archetype: 'elite' | 'boss'): number {
  return CombatVisualConfig.ENEMY.GLOW_ALPHA[archetype];
}

export function drawSpecialEnemyGlow(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number,
  glowColor: number,
  baseAlpha: number,
): void {
  // Multi-layered concentric approach for soft glow
  // Inner: 1.15× radius, alpha 0.5
  g.fillStyle(glowColor, baseAlpha * 0.5);
  g.fillCircle(centerX, centerY, radius * 1.15);

  // Mid: 1.3× radius, alpha 0.25
  g.fillStyle(glowColor, baseAlpha * 0.25);
  g.fillCircle(centerX, centerY, radius * 1.3);

  // Outer: 1.5× radius, alpha 0.1
  g.fillStyle(glowColor, baseAlpha * 0.1);
  g.fillCircle(centerX, centerY, radius * 1.5);
}

// ─── Silhouette motif drawing ────────────────────────────────────────────

export function drawSilhouetteMotif(
  g: Phaser.GameObjects.Graphics,
  motif: string,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  switch (motif) {
    case 'chevron-armor':
      drawChevronArmorMotif(g, centerX, centerY, baseRadius, color);
      break;
    case 'satellite-motes':
      drawSatelliteMotesMotif(g, centerX, centerY, baseRadius, color);
      break;
    case 'motion-trails':
      drawMotionTrailsMotif(g, centerX, centerY, baseRadius, color);
      break;
    case 'crown-ring':
      drawCrownRingMotif(g, centerX, centerY, baseRadius, color);
      break;
    case 'ring-wave':
      drawRingWaveMotif(g, centerX, centerY, baseRadius, color);
      break;
    case 'geometric-petals':
      drawGeometricPetalsMotif(g, centerX, centerY, baseRadius, color);
      break;
    default:
      break;
  }
}

// ─── Motif Implementations ───────────────────────────────────────────────

/**
 * Iron Kick (elite tank): Hexagon core + four outward-pointing chevrons
 * in cardinal directions.
 */
function drawChevronArmorMotif(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  // Core hexagon
  drawHexagonShapeAt(g, centerX, centerY, baseRadius, color);

  const chevronOffset = baseRadius + 10;
  const chevronSize = baseRadius * 0.35;
  const lineWidth = Math.max(2, Math.round(baseRadius * 0.08));

  g.lineStyle(lineWidth, color, 0.85);

  // Chevrons at 0°, 90°, 180°, 270°
  const directions = [
    { dx: 1, dy: 0 },   // right
    { dx: 0, dy: -1 },  // up
    { dx: -1, dy: 0 },  // left
    { dx: 0, dy: 1 },   // down
  ];

  for (const dir of directions) {
    const tipX = centerX + dir.dx * chevronOffset;
    const tipY = centerY + dir.dy * chevronOffset;
    const baseCX = centerX + dir.dx * (chevronOffset - chevronSize);
    const baseCY = centerY + dir.dy * (chevronOffset - chevronSize);

    if (dir.dx !== 0) {
      // Horizontal chevron: V pointing in dx direction
      g.beginPath();
      g.moveTo(tipX, tipY - chevronSize * 0.6);
      g.lineTo(tipX, tipY);
      g.lineTo(baseCX, baseCY - chevronSize * 0.6);
      g.strokePath();

      g.beginPath();
      g.moveTo(tipX, tipY + chevronSize * 0.6);
      g.lineTo(tipX, tipY);
      g.lineTo(baseCX, baseCY + chevronSize * 0.6);
      g.strokePath();
    } else {
      // Vertical chevron: V pointing in dy direction
      g.beginPath();
      g.moveTo(tipX - chevronSize * 0.6, tipY);
      g.lineTo(tipX, tipY);
      g.lineTo(baseCX - chevronSize * 0.6, baseCY);
      g.strokePath();

      g.beginPath();
      g.moveTo(tipX + chevronSize * 0.6, tipY);
      g.lineTo(tipX, tipY);
      g.lineTo(baseCX + chevronSize * 0.6, baseCY);
      g.strokePath();
    }
  }
}

/**
 * Static Choir (elite swarm): Triangle cluster core + orbiting smaller triangles.
 */
function drawSatelliteMotesMotif(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  // Triangle cluster core: 3 small triangles in a group
  const smallTriRadius = baseRadius * 0.35;
  const clusterOffset = baseRadius * 0.3;
  const clusterCenters = [
    { x: 0, y: -clusterOffset },
    { x: -clusterOffset * 0.87, y: clusterOffset * 0.5 },
    { x: clusterOffset * 0.87, y: clusterOffset * 0.5 },
  ];

  for (const c of clusterCenters) {
    drawTriangleAt(g, centerX + c.x, centerY + c.y, smallTriRadius, color);
  }

  // Orbiting motes: 6 tiny triangles at radius 55px (scaled by baseRadius ratio)
  const orbitRadius = baseRadius * 1.4;
  const moteCount = 6;
  const moteRadius = baseRadius * 0.18;

  for (let i = 0; i < moteCount; i++) {
    const angle = (Math.PI * 2 / moteCount) * i - Math.PI / 2;
    const mx = centerX + Math.cos(angle) * orbitRadius;
    const my = centerY + Math.sin(angle) * orbitRadius;
    drawTriangleAt(g, mx, my, moteRadius, color);
  }
}

/**
 * Backstage Blur (elite fast): Diamond core + horizontal motion trails.
 */
function drawMotionTrailsMotif(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  // Diamond core
  drawDiamondAt(g, centerX, centerY, baseRadius, color);

  // Motion trails: 3 horizontal streak lines behind the diamond
  const trailLineWidth = Math.max(1, Math.round(baseRadius * 0.06));

  for (let i = 0; i < 3; i++) {
    const offsetX = -(baseRadius + 15 + i * 15);
    const trailAlpha = 0.8 - i * 0.25;
    g.lineStyle(trailLineWidth, color, trailAlpha);
    g.beginPath();
    g.moveTo(centerX + offsetX, centerY);
    g.lineTo(centerX + offsetX + baseRadius * 0.7, centerY);
    g.strokePath();
  }
}

/**
 * Redline Headliner (boss): Large hexagon core + concentric ring + crown.
 */
function drawCrownRingMotif(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  // Large hexagon core
  drawHexagonShapeAt(g, centerX, centerY, baseRadius, color);

  // Concentric hexagon ring (stroke only)
  const ringRadius = baseRadius * 1.2;
  g.lineStyle(2, color, 0.45);
  drawHexagonOutlineAt(g, centerX, centerY, ringRadius);

  // Crown: 3 small triangles at top (12 o'clock)
  const crownBaseY = centerY - baseRadius - 10;
  const crownTriRadius = baseRadius * 0.22;
  const crownSpacing = crownTriRadius * 1.8;

  g.fillStyle(color, 0.9);
  drawTriangleAt(g, centerX, crownBaseY - crownTriRadius * 0.7, crownTriRadius, color);
  drawTriangleAt(g, centerX - crownSpacing, crownBaseY, crownTriRadius, color);
  drawTriangleAt(g, centerX + crownSpacing, crownBaseY, crownTriRadius, color);
}

/**
 * Blue Noise Monarch (boss): Large triangle-cluster core + concentric rings + orbiting motes.
 */
function drawRingWaveMotif(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  // Triangle cluster core
  const triRadius = baseRadius * 0.45;
  const triClusterOffset = baseRadius * 0.3;
  const clusterCenters = [
    { x: 0, y: -triClusterOffset },
    { x: -triClusterOffset * 0.87, y: triClusterOffset * 0.5 },
    { x: triClusterOffset * 0.87, y: triClusterOffset * 0.5 },
  ];

  for (const c of clusterCenters) {
    drawTriangleAt(g, centerX + c.x, centerY + c.y, triRadius, color);
  }

  // Concentric circle rings
  const ringRadii = [baseRadius * 1.25, baseRadius * 1.5];
  const ringAlphas = [0.4, 0.2];

  for (let i = 0; i < ringRadii.length; i++) {
    g.lineStyle(2, color, ringAlphas[i]!);
    g.strokeCircle(centerX, centerY, ringRadii[i]!);
  }

  // 6 orbiting motes (small circles)
  const moteRadius = baseRadius * 1.17;
  const moteCount = 6;
  const moteSize = baseRadius * 0.1;

  g.fillStyle(color, 0.7);
  for (let i = 0; i < moteCount; i++) {
    const angle = (Math.PI * 2 / moteCount) * i - Math.PI / 2;
    const mx = centerX + Math.cos(angle) * moteRadius;
    const my = centerY + Math.sin(angle) * moteRadius;
    g.fillCircle(mx, my, moteSize);
  }
}

/**
 * Verdant Encore (boss): Large diamond core + 6 radiating petals (ellipses).
 */
function drawGeometricPetalsMotif(
  g: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void {
  // Large diamond core
  drawDiamondAt(g, centerX, centerY, baseRadius, color);

  // 6 petals radiating outward
  const petalLength = baseRadius * 0.85;
  const petalWidth = baseRadius * 0.3;
  const petalOffset = baseRadius * 0.6;

  g.fillStyle(color, 0.75);
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
    const px = centerX + Math.cos(angle) * petalOffset;
    const py = centerY + Math.sin(angle) * petalOffset;

    // Draw elongated ellipse rotated to match radial direction
    // Using strokeEllipse is simpler; fillEllipse with rotation isn't directly
    // available, so we draw with lineStyle and approximate as filled rotated rect
    g.save?.();
    // Simulate rotated ellipse as a rotated rounded rect
    g.fillStyle(color, 0.75);
    g.fillRoundedRect(
      px - petalWidth / 2,
      py - petalLength / 2,
      petalWidth,
      petalLength,
      petalWidth / 2,
    );
    g.restore?.();
  }
}

// ─── Helper drawing functions (with center position) ─────────────────────

function drawTriangleAt(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 0.85);
  g.beginPath();
  g.moveTo(cx, cy - radius);
  g.lineTo(cx - radius * 0.87, cy + radius * 0.5);
  g.lineTo(cx + radius * 0.87, cy + radius * 0.5);
  g.closePath();
  g.fillPath();
}

function drawDiamondAt(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(cx, cy - radius);
  g.lineTo(cx + radius, cy);
  g.lineTo(cx, cy + radius);
  g.lineTo(cx - radius, cy);
  g.closePath();
  g.fillPath();
}

function drawHexagonShapeAt(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  color: number,
): void {
  g.fillStyle(color, 1);
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.closePath();
  g.fillPath();
}

function drawHexagonOutlineAt(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
): void {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i]!.x, points[i]!.y);
  }
  g.closePath();
  g.strokePath();
}
