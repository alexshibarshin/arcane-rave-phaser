import type { CombatExplosionAbilityDefinition } from '@config/CombatContentConfig';
import { createImmediateTargetedExplosion, queueDelayedExplosion } from '@combat/CombatExplosions';
import type { CombatAbilityExecutor, CombatAbilityExecuteParams } from './executors';

export class ExplosionExecutor implements CombatAbilityExecutor {
  execute(params: CombatAbilityExecuteParams): void {
    const ability = params.pawn.ability as CombatExplosionAbilityDefinition;
    resolveExplosionAbility(params, ability);
  }
}

function resolveExplosionAbility(
  params: CombatAbilityExecuteParams,
  ability: CombatExplosionAbilityDefinition,
): void {
  const effectiveRadius = ability.radius * params.mutations.radiusMultiplier;

  if (ability.pattern === 'targeted-burst') {
    createImmediateTargetedExplosion(
      params.runtime,
      params.pawn,
      params.slot.slotIndex,
      params.sourceSnapshot,
      ability.damage,
      effectiveRadius,
      ability.targeting,
    );
    return;
  }

  queueDelayedExplosion(
    params.runtime,
    params.pawn,
    params.slot.slotIndex,
    params.sourceSnapshot,
    ability.damage,
    effectiveRadius,
    ability.delayMs ?? 0,
    ability.targeting,
  );
}
