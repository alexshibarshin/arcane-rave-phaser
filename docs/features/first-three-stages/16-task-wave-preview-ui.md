# Wave Preview UI — Pill Tags and Special Enemy Cards

## Task Intent

Update the build-phase wave preview UI in `StageScene` to display pill tags and an optional special enemy card (for elite/boss waves) instead of the current text-based `bodyLines`/`archetypeSummary` format. Reuse the `PillTag` and `SpecialEnemyCard` components created in task 15.

After this task, the wave preview matches the design spec: tags convey wave identity at a glance, and special enemy cards preview the elite/boss encounter before the player commits to starting the wave.

## Relevant Context

The current wave preview in `StageScene` shows:
- A text-based preview card with `bodyLines` (wave number, enemy count, color breakdown) and `archetypeSummary` (archetype counts)
- This data comes from `stage:snapshot-updated` event's `previewTitle`/`previewBody` fields

The new preview uses the `StageWavePreviewModel` (from task 07) carried in the updated `stage:snapshot-updated` event. It shows:
1. **Wave label**: `WAVE 5/10` — 18px, muted white
2. **Pill tags row**: up to 4 tags from `wavePreview.tags`
3. **Special enemy card** (only if `waveKind === 'elite' || 'boss'`): compact variant (~140×160px)

The preview does NOT reveal sub-wave structure. Only wave-level tags and special enemy identity are shown.

## In Scope

- Update `StageScene` wave preview rendering to use `StageWavePreviewModel`
- Render pill tags from `tags` array using the `PillTag` component
- Render compact special enemy card for elite/boss waves using `SpecialEnemyCard` (wave-preview variant)
- Remove or repurpose old text-based preview (`previewBodyLabel`, `previewArchetypeLabel`)
- Update the preview card container dimensions to accommodate tags + optional enemy card
- Ensure the preview card is hidden during combat (existing behavior) and shown during build phase

## Out of Scope

- Creating the `PillTag` or `SpecialEnemyCard` components (task 15)
- Enemy silhouette rendering in the preview card (task 17 adds the actual visuals — for now, the card shows a placeholder shape + name)
- Lobby detail panel (task 15)
- Result modal (task 15)

## Detailed Requirements

### Preview Card Layout

The preview card is a container near the wave-start area (currently at `StagePresentationConfig.PREVIEW_CARD_X/Y` with dimensions from config).

New layout (vertical stack, centered):
```
┌─────────────────────────────┐
│  WAVE 5/10                  │  ← wave label, 18px, centered
│                             │
│  [Red] [Single-Target] ...  │  ← pill tags row, centered
│                             │
│  ┌───────────────────┐      │
│  │                   │      │  ← special enemy card (only for
│  │   IRON KICK       │      │     elite/boss waves)
│  │   (visual)        │      │     compact variant ~140×160px
│  │   Elite Tank      │      │
│  └───────────────────┘      │
└─────────────────────────────┘
```

### StageScene Changes

The preview card is created in `StageScene.renderLayout()` via `this.createPreviewCard()`. Update `createPreviewCard`:

1. **Wave label**: Replace the current dynamic text assignment with a fixed label that gets updated from the snapshot event
2. **Pill tags**: Create/destroy pill tag containers based on `wavePreview.tags`
3. **Special enemy card**: Create/destroy a compact `SpecialEnemyCard` when `wavePreview.specialEnemyId` is non-null

### Snapshot Event Consumption

The `stage:snapshot-updated` event now carries `wavePreview: StageWavePreviewModel | null` (task 07). Update `StageScene` to consume it:

In `syncPresentation()` or `publishSnapshot()`:
- Read `wavePreview` from the snapshot
- If `wavePreview` is null (terminal phase), show terminal text (existing behavior)
- If `wavePreview` is present:
  - Update wave label: `WAVE ${wavePreview.waveNumber}/${wavePreview.totalWaves}`
  - Render pill tags from `wavePreview.tags`
  - If `wavePreview.waveKind === 'elite' || 'boss'`, render special enemy card using `wavePreview.specialEnemyId` and `wavePreview.specialEnemyName`

### Tag Rendering with PillTag Component

Import `createPillTag` from task 15's component location. For each tag in `wavePreview.tags`:
```ts
const tagContainer = createPillTag(this, tag);
// Position horizontally centered in the preview card
```

Track created tag containers so they can be destroyed when the preview updates.

### Special Enemy Card Rendering

When `wavePreview.specialEnemyId` is non-null:
```ts
const enemyCard = createSpecialEnemyCard(this, wavePreview.specialEnemyId, 'wave-preview');
// Position below tags in the preview card
```

The card shows:
- Placeholder enemy visual (~110×110px area)
- Enemy name (16px, centered)
- Role label (12px, muted — e.g., "Elite Tank", "Boss")

### Preview Card Dimensions

The preview card currently has dimensions from `StagePresentationConfig.PREVIEW_CARD_WIDTH/HEIGHT`. With tags + optional enemy card, the height may need to increase. Adjust `StagePresentationConfig` as needed, or make the card height dynamic.

Suggested new height: ~280px (was likely ~180px for text-only). The width stays the same.

### Backward Compatibility — Terminal States

When the stage is in terminal state (`stage_complete` / `stage_failed`), the preview card should show the terminal message (existing behavior). The `wavePreview` field will be null, so fall back to text display.

## Acceptance Criteria

- [ ] Wave preview shows `WAVE N/10` label
- [ ] Pill tags are rendered with correct colors and order for each wave
- [ ] Elite waves (wave 5) show the special enemy card (e.g., Iron Kick for Stage 1)
- [ ] Boss waves (wave 10) show the special enemy card (e.g., Redline Headliner for Stage 1)
- [ ] Normal waves do NOT show a special enemy card
- [ ] Preview updates correctly when moving between build phases (wave 1 → wave 2 → ...)
- [ ] Preview card is hidden during combat phase (existing behavior preserved)
- [ ] Terminal states still show appropriate text (or are hidden)
- [ ] Tags use same `PillTag` component as the lobby (consistent look)
- [ ] `npx tsc --noEmit` passes

## Technical Notes

- The `StageScene` currently reads `event.payload.previewTitle` and `previewBody` from `stage:snapshot-updated`. These fields may still exist but are deprecated in favor of `wavePreview`. Update the code to read `wavePreview` instead, with a fallback to the old text fields for backward compatibility until all consumers are migrated.
- The `syncPresentation()` method in `StageScene` handles preview card content. It currently sets `this.previewBodyLabel.setText(preview.bodyLines.join('\n'))`. Replace this with the pill tag + enemy card rendering.
- `StageFlowAnimator` may animate the preview card. Ensure the animation still works with the new container structure.
- The preview card container (`this.previewCard`) is referenced in `StageFlowAnimator`. Keep the container reference but update its internal contents.
- For clean tag lifecycle management, store created tag containers in an array and destroy them all before rebuilding the preview.

## Implementation Plan

1. Update `StageScene.createPreviewCard()` to create the new layout:
   - Wave label text object
   - Container for pill tags (initially empty)
   - Placeholder for special enemy card (initially null)
2. Update `syncPresentation()` to consume `wavePreview` from the snapshot event:
   - Destroy old tag containers
   - Destroy old enemy card (if any)
   - Create new tag containers from `wavePreview.tags`
   - Create enemy card if `wavePreview.specialEnemyId` is non-null
3. Update `publishSnapshot()` or the snapshot consumer to provide `wavePreview` in the event
4. Adjust preview card height in `StagePresentationConfig` if needed
5. Test with Stage 1: verify wave 1 shows Red/Fast tags, wave 5 shows Iron Kick card, wave 10 shows Redline Headliner card
6. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 07-task-stage-runtime-plumbing (needs `StageWavePreviewModel` with tags and special enemy data in the snapshot event)
- Blocked by 15-task-lobby-detail-and-result (needs `PillTag` and `SpecialEnemyCard` components)

## Type

AFK

## Design Spec Reference

- [Wave Preview in Build Phase](../design-spec.md#wave-preview-in-build-phase)
- [Pill Tag Component](../design-spec.md#pill-tag-component)
- [Special Enemy Card Component — Wave preview variant](../design-spec.md#special-enemy-card-component)
- [Wave Preview Data Flow](../design-spec.md#wave-preview-data-flow)
