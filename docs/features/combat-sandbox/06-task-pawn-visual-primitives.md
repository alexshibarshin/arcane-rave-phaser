# Pawn Visual Primitives

## What to Build

Create the first primitive-based pawn presentation layer for the six starter pawns. Each slot should be able to show a pedestal attached to the record, a readable holographic construct silhouette above it, tier stars beneath the construct, and a rule label that communicates generator versus finisher behavior.

This slice exists to prove the combat readability of pawn families before activation logic and VFX make the scene busier. Keep it focused on static rendering, generated textures, and upright-versus-rotating ownership; do not add combat resolution here.

## Acceptance Criteria

- [ ] All six starter pawns render with a visible family distinction between generator and finisher plus a color distinction across red, green, and blue.
- [ ] Each occupied slot shows pedestal, construct, and tier star treatment, while empty slots remain visually legible and separate.
- [ ] Rule labels for `+♪♪` and `-all ♪ -> +♪` are present in the inner rule zone using the canonical note glyph language or a clearly planned placeholder if glyph reuse lands in a later task.

## Implementation Plan

- Reuse the content seed so the scene reads visual families from data instead of hardcoding per-slot visuals in rendering logic.
- Generate textures or lightweight drawables for pedestal parts, construct silhouettes, stars, and rule labels with the `graphic neon schematic` direction in mind.
- Keep slot rendering organized so later tasks can rotate rule-zone graphics and pedestals with the record while keeping constructs upright.
- Choose a render structure that can survive later animation and activation pulses without needing a rewrite, likely through slot containers with sub-containers for rotating and upright parts.
- Do not solve note packet runtime, combat hits, or VFX orchestration here.
- If arc text is too expensive to implement now, use a temporary straight layout but keep the code organized so the final visual review can revisit it cleanly.

## Blocked By

- Blocked by `02-task-static-combat-layout`
- Blocked by `05-task-combat-content-seed`

## Type

AFK

## Design Spec Reference

- [Slot Structure](./design-spec.md#slot-structure)
- [Primitive Asset Strategy](./design-spec.md#primitive-asset-strategy)
- [Record and Slots](./design-spec.md#record-and-slots)
- [Pawn Visual Identity](./design-spec.md#pawn-visual-identity)
- [Overall Style](./design-spec.md#overall-style)
