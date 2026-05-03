# Enemy Archetype Render

## What to Build

Implement the first enemy runtime/render unit as a reusable combat entity with one shared archetype and three color variants. Each enemy should exist as a container-level render unit that can later support movement, HP, local hit feedback, and proper Y-based sorting without redesigning the render structure.

This slice exists to separate "enemy exists correctly in the combat world" from "enemy already pressures the base." Do not implement full wave scheduling or base attack behavior yet.

## Acceptance Criteria

- [ ] Enemy definitions from content config can instantiate visible red, green, and blue enemy variants using one shared render structure.
- [ ] Each enemy is represented by a single render container suitable for container-level `Y-sort`, including body, HP bar, and future local hit feedback attachment points.
- [ ] Enemy runtime state includes the fields needed for later movement and combat updates, even if some are still placeholders in this slice.

## Implementation Plan

- Build a small enemy runtime factory or creation path that consumes enemy definition data rather than creating ad hoc sprites from the scene.
- Create primitive visuals that clearly distinguish the three color variants while preserving one underlying enemy family silhouette.
- Structure the enemy render unit so sorting happens at the container level, not on body and HP bar separately.
- Add minimal runtime identifiers, HP state, color, position, and state enum placeholders so later simulation tasks can update them cleanly.
- Keep creation and destruction boundaries clear so restart cleanup later has a predictable enemy lifecycle to work with.
- Avoid implementing spawn cadence, target range checks, or base damage here.

## Blocked By

- Blocked by `02-task-static-combat-layout`
- Blocked by `05-task-combat-content-seed`

## Type

AFK

## Design Spec Reference

- [Enemy Rules](./design-spec.md#enemy-rules)
- [Enemy Definition Data](./design-spec.md#enemy-definition-data)
- [Runtime Enemy State](./design-spec.md#runtime-enemy-state)
- [Enemy Sorting](./design-spec.md#enemy-sorting)
- [Enemies](./design-spec.md#enemies)
