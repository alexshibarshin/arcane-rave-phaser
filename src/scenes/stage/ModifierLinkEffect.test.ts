import { describe, expect, it } from 'vitest';
import { showCompatibilityLink } from './ModifierLinkEffect';

class FakeGraphics {
  alpha = 1;
  destroyed = false;
  lineBetweenCalls: Array<[number, number, number, number]> = [];

  lineStyle(): this {
    return this;
  }

  lineBetween(x1: number, y1: number, x2: number, y2: number): this {
    this.lineBetweenCalls.push([x1, y1, x2, y2]);
    return this;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

class FakeContainer {
  scale = 1;

  constructor(
    private readonly worldX: number,
    private readonly worldY: number,
  ) {}

  getWorldTransformMatrix(): { tx: number; ty: number } {
    return { tx: this.worldX, ty: this.worldY };
  }

  setScale(value: number): this {
    this.scale = value;
    return this;
  }
}

describe('showCompatibilityLink', () => {
  it('draws a link between icon and pawn world positions and destroys it after the tween', () => {
    const graphics = new FakeGraphics();
    const tweens: Array<{ onComplete?: () => void }> = [];
    const scene = {
      add: {
        graphics: () => graphics,
      },
      tweens: {
        add: (config: { onComplete?: () => void }) => {
          tweens.push(config);
          return config;
        },
      },
    };

    const icon = new FakeContainer(120, 160);
    const pawn = new FakeContainer(420, 460);

    showCompatibilityLink(scene as never, icon as never, pawn as never);

    expect(graphics.lineBetweenCalls).toEqual([[120, 160, 420, 460]]);
    expect(tweens).toHaveLength(2);

    tweens[0]?.onComplete?.();
    tweens[1]?.onComplete?.();

    expect(graphics.destroyed).toBe(true);
    expect(icon.scale).toBe(1);
    expect(pawn.scale).toBe(1);
  });
});
