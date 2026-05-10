import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';

interface CombatDamageNumberConfig {
  fontSizePx: number;
  floatDurationMs: number;
  floatDistanceY: number;
}

export class CombatDamageNumber {
  readonly text: Phaser.GameObjects.Text;
  startTime = 0;
  private durationMs = 0;
  private floatDistanceY = 0;
  private baseY = 0;

  constructor(scene: Phaser.Scene, config: CombatDamageNumberConfig) {
    this.text = scene.add.text(0, 0, '', {
      fontSize: `${config.fontSizePx}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.text.setOrigin(0.5, 0.5);
    this.text.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.45);
    this.text.setVisible(false);
  }

  reset(x: number, y: number, value: number, startTime: number, config: CombatDamageNumberConfig): void {
    this.baseY = y;
    this.startTime = startTime;
    this.durationMs = config.floatDurationMs;
    this.floatDistanceY = config.floatDistanceY;

    this.text.setPosition(x, y);
    this.text.setText(String(value));
    this.text.setColor('#ffffff');
    this.text.setAlpha(1);
    this.text.setScale(1);
    this.text.setVisible(true);
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
