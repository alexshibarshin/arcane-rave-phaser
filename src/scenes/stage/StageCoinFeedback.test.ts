import { describe, expect, it } from 'vitest';
import { getStageCoinFeedback } from './StageCoinFeedback';

describe('getStageCoinFeedback', () => {
  it('skips feedback before the first presentation sync', () => {
    expect(getStageCoinFeedback(null, 6, 'build')).toBeNull();
  });

  it('skips feedback when coins do not change', () => {
    expect(getStageCoinFeedback(6, 6, 'build')).toBeNull();
  });

  it('formats positive coin gains with a plus sign', () => {
    expect(getStageCoinFeedback(4, 9, 'build')).toEqual({
      delta: 5,
      label: '+5',
      color: '#8ef7b2',
    });
  });

  it('formats coin spending as a negative value', () => {
    expect(getStageCoinFeedback(6, 5, 'build')).toEqual({
      delta: -1,
      label: '-1',
      color: '#ff9e8e',
    });
  });

  it('does not show feedback during combat phase', () => {
    expect(getStageCoinFeedback(6, 9, 'combat')).toBeNull();
  });
});
