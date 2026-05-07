# 07 — Build UI: Modifier Icons + Compatibility

## Task Intent

Render slot modifier icons on the build-phase record and implement the pawn↔modifier compatibility check. After this task, the player sees modifier icons outside the vinyl's outer rim at the correct angular position for each modified slot. The icons remain visible whether the slot is empty or occupied. A pure compatibility function determines whether a pawn placed on a slot is compatible with that slot's modifier.

This task creates two modules:
1. **`ModifierIconRenderer.ts`** — creates and positions Phaser display objects for modifier icons.
2. **`ModifierCompatibility.ts`** — pure function for checking pawn↔modifier compatibility.

No tooltip interaction or green link animation yet — those are task 08.

## Relevant Context

**From the Design Spec — Icon Positioning:**
- Icons sit just outside the outer edge of the record at the angular position of their slot.
- Icons must remain visible when the slot is occupied (they're outside the record, not on it).
- Only up to 3 modified slots exist, so per-frame cost is negligible.

**From the Design Spec — Compatibility Model:**
Three compatibility shapes:
1. **Note-output modifiers** (`output-note-bonus`, `color-output-note-bonus`): compatible with any pawn whose activation emits output notes. Both generators and finishers qualify.
2. **Archetype modifiers** (`projectile-bonus`, `beam-count-bonus`): compatible when `pawn.ability.primaryArchetype` matches the target archetype.
3. **Cross-archetype AoE** (`aoe-radius-scale`): compatible when `primaryArchetype` is `'explosion'` OR `'zone'`.
4. **Double activation** (`double-activation`): compatible with ALL pawns (it's universal — any pawn can activate twice).

**From the Design Spec — No New Metadata:**
- Compatibility reads `pawn.ability.primaryArchetype`, `pawn.type`, `pawn.color`, `pawn.outputNoteColor` — all already exist in `CombatContentConfig.ts`.

**Current code:**
- `StageScene.ts` line 275: `createBuildRecord()` renders the record with 8 slot arcs.
- `StageScene.ts` line 297-369: slot arc creation loop, record radius from `StagePresentationConfig.BUILD_RECORD_RADIUS`.
- `StageScene.ts` line 610: `refreshRecordPawnViews()` updates pawn sprites on slots.
- `StageScene.ts` line 88-90: `recordContainer`, `recordPawnLayer`, `recordInnerLabelLayer`.

## In Scope

- `src/scenes/stage/ModifierIconRenderer.ts` — creates modifier icons on the record
- `src/scenes/stage/ModifierCompatibility.ts` — pure compatibility check function
- `StageScene.ts` — wire icon rendering in build phase, call compatibility on pawn placement/move
- Procedural placeholder icons (colored circles/shapes keyed by `iconKey`)

## Out of Scope

- Tooltip inspection of modifier icons (task 08)
- Green link animation on compatible placement (task 08)
- Re-showing link during inspection (task 08)
- Final art assets — use procedural shapes for now

## Detailed Requirements

### ModifierIconRenderer.ts

```ts
interface ModifierIconView {
  slotIndex: number;
  modifierId: string;
  container: Phaser.GameObjects.Container; // icon + optional background
}

function createModifierIcons(
  scene: Phaser.Scene,
  stageRuntime: StageRuntime,
  recordGroup: Phaser.GameObjects.Container,
): ModifierIconView[]
```

**Icon placement:**
- For each `SlotModifierAssignment` in `stageRuntime.slotModifiers`:
  - Compute the angular position of the slot: `angleDeg = -90 + (360 / 8) * slotIndex` (matches the record's slot positioning).
  - Compute the icon position: `distance = BUILD_RECORD_RADIUS + iconOffsetPx` where `iconOffsetPx` is large enough to place the icon clearly outside the vinyl rim (start with ~40px, tune visually).
  - `x = recordCenterX + cos(angleRad) * distance`
  - `y = recordCenterY + sin(angleRad) * distance`

**Icon visual (procedural placeholder):**
- Draw a small circle or diamond (24-32px radius) with a color that indicates the modifier effect kind:
  - Note-output modifiers: warm gold/amber tone
  - Archetype modifiers: cool blue/cyan tone
  - Premium modifiers: purple/magenta with a subtle glow or border
- Draw a simple glyph or letter inside (e.g., "+1" for note bonus, "P" for projectile, "×2" for double activation).
- Read `modifier.iconKey` from the config. Since final art isn't ready, use `iconKey` to pick a procedural shape/color. The mapping from `iconKey` to visual is internal to this module.

**Visibility:**
- Icons are always visible during build phase (they're outside the record, never occluded by pawns).
- Hide icons during combat phase (check `stageRuntime.phase`).

**Creation and cleanup:**
- `createModifierIcons` creates all icon views and adds them to the `recordGroup`.
- Return the array for later use by tooltip/link modules.
- Icons are destroyed and recreated when the stage changes (the `recordGroup` is destroyed on scene restart).

### ModifierCompatibility.ts

```ts
function isPawnCompatibleWithModifier(pawnId: string, modifierId: string): boolean
```

**Compatibility logic:**

1. Look up pawn definition from `CombatContentConfig` via `getCombatPawnDefinitionById(pawnId)`.
2. Look up modifier definition from `SLOT_MODIFIER_CONFIG.getModifierById(modifierId)`.
3. Switch on `modifier.effectKind`:

   **`output-note-bonus`:**
   - Compatible if pawn type is `'generator'` or `'finisher'` (both emit output notes).
   - Always `true` for valid pawns in v1.

   **`color-output-note-bonus`:**
   - Compatible if the pawn emits the target color.
   - For generators: `pawn.color === modifier.effectParams.targetColor`
   - For finishers: `pawn.outputNoteColor === modifier.effectParams.targetColor`

   **`projectile-bonus`:**
   - Compatible if `pawn.ability.primaryArchetype === 'projectile'`.
   - Note: compatible even for single-shot pawns (the modifier just has no effect).

   **`aoe-radius-scale`:**
   - Compatible if `pawn.ability.primaryArchetype === 'explosion'` OR `'zone'`.

   **`beam-count-bonus`:**
   - Compatible if `pawn.ability.primaryArchetype === 'beam'`.

   **`double-activation`:**
   - Compatible with ALL pawn types (universal modifier).
   - Always `true`.

4. Return `true` if compatible, `false` otherwise.

**Important:** Compatibility does NOT mean "the modifier has a useful effect." A single-shot projectile pawn IS compatible with `+1 projectile` even though the modifier does nothing for it. Compatibility is about archetype/type matching, not effect usefulness. This is intentional — the green link signals "this modifier is relevant to your pawn type," not "this modifier will change your pawn's output."

### StageScene.ts Integration

**Call `createModifierIcons` in build-phase rendering:**

After the record is created (in `createBuildRecord` or in the method that refreshes build visuals), call:
```ts
this.modifierIconViews = createModifierIcons(this, this.runtime, this.recordContainer!);
```

Store `modifierIconViews` as a new private field on `StageScene` for use by task 08 (tooltip/link).

**Call compatibility check on pawn placement/move:**

In the method that handles pawn placement (likely `handleSlotDrop` or similar), after a pawn is placed or moved into a slot:
```ts
const slotAssignment = this.runtime.slotModifiers.find(m => m.slotIndex === slotIndex);
if (slotAssignment) {
  const compatible = isPawnCompatibleWithModifier(pawnId, slotAssignment.modifierId);
  // Task 08 will use this to trigger the green link animation
  // For now, just compute and optionally log
}
```

**Refresh icons when build state changes:**
- If pawn placement/move/merge affects modifier state... it doesn't in v1 (modifiers are fixed per stage). No refresh needed.
- Icons just need to be created once per build phase entry.

**Hide icons during combat:**
- When `runtime.phase === 'combat'`, hide the modifier icon group.
- When returning to build phase (`runtime.phase === 'build'`), show them again.

## Acceptance Criteria

- [ ] Modifier icons appear outside the record rim at the correct angular position for each modified slot
- [ ] Icons remain visible when a pawn occupies the slot
- [ ] Icons are visible during build phase, hidden during combat phase
- [ ] `isPawnCompatibleWithModifier()` returns `true` for note-output modifier + any generator/finisher
- [ ] `isPawnCompatibleWithModifier()` returns `true` for `+1 red output note` + red generator
- [ ] `isPawnCompatibleWithModifier()` returns `false` for `+1 red output note` + blue finisher (outputNoteColor: 'blue')
- [ ] `isPawnCompatibleWithModifier()` returns `true` for `+1 projectile` + projectile pawn (any pattern)
- [ ] `isPawnCompatibleWithModifier()` returns `false` for `+1 projectile` + beam pawn
- [ ] `isPawnCompatibleWithModifier()` returns `true` for `+50% AoE radius` + explosion pawn
- [ ] `isPawnCompatibleWithModifier()` returns `true` for `+50% AoE radius` + zone pawn
- [ ] `isPawnCompatibleWithModifier()` returns `false` for `+50% AoE radius` + projectile pawn
- [ ] `isPawnCompatibleWithModifier()` returns `true` for `Double activation` + any pawn type
- [ ] `npx tsc --noEmit` passes
- [ ] No regression in build phase rendering

## Technical Notes

**Record coordinate system:**
The record is rendered in a `Phaser.GameObjects.Container` at a position in the scene. All children of the container use local coordinates relative to the container's origin. `ModifierIconRenderer` receives the `recordGroup` container and adds icons as children — they automatically move with the record if it's animated.

**Slot angle calculation:**
The record slots use `angleDeg = -90 + (360 / slotCount) * slotIndex` where `-90` puts slot 0 at the top. The modifier icon uses the same formula so it aligns with its slot.

**Procedural icons:**
Use Phaser `Graphics` objects to draw simple shapes. Don't create textures or load assets. Each icon is a small `Container` with a `Graphics` child and optionally a `Text` child for the label. This keeps the task self-contained — no asset pipeline dependencies.

**Compatibility function:**
`ModifierCompatibility.isPawnCompatibleWithModifier` is a pure function with no Phaser or scene dependencies. It reads from `CombatContentConfig` and `SlotModifierConfig` — both are pure data modules. This makes it independently testable.

**Where to store modifier icon views:**
Add `private modifierIconViews: ModifierIconView[] = []` to `StageScene`. In `createBuildRecord()`, after the record container is assembled, call `createModifierIcons` and assign the result.

## Implementation Plan

1. Create `src/scenes/stage/ModifierCompatibility.ts`:
   - Import `getCombatPawnDefinitionById` from `@config/CombatContentConfig`
   - Import `SLOT_MODIFIER_CONFIG` from `@config/SlotModifierConfig`
   - Implement `isPawnCompatibleWithModifier(pawnId, modifierId)` following the logic above
   - Export the function
   - Write unit tests: each compatibility shape, positive and negative cases

2. Create `src/scenes/stage/ModifierIconRenderer.ts`:
   - Import `StageRuntime`, `SlotModifierAssignment` from their modules
   - Import `StagePresentationConfig` for `BUILD_RECORD_RADIUS`
   - Define `ModifierIconView` interface
   - Implement `createModifierIcons()`:
     - Compute positions, create containers, draw procedural shapes
     - Map `iconKey` → procedural visual
   - Export the function and types

3. Update `src/scenes/stage/StageScene.ts`:
   - Import `createModifierIcons` and `ModifierIconView`
   - Import `isPawnCompatibleWithModifier`
   - Add `private modifierIconViews: ModifierIconView[] = []` field
   - In `createBuildRecord()`: after the record container is complete, call `createModifierIcons()` and store result
   - In the build/combat visibility toggle (around line 1071): show/hide modifier icons based on phase
   - In pawn placement handler: call `isPawnCompatibleWithModifier()` when a pawn lands on a modified slot

4. Validate visually (run the game, enter build phase, verify icons appear):
   - Check icon positions at each slot angle
   - Verify icons are outside the vinyl rim
   - Place pawns on modified slots — icons remain visible

5. Run `npx tsc --noEmit` and `npm run test:run`

## Additional Notes

**UI/UX:** Icons should be visually lightweight — they compete for attention with the shop panel, coins display, and pawn sprites. Keep them small (24-32px) and semi-transparent rather than fully opaque.

**Procedural icon key mapping:**
| iconKey (from config) | Procedural visual |
|---|---|
| `icon-note-plus` | Gold circle with "+1" |
| `icon-note-red` | Red-tinted circle with "+1" |
| `icon-note-green` | Green-tinted circle with "+1" |
| `icon-note-blue` | Blue-tinted circle with "+1" |
| `icon-projectile-plus` | Cyan diamond with "P+" |
| `icon-aoe-radius` | Orange circle with expanding rings hint |
| `icon-beam-plus` | Cyan line with "+1" |
| `icon-note-plus-two` | Gold circle with "+2", subtle glow |
| `icon-double-activation` | Magenta circle with "×2", glow border |

The exact icon keys come from task 01's `SlotModifierConfig.ts`. When implementing this task, read the actual `iconKey` values and map them to appropriate procedural visuals.

## Blocked By

- Blocked by 02-stage-generation (needs `StageRuntime.slotModifiers` populated, `SlotModifierAssignment` type)

## Type

AFK

## Design Spec Reference

- [Player Experience](../design-spec.md#player-experience)
- [Build Phase Interaction Flow](../design-spec.md#build-phase-interaction-flow)
- [Modifier Compatibility Model](../design-spec.md#modifier-compatibility-model)
- [ModifierIconRenderer Module](../design-spec.md#build-ui-layer-small-modules-consumed-by-stagescene)
- [ModifierCompatibility Module](../design-spec.md#build-ui-layer-small-modules-consumed-by-stagescene)
- [UI / UX](../design-spec.md#ui--ux)
- [Pawn Compatibility — No New Metadata Needed](../design-spec.md#pawn-compatibility--no-new-metadata-needed)
