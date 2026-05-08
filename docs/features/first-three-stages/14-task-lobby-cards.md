# Stage Cards — Lobby Scene Scaffolding

## Task Intent

Build the stage selection cards portion of the `LobbyScene`: dark background, "STAGE SELECT" header, and three stage cards in a vertical column showing star ratings, stage names, and best HP. Implement card selection state (visual highlight) and tap-to-select behavior. Cards read data from `StageRegistry` and `SessionProgressStore`.

After this task, the lobby displays all three stages with correct star/HP information, and tapping a card selects it (updating the container that task 15's detail panel will connect to).

## Relevant Context

The lobby is a single Phaser scene (`LobbyScene`) with two logical halves:
1. **Stage cards** (top ~35% of viewport, ~448px) — this task
2. **Detail panel** (bottom ~65%, ~832px) — task 15

This task handles only the cards. The detail panel in task 15 will react to the selected card.

### Layout Specification

```
┌──────────────────────────┐ 720px
│  STAGE SELECT  (header)  │  ~60px — thin top bar, muted text
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │  stage card 1 (Redline Routine)
│  └────────────────────┘  │
│  ┌────────────────────┐  │  stage card 2 (Blue Noise Rush)
│  └────────────────────┘  │  ← ~448px (35% of 1280px)
│  ┌────────────────────┐  │  stage card 3 (Greenroom Collapse)
│  └────────────────────┘  │
│                          │
├──────────────────────────┤  ← detail panel (task 15)
```

### Card Component Spec

Each card is a horizontal rounded rectangle, ~688px wide (720 − 32px padding), ~120px tall.

**Contents (left → right):**
1. **Star indicator** (~100px wide): 3 stars, 24×24px, 6px gap. Never played or 0 stars → empty outlines at 30% opacity. 1–3 stars → filled glow in gold/amber `#FFD700` to `#FFA500`.
2. **Stage name** (~400px, centered): title case, 28–32px, white/light-gray with subtle text-shadow glow (stage's dominant color, 30% opacity, 4px blur).
3. **Best HP** (~120px, right-aligned): shown only if stage completed at least once. Format `88 HP`, 20–22px, muted white.

**Interaction states:**
- **Default**: background `#1A1E24`, border `#2A3040` (1px), star outlines 30% opacity
- **Hover/Pressed**: background `#1F2430`, border `#3A4050`, subtle scale-up 2–3px, 120ms ease-out
- **Selected**: background `#1C2230`, border `#4A60A0` (2px, muted neon blue-white), stage name slightly brighter. Selection is universal, not color-themed.

**Card ordering**: fixed — Redline Routine, Blue Noise Rush, Greenroom Collapse. No scrolling.

## In Scope

- `LobbyScene` full class (replacing the stub from task 13)
- Background rendering (solid `#101418` or gradient)
- Header text "STAGE SELECT" (14–16px, uppercase, `rgba(255,255,255,0.3)`, letter-spacing 3px)
- Three stage cards rendered from `StageRegistry.getAllStageConfigs()`
- Star indicator rendering with logic:
  - Unplayed → 3 empty outlines
  - Played with 0 stars (defeat) → 3 empty outlines
  - 1–3 stars → filled gold + remaining outlines
- Stage name with color-tinted glow (use dominant tag color for glow tint: Red → `#FF6B6B`, Green → `#6BFF8B`, Blue → `#6B9BFF`)
- Best HP display (only if `stars > 0`)
- Selection state management: `selectedStageId` tracked in scene state
- Tap/press handling on each card → set `selectedStageId`
- Cards read from `SessionProgressStore` for star/HP data

## Out of Scope

- Detail panel (task 15)
- Result modal (task 15)
- "Start" button (task 15)
- Pill tags (task 15)
- Special enemy cards (task 15)
- Any animation beyond hover/selection transitions

## Detailed Requirements

### Scene State

```ts
interface LobbyState {
  selectedStageId: string | null;
}
```

On create, restore `lastSelectedStageId` from `SessionProgressStore` if available, otherwise default to first stage (or null).

### Card Rendering

For each `StageConfig` in `getAllStageConfigs()`:
1. Get `StageResult` from `SessionProgressStore.getResult(stageConfig.id)`
2. Determine card visual state: default, selected (if `stageConfig.id === selectedStageId`)
3. Render the card container with Phaser Graphics and Text objects

#### Star Rendering

Use a helper that draws 3 stars:
- Unplayed/null result → 3 empty outline stars
- Drawn as unfilled star shape with stroke only, `rgba(255,255,255,0.3)`, 24×24px

- Played with stars > 0 → N filled stars + (3-N) empty outlines
- Filled star: golden glow `#FFD700` with 4px soft glow at 60% opacity

Since Phaser doesn't have built-in star shapes, use:
- Star polygon (5-pointed) via `this.add.graphics()` 
- OR a simple text character like `★` / `☆` in a large font with glow effect

**Recommended approach**: Use text characters `★` (filled) and `☆` (empty) since they're simple and clear. Apply gold color `#FFD700` with shadow for glow.

```ts
// Example
const starChar = stars > 0 ? '★' : '☆';
const starColor = stars > 0 ? '#FFD700' : 'rgba(255,255,255,0.3)';
```

#### Stage Name Glow

Use the first color tag from `stageConfig.stageTags` to determine glow color:
- `'Red'` → glow `#FF6B6B`
- `'Green'` → glow `#6BFF8B`
- `'Blue'` → glow `#6B9BFF`
- Fallback: no glow (white text only)

Apply via Phaser text shadow: `setShadow(0, 0, glowColor, 4, true, true)` with low alpha.

There's no direct alpha on shadow in Phaser Text. Workaround: use a second text object behind with glow color and alpha, offset by 0, blurred-like appearance via multiple shadows.

#### Card Interaction

Each card is a `Phaser.GameObjects.Container` with:
- Background `Graphics` (rounded rectangle)
- Text objects for stars, name, HP
- `setInteractive()` on the container (or a hit area)
- `pointerdown` → set `selectedStageId`, update all card visuals
- Optional: `pointerover`/`pointerout` for hover state on desktop

### Card Dimensions and Positioning

Given viewport 720×1280:
- Horizontal padding: 16px each side → card width: 688px
- Card height: 120px
- Vertical gap between cards: 12px
- 3 cards + 2 gaps = 3×120 + 2×12 = 384px, plus top padding ~32px below header → fits within ~448px area

Start Y for cards: header bottom (~60px) + some padding. Calculate: `headerBottom + 32`.

Each card Y: `firstCardY + index * (120 + 12)`

Star area X: 16 + 50 (centered in left area)
Name X: 16 + 120 (after star area, 100px wide)
HP X: 720 - 16 - 120 - offset

## Acceptance Criteria

- [ ] `LobbyScene` renders with dark background and "STAGE SELECT" header
- [ ] Three stage cards are visible, ordered: Redline Routine, Blue Noise Rush, Greenroom Collapse
- [ ] Unplayed stages show 3 empty star outlines
- [ ] Star display updates from `SessionProgressStore` (verify after completing a stage in the loop)
- [ ] Best HP text appears only for stages with `stars > 0`
- [ ] Tapping a card selects it (visual highlight: thicker border, brighter name)
- [ ] Tapping another card deselects previous and selects new
- [ ] Stage names show subtle color-tinted glow matching their dominant color
- [ ] Cards fit within the top 35% of the viewport without overflow
- [ ] `npx tsc --noEmit` passes
- [ ] Scene transitions from `StageScene` back to lobby work correctly

## Technical Notes

- This task replaces the `LobbyScene` stub from task 13. The scene key is already registered.
- Use `getAllStageConfigs()` from `StageRegistry` to get the stage list.
- The `SessionProgressStore` is a module-level singleton — just import and call methods directly.
- Phaser `Graphics` needs explicit `destroy()` calls in scene shutdown to avoid memory leaks.
- The card containers should be stored in an array for easy iteration during selection updates.
- Star rendering: if using text `★`/`☆`, test on device to ensure the characters render. Fallback to `Graphics`-drawn stars if needed.

## Implementation Plan

1. Create `LobbyScene` class in `src/scenes/lobby/LobbyScene.ts`
2. In `create()`:
   - Set camera background to `#101418`
   - Draw "STAGE SELECT" header
   - Iterate `StageRegistry.getAllStageConfigs()` to build 3 cards
   - For each card, read `SessionProgressStore.getResult(id)`
   - Render stars, name, HP
   - Set up interactivity
3. Handle `data?.showResult` — if true, store it for task 15's modal (no modal rendering yet)
4. Handle `data?.stageId` — if provided, set `selectedStageId` to it
5. Implement `refreshCards()` method that redraws star/HP/selection state for all cards
6. On `pointerdown` on a card: update `selectedStageId`, call `refreshCards()`
7. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 01-task-config-types-and-registry (needs `StageRegistry`, `SceneKeys.LOBBY`)
- Blocked by 06-task-session-progress-and-stars (needs `SessionProgressStore`)

## Type

AFK

## Design Spec Reference

- [Stage Selection (Lobby)](../design-spec.md#stage-selection-lobby)
- [Screen Layout: LobbyScene](../design-spec.md#screen-layout-lobbyscene)
- [Stage Card Component](../design-spec.md#stage-card-component)
- [Interaction & Responsiveness](../design-spec.md#interaction--responsiveness)
- [Visual Identity & Tone](../design-spec.md#visual-identity--tone)
