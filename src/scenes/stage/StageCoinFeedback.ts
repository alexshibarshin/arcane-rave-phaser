import type { StageRuntime } from '@stage/StageRuntime';

export interface StageCoinFeedback {
  delta: number;
  label: string;
  color: string;
}

export function getStageCoinFeedback(
  previousCoins: number | null,
  nextCoins: number,
  phase: StageRuntime['phase'],
): StageCoinFeedback | null {
  if (previousCoins === null || phase === 'combat') {
    return null;
  }

  const delta = nextCoins - previousCoins;
  if (delta === 0) {
    return null;
  }

  return {
    delta,
    label: delta > 0 ? `+${delta}` : `${delta}`,
    color: delta > 0 ? '#8ef7b2' : '#ff9e8e',
  };
}
