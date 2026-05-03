# Combat VFX System

## What to Build

Create a dedicated `CombatVfxSystem` that orchestrates combat feedback effects without embedding effect code across pawn logic, enemy logic, and scene orchestration. This slice should cover the first meaningful combat feedback set: slot pulse, pawn glow pulse, note flight, beam hit, enemy hit flash, base hit flash, and result emphasis.

This task exists to keep domain logic readable while still delivering the visual language the feature needs. Stay within the approved primitive toolset: generated textures, sprites, containers, tweens, particles, additive glow, and limited `Graphics`.

## Acceptance Criteria

- [ ] Combat VFX are triggered through a dedicated system or similarly isolated orchestration layer rather than being hand-built inline inside every combat resolver.
- [ ] The implemented effects cover at least slot activation, note transfer, pawn attack impact, enemy hit feedback, base hit feedback, and result overlay emphasis.
- [ ] Frequently reused temporary visuals are compatible with pooling or reuse instead of allocating fresh objects every activation without cleanup.

## Implementation Plan

- Define a VFX entry API keyed by combat meaning, not by arbitrary low-level render calls. Other systems should request effects like `playNoteFlight` or `playEnemyHit`.
- Subscribe the VFX system to combat events or invoke it through a narrow orchestration bridge so it stays decoupled from core combat state mutation.
- Build the first set of generated textures and effect prefabs for notes, glow sprites, beam fragments, pulses, and flashes.
- Keep lifetime ownership explicit so effects can be paused, resumed, and cleaned up during restart in later tasks.
- Use lightweight pooling or reusable containers for effects that can fire many times during a wave.
- Do not expand into shader work, custom pipelines, or expensive live geometry beyond the design-spec allowances.

## Blocked By

- Blocked by `04-task-record-crossings-empty-slots`
- Blocked by `08-task-enemy-pressure-loop`
- Blocked by `10-task-generator-resolution`
- Blocked by `11-task-finisher-resolution`
- Blocked by `13-task-wave-scheduler-victory`

## Type

AFK

## Design Spec Reference

- [VFX Technical Approach](./design-spec.md#vfx-technical-approach)
- [Primitive Asset Strategy](./design-spec.md#primitive-asset-strategy)
- [Attack Presentation](./design-spec.md#attack-presentation)
- [Color Break Sequence](./design-spec.md#color-break-sequence)
- [Performance / Technical Constraints](./design-spec.md#performance--technical-constraints)
