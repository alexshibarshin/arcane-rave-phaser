import type { CombatBeamAbilityDefinition, CombatPawnDefinition, CombatTargetingRule } from '@config/CombatContentConfig';
import { createBeam } from '@combat/CombatBeams';
import { spawnExtraBeams } from '@combat/CombatExtraBeam';
import type { CombatAbilityExecutor, CombatAbilityExecuteParams } from './executors';

export class BeamExecutor implements CombatAbilityExecutor {
  execute(params: CombatAbilityExecuteParams): void {
    const ability = params.pawn.ability as CombatBeamAbilityDefinition;

    resolveBeamAbility(params, ability, ability.targeting);

    if (params.mutations.extraBeamCount > 0) {
      spawnExtraBeams(
        params.runtime,
        params.slot.slotIndex,
        params.pawn,
        ability,
        params.sourceSnapshot,
        params.mutations.extraBeamCount,
      );
    }
  }
}

function resolveBeamAbility(
  params: CombatAbilityExecuteParams,
  ability: CombatBeamAbilityDefinition,
  targeting: CombatTargetingRule,
): void {
  createBeam(
    params.runtime,
    params.pawn,
    params.slot.slotIndex,
    params.sourceSnapshot,
    ability.damage,
    ability.durationMs,
    ability.tickIntervalMs ?? null,
    ability.pattern === 'lock-on-beam' ? 'lock-on' : 'sweeping',
    ability.pattern === 'sweeping-beam' ? ability.sweepArcDeg ?? null : null,
    ability.pattern === 'sweeping-beam' ? ability.sweepLengthPx ?? null : null,
    ability.pattern === 'sweeping-beam' ? ability.sweepHitRadiusPx ?? null : null,
    targeting,
  );
}
