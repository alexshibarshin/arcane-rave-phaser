# State Machine HUD Bridge

## What to Build

Implement the first functional combat state machine with `preview`, `running`, `paused`, `victory`, and `defeat`, plus the event-driven bridge that lets the combat HUD reflect those states. This slice exists so later simulation tasks can plug into a reliable phase model instead of inventing ad hoc booleans for every subsystem.

The player-facing result should already feel like a real combat flow: a short preview pause on entry, automatic transition into running, and HUD/overlay reactions to state changes. Full freeze behavior, restart cleanup, and real victory evaluation are intentionally deferred.

## Acceptance Criteria

- [ ] Combat starts in `preview`, waits for a short config-driven delay, and transitions automatically to `running` without requiring a button press.
- [ ] Typed events are emitted when combat state changes so the combat HUD can show top-bar values and overlay state without owning simulation logic.
- [ ] `paused`, `victory`, and `defeat` states exist in the runtime and HUD flow, even if some transitions remain driven by temporary triggers until later tasks land.

## Implementation Plan

- Add a combat state enum or literal union to runtime state and make it the authoritative source for scene behavior.
- Introduce preview timing fields in runtime and update them during the simulation phase rather than via loose scene timers.
- Emit semantic events for state changes, pause open/close, and HUD data refresh. Keep payloads small and typed.
- Build the first combat HUD widgets: `Pause`, centered wave label placeholder, optional enemies-left placeholder, and state-dependent overlay containers.
- Keep HUDScene passive. It may cache the last values it received for rendering, but it should not inspect world objects or recompute combat outcomes.
- Avoid final restart logic and final win-condition logic here. Use temporary triggers only if needed to prove the event bridge.

## Blocked By

- Blocked by `01-task-combat-foundation`
- Blocked by `02-task-static-combat-layout`

## Type

AFK

## Design Spec Reference

- [Combat Loop](./design-spec.md#combat-loop)
- [Combat State Machine](./design-spec.md#combat-state-machine)
- [Frame Update Ownership](./design-spec.md#frame-update-ownership)
- [EventBus Responsibilities](./design-spec.md#eventbus-responsibilities)
- [Top HUD](./design-spec.md#top-hud)
