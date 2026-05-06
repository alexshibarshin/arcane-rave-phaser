# Pawn Atlas Integration

## Task Intent

This task connects the already-produced pawn sprite sheet to the actual game scenes so pawns render as real authored constructs instead of placeholder badges. It covers asset preload, frame addressing, and upright sprite usage in the build/combat presentation layers.

This slice exists because nearly every later player-facing task assumes the pawn art is already available through stable asset keys and frame references. The player-facing result is that placed pawns and any basic pawn previews now use the correct sprite imagery, while gameplay logic remains unchanged.

This task should not add tooltip interaction or active-deck filtering. It should provide the rendering foundation only.

## Relevant Context

- The design spec explicitly requires replacing placeholder visuals with a single generated sprite atlas/sheet of 12 pawn sprites.
- The source asset already exists at `art/pawn_sprite_map.png`.
- The asset is transparent and sized `1448x1086`.
- It lays out naturally as a `4x3` sheet with nominal frame size `362x362`.
- Visual bounds vary per frame, so the integration should use full-size frames and let the scene/layout code scale them rather than trimming per frame.
- Pawns must remain upright in all phases even if the record rotates.

## In Scope

- Preload the pawn art in `BootScene` or the project’s actual preload entrypoint.
- Create the runtime asset key contract that matches the content config from task 01.
- Replace placeholder pawn art usage in build and combat presentation with sprite-sheet frames.
- Keep sprites upright while positioned on the rotating record.

## Out of Scope

- Tooltip UI and hold interactions.
- Shop card deck filtering.
- Combat runtime mechanics, VFX, or effect families.
- Final polish on scale/offset tuning beyond making the asset read correctly.

## Detailed Requirements

- Load `art/pawn_sprite_map.png` into Phaser in a way that supports indexed frame access.
- The default implementation should treat it as a 12-frame sheet using `362x362` frames.
- Match the frame mapping defined in the content foundation task; do not infer a different ordering ad hoc in scenes.
- Update scene/view code so pawn visuals resolve via content metadata instead of hard-coded shape/color placeholder drawing.
- Ensure record-mounted pawns remain visually upright even if their slot transform follows record rotation.
- Choose reasonable default scaling so all 12 sprites fit within the existing record/build presentation without clipping.
- Keep the rendering contract generic enough that future authored atlas revisions could swap the asset without rewriting scene logic.

## Acceptance Criteria

- [ ] The game preloads the pawn sheet from `art/pawn_sprite_map.png` and exposes it through a stable asset key.
- [ ] Placed/build/combat pawn representations use authored sprite frames rather than placeholder geometry.
- [ ] Pawn sprites remain upright on the record and render without requiring per-frame trim metadata.

## Technical Notes

- The design spec names `src/scenes/BootScene.ts` as the asset preload point and `CombatRenderModel`/stage scene code as likely presentation touchpoints.
- Prefer driving art selection from content metadata rather than duplicating frame numbers in multiple scenes.
- If existing scene code assumes pedestal-centric pawn rendering, keep the edits tightly scoped to replacing the visual source rather than redesigning the whole view layer here.
- Avoid mixing art-loading logic with gameplay config logic. The content schema can own frame identity while the preload layer owns the actual Phaser asset registration.

## Implementation Plan

1. Inspect how current pawn visuals are created in build and combat scenes/views.
2. Register the new sprite sheet in the preload scene with `362x362` frame dimensions.
3. Introduce any minimal helper needed to map pawn content metadata to a Phaser texture/frame pair.
4. Replace placeholder render paths with sprite instances while keeping existing layout/interaction code intact.
5. Verify that sprites remain upright and legible on both build-phase and combat-phase record views.
6. Adjust scale/origin only as needed to avoid obvious clipping or upside-down rotation artifacts.

## Additional Notes

- Art note: the sprites have uneven occupied bounds inside each frame, so centering/origin defaults should be checked visually after integration.
- Mobile readability matters more than showing the sprite at 1:1 resolution.

## Blocked By

- Blocked by 01-task-pawn-content-foundation

## Type

AFK

## Design Spec Reference

- [Goals](../design-spec.md#goals)
- [Player Experience](../design-spec.md#player-experience)
- [Integration Points](../design-spec.md#integration-points)
