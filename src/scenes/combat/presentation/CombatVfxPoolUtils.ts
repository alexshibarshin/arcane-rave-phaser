import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

export function acquirePooledImage(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  pool: Phaser.GameObjects.Image[],
  textureKey: string,
): Phaser.GameObjects.Image {
  const image = pool.pop() ?? scene.add.image(0, 0, textureKey);

  image.setTexture(textureKey);
  image.setOrigin(0.5, 0.5);
  image.setVisible(true);
  viewGraph.effects.transientLayer.add(image);
  return image;
}

export function reclaimImageViews(
  activeViews: Map<string, Phaser.GameObjects.Image>,
  pool: Phaser.GameObjects.Image[],
  activeIds: Set<string>,
): void {
  for (const [id, view] of activeViews.entries()) {
    if (activeIds.has(id)) {
      continue;
    }

    view.setVisible(false);
    activeViews.delete(id);
    pool.push(view);
  }
}

export function clearPooledImageMaps(
  activeViews: Map<string, Phaser.GameObjects.Image>,
  pool: Phaser.GameObjects.Image[],
): void {
  for (const view of activeViews.values()) {
    view.destroy();
  }

  for (const view of pool) {
    view.destroy();
  }

  activeViews.clear();
  pool.length = 0;
}

export function reclaimGraphicsViews(
  activeViews: Map<string, Phaser.GameObjects.Graphics>,
  activeIds: Set<string>,
): void {
  for (const [id, view] of activeViews.entries()) {
    if (activeIds.has(id)) {
      continue;
    }

    view.destroy();
    activeViews.delete(id);
  }
}

export function clearGraphicsMap(
  activeViews: Map<string, Phaser.GameObjects.Graphics>,
): void {
  for (const view of activeViews.values()) {
    view.destroy();
  }
  activeViews.clear();
}
