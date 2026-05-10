import { describe, expect, it, vi } from 'vitest';
import type { StageWavePreviewModel } from '@config/StageConfig';

vi.mock('../../ui/SpecialEnemyCard', () => ({
  createSpecialEnemyCard: vi.fn((_scene: unknown, _enemyId: string, _variant: string) => {
    const mockContainer = {
      list: [],
      add: vi.fn(),
      setSize: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      width: 140,
      height: 160,
    } as unknown as Phaser.GameObjects.Container;
    return mockContainer;
  }),
}));

import { populatePreviewCard, type PreviewCardState } from './StagePreviewCard';

function createMockScene(): Phaser.Scene {
  const graphicsObjects: Array<{
    fillStyle: ReturnType<typeof vi.fn>;
    fillRoundedRect: ReturnType<typeof vi.fn>;
    lineStyle: ReturnType<typeof vi.fn>;
    strokeRoundedRect: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const containerChildren: Array<Phaser.GameObjects.GameObject[]> = [];

  return {
    add: {
      graphics: vi.fn(() => {
        const g = {
          fillStyle: vi.fn().mockReturnThis(),
          fillRoundedRect: vi.fn(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn(),
          destroy: vi.fn(),
        };
        graphicsObjects.push(g);
        return g;
      }),
      text: vi.fn((_x: number, _y: number, _text: string) => ({
        setOrigin: vi.fn().mockReturnThis(),
        width: 100,
        height: 20,
        destroy: vi.fn(),
      })),
      container: vi.fn((_x: number, _y: number, children?: Phaser.GameObjects.GameObject[]) => {
        const list: Phaser.GameObjects.GameObject[] = [...(children ?? [])];
        containerChildren.push(list);
        const c: Record<string, unknown> = {
          add: vi.fn((child: Phaser.GameObjects.GameObject) => {
            list.push(child);
            return c;
          }),
          list,
          setSize: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          setOrigin: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          width: 100,
          height: 28,
        };
        return c as unknown as Phaser.GameObjects.Container;
      }),
    },
    tweens: {
      add: vi.fn(),
      killTweensOf: vi.fn(),
    },
  } as unknown as Phaser.Scene;
}

function makeWavePreview(overrides: Partial<StageWavePreviewModel> = {}): StageWavePreviewModel {
  return {
    waveNumber: 1,
    totalWaves: 10,
    waveKind: 'normal',
    tags: ['Red', 'Fast'],
    specialEnemyId: null,
    specialEnemyName: null,
    ...overrides,
  };
}

describe('populatePreviewCard', () => {
  it('creates a pill tag container for each tag in the wave preview', () => {
    const scene = createMockScene();
    const previewCard = scene.add.container(0, 0);
    const wavePreview = makeWavePreview({ tags: ['Red', 'Fast', 'Single-Target'] });

    const state = populatePreviewCard(scene, previewCard, wavePreview, 400);

    // One pill per tag
    expect(state.pillContainers).toHaveLength(3);
    // Each pill should be a Container
    for (const pill of state.pillContainers) {
      expect(pill).toBeDefined();
      expect(Array.isArray(pill.list)).toBe(true);
    }
    // No enemy card for normal wave
    expect(state.enemyCard).toBeNull();
  });

  it('creates a wave label text inside the preview card', () => {
    const scene = createMockScene();
    const textSpy = scene.add.text as ReturnType<typeof vi.fn>;
    const previewCard = scene.add.container(0, 0);
    const wavePreview = makeWavePreview({ waveNumber: 3, totalWaves: 10 });

    populatePreviewCard(scene, previewCard, wavePreview, 400);

    // Should have called add.text to create a wave label
    const waveLabelCall = textSpy.mock.calls.find(
      (call: unknown[]) => (call[2] as string).includes('WAVE'),
    );
    expect(waveLabelCall).toBeDefined();
  });

  it('destroys previous state before creating new content', () => {
    const scene = createMockScene();
    const previewCard = scene.add.container(0, 0);
    const wavePreview = makeWavePreview({ tags: ['Red'] });

    const oldState: PreviewCardState = {
      waveLabel: { destroy: vi.fn() } as unknown as Phaser.GameObjects.Text,
      pillContainers: [
        { destroy: vi.fn() } as unknown as Phaser.GameObjects.Container,
      ],
      enemyCard: null,
    };

    const destroySpy0 = oldState.pillContainers[0]!.destroy as ReturnType<typeof vi.fn>;

    populatePreviewCard(scene, previewCard, wavePreview, 400, oldState);

    expect(destroySpy0).toHaveBeenCalled();
  });

  it('renders a special enemy card when waveKind is elite and specialEnemyId is set', () => {
    const scene = createMockScene();
    const previewCard = scene.add.container(0, 0);
    const wavePreview = makeWavePreview({
      waveKind: 'elite',
      specialEnemyId: 'iron-kick',
      specialEnemyName: 'Iron Kick',
      tags: ['Red', 'Elite'],
    });

    const state = populatePreviewCard(scene, previewCard, wavePreview, 400);

    // Should have created a special enemy card
    expect(state.enemyCard).not.toBeNull();
    // Enemy card should have been added to the preview card
    const addSpy = previewCard.add as ReturnType<typeof vi.fn>;
    const enemyCardCalls = addSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === state.enemyCard,
    );
    expect(enemyCardCalls.length).toBe(1);
  });

  it('renders a special enemy card when waveKind is boss and specialEnemyId is set', () => {
    const scene = createMockScene();
    const previewCard = scene.add.container(0, 0);
    const wavePreview = makeWavePreview({
      waveKind: 'boss',
      specialEnemyId: 'redline-headliner',
      specialEnemyName: 'Redline Headliner',
      tags: ['Red', 'Boss'],
    });

    const state = populatePreviewCard(scene, previewCard, wavePreview, 400);

    expect(state.enemyCard).not.toBeNull();
  });

  it('does NOT render a special enemy card for normal waves even if specialEnemyId is set', () => {
    const scene = createMockScene();
    const previewCard = scene.add.container(0, 0);
    const wavePreview = makeWavePreview({
      waveKind: 'normal',
      specialEnemyId: 'iron-kick',
      specialEnemyName: 'Iron Kick',
      tags: ['Red'],
    });

    const state = populatePreviewCard(scene, previewCard, wavePreview, 400);

    expect(state.enemyCard).toBeNull();
  });

  it('shows terminal text when wavePreview is null', () => {
    const scene = createMockScene();
    const textSpy = scene.add.text as ReturnType<typeof vi.fn>;
    const previewCard = scene.add.container(0, 0);

    populatePreviewCard(scene, previewCard, null, 400, undefined, 'Stage Complete');

    const terminalCall = textSpy.mock.calls.find(
      (call: unknown[]) => (call[2] as string).includes('Stage Complete'),
    );
    expect(terminalCall).toBeDefined();
  });
});
