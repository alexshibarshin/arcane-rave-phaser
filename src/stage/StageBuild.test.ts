import { describe, expect, it } from 'vitest';
import {
  createStageBuildState,
  moveStagePawn,
  purchaseStagePawn,
  type StageBuildState,
} from '@stage/StageBuild';

describe('StageBuild', () => {
  it('creates empty slots and shop offers for the build phase', () => {
    const build = createStageBuildState(() => 0);

    expect(build.slots).toHaveLength(8);
    expect(build.slots.every((slot) => slot === null)).toBe(true);
    expect(build.shopOffers).toEqual([
      'pawn-red-generator',
      'pawn-red-generator',
      'pawn-red-generator',
    ]);
  });

  it('buys a pawn from shop into an empty slot and spends coins', () => {
    const build = createStageBuildState(() => 0);
    const purchased = purchaseStagePawn(build, 6, 0, 0);

    expect(purchased).toBe(true);
    expect(build.slots[0]).toBe('pawn-red-generator');
    expect(build.shopOffers).toEqual([
      'pawn-red-generator',
      'pawn-red-generator',
    ]);
    expect(build.shopPurchaseCounts['pawn-red-generator']).toBe(1);
  });

  it('refuses purchases into occupied slots or without enough coins', () => {
    const build = createStageBuildState(() => 0);

    expect(purchaseStagePawn(build, 2, 0, 0)).toBe(false);
    expect(purchaseStagePawn(build, 6, 0, 0)).toBe(true);
    expect(purchaseStagePawn(build, 3, 0, 0)).toBe(false);
    expect(build.slots[0]).toBe('pawn-red-generator');
  });

  it('moves a pawn into an empty slot and swaps when target is occupied', () => {
    const build: StageBuildState = {
      slots: ['pawn-red-generator', 'pawn-blue-finisher', null, null, null, null, null, null],
      shopOffers: [],
      shopPurchaseCounts: {},
    };

    expect(moveStagePawn(build, 2, 0, 2)).toBe(true);
    expect(build.slots.slice(0, 3)).toEqual([null, 'pawn-blue-finisher', 'pawn-red-generator']);

    expect(moveStagePawn(build, 1, 1, 2)).toBe(true);
    expect(build.slots.slice(0, 3)).toEqual([null, 'pawn-red-generator', 'pawn-blue-finisher']);
  });

  it('refuses repositioning when coins are insufficient or source slot is empty', () => {
    const build: StageBuildState = {
      slots: ['pawn-red-generator', null, null, null, null, null, null, null],
      shopOffers: [],
      shopPurchaseCounts: {},
    };

    expect(moveStagePawn(build, 0, 0, 1)).toBe(false);
    expect(moveStagePawn(build, 1, 1, 1)).toBe(false);
    expect(build.slots[0]).toBe('pawn-red-generator');
    expect(build.slots[1]).toBeNull();
  });
});
