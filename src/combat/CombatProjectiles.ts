import { getCombatPawnDefinitionById, type CombatPawnDefinition } from '@config/CombatContentConfig';
import { applyCombatHit } from './CombatDamage';
import {
  createDirectionToEnemy,
  createRuntimeEffectId,
  createVolleyAngles,
  getSlotOrigin,
  resolveTarget,
  rotateDirection,
  segmentIntersectsEnemy,
} from './CombatTargeting';
import {
  applyEnemySlow,
} from './CombatStatuses';
import {
  pushCombatProjectileHit,
  pushCombatProjectileSpawned,
} from './CombatRuntimeEvents';
import type {
  CombatProjectileRuntime,
  CombatQueuedVolleyRuntime,
  CombatRuntime,
  CombatSourceSnapshot,
  NoteColor,
} from './CombatRuntime';

export interface SpawnProjectileOptions {
  runtime: CombatRuntime;
  pawn: CombatPawnDefinition;
  slotIndex: number;
  color: NoteColor;
  originX: number;
  originY: number;
  directionX: number;
  directionY: number;
  damage: number;
  projectileSpeedPxPerSec: number;
  projectileLifetimeMs: number;
  sourceSnapshot: CombatSourceSnapshot;
  bounceRemaining?: number;
  splitChildCount?: number;
  splitConeAngleDeg?: number;
  splitChildLifetimeMs?: number;
  ignoredEnemyRuntimeIds?: string[];
  canSplit?: boolean;
}

export function advanceCombatQueuedVolleys(runtime: CombatRuntime): void {
  const remainingVolleys: CombatQueuedVolleyRuntime[] = [];

  for (const volley of runtime.queuedVolleys) {
    while (volley.shotsRemaining > 0 && volley.nextFireAtMs <= runtime.combatElapsedMs) {
      emitVolleyShot(runtime, volley);
      volley.shotsRemaining -= 1;
      volley.nextFireAtMs += volley.intervalMs;
    }

    if (volley.shotsRemaining > 0) {
      remainingVolleys.push(volley);
    }
  }

  runtime.queuedVolleys = remainingVolleys;
}

export function advanceCombatProjectiles(runtime: CombatRuntime, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;
  const survivingProjectiles: CombatProjectileRuntime[] = [];

  for (const projectile of runtime.projectiles) {
    projectile.previousX = projectile.x;
    projectile.previousY = projectile.y;
    projectile.x += projectile.directionX * projectile.speedPxPerSec * deltaSeconds;
    projectile.y += projectile.directionY * projectile.speedPxPerSec * deltaSeconds;

    const hitEnemy = runtime.enemies.find((enemy) =>
      !projectile.ignoredEnemyRuntimeIds.includes(enemy.runtimeId)
      && enemy.spawned
      && enemy.state !== 'dead'
      && enemy.currentHp > 0
      && segmentIntersectsEnemy(projectile.previousX, projectile.previousY, projectile.x, projectile.y, enemy),
    );

    if (!hitEnemy) {
      projectile.remainingLifetimeMs -= deltaMs;
      if (projectile.remainingLifetimeMs > 0) {
        survivingProjectiles.push(projectile);
      }
      continue;
    }

    if (projectile.remainingLifetimeMs <= 0) {
      survivingProjectiles.push(projectile);
      continue;
    }

    resolveProjectileHit(runtime, projectile, hitEnemy.runtimeId);

    if (projectile.bounceRemaining > 0 && hitEnemy.currentHp > 0) {
      const nextTarget = resolveTarget(runtime, 'frontmost-enemy', { excludedEnemyRuntimeIds: [hitEnemy.runtimeId] });

      if (nextTarget) {
        const nextDirection = createDirectionToEnemy(projectile.x, projectile.y, nextTarget);
        projectile.directionX = nextDirection.x;
        projectile.directionY = nextDirection.y;
        projectile.bounceRemaining -= 1;
        projectile.ignoredEnemyRuntimeIds = [hitEnemy.runtimeId];
        survivingProjectiles.push(projectile);
      }
    }
  }

  runtime.projectiles = survivingProjectiles;
}

export function spawnSingleProjectile(options: SpawnProjectileOptions): void {
  const projectile: CombatProjectileRuntime = {
    runtimeId: createRuntimeEffectId(options.runtime, 'projectile'),
    pawnId: options.pawn.id,
    slotIndex: options.slotIndex,
    color: options.color,
    x: options.originX,
    y: options.originY,
    previousX: options.originX,
    previousY: options.originY,
    directionX: options.directionX,
    directionY: options.directionY,
    speedPxPerSec: options.projectileSpeedPxPerSec,
    remainingLifetimeMs: options.projectileLifetimeMs,
    damage: options.damage,
    sourceSnapshot: options.sourceSnapshot,
    bounceRemaining: options.bounceRemaining ?? 0,
    splitChildCount: options.splitChildCount ?? 0,
    splitConeAngleDeg: options.splitConeAngleDeg ?? 0,
    splitChildLifetimeMs: options.splitChildLifetimeMs ?? 0,
    ignoredEnemyRuntimeIds: options.ignoredEnemyRuntimeIds ?? [],
    canSplit: options.canSplit ?? false,
  };

  options.runtime.projectiles.push(projectile);
  pushCombatProjectileSpawned(options.runtime, projectile.runtimeId, options.slotIndex, options.pawn.id);
}

export function spawnShotgunProjectiles(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  projectileCount: number,
  coneAngleDeg: number,
  projectileSpeedPxPerSec: number,
  projectileLifetimeMs: number,
  damage: number,
): void {
  const slot = runtime.slots[slotIndex];
  const origin = slot ? getSlotOrigin(slot) : null;
  const target = resolveTarget(runtime, 'frontmost-enemy');

  if (!slot || !origin || !target) {
    return;
  }

  const centerDirection = createDirectionToEnemy(origin.x, origin.y, target);

  for (const angle of createVolleyAngles(projectileCount, coneAngleDeg)) {
    const direction = rotateDirection(centerDirection, angle);
    spawnSingleProjectile({
      runtime,
      pawn,
      slotIndex,
      color: pawn.color,
      originX: origin.x,
      originY: origin.y,
      directionX: direction.x,
      directionY: direction.y,
      damage,
      projectileSpeedPxPerSec,
      projectileLifetimeMs,
      sourceSnapshot,
      bounceRemaining: pawn.ability.secondaryEffect?.kind === 'bounce-on-hit' ? pawn.ability.secondaryEffect.maxBounces : 0,
      splitChildCount: pawn.ability.secondaryEffect?.kind === 'split-on-hit' ? pawn.ability.secondaryEffect.childCount : 0,
      splitConeAngleDeg: pawn.ability.secondaryEffect?.kind === 'split-on-hit' ? pawn.ability.secondaryEffect.splitConeAngleDeg : 0,
      splitChildLifetimeMs: pawn.ability.secondaryEffect?.kind === 'split-on-hit' ? pawn.ability.secondaryEffect.childLifetimeMs : 0,
      canSplit: pawn.ability.secondaryEffect?.kind === 'split-on-hit',
    });
  }
}

export function queueProjectileVolley(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  volleyShotCount: number,
  volleyIntervalMs: number,
  projectileSpeedPxPerSec: number,
  projectileLifetimeMs: number,
  damage: number,
): void {
  runtime.queuedVolleys.push({
    runtimeId: createRuntimeEffectId(runtime, 'volley'),
    pawnId: pawn.id,
    slotIndex,
    color: pawn.color,
    damage,
    shotsRemaining: volleyShotCount,
    intervalMs: volleyIntervalMs,
    nextFireAtMs: runtime.combatElapsedMs,
    projectileSpeedPxPerSec,
    projectileLifetimeMs,
    sourceSnapshot,
    bounceRemaining: pawn.ability.secondaryEffect?.kind === 'bounce-on-hit' ? pawn.ability.secondaryEffect.maxBounces : 0,
    splitChildCount: pawn.ability.secondaryEffect?.kind === 'split-on-hit' ? pawn.ability.secondaryEffect.childCount : 0,
    splitConeAngleDeg: pawn.ability.secondaryEffect?.kind === 'split-on-hit' ? pawn.ability.secondaryEffect.splitConeAngleDeg : 0,
    splitChildLifetimeMs: pawn.ability.secondaryEffect?.kind === 'split-on-hit' ? pawn.ability.secondaryEffect.childLifetimeMs : 0,
  });
}

export function clearCombatProjectiles(runtime: CombatRuntime): void {
  runtime.projectiles = [];
  runtime.queuedVolleys = [];
}

function emitVolleyShot(runtime: CombatRuntime, volley: CombatQueuedVolleyRuntime): void {
  const slot = runtime.slots[volley.slotIndex];
  const origin = slot ? getSlotOrigin(slot) : null;
  const target = resolveTarget(runtime, 'frontmost-enemy');
  const pawn = getCombatPawnDefinitionById(volley.pawnId);

  if (!slot || !origin || !target || !pawn) {
    return;
  }

  const direction = createDirectionToEnemy(origin.x, origin.y, target);
  spawnSingleProjectile({
    runtime,
    pawn,
    slotIndex: volley.slotIndex,
    color: volley.color,
    originX: origin.x,
    originY: origin.y,
    directionX: direction.x,
    directionY: direction.y,
    damage: volley.damage,
    projectileSpeedPxPerSec: volley.projectileSpeedPxPerSec,
    projectileLifetimeMs: volley.projectileLifetimeMs,
    sourceSnapshot: volley.sourceSnapshot,
    bounceRemaining: volley.bounceRemaining,
    splitChildCount: volley.splitChildCount,
    splitConeAngleDeg: volley.splitConeAngleDeg,
    splitChildLifetimeMs: volley.splitChildLifetimeMs,
    canSplit: volley.splitChildCount > 0,
  });
}

function resolveProjectileHit(runtime: CombatRuntime, projectile: CombatProjectileRuntime, enemyRuntimeId: string): void {
  const enemy = runtime.enemies.find((item) => item.runtimeId === enemyRuntimeId);
  const pawn = getCombatPawnDefinitionById(projectile.pawnId);

  if (!enemy || !pawn) {
    return;
  }

  const healPercent = pawn.ability.secondaryEffect?.kind === 'base-heal-from-damage'
    ? pawn.ability.secondaryEffect.healPercent
    : undefined;
  applyCombatHit({
    runtime,
    enemy,
    slotIndex: projectile.slotIndex,
    pawn,
    baseDamage: projectile.damage,
    sourceSnapshot: projectile.sourceSnapshot,
    attackerColor: projectile.color,
    healPercent,
  });
  pushCombatProjectileHit(runtime, projectile.runtimeId, enemy.runtimeId, projectile.slotIndex, projectile.pawnId);

  if (pawn.ability.secondaryEffect?.kind === 'slow-on-hit') {
    applyEnemySlow(
      runtime,
      enemy.runtimeId,
      pawn.ability.secondaryEffect.slowMultiplier,
      pawn.ability.secondaryEffect.durationMs,
    );
  }

  if (projectile.canSplit && projectile.splitChildCount > 0) {
    for (const angle of createVolleyAngles(projectile.splitChildCount, projectile.splitConeAngleDeg)) {
      const direction = rotateDirection(
        { x: projectile.directionX, y: projectile.directionY },
        angle,
      );
      spawnSingleProjectile({
        runtime,
        pawn,
        slotIndex: projectile.slotIndex,
        color: projectile.color,
        originX: projectile.x,
        originY: projectile.y,
        directionX: direction.x,
        directionY: direction.y,
        damage: projectile.damage,
        projectileSpeedPxPerSec: projectile.speedPxPerSec,
        projectileLifetimeMs: projectile.splitChildLifetimeMs,
        sourceSnapshot: projectile.sourceSnapshot,
        ignoredEnemyRuntimeIds: [enemy.runtimeId],
        canSplit: false,
      });
    }
  }
}
