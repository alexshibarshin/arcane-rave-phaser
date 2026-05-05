# Combat VFX System

## Task Intent

Create a dedicated `CombatVfxSystem` or equivalently isolated orchestration layer for combat feedback. The goal is to deliver the first meaningful visual-feedback set for the combat sandbox without smearing effect code across pawn resolution, enemy simulation, HUD code, and scene orchestration.

This slice should cover the semantic feedback required by the design spec: slot trigger pulse, pawn glow pulse, note flight, beam hit, enemy hit flash, base hit flash, and lightweight victory/defeat emphasis. The task exists both to improve readability and to protect combat logic from turning into a VFX dumping ground. Stay inside the approved primitive toolkit: generated textures, sprites, containers, tweens, particles, additive glow, and limited `Graphics`.

## Relevant Context

- The feature's visual direction is `graphic neon schematic`, built primarily from primitives and generated textures rather than expensive live geometry.
- Combat VFX should communicate meaning, not just decorate:
  - slot activation needs a readable trigger cue;
  - generator and finisher actions need visible note transfer or strike feedback;
  - enemy and base hits need immediate damage acknowledgement;
  - color breaks need enough emphasis to explain that the packet chain was interrupted even before sound exists.
- The design spec explicitly recommends an isolated `CombatVfxSystem` and semantic effect entry points rather than ad hoc low-level render calls from domain logic.
- Frequently reused temporary visuals must be compatible with pooling or reuse.
- Pause and restart hardening come later, but this task should already make effect lifetime ownership explicit so those later controls are practical.

## In Scope

- Dedicated VFX orchestration layer with semantic entry points.
- First-pass implementations for:
  - slot trigger pulse;
  - pawn glow pulse;
  - note flight;
  - beam hit;
  - enemy hit flash;
  - base hit flash;
  - victory/defeat overlay emphasis or comparable result feedback.
- Lightweight pooling or reuse strategy for high-frequency transient visuals.
- Integration hooks from combat events or narrow orchestration bridges into the VFX layer.

## Out of Scope

- Shader work.
- Custom pipelines.
- Complex post-processing.
- Rewriting core combat resolution around VFX timing.
- Final art-direction tuning pass and HITL visual review decisions.
- Audio implementation.

## Detailed Requirements

- Define VFX APIs in combat terms, for example `playSlotActivation`, `playNoteFlight`, `playEnemyHit`, or similarly semantic names.
- Keep the VFX layer decoupled from combat state mutation:
  - subscribe to typed combat events; or
  - invoke the VFX system through a narrow orchestration bridge that only passes effect meaning and positions/colors.
- Implement slot activation feedback as a three-layer concept compatible with the design spec:
  - sector frame flash;
  - pawn pulse/glow for occupied slots;
  - rule-zone pulse;
  - for empty slots, the sector flash and empty-platform emphasis are enough.
- Implement note-flight visuals for generator and finisher flows using the canonical note glyph and correct color coding.
- Implement attack presentation as instant hit feedback, not projectile simulation. Beam/pulse visuals may be stylized and slightly irregular, but should remain performant and readable.
- Implement enemy and base damage feedback distinctly enough that the player can tell what took damage without reading logs.
- Result emphasis for `victory` and `defeat` should support, not replace, the overlay/UI state owned elsewhere.
- Frequently triggered effects must not allocate unbounded new objects every activation; use pooling, object reuse, or explicit cleanup-compatible lifetimes.

## Acceptance Criteria

- [ ] Combat VFX are triggered through a dedicated system or similarly isolated orchestration layer rather than being hand-built inline inside every combat resolver.
- [ ] The implemented effects cover at least slot activation, note transfer, pawn attack impact, enemy hit feedback, base hit feedback, and result overlay emphasis.
- [ ] Frequently reused temporary visuals are compatible with pooling or reuse instead of allocating fresh objects every activation without cleanup.
- [ ] The VFX layer consumes semantic combat meaning rather than reconstructing combat rules from raw scene state.
- [ ] The implemented effects stay within the approved primitive-based technical approach and do not introduce shaders or custom pipelines.

## Technical Notes

- Prefer generated textures and reused sprites/containers over per-frame `Graphics` rebuilding.
- If a beam effect needs limited `Graphics` for a polyline look, keep it narrow and transient, not a permanent heavy geometry system.
- Centralize lifetime management. Each effect should have a clear owner and cleanup path so later pause/restart work can suspend or clear it deterministically.
- Keep effect depth/layering aligned with named combat layers from the design spec, especially that combat VFX sits above note packet/base and below HUD/overlay where appropriate.
- Use the canonical note glyph for packet and flight visuals so the visual language stays consistent across UI and combat.
- Expose enough parameters for color, origin, target, and emphasis strength, but avoid turning the VFX system into a second combat-rules engine.

## Implementation Plan

1. Define the `CombatVfxSystem` surface area and decide whether it is event-driven, bridge-invoked, or a hybrid.
2. Create reusable primitive assets or generated textures for notes, flashes, glows, beam fragments, and other small VFX building blocks.
3. Implement slot activation cues first, because they anchor the entire readable combat loop.
4. Implement note-flight effects for generator and finisher flows using canonical note glyphs and color-aware styling.
5. Implement attack-hit effects for enemies and base, keeping them instant and lightweight rather than projectile-based.
6. Add victory/defeat emphasis that complements the state-machine overlays without taking over UI ownership.
7. Introduce reuse/pooling for high-frequency effects and validate cleanup assumptions so later pause/restart hardening can hook in cleanly.

## Additional Notes

- Before adding a flashy effect, prefer the version that best explains combat meaning on a `720x1280` portrait screen.
- Because audio is deferred, color-break visuals and impact emphasis need to carry more semantic weight than they eventually will in the final game.

## Blocked By

- Blocked by `04-task-record-crossings-empty-slots`
- Blocked by `08-task-enemy-pressure-loop`
- Blocked by `10-task-generator-resolution`
- Blocked by `11-task-finisher-resolution`
- Blocked by `13-task-wave-scheduler-victory`

## Type

AFK

## Design Spec Reference

- [Slot Activation Feedback](./design-spec.md#slot-activation-feedback)
- [Note Visual Language](./design-spec.md#note-visual-language)
- [Attack Presentation](./design-spec.md#attack-presentation)
- [Activation Sequence](./design-spec.md#activation-sequence)
- [Color Break Sequence](./design-spec.md#color-break-sequence)
- [VFX Technical Approach](./design-spec.md#vfx-technical-approach)
- [Primitive Asset Strategy](./design-spec.md#primitive-asset-strategy)
- [Performance / Technical Constraints](./design-spec.md#performance--technical-constraints)
