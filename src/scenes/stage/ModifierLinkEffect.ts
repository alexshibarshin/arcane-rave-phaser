import type Phaser from 'phaser';

const LINK_COLOR = 0x44ff88;
const LINK_ALPHA = 0.7;
const LINK_DURATION_MS = 700;

export function showCompatibilityLink(
  scene: Phaser.Scene,
  iconContainer: Phaser.GameObjects.Container,
  pawnContainer: Phaser.GameObjects.Container,
): void {
  const from = iconContainer.getWorldTransformMatrix();
  const to = pawnContainer.getWorldTransformMatrix();
  const graphics = scene.add.graphics();

  graphics.lineStyle(3, LINK_COLOR, LINK_ALPHA);
  graphics.lineBetween(from.tx, from.ty, to.tx, to.ty);

  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    duration: LINK_DURATION_MS,
    ease: 'Cubic.Out',
    onComplete: () => graphics.destroy(),
  });

  scene.tweens.add({
    targets: [iconContainer, pawnContainer],
    scaleX: 1.08,
    scaleY: 1.08,
    yoyo: true,
    duration: Math.round(LINK_DURATION_MS / 2),
    ease: 'Sine.Out',
  });
}
