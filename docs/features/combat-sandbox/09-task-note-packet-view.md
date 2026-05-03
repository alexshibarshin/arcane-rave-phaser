# Note Packet View

## What to Build

Implement the canonical note glyph and the runtime/render model for the current `note packet` above the capybara. The packet should behave as one color plus a `0..5` count, but it must render as real individual notes rather than a numeric counter.

This slice exists to separate the visual/runtime representation of notes from the combat rules that mutate them. Do not resolve generator or finisher rules here beyond what is necessary to prove rendering and state updates.

## Acceptance Criteria

- [ ] The combat runtime contains a note packet model with `color | null`, `count`, and the minimum view state needed to render individual note instances above the base.
- [ ] The HUD/world presentation shows `0..5` separate note glyph instances anchored above the capybara, with a subtle bounce motion on hanging notes.
- [ ] Packet state cannot exceed the configured max capacity, and the representation supports color changes without leaking stale note instances.

## Implementation Plan

- Create a canonical note glyph asset path or generated texture that later tasks can reuse for packet display, in-flight notes, and rule labels.
- Add runtime fields and a small packet rendering controller that own note instance creation, reuse, positioning, and cleanup.
- Keep the packet world-anchored above the base block instead of pushing it into the top HUD.
- Add helper methods for setting packet color and count so later generator and finisher tasks mutate one central API instead of poking raw fields.
- Support empty and non-empty packet transitions cleanly, including color replacement and count reduction back to zero.
- Avoid adding rule resolution here. Use simple dev helpers or temporary scene boot values if needed to validate rendering.

## Blocked By

- Blocked by `03-task-state-machine-hud-bridge`
- Blocked by `05-task-combat-content-seed`
- Blocked by `06-task-pawn-visual-primitives`

## Type

AFK

## Design Spec Reference

- [Note Packet Rules](./design-spec.md#note-packet-rules)
- [Note Visual Language](./design-spec.md#note-visual-language)
- [Base UI](./design-spec.md#base-ui)
- [Note](./design-spec.md#note)
- [Primitive Asset Strategy](./design-spec.md#primitive-asset-strategy)
