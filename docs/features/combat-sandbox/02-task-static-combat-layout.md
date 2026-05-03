# Static Combat Layout

## What to Build

Build the first readable `720x1280` combat composition with all major world anchors present but not yet fully simulated. The player should be able to open the scene and immediately see the partial record, fixed needle, base block, enemy lane, packet anchor, base HP anchor, and top HUD layout in roughly the intended mobile portrait arrangement.

This slice validates screen composition and spatial ownership before combat logic becomes noisy. Keep it focused on layout, layering, and static render primitives; do not add rotation, attacks, or note packet rules here.

## Acceptance Criteria

- [ ] The combat screen uses config-driven pixel coordinates and sizes for the record, base, needle, enemy zone, note packet anchor, and HP bar anchor.
- [ ] The record is rendered as an 8-slot combat surface with `slot 0` visually aligned under the fixed `12:00` needle in the default starting orientation.
- [ ] Named render layers or depth constants exist for world, VFX, HUD, and overlays, with no unexplained magic depth numbers spread through scene code.

## Implementation Plan

- Implement layout config values from the design spec baseline and keep them in combat config modules rather than inline scene constants.
- Render a static record with visible sector frames, inner rule zone placeholders, and empty slot treatment so the combat surface reads even before pawn art is added.
- Render the base block low on the screen, with a placeholder HP bar below it and a clear note packet anchor above the capybara area.
- Render the fixed needle as a world element visually connected to the base rather than as a floating UI marker.
- Reserve visible space for the enemy lane and future time-control backplates without implementing their mechanics.
- Publish any HUD placeholder values through the event bridge if needed, but keep the real HUD behavior for later tasks.

## Blocked By

- Blocked by `01-task-combat-foundation`

## Type

AFK

## Design Spec Reference

- [Screen Composition](./design-spec.md#screen-composition)
- [Viewport](./design-spec.md#viewport)
- [Record Geometry](./design-spec.md#record-geometry)
- [Enemy Zone](./design-spec.md#enemy-zone)
- [Base Block](./design-spec.md#base-block)
- [Layering / Depth](./design-spec.md#layering--depth)
