import { describe, it, expect } from 'vitest';
import { getCombatDefaultPawnDeckIds } from '@config/CombatContentConfig';
import { SessionProgressStore, StageResult } from './SessionProgressStore';

describe('SessionProgressStore', () => {
  it('returns null for an unplayed stage', () => {
    const result = SessionProgressStore.getResult('stage-1');
    expect(result).toBeNull();
  });

  it('stores and retrieves a result for a stage', () => {
    const input: StageResult = {
      stageId: 'stage-1',
      stars: 3,
      bestRemainingBaseHp: 95,
    };
    SessionProgressStore.setResult('stage-1', input);
    const result = SessionProgressStore.getResult('stage-1');
    expect(result).not.toBeNull();
    expect(result!.stars).toBe(3);
    expect(result!.bestRemainingBaseHp).toBe(95);
  });

  it('returns null for lastSelectedStageId by default', () => {
    expect(SessionProgressStore.getLastSelectedStageId()).toBeNull();
  });

  it('stores and retrieves lastSelectedStageId', () => {
    SessionProgressStore.setLastSelectedStageId('stage-2');
    expect(SessionProgressStore.getLastSelectedStageId()).toBe('stage-2');
  });

  it('is a singleton — same store reference across accesses', () => {
    SessionProgressStore.setLastSelectedStageId('singleton-test');
    expect(SessionProgressStore.getLastSelectedStageId()).toBe('singleton-test');
  });

  it('starts with the default combat deck and keeps a copy in session state', () => {
    const deckIds = SessionProgressStore.getActiveDeckIds();

    expect(deckIds).toEqual(getCombatDefaultPawnDeckIds());
    expect(deckIds).not.toBe(getCombatDefaultPawnDeckIds());
  });

  it('stores an updated active deck with exactly eight unique known pawn ids', () => {
    const nextDeckIds = [
      'lifebloom-scatter',
      'pulse-garden',
      'prism-volley',
      'pressure-burst',
      'ruby-needle',
      'bass-bomb',
      'heatline',
      'moss-patch',
    ];

    SessionProgressStore.setActiveDeckIds(nextDeckIds);

    expect(SessionProgressStore.getActiveDeckIds()).toEqual(nextDeckIds);
  });
});

describe('SessionProgressStore — setResult isBetter logic', () => {
  it('first write always succeeds', () => {
    const input: StageResult = { stageId: 'better-first', stars: 1, bestRemainingBaseHp: 30 };
    SessionProgressStore.setResult('better-first', input);
    expect(SessionProgressStore.getResult('better-first')!.stars).toBe(1);
    expect(SessionProgressStore.getResult('better-first')!.bestRemainingBaseHp).toBe(30);
  });

  it('higher stars overwrites lower stars', () => {
    SessionProgressStore.setResult('better-stars', { stageId: 'better-stars', stars: 1, bestRemainingBaseHp: 50 });
    SessionProgressStore.setResult('better-stars', { stageId: 'better-stars', stars: 3, bestRemainingBaseHp: 10 });
    expect(SessionProgressStore.getResult('better-stars')!.stars).toBe(3);
    expect(SessionProgressStore.getResult('better-stars')!.bestRemainingBaseHp).toBe(10);
  });

  it('lower stars does NOT overwrite higher stars', () => {
    SessionProgressStore.setResult('better-no-downgrade', { stageId: 'better-no-downgrade', stars: 3, bestRemainingBaseHp: 95 });
    SessionProgressStore.setResult('better-no-downgrade', { stageId: 'better-no-downgrade', stars: 1, bestRemainingBaseHp: 99 });
    expect(SessionProgressStore.getResult('better-no-downgrade')!.stars).toBe(3);
    expect(SessionProgressStore.getResult('better-no-downgrade')!.bestRemainingBaseHp).toBe(95);
  });

  it('same stars + higher HP overwrites', () => {
    SessionProgressStore.setResult('better-same-stars', { stageId: 'better-same-stars', stars: 2, bestRemainingBaseHp: 60 });
    SessionProgressStore.setResult('better-same-stars', { stageId: 'better-same-stars', stars: 2, bestRemainingBaseHp: 80 });
    expect(SessionProgressStore.getResult('better-same-stars')!.stars).toBe(2);
    expect(SessionProgressStore.getResult('better-same-stars')!.bestRemainingBaseHp).toBe(80);
  });

  it('same stars + lower or equal HP does NOT overwrite', () => {
    SessionProgressStore.setResult('better-same-stars-lower', { stageId: 'better-same-stars-lower', stars: 2, bestRemainingBaseHp: 80 });
    SessionProgressStore.setResult('better-same-stars-lower', { stageId: 'better-same-stars-lower', stars: 2, bestRemainingBaseHp: 80 });
    SessionProgressStore.setResult('better-same-stars-lower', { stageId: 'better-same-stars-lower', stars: 2, bestRemainingBaseHp: 60 });
    expect(SessionProgressStore.getResult('better-same-stars-lower')!.bestRemainingBaseHp).toBe(80);
  });

  it('defeat (0 stars) does NOT overwrite a prior successful result', () => {
    SessionProgressStore.setResult('better-defeat', { stageId: 'better-defeat', stars: 2, bestRemainingBaseHp: 55 });
    SessionProgressStore.setResult('better-defeat', { stageId: 'better-defeat', stars: 0, bestRemainingBaseHp: 0 });
    expect(SessionProgressStore.getResult('better-defeat')!.stars).toBe(2);
    expect(SessionProgressStore.getResult('better-defeat')!.bestRemainingBaseHp).toBe(55);
  });

  it('null bestRemainingBaseHp in old result is treated as 0 for comparison', () => {
    // Simulate a stage that was set with null HP (never completed successfully)
    // We'll use a fresh stage that gets written with 1 star and null HP, then
    // overwritten by 1 star with actual HP.
    SessionProgressStore.setResult('better-null-hp', { stageId: 'better-null-hp', stars: 1, bestRemainingBaseHp: null });
    SessionProgressStore.setResult('better-null-hp', { stageId: 'better-null-hp', stars: 1, bestRemainingBaseHp: 40 });
    expect(SessionProgressStore.getResult('better-null-hp')!.bestRemainingBaseHp).toBe(40);
  });
});
