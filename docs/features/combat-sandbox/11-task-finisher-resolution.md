# Finisher Resolution

## What to Build

Implement finisher activation on top of the existing note packet system and generator flow. A finisher should consume matching notes, scale its damage through the global multiplier table, attack even when no matching notes exist, and then output exactly one new note of its configured output color.

This slice exists to complete the intended segment loop of `generator -> finisher -> new packet seed`. Keep it focused on finisher behavior itself; elemental weakness is still a separate follow-up task.

## Acceptance Criteria

- [ ] A finisher consumes all notes of its own color when the current packet matches, applies the correct multiplier for `0..5` consumed notes, and clears or replaces the packet accordingly.
- [ ] A foreign-color packet still breaks, the finisher still attacks using the `0 consumed` multiplier path, and the system does not skip activation.
- [ ] Finishers always emit exactly one output note of their configured `outputNoteColor`, and invalid `outputNoteColor == finisher.color` states are rejected or loudly validated.

## Implementation Plan

- Add a dedicated finisher activation path that reuses the existing slot crossing and target-selection flow rather than branching all over scene code.
- Read the current packet through the central packet API, compute consumed notes, and resolve packet state transitions in one place.
- Apply the global finisher multiplier table from balance config rather than hardcoding values in the activation logic.
- Validate finisher content assumptions early, especially that output color differs from the finisher's own consumed color.
- Keep the packet output semantics explicit: after the finisher attack, emit one new packet note of the configured output color rather than leaving packet state implicit.
- Do not mix elemental weakness math into this task. The damage result here should be pre-weakness finisher damage only.

## Blocked By

- Blocked by `09-task-note-packet-view`
- Blocked by `10-task-generator-resolution`

## Type

AFK

## Design Spec Reference

- [Finisher Rules](./design-spec.md#finisher-rules)
- [Finisher Damage Multipliers](./design-spec.md#finisher-damage-multipliers)
- [Activation Sequence](./design-spec.md#activation-sequence)
- [Color Break Sequence](./design-spec.md#color-break-sequence)
- [Pawn Definitions](./design-spec.md#pawn-definitions)
