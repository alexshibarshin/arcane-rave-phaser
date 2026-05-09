import { describe, expect, it } from 'vitest';
import { handleReturnToLobby } from './handleReturnToLobby';
import { SessionProgressStore } from '../../session/SessionProgressStore';

describe('handleReturnToLobby', () => {
  it('stores stage result in SessionProgressStore and returns the result', () => {
    // Clear any prior entry for this test stage
    SessionProgressStore.setResult('test-return-stage', {
      stageId: 'test-return-stage',
      stars: 0,
      bestRemainingBaseHp: 0,
    });

    const result = handleReturnToLobby({
      stageId: 'test-return-stage',
      stars: 3,
      remainingBaseHp: 90,
    });

    expect(result).toEqual({
      stageId: 'test-return-stage',
      stars: 3,
      bestRemainingBaseHp: 90,
    });

    const stored = SessionProgressStore.getResult('test-return-stage');
    expect(stored).not.toBeNull();
    expect(stored!.stars).toBe(3);
    expect(stored!.bestRemainingBaseHp).toBe(90);
  });
});
