# Moss Patch Zone

## Task Intent

This task establishes the zone runtime family through `Moss Patch`, the first placed damage-zone pawn. It delivers static world-anchored zones that tick damage to all enemies in radius over a fixed duration.

This slice exists because zones are a distinct archetype with persistent world presence and different timing semantics from projectiles, beams, or explosions. The player-facing result is that `Moss Patch` creates a visible area on the battlefield that immediately starts hurting enemies standing inside it.

This task should implement only the basic placed damage-zone behavior. No next-slot buff effect is included yet.

## Relevant Context

- All zones are static world-anchored effects.
- Zones are placed at enemy positions chosen at cast time and do not follow the slot or stick to enemies.
- Zones have a center, radius, duration, tick interval, and damage profile.
- The first zone tick happens immediately on spawn.
- Default tick interval is `0.5s`.
- A single zone cannot hit the same enemy more than once per tick.
- If no valid enemy exists at activation time, the zone is not created but note-rule behavior still resolves.
- `Moss Patch` is a green generator zone pawn with no secondary effect.

## In Scope

- Add authoritative zone runtime state.
- Insert zone updates into the combat loop.
- Implement placed damage-zone behavior and make `Moss Patch` use it.
- Add persistent rendering hooks for zone visuals.

## Out of Scope

- Next-slot damage buff.
- Explosion telegraphs, beams, projectiles, statuses, or other secondary effects.
- Crossing-detection logic; zones damage on ticks only.

## Detailed Requirements

- Extend combat runtime with a zone collection containing:
  - center point
  - radius
  - remaining duration
  - tick interval/timer
  - stored source snapshot or source references
- At activation:
  - select the authored target point from a valid enemy
  - create a static zone centered on that point
  - immediately apply the first tick on spawn
- During updates:
  - tick on the authored interval
  - apply damage to all enemies currently in radius
  - prevent duplicate hits to the same enemy during a single tick
  - expire when duration ends
- Clear all zones on wave end.
- Provide semantic event or state hooks so combat presentation can draw persistent zones and tick feedback.

## Acceptance Criteria

- [ ] `Moss Patch` creates a world-anchored damage zone at a cast-time enemy position and applies an immediate first tick.
- [ ] Active zones damage all enemies in radius on each interval without following slots or enemies.
- [ ] Zones are authoritatively stored in combat runtime and removed on expiry or wave end.

## Technical Notes

- A dedicated helper such as `CombatZones.ts` is preferred over growing `CombatRuntime.ts` with inline logic.
- Store source-side snapshot data on zone creation so later finisher and buff interactions can apply consistently across zone lifetime.
- Persistent zone rendering should derive from runtime state, not only from spawn events.

## Implementation Plan

1. Add zone runtime types and lifecycle helpers.
2. Insert zone updates into the combat loop after beams or in the order recommended by the design spec.
3. Refactor `Moss Patch` activation to create a zone using authored radius, duration, and tick values.
4. Apply immediate-on-spawn tick logic and normal interval ticking.
5. Connect zones to damage application and any combat scene render model used for persistent effects.
6. Validate zero-target behavior and wave-end cleanup.

## Additional Notes

- Visual note: a simple persistent ring/disc is sufficient if it clearly communicates area and remaining presence.

## Blocked By

- Blocked by 01-task-pawn-content-foundation
- Blocked by 02-task-pawn-atlas-integration

## Type

AFK

## Design Spec Reference

- [Zone Rules](../design-spec.md#zone-rules)
- [Combat Update Loop Changes](../design-spec.md#combat-update-loop-changes)
- [Presentation Changes](../design-spec.md#presentation-changes)
