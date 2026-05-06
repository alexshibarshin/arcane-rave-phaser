# Thorn Fan Shotgun

## Task Intent

This task extends the projectile family from single-shot to shotgun spread and uses that behavior to make `Thorn Fan` work as a finisher. It is a narrow archetype-extension slice on top of the projectile foundation from `Ruby Needle`.

This slice exists so the overhaul can deliver a second projectile feel without adding a new runtime family. The player-facing result is that `Thorn Fan` fires multiple pellets in an authored cone around the aimed centerline and uses finisher activation semantics.

This task should not add secondary effects, split behavior, or volley scheduling.

## Relevant Context

- `Shotgun spread` has authored `projectileCount` and `coneAngleDeg`.
- Projectile directions are evenly distributed within the cone around the aimed centerline.
- Projectile abilities still target the frontmost enemy.
- Finisher power snapshot is captured once at activation start and applies to the entire output of the activation, including all spawned projectiles.
- `Thorn Fan` is a green finisher projectile pawn with no secondary effect and red output note color.

## In Scope

- Add shotgun spread support to the projectile family.
- Make `Thorn Fan` use authored spread values.
- Ensure finisher source snapshot behavior applies across all pellets.

## Out of Scope

- Burst volley scheduling.
- Bounce or split behaviors.
- Base heal, buffs, or other secondary effects.

## Detailed Requirements

- Extend projectile spawning helpers to support authored multi-shot cone fire.
- At activation:
  - select the frontmost enemy
  - compute the aimed centerline
  - distribute projectile directions evenly inside the authored cone
  - spawn all pellets immediately
- All pellets from one activation must share the same activation-start source snapshot.
- Each pellet uses standard projectile collision/lifetime rules and dies on first valid hit.
- Note-rule mutation for the finisher still occurs after cast creation.

## Acceptance Criteria

- [ ] `Thorn Fan` fires multiple projectiles in an authored cone instead of a single straight shot.
- [ ] All pellets use the same finisher activation snapshot and follow normal projectile collision/lifetime rules.
- [ ] The shotgun implementation extends the shared projectile family rather than living in pawn-specific logic.

## Technical Notes

- Build directly on the projectile runtime family from task 04 instead of introducing a second projectile system.
- Keep spread angle math deterministic and symmetric around the centerline so authored tuning remains understandable.
- If projectile visuals are already state-driven, this slice should reuse the same render path with multiple instances.

## Implementation Plan

1. Extend projectile spawn helpers to support `projectileCount` plus `coneAngleDeg`.
2. Add authored tuning values for `Thorn Fan` in content if they were stubbed in task 01.
3. Refactor `Thorn Fan` activation to use the shared shotgun path and finisher snapshot capture.
4. Validate even angular distribution and multi-hit behavior on clustered enemies.
5. Ensure note-rule mutation and output note emission still happen correctly after cast creation.

## Additional Notes

- Balance note: shotgun readability matters more than pellet-perfect realism; prefer a clear fan shape over noisy spread randomness for MVP.

## Blocked By

- Blocked by 04-task-ruby-needle-projectile

## Type

AFK

## Design Spec Reference

- [Projectile Rules](../design-spec.md#projectile-rules)
- [Source Snapshot Rules](../design-spec.md#source-snapshot-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
