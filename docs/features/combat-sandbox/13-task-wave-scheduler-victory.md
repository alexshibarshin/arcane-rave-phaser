# Wave Scheduler and Victory

## What to Build

Replace any temporary spawn bootstrap with the real wave scheduler for the first combat sandbox wave. This includes absolute-time sub-wave activation, per-sub-wave spawn bags, support for overlapping active sub-waves, enemy counters, and honest victory evaluation that waits for all scheduled work to finish.

This slice exists so the combat loop can complete from preview to legitimate victory instead of only demonstrating pressure or defeat. Keep it focused on wave orchestration and outcome checks, not on pause hardening or VFX polish.

## Acceptance Criteria

- [ ] Wave runtime activates sub-waves by absolute `startTimeMs` from wave start rather than by completion order or relative chaining.
- [ ] Each active sub-wave spawns from its own finite bag on its own interval, including cases where multiple sub-waves are active at the same time.
- [ ] `Victory` occurs only after all scheduled sub-waves have started, all spawn bags are empty, and all living enemies are gone.

## Implementation Plan

- Add runtime collections for future sub-waves, active sub-waves, and completed sub-waves, keeping wave bookkeeping inside `CombatRuntime`.
- Convert sub-wave enemy counts into finite spawn bags when a sub-wave activates, then consume those bags without replacement on each spawn tick.
- Replace the temporary enemy bootstrap from the pressure-loop task with wave-driven spawning while preserving the already working enemy movement and base attack logic.
- Emit HUD-facing events for wave info and enemies left whenever counters change.
- Make victory evaluation explicit and centralized so it cannot trigger in a gap between sub-waves.
- Keep the implementation ready for later expansion to multiple waves, but do not add multi-wave progression in this feature slice.

## Blocked By

- Blocked by `03-task-state-machine-hud-bridge`
- Blocked by `08-task-enemy-pressure-loop`

## Type

AFK

## Design Spec Reference

- [Wave and Sub-wave Rules](./design-spec.md#wave-and-sub-wave-rules)
- [Wave Data](./design-spec.md#wave-data)
- [Sub-wave Data](./design-spec.md#sub-wave-data)
- [Combat Loop](./design-spec.md#combat-loop)
- [Definition of Done](./design-spec.md#definition-of-done)
