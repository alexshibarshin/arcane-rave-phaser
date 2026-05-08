import type { CombatPawnDefinition, CombatProjectileAbilityDefinition } from '@config/CombatContentConfig';
import { queueProjectileVolley, spawnShotgunProjectiles, spawnSingleProjectile } from '@combat/CombatProjectiles';
import { createDirectionToEnemy, getSlotOrigin, resolveTarget } from '@combat/CombatTargeting';
import type { CombatAbilityExecutor, CombatAbilityExecuteParams } from './executors';

export class ProjectileExecutor implements CombatAbilityExecutor {
  execute(params: CombatAbilityExecuteParams): void {
    const ability = params.pawn.ability as CombatProjectileAbilityDefinition;
    resolveProjectileAbility(params, ability);
  }
}

function resolveProjectileAbility(
  params: CombatAbilityExecuteParams,
  ability: CombatProjectileAbilityDefinition,
): void {
  const origin = getSlotOrigin(params.slot);
  const target = resolveTarget(params.runtime, ability.targeting);

  if (!origin || !target) {
    return;
  }

  if (ability.pattern === 'single-shot') {
    const direction = createDirectionToEnemy(origin.x, origin.y, target);
    spawnSingleProjectile({
      runtime: params.runtime,
      pawn: params.pawn,
      slotIndex: params.slot.slotIndex,
      color: params.pawn.color,
      originX: origin.x,
      originY: origin.y,
      directionX: direction.x,
      directionY: direction.y,
      damage: ability.damage,
      projectileSpeedPxPerSec: ability.projectileSpeed,
      projectileLifetimeMs: ability.projectileLifetimeMs,
      sourceSnapshot: params.sourceSnapshot,
    });
    return;
  }

  if (ability.pattern === 'shotgun-spread') {
    spawnShotgunProjectiles(
      params.runtime,
      params.pawn,
      params.slot.slotIndex,
      params.sourceSnapshot,
      (ability.projectileCount ?? 1) + params.mutations.projectileCountBonus,
      ability.coneAngleDeg ?? 0,
      ability.projectileSpeed,
      ability.projectileLifetimeMs,
      ability.damage,
    );
    return;
  }

  queueProjectileVolley(
    params.runtime,
    params.pawn,
    params.slot.slotIndex,
    params.sourceSnapshot,
    (ability.volleyShotCount ?? 1) + params.mutations.volleyShotCountBonus,
    ability.volleyIntervalMs ?? 1,
    ability.projectileSpeed,
    ability.projectileLifetimeMs,
    ability.damage,
  );
}
