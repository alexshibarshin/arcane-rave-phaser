# Shop Cards And Tooltip

## Task Intent

This task makes the build-phase pawn browsing experience legible and content-driven. It updates shop offer sourcing to use the temporary active deck, introduces lean shop cards, and adds the unified top-of-screen hold tooltip for both shop cards and already placed pawns.

This slice exists because the overhaul is not just about combat mechanics; players must be able to quickly understand a broader roster on a mobile portrait screen. The delivered player-facing behavior is that the shop only surfaces the curated 8-pawn playable slice, and long-press inspection shows useful, compact info without cluttering the default UI.

This task should not implement new combat runtime families. It is a build-phase/UI slice that consumes authored content from earlier tasks.

## Relevant Context

- The first playable slice intentionally exposes only 8 of the 12 authored pawns through the active deck.
- Shop cards should remain intentionally minimal: pawn name, sprite, note-rule glyph line, and price.
- Hold tooltip content should include: name, sprite, tier stars, generator/finisher tag, note-rule glyphs, and a short mechanical description with baked-in numbers.
- The tooltip should appear pinned at the top of the screen and remain visible during drag.
- The design spec explicitly says shop draws must stop sampling from all pawn definitions and become active-deck aware.

## In Scope

- Change shop draw source from the full pawn definition list to the active deck list from config.
- Implement compact shop cards using the authored sprite and metadata.
- Implement the unified hold tooltip for both shop cards and placed pawns.
- Reuse authored short descriptions and note-rule metadata from the pawn content config.

## Out of Scope

- Combat runtime work.
- New VFX families or semantic combat events.
- Full collection or deckbuilder UI.
- Major redesign of build-phase economy or drag-and-drop rules.

## Detailed Requirements

- Update shop offer generation so the first playable slice samples only from the configured active deck.
- Keep the implementation config-driven; do not hard-code the 8 ids inside UI code.
- Compact shop cards must show:
  - pawn sprite
  - pawn display name
  - note-rule indicator/glyph line
  - price
- Long-press/hold tooltip must work for:
  - a shop card
  - a pawn already placed on the record
- Tooltip must stay visible during drag and remain pinned to the top of the screen.
- Tooltip content must show:
  - sprite
  - display name
  - tier stars
  - generator/finisher tag
  - note glyph info
  - authored short description
- Keep tooltip information compact and decision-oriented; do not introduce a spreadsheet-like stats panel.
- Maintain existing build interactions such as buy, drag, swap, merge, and reorder.

## Acceptance Criteria

- [ ] Shop offers in build phase come only from the configured active deck of 8 pawns.
- [ ] Shop cards render using authored pawn sprite and concise metadata instead of placeholder-only presentation.
- [ ] Holding either a shop card or placed pawn opens a persistent top tooltip with the specified info and keeps it visible during drag.

## Technical Notes

- Likely touchpoints include `src/stage/StageBuild.ts` and `src/scenes/stage/StageScene.ts`.
- Keep the tooltip state derived from current inspected pawn/card and current tier rather than duplicating pawn data into separate UI-only authoring files.
- Follow the repo’s EventBus-first communication style if different stage systems need to coordinate hover/hold/drag state.
- This task depends on tasks 01 and 02 because it consumes the new content schema and sprite integration contract.

## Implementation Plan

1. Inspect current shop offer generation and replace any direct sampling from the full pawn definition map/list.
2. Add or adapt a selector/helper that returns active-deck definitions only.
3. Replace existing shop card content with the lean authored layout using sprite, name, note-rule line, and price.
4. Add transient UI state for the currently inspected pawn/card and current tooltip visibility.
5. Wire hold input for both shop cards and placed pawns to the same tooltip renderer.
6. Ensure tooltip state survives drag transitions until release/cancel.
7. Validate that non-active authored pawns never appear in shop while still existing in content.

## Additional Notes

- UX note: the tooltip should optimize for at-a-glance comprehension on portrait mobile, not exhaustive mechanical documentation.
- Art note: sprite scale may need a separate value for cards vs top tooltip because the source frames are large.

## Blocked By

- Blocked by 01-task-pawn-content-foundation
- Blocked by 02-task-pawn-atlas-integration

## Type

AFK

## Design Spec Reference

- [Feature Scope](../design-spec.md#feature-scope)
- [Player Experience](../design-spec.md#player-experience)
- [Stage/Shop Changes](../design-spec.md#stageshop-changes)
