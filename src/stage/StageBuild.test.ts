import { describe, expect, it } from 'vitest';
import {
  createStageBuildState,
  getStageRerollCost,
  getStageBuildSlotPawnIds,
  mergeStagePawn,
  moveStagePawn,
  purchaseStagePawn,
  purchaseStagePawnMerge,
  rerollStageShop,
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
    expect(build.rerollCount).toBe(0);
  });

  it('buys a pawn from shop into an empty slot and spends coins', () => {
    const build = createStageBuildState(() => 0);
    const purchased = purchaseStagePawn(build, 6, 0, 0);

    expect(purchased).toBe(true);
    expect(build.slots[0]).toEqual({ pawnId: 'pawn-red-generator', tier: 1 });
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
    expect(build.slots[0]).toEqual({ pawnId: 'pawn-red-generator', tier: 1 });
  });

  it('moves a pawn into an empty slot and swaps when target is occupied', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'pawn-red-generator', tier: 1 },
        { pawnId: 'pawn-blue-finisher', tier: 1 },
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      shopOffers: [],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(moveStagePawn(build, 2, 0, 2)).toBe(true);
    expect(build.slots.slice(0, 3)).toEqual([
      null,
      { pawnId: 'pawn-blue-finisher', tier: 1 },
      { pawnId: 'pawn-red-generator', tier: 1 },
    ]);

    expect(moveStagePawn(build, 1, 1, 2)).toBe(true);
    expect(build.slots.slice(0, 3)).toEqual([
      null,
      { pawnId: 'pawn-red-generator', tier: 1 },
      { pawnId: 'pawn-blue-finisher', tier: 1 },
    ]);
  });

  it('refuses repositioning when coins are insufficient or source slot is empty', () => {
    const build: StageBuildState = {
      slots: [{ pawnId: 'pawn-red-generator', tier: 1 }, null, null, null, null, null, null, null],
      shopOffers: [],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(moveStagePawn(build, 0, 0, 1)).toBe(false);
    expect(moveStagePawn(build, 1, 1, 1)).toBe(false);
    expect(build.slots[0]).toEqual({ pawnId: 'pawn-red-generator', tier: 1 });
    expect(build.slots[1]).toBeNull();
  });

  it('merges matching same-tier pawns into a random next-tier pawn', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'pawn-red-generator', tier: 1 },
        { pawnId: 'pawn-red-generator', tier: 1 },
        null,
        null,
        null,
        null,
        null,
        null,
      ],
      shopOffers: [],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(mergeStagePawn(build, 0, 1, () => 0.5)).toBe(true);
    expect(build.slots[0]).toBeNull();
    expect(build.slots[1]).toEqual({ pawnId: 'pawn-red-finisher', tier: 2 });
  });

  it('refuses merge when pawn ids or tiers do not match', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'pawn-red-generator', tier: 1 },
        { pawnId: 'pawn-blue-generator', tier: 1 },
        { pawnId: 'pawn-red-generator', tier: 2 },
        null,
        null,
        null,
        null,
        null,
      ],
      shopOffers: [],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(mergeStagePawn(build, 0, 1)).toBe(false);
    expect(mergeStagePawn(build, 0, 2)).toBe(false);
  });

  it('exposes slot pawn ids for systems that only need definitions', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'pawn-red-generator', tier: 2 },
        null,
        { pawnId: 'pawn-blue-finisher', tier: 1 },
        null,
        null,
        null,
        null,
        null,
      ],
      shopOffers: [],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(getStageBuildSlotPawnIds(build)).toEqual([
      'pawn-red-generator',
      null,
      'pawn-blue-finisher',
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('merges a shop offer into a matching tier-1 pawn on the record', () => {
    const build: StageBuildState = {
      slots: [{ pawnId: 'pawn-red-generator', tier: 1 }, null, null, null, null, null, null, null],
      shopOffers: ['pawn-red-generator'],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(purchaseStagePawnMerge(build, 5, 0, 0, () => 0.5)).toBe(true);
    expect(build.slots[0]).toEqual({ pawnId: 'pawn-red-finisher', tier: 2 });
    expect(build.shopOffers).toEqual([]);
  });

  it('rerolls the shop and increases reroll cost for the current build phase', () => {
    const build = createStageBuildState(() => 0);

    expect(getStageRerollCost(build)).toBe(1);
    expect(rerollStageShop(build, 1, () => 0.5)).toBe(true);
    expect(build.shopOffers).toEqual([
      'pawn-red-finisher',
      'pawn-red-finisher',
      'pawn-red-finisher',
    ]);
    expect(build.rerollCount).toBe(1);
    expect(getStageRerollCost(build)).toBe(2);
  });
});
