import { describe, expect, it, vi } from 'vitest';
import { CombatDamageNumber } from './CombatDamageNumber';

describe('CombatDamageNumber', () => {
  it('floats upward, fades out, and slightly scales during its lifetime', () => {
    const setOrigin = vi.fn();
    const setDepth = vi.fn();
    const setAlpha = vi.fn();
    const setScale = vi.fn();
    const destroy = vi.fn();
    const text = {
      y: 100,
      setOrigin,
      setDepth,
      setAlpha,
      setScale,
      destroy,
    };
    const scene = {
      add: {
        text: vi.fn(() => text),
      },
    } as unknown as Phaser.Scene;

    const damageNumber = new CombatDamageNumber(scene, 50, 100, 12, 300, {
      fontSizePx: 14,
      floatDurationMs: 600,
      floatDistanceY: 30,
    });

    damageNumber.update(300);

    expect(scene.add.text).toHaveBeenCalledWith(50, 100, '12', expect.objectContaining({
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
    }));
    expect(text.y).toBe(85);
    expect(setAlpha).toHaveBeenLastCalledWith(0.5);
    expect(setScale).toHaveBeenLastCalledWith(1.1);
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
          destroy,
        })),
      },
    } as unknown as Phaser.Scene;

    const damageNumber = new CombatDamageNumber(scene, 0, 0, 5, 0, {
      fontSizePx: 14,
      floatDurationMs: 600,
      floatDistanceY: 30,
    });

    damageNumber.destroy();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
