import { SessionProgressStore } from '../../session/SessionProgressStore';

export function handleReturnToLobby(payload: {
  stageId: string;
  stars: number;
  remainingBaseHp: number;
}): { stageId: string; stars: number; bestRemainingBaseHp: number } {
  const result = {
    stageId: payload.stageId,
    stars: payload.stars,
    bestRemainingBaseHp: payload.remainingBaseHp,
  };
  SessionProgressStore.setResult(payload.stageId, result);
  return result;
}
