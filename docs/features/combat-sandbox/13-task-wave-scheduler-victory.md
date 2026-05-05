# Wave Scheduler and Victory

## Task Intent

Replace any temporary enemy bootstrap logic with the real first-wave scheduler for `Combat Sandbox`. The combat runtime must support absolute-time `sub-wave` activation, per-sub-wave finite `spawn bag` expansion, overlapping active sub-waves, honest remaining-enemy counters, and victory evaluation that only fires when the full scheduled wave has truly resolved.

This slice exists so combat can finish with legitimate `victory` instead of only demonstrating isolated enemy pressure or defeat. It is the orchestration layer that turns enemy simulation into a proper wave loop. Keep the task focused on wave scheduling, spawn bookkeeping, HUD-facing counts, and win-condition evaluation. Pause hardening and VFX polish belong to later tasks.

## Relevant Context

- The first feature version contains exactly one `wave`, but that wave can contain multiple `sub-wave`.
- Each `sub-wave` is defined by:
  - absolute `startTimeMs` from wave start;
  - `spawnIntervalMs`;
  - enemy composition as `enemyId -> count`.
- When a `sub-wave` activates, its composition expands into a finite `spawn bag`.
- Spawn bags are consumed without replacement on each spawn tick.
- If multiple `sub-wave` windows overlap in time, they must keep spawning independently on their own intervals.
- Victory must not trigger until:
  - all scheduled `sub-wave` have activated;
  - all active spawn bags are empty;
  - all living enemies have been removed from the battlefield.
- The combat runtime is intended to be the source of truth for wave bookkeeping, not the HUD scene or ad hoc scene fields.

## In Scope

- Runtime data structures for future, active, and completed sub-waves.
- Absolute-time sub-wave activation from wave start.
- Finite spawn-bag construction and depletion.
- Independent cadence for multiple simultaneously active sub-waves.
- HUD-facing counters for wave info and enemies left.
- Centralized victory evaluation for the first combat wave.

## Out of Scope

- Multi-wave progression beyond `Wave 1/1`.
- Pause/resume timer freezing details.
- VFX polish for enemy spawns or victory presentation.
- Reworking enemy movement/attack behavior that already exists from the pressure-loop task.
- Large balance passes on enemy totals beyond loading the configured wave data.

## Detailed Requirements

- Store wave scheduling state inside `CombatRuntime` or an equivalent combat-owned runtime model.
- Represent sub-wave lifecycle explicitly, for example as:
  - future/not yet activated;
  - active with spawn bag and next spawn timer;
  - completed when bag is empty and no more spawns remain for that sub-wave.
- Activate sub-waves based on absolute elapsed wave time, not on relative chaining or "when the last sub-wave finished".
- When a sub-wave activates, expand its `enemyId -> count` composition into a finite randomized bag.
- On each spawn interval, remove one enemy from that sub-wave's bag without replacement and spawn it through the existing enemy pipeline.
- If two or more sub-waves are active at the same time, their spawn timers must advance independently and not steal cadence from one another.
- Expose honest counters for HUD usage:
  - current wave label should remain `Wave 1/1`;
  - `Enemies left` should represent total remaining enemies to defeat, meaning living enemies already on the field plus enemies still waiting inside future or active spawn bags.
- Victory must be evaluated from centralized wave state and enemy state, not from a temporary "no enemies currently alive" shortcut.
- The system must tolerate momentary gaps with no live enemies on screen if future sub-waves are still scheduled.

## Acceptance Criteria

- [ ] Wave runtime activates sub-waves by absolute `startTimeMs` from wave start rather than by completion order or relative chaining.
- [ ] Each active sub-wave spawns from its own finite bag on its own interval, including cases where multiple sub-waves are active at the same time.
- [ ] `Victory` occurs only after all scheduled sub-waves have started, all spawn bags are empty, and all living enemies are gone.
- [ ] Temporary gaps with zero living enemies do not incorrectly trigger victory if future sub-waves are still pending.
- [ ] HUD-facing wave and enemy-count updates are emitted from combat-owned runtime state instead of reconstructed in `HUDScene`.

## Technical Notes

- Keep scheduling deterministic and inspectable. If a sub-wave can be in more than one collection at once, the bookkeeping model is too loose.
- Prefer runtime time accumulation over scattered Phaser delayed calls for each future spawn if that keeps pause/restart safer for later tasks.
- Spawn-bag randomization should be bounded and simple. The design spec does not require weighted rarity, only finite bag depletion without replacement.
- If enemy creation already carries diagnostics or world-position safeguards, reuse that path instead of making a second spawn codepath.
- Emit semantic `EventBus` updates when:
  - wave info changes;
  - enemies-left count changes;
  - combat reaches victory.
- Keep the implementation ready for future multi-wave expansion, but do not add generalized campaign progression or stage flow now.

## Implementation Plan

1. Introduce or finalize wave runtime structures in `CombatRuntime` for future, active, and completed sub-waves.
2. Load the first-wave config, including `startingRecordAngle` and sub-wave timing/content data, through the combat config layer.
3. Convert `enemyId -> count` maps into finite spawn bags when each sub-wave activates.
4. Advance sub-wave timers from elapsed wave time and allow multiple active sub-waves to tick independently during simulation.
5. Replace the temporary spawn bootstrap from the enemy-pressure slice with scheduler-driven spawning while preserving existing enemy movement and base-attack logic.
6. Centralize victory evaluation around:
   - no future sub-waves remaining;
   - no active bags with pending spawns;
   - no living enemies on the field.
7. Emit HUD-facing events whenever wave label or enemies-left values change, and validate that brief empty-field gaps do not cause false victory.

## Additional Notes

- The first implementation can stay deliberately small in content volume, but the scheduler itself should already reflect the final architecture direction.
- If you need to choose a definition for `Enemies left`, prefer one that is intuitive for the player and easy to compute from runtime truth, then document it.

## Blocked By

- Blocked by `03-task-state-machine-hud-bridge`
- Blocked by `08-task-enemy-pressure-loop`

## Type

AFK

## Design Spec Reference

- [Wave and Sub-wave Rules](./design-spec.md#wave-and-sub-wave-rules)
- [Combat Loop](./design-spec.md#combat-loop)
- [Runtime Source of Truth](./design-spec.md#runtime-source-of-truth)
- [Combat State Machine](./design-spec.md#combat-state-machine)
- [Wave](./design-spec.md#wave)
- [Sub-wave](./design-spec.md#sub-wave)
- [Definition of Done](./design-spec.md#definition-of-done)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
