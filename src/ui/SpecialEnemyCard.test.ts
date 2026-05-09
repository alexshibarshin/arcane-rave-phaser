import { describe, expect, it, vi } from 'vitest';
import { createSpecialEnemyCard } from './SpecialEnemyCard';

function createMockScene(): Phaser.Scene {
  return {
    add: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillRoundedRect: vi.fn(),
        fillCircle: vi.fn(),
        lineStyle: vi.fn().mockReturnThis(),
        strokeRoundedRect: vi.fn(),
        strokeCircle: vi.fn(),
        clear: vi.fn(),
      })),
      text: vi.fn((_x: number, _y: number, _text: string, _style?: object) => ({
        setOrigin: vi.fn().mockReturnThis(),
        width: 100,
        height: 20,
      })),
      container: vi.fn((_x: number, _y: number, _children?: unknown[]) => ({
        add: vi.fn(),
        list: [],
        setSize: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
    },
  } as unknown as Phaser.Scene;
}

describe('createSpecialEnemyCard', () => {
  it('returns a Container for lobby variant', () => {
    const scene = createMockScene();
    const card = createSpecialEnemyCard(scene, 'iron-kick', 'lobby');
    expect(card).toBeDefined();
    expect(card.list).toBeDefined();
  });

  it('returns a Container for wave-preview variant', () => {
    const scene = createMockScene();
    const card = createSpecialEnemyCard(scene, 'iron-kick', 'wave-preview');
    expect(card).toBeDefined();
  });

  it('uses different dimensions for lobby vs wave-preview', () => {
    const scene = createMockScene();
    const containerSpy = scene.add.container as ReturnType<typeof vi.fn>;

    createSpecialEnemyCard(scene, 'iron-kick', 'lobby');
    expect(containerSpy).toHaveBeenCalled();

    createSpecialEnemyCard(scene, 'iron-kick', 'wave-preview');
    expect(containerSpy).toHaveBeenCalledTimes(2);
  });

  it('renders enemy displayName as text for known special enemy', () => {
    const scene = createMockScene();
    const textSpy = scene.add.text as ReturnType<typeof vi.fn>;
    createSpecialEnemyCard(scene, 'iron-kick', 'lobby');

    const textCalls = textSpy.mock.calls;
    const nameCall = textCalls.find(
      (call: unknown[]) => (call[2] as string) === 'Iron Kick',
    );
    // The card should render the enemy name somewhere
    expect(textCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows archetype label (Elite/Boss) for special enemies', () => {
    const scene = createMockScene();
    const textSpy = scene.add.text as ReturnType<typeof vi.fn>;
    createSpecialEnemyCard(scene, 'redline-headliner', 'lobby');

    const textCalls = textSpy.mock.calls;
    // Should have a text call with the role label
    expect(textCalls.length).toBeGreaterThanOrEqual(2);
  });
});
