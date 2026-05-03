# Combat Foundation

## What to Build

Create the first production-named combat entrypoint for `Combat Sandbox`: a `CombatScene` that owns combat runtime orchestration and a dedicated combat `HUDScene` that owns only UI and overlays. This slice exists to replace the generic scaffold usage with feature-specific scene wiring, typed combat events, and a dedicated runtime shell that can become the single mutable source of truth for the rest of the feature.

Touch scene registration, combat config modules, combat runtime types, and `EventBus` typing. Keep this slice intentionally thin: no slot crossings, no enemy simulation, no note resolution, and no real pause/victory logic yet.

## Acceptance Criteria

- [ ] Opening the combat feature launches a feature-specific `CombatScene` and combat `HUDScene`, while scaffold `GameScene` and `UIScene` remain generic extension points.
- [ ] A `CombatRuntime` or equivalent typed state object is created and owned by `CombatScene` instead of scattering mutable combat state across many scene fields.
- [ ] Combat-specific `EventBus` events are declared in `EventMap` for lifecycle, state, and HUD data exchange, even if some payloads are placeholders at this stage.

## Implementation Plan

- Create feature-local scene classes and decide how they hook into the existing project bootstrap without turning generic scaffold classes into combat-specific code.
- Add dedicated combat config modules for layout, balance, content, and wave data, even if some values are placeholders used by later tasks.
- Define the initial combat runtime shape: state machine value, timers, base HP, record rotation fields, slot runtime placeholders, note packet placeholder, enemy collections, and wave bookkeeping placeholders.
- Extend `EventBus` typing with combat lifecycle and HUD-facing messages. Keep event names semantic and granular instead of stuffing multiple meanings into one payload.
- Wire `CombatScene` to create runtime state and launch `HUDScene`. Wire `HUDScene` to subscribe to combat events without recomputing combat state locally.
- Avoid implementing real simulation here. This task should end with clean ownership boundaries and a stable place for later systems to plug into.

## Blocked By

None - can start immediately.

## Type

AFK

## Design Spec Reference

- [Feature Overview](./design-spec.md#feature-overview)
- [Systems Touched](./design-spec.md#systems-touched)
- [Scene Ownership](./design-spec.md#scene-ownership)
- [Runtime Source of Truth](./design-spec.md#runtime-source-of-truth)
- [EventBus Responsibilities](./design-spec.md#eventbus-responsibilities)
