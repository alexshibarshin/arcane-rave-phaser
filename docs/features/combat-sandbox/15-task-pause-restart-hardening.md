# Pause and Restart Hardening

## Task Intent

Make the combat lifecycle controls fully reliable. `Pause` must freeze the authoritative simulation, `Resume` must continue from the exact same combat state without bursts or skipped logic, and `Restart` must rebuild the combat experience from a genuinely clean slate after pause, victory, or defeat.

This slice exists to turn the combat sandbox from a playable demonstration into a dependable runtime loop that survives repeated use. The player-facing outcome is simple but important: combat can be paused mid-pressure, resumed without drift, and restarted without leaked enemies, notes, timers, VFX, or stale HUD overlays. Keep the work focused on correctness, ownership, and cleanup rather than visual tuning.

## Relevant Context

- The combat state machine already reserves the states `preview`, `running`, `paused`, `victory`, and `defeat`.
- The design spec explicitly says pause is functional, not decorative. While paused, all of the following must stop advancing:
  - record rotation;
  - enemy movement;
  - enemy attack timers;
  - wave and sub-wave scheduling;
  - combat timers;
  - logic-timed combat VFX.
- `Restart` should use a full scene restart path rather than a hand-maintained soft reset of every combat subsystem.
- `HUDScene` owns UI and overlays only, so restart must also clear stale HUD presentation through proper scene lifecycle or event flow rather than manual patching.
- The feature calls out restart leaks as a known risk: old timers, enemy instances, VFX, and runtime state must all disappear.

## In Scope

- Central pause gating around combat-owned runtime state.
- Resume correctness for timers, crossings, spawns, enemy attacks, and logic-driven VFX.
- Full restart path through scene recreation.
- Deterministic cleanup of combat runtime, listeners, transient visuals, and HUD overlay state.
- Focused diagnostics for dangerous lifecycle invariants.

## Out of Scope

- New combat features unrelated to lifecycle control.
- Final visual tuning or HITL readability review.
- Replacing the state machine with a different architecture.
- Soft-reset infrastructure that contradicts the spec's preferred full-restart path.

## Detailed Requirements

- Establish one authoritative pause truth, ideally from combat runtime/state-machine state, rather than separate booleans scattered across systems.
- Ensure that while paused:
  - record angle does not advance;
  - pending slot crossings do not continue resolving;
  - enemy movement and attack cadence stop;
  - future sub-wave activation and spawn intervals stop;
  - logic-timed VFX stop or are otherwise frozen consistently.
- Resume must continue the same combat state without:
  - duplicated pending timers;
  - burst spawning to "catch up" incorrectly;
  - missed or double slot activations;
  - attack cooldown drift.
- Implement restart through full combat scene recreation, consistent with the spec's preference for hard reset over manual runtime rewinding.
- Cleanup must explicitly cover:
  - enemy runtime collections and render containers;
  - packet note instances;
  - active VFX instances or pools;
  - `EventBus` subscriptions/listeners;
  - scene-local references to old runtime objects.
- Restart from `paused`, `victory`, and `defeat` must all converge on the same clean lifecycle path.
- HUD overlays and HUD counters must reset cleanly on restart and must not preserve stale `Paused`, `Victory`, or `Defeat` state from the previous run.

## Acceptance Criteria

- [ ] While paused, record rotation, enemy movement, enemy attack timers, wave timers, spawn cadence, and logic-timed combat VFX all stop advancing.
- [ ] Resuming from pause continues the same combat state without duplicated timers, skipped crossings, or burst-spawn artifacts.
- [ ] Restarting after pause, victory, or defeat tears down the old combat runtime and world state completely, then creates a fresh combat instance with no leaked enemies, notes, or active effects.
- [ ] HUDScene resets correctly on combat restart and does not retain stale overlay or counter state from the previous run.
- [ ] Focused diagnostics or checks exist for at least the most failure-prone lifecycle leaks: stray timers, leftover runtime references, packet-state leaks, or suspicious crossing drift after resume.

## Technical Notes

- Favor simulation-time ownership over many unmanaged Phaser delayed calls where possible. The more combat timing lives in runtime state, the easier pause and restart become.
- If Phaser timers or tweens are already in use, audit them explicitly and decide whether they:
  - pause safely under authoritative control; or
  - must be recreated/cleared during restart.
- Be careful with previous/current record-angle bookkeeping across pause and resume. A bad resume can create missed or duplicate slot crossings on the first unpaused frame.
- Keep restart idempotent from the user's perspective. Repeated restart input should not stack multiple restart flows or leave scenes half alive.
- Use lightweight diagnostics for lifecycle anomalies, matching the design spec's logging guidance.

## Implementation Plan

1. Audit every timing-driven subsystem currently in combat:
   - record rotation;
   - slot crossing;
   - enemy movement and attacks;
   - wave scheduling;
   - VFX lifetimes.
2. Centralize pause truth around combat state and route simulation gating through that shared source instead of per-system ad hoc flags.
3. Verify resume behavior for each subsystem and fix the first-frame-after-resume edge cases, especially crossings, attack cadence, and spawn cadence.
4. Implement or finalize restart as a full combat-scene recreation path rather than a manual soft reset.
5. Add deterministic cleanup for listeners, runtime references, enemy containers, packet visuals, and active VFX.
6. Validate restart flows from paused, victory, and defeat states, and confirm `HUDScene` also returns to a clean baseline.
7. Add targeted diagnostics or checks for leaked timers, stale overlay state, and suspicious post-resume simulation jumps.

## Additional Notes

- This task is mostly about trust. If pause or restart feels flaky, the entire sandbox becomes harder to test and tune.
- If some subsystem cannot be paused cleanly with its current architecture, prefer simplifying that subsystem now over layering more lifecycle exceptions around it.

## Blocked By

- Blocked by `03-task-state-machine-hud-bridge`
- Blocked by `13-task-wave-scheduler-victory`
- Blocked by `14-task-combat-vfx-system`

## Type

AFK

## Design Spec Reference

- [Pause and Restart](./design-spec.md#pause-and-restart)
- [Combat State Machine](./design-spec.md#combat-state-machine)
- [Frame Update Ownership](./design-spec.md#frame-update-ownership)
- [Logging and Diagnostics](./design-spec.md#logging-and-diagnostics)
- [Validation & Testing](./design-spec.md#validation--testing)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
