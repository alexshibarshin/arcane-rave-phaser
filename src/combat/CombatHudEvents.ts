import { emit } from '@events/EventBus';
import type { CombatRuntime, CombatState } from './CombatRuntime';
import {
  createCombatHudBridgeEvents,
  createCombatStateTransitionEvents,
} from './CombatHudBridge';

export function publishCombatHudSnapshot(runtime: CombatRuntime): void {
  for (const event of createCombatHudBridgeEvents(runtime)) {
    emit(event.event, event.payload);
  }
}

export function publishCombatStateTransition(
  previousState: CombatState,
  nextState: CombatState,
): void {
  for (const event of createCombatStateTransitionEvents(previousState, nextState)) {
    emit(event.event, event.payload);
  }
}

export function publishPendingCombatEvents(runtime: CombatRuntime): void {
  for (const event of runtime.effects.pendingEvents) {
    emit(event.event, event.payload);
  }
}
