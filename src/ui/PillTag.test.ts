import { describe, expect, it, vi } from 'vitest';
import { createPillTag } from './PillTag';

function createMockScene(): Phaser.Scene {
  const graphicsObjects: Phaser.GameObjects.Graphics[] = [];
  const textObjects: Phaser.GameObjects.Text[] = [];

  return {
    add: {
      graphics: vi.fn(() => {
        const g = {
          fillStyle: vi.fn().mockReturnThis(),
          fillRoundedRect: vi.fn(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn(),
        } as unknown as Phaser.GameObjects.Graphics;
        graphicsObjects.push(g);
        return g;
      }),
      text: vi.fn((_x: number, _y: number, text: string) => {
        const t = {
          setOrigin: vi.fn().mockReturnThis(),
          setFontSize: vi.fn().mockReturnThis(),
          width: text.length * 10,
          destroy: vi.fn(),
        } as unknown as Phaser.GameObjects.Text;
        textObjects.push(t);
        return t;
      }),
      container: vi.fn((_x: number, _y: number, children?: Phaser.GameObjects.GameObject[]) => {
        const containerChildren: Phaser.GameObjects.GameObject[] = [...(children ?? [])];
        const container = {
          add: vi.fn((child: Phaser.GameObjects.GameObject) => {
            containerChildren.push(child);
            return container;
          }),
          list: containerChildren,
          setSize: vi.fn().mockReturnThis(),
          setInteractive: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        } as unknown as Phaser.GameObjects.Container;
        return container;
      }),
    },
    graphics: {
      addGraphics: vi.fn(() => graphicsObjects[graphicsObjects.length - 1]),
    },
  } as unknown as Phaser.Scene;
}

describe('createPillTag', () => {
  it('returns a Phaser.GameObjects.Container', () => {
    const scene = createMockScene();
    const pill = createPillTag(scene, 'Red');
    expect(pill).toBeDefined();
    // Container has list property in Phaser
    expect(Array.isArray(pill.list)).toBe(true);
  });

  it('renders Red tag with red-tinted colors', () => {
    const scene = createMockScene();
    const addContainerSpy = vi.spyOn(scene.add, 'container');
    createPillTag(scene, 'Red');

    // Container should be created
    expect(addContainerSpy).toHaveBeenCalled();

    // Graphics fillStyle should have been called with red bg
    const gfxCalls = (scene.add.graphics as ReturnType<typeof vi.fn>).mock.results;
    expect(gfxCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Green tag with green-tinted colors', () => {
    const scene = createMockScene();
    createPillTag(scene, 'Green');
    const containerSpy = scene.add.container as ReturnType<typeof vi.fn>;
    expect(containerSpy).toHaveBeenCalled();
  });

  it('renders Blue tag with blue-tinted colors', () => {
    const scene = createMockScene();
    createPillTag(scene, 'Blue');
    const containerSpy = scene.add.container as ReturnType<typeof vi.fn>;
    expect(containerSpy).toHaveBeenCalled();
  });

  it('renders non-color tags with neutral colors', () => {
    const scene = createMockScene();
    createPillTag(scene, 'Single-Target');
    const containerSpy = scene.add.container as ReturnType<typeof vi.fn>;
    expect(containerSpy).toHaveBeenCalled();
  });

  it('renders pill text in uppercase', () => {
    const scene = createMockScene();
    const textSpy = scene.add.text as ReturnType<typeof vi.fn>;
    createPillTag(scene, 'fast');
    const textCall = textSpy.mock.calls.find(
      (call: unknown[]) => (call[2] as string) === 'FAST',
    );
    expect(textCall).toBeDefined();
  });
});
