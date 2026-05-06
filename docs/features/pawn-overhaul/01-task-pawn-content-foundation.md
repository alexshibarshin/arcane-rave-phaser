# Pawn Content Foundation

## Task Intent

This task establishes the new authored pawn content model that the overhaul depends on. It replaces the prototype-level `generator`/`finisher` identity-only shape with a durable schema that represents pawn identity, note-rule family, primary ability archetype, secondary effect data, player-facing tooltip authoring, art mapping, and active-deck availability.

This slice exists so all later combat, UI, and rendering tasks can read the same authoritative pawn definitions instead of hard-coding per-pawn behavior in multiple places. The player-facing outcome is not a fully finished feature yet; the implementation outcome is a stable content contract for the full 12-pawn roster and the first playable 8-pawn deck.

This task should stop at config/schema/content boundaries. It should not implement runtime combat effect families, shop tooltip interaction, or combat presentation changes beyond whatever tiny adjustments are needed to keep typechecking intact.

## Relevant Context

- The feature keeps the note packet system unchanged and only expands the pawn model.
- Every pawn must have exactly one `noteRuleFamily` and one `primaryArchetype`.
- The first authored roster contains 12 unique pawns, with 8 of them active in the temporary first playable deck.
- The shop must later draw from the active deck list rather than all pawn definitions, so deck availability must be explicit in content.
- The project already has a sprite sheet source asset at `art/pawn_sprite_map.png`.
- The asset is a transparent PNG sized `1448x1086`, naturally arranged as a `4x3` grid with base frame size `362x362`.
- The row-major layout visually groups pawns by color: top row red, middle row green, bottom row blue. The task should lock in a deterministic frame mapping for all 12 authored pawns.
- Visible sprite bounds vary inside each cell, so later integration should use full frames rather than globally trimming the sheet.

## In Scope

- Introduce the new pawn content types/interfaces/unions in `src/config/` and any adjacent type files.
- Author all 12 pawn definitions from the design spec.
- Author the temporary active 8-pawn deck list in config.
- Add art metadata per pawn, including atlas key and frame identity that matches the `4x3` source layout.
- Add concise player-facing tooltip/card description text per pawn.
- Preserve compatibility with future slot-modifier work by making `outputNoteColor` and `primaryArchetype` easy to query.

## Out of Scope

- Asset preloading or scene-level sprite rendering.
- Shop deck filtering behavior in runtime.
- Tooltip interaction behavior.
- Combat runtime families, damage logic, statuses, buffs, or effect updates.
- Rebalancing numbers beyond expressing authored tuning fields in content.

## Detailed Requirements

- Evolve the pawn content schema so it explicitly models:
  - identity: `id`, `displayName`, `color`
  - note rule: `family` plus generator/finisher-specific data
  - ability: `primaryArchetype`, cast pattern, targeting rule, authored tuning values, optional secondary effect
  - art metadata: atlas/spritesheet key and frame reference
  - tooltip/card authoring: short mechanical description with baked-in numbers
  - availability: active vs inactive in the first playable slice
- Preserve the design-spec roster exactly:
  - red: Ruby Needle, Bass Bomb, Heatline, Meteor Drop
  - green: Moss Patch, Lifebloom Scatter, Thorn Fan, Pulse Garden
  - blue: Frost Sweep, Prism Volley, Pressure Burst, Arc Bounce
- Preserve the temporary active deck exactly:
  - active: Ruby Needle, Bass Bomb, Heatline, Moss Patch, Thorn Fan, Frost Sweep, Meteor Drop, Arc Bounce
  - inactive but authored: Lifebloom Scatter, Pulse Garden, Prism Volley, Pressure Burst
- Encode finisher output-note constraints in content so no finisher can output its own color.
- Keep tuning surfaces explicit enough for later tasks:
  - damage, projectile speed/lifetime/count, cone angle, volley interval/count, radius, delay, duration, tick interval, slow values, heal percent, high-HP modifier, next-slot buff percent, split values
- Define the frame mapping from the sprite sheet in row-major order so later tasks do not reinterpret it.
  - Recommended mapping:
  - row 1 frames 0-3: Ruby Needle, Bass Bomb, Heatline, Meteor Drop
  - row 2 frames 4-7: Moss Patch, Lifebloom Scatter, Thorn Fan, Pulse Garden
  - row 3 frames 8-11: Frost Sweep, Prism Volley, Pressure Burst, Arc Bounce
- Keep the content config as the single source of truth for the roster and active deck.

## Acceptance Criteria

- [ ] The codebase has a typed pawn content schema that separates note rule, ability, art metadata, tooltip text, and deck availability.
- [ ] All 12 pawns from the design spec are authored in config with valid finisher output-note data and deterministic frame mapping.
- [ ] The temporary active deck of 8 pawns is represented explicitly in config and can be queried without scanning all pawn definitions heuristically.

## Technical Notes

- Prefer evolving `src/config/CombatContentConfig.ts` unless splitting into a dedicated pawn config file is cleaner and stays aligned with existing repo structure.
- Keep scaffold-level constants and authored runtime defaults in `src/config/`.
- Do not hide important authored semantics in free-form strings. The roster should be queryable by systems that care about archetype, note-rule family, or secondary effect kind.
- Keep future slot-modifier integration in mind: later features will likely inspect fields such as output note and archetype category directly.
- Since the sprite source is already available and aligned to a `4x3` layout, use stable frame ids or indices rather than pixel-cropping metadata for MVP.

## Implementation Plan

1. Inspect the current `CombatContentConfig` and adjacent content types to understand how pawn data is consumed today.
2. Introduce new TypeScript types for:
   - pawn identity
   - note-rule config
   - ability config
   - secondary effect config
   - art metadata
   - deck membership
3. Migrate or replace the existing pawn definitions with the 12 authored roster from the spec.
4. Add concise authored descriptions intended for compact shop cards and long-press tooltips.
5. Add deterministic sprite frame metadata that matches `pawn_sprite_map.png` as a `362x362` 12-frame sheet.
6. Add the active deck list in config and expose helpers/selectors if the rest of the codebase currently reads all definitions directly.
7. Run type validation and adjust call sites only enough to keep consumers compiling against the new schema.

## Additional Notes

- Art note: the source file is already transparent, so later loading can use the asset directly without chroma-key preprocessing.
- UX note: short descriptions should favor plain mechanical language over flavor text because they will appear in compact UI.

## Blocked By

None — can start immediately.

## Type

AFK

## Design Spec Reference

- [Goals](../design-spec.md#goals)
- [Technical Design](../design-spec.md#technical-design)
- [Content and Configuration](../design-spec.md#content-and-configuration)
