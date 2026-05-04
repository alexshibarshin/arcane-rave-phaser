import * as Phaser from 'phaser';

// ─── Body primitives ────────────────────────────────────────────────────────

/**
 * Draw a rounded rectangle centered at origin.
 */
export function drawRectangle(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  radius: number = 0,
): void {
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
}

/**
 * Draw a trapezoid (wider at top, narrower at bottom) centered at origin.
 */
export function drawTrapezoid(
  g: Phaser.GameObjects.Graphics,
  topWidth: number,
  bottomWidth: number,
  height: number,
  cornerRadius: number = 0,
): void {
  const yTop = -height / 2;
  const yBottom = height / 2;

  g.beginPath();
  g.moveTo(-topWidth / 2, yTop);
  g.lineTo(topWidth / 2, yTop);
  g.lineTo(bottomWidth / 2, yBottom);
  g.lineTo(-bottomWidth / 2, yBottom);
  g.closePath();
  g.fillPath();
}

/**
 * Draw a wide rounded rectangle centered at origin.
 * Intended for tank armor — same shape as drawRectangle, wider proportions.
 */
export function drawWideRectangle(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  radius: number = 0,
): void {
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
}

/**
 * Draw a filled ellipse centered at origin.
 * For fast body.
 */
export function drawOval(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
): void {
  g.fillEllipse(0, 0, width, height);
}

/**
 * Draw a V-shape (two diagonal lines) centered at origin.
 * For fast stabilizers.
 */
export function drawVShape(
  g: Phaser.GameObjects.Graphics,
  width: number,
  depth: number,
): void {
  const halfW = width / 2;
  g.strokeLineShape(new Phaser.Geom.Line(-halfW, -depth, 0, depth));
  g.strokeLineShape(new Phaser.Geom.Line(0, depth, halfW, -depth));
}

/**
 * Draw a regular hexagon centered at origin.
 * For ranged body.
 */
export function drawHexagon(
  g: Phaser.GameObjects.Graphics,
  radius: number,
): void {
  const points: Phaser.Math.Vector2[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(
      new Phaser.Math.Vector2(radius * Math.cos(angle), radius * Math.sin(angle)),
    );
  }

  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    g.lineTo(p.x, p.y);
  }
  g.closePath();
  g.fillPath();
}

/**
 * Draw a thin rounded rectangle centered at origin.
 * For ranged antenna.
 */
export function drawThinRectangle(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  radius: number = 0,
): void {
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
}

/**
 * Draw a capsule (pill shape) centered at origin.
 * For swarm body.
 */
export function drawCapsule(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
): void {
  g.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
}

/**
 * Draw a short rounded rectangle centered at origin.
 * For swarm legs.
 */
export function drawShortLeg(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
): void {
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 2);
}

/**
 * Draw a crown shape centered at origin.
 * Polygon with crown-like points on top.
 */
export function drawCrown(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  points: number = 5,
): void {
  const halfW = width / 2;
  const halfH = height / 2;
  const pointH = height / (points / 2 + 1);

  g.beginPath();

  // Bottom-left
  g.moveTo(-halfW, halfH);

  // Left side going up
  g.lineTo(-halfW, halfH - pointH);

  // Crown points
  const step = width / (points - 1);
  for (let i = 0; i < points; i++) {
    const x = -halfW + i * step;
    const y = halfH - pointH - i * pointH;
    g.lineTo(x, y);
  }

  // Right side going down
  g.lineTo(halfW, halfH - pointH);
  g.lineTo(halfW, halfH);

  g.closePath();
  g.fillPath();
}

// ─── Head primitives ────────────────────────────────────────────────────────

/**
 * Draw a triangle head pointing up.
 * For basic and boss archetypes.
 */
export function drawHeadBasic(
  g: Phaser.GameObjects.Graphics,
  size: number,
): void {
  const half = size / 2;
  g.beginPath();
  g.moveTo(0, -half);
  g.lineTo(half, half);
  g.lineTo(-half, half);
  g.closePath();
  g.fillPath();
}

/**
 * Draw a square head.
 * For tank archetype.
 */
export function drawHeadTank(
  g: Phaser.GameObjects.Graphics,
  size: number,
): void {
  const half = size / 2;
  g.fillRect(-half, -half, size, size);
}

/**
 * Draw an oval head (taller than wide).
 * For fast archetype.
 */
export function drawHeadFast(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
): void {
  g.fillEllipse(0, 0, width, height);
}

/**
 * Draw a semicircle head (top half of a circle).
 * For ranged archetype.
 */
export function drawHeadRanged(
  g: Phaser.GameObjects.Graphics,
  radius: number,
): void {
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(radius, 0);
  g.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  g.closePath();
  g.fillPath();
}

/**
 * Draw a diamond head (rotated square).
 * For swarm archetype.
 */
export function drawHeadSwarm(
  g: Phaser.GameObjects.Graphics,
  size: number,
): void {
  const half = size / 2;
  g.beginPath();
  g.moveTo(0, -half);
  g.lineTo(half, 0);
  g.lineTo(0, half);
  g.lineTo(-half, 0);
  g.closePath();
  g.fillPath();
}

/**
 * Draw a boss head: triangle + two small horn triangles.
 * For boss archetype.
 */
export function drawHeadBoss(
  g: Phaser.GameObjects.Graphics,
  size: number,
): void {
  const half = size / 2;
  const hornSize = size / 5;

  // Main triangle
  g.beginPath();
  g.moveTo(0, -half);
  g.lineTo(half, half * 0.6);
  g.lineTo(-half, half * 0.6);
  g.closePath();
  g.fillPath();

  // Left horn
  g.beginPath();
  g.moveTo(-half * 0.5, -half * 0.3);
  g.lineTo(-half - hornSize * 0.5, -half - hornSize);
  g.lineTo(-half * 0.2, -half * 0.5);
  g.closePath();
  g.fillPath();

  // Right horn
  g.beginPath();
  g.moveTo(half * 0.5, -half * 0.3);
  g.lineTo(half + hornSize * 0.5, -half - hornSize);
  g.lineTo(half * 0.2, -half * 0.5);
  g.closePath();
  g.fillPath();
}
