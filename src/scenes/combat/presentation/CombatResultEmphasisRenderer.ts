import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

export class CombatResultEmphasisRenderer {
  private wash: Phaser.GameObjects.Rectangle | undefined;

  sync(
    scene: Phaser.Scene,
    viewGraph: CombatSceneViewGraph,
    vfxSnapshot: CombatVfxSnapshot,
  ): void {
    const emphasis = vfxSnapshot.resultEmphasis;

    if (!emphasis) {
      this.wash?.setVisible(false);
      return;
    }

    if (!this.wash) {
      this.wash = scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2,
        scene.scale.width,
        scene.scale.height,
        0xffffff,
        0,
      );
      this.wash.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.5);
      viewGraph.effects.transientLayer.add(this.wash);
    }

    this.wash.setVisible(true);
    this.wash.setFillStyle(
      emphasis.outcome === 'victory'
        ? CombatVfxConfig.RESULT.VICTORY_TINT
        : CombatVfxConfig.RESULT.DEFEAT_TINT,
      emphasis.alpha * 0.16,
    );
    this.wash.setScale(emphasis.scale);
  }

  destroy(): void {
    this.wash?.destroy();
    this.wash = undefined;
  }
}
