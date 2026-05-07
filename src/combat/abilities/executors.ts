import type { CombatPawnPrimaryArchetype } from '@config/CombatContentConfig';
import type { CombatPawnDefinition } from '@config/CombatContentConfig';
import type { SlotModifierMutations } from '@modifiers/SlotModifierResolver';
import type { CombatRuntime, CombatSlotRuntime, CombatSourceSnapshot } from '@combat/CombatRuntime';
import { ProjectileExecutor } from './ProjectileExecutor';
import { ExplosionExecutor } from './ExplosionExecutor';
import { BeamExecutor } from './BeamExecutor';
import { ZoneExecutor } from './ZoneExecutor';

export interface CombatAbilityExecuteParams {
  runtime: CombatRuntime;
  slot: CombatSlotRuntime;
  pawn: CombatPawnDefinition;
  sourceSnapshot: CombatSourceSnapshot;
  mutations: SlotModifierMutations;
}

export interface CombatAbilityExecutor {
  execute(params: CombatAbilityExecuteParams): void;
}

export const ABILITY_EXECUTORS: Record<CombatPawnPrimaryArchetype, CombatAbilityExecutor> = {
  projectile: new ProjectileExecutor(),
  explosion: new ExplosionExecutor(),
  beam: new BeamExecutor(),
  zone: new ZoneExecutor(),
};
