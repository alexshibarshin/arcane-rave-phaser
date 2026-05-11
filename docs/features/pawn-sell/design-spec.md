# Pawn Sell — Design Spec

## Document Intent

This document is a self-contained implementation handoff for the pawn sell feature. It should be understandable without the original discussion and gives the next agent enough gameplay, product, technical, and architectural context to execute safely.

## Executive Summary

Pawn sell allows players to sell pawns from the build-phase rack back to the shop for coins. The feature introduces a sell overlay on the shop panel that appears when the player drags a pawn from the rack, and a lobby toggle to enable/disable the feature per session. It adds a coin sink mechanic that gives players flexibility in managing their pawn economy during a stage.

## Problem Statement

Currently, once a player purchases a pawn from the shop and places it on the rack, there is no way to recover any value from that pawn. This creates dead weight in the player's deck — a pawn they no longer want or need becomes permanently locked in their build. Pawn sell gives players an exit valve, improving decision-making confidence and reducing frustration from bad purchases.

## Goals

- Allow players to sell any pawn from the rack for a percentage of its fair value
- Provide a visible, intuitive sell zone that appears during rack pawn drags
- Give players a toggle to enable/disable the feature per session via the lobby
- Add a coin sink mechanic that improves economy balance flexibility

## Non-Goals

- Selling pawns from the shop offers (before purchase)
- Selling pawns during combat phase
- Per-pawn or per-tier sell price customization
- Sell price modifiers from slot modifiers or other game systems
- Persistence of sell preference across game sessions (session-scoped only)

## Feature Scope

### Included behaviors

- Lobby toggle (radio button block) to enable/disable sell on/off, default ON
- Sell overlay on the shop panel that appears when dragging a rack pawn
- Sell price calculation: `ceil(shopPrice × 2^(tier-1) × SELL_RATIO)`
- Pawn disappears with scale-down + fade-out animation on successful sale
- Coin feedback animation plays after pawn animation completes
- Sell logic in StageRuntime as a new function

### Included systems

- `LobbyScene` — new radio button block
- `SessionProgressStore` — new `sellEnabled` field
- `StageScene` — overlay show/hide coordination, pawn animation
- `StageShopView` — new sell overlay element
- `StageDragController` — new callbacks, `getDropTarget()` method
- `StageRuntime` — new `sellStagePawnFromSlot()` function
- `StageFlowConfig` — new `SELL_RATIO` constant

### Integration expectations

- Works alongside existing shop purchase, pawn move, and pawn merge flows
- Does not interfere with shop card drag interactions
- Synergies auto-update via existing `recordView.refresh()` → `updateSynergy()` chain

## Player Experience

### Entry point

The feature is available by default at the start of every stage. Players can disable it in the lobby before starting.

### What the player sees and does

1. **Build phase** — rack has pawns, shop panel shows offers
2. **Player picks up a rack pawn** — sell overlay fades in on the shop panel, showing "Drag here to SELL" and the sell price (e.g., "+5c")
3. **Player drags pawn over the overlay** — visual feedback that the pawn is in the sell zone
4. **Player drops on overlay** — pawn scales down and fades out (200ms), then coin feedback "+5c" appears
5. **Player drops on a rack slot** — normal move/merge behavior (1c reposition or free merge)
6. **Player drops elsewhere** — pawn snaps back to its home position, no message

### How it should feel

- Selling should feel like a clear, intentional action — the overlay is distinct from the shop
- The price is shown immediately when the pawn is picked up, not after dropping
- The sell zone is visually separate from the shop cards (dark semi-transparent background)
- No error messages on failed drops — just the pawn returning to its slot

## Core Mechanics

### Sell price formula

```
fairPrice = shopPrice × 2^(tier - 1)
sellPrice = ceil(fairPrice × SELL_RATIO)
```

Where:
- `shopPrice` comes from `CombatPawnDefinition.shopPrice`
- `tier` is the pawn's current tier (1, 2, or 3)
- `SELL_RATIO` is a configurable constant (default: 0.5)

Examples (SELL_RATIO = 0.5):
- Tier 1 pawn with shopPrice 5: fair = 5×1 = 5, sell = ceil(5×0.5) = 3
- Tier 2 pawn with shopPrice 5: fair = 5×2 = 10, sell = ceil(10×0.5) = 5
- Tier 3 pawn with shopPrice 5: fair = 5×4 = 20, sell = ceil(20×0.5) = 10

### Standing rules

- Sell is only available during the build phase
- Any pawn in any rack slot can be sold (no restrictions)
- Selling does not trigger any error messages on failure
- Sell price is calculated at drag start, not at drop time
- The sell overlay is only visible when a rack pawn is being dragged
- Selling a pawn removes it from `runtime.build.slots[slotIndex]` and adds coins to `runtime.coins`
- Synergies auto-update via `recordView.refresh()` → `updateSynergy()`

### Preconditions

- Sell feature must be enabled (lobby toggle)
- Pawn must exist in a rack slot (not null)
- Player must be in build phase
- Player must drop the pawn on the sell overlay (not a slot, not elsewhere)

## Gameplay Flow

### Primary flow: Successful sale

1. Player presses mouse/touch on a rack pawn → `DRAG_START` fires
2. `StageDragController.resolvePayload()` returns `{ kind: 'slot-pawn', slotIndex, pawnId, tier }`
3. `StageDragController` calls `callbacks.onSellDragStart(pawnId, tier)`
4. `StageScene` computes `sellPrice = ceil(shopPrice × 2^(tier-1) × SELL_RATIO)`
5. `StageScene` calls `shopView.showSellOverlay(sellPrice)`
6. Overlay fades in (150ms), showing sell text and price
7. Player drags pawn, overlay is visible
8. Player releases mouse on the overlay → `DRAG_END` fires
9. `StageDragController.getDropTarget()` returns `{ kind: 'sell' }`
10. `StageDragController` calls `callbacks.onSellAttempt(slotIndex)`
11. `StageScene` calls `sellStagePawnFromSlot(runtime, slotIndex)`
12. `runtime.build.slots[slotIndex] = null`, `runtime.coins += sellPrice`
13. `StageDragController` calls `callbacks.onSellDragEnd()`
14. `StageScene` calls `shopView.hideSellOverlay()`
15. `StageScene` animates pawn: scale down + fade out (200ms)
16. On animation complete: `refreshBuildUI()` → `recordView.refresh()` → `shopView.refresh()` → `syncPresentation()` → coin feedback plays

### Alternate flow: Pawn dropped on rack slot

1. Steps 1-7 same as primary
2. Player releases mouse on a rack slot → `DRAG_END` fires
3. `StageDragController.getDropTarget()` returns `{ kind: 'slot', slotIndex }`
4. `StageDragController` falls through to existing move/merge logic
5. `StageScene` calls `callbacks.onSellDragEnd()` → overlay fades out
6. Existing merge/move logic executes

### Alternate flow: Pawn dropped elsewhere

1. Steps 1-7 same as primary
2. Player releases mouse outside overlay and slots → `DRAG_END` fires
3. `StageDragController.getDropTarget()` returns `{ kind: 'none' }`
4. Pawn snaps back to home position
5. Overlay fades out

## System Model

| System | Responsibility |
|--------|---------------|
| `LobbyScene` | New radio button block for sell toggle, persists to `SessionProgressStore` |
| `SessionProgressStore` | Stores `sellEnabled: boolean`, default `true` |
| `StageScene` | Orchestrator: coordinates overlay show/hide, pawn animation, coin feedback |
| `StageShopView` | Presents sell overlay; exposes `showSellOverlay(price)`, `hideSellOverlay()`, `containsSellOverlayPoint(x,y)`, `isSellOverlayVisible()` |
| `StageDragController` | Drop target resolution via `getDropTarget()`, dispatches sell callbacks |
| `StageRuntime` | Authoritative sell logic via `sellStagePawnFromSlot()` |
| `StageFlowConfig` | Holds `SELL_RATIO` constant |
| `StageRecordView` | Pawn removal via `refresh()` → `updateSynergy()` (existing chain) |

## Technical Design

### New files

None. All changes are in existing files.

### Modified files

1. **`src/config/StageFlowConfig.ts`** — Add `SELL_RATIO: 0.5`
2. **`src/session/SessionProgressStore.ts`** — Add `sellEnabled` getter/setter
3. **`src/scenes/lobby/LobbyScene.ts`** — Add second radio button block for sell toggle
4. **`src/scenes/stage/StageShopView.ts`** — Add sell overlay element with methods
5. **`src/scenes/stage/StageDragController.ts`** — Add `getDropTarget()`, new callbacks
6. **`src/scenes/stage/StageScene.ts`** — Wire sell callbacks, pawn animation
7. **`src/stage/StageRuntime.ts`** — Add `sellStagePawnFromSlot()` function

### Recommended implementation shape

#### Phase 1: Infrastructure
1. Add `SELL_RATIO` to `StageFlowConfig`
2. Add `sellEnabled` to `SessionProgressStore`
3. Add sell radio block to `LobbyScene` (copy pattern from merge rule block)
4. Pass `sellEnabled` from lobby to stage scene via `data`

#### Phase 2: Sell overlay
5. Add sell overlay to `StageShopView` (graphics + text elements)
6. Implement `showSellOverlay(price)`, `hideSellOverlay()`, `containsSellOverlayPoint(x,y)`, `isSellOverlayVisible()`
7. Overlay: dark semi-transparent background, border, text styling

#### Phase 3: Drag integration
8. Extend `StageDragCallbacks` interface with 3 new optional callbacks
9. Add `getDropTarget()` method to `StageDragController`
10. Wire callbacks in `StageScene`

#### Phase 4: Sell logic
11. Add `sellStagePawnFromSlot()` to `StageRuntime`
12. Implement pawn sell animation in `StageScene`
13. Wire everything together in `StageScene.createAdapters()`

### Lifecycle concerns

- On scene shutdown: overlay destroyed as part of `StageShopView.destroy()`
- On phase change (build → combat → build): overlay hidden, callbacks unregistered
- On stage restart: `SessionProgressStore.sellEnabled` persists (session-scoped)

## Data Flow

```
LobbyScene
  └─ SessionProgressStore.sellEnabled (boolean, default true)
       └─ StageScene.data.settings.sellEnabled (boolean)
            └─ StageDragController.callbacks.onSellDragStart (optional)
                 └─ StageScene (computes sellPrice)
                      └─ StageShopView.showSellOverlay(price)
                           └─ Player drops on overlay
                                └─ StageDragController.getDropTarget() → 'sell'
                                     └─ StageScene.callbacks.onSellAttempt(slotIndex)
                                          └─ StageRuntime.sellStagePawnFromSlot(runtime, slotIndex)
                                               ├─ runtime.build.slots[slotIndex] = null
                                               └─ runtime.coins += sellPrice
                                                    └─ refreshBuildUI()
                                                         ├─ recordView.refresh() → updateSynergy()
                                                         ├─ shopView.refresh()
                                                         └─ syncPresentation() → playCoinFeedbackIfNeeded()
```

### Key data points

- **Input**: Player drag on rack pawn, drop position
- **Decision**: `getDropTarget()` determines if drop is on overlay, slot, or none
- **Computation**: `sellPrice = ceil(shopPrice × 2^(tier-1) × SELL_RATIO)`
- **Output**: `runtime.coins` incremented, `runtime.build.slots[slotIndex]` set to null
- **UI events**: Overlay show/hide, pawn animation, coin feedback

## State Model

### Session state (SessionProgressStore)

- `sellEnabled: boolean` — persists across scene transitions, reset on page reload
  - Default: `true`
  - Transitions: `true` → `false` or `false` → `true` (lobby toggle)

### Runtime state (StageRuntime)

- `runtime.coins` — incremented by sell price on successful sale
- `runtime.build.slots[slotIndex]` — set to `null` on successful sale
- `runtime.phase` — must be `'build'` for sell to be available

### Transient state (StageShopView)

- `sellOverlayVisible: boolean` — true only during rack pawn drag
  - Default: `false`
  - Transition to `true`: `DRAG_START` with `slot-pawn` payload
  - Transition to `false`: `DRAG_END` (any payload), or `hideSellOverlay()` called explicitly

### Invariants

- Sell overlay is only interactive when visible
- Sell overlay is only visible when sell feature is enabled AND a rack pawn is being dragged
- Sell price is computed once at drag start, not recalculated on drop
- A pawn can only be sold once (it disappears after sale)

## Integration Points

| System | Interaction |
|--------|-------------|
| `StageShopView` | New overlay element; show/hide methods; hit testing |
| `StageDragController` | Extended callbacks; new `getDropTarget()` method |
| `StageScene` | Coordinates overlay, animation, runtime mutation |
| `StageRuntime` | New `sellStagePawnFromSlot()` function |
| `SessionProgressStore` | New `sellEnabled` field |
| `LobbyScene` | New radio button block |
| `StageFlowConfig` | New `SELL_RATIO` constant |
| `StageRecordView` | Synergy auto-update via `refresh()` (existing) |
| `StageCoinFeedback` | Coin feedback via `syncPresentation()` → `playCoinFeedbackIfNeeded()` (existing) |

## Content and Configuration

### New config: `StageFlowConfig.SELL_RATIO`

- Type: `number`
- Default: `0.5`
- Valid range: `0 < value <= 1`
- Represents the percentage of fair value returned on sale
- Located in `src/config/StageFlowConfig.ts` alongside `SHOP_PURCHASE_COST`, `REPOSITION_COST`, etc.

### New store field: `SessionProgressStore.sellEnabled`

- Type: `boolean`
- Default: `true`
- Scope: session (in-memory Map, survives scene transitions)
- Set from `LobbyScene` radio button

## Technical Constraints

- Phaser 3 coordinate system: `pointer.worldX/Y` are in canvas space; overlay is in shop container local space — conversion required via `worldTransform.inverseTransform()`
- Sell overlay must not block shop card interactions when hidden (non-interactive when not visible)
- Pawn animation must complete before `refreshBuildUI()` to avoid destroying the animated container
- Coin feedback timing: must fire after pawn animation, not before
- No EventBus events needed — sell is a local stage-scene operation
- No new assets required — overlay uses Phaser graphics + text primitives

## Failure Modes and Edge Cases

| Scenario | Behavior |
|----------|----------|
| Sell disabled in lobby | Overlay never appears; drag behaves as normal move/merge |
| Pawn dropped on overlay but slot was already null | No sale; pawn returns to home; no error message |
| Pawn dropped on overlay but runtime is not in build phase | No sale; pawn returns to home; no error message |
| Pawn dropped on overlay but `onSellAttempt` callback missing | No sale; pawn returns to home; no error message |
| Player drops on overlay, sale succeeds, then overlay still visible briefly | `onSellDragEnd` is called immediately after `onSellAttempt` success; overlay hidden before animation |
| Player drags rack pawn, overlay visible, then drops on shop card | Drop target is 'none' (not on overlay, not on slot); pawn returns to home; overlay fades out |
| Player sells last pawn in a slot | Slot set to null; synergy system auto-updates via `refresh()` |
| Player sells pawn, then immediately starts another drag | Overlay shows for new drag; no conflict |
| Scene transitions during pawn animation | Animation interrupted; scene shutdown destroys all tweens and containers |
| Sell price calculation for invalid tier | Tier is always 1-3 from `runtime.build.slots`; no invalid tier possible |

## Architecture Notes

### Why callbacks instead of direct method calls

`StageDragController` dispatches sell events via callbacks rather than calling `StageShopView` directly. This maintains the controller's responsibility (drag resolution) separate from the view's responsibility (UI presentation). The callbacks are optional, so when sell is disabled, the controller has zero overhead.

### Why `getDropTarget()` at the top of `DRAG_END`

A single drop target resolution method prevents scattered conditional logic. It answers one question: "where did the player drop?" — and all subsequent logic branches on that answer. This is cleaner than checking overlay visibility in multiple places.

### Why sell overlay is part of `StageShopView`

The overlay is visually and semantically part of the shop panel. It shares the same container, same positioning, same visibility lifecycle (hidden during combat). Keeping it in `StageShopView` avoids cross-scene state management.

### Why no EventBus events for sell

Sell is a local stage-scene operation. It doesn't affect other scenes (lobby, combat HUD). Adding events would create unnecessary coupling and make the flow harder to trace.

### Why sell price is computed at drag start, not at drop

The price is displayed to the player when the overlay appears. Computing it at drag start ensures the displayed price is consistent throughout the drag. There's no reason for the price to change mid-drag (pawn tier and definition don't change).

## Validation and Testing

### Functional gameplay checks

- [ ] Selling a tier-1 pawn with shopPrice 5 returns ceil(5 × 1 × 0.5) = 3 coins
- [ ] Selling a tier-2 pawn with shopPrice 5 returns ceil(5 × 2 × 0.5) = 5 coins
- [ ] Selling a tier-3 pawn with shopPrice 5 returns ceil(5 × 4 × 0.5) = 10 coins
- [ ] Selling a pawn removes it from the rack slot
- [ ] Selling a pawn adds coins to the player's total
- [ ] Coin feedback "+Xc" appears after pawn animation completes
- [ ] Synergies update after pawn sale (recordView.refresh → updateSynergy)

### Integration checks

- [ ] Sell overlay appears when dragging a rack pawn (not a shop card)
- [ ] Sell overlay does NOT appear when dragging a shop card
- [ ] Sell overlay does NOT appear when sell is disabled in lobby
- [ ] Shop cards remain draggable and purchasable when sell overlay is NOT visible
- [ ] Dropping a rack pawn on a rack slot triggers normal move/merge (not sell)
- [ ] Dropping a rack pawn outside overlay and slots returns pawn to home
- [ ] No error message appears on any failed drop
- [ ] Sell overlay fades in (150ms) and fades out (150ms)

### State/persistence checks

- [ ] `SessionProgressStore.sellEnabled` defaults to `true`
- [ ] Toggling sell OFF in lobby persists through stage start
- [ ] Toggling sell ON in lobby persists through stage start
- [ ] Sell preference survives scene transition (lobby → stage → lobby)
- [ ] Sell preference resets on page reload (session-scoped, not localStorage)

### Edge case checks

- [ ] Selling a pawn when sell is disabled does nothing; pawn returns home
- [ ] Selling the last pawn in the rack works correctly
- [ ] Selling a pawn during combat phase is impossible (overlay not visible)
- [ ] Selling a pawn immediately after another sale works correctly
- [ ] Dragging a pawn with sell overlay visible, then dropping on another rack slot — triggers move/merge, overlay fades out
- [ ] Scene shutdown during pawn sell animation — no errors, no memory leaks

### Regression checks

- [ ] Shop purchase flow unchanged (drag shop card to slot)
- [ ] Pawn merge flow unchanged (drag rack pawn to matching rack pawn)
- [ ] Pawn reposition flow unchanged (drag rack pawn to empty slot, costs 1c)
- [ ] Reroll button still functional
- [ ] Coin feedback for other operations (wave clear, merge reward) still works
- [ ] Start wave button still functional
- [ ] Preview card still displays correctly

## Definition of Done

- [ ] All validation checklist items pass
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Build passes (`npm run build`)
- [ ] Existing tests pass (`npm run test:run`)
- [ ] Sell overlay visually matches design (dark semi-transparent, border, text styling)
- [ ] Pawn sell animation is smooth (scale down + fade out, 200ms)
- [ ] Coin feedback timing is correct (after pawn animation)
- [ ] Lobby toggle defaults to ON
- [ ] Sell feature can be toggled OFF and properly disables all sell behavior
- [ ] No visual or interaction regressions in shop purchase, pawn move, pawn merge flows

## Assumptions

- The sell overlay dimensions match the shop panel dimensions (`SHOP_PANEL_WIDTH`, `SHOP_PANEL_HEIGHT`)
- The sell overlay is positioned at the same location as the shop panel container
- The pawn sell animation uses `Back.easeIn` for the scale-down effect
- The overlay text uses `monospace` font family consistent with other stage UI text
- The coin feedback animation is the existing `playCoinFeedbackIfNeeded()` — no new animation system needed
- The sell overlay background alpha is approximately 0.6 (semi-transparent dark)
- The sell overlay border color matches the shop panel border (`#57d9ff`)
- The lobby radio block for sell is placed to the right of the existing merge rule block, following the same visual pattern
- `StageScene` receives `sellEnabled` via scene data (`data.settings.sellEnabled`) passed from `LobbyScene`
- The pawn container reference is available via `recordView.getSlotPawnContainer(slotIndex)` for animation

## Open Questions

- Exact overlay dimensions: should it cover the entire shop panel or be a smaller zone within it? (Assumed: entire panel)
- Whether `onSellDragStart`/`onSellDragEnd` should use optional chaining (`?.`) or be required with a no-op default
- Whether the sell overlay should have any interaction state (hover highlight, press feedback)
