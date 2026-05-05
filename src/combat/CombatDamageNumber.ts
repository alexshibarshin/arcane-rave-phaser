import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';

interface CombatDamageNumberConfig {
  fontSizePx: number;
  floatDurationMs: number;
  floatDistanceY: number;
}

export class CombatDamageNumber {
  readonly text: Phaser.GameObjects.Text;
  readonly startTime: number;
  private readonly durationMs: number;
  private readonly floatDistanceY: number;
  private readonly baseY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: number,
    startTime: number,
    config: CombatDamageNumberConfig,
  ) {
    this.baseY = y;
    this.startTime = startTime;
    this.durationMs = config.floatDurationMs;
    this.floatDistanceY = config.floatDistanceY;

    this.text = scene.add.text(x, y, String(value), {
      fontSize: `${config.fontSizePx}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.text.setOrigin(0.5, 0.5);
    this.text.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.45);
  }

  update(elapsedMs: number): void {
    const progress = Math.min(1, Math.max(0, elapsedMs / this.durationMs));
    const bounce = Math.sin(progress * Math.PI);

    this.text.y = this.baseY - this.floatDistanceY * progress;
    this.text.setAlpha(1 - progress);
    this.text.setScale(1 + bounce * 0.1);
  }

  isComplete(elapsedMs: number): boolean {
    return elapsedMs >= this.durationMs;
  }

  destroy(): void {
    this.text.destroy();
  }
}
