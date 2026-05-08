# Lobby Detail Panel, Pill Tags, Special Enemy Cards, and Result Modal

## Task Intent

Build the remaining LobbyScene UI: the detail panel (stage name, pill tags, elite/boss special enemy cards, session result, Start button), reusable `PillTag` and `SpecialEnemyCard` components, and the result modal overlay (victory/defeat, stars, HP, Retry/Close buttons). The detail panel reacts to card selection from task 14.

After this task, the lobby is fully functional: selecting a stage shows its details, the Start button launches the stage, and returning from a stage shows the result modal.

## Relevant Context

This is the largest UI task. It creates three reusable components (`PillTag`, `SpecialEnemyCard` in two variants, `ResultModal`) and integrates them into the `LobbyScene` detail panel and result flow.

### Detail Panel Layout (bottom ~65% of viewport, ~832px)

```
DETAIL PANEL
Redline Routine         ← stage name, 36–40px, color-tinted glow
[Red] [Single-Target].. ← pill tags row
┌────────┐ ┌──────────┐
│ IRON   │ │ REDLINE  │  ← elite + boss cards, side by side
│ KICK   │ │ HEADLINER│     ~280×260px each
│ (vis)  │ │  (vis)   │
└────────┘ └──────────┘
Best: ★★☆  88 HP        ← session result (if exists)
     [ START ]           ← primary action button
```

### Result Modal Layout

```
┌──────────────────────────┐
│       VICTORY            │  32–36px, green-gold glow
│   Redline Routine        │  24px white
│      ★★★                │  40×40px stars
│   88 HP remaining        │  20px white
│                          │
│  [ RETRY ]  [ CLOSE ]    │  200×52px buttons
└──────────────────────────┘
```

Full modal specs: 520px wide, auto-height (~400px), centered on screen, semi-transparent black overlay `rgba(0,0,0,0.6)`, 200ms fade-in. Tapping outside does NOT close.

## In Scope — Part A: PillTag Component

Create `src/scenes/lobby/components/PillTag.ts` (or a shared components location).

Reusable pill/chip for displaying tags in lobby detail panel and wave preview (task 16).

**Specs:**
- Rounded rectangle, 20px corner radius
- Height: 28px, width: content-driven (12px horizontal padding, min 48px)
- Font: 14–16px, uppercase, medium weight
- Gap between tags in a row: 8px

**Color-tinted tags (`Red`, `Green`, `Blue`):**
- `Red`: bg `rgba(224,60,60,0.25)`, border `rgba(224,60,60,0.6)`, text `#FF6B6B`
- `Green`: bg `rgba(60,200,80,0.25)`, border `rgba(60,200,80,0.6)`, text `#6BFF8B`
- `Blue`: bg `rgba(60,100,220,0.25)`, border `rgba(60,100,220,0.6)`, text `#6B9BFF`

**Neutral tags (everything else):**
- bg `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.15)`, text `#C0C8D0`

The component should accept a tag string and return a `Phaser.GameObjects.Container` with graphics background and text.

## In Scope — Part B: SpecialEnemyCard Component

Create a reusable `SpecialEnemyCard` component with two size variants.

**Lobby variant** (~280×260px) — used in detail panel:
- Container: `#161A22` background, rounded corners 8px, thin border `#252D3A`
- Top ~200px: enemy visual area (placeholder for now — a colored shape representing the enemy). For this task, render a simple geometric shape + glow in the enemy's color.
- Bottom ~40px: enemy name, 20–22px, centered, white with subtle color glow
- Below name (optional, 18px): role label like `Elite Tank` or `Boss` in 14–16px muted text

**Wave preview variant** (~140×160px) — for task 16:
- Same structure scaled down
- Visual area ~110×110px, name 16px, role label 12px

The component accepts: `{ enemyId: string, variant: 'lobby' | 'wave-preview' }` and looks up the enemy definition to get `displayName`, `archetype`, `color`, `silhouetteMotif`.

## In Scope — Part C: Detail Panel

In `LobbyScene`, below the card area, render the detail panel that updates when `selectedStageId` changes.

**Content blocks (top to bottom, centered):**

1. **Stage name** (64–72px from panel top): 36–40px, title case, white with color-tinted glow (same logic as card name glow — dominant color at 40% opacity, 6px blur)

2. **Pill tags row** (16px below name): render `stageConfig.stageTags` as PillTag components, centered horizontally

3. **Elite & Boss cards** (24px below tags): two `SpecialEnemyCard` components (lobby variant), side by side, 16px gap. Left = elite (`stageConfig.eliteEnemyId`), right = boss (`stageConfig.bossEnemyId`). Look up enemy definitions to get names and archetypes.

4. **Session result** (16px below cards, only if stage completed): `Best: ★★☆  88 HP` in 20px. Stars in gold glow, HP in white.

5. **Start button** (24px below result or 32px below cards if no result): centered, 280×56px, label `START` in 24px bold uppercase white. Fill `#2A4060`, border `#4A80D0` (2px neon blue), 8px corner radius. Soft pulsing glow (12px blur, 30% opacity).

On Start button tap:
```ts
this.scene.start(SceneKeys.STAGE, { stageId: this.selectedStageId! });
```

No detail shown when no stage is selected (hide the panel or show placeholder text).

## In Scope — Part D: Result Modal

An overlay displayed on top of `LobbyScene` when `showResult: true` from scene data.

**Implementation as a Phaser Container:**

1. **Overlay**: full-viewport rectangle, `rgba(0,0,0,0.6)`, no interaction (doesn't close on tap outside, but task says it shouldn't close anyway — so the overlay is visual only).

2. **Modal container**: centered, 520px wide, auto-height. Background: `#161A22` (or similar dark), 8px rounded corners, thin border.

3. **Contents (centered, top to bottom):**
   - Victory/Defeat label: 32–36px uppercase. Victory → `#4AE04A` with glow. Defeat → `#E04A4A` with glow
   - Stage name: 24px white, 8px below label
   - Stars: 40×40px, gold glow, 12px gap between stars, 12px below name
   - Base HP: `88 HP remaining`, 20px white, 12px below stars
   - Buttons (side by side, 16px gap, 24px below HP):
     - `RETRY` (left): 200×52px, fill `#2A4060`, border `#4A80D0`
     - `CLOSE` (right): 200×52px, fill `#2A2A2A`, border `#404040`, muted white

4. **Buttons behavior:**
   - `RETRY`: `this.scene.start(SceneKeys.STAGE, { stageId: this.resultStageId })` — starts a fresh run
   - `CLOSE`: hide/destroy modal, set `showResultModal = false`, select the stage card

5. **Animation**: fade in over 200ms ease-out

## Out of Scope

- Wave preview pill tags (task 16 — reuses PillTag)
- Wave preview special enemy card (task 16 — reuses SpecialEnemyCard)
- Actual enemy visual rendering (silhouettes, glow animation — task 17)
- Card interaction (task 14)
- Background music or SFX

## Detailed Requirements

### PillTag API
```ts
function createPillTag(
  scene: Phaser.Scene,
  tag: string,
): Phaser.GameObjects.Container;
```

### SpecialEnemyCard API
```ts
function createSpecialEnemyCard(
  scene: Phaser.Scene,
  enemyId: string,
  variant: 'lobby' | 'wave-preview',
): Phaser.GameObjects.Container;
```

Enemy definition lookup: `getEnemyDefinitionById(enemyId)` (from `EnemyDefinitions` or `CombatContentConfig`).

### ResultModal API
```ts
function createResultModal(
  scene: Phaser.Scene,
  result: {
    stageId: string;
    stageName: string;
    stars: number;
    remainingBaseHp: number;
  },
  onRetry: () => void,
  onClose: () => void,
): Phaser.GameObjects.Container;
```

### LobbyScene State
```ts
interface LobbyState {
  selectedStageId: string | null;
  showResultModal: boolean;
  resultStageId: string | null;
  // UI refs
  detailPanelContainer: Phaser.GameObjects.Container | null;
  resultModalContainer: Phaser.GameObjects.Container | null;
}
```

### Detail Panel Update

When `selectedStageId` changes:
1. Destroy old detail panel contents
2. Get `StageConfig` from `StageRegistry`
3. Get `StageResult` from `SessionProgressStore`
4. Render stage name with glow
5. Render pill tags from `stageConfig.stageTags`
6. Render elite card from `stageConfig.eliteEnemyId`
7. Render boss card from `stageConfig.bossEnemyId`
8. Render session result (if completed)
9. Render Start button

### Result Modal Flow

In `create(data)`:
```ts
if (data?.showResult && data?.stageId) {
  const config = getStageConfig(data.stageId);
  const result = SessionProgressStore.getResult(data.stageId);
  
  // Set selectedStageId to the completed stage
  this.selectedStageId = data.stageId;
  this.showResultModal = true;
  
  // Refresh cards (to show updated stars)
  this.refreshCards();
  // Refresh detail panel (to show updated result)
  this.refreshDetailPanel();
  // Create result modal
  this.createResultModal(config, result);
}
```

## Acceptance Criteria

- [ ] Detail panel shows correct stage name with color-tinted glow for the selected stage
- [ ] Pill tags render with correct color-coded backgrounds for Red/Green/Blue, neutral for others
- [ ] Elite and boss special enemy cards show side by side with correct names and placeholder visuals
- [ ] Session result row shows stars and HP (only when stage was completed)
- [ ] Start button is interactive and launches `StageScene` with correct `stageId`
- [ ] Result modal shows after completing a stage:
  - [ ] VICTORY or DEFEAT label with correct color
  - [ ] Stage name
  - [ ] Correct number of filled stars
  - [ ] Base HP remaining
  - [ ] RETRY button starts a new run
  - [ ] CLOSE button dismisses modal and shows lobby
- [ ] Modal fades in with 200ms animation
- [ ] Detail panel updates when selecting different stage cards
- [ ] Tapping outside modal does NOT close it
- [ ] `npx tsc --noEmit` passes

## Technical Notes

- This task adds significant code to `LobbyScene`. Consider extracting reusable components (`PillTag`, `SpecialEnemyCard`, `ResultModal`) to separate files in `src/scenes/lobby/components/` or `src/ui/`.
- The `LobbyScene` class will grow to ~300–400 lines. Keep methods focused: `createCards()`, `createDetailPanel()`, `refreshDetailPanel()`, `createResultModal()`, `destroyResultModal()`.
- Special enemy visual rendering in the cards is a **placeholder** for now. Render a colored geometric shape (circle/hexagon based on archetype) with a glow pass. The full silhouette motifs come in task 17.
- The `SpecialEnemyCard` component will be reused in task 16 (wave preview). Make sure the `variant` parameter is respected.
- Star rendering in the detail panel and result modal uses the same logic as the cards from task 14. Extract a shared `renderStars()` helper if not already done.
- The Start button glow pulse can be a simple Phaser tween on the button's alpha or scale, looping yoyo.
- Ensure all interactive elements have `setInteractive()` and pointer cursor.

## Implementation Plan

### Part 1: Components
1. Create `src/ui/PillTag.ts` — standalone pill tag component
2. Create `src/ui/SpecialEnemyCard.ts` — special enemy card with two variants
3. Create `src/ui/ResultModal.ts` — result modal overlay

### Part 2: Detail Panel
4. In `LobbyScene`, add detail panel creation after cards
5. Wire `selectedStageId` changes to `refreshDetailPanel()`
6. Implement each section: name, tags, enemy cards, result, start button
7. Handle Start button → `scene.start(SceneKeys.STAGE, { stageId })`

### Part 3: Result Modal
8. Handle `data.showResult` in `LobbyScene.create()`
9. Read result from `SessionProgressStore`
10. Create modal using `ResultModal` component
11. Wire Retry → start stage, Close → dismiss modal
12. Test complete flow: lobby → play stage → result → retry/close

## Blocked By

- Blocked by 03-task-special-enemies (needs special enemy definitions with `displayName` for cards)
- Blocked by 14-task-lobby-cards (needs `LobbyScene` with `selectedStageId` state and card selection)

## Type

HITL

## Design Spec Reference

- [Detail Panel](../design-spec.md#detail-panel)
- [Result Modal](../design-spec.md#result-modal)
- [Pill Tag Component](../design-spec.md#pill-tag-component)
- [Special Enemy Card Component](../design-spec.md#special-enemy-card-component)
- [Stage Selection (Lobby)](../design-spec.md#stage-selection-lobby)
- [Stage Completion](../design-spec.md#stage-completion)
- [Visual Identity & Tone](../design-spec.md#visual-identity--tone)
- [Color Palette Reference](../design-spec.md#color-palette-reference)
