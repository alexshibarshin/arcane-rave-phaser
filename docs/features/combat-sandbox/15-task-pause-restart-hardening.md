# Pause and Restart Hardening

## What to Build

Make combat lifecycle controls truly reliable: `Pause` must freeze simulation ownership points, `Resume` must continue cleanly, and `Restart` must fully rebuild the combat state from scratch without stale timers, enemies, VFX, or packet state leaking through. This slice exists to turn the combat sandbox from a playable demo into a dependable runtime loop.

The player-facing outcome should be that combat can be paused mid-pressure, resumed without drift, and restarted after pause, victory, or defeat with a fully clean scene state. Keep it focused on correctness and cleanup, not on final visual tuning.

## Acceptance Criteria

- [ ] While paused, record rotation, enemy movement, enemy attack timers, wave timers, spawn cadence, and logic-timed combat VFX all stop advancing.
- [ ] Resuming from pause continues the same combat state without duplicated timers, skipped crossings, or burst-spawn artifacts.
- [ ] Restarting after pause, victory, or defeat tears down the old combat runtime and world state completely, then creates a fresh combat instance with no leaked enemies, notes, or active effects.

## Implementation Plan

- Centralize pause gating around combat state so simulation systems and timed VFX share the same pause truth instead of each inventing separate booleans.
- Audit any Phaser timers, tweens, delayed calls, and pooled objects introduced by earlier tasks and make sure they either pause safely or are driven from runtime time instead.
- Implement restart as a full scene restart path, matching the design spec's preference for clean scene recreation over manual soft reset logic.
- Add cleanup hooks for enemy containers, packet note instances, active VFX, listeners, and runtime references so shutdown is deterministic.
- Add focused diagnostics for the most dangerous invariants: packet overflow, invalid finisher config, stray active timers after restart, and suspicious crossing behavior.
- Verify that HUDScene also resets correctly when combat restarts and does not keep stale overlay state.

## Blocked By

- Blocked by `03-task-state-machine-hud-bridge`
- Blocked by `13-task-wave-scheduler-victory`
- Blocked by `14-task-combat-vfx-system`

## Type

AFK

## Design Spec Reference

- [Pause and Restart](./design-spec.md#pause-and-restart)
- [Combat State Machine](./design-spec.md#combat-state-machine)
- [Logging and Diagnostics](./design-spec.md#logging-and-diagnostics)
- [Validation & Testing](./design-spec.md#validation--testing)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
