# 08 — Build UI: Tooltip + Compatibility Link

## Task Intent

Add hold-to-inspect tooltips for modifier icons and the green compatibility link animation between modifier icons and compatible pawns. After this task, the player can hold a modifier icon to see its tooltip in the same top-center tooltip area used for pawn inspection, and placing a compatible pawn on a modified slot triggers a brief green animated link.

This task creates two modules:
1. **`ModifierTooltipBridge.ts`** — wires hold-to-inspect for modifier icons into the existing StageScene tooltip system, maintaining the "one tooltip at a time" invariant.
2. **`ModifierLinkEffect.ts`** — creates and destroys the translucent green animated link between a modifier icon and a pawn.

## Relevant Context

**From the Design Spec — Tooltip Behavior:**
- Hold-to-inspect, not toggle-lock.
- Tooltip area at top center of build screen, shared between pawn and modifier inspection.
- Only one tooltip target active at any time.
- Tooltip shows: modifier display name, short description, effect summary.

**From the Design Spec — Compatibility Link:**
- Brief green animated link flashes between modifier icon and pawn on compatible placement.
- Semi-transparent, broad enough to feel lush, short-lived (tween/alpha fade).
- Optional re-display of the link while inspecting related objects.

**Current code — Pawn Tooltip System:**
- `StageScene.ts` line 95-101: tooltip UI elements (`tooltipContainer`, `tooltipSprite`, `tooltipTitle`, `tooltipMeta`, `tooltipTierStars`, `tooltipRule`, `tooltipDescription`)
- `StageScene.ts` line 105-108: `inspectedPawn`, `tooltipHoldTimer`, `tooltipLockedByDrag`
- `StageScene.ts` line 1082-1098: `bindPawnInspection()` — pointerdown starts 150ms timer, pointerout cancels
- `StageScene.ts` line 1101-1121: `showPawnTooltip()` — populates and shows the tooltip container
- `StageScene.ts` line 1123-1127: `hidePawnTooltip()` — hides the tooltip
- `StageScene.ts` line 1077: tooltip visibility depends on `buildVisible && inspectedPawn !== null`

**The tooltip currently shows pawn-specific content:** sprite, name, tier stars, type label, description, rule label. For modifier inspection, we need to show modifier-specific content instead.

**Current code — Slot Views:**
- `StageScene.ts` line 37-38: `StageRecordSlotView` with `slotIndex` and `container`.
- `StageScene.ts` line 102: `slotViews: StageRecordSlotView[]`.
- Slot views are created in `createBuildRecord()`.

## In Scope

- `src/scenes/stage/ModifierTooltipBridge.ts` — hold-to-inspect for modifier icons
- `src/scenes/stage/ModifierLinkEffect.ts` — green animated compatibility link
- `StageScene.ts` — wire tooltip bridge and link effect, extend tooltip to show modifier content
- Compatibility check call site (computed in task 07, consumed here for visual feedback)

## Out of Scope

- Changing the pawn tooltip layout/styling
- Adding new tooltip UI elements (reuse existing ones, repurpose content)
- Complex link animations (e.g., particle effects, glow trails) — simple tween is sufficient for v1

## Detailed Requirements

### ModifierTooltipBridge.ts

```ts
interface ModifierTooltipState {
  modifierId: string;
  slotIndex: number;
}

function bindModifierInspection(
  scene: Phaser.Scene,
  iconView: ModifierIconView,
  tooltipState: ModifierTooltipState,
  onShow: (state: ModifierTooltipState) => void,
  onHide: () => void,
): void
```

**Behavior:**
- On `pointerdown` on the icon container: start a 150ms hold timer (matching pawn inspection timing).
- On timer complete: call `onShow(tooltipState)`.
- On `pointerout`: cancel timer, call `onHide()` (unless locked by drag — re-use `tooltipLockedByDrag` pattern from pawn inspection).
- The scene reference is needed for `scene.time.delayedCall`.

**One-tooltip invariant:**
- When a modifier tooltip is shown, hide any active pawn tooltip (set `inspectedPawn = null`).
- When a pawn tooltip is shown, hide any active modifier tooltip.
- This is enforced in the `onShow`/`onHide` callbacks wired in `StageScene.ts`.

### StageScene.ts — Extend Tooltip for Modifiers

**Add a new inspected state:**
```ts
private inspectedModifier: ModifierTooltipState | null = null;
```

**Modify tooltip visibility condition (line 1077):**
```ts
this.tooltipContainer?.setVisible(
  buildVisible && (this.inspectedPawn !== null || this.inspectedModifier !== null)
);
```

**Add `showModifierTooltip(state: ModifierTooltipState)`:**
1. Hide pawn tooltip (set `inspectedPawn = null`).
2. Set `inspectedModifier = state`.
3. Look up modifier definition from `SLOT_MODIFIER_CONFIG.getModifierById(state.modifierId)`.
4. Populate the existing tooltip elements:
   - `tooltipSprite`: hide it (modifiers don't have a pawn sprite). Or replace with a simple icon using Graphics.
   - `tooltipTitle`: set to `modifier.displayName`.
   - `tooltipMeta`: set to `modifier.rarity === 'premium' ? 'Premium' : 'Common'`.
   - `tooltipTierStars`: hide it (no tier for modifiers).
   - `tooltipRule`: clear and optionally show a small color-coded label for the effect kind.
   - `tooltipDescription`: set to `modifier.shortDescription`.
5. Show the tooltip container.

**Add `hideModifierTooltip()`:**
1. Set `inspectedModifier = null`.
2. Hide tooltip (if no pawn tooltip is active either).

**Wire modifier inspection:**
After `createModifierIcons()` in `createBuildRecord()`, for each `ModifierIconView`:
```ts
bindModifierInspection(this, iconView, {
  modifierId: iconView.modifierId,
  slotIndex: iconView.slotIndex,
}, (state) => this.showModifierTooltip(state), () => this.hideModifierTooltip());
```

**Update `hidePawnTooltip()` to also clear modifier inspection:**
```ts
private hidePawnTooltip(): void {
  this.inspectedPawn = null;
  if (this.inspectedModifier === null) {
    this.tooltipContainer?.setVisible(false);
  }
}
```

Add a symmetric check in `hideModifierTooltip()`.

**Update `clearTooltipHoldTimer()` to cancel both timers:**
The pawn inspection timer and modifier inspection timer should both be cancellable. It's cleaner to use a single timer variable that both inspection bindings update. Or add a second timer variable for modifier inspection.

### ModifierLinkEffect.ts

```ts
function showCompatibilityLink(
  scene: Phaser.Scene,
  iconContainer: Phaser.GameObjects.Container,
  pawnContainer: Phaser.GameObjects.Container,
): void
```

**Visual design:**
- Draw a thin, semi-transparent green line or curve from the modifier icon to the pawn.
- Use a Phaser `Graphics` object for the line.
- Alpha starts at ~0.7 and fades to 0 over a short duration (~600-800ms).
- Optionally add a slight scale pulse (1.0 → 1.1 → 1.0) on the icon or pawn while the link is visible.

**Line geometry:**
- Start point: center of the modifier icon container (icon's world position).
- End point: center of the pawn container (pawn sprite's world position).
- Draw a straight line (or a slight arc for style) between the two points.

**Animation:**
```ts
const graphics = scene.add.graphics();
graphics.lineStyle(3, 0x44ff88, 0.7);
graphics.lineBetween(iconX, iconY, pawnX, pawnY);

scene.tweens.add({
  targets: graphics,
  alpha: 0,
  duration: 700,
  ease: 'Cubic.Out',
  onComplete: () => graphics.destroy(),
});
```

**Pooling/reuse:**
For v1 with ≤3 modified slots, creating and destroying Graphics objects is cheap. Pooling is unnecessary for ≤3 simultaneous links. If the player rapidly moves pawns between modified slots, old links fade out and new ones are created — the fade-out handles cleanup.

### StageScene.ts — Trigger Link on Placement

In the pawn placement handler (the same call site from task 07 where `isPawnCompatibleWithModifier` was called), if compatible:
```ts
if (compatible) {
  const iconView = this.modifierIconViews.find(v => v.slotIndex === slotIndex);
  const pawnView = this.slotViews.find(v => v.slotIndex === slotIndex);
  if (iconView && pawnView) {
    showCompatibilityLink(this, iconView.container, pawnView.container);
  }
}
```

**Re-show link during inspection:**
When the player holds a modifier icon AND the slot has a compatible pawn, show the link again:
- In `showModifierTooltip()`: check if the slot has a pawn, check compatibility, if compatible → show link.
- In `showPawnTooltip()`: check if the pawn's slot has a modifier, check compatibility, if compatible → show link.

**Implementation for re-show:**
Both `showModifierTooltip` and `showPawnTooltip` can call a helper:
```ts
private showCompatibilityLinkIfApplicable(slotIndex: number): void {
  const slot = this.runtime.build.slots[slotIndex];
  const modifier = this.runtime.slotModifiers.find(m => m.slotIndex === slotIndex);
  if (!slot?.pawnId || !modifier) return;

  if (isPawnCompatibleWithModifier(slot.pawnId, modifier.modifierId)) {
    const iconView = this.modifierIconViews.find(v => v.slotIndex === slotIndex);
    const slotView = this.slotViews.find(v => v.slotIndex === slotIndex);
    if (iconView && slotView) {
      showCompatibilityLink(this, iconView.container, slotView.container);
    }
  }
}
```

## Acceptance Criteria

- [ ] Holding a modifier icon for 150ms shows the modifier tooltip in the top-center tooltip area
- [ ] Modifier tooltip shows: display name, rarity (Common/Premium), short description
- [ ] Only one tooltip is active at a time (pawn tooltip hides when modifier tooltip shows, and vice versa)
- [ ] Releasing the icon hides the tooltip (hold-to-inspect, not toggle)
- [ ] Placing a compatible pawn into a modified slot triggers a green link animation
- [ ] Green link fades out within ~700ms
- [ ] Placing an incompatible pawn does NOT trigger the green link
- [ ] Inspecting a modifier while its slot has a compatible pawn re-shows the green link
- [ ] Inspecting a pawn on a modified slot re-shows the green link if compatible
- [ ] Modifier icons remain inspectable during build phase
- [ ] Tooltip is hidden during combat phase
- [ ] `npx tsc --noEmit` passes
- [ ] Existing build phase interactions (pawn drag, shop, merge) still work

## Technical Notes

**Tooltip repurposing:**
The pawn tooltip has pawn-specific elements (sprite, tier stars, rule label). For modifier tooltips, some elements are hidden or repurposed. Don't create a second tooltip container — reuse the existing one. The tooltip is positioned at the top center and is large enough to show modifier info.

**Timer management:**
The current code uses a single `tooltipHoldTimer`. For modifier inspection, you can either:
- Add `private modifierTooltipHoldTimer?: Phaser.Time.TimerEvent` and manage both independently.
- Or refactor to a single timer that tracks which inspection target is pending.

Prefer the simpler approach: add a second timer field. The logic is identical to pawn inspection — don't over-engineer.

**Link effect cleanup:**
Each call to `showCompatibilityLink` creates a new Graphics object that auto-destroys on tween complete. No manual cleanup needed. If the player rapidly re-places pawns, old links are mid-fade and new ones appear — this is visually acceptable for v1.

**Link effect coordinate conversion:**
The icon and pawn containers may be in different coordinate spaces (icon is a child of `recordContainer`, pawn might be in `recordPawnLayer`). Use Phaser's `getWorldTransformMatrix()` or the container's `x, y` relative to the scene to compute correct world positions for the line endpoints.

If coordinate conversion is problematic, pass the scene-relative coordinates directly to `showCompatibilityLink` instead of the containers:
```ts
function showCompatibilityLink(
  scene: Phaser.Scene,
  fromX: number, fromY: number,
  toX: number, toY: number,
): void
```

## Implementation Plan

1. Create `src/scenes/stage/ModifierTooltipBridge.ts`:
   - Import `ModifierIconView` from `./ModifierIconRenderer`
   - Define `ModifierTooltipState`
   - Implement `bindModifierInspection()` with pointerdown/pointerout and delayedCall
   - Export types and function

2. Create `src/scenes/stage/ModifierLinkEffect.ts`:
   - Implement `showCompatibilityLink()` with Graphics line and alpha tween
   - Export function

3. Update `src/scenes/stage/StageScene.ts`:
   - Import `bindModifierInspection`, `ModifierTooltipState`
   - Import `showCompatibilityLink`
   - Import `isPawnCompatibleWithModifier` (if not already from task 07)
   - Import `SLOT_MODIFIER_CONFIG` for modifier definition lookup
   - Add `inspectedModifier: ModifierTooltipState | null` field
   - Add `modifierTooltipHoldTimer` field (optional, can share timer)
   - Add `showModifierTooltip()`, `hideModifierTooltip()` methods
   - Add `showCompatibilityLinkIfApplicable()` helper
   - Update tooltip visibility condition
   - Wire `bindModifierInspection` after `createModifierIcons`
   - Call `showCompatibilityLinkIfApplicable` on pawn placement (if compatible)
   - Call `showCompatibilityLinkIfApplicable` in `showModifierTooltip` and `showPawnTooltip` (inspect re-show)

4. Validate manually:
   - Run the game, enter build phase
   - Hold a modifier icon → verify tooltip appears
   - Hold a pawn → verify pawn tooltip still works
   - Place compatible pawn on modified slot → verify green link
   - Place incompatible pawn → verify no green link
   - Inspect modifier on occupied compatible slot → verify link re-shows

5. Run `npx tsc --noEmit` and `npm run test:run`

## Additional Notes

**UI/UX — tooltip content for modifiers:**
The tooltip is shared between pawns and modifiers. When a modifier is inspected, the pawn sprite area should show a simple icon representing the modifier effect (a colored glyph or shape). The title shows the modifier name, the meta shows rarity, and the description shows the effect text. Keep it simple — don't redesign the tooltip for v1.

**UI/UX — link color and style:**
Green (`#44ff88`) on a dark vinyl background reads well. The line should be thick enough to see (3-4px) but thin enough to not obscure the pawn or icon. A slightly curved line (quadratic bezier) looks more organic than a straight line, but a straight line is acceptable for v1.

**Edge case — no pawn on slot:**
If the player inspects a modifier on an empty slot, no compatibility link is shown. The tooltip still works — it just describes the modifier without the contextual link.

**Edge case — rapid re-inspection:**
If the player quickly switches between inspecting a pawn and a modifier, the tooltip content changes without flicker because we reuse the same container. Update the content, don't hide/re-show.

## Blocked By

- Blocked by 07-build-ui-icons (needs `ModifierIconView` type, `createModifierIcons` call site, `isPawnCompatibleWithModifier` import in StageScene)

## Type

AFK

## Design Spec Reference

- [Player Experience — Tooltip Inspection](../design-spec.md#player-experience)
- [Build Phase Interaction Flow](../design-spec.md#build-phase-interaction-flow)
- [ModifierTooltipBridge Module](../design-spec.md#build-ui-layer-small-modules-consumed-by-stagescene)
- [ModifierLinkEffect Module](../design-spec.md#build-ui-layer-small-modules-consumed-by-stagescene)
- [UI / UX — Tooltip and Compatibility Feedback](../design-spec.md#ui--ux)
- [Art Direction — Green Compatibility Links](../design-spec.md#art-direction)
- [Failure Modes — Tooltip Conflict](../design-spec.md#failure-modes-and-edge-cases)
