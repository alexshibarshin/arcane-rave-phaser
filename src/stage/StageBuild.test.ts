import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
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

    expect(build.slots).toHaveLength(CombatContentConfig.SLOT_COUNT);
    expect(build.slots.every((slot) => slot === null)).toBe(true);
    expect(build.shopOffers.length).toBeGreaterThan(0);
    expect(build.shopOffers.every((id) => typeof id === 'string')).toBe(true);
    expect(build.rerollCount).toBe(0);
  });

  it('buys a pawn from shop into an empty slot and spends coins', () => {
    const build = createStageBuildState(() => 0);
    const purchased = purchaseStagePawn(build, 6, 0, 0);

    expect(purchased).toBe(true);
    expect(typeof build.slots[0]?.pawnId).toBe('string');
    expect(build.slots[0]?.tier).toBe(1);
    expect(build.shopOffers.length).toBe(2);
    expect(build.shopPurchaseCounts[build.slots[0]!.pawnId]).toBe(1);
  });

  it('refuses purchases into occupied slots or without enough coins', () => {
    const build = createStageBuildState(() => 0);

    expect(purchaseStagePawn(build, 2, 0, 0)).toBe(false);
    expect(purchaseStagePawn(build, 6, 0, 0)).toBe(true);
    expect(purchaseStagePawn(build, 3, 0, 0)).toBe(false);
    expect(build.slots[0]).not.toBeNull();
    expect(build.slots[0]?.tier).toBe(1);
  });

  it('moves a pawn into an empty slot and swaps when target is occupied', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'ruby-needle', tier: 1 },
        { pawnId: 'arc-bounce', tier: 1 },
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
    expect(build.slots[0]).toBeNull();
    expect(build.slots[2]).not.toBeNull();

    expect(moveStagePawn(build, 1, 1, 2)).toBe(true);
    expect(build.slots[1]).not.toBeNull();
    expect(build.slots[2]).not.toBeNull();
  });

  it('refuses repositioning when coins are insufficient or source slot is empty', () => {
    const build: StageBuildState = {
      slots: [{ pawnId: 'ruby-needle', tier: 1 }, null, null, null, null, null, null, null],
      shopOffers: [],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(moveStagePawn(build, 0, 0, 1)).toBe(false);
    expect(moveStagePawn(build, 1, 1, 1)).toBe(false);
    expect(build.slots[0]).not.toBeNull();
    expect(build.slots[1]).toBeNull();
  });

  it('merges matching same-tier pawns into a random next-tier pawn', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'ruby-needle', tier: 1 },
        { pawnId: 'ruby-needle', tier: 1 },
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
    expect(build.slots[1]?.tier).toBe(2);
    expect(typeof build.slots[1]?.pawnId).toBe('string');
  });

  it('refuses merge when pawn ids or tiers do not match', () => {
    const build: StageBuildState = {
      slots: [
        { pawnId: 'ruby-needle', tier: 1 },
        { pawnId: 'moss-patch', tier: 1 },
        { pawnId: 'ruby-needle', tier: 2 },
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
        { pawnId: 'ruby-needle', tier: 2 },
        null,
        { pawnId: 'arc-bounce', tier: 1 },
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
      'ruby-needle',
      null,
      'arc-bounce',
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('merges a shop offer into a matching tier-1 pawn on the record', () => {
    const build: StageBuildState = {
      slots: [{ pawnId: 'ruby-needle', tier: 1 }, null, null, null, null, null, null, null],
      shopOffers: ['ruby-needle'],
      shopPurchaseCounts: {},
      rerollCount: 0,
    };

    expect(purchaseStagePawnMerge(build, 5, 0, 0, () => 0.5)).toBe(true);
    expect(build.slots[0]?.tier).toBe(2);
    expect(typeof build.slots[0]?.pawnId).toBe('string');
    expect(build.shopOffers).toEqual([]);
  });

  it('rerolls the shop and increases reroll cost for the current build phase', () => {
    const build = createStageBuildState(() => 0);

    const initialCost = getStageRerollCost(build);
    expect(initialCost).toBeGreaterThan(0);
    expect(rerollStageShop(build, 1, () => 0.5)).toBe(true);
    expect(build.shopOffers.length).toBeGreaterThan(0);
    expect(build.rerollCount).toBe(1);
    expect(getStageRerollCost(build)).toBeGreaterThan(initialCost);
  });
});
