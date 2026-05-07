import type { CombatZoneAbilityDefinition } from '@config/CombatContentConfig';
import { applyNextSlotDamageBuff } from '@combat/CombatPawnBuffs';
import { createTargetedZone } from '@combat/CombatZones';
import type { CombatAbilityExecutor, CombatAbilityExecuteParams } from './executors';

export class ZoneExecutor implements CombatAbilityExecutor {
  execute(params: CombatAbilityExecuteParams): void {
    const ability = params.pawn.ability as CombatZoneAbilityDefinition;
    resolveZoneAbility(params, ability);
  }
}

function resolveZoneAbility(
  params: CombatAbilityExecuteParams,
  ability: CombatZoneAbilityDefinition,
): void {
  const effectiveRadius = ability.radius * params.mutations.radiusMultiplier;

  createTargetedZone(
    params.runtime,
    params.pawn,
    params.slot.slotIndex,
    params.sourceSnapshot,
    ability.damage,
    effectiveRadius,
    ability.durationMs,
    ability.tickIntervalMs,
    ability.targeting,
  );

  if (ability.secondaryEffect?.kind === 'next-slot-damage-buff') {
    applyNextSlotDamageBuff(
      params.runtime,
      params.slot.slotIndex,
      params.pawn.id,
      ability.secondaryEffect.damageBonusPercent,
    );
  }
}
