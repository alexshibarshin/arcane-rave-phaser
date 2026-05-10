import { describe, expect, it, vi } from 'vitest';
import { CombatDamageNumber } from './CombatDamageNumber';

describe('CombatDamageNumber', () => {
  const config = {
    fontSizePx: 14,
    floatDurationMs: 600,
    floatDistanceY: 30,
  };

  it('floats upward, fades out, and slightly scales during its lifetime', () => {
    const setOrigin = vi.fn();
    const setDepth = vi.fn();
    const setAlpha = vi.fn();
    const setScale = vi.fn();
    const setText = vi.fn();
    const setPosition = vi.fn();
    const setColor = vi.fn();
    const setVisible = vi.fn();
    const destroy = vi.fn();
    const text = {
      y: 100,
      setOrigin,
      setDepth,
      setAlpha,
      setScale,
      setText,
      setPosition,
      setColor,
      setVisible,
      destroy,
    };
    const scene = {
      add: {
        text: vi.fn(() => text),
      },
    } as unknown as Phaser.Scene;

    const damageNumber = new CombatDamageNumber(scene, config);
    damageNumber.reset(50, 100, 12, 300, config);

    damageNumber.update(300);

    expect(scene.add.text).toHaveBeenCalledWith(0, 0, '', expect.objectContaining({
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
    }));
    expect(text.y).toBe(85);
    expect(setAlpha).toHaveBeenCalledWith(0.5);
    expect(setScale).toHaveBeenCalledWith(1.1);
    expect(damageNumber.isComplete(599)).toBe(false);
    expect(damageNumber.isComplete(600)).toBe(true);
  });

  it('destroys the backing text object', () => {
    const destroy = vi.fn();
    const scene = {
      add: {
        text: vi.fn(() => ({
          y: 0,
          setOrigin: vi.fn(),
          setDepth: vi.fn(),
          setAlpha: vi.fn(),
          setScale: vi.fn(),
          setText: vi.fn(),
          setPosition: vi.fn(),
          setColor: vi.fn(),
          setVisible: vi.fn(),
          destroy,
        })),
      },
    } as unknown as Phaser.Scene;

    const damageNumber = new CombatDamageNumber(scene, config);

    damageNumber.destroy();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
