import { describe, expect, it } from 'vitest';
import type { ModifierIconView } from './ModifierIconRenderer';
import { bindModifierInspection, type ModifierTooltipState } from './ModifierTooltipBridge';

class FakeTimerEvent {
  removed = false;
  constructor(public readonly callback: () => void) {}

  remove(): void {
    this.removed = true;
  }

  fire(): void {
    if (!this.removed) {
      this.callback();
    }
  }
}

class FakeContainer {
  private readonly handlers = new Map<string, Array<() => void>>();

  on(event: string, handler: () => void): this {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler);
    this.handlers.set(event, existing);
    return this;
  }

  emit(event: string): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler();
    }
  }
}

function createScene() {
  const scene = {
    time: {
      delayedCall: (_delay: number, callback: () => void) => new FakeTimerEvent(callback),
    },
  };

  return scene;
}

function createIconView(container: FakeContainer): ModifierIconView {
  return {
    slotIndex: 3,
    modifierId: 'test-modifier',
    container: container as never,
  };
}

describe('bindModifierInspection', () => {
  it('shows after a 150ms hold and hides on pointerout', () => {
    const scene = createScene();
    const container = new FakeContainer();
    const iconView = createIconView(container);
    const tooltipState: ModifierTooltipState = { modifierId: 'fixture-modifier', slotIndex: 3 };
    const shown: ModifierTooltipState[] = [];
    let hiddenCount = 0;

    bindModifierInspection(
      scene as never,
      iconView,
      tooltipState,
      (state) => shown.push(state),
      () => {
        hiddenCount += 1;
      },
    );

    container.emit('pointerdown');
    expect(shown).toEqual([]);

    const timer = (scene as never as { modifierTooltipHoldTimer: FakeTimerEvent }).modifierTooltipHoldTimer;
    timer.fire();
    expect(shown).toEqual([tooltipState]);

    container.emit('pointerout');
    expect(hiddenCount).toBe(1);
    expect(timer.removed).toBe(true);
  });

  it('cancels the pending hold when pointerout happens before the timer completes', () => {
    const scene = createScene();
    const container = new FakeContainer();
    const iconView = createIconView(container);
    const shown: ModifierTooltipState[] = [];

    bindModifierInspection(
      scene as never,
      iconView,
      { modifierId: 'fixture-modifier', slotIndex: 2 },
      (state) => shown.push(state),
      () => undefined,
    );

    container.emit('pointerdown');
    const timer = (scene as never as { modifierTooltipHoldTimer: FakeTimerEvent }).modifierTooltipHoldTimer;
    container.emit('pointerout');
    timer.fire();

    expect(shown).toEqual([]);
  });
});
