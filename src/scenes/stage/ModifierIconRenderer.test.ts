import { describe, expect, it } from 'vitest';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { createModifierIcons } from './ModifierIconRenderer';
import type { SlotModifierAssignment } from '@modifiers/SlotModifierAssignment';

class FakeGraphics {
  fillStyle(): this { return this; }
  lineStyle(): this { return this; }
  fillCircle(): this { return this; }
  strokeCircle(): this { return this; }
  fillRoundedRect(): this { return this; }
  strokeRoundedRect(): this { return this; }
  fillPoints(): this { return this; }
  strokePoints(): this { return this; }
}

class FakeText {
  visible = true;
  constructor(
    public x: number,
    public y: number,
    public text: string,
  ) {}

  setOrigin(): this { return this; }
  setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }
}

class FakeContainer {
  visible = true;
  list: unknown[] = [];
  width = 0;
  height = 0;

  constructor(
    public x: number,
    public y: number,
  ) {}

  add(children: unknown[] | unknown): this {
    if (Array.isArray(children)) {
      this.list.push(...children);
    } else {
      this.list.push(children);
    }
    return this;
  }

  setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }

  setSize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    return this;
  }

  setInteractive(): this {
    return this;
  }
}

function createFakeScene() {
  return {
    add: {
      container: (x: number, y: number) => new FakeContainer(x, y),
      graphics: () => new FakeGraphics(),
      text: (x: number, y: number, text: string) => new FakeText(x, y, text),
    },
  };
}

describe('createModifierIcons', () => {
  it('creates one icon per slot modifier and positions it outside the record rim', () => {
    const scene = createFakeScene();
    const recordGroup = new FakeContainer(0, 0);
    const slotModifiers: SlotModifierAssignment[] = [
      { slotIndex: 0, modifierId: 'plus-one-output-note' },
      { slotIndex: 2, modifierId: 'plus-one-projectile' },
    ];
    const recordRadius = StagePresentationConfig.BUILD_RECORD_RADIUS;

    const views = createModifierIcons(scene as never, slotModifiers, recordGroup as never, recordRadius);

    expect(views).toHaveLength(2);
    expect(recordGroup.list).toHaveLength(2);

    expect(views[0]?.slotIndex).toBe(0);
    expect(getDistanceFromCenter(views[0]!.container)).toBeGreaterThan(recordRadius);
    expect(getAngleDeg(views[0]!.container)).toBeCloseTo(-90, 5);

    expect(views[1]?.slotIndex).toBe(2);
    expect(getDistanceFromCenter(views[1]!.container)).toBeGreaterThan(recordRadius);
    expect(getAngleDeg(views[1]!.container)).toBeCloseTo(0, 5);
  });

  it('icons are always visible regardless of phase', () => {
    const scene = createFakeScene();
    const recordGroup = new FakeContainer(0, 0);
    const slotModifiers: SlotModifierAssignment[] = [
      { slotIndex: 5, modifierId: 'double-activation' },
    ];
    const recordRadius = StagePresentationConfig.BUILD_RECORD_RADIUS;

    const views = createModifierIcons(scene as never, slotModifiers, recordGroup as never, recordRadius);

    expect(views).toHaveLength(1);
    expect(views[0]?.container.visible).toBe(true);
  });
});

function getDistanceFromCenter(container: FakeContainer): number {
  return Math.hypot(container.x, container.y);
}

function getAngleDeg(container: FakeContainer): number {
  return (Math.atan2(container.y, container.x) * 180) / Math.PI;
}
