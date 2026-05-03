# Enemy Pressure Loop

## What to Build

Add the first end-to-end enemy pressure behavior: spawn enemies into the top lane, move them strictly downward, stop them when they reach base attack range, and let each enemy damage the base on its own cooldown. This slice proves that the combat scene can already produce real pressure and reach `defeat` even before full wave scheduling is complete.

This task should build on the existing enemy runtime/render unit rather than replacing it. Keep the spawn source simple if needed, because full `wave/sub-wave/spawn bag` orchestration arrives later.

## Acceptance Criteria

- [ ] Enemies spawn above or near the top boundary using config-driven X range selection with basic anti-clumping protection for neighboring spawns.
- [ ] Spawned enemies move only on the Y axis, stop when `distance(baseCenter, enemy) <= attackRange`, and then switch into repeated base attacks using per-enemy cooldowns.
- [ ] Base HP decreases through runtime-owned combat logic, and the combat flow can enter `defeat` when base HP reaches zero or below.

## Implementation Plan

- Add a temporary spawn bootstrap that can create enemies on a simple schedule or fixed list without yet implementing the full wave scheduler.
- Implement enemy update logic in the simulation phase only while combat is in `running`, respecting the combat state machine.
- Use the configured `baseCenter` from layout state when evaluating attack range, and keep the rule as a true world-distance check.
- Add minimal base damage events so HUD and future VFX systems can react without coupling directly to enemy internals.
- Track enemy state transitions cleanly, such as moving, attacking, and dead, so later wave scheduling can reason about active enemies.
- Do not introduce pathfinding, separation, projectiles, or ranged archetypes.

## Blocked By

- Blocked by `03-task-state-machine-hud-bridge`
- Blocked by `07-task-enemy-archetype-render`

## Type

AFK

## Design Spec Reference

- [Enemy Rules](./design-spec.md#enemy-rules)
- [Spawn Positioning](./design-spec.md#spawn-positioning)
- [Combat Loop](./design-spec.md#combat-loop)
- [Base / DJ Booth / Capybara](./design-spec.md#base--dj-booth--capybara)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
