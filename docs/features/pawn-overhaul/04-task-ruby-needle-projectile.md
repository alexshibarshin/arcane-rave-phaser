# Ruby Needle Projectile

## Task Intent

This task delivers the first end-to-end combat tracer bullet for the overhaul: a real projectile-based pawn that fires at the frontmost enemy and can miss if the shot expires before colliding. It should make `Ruby Needle` fully functional and establish the projectile runtime family as a reusable combat system.

This slice exists because the current prototype resolves most attacks as immediate hits, which blocks meaningful pawn differentiation. The player-facing result is that one concrete pawn now produces a visible shot in the world, and the combat runtime gains the post-activation projectile update phase needed for future projectile pawns.

This task should not include shotgun, burst volley, bounce, split, or secondary effects. Keep the slice narrow and foundational.

## Relevant Context

- Projectiles are real runtime entities with current position, previous position, direction, speed, remaining lifetime, collision rules, and source references.
- Projectile targeting for MVP uses the `frontmost enemy`.
- Projectiles use fired direction only and are not homing.
- Collision must use a swept movement segment, not just end-position overlap.
- Default projectile behavior is to die on first valid hit.
- If no enemy exists at activation time, the combat effect is not created, but the note rule still resolves.
- Generator note rules always cast regardless of note packet state.

## In Scope

- Implement the authoritative projectile runtime state family.
- Insert the projectile update phase into the combat runtime loop.
- Make `Ruby Needle` spawn one real projectile toward the frontmost enemy.
- Apply damage through the projectile hit path and emit semantic projectile events if the architecture supports them already.

## Out of Scope

- Shotgun spread.
- Burst volley scheduling.
- Bounce, split, or any secondary effect behavior.
- Explosion, beam, zone, status, or pawn-buff families.
- Finisher-specific source snapshots beyond preserving the architecture for them.

## Detailed Requirements

- Extend combat runtime state with a projectile collection that stores enough data to update, collide, and clean up projectiles.
- Update the main combat loop so projectile updates happen after slot activations and before outcome evaluation.
- At `Ruby Needle` activation:
  - select the frontmost alive+spawned enemy
  - compute aimed direction from the fire origin to the chosen target anchor
  - spawn one projectile runtime object
- Each frame:
  - advance projectile position by speed and dt
  - retain previous position for swept collision
  - test collision against valid enemies using the movement segment
  - apply one hit and then destroy the projectile
  - destroy projectiles whose lifetime expires without hitting
- Preserve architecture for later source snapshots by storing source references/snapshot data on projectile instances even if `Ruby Needle` itself is simple.
- Clear projectile runtime state on wave end.

## Acceptance Criteria

- [ ] `Ruby Needle` creates a visible projectile that travels through the world toward the frontmost enemy instead of resolving as an immediate hit.
- [ ] Projectile collision uses swept movement and destroys the projectile on the first valid hit or on lifetime expiry.
- [ ] The combat runtime owns authoritative projectile state and clears it correctly on wave end.

## Technical Notes

- Likely files include `src/combat/CombatRuntime.ts`, `src/combat/CombatActivation.ts`, and a new helper such as `src/combat/CombatProjectiles.ts`.
- Keep projectile family behavior separate from activation-time orchestration. `CombatActivation` should spawn runtime effects, not own their full lifecycle updates.
- Use semantic events only for one-shot feedback; persistent projectile visuals should later derive from authoritative runtime state.
- Follow the fixed combat update insertion order recommended by the design spec.

## Implementation Plan

1. Inspect the current combat runtime update order and identify where to insert projectile updates.
2. Introduce projectile runtime types plus helper functions for spawn, update, collision, and cleanup.
3. Refactor `Ruby Needle` activation to create a projectile runtime object instead of directly damaging a target.
4. Implement frontmost-enemy targeting if it is not already reusable in helper form.
5. Connect projectile hits into existing damage application so enemy HP/state stays authoritative.
6. Add minimal presentation plumbing needed for persistent projectile rendering if current combat view expects runtime state.
7. Validate wave-end cleanup and the no-target-at-cast edge case.

## Additional Notes

- Debugging note: an easy failure mode is tunneling through enemies if only end-position overlap is checked.

## Blocked By

- Blocked by 01-task-pawn-content-foundation
- Blocked by 02-task-pawn-atlas-integration

## Type

AFK

## Design Spec Reference

- [Projectile Rules](../design-spec.md#projectile-rules)
- [Combat Update Loop Changes](../design-spec.md#combat-update-loop-changes)
- [Data Flow](../design-spec.md#data-flow)
