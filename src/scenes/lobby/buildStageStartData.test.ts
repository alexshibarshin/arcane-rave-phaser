import { describe, expect, it } from 'vitest';
import { buildStageStartData } from './buildStageStartData';

describe('buildStageStartData', () => {
  it('copies the current session deck snapshot into the StageScene payload', () => {
    const payload = buildStageStartData({
      stageId: 'redline-routine',
      activeDeckIds: [
        'lifebloom-scatter',
        'pulse-garden',
        'prism-volley',
        'pressure-burst',
        'ruby-needle',
        'bass-bomb',
        'heatline',
        'moss-patch',
      ],
      settings: { mergeRule: 'fixed', sellEnabled: true, repositionCostEnabled: true },
    });

    expect(payload).toEqual({
      stageId: 'redline-routine',
      activeDeckIds: [
        'lifebloom-scatter',
        'pulse-garden',
        'prism-volley',
        'pressure-burst',
        'ruby-needle',
        'bass-bomb',
        'heatline',
        'moss-patch',
      ],
      settings: { mergeRule: 'fixed', sellEnabled: true, repositionCostEnabled: true },
    });
  });
});
