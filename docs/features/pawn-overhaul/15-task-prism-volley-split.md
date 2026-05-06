# Prism Volley Split

## Task Intent

This task completes the final authored projectile rider by adding split-on-hit child projectiles for `Prism Volley`. It builds on burst-volley scheduling and turns one projectile impact into a controlled child spread.

This slice exists because the authored roster includes a projectile pawn whose identity depends on chained sub-shots splitting into follow-up coverage. The player-facing result is that `Prism Volley` fires repeated shots, and on hit each parent shot can burst into child shots that fan outward while ignoring the enemy that spawned them.

This task should focus only on split-on-hit behavior and reuse existing burst-volley projectile infrastructure.

## Relevant Context

- `Prism Volley` is a blue generator projectile pawn with `burst volley` primary pattern and `split on hit` secondary effect.
- On split:
  - parent projectile dies on hit
  - child projectiles spawn with authored `childCount` and `splitConeAngleDeg`
  - child directions are evenly distributed within a cone centered on the parent direction at impact time
  - children fully ignore the enemy that spawned them for their entire lives
  - children receive their own authored lifetimes
  - children inherit the source-side damage snapshot
  - children do not recursively split or bounce in MVP
- Burst-volley sub-shots still re-aim toward the current frontmost enemy at fire time.

## In Scope

- Add split-on-hit behavior to projectile instances.
- Make `Prism Volley` use burst volley plus split behavior.
- Preserve ignore-origin-target and no-recursion rules.

## Out of Scope

- Bounce on split children.
- Recursive splitting.
- New healing, status, explosion, or buff systems.

## Detailed Requirements

- Extend projectile hit resolution so a projectile may optionally spawn child projectiles on its first hit.
- When splitting:
  - destroy the parent projectile
  - spawn the authored number of child projectiles
  - center the child cone on the parent projectile’s impact-time direction
  - mark the original hit enemy as ignored for all child lifetimes
  - apply inherited source snapshot values to children
  - use authored child lifetimes
- Child projectiles follow normal collision/lifetime rules against all valid enemies except the ignored source enemy.
- Split children must not recursively split or bounce even if the shared projectile family supports those behaviors for other authored pawns.

## Acceptance Criteria

- [ ] `Prism Volley` parent shots split into authored child projectiles on hit with evenly distributed cone directions.
- [ ] Child projectiles ignore the enemy that spawned them for their full lifetime and inherit the parent activation snapshot.
- [ ] Split children do not recursively split or bounce in MVP.

## Technical Notes

- Build on the volley-capable projectile infrastructure from task 11 rather than creating a separate split system.
- Keep ignore-target data explicit on child projectile instances to avoid accidental immediate self-collision with the impact target.
- Since `Prism Volley` is inactive in the temporary deck, validate via direct setup/tests as needed.

## Implementation Plan

1. Extend projectile runtime/config types with optional split-on-hit authored data.
2. Update projectile hit resolution to branch into child spawning when applicable.
3. Add child projectile spawn helpers that inherit source snapshot data and set ignore-target constraints.
4. Refactor `Prism Volley` content/activation to use the existing burst-volley path with split behavior enabled.
5. Validate parent destruction, child spread symmetry, ignore-target behavior, and no-recursion constraints.

## Additional Notes

- Readability note: the split cone should feel intentional and readable; deterministic spacing is preferable to random spread here.

## Blocked By

- Blocked by 11-task-arc-bounce-volley

## Type

AFK

## Design Spec Reference

- [Projectile Rules](../design-spec.md#projectile-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
- [Temporary Active Deck](../design-spec.md#temporary-active-deck)
