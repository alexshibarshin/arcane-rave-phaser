import Phaser from 'phaser';
import { StagePresentationConfig } from '@config/StagePresentationConfig';

export class StageFlowAnimator {
  private returnTimer?: Phaser.Time.TimerEvent;
  private readonly previewCardBaseY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly recordContainer: Phaser.GameObjects.Container,
    private readonly shopContainer: Phaser.GameObjects.Container,
    private readonly previewCard: Phaser.GameObjects.Container,
  ) {
    this.previewCardBaseY =
      StagePresentationConfig.PREVIEW_CARD_Y - StagePresentationConfig.PREVIEW_CARD_HEIGHT / 2;
  }

  playCombatOutro(onComplete: () => void): void {
    this.scene.tweens.killTweensOf(this.recordContainer);
    this.scene.tweens.killTweensOf(this.shopContainer);
    this.scene.tweens.killTweensOf(this.previewCard);
    this.scene.tweens.killTweensOf(this.scene.cameras.main);

    this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom: 0.96,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this.recordContainer,
      y: StagePresentationConfig.BUILD_RECORD_CENTER_Y + 120,
      scale: 0.94,
      alpha: 0.82,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS,
      ease: 'Cubic.easeIn',
    });
    this.scene.tweens.add({
      targets: this.previewCard,
      y: this.previewCardBaseY - 38,
      alpha: 0,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS - 60,
      ease: 'Cubic.easeIn',
    });
    this.scene.tweens.add({
      targets: this.shopContainer,
      y: StagePresentationConfig.SHOP_PANEL_Y + 220,
      alpha: 0,
      duration: StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        onComplete();
      },
    });
  }

  playBuildIntro(fromCombat: boolean): void {
    this.scene.tweens.killTweensOf(this.recordContainer);
    this.scene.tweens.killTweensOf(this.shopContainer);
    this.scene.tweens.killTweensOf(this.previewCard);
    this.scene.tweens.killTweensOf(this.scene.cameras.main);

    const duration = fromCombat
      ? StagePresentationConfig.COMBAT_TO_BUILD_TWEEN_MS
      : StagePresentationConfig.BUILD_TO_COMBAT_TWEEN_MS;
    const recordStartY = fromCombat
      ? StagePresentationConfig.COMBAT_TO_BUILD_RECORD_START_Y
      : StagePresentationConfig.BUILD_RECORD_CENTER_Y;
    const previewStartY = fromCombat
      ? this.previewCardBaseY - 72
      : this.previewCardBaseY;
    const shopStartY = fromCombat
      ? StagePresentationConfig.SHOP_PANEL_Y + 300
      : StagePresentationConfig.SHOP_PANEL_Y + 170;

    this.scene.cameras.main.setZoom(fromCombat ? StagePresentationConfig.COMBAT_TO_BUILD_CAMERA_START_ZOOM : 1);
    this.recordContainer.setY(recordStartY);
    this.recordContainer.setScale(
      fromCombat ? StagePresentationConfig.COMBAT_TO_BUILD_RECORD_START_SCALE : 1,
    );
    this.recordContainer.setAlpha(1);
    this.previewCard.setY(previewStartY);
    this.previewCard.setAlpha(fromCombat ? 0 : 1);
    this.shopContainer.setY(shopStartY);
    this.shopContainer.setAlpha(0);

    this.scene.tweens.add({
      targets: this.scene.cameras.main,
      zoom: 1,
      duration,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.recordContainer,
      y: StagePresentationConfig.BUILD_RECORD_CENTER_Y,
      scale: 1,
      duration,
      ease: fromCombat ? 'Cubic.easeOut' : 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: this.previewCard,
      y: this.previewCardBaseY,
      alpha: 1,
      duration: duration - 80,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.shopContainer,
      y: StagePresentationConfig.SHOP_PANEL_Y,
      alpha: 1,
      duration,
      ease: 'Cubic.easeOut',
    });
  }

  playCombatReturn(outcome: 'victory' | 'defeat', onComplete: () => void): void {
    this.returnTimer?.remove(false);
    this.returnTimer = undefined;

    const delayMs = outcome === 'victory'
      ? StagePresentationConfig.COMBAT_VICTORY_HOLD_MS
      : 0;

    if (delayMs <= 0) {
      onComplete();
      return;
    }

    this.returnTimer = this.scene.time.delayedCall(delayMs, () => {
      this.returnTimer = undefined;
      onComplete();
    });
  }

  destroy(): void {
    this.returnTimer?.remove(false);
    this.returnTimer = undefined;
    this.scene.tweens.killTweensOf(this.recordContainer);
    this.scene.tweens.killTweensOf(this.shopContainer);
    this.scene.tweens.killTweensOf(this.previewCard);
    this.scene.tweens.killTweensOf(this.scene.cameras.main);
  }
}
