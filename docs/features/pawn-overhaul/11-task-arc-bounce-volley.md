# Arc Bounce Volley

## Task Intent

This task extends the projectile family with burst-volley scheduling and one-bounce chaining so `Arc Bounce` can function as an authored advanced finisher. It is a focused projectile-family expansion task for the last active-deck projectile finisher.

This slice exists because the active deck already includes `Arc Bounce`, and its feel depends on time-staggered sub-shots plus a single bounce to another target. The player-facing result is that one activation can emit a short sequence of shots over time, each capable of chaining once to a different enemy.

This task should not include split-on-hit; that belongs to `Prism Volley` later.

## Relevant Context

- `Burst volley` spawns a series of sub-shots over time, not a single instant packet.
- Each sub-shot uses the current bound origin and re-aims toward the current frontmost enemy.
- `Bounce` can happen once only.
- After first hit, the projectile retargets to the frontmost enemy excluding the first hit target.
- If no second target exists, the projectile dies.
- Lifetime does not reset after bounce.
- Projectile dies after second hit.
- Finisher/source snapshots apply to the entire activation output, including all volley sub-shots.
- `Arc Bounce` is a blue finisher projectile pawn with green output note.

## In Scope

- Add burst-volley scheduling/runtime support.
- Add one-bounce projectile behavior.
- Make `Arc Bounce` use both behaviors together.
- Preserve activation-start snapshots across the entire volley.

## Out of Scope

- Split-on-hit child projectiles.
- Healing, slow, burn zones, or pawn buffs.
- Homing projectiles; bounce should still be a single retarget event under authored rules.

## Detailed Requirements

- Extend projectile-related runtime state so an activation can schedule future sub-shots over time.
- Volley sub-shots must:
  - use the current source origin when fired
  - reselect frontmost enemy at each sub-shot fire time
  - inherit the original activation-start snapshot
- Add one-bounce behavior to projectile instances:
  - on first hit, find a valid second target excluding the first target
  - recompute a fired direction toward that second target
  - keep the remaining lifetime rather than resetting it
  - die after the second hit
- If there is no valid second target after first hit, the projectile ends immediately.
- Ensure normal no-target-at-cast behavior still applies for the initial activation and for each later sub-shot if no enemies exist then.

## Acceptance Criteria

- [ ] `Arc Bounce` emits a timed burst volley rather than one instant packet of shots.
- [ ] Individual volley projectiles can bounce exactly once to a different enemy and then die after the second hit.
- [ ] All sub-shots from one activation share the same activation-start damage snapshot even though they fire over time.

## Technical Notes

- This likely requires either a projectile-side scheduler or a small dedicated volley runtime family. Keep the responsibility narrow and data-driven.
- The design spec says each sub-shot re-aims toward the current frontmost enemy, so volley scheduling should not freeze all aim data at activation time except for the source snapshot.
- Avoid turning bounce into homing; the bounced shot should still travel by fired direction after retarget.

## Implementation Plan

1. Extend projectile runtime/support code to represent volley schedules and future sub-shot emission.
2. Add bounce-capable projectile instance data and hit-resolution branching for the single allowed bounce.
3. Refactor `Arc Bounce` activation to capture a source snapshot once and seed the volley schedule.
4. Ensure each sub-shot uses current origin and current frontmost target at fire time.
5. Validate edge cases:
   - no enemies at later sub-shot times
   - only one enemy alive on first hit
   - lifetime expiring before a bounced projectile can connect

## Additional Notes

- Readability note: preserve a crisp cadence between sub-shots so the volley is visually understandable instead of looking like simultaneous spread fire.

## Blocked By

- Blocked by 04-task-ruby-needle-projectile

## Type

AFK

## Design Spec Reference

- [Projectile Rules](../design-spec.md#projectile-rules)
- [Source Snapshot Rules](../design-spec.md#source-snapshot-rules)
- [Temporary Active Deck](../design-spec.md#temporary-active-deck)
