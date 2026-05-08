# First Three Stages — Design Spec

## Document Intent

This document is a self-contained implementation handoff for the **First Three Stages** feature. It captures every design decision, balance number, architectural contract, and UX flow needed to build the feature. An implementation agent should be able to work from this document without access to the prior discussion.

Terminology follows `CONTEXT.md` (English column) throughout.

## Executive Summary

Add three authored stages to the game, a lobby screen for stage selection, and a complete gameplay loop: **choose stage → play stage → win/lose → return to lobby**. Each stage has 10 authored waves with escalating difficulty, unique elite and boss encounters, and a distinct color identity. The feature also rebalances all 12 pawns, all enemy archetypes, and the in-stage economy.

The feature transforms the project from a tech demo with one flat test stage into a playable vertical slice where all core systems (build phase, combat, Chrono, slot modifiers, color matching) can be honestly tested.

## Problem Statement

Currently the game has a single test stage with flat enemy stats, a global wave config that is not stage-specific, no way to select or compare different scenarios, and no completed gameplay loop beyond a single run. Enemy archetypes all share identical stats, pawns are wildly unbalanced, and the economy was set to test-only values. The `VISION.md` document describes a stage loop and star rating that doesn't exist in code. We cannot evaluate whether the core gameplay is fun without authored, balanced content and a complete play cycle.

## Goals

- Three distinct stages, each with a clear color identity, pressure theme, and difficulty curve
- 10 authored waves per stage with explicit sub-wave structure (min 3, average 5)
- A lobby screen where the player can see stage info, select a stage, and start a run
- Stars rating (0–3) based on remaining base HP after stage completion
- Session-only progress (best stars per stage remembered within one browser session)
- A complete loop: lobby → stage → result → lobby
- Balanced pawns (12 total, 8 active in deck) with clear niche roles
- Balanced enemy archetypes (basic, fast, tank, swarm) with distinct stat profiles
- Rebalanced economy tuned to the new content
- Removal of ranged enemies from playable content (they need projectile VFX to read correctly — deferred)
- Update `VISION.md` and `CONTEXT.md` to reflect same-color weakness and new stage loop

## Non-Goals

- Persistent save/load across browser reloads
- Per-stage pawn deck restrictions or stage-specific shop rules
- New enemy archetypes beyond basic/fast/tank/swarm
- New pawn types, colors, or abilities
- Investment income system
- Separate tutorial or onboarding flow beyond authored stage design
- Ranged enemy projectile VFX
- Stage unlock/linear progression (all 3 available immediately)

## Feature Scope

### Included
- 3 stage config files with authored wave data
- 1 shared enemy definitions file (archetype templates + 6 special enemies)
- Lobby scene with stage cards, detail panel, result modal
- Session progress store (in-memory)
- Stage registry module
- Star calculation function with configurable thresholds
- Update to `StageRuntime` to accept stage-specific config
- Update to `StageFlowCoordinator` for stage-scoped wave resolution
- Update to combat launch payload for scaled enemy stats
- Update to `StageWavePreview` for pill tags + special enemy refs
- Full pawn rebalance (12 definitions)
- Economy rebalance
- Enemy archetype stat differentiation
- Wave HP scaling per stage
- Slot modifier pool restriction per stage
- Ranged enemy removal from config
- Updated `VISION.md` and `CONTEXT.md`
- Test updates/removal for changed contracts

### Excluded
- Boss-specific minigames or unique combat subsystems
- Elite as a new system archetype (elites are powered-up variants of existing archetypes)
- Multiple modifiers per slot (stacking)
- Full wave list spoiler in lobby
- Separate stage preview screen (lives in lobby detail panel)
- Stage-specific pawn deck rules
- New sprite assets for enemies (use silhouette motifs + glow within current shape renderer)
- Asset pipeline for elite/boss sprites

## Player Experience

### Stage Selection (Lobby)
1. Player enters `LobbyScene` from boot. They see 3 stage cards in a vertical column (top 35% of screen).
2. Each card shows: stage name, star rating (empty outlines if not attempted, 0–3 filled if completed), best remaining base HP (only if successfully completed at least once).
3. Tapping a stage card selects it (visual highlight), and the detail panel below updates.
4. The detail panel shows: stage name, pill tags (2–4), elite card (visual + name, left), boss card (visual + name, right), and a "Start" button.
5. Tapping "Start" begins the stage run.

### Stage Run
1. `StageScene` initializes with the selected stage config.
2. Slot modifiers are rolled from the stage-specific pool.
3. Player goes through build phases and combat phases exactly as before, but now:
   - Each wave preview shows up to 4 pill tags with color-coded backgrounds for `Red`/`Blue`/`Green`, neutral background for role tags.
   - Elite/boss waves additionally show the special enemy card (visual + name).
4. Enemies have different stats based on their archetype and the current wave's HP multiplier.
5. Wave composition follows the authored design with intentional off-color swings and sub-wave drama.

### Stage Completion
1. After the final wave or upon base destruction, `StageScene` calculates stars.
2. Result is written to `SessionProgressStore`.
3. `StageScene` starts `LobbyScene` with a `showResult: true` payload.
4. A result modal appears over the lobby: victory/defeat, stage name, stars earned, remaining base HP, "Retry" button, "Close" button.
5. "Retry" immediately starts a new run of the same stage (new shop, new slot modifiers, same authored waves).
6. "Close" dismisses the modal, leaving the player in the lobby with the stage still selected.

### Session Progress
- Best stars are remembered per stage within one browser session.
- If the player beats a stage at 2 stars, then beats it again at 3 stars, the card shows 3.
- If the player beats a stage at 2 stars with 88 HP, then beats it again at 2 stars with 61 HP, the card keeps 88 HP.
- Defeats (0 stars) never overwrite successful results.
- Reloading the page resets all progress to empty.

## UI / UX

### Visual Identity & Tone

All new lobby and result UI follows the existing game aesthetic:

- **Base palette**: dark background `#101418` (matches `GameConfig.BACKGROUND_COLOR`), neon accent colors derived from the three note colors (red, green, blue).
- **Glow/neon**: key interactive elements, special enemy visuals, and star indicators use a soft neon glow effect — not a hard outline, but a feathered outer glow of 4–8px radius at 60–80% opacity.
- **Typography**: geometric sans-serif, uppercase for labels and buttons, title case for stage names and enemy names. Font sizes scale relative to the 720×1280 viewport — nothing below 14px rendered.
- **Shapes**: rounded rectangles (6–8px corner radius) for cards, panels, modals, and tags. No sharp corners in UI.
- **Transitions**: 150–200ms ease-out fade/slide for modal appearance, card selection highlight, and panel content swap. No long animations — the lobby should feel snappy.

### Screen Layout: LobbyScene

```
┌──────────────────────────┐ 720px
│  STAGE SELECT  (header)  │  ~60px — thin top bar, muted text
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │ ★★★  Redline...   │  │  stage card 1
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ★☆☆  Blue Noise.. │  │  stage card 2
│  └────────────────────┘  │  ← 35% of viewport height
│  ┌────────────────────┐  │     (~448px)
│  │ ☆☆☆  Greenroom..  │  │  stage card 3
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│                          │
│  DETAIL PANEL            │
│                          │
│  Redline Routine         │  stage name
│  [Red] [Single-Target].. │  pill tags row
│                          │
│  ┌────────┐ ┌──────────┐│
│  │ IRON   │ │ REDLINE  ││  elite + boss cards
│  │ KICK   │ │ HEADLINER││  side by side
│  │ (vis)  │ │  (vis)   ││
│  └────────┘ └──────────┘│
│                          │
│  Best: ★★☆  88 HP      │  session result (if exists)
│                          │
│       [ START ]          │  primary action button
│                          │
└──────────────────────────┘ 1280px
```

### Stage Card Component

Each of the 3 cards is a horizontal rounded rectangle occupying the full width of the card area (minus 16px horizontal padding on each side, so ~688px wide). Card height: ~120px.

**Contents (left to right):**
1. **Star indicator** (left side, ~100px wide): 3 star icons in a horizontal row. Stars are 24×24px each with 6px gap.
   - **Never played**: all 3 stars shown as empty outlines (stroke only, no fill, ~30% opacity).
   - **Played, 0 stars (defeat)**: same — empty outlines, 30% opacity.
   - **1–3 stars earned**: filled stars glow in a warm gold/amber neon (`#FFD700` to `#FFA500` range), unfilled stars remain empty outlines.
2. **Stage name** (center, ~400px): title case, 28–32px font, white/light-gray text with subtle text-shadow glow (4px blur, 30% opacity in the stage's dominant color).
3. **Best HP** (right side, ~120px): shown ONLY if stage has been successfully completed at least once. Format: `88 HP` in 20–22px font, muted white. No label — the number itself is enough in context.

**Interaction states:**
- **Default (not selected, not hovered)**: card background `#1A1E24` (slightly lighter than page), thin border `#2A3040`, star outlines at 30% opacity.
- **Hovered** (desktop) / **Pressed** (mobile touch-down): card background brightens to `#1F2430`, border brightens to `#3A4050`, subtle scale-up of 2–3px (transform origin center). Transition: 120ms ease-out.
- **Selected** (active stage): card background `#1C2230`, border `#4A60A0` (muted neon blue-white accent, not the stage color — selection is a universal state, not color-themed), 2px border width instead of 1px. Star indicators remain same, stage name gets slightly brighter.

**Card ordering**: fixed order — Redline Routine, Blue Noise Rush, Greenroom Collapse. No drag-to-reorder. Cards are not scrollable (3 fit within 35% of 1280px = 448px, at ~120px each + gaps = ~400px, with ~48px to spare).

### Detail Panel

Occupies the lower ~65% of the viewport (~832px). Layout is a single vertical column with centered content, 32px horizontal padding.

**Content blocks (top to bottom):**

1. **Stage name** (64–72px from panel top): 36–40px font, title case, white with color-tinted glow (stage's dominant color, 40% opacity, 6px blur).

2. **Pill tags row** (~16px below name): horizontal row of 2–4 pill tags, centered. Gap between tags: 8px. See "Pill Tag Component" below for exact specs.

3. **Elite & Boss cards** (~24px below tags): two containers side by side, equal width, 16px gap between them. Each container is ~280px wide, ~260px tall.
   - Top 200px: enemy visual. The same shape-renderer output used in combat, but rendered at UI-friendly scale. For special enemies, the silhouette motif and glow are visible here. The render fills the container width with aspect-ratio preserved, vertically centered.
   - Bottom 40px: enemy name, 20–22px font, centered, white text with subtle color glow.
   - Below name (optional, 18px): one short role label like `Elite Tank` or `Boss` in 14–16px muted text. Not a pill tag — a thin descriptive line.
   - Container background: `#161A22`, rounded corners 8px, thin border `#252D3A`.

4. **Session result** (only if stage was completed, ~16px below cards): format `Best: ★★☆  88 HP` in 20px font. Stars use the same gold glow as card stars. HP is white. If never completed, this row is absent (zero height, no placeholder).

5. **Start button** (~24px below result row or ~32px below enemy cards if no result): centered, 280px wide, 56px tall. Label `START` in 24px bold uppercase, white text. Button fill: `#2A4060` with a 2px neon-blue border `#4A80D0`. Hover/press: fill brightens to `#3A5090`, border `#6AA0FF`. 8px corner radius. A soft glow (12px blur, 30% opacity, border color) pulses subtly on the button to draw attention.

### Result Modal

Displayed as an overlay on top of LobbyScene when returning from a completed stage. Background: semi-transparent black `rgba(0,0,0,0.6)` covering the full viewport. The modal itself is a centered rounded rectangle, 520px wide, auto-height (typically ~400px).

**Contents (top to bottom, centered):**
1. **Victor/Defeat label** (top of modal, 32px from top edge): 32–36px font, uppercase.
   - Victory: `VICTORY` in green-gold `#4AE04A` with glow.
   - Defeat: `DEFEAT` in red `#E04A4A` with glow.
2. **Stage name** (8px below): 24px, white.
3. **Stars** (12px below): large stars, 40×40px each, same gold glow logic as cards. 3 stars in a row, 12px gap.
4. **Base HP** (12px below): `88 HP remaining` in 20px white.
5. **Buttons** (24px below HP, side by side with 16px gap):
   - `RETRY` (left): 200px × 52px, fill `#2A4060`, border `#4A80D0` (same style as Start).
   - `CLOSE` (right): 200px × 52px, fill `#2A2A2A`, border `#404040`, muted white text.

**Modal appearance**: fades in over 200ms ease-out. Tapping outside the modal does NOT close it — only the Close button does. This prevents accidental dismissal on mobile.

### Pill Tag Component

A small rounded pill/chip used to display a single tag. Reusable across lobby detail panel, wave preview (build phase), and anywhere tags appear.

**Specs:**
- Shape: rounded rectangle, 20px corner radius (fully rounded ends at typical text width).
- Height: 28px. Width: content-driven, with 12px horizontal padding on each side. Min width: 48px.
- Font: 14–16px, uppercase, medium weight.
- Gap between tags in a row: 8px.

**Color-tinted tags (`Red`, `Green`, `Blue`):**
- `Red` tag: background `rgba(224, 60, 60, 0.25)`, border `rgba(224, 60, 60, 0.6)`, text `#FF6B6B`.
- `Green` tag: background `rgba(60, 200, 80, 0.25)`, border `rgba(60, 200, 80, 0.6)`, text `#6BFF8B`.
- `Blue` tag: background `rgba(60, 100, 220, 0.25)`, border `rgba(60, 100, 220, 0.6)`, text `#6B9BFF`.

**Neutral tags (all others):**
- Background: `rgba(255, 255, 255, 0.08)`, border `rgba(255, 255, 255, 0.15)`, text `#C0C8D0`.

**Tag row**: tags are displayed inline, centered within their container. If a row exceeds available width (unlikely with max 4 tags at ~80px each = 320px in a 688px panel), they may wrap to a second row with 8px vertical gap.

### Special Enemy Card Component

Used in lobby detail panel (elite/boss preview) and in build-phase wave preview for elite/boss waves. Smaller version than the detail panel's full card.

**Lobby variant** (described in Detail Panel section): ~280×260px container.

**Wave preview variant** (in build phase): more compact — ~140px wide, ~160px tall. Same structure: visual on top (~110px), name below (~30px, 16px font), role label below (~18px, 12px font). Fits alongside tags without dominating the preview area.

**Visual rendering**: the same enemy shape renderer output used in combat, but static (no rotation/movement animation) and at a scale that fits the container. The idle pulse animation (glow alpha oscillation ±15% over 1.5s) plays in both lobby and preview contexts — it reinforces that this is a living threat, not just a static icon.

### Wave Preview in Build Phase

The existing build-phase UI shows a "next wave" preview before the player commits to starting the wave. This preview is now restructured:

**Layout (horizontal strip near the wave-start area):**
1. **Wave label**: `WAVE 5/10` — 18px, muted white, left-aligned or centered depending on existing layout.
2. **Pill tags row**: up to 4 tags, same pill component as lobby.
3. **Special enemy card** (only if `waveKind` is `elite` or `boss`): compact variant (~140×160px), positioned below or to the right of the tags, with the enemy name below the visual.

**Reveal principle**: the wave preview does NOT reveal sub-wave structure. It shows only wave-level tags and the special enemy identity (if any). The internal sub-wave color/archetype swings are discovered during combat.

### Interaction & Responsiveness

- All interactive elements (cards, buttons) have a minimum touch target of 44×44px.
- The lobby has no scrollable areas — everything fits within 720×1280.
- On desktop (if run in a browser window), hover states apply as described. On mobile, touch-down provides the same visual feedback via `:active` equivalent (Phaser pointer events).
- No drag gestures in lobby.
- No haptic feedback requirements for this iteration.

## Art Direction

### Enemy Silhouette Motifs

Special enemies use the existing shape-based renderer (no new sprite assets). Each of the 6 special enemies gets a unique silhouette motif expressed through:

- **Core shape**: the base archetype shape (circle for basic, diamond for fast, hexagon for tank, triangle-cluster for swarm) scaled up ~30% for elite and ~60% for boss.
- **Ornamentation**: additional geometric elements layered around the core shape:
  - `Iron Kick` (elite tank): hexagon core + four outward-pointing chevrons (one per cardinal direction), evoking heavy armor.
  - `Static Choir` (elite swarm): triangle cluster core + orbiting smaller triangles (satellite motes), evoking a swarm anchor.
  - `Backstage Blur` (elite fast): diamond core + motion-line trails (2–3 thin streaks behind the shape), evoking speed.
  - `Redline Headliner` (boss): large hexagon core + concentric ring pulse + crown-like ornament (three small triangles on top).
  - `Blue Noise Monarch` (boss): large triangle-cluster core + expanding ring wave (concentric circles fading outward) + orbiting motes.
  - `Verdant Encore` (boss): large diamond core + interleaved geometric petals (6 overlapping ellipses radiating from center).

- **Glow**: all special enemies have an outline glow in their own color:
  - Elite: 6px blur, 70% opacity, color matches enemy color (red `#E03C3C`, blue `#3C64DC`, green `#3CC850`).
  - Boss: 10px blur, 85% opacity, same color logic. Boss glow is noticeably thicker and brighter.
  - The glow is rendered as a separate pass behind the enemy shape, not as a stroke on the shape itself.

- **Idle animation**: a subtle, synchronized pulse on both glow opacity (±15% over 1.5s, sine wave) and scale (±3% over 1.5s, sine wave, 0.25s phase offset). The animation is the same for elite and boss but reads as more imposing on the larger boss scale.

- **Scale in lobby vs combat**: 
  - Combat: elite at 1.3× normal enemy size, boss at 1.6×.
  - Lobby detail panel: size determined by fitting the visual into the ~200×200px render area within the 280×260 container.
  - Wave preview (build phase): fits into ~110×110px render area.

### Ordinary Enemy Visual Differentiation

Ordinary enemies (basic, fast, tank, swarm) use the existing visual system with these shape assignments:
- **Basic**: circle.
- **Fast**: diamond (rotated square).
- **Tank**: hexagon.
- **Swarm**: small triangle (pointing down).

Color fill matches enemy color, with a subtle gradient (darker at edges, brighter at center). No glow. Scale differences already convey archetype toughness (tank is larger, swarm is smaller), reinforcing the stat differences visually.

### Color Palette Reference

| Role | Red | Green | Blue |
|------|-----|-------|------|
| Enemy fill | `#E03C3C` | `#3CC850` | `#3C64DC` |
| Enemy glow (elite) | `#FF5555` | `#55E870` | `#5588FF` |
| Enemy glow (boss) | `#FF7070` | `#70FF90` | `#70A0FF` |
| Tag bg | `rgba(224,60,60,0.25)` | `rgba(60,200,80,0.25)` | `rgba(60,100,220,0.25)` |
| Tag border | `rgba(224,60,60,0.6)` | `rgba(60,200,80,0.6)` | `rgba(60,100,220,0.6)` |
| Tag text | `#FF6B6B` | `#6BFF8B` | `#6B9BFF` |

### Lobby Background

Beyond the functional `#101418` base:
- Optional: a very subtle animated geometric pattern in the background — thin lines or dots at 3–5% opacity, slowly drifting. Not required for first implementation but the design space should allow it.
- The header "STAGE SELECT" at the top is subtle: 14–16px, uppercase, `rgba(255,255,255,0.3)`, letter-spacing 3px.

## Core Mechanics

### Star Rating
- Calculated from remaining `base HP` as a fraction of `maxBaseHp` (default 100).
- Thresholds (configurable, default values):
  - `> 90%` → 3 stars
  - `50% – 90%` → 2 stars
  - `< 50%` (base alive) → 1 star
  - Base destroyed → 0 stars (defeat)
- Function signature: `calculateStageStars(remainingBaseHp: number, maxBaseHp: number): { stars: number }`

### Color System (Same-Color Weakness)
The game now uses **same-color weakness**: red beats red, green beats green, blue beats blue. This is already implemented in code (`WEAKNESS_ADVANTAGE` maps `red→red`, `green→green`, `blue→blue`). The `WEAKNESS_MULTIPLIER` is `1.5`. Stage design pushes the player toward the stage's dominant color because pawns of that color deal bonus damage.

### Stage Identity
Each stage has:
- A **dominant color** (approx. 70% of enemies by count across all waves)
- A **pressure theme** (single-target, crowd, or mixed)
- **Off-color waves** (3–4 waves per stage have a different dominant color to prevent monochrome builds and provoke Chrono use)
- **Slot modifier progression**: Stage 1 = 0 modifiers, Stage 2 = 1–2 (simple pool), Stage 3 = 3 (full pool)

### Wave HP Scaling
Each stage has its own 10-element array of HP multipliers. Multipliers are monotonically non-decreasing and apply to all enemies in the wave (including elites and bosses). Recovery waves feel easier through composition (fewer enemies, softer archetype mix) rather than HP rollback.

### Sub-Wave Drama
Every wave has at least 3 sub-waves (average 5). Sub-waves are authored to:
- Introduce the wave theme
- Include off-color or off-archetype swings (to provoke Chrono usage)
- Place elite/boss encounters as events within the wave (not just "more HP in the pile")
- Elite exits on sub-wave 2; boss exits on sub-wave 3

## Level Design — Authored Wave Content

This section specifies every sub-wave for all 30 waves. Each sub-wave lists exact enemy IDs and counts, plus timing. Enemy IDs follow the pattern `enemy-{color}-{archetype}` for ordinary enemies and `{special-name}` for elites/bosses.

**Timing conventions:**
- `startTimeMs`: sub-wave spawns begin this many milliseconds after the wave starts.
- `spawnIntervalMs`: delay between individual enemy spawns within the sub-wave.
- Sub-waves within a wave are sequential (sub-wave N+1 starts after sub-wave N finishes spawning or after its startTimeMs, whichever is later).
- Spawn order within a sub-wave: enemies of the same ID spawn as a contiguous block, ordered as listed.

**Density guidelines:**
- Normal waves: 4–8 enemies per sub-wave, intervals 700–1000ms → ~3–8s of spawning per sub-wave.
- Crowd/swarm waves: 6–12 enemies, intervals 500–800ms.
- Tank-heavy sub-waves: 2–4 enemies, intervals 900–1200ms (tanks are slow — they don't need rapid spawning).
- Elite waves: elite + modest escort.
- Boss waves: boss + significant escort, longer sub-wave chains.

---

### Stage 1 — Redline Routine (Red, Single-Target, Tanky)

Dominant color: red (~70% of enemies). Archetypes: basic, fast, tank. No swarm. Slot modifiers: always 0.

#### Wave 1 — `Red`, `Single-Target`, `Fast`
Soft onboarding. Red basic/fast with a brief green interruption to hint that off-colors exist.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 1-a | wave-1-redline-1 | `enemy-red-basic` ×3 | 0 | 900 |
| 1-b | wave-1-redline-2 | `enemy-green-fast` ×2 | 3500 | 800 |
| 1-c | wave-1-redline-3 | `enemy-red-fast` ×2 | 6000 | 1000 |

**Total**: 7 enemies, 3 sub-waves, ~8s spawn window.

#### Wave 2 — `Green`, `Single-Target`, `Tanky`
First off-color wave. Green dominant but introduces a red mini-tank to keep the single-target theme.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 2-a | wave-2-redline-1 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 0 | 900 |
| 2-b | wave-2-redline-2 | `enemy-red-basic` ×2 | 3000 | 1000 |
| 2-c | wave-2-redline-3 | `enemy-green-tank` ×1 | 5500 | 1200 |

**Total**: 6 enemies, 3 sub-waves. One tank as a first taste.

#### Wave 3 — `Red`, `Tanky`, `Single-Target`
First real tank check. Red-dominant, the player needs sustained damage.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 3-a | wave-3-redline-1 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 0 | 900 |
| 3-b | wave-3-redline-2 | `enemy-red-tank` ×1, `enemy-green-basic` ×1 | 3500 | 1000 |
| 3-c | wave-3-redline-3 | `enemy-red-fast` ×2 | 6500 | 800 |
| 3-d | wave-3-redline-4 | `enemy-red-tank` ×1 | 9000 | 1200 |

**Total**: 8 enemies, 4 sub-waves. Two tanks — the stage identity hardens.

#### Wave 4 — `Blue`, `Mixed`, `Fast`
Blue off-color. Faster tempo, mixed archetypes — preparation for the elite exam.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 4-a | wave-4-redline-1 | `enemy-blue-fast` ×3 | 0 | 700 |
| 4-b | wave-4-redline-2 | `enemy-blue-basic` ×2 | 3000 | 900 |
| 4-c | wave-4-redline-3 | `enemy-red-basic` ×1, `enemy-blue-tank` ×1 | 5500 | 1000 |
| 4-d | wave-4-redline-4 | `enemy-blue-fast` ×1, `enemy-red-fast` ×1 | 8500 | 800 |

**Total**: 9 enemies, 4 sub-waves. Blue tank as a color mismatch spike.

#### Wave 5 — `Red`, `Single-Target`, `Elite`
Elite exam. Iron Kick (red elite tank) exits on sub-wave 2 with a light escort.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 5-a | wave-5-redline-1 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 0 | 900 |
| 5-b | wave-5-redline-2 | **`iron-kick`** ×1, `enemy-red-basic` ×1 | 3500 | 1200 |
| 5-c | wave-5-redline-3 | `enemy-green-fast` ×2 | 7000 | 800 |
| 5-d | wave-5-redline-4 | `enemy-red-basic` ×2 | 9500 | 900 |

**Total**: 9 enemies, 4 sub-waves. Iron Kick is the centerpiece.

#### Wave 6 — `Green`, `Single-Target`, `Fast`
Recovery wave. Lighter than wave 5 by composition (fewer tanks, less total HP), but not free. Green to push a different color.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 6-a | wave-6-redline-1 | `enemy-green-fast` ×2, `enemy-green-basic` ×1 | 0 | 800 |
| 6-b | wave-6-redline-2 | `enemy-red-basic` ×2 | 3000 | 1000 |
| 6-c | wave-6-redline-3 | `enemy-green-fast` ×2 | 5500 | 800 |

**Total**: 7 enemies, 3 sub-waves. Softer than wave 5 — payoff for a strong build.

#### Wave 7 — `Red`, `Tanky`, `Single-Target`
Heavy tank check. Off-color green sub-wave insertion to provoke Chrono.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 7-a | wave-7-redline-1 | `enemy-red-basic` ×2 | 0 | 1000 |
| 7-b | wave-7-redline-2 | `enemy-green-tank` ×1, `enemy-green-fast` ×1 | 2500 | 1100 |
| 7-c | wave-7-redline-3 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 5500 | 1000 |
| 7-d | wave-7-redline-4 | `enemy-red-fast` ×2 | 9000 | 800 |
| 7-e | wave-7-redline-5 | `enemy-red-tank` ×1 | 11500 | 1200 |

**Total**: 9 enemies, 5 sub-waves. Green tank at sub-wave 2 is the Chrono bait.

#### Wave 8 — `Blue`, `Mixed`, `Fast`
Anti-autopilot wave. Blue dominant, but the composition keeps shifting so no single segment solves it.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 8-a | wave-8-redline-1 | `enemy-blue-fast` ×2, `enemy-blue-basic` ×1 | 0 | 700 |
| 8-b | wave-8-redline-2 | `enemy-red-tank` ×1 | 3000 | 1200 |
| 8-c | wave-8-redline-3 | `enemy-blue-basic` ×2, `enemy-blue-fast` ×1 | 5000 | 800 |
| 8-d | wave-8-redline-4 | `enemy-green-fast` ×2 | 8000 | 700 |
| 8-e | wave-8-redline-5 | `enemy-blue-tank` ×1, `enemy-red-fast` ×1 | 10500 | 1000 |

**Total**: 11 enemies, 5 sub-waves. Red tank + blue tank in different sub-waves force re-evaluation.

#### Wave 9 — `Red`, `Tanky`, `Single-Target`
Pre-boss spike. Heaviest non-boss wave. Central tank appears early, off-color green distraction mid-wave.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 9-a | wave-9-redline-1 | `enemy-red-basic` ×2 | 0 | 900 |
| 9-b | wave-9-redline-2 | `enemy-red-tank` ×1, `enemy-red-fast` ×1 | 2500 | 1100 |
| 9-c | wave-9-redline-3 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 5500 | 800 |
| 9-d | wave-9-redline-4 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 9000 | 1000 |
| 9-e | wave-9-redline-5 | `enemy-red-fast` ×2 | 12500 | 800 |

**Total**: 11 enemies, 5 sub-waves. Two tanks, green swing at sub-wave 3.

#### Wave 10 — `Red`, `Boss`, `Single-Target`
Climax. Redline Headliner exits on sub-wave 3. Sub-waves 1–2 build tension, sub-wave 3 introduces the boss, sub-waves 4–5 deliver the escort and off-color pressure.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 10-a | wave-10-redline-1 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 0 | 900 |
| 10-b | wave-10-redline-2 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 3000 | 1000 |
| 10-c | wave-10-redline-3 | **`redline-headliner`** ×1 | 6000 | 1500 |
| 10-d | wave-10-redline-4 | `enemy-red-fast` ×2, `enemy-green-basic` ×1 | 9000 | 800 |
| 10-e | wave-10-redline-5 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 12000 | 1000 |

**Total**: 10 enemies + boss, 5 sub-waves. Boss exits alone at sub-wave 3, escort follows.

---

### Stage 2 — Blue Noise Rush (Blue, Crowd, Swarm)

Dominant color: blue (~70% of enemies). Archetypes: basic, fast, swarm. No tank. Slot modifiers: 1–2, simple pool.

#### Wave 1 — `Blue`, `Crowd`, `Swarm`
Instantly sells the stage theme. Blue swarm with high density. Red interruption to hint at off-color dynamics.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 1-a | wave-1-bluerush-1 | `enemy-blue-swarm` ×4 | 0 | 600 |
| 1-b | wave-1-bluerush-2 | `enemy-red-swarm` ×3 | 3500 | 600 |
| 1-c | wave-1-bluerush-3 | `enemy-blue-swarm` ×3, `enemy-blue-fast` ×1 | 6500 | 600 |

**Total**: 11 enemies, 3 sub-waves. High count, low individual HP — immediate crowd signal.

#### Wave 2 — `Red`, `Crowd`, `Fast`
Red off-color. Fast archetype emphasizes tempo alongside crowd density.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 2-a | wave-2-bluerush-1 | `enemy-red-swarm` ×3, `enemy-red-fast` ×1 | 0 | 600 |
| 2-b | wave-2-bluerush-2 | `enemy-blue-swarm` ×2 | 3500 | 700 |
| 2-c | wave-2-bluerush-3 | `enemy-red-fast` ×2, `enemy-red-swarm` ×2 | 6000 | 700 |

**Total**: 10 enemies, 3 sub-waves.

#### Wave 3 — `Blue`, `Crowd`, `Swarm`
First serious AOE check. Dense, low pauses between sub-waves — tests whether the build can clear fast enough.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 3-a | wave-3-bluerush-1 | `enemy-blue-swarm` ×4 | 0 | 550 |
| 3-b | wave-3-bluerush-2 | `enemy-blue-swarm` ×3, `enemy-blue-basic` ×1 | 3000 | 600 |
| 3-c | wave-3-bluerush-3 | `enemy-blue-fast` ×2, `enemy-blue-swarm` ×2 | 6000 | 650 |
| 3-d | wave-3-bluerush-4 | `enemy-green-swarm` ×3 | 9000 | 600 |

**Total**: 15 enemies, 4 sub-waves. Green swarm at the end — off-color crowd surprise.

#### Wave 4 — `Green`, `Crowd`, `Mixed`
Green off-color. Mixed toughness: some basic enemies with medium HP among the swarm, so pure AOE isn't a free pass.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 4-a | wave-4-bluerush-1 | `enemy-green-swarm` ×3 | 0 | 600 |
| 4-b | wave-4-bluerush-2 | `enemy-green-basic` ×2, `enemy-green-swarm` ×2 | 3000 | 700 |
| 4-c | wave-4-bluerush-3 | `enemy-blue-swarm` ×2, `enemy-green-fast` ×2 | 6000 | 700 |
| 4-d | wave-4-bluerush-4 | `enemy-green-basic` ×2, `enemy-green-swarm` ×2 | 9500 | 700 |

**Total**: 15 enemies, 4 sub-waves. Basic enemies have 100 HP vs swarm's 40 — the mix matters.

#### Wave 5 — `Blue`, `Elite`, `Crowd`
Elite exam. Static Choir (blue elite swarm leader) exits on sub-wave 2 with swarm escort.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 5-a | wave-5-bluerush-1 | `enemy-blue-swarm` ×4, `enemy-blue-fast` ×1 | 0 | 600 |
| 5-b | wave-5-bluerush-2 | **`static-choir`** ×1, `enemy-blue-swarm` ×3 | 3500 | 700 |
| 5-c | wave-5-bluerush-3 | `enemy-red-swarm` ×3 | 7500 | 600 |
| 5-d | wave-5-bluerush-4 | `enemy-blue-swarm` ×3, `enemy-blue-basic` ×1 | 10500 | 600 |

**Total**: 16 enemies, 4 sub-waves. Static Choir anchors the wave; swarm never stops.

#### Wave 6 — `Red`, `Crowd`, `Swarm`
Recovery wave. Softer than wave 5 — fewer total enemies, simpler composition. Red theme gives the player's blue build an easy color win.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 6-a | wave-6-bluerush-1 | `enemy-red-swarm` ×3 | 0 | 650 |
| 6-b | wave-6-bluerush-2 | `enemy-blue-swarm` ×2 | 3000 | 700 |
| 6-c | wave-6-bluerush-3 | `enemy-red-swarm` ×3, `enemy-red-fast` ×1 | 5500 | 650 |

**Total**: 9 enemies, 3 sub-waves. Payoff wave — if the build is strong, this melts.

#### Wave 7 — `Blue`, `Crowd`, `Fast`
Tempo check. Fast-heavy crowd — the build needs both speed (to catch fast enemies) and throughput (to clear the swarm).

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 7-a | wave-7-bluerush-1 | `enemy-blue-fast` ×3 | 0 | 600 |
| 7-b | wave-7-bluerush-2 | `enemy-blue-swarm` ×4 | 3000 | 550 |
| 7-c | wave-7-bluerush-3 | `enemy-red-fast` ×2, `enemy-red-swarm` ×2 | 6500 | 650 |
| 7-d | wave-7-bluerush-4 | `enemy-blue-fast` ×2, `enemy-blue-swarm` ×2 | 9500 | 600 |

**Total**: 15 enemies, 4 sub-waves. Red fast at sub-wave 3 as a Chrono trigger.

#### Wave 8 — `Green`, `Crowd`, `Mixed`
Anti-autopilot. Green dominant with medium-HP basic enemies among the swarm. Tests whether the build crumbles when enemies don't all die to splash.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 8-a | wave-8-bluerush-1 | `enemy-green-swarm` ×3 | 0 | 600 |
| 8-b | wave-8-bluerush-2 | `enemy-green-basic` ×2, `enemy-green-swarm` ×2 | 3000 | 700 |
| 8-c | wave-8-bluerush-3 | `enemy-blue-swarm` ×3 | 6500 | 600 |
| 8-d | wave-8-bluerush-4 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 9500 | 800 |
| 8-e | wave-8-bluerush-5 | `enemy-green-swarm` ×2, `enemy-green-basic` ×1 | 12500 | 700 |

**Total**: 16 enemies, 5 sub-waves. 5 basic enemies across the wave — the build can't just splash.

#### Wave 9 — `Blue`, `Swarm`, `Crowd`
Pre-boss flood spike. Highest enemy count of any non-boss wave. Pure pressure through numbers.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 9-a | wave-9-bluerush-1 | `enemy-blue-swarm` ×5 | 0 | 500 |
| 9-b | wave-9-bluerush-2 | `enemy-blue-fast` ×2, `enemy-blue-swarm` ×3 | 3500 | 550 |
| 9-c | wave-9-bluerush-3 | `enemy-red-swarm` ×4 | 7500 | 500 |
| 9-d | wave-9-bluerush-4 | `enemy-blue-basic` ×1, `enemy-blue-swarm` ×4 | 10500 | 550 |
| 9-e | wave-9-bluerush-5 | `enemy-blue-swarm` ×4 | 14000 | 500 |

**Total**: 23 enemies, 5 sub-waves. The swarm stops for nothing.

#### Wave 10 — `Blue`, `Boss`, `Crowd`
Climax. Blue Noise Monarch exits on sub-wave 3. Heavy swarm escort before and after the boss.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 10-a | wave-10-bluerush-1 | `enemy-blue-swarm` ×4, `enemy-blue-fast` ×1 | 0 | 550 |
| 10-b | wave-10-bluerush-2 | `enemy-blue-basic` ×2, `enemy-blue-swarm` ×3 | 3500 | 600 |
| 10-c | wave-10-bluerush-3 | **`blue-noise-monarch`** ×1 | 7000 | 1500 |
| 10-d | wave-10-bluerush-4 | `enemy-blue-swarm` ×4, `enemy-green-swarm` ×2 | 10000 | 550 |
| 10-e | wave-10-bluerush-5 | `enemy-blue-fast` ×2, `enemy-blue-basic` ×1 | 13500 | 700 |

**Total**: 19 enemies + boss, 5 sub-waves. The boss doesn't end the wave — the escort keeps coming.

---

### Stage 3 — Greenroom Collapse (Green, Mixed, Fast)

Dominant color: green (~70% of enemies). Archetypes: basic, fast, tank, swarm (all four). Slot modifiers: 3, full pool.

#### Wave 1 — `Green`, `Mixed`, `Fast`
Instantly shows the mixed identity. Green core, but red tank accent and green fast finish refuse to be one-dimensional.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 1-a | wave-1-greenroom-1 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 0 | 900 |
| 1-b | wave-1-greenroom-2 | `enemy-red-tank` ×1 | 3000 | 1200 |
| 1-c | wave-1-greenroom-3 | `enemy-green-fast` ×3 | 5500 | 800 |

**Total**: 7 enemies, 3 sub-waves. Tank at sub-wave 2 says "this stage has everything."

#### Wave 2 — `Red`, `Single-Target`, `Tanky`
Red off-color. Single-target lean — tank pressure prepares for later mixed waves.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 2-a | wave-2-greenroom-1 | `enemy-red-basic` ×2 | 0 | 1000 |
| 2-b | wave-2-greenroom-2 | `enemy-red-tank` ×1, `enemy-red-fast` ×1 | 3000 | 1100 |
| 2-c | wave-2-greenroom-3 | `enemy-green-basic` ×2 | 6500 | 900 |
| 2-d | wave-2-greenroom-4 | `enemy-red-fast` ×2 | 9500 | 800 |

**Total**: 8 enemies, 4 sub-waves.

#### Wave 3 — `Blue`, `Crowd`, `Swarm`
Blue off-color crowd relief. Lighter composition — a payoff wave for a build that earned momentum. But blue = the player's green build has no color advantage here.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 3-a | wave-3-greenroom-1 | `enemy-blue-swarm` ×3 | 0 | 650 |
| 3-b | wave-3-greenroom-2 | `enemy-blue-fast` ×2 | 3000 | 800 |
| 3-c | wave-3-greenroom-3 | `enemy-blue-swarm` ×3, `enemy-green-basic` ×1 | 5500 | 650 |

**Total**: 9 enemies, 3 sub-waves. Lighter than what follows — enjoy it.

#### Wave 4 — `Green`, `Mixed`, `Fast`
Rising mixed pressure. Green cores with fast tempo and a tank anchor.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 4-a | wave-4-greenroom-1 | `enemy-green-fast` ×2, `enemy-green-basic` ×1 | 0 | 800 |
| 4-b | wave-4-greenroom-2 | `enemy-green-tank` ×1 | 3000 | 1200 |
| 4-c | wave-4-greenroom-3 | `enemy-green-basic` ×2, `enemy-green-swarm` ×2 | 5500 | 700 |
| 4-d | wave-4-greenroom-4 | `enemy-red-fast` ×2, `enemy-green-fast` ×1 | 9000 | 750 |

**Total**: 11 enemies, 4 sub-waves. First appearance of swarm in this stage.

#### Wave 5 — `Green`, `Elite`, `Mixed`
Elite exam. Backstage Blur (green elite fast bruiser) exits on sub-wave 2 with mixed escort.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 5-a | wave-5-greenroom-1 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 0 | 900 |
| 5-b | wave-5-greenroom-2 | **`backstage-blur`** ×1, `enemy-green-fast` ×2 | 3500 | 1000 |
| 5-c | wave-5-greenroom-3 | `enemy-blue-swarm` ×3, `enemy-green-basic` ×1 | 7500 | 650 |
| 5-d | wave-5-greenroom-4 | `enemy-green-tank` ×1 | 11000 | 1200 |

**Total**: 11 enemies, 4 sub-waves. Tank after the elite — the wave keeps testing.

#### Wave 6 — `Red`, `Mixed`, `Crowd`
Recovery-relative wave. Red-dominant, softer than wave 5 but refuses to be trivial.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 6-a | wave-6-greenroom-1 | `enemy-red-swarm` ×3 | 0 | 650 |
| 6-b | wave-6-greenroom-2 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 3000 | 900 |
| 6-c | wave-6-greenroom-3 | `enemy-green-basic` ×2 | 6000 | 1000 |

**Total**: 8 enemies, 3 sub-waves. The lightest wave after wave 3.

#### Wave 7 — `Green`, `Single-Target`, `Fast`
Late single-target exam. Speed swings with a tank anchor — the build must handle both priority and tempo.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 7-a | wave-7-greenroom-1 | `enemy-green-fast` ×3 | 0 | 700 |
| 7-b | wave-7-greenroom-2 | `enemy-green-tank` ×1 | 3000 | 1200 |
| 7-c | wave-7-greenroom-3 | `enemy-red-fast` ×2, `enemy-green-basic` ×1 | 5500 | 750 |
| 7-d | wave-7-greenroom-4 | `enemy-green-basic` ×2 | 9000 | 900 |
| 7-e | wave-7-greenroom-5 | `enemy-green-tank` ×1, `enemy-green-fast` ×1 | 11500 | 1000 |

**Total**: 11 enemies, 5 sub-waves. Two tanks, red speed swing at sub-wave 3.

#### Wave 8 — `Blue`, `Crowd`, `Mixed`
Late crowd wave with anchor targets. Blue dominant — the player can't coast on green color advantage.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 8-a | wave-8-greenroom-1 | `enemy-blue-swarm` ×4 | 0 | 550 |
| 8-b | wave-8-greenroom-2 | `enemy-blue-basic` ×2 | 3000 | 800 |
| 8-c | wave-8-greenroom-3 | `enemy-blue-swarm` ×3, `enemy-blue-fast` ×1 | 5500 | 600 |
| 8-d | wave-8-greenroom-4 | `enemy-green-basic` ×2, `enemy-blue-basic` ×1 | 9000 | 800 |
| 8-e | wave-8-greenroom-5 | `enemy-blue-swarm` ×3 | 12000 | 550 |

**Total**: 16 enemies, 5 sub-waves. Basic enemies anchor the crowd — must be focused down.

#### Wave 9 — `Green`, `Mixed`, `Tanky`
Pre-boss composite spike. The wave demands everything: single-target, crowd clear, color flexibility.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 9-a | wave-9-greenroom-1 | `enemy-green-basic` ×2, `enemy-green-swarm` ×2 | 0 | 700 |
| 9-b | wave-9-greenroom-2 | `enemy-green-tank` ×1 | 3000 | 1200 |
| 9-c | wave-9-greenroom-3 | `enemy-red-swarm` ×3, `enemy-red-basic` ×1 | 5500 | 650 |
| 9-d | wave-9-greenroom-4 | `enemy-green-tank` ×1, `enemy-green-fast` ×2 | 9000 | 900 |
| 9-e | wave-9-greenroom-5 | `enemy-blue-fast` ×2, `enemy-green-basic` ×1 | 12500 | 750 |

**Total**: 15 enemies, 5 sub-waves. Two tanks + crowd + off-color swings = universal exam.

#### Wave 10 — `Green`, `Boss`, `Mixed`
Climax. Verdant Encore (green boss) exits on sub-wave 3. The escort demands both single-target (to kill the boss) and crowd (to not leak to the swarm). Off-color support sub-waves keep the build honest.

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 10-a | wave-10-greenroom-1 | `enemy-green-basic` ×2, `enemy-green-swarm` ×2 | 0 | 700 |
| 10-b | wave-10-greenroom-2 | `enemy-green-tank` ×1, `enemy-green-fast` ×1 | 3500 | 1000 |
| 10-c | wave-10-greenroom-3 | **`verdant-encore`** ×1 | 6500 | 1500 |
| 10-d | wave-10-greenroom-4 | `enemy-red-swarm` ×3, `enemy-red-tank` ×1 | 9500 | 650 |
| 10-e | wave-10-greenroom-5 | `enemy-blue-fast` ×2, `enemy-green-swarm` ×2 | 13000 | 700 |
| 10-f | wave-10-greenroom-6 | `enemy-green-tank` ×1, `enemy-green-basic` ×1 | 16000 | 1000 |

**Total**: 16 enemies + boss, 6 sub-waves. The longest wave in the game. Off-color tanks in sub-waves 4 and 5 refuse to let the build relax after the boss appears.

---

### Summary: Enemy Count by Stage

| Stage | Total enemies | Elite wave | Boss wave | Avg per wave |
|-------|--------------|------------|-----------|--------------|
| Redline Routine | ~91 | 9 (w5) | 11 (w10) | 9.1 |
| Blue Noise Rush | ~150 | 16 (w5) | 20 (w10) | 15.0 |
| Greenroom Collapse | ~123 | 11 (w5) | 17 (w10) | 12.3 |

### Summary: Sub-Wave Count by Stage

| Stage | W1 | W2 | W3 | W4 | W5 | W6 | W7 | W8 | W9 | W10 | Total |
|-------|----|----|----|----|----|----|----|----|----|-----|-------|
| Redline Routine | 3 | 3 | 4 | 4 | 4 | 3 | 5 | 5 | 5 | 5 | 41 |
| Blue Noise Rush | 3 | 3 | 4 | 4 | 4 | 3 | 4 | 5 | 5 | 5 | 40 |
| Greenroom Collapse | 3 | 4 | 3 | 4 | 4 | 3 | 5 | 5 | 5 | 6 | 42 |

## Gameplay Flow

### Main Loop
```
BootScene → LobbyScene
               ├── tap stage card → detail panel updates
               ├── tap Start → StageScene(stageId)
               │                  ├── build → combat → build → ... 
               │                  ├── stage_complete → calculate stars
               │                  └── stage_failed → calculate stars
               └── StageScene returns → LobbyScene(showResult=true)
                                          └── result modal (Retry | Close)
```

### Session Progress Flow
```
SessionProgressStore (in-memory, created at app boot)
  ├── getResult(stageId) → { stars, bestRemainingBaseHp } | null
  ├── setResult(stageId, result) → writes only if new result beats old
  └── getLastSelectedStageId() / setLastSelectedStageId()
```

### Result Comparison Logic
```
isBetter(new, old):
  if old is null → true
  if new.stars > old.stars → true
  if new.stars === old.stars AND new.bestRemainingBaseHp > old.bestRemainingBaseHp → true
  else → false
```

## Stage Details

### Stage 1 — Redline Routine
- **Tags**: `Red`, `Single-Target`, `Tanky`
- **Dominant color**: Red (6–7 waves out of 10)
- **Archetypes available**: basic, fast, tank
- **Slot modifiers**: 0 (always)
- **HP multipliers**: `[1.0, 1.1, 1.3, 1.5, 1.75, 2.05, 2.4, 2.8, 3.2, 3.7]`
- **Elite (wave 5)**: `Iron Kick` (red elite tank)
- **Boss (wave 10)**: `Redline Headliner` (red boss, sustained single-target climax)
- **Theme**: Teaches basic build rhythm, color matchup, and reading basic/fast/tank pressure. Finishes with a single-target exam.

**Wave plan**:
| Wave | Tags | Notes |
|------|------|-------|
| 1 | `Red`, `Single-Target`, `Fast` | Soft entry, red basic/fast |
| 2 | `Green`, `Single-Target`, `Tanky` | First off-color, green mini-tank |
| 3 | `Red`, `Tanky`, `Single-Target` | First real tank check |
| 4 | `Blue`, `Mixed`, `Fast` | Blue off-color, mixed pressure |
| 5 | `Red`, `Single-Target`, `Elite` | Iron Kick on sub-wave 2 |
| 6 | `Green`, `Single-Target`, `Fast` | Recovery, green payoff |
| 7 | `Red`, `Tanky`, `Single-Target` | Heavy tank check |
| 8 | `Blue`, `Mixed`, `Fast` | Anti-autopilot, blue fast |
| 9 | `Red`, `Tanky`, `Single-Target` | Pre-boss spike |
| 10 | `Red`, `Boss`, `Single-Target` | Redline Headliner on sub-wave 3 |

### Stage 2 — Blue Noise Rush
- **Tags**: `Blue`, `Crowd`, `Swarm`
- **Dominant color**: Blue (6–7 waves out of 10)
- **Archetypes available**: basic, fast, swarm (no tank)
- **Slot modifiers**: 1–2, simple pool only
- **HP multipliers**: `[1.0, 1.15, 1.35, 1.6, 1.9, 2.2, 2.55, 3.0, 3.45, 4.0]`
- **Elite (wave 5)**: `Static Choir` (blue elite swarm leader)
- **Boss (wave 10)**: `Blue Noise Monarch` (blue boss, crowd-control climax)
- **Theme**: Crowd clearing and throughput. Swarm enemies introduced. Tests whether the build can handle screen density without leaking.

**Wave plan**:
| Wave | Tags | Notes |
|------|------|-------|
| 1 | `Blue`, `Crowd`, `Swarm` | Instantly sells stage theme |
| 2 | `Red`, `Crowd`, `Fast` | Red off-color, tempo check |
| 3 | `Blue`, `Crowd`, `Swarm` | First serious AOE check |
| 4 | `Green`, `Crowd`, `Mixed` | Green off-color, mixed toughness |
| 5 | `Blue`, `Elite`, `Crowd` | Static Choir on sub-wave 2 |
| 6 | `Red`, `Crowd`, `Swarm` | Recovery, red crowd payoff |
| 7 | `Blue`, `Crowd`, `Fast` | Speed-heavy crowd |
| 8 | `Green`, `Crowd`, `Mixed` | Anti-autopilot, green mixed |
| 9 | `Blue`, `Swarm`, `Crowd` | Pre-boss flood spike |
| 10 | `Blue`, `Boss`, `Crowd` | Blue Noise Monarch on sub-wave 3 |

### Stage 3 — Greenroom Collapse
- **Tags**: `Green`, `Mixed`, `Fast`
- **Dominant color**: Green (6–7 waves out of 10)
- **Archetypes available**: basic, fast, tank, swarm (all)
- **Slot modifiers**: 3, full pool
- **HP multipliers**: `[1.0, 1.2, 1.4, 1.7, 2.0, 2.35, 2.75, 3.2, 3.6, 4.1]`
- **Elite (wave 5)**: `Backstage Blur` (green elite fast bruiser)
- **Boss (wave 10)**: `Verdant Encore` (green boss, mixed-pressure climax)
- **Theme**: Alternates between single-target and crowd pressure. Demands an adaptable build that can handle both types. Full system stress test.

**Wave plan**:
| Wave | Tags | Notes |
|------|------|-------|
| 1 | `Green`, `Mixed`, `Fast` | Instantly shows mixed role |
| 2 | `Red`, `Single-Target`, `Tanky` | Red off-color, priority target |
| 3 | `Blue`, `Crowd`, `Swarm` | Blue off-color crowd relief |
| 4 | `Green`, `Mixed`, `Fast` | Rising mixed pressure |
| 5 | `Green`, `Elite`, `Mixed` | Backstage Blur on sub-wave 2 |
| 6 | `Red`, `Mixed`, `Crowd` | Recovery-relative |
| 7 | `Green`, `Single-Target`, `Fast` | Late single-target exam |
| 8 | `Blue`, `Crowd`, `Mixed` | Late crowd + anchor |
| 9 | `Green`, `Mixed`, `Tanky` | Pre-boss composite spike |
| 10 | `Green`, `Boss`, `Mixed` | Verdant Encore on sub-wave 3 |

## Pill Tag Dictionary

Limited vocabulary used for both stage-level and wave-level tags:

| Tag | Meaning |
|-----|---------|
| `Red` | Red-dominant wave (tinted background) |
| `Green` | Green-dominant wave (tinted background) |
| `Blue` | Blue-dominant wave (tinted background) |
| `Single-Target` | Focus on priority/individual targets |
| `Crowd` | Mass clearing, throughput check |
| `Mixed` | Mix of single-target and crowd |
| `Fast` | Fast-moving enemies, tempo pressure |
| `Tanky` | High-HP enemies, sustained damage check |
| `Swarm` | Low-HP high-count enemies |
| `Elite` | Contains an elite enemy |
| `Boss` | Contains a boss enemy |

**Tag rules**:
- Max 4 tags per wave
- Display order: color → pressure type → role → special status
- Color tags get tinted backgrounds matching their color
- Non-color tags have neutral styling
- Same component used for both stage-level and wave-level display (no visual hierarchy difference)

## Enemy Design

### Archetype Stat Templates (relative to basic)

| Archetype | HP | Speed | Attack Damage | Attack Cooldown |
|-----------|-----|-------|---------------|-----------------|
| basic | 1.0x (100) | 1.0x (40 px/s) | 2 | 1500 ms |
| fast | 0.65x (65) | 1.55x (62 px/s) | 2 | 1100 ms |
| tank | 2.6x (260) | 0.7x (28 px/s) | 4 | 2200 ms |
| swarm | 0.4x (40) | 1.25x (50 px/s) | 1 | 1800 ms |

All share `attackRangePx: 370`. Archetype templates are applied per-enemy in `EnemyDefinitions.ts`. Each ordinary enemy is `{ archetype, color }` → template stats.

Base HP of `basic` = 100 is calibrated so that `Ruby Needle` (50 damage, tier 1) kills a basic enemy in exactly 2 activations.

### Special Enemies (6 total — 3 elite, 3 boss)

Special enemies are authored as separate `EnemyDefinition` entries with their own explicit stats (not derived from templates). However, their stats should be mentally designed as multipliers over their parent archetype:

- Elite HP: ~2.5–3.5× parent archetype
- Elite damage: 5
- Boss HP: significantly above elite (~5–6× parent archetype)
- Boss damage: 8

| ID | Name | Color | Role | Stage |
|----|------|-------|------|-------|
| `iron-kick` | Iron Kick | red | elite tank | Stage 1 |
| `static-choir` | Static Choir | blue | elite swarm leader | Stage 2 |
| `backstage-blur` | Backstage Blur | green | elite fast bruiser | Stage 3 |
| `redline-headliner` | Redline Headliner | red | boss | Stage 1 |
| `blue-noise-monarch` | Blue Noise Monarch | blue | boss | Stage 2 |
| `verdant-encore` | Verdant Encore | green | boss | Stage 3 |

**Visual differentiation**: Each special enemy gets a unique silhouette motif and an outline glow in the enemy's own color. A restrained idle animation (pulse glow, micro-bob) applies to make them readable as "the main threat."

**Ranged enemies removed** from active content entirely. Existing `enemy-*-ranged` definitions are deleted from `CombatContentConfig`.

## Pawn Balance

All 12 pawns rebalanced around `Ruby Needle = 50` damage as baseline (tier 1). Effective range: 0.5–2.0× baseline depending on niche and conditions. Finishers assume ~1.5× consumed notes multiplier at design time.

Tier multipliers: `[1, 2.5, 6]` (was `[1, 3, 8]`).

### Active Deck (8 pawns)

| ID | Type | Color | Damage (t1) | ×BL | Role |
|----|------|-------|-------------|-----|------|
| `ruby-needle` | gen | red | 50 | 1.0x | Baseline: reliable single-target |
| `bass-bomb` | gen | red | 38 | 0.76x | Red AOE option (120r) |
| `heatline` | fin→blue | red | 10×6=60 | 1.2x | Sustained beam eliminator |
| `meteor-drop` | fin→green | red | 40+burn 4×4=16=56 | 1.12x | Delayed blast, cut from 100 |
| `moss-patch` | gen | green | 9×5=45 | 0.9x | Zone DoT (130r), nerfed from 14×5 |
| `thorn-fan` | fin→red | green | 5×14=70 | 1.4x | Shotgun close-range burst |
| `frost-sweep` | gen | blue | 15/hit | 0.75x | Sweep beam + slow, buffed from 10 |
| `arc-bounce` | fin→green | blue | 3×15=45+bounce | 0.9–1.4x | Volley + bounce finisher |

### Inactive (4 pawns, balanced but not in deck)

| ID | Type | Color | Damage (t1) | ×BL | Role |
|----|------|-------|-------------|-----|------|
| `lifebloom-scatter` | gen | green | 3×14=42 | 0.84x | Heal 50% compensates |
| `pulse-garden` | fin→blue | green | 10×4=40 | 0.8x | Zone + next-slot buff 35% |
| `prism-volley` | gen | blue | 3×14=42+split | 0.84–1.7x | Volley + split projectiles |
| `pressure-burst` | fin→red | blue | 42 (63 fresh) | 0.84–1.26x | Opener, +50% vs >75% HP |

## Economy

All values in `StageFlowConfig.ts`:

| Parameter | Old | New | Reason |
|-----------|-----|-----|--------|
| INITIAL_COINS | 50 | 25 | Fill ~4–5 slots wave 1, not all 8 |
| WAVE_CLEAR_REWARD_COINS | 15 | 15 | Unchanged |
| MERGE_REWARD_COINS | 4 | 3 | Less than purchase cost (5) |
| SHOP_PURCHASE_COST | 5 | 5 | Unchanged |
| SHOP_REROLL_BASE_COST | 1 | 1 | Unchanged (increments per reroll) |
| SHOP_REROLL_INCREMENT | — | 1 | New parameter, was hardcoded +1 |
| REPOSITION_COST | 1 | 1 | Unchanged |
| SHOP_OFFER_COUNT | 3 | 3 | Unchanged |
| MAX_PAWN_TIER | 3 | 3 | Unchanged |

**Reroll cost formula**: `baseCost + rerollCount × increment`. Reroll count resets each build phase.

**Expected economy arc**:
- Wave 1: 25 coins → ~4–5 slots filled
- Wave 2: +15 → ~6–7 slots
- Wave 3: +15 → ~7–8 slots, plateau
- Wave 5: typically 1–2 tier-2 pawns
- Wave 10: typically 2–4 tier-2, rare tier-3

Merge rule remains **Random Upgrade** (two identical pawns → random pawn of next tier). This is not changed in this feature.

## Slot Modifier Staging

| Stage | Count Weights [w0,w1,w2,w3] | Pool | Weight Overrides |
|-------|------------------------------|------|------------------|
| 1 | `[1, 0, 0, 0]` | n/a | n/a (always 0) |
| 2 | `[0, 7, 3, 0]` | simple | See below |
| 3 | `[0, 0, 0, 1]` | full | Default weights |

**Stage 2 simple pool** (allowed modifiers with boosted weight):
- `plus-one-projectile` — boosted
- `plus-fifty-aoe-radius` — boosted
- `plus-one-output-note` — boosted
- `plus-one-red-output-note` — default weight
- `plus-one-green-output-note` — default weight
- `plus-one-blue-output-note` — default weight

**Stage 2 hidden** (weight set to 0 via overrides):
- `double-activation`
- `plus-two-output-notes`
- `plus-one-extra-beam`

## System Model

### New Systems

| System | Responsibility |
|--------|---------------|
| `LobbyScene` | Stage selection UI, stage cards, detail panel, result modal |
| `SessionProgressStore` | In-memory record of best stars + HP per stage, last selected stage |
| `StageRegistry` | Maps stage ID → `StageConfig`, lists all stages |
| `calculateStageStars()` | Pure function: `(baseHp, maxBaseHp) → stars` |

### Changed Systems

| System | Change |
|--------|--------|
| `StageConfig` | Expanded with `stageTags`, `eliteEnemyId`, `bossEnemyId`, `hpMultipliers`, `slotModifierCountWeights` stays |
| `StageWaveDefinition` | New type with `kind`, `tags`, `specialEnemyId`, `subWaves` |
| `StageRuntime` | Accepts `StageConfig` at init; reads waves from it |
| `StageFlowCoordinator` | Waves resolved from `StageRuntime.stageConfig`, not global config. Emits `stage:return-to-lobby` on terminal phases |
| `StageWavePreview` | Returns `StageWavePreviewModel` with tags + specialEnemyId instead of text lines |
| `launch-combat-phase` payload | Adds `enemies: ScaledEnemyConfig[]` with pre-scaled HP |
| `CombatEnemyRuntimeFactory` | Receives enemy configs from payload instead of reading global config |
| `CombatContentConfig` | Enemy definitions replaced entirely; ranged removed; archetype stats differentiated |
| `SlotModifierAssignment` | Already uses stage-specific weights — only config changes needed |
| `BootScene` | Starts `LobbyScene` instead of `StageScene` |
| `SceneKeys` | Add `LOBBY: 'LobbyScene'` |
| `StageFlowConfig` | Add `SHOP_REROLL_INCREMENT`, update economy numbers |

## Technical Design

### Config File Structure
```
src/config/
├── stages/
│   ├── RedlineRoutine.ts       # StageConfig for stage 1
│   ├── BlueNoiseRush.ts        # StageConfig for stage 2
│   └── GreenroomCollapse.ts    # StageConfig for stage 3
├── StageRegistry.ts            # Maps id → StageConfig, exports getAllStageConfigs()
├── EnemyDefinitions.ts         # Archetype templates + all enemy definitions + special enemies
├── StageConfig.ts              # Updated StageConfig type (shared interface)
├── CombatContentConfig.ts      # Enemy definitions removed (imports from EnemyDefinitions)
├── CombatBalanceConfig.ts      # Updated with new balance numbers
├── StageFlowConfig.ts          # Updated economy numbers + SHOP_REROLL_INCREMENT
└── GameConfig.ts               # Add SceneKeys.LOBBY
```

### StageConfig Contract
```ts
interface StageConfig {
  id: string;
  displayName: string;
  stageTags: string[];                     // 2–4 tags
  eliteEnemyId: string;
  bossEnemyId: string;
  totalWaves: number;
  hpMultipliers: number[];                 // [1.0, 1.15, …] length = totalWaves
  slotModifierCountWeights: SlotModifierCountWeights;  // {0: w, 1: w, 2: w, 3: w}
  slotModifierWeightOverrides?: Record<string, number>;
  waves: StageWaveDefinition[];            // length = totalWaves
}
```

### StageWaveDefinition Contract
```ts
interface StageWaveDefinition {
  kind: 'normal' | 'elite' | 'boss';
  tags: string[];                          // 1–4 pill tags
  specialEnemyId: string | null;           // non-null for elite/boss
  subWaves: SubWaveDefinition[];           // min 3, average 5
}

interface SubWaveDefinition {
  id: string;
  startTimeMs: number;
  spawnIntervalMs: number;
  enemies: Record<string, number>;         // enemyId → count
}
```

### StageWavePreviewModel Contract
```ts
interface StageWavePreviewModel {
  waveNumber: number;                      // e.g. 5
  totalWaves: number;                      // e.g. 10
  waveKind: 'normal' | 'elite' | 'boss';
  tags: string[];
  specialEnemyId: string | null;
  specialEnemyName: string | null;         // resolved from EnemyDefinitions
}
```

### EnemyDefinitions Contract
```ts
// Archetype templates
const ENEMY_ARCHETYPE_TEMPLATES = {
  basic: { hp: 100, speed: 40, range: 370, cooldown: 1500, damage: 2 },
  fast:  { hp: 65,  speed: 62, range: 370, cooldown: 1100, damage: 2 },
  tank:  { hp: 260, speed: 28, range: 370, cooldown: 2200, damage: 4 },
  swarm: { hp: 40,  speed: 50, range: 370, cooldown: 1800, damage: 1 },
};

// Special enemies — full inline stats (not from templates)
interface EnemyDefinition {
  id: string;
  displayName: string;
  archetype: string;           // basic | fast | tank | swarm | elite | boss
  color: NoteColor;
  maxHp: number;
  moveSpeedPxPerSec: number;
  attackRangePx: number;
  attackCooldownMs: number;
  attackDamage: number;
  visualKey: string;
  silhouetteMotif?: string;   // for special enemies
  isSpecial?: boolean;        // true for elite/boss
}

// Function to create ordinary enemies from template + color
function createEnemy(archetype: keyof typeof ENEMY_ARCHETYPE_TEMPLATES, color: NoteColor): EnemyDefinition
```

### SessionProgressStore Contract
```ts
interface StageResult {
  stageId: string;
  stars: number;                        // 0–3
  bestRemainingBaseHp: number | null;   // null if never completed successfully
}

// Singleton, created once at app init
const SessionProgressStore = {
  getResult(stageId: string): StageResult | null,
  setResult(stageId: string, result: StageResult): void,  // writes only if better
  getLastSelectedStageId(): string | null,
  setLastSelectedStageId(stageId: string): void,
};
```

### Combat Payload Extension
The `stage:launch-combat-phase` payload gains:
```ts
enemies: Array<{
  definitionId: string;
  displayName: string;
  archetype: string;
  color: NoteColor;
  maxHp: number;                         // already scaled by wave multiplier
  moveSpeedPxPerSec: number;
  attackRangePx: number;
  attackCooldownMs: number;
  attackDamage: number;
  visualKey: string;
  silhouetteMotif?: string;
}>
```

`StageRuntime` builds this array by:
1. Reading `StageConfig.waves[waveIndex].subWaves`
2. Resolving each `enemyId` from `EnemyDefinitions`
3. Multiplying `maxHp` by `StageConfig.hpMultipliers[waveIndex]`
4. Passing the result to `launch-combat-phase`

## Data Flow

### Stage Selection → Stage Start
```
LobbyScene
  → user taps stage card → setLastSelectedStageId(id)
  → user taps Start → scene.start(SceneKeys.STAGE, { stageId })
StageScene
  → create() reads stageId from scene data
  → config = getStageConfig(stageId)
  → runtime = createStageRuntime(config)
  → flow coordinator works from runtime.stageConfig
```

### Stage Completion → Lobby Return
```
StageFlowCoordinator detects stage_complete / stage_failed
  → emits command: stage:return-to-lobby { stageId, stars, remainingBaseHp }
StageScene handles command:
  → SessionProgressStore.setResult(stageId, { stars, remainingBaseHp })
  → scene.start(SceneKeys.LOBBY, { stageId, showResult: true })
LobbyScene receives payload:
  → if showResult → reads result from store, shows modal
  → else → just selects the stageId card
```

### Wave Preview Data Flow
```
StageRuntime requests next wave info
  → reads StageConfig.waves[currentWaveIndex]
  → calls createStageWavePreview(waveDef, waveNumber, totalWaves)
  → resolves specialEnemyId → specialEnemyName from EnemyDefinitions
  → returns StageWavePreviewModel
StageFlowCoordinator puts it in stage:snapshot-updated event
  → Build UI renders pill tags + optional special enemy card
```

## State Model

### Session Progress State
```
SessionProgressStore {
  results: Map<stageId, { stars, bestRemainingBaseHp }>
  lastSelectedStageId: string | null
}
```
Invariants:
- `stars` is always 0–3
- `bestRemainingBaseHp` is null if and only if stage never completed successfully
- Defeats set stars=0 but do not change bestRemainingBaseHp

### Lobby Scene State
```
LobbyState {
  selectedStageId: string | null    // persisted via store
  showResultModal: boolean
  resultStageId: string | null      // only when modal is shown
}
```
- If no stage has been selected this session, default to first stage (or none)
- Result modal appears only when `showResult: true` from scene data

## Integration Points

### Input
- Tap on stage cards (LobbyScene)
- Tap "Start" button
- Tap "Retry" / "Close" in result modal

### Stage/Combat
- `StageRuntime` gets stage-scoped waves, HP multipliers
- `StageFlowCoordinator` resolves waves from stage config
- Combat payload includes pre-scaled enemies
- `CombatEnemyRuntimeFactory` receives enemies from payload, not global config

### UI/HUD
- Stage cards (3 per lobby, vertical column)
- Detail panel (tags, elite visual, boss visual, start button)
- Result modal (victory/defeat, stars, HP, retry, close)
- Pill tags component (reusable: lobby detail, wave preview, build phase)
- Special enemy card component (reusable: lobby detail, wave preview)

### Config
- `StageConfig` type expanded
- `StageWaveDefinition` new type
- `EnemyDefinitions` new module
- `StageRegistry` new module
- `StageFlowConfig` economics updated
- `CombatBalanceConfig` updated
- `CombatContentConfig` enemy definitions removed/replaced

### Events
- `stage:snapshot-updated` now carries `wavePreview: StageWavePreviewModel` instead of text lines
- `stage:launch-combat-phase` gains enemies array
- New: `stage:return-to-lobby` command

### VISION.md / CONTEXT.md
- Update VISION.md section on colors to describe same-color weakness
- Update CONTEXT.md если там тоже есть треугольник
- Update VISION.md to describe stage select loop and stars

## Technical Constraints

- Stage configs must validate: elite wave index = 4 (0-based), boss wave index = 9 (0-based)
- `specialEnemyId` on elite wave must match `stageConfig.eliteEnemyId`
- `specialEnemyId` on boss wave must match `stageConfig.bossEnemyId`
- HP multipliers array length must equal `totalWaves`
- Session progress is in-memory only — no localStorage, no serialization
- Reroll cost increment must be read from config, not hardcoded
- Star thresholds must be configurable, not hardcoded

## Failure Modes and Edge Cases

- **No stages defined**: Lobby shows "No stages available" message; game is non-functional but doesn't crash.
- **Stage config references unknown enemy ID**: Validation at config load throws clear error.
- **Stage config has wrong HP multiplier length**: Validation at config load throws clear error.
- **Player hasn't played any stage yet**: All cards show empty star outlines; detail panel shows info based on first stage (or whichever is visually selected).
- **Player defeats a stage, then loses it next run**: Session-best 1+ stars preserved; HP preserved.
- **Player closes result modal without pressing Retry**: Returns to lobby with stage still selected.
- **Reroll cost increment**: Must never go below base cost. Must reset each build phase.
- **Slot modifier generation with count weights all zero**: Fall back to 0 modifiers (should not happen with our configs, but defensive coding).

## Architecture Notes

### Why store `eliteEnemyId` and `bossEnemyId` on StageConfig
The lobby detail panel needs to show elite and boss info without iterating through 10 waves. Storing them at the stage level makes the data direct and avoids implicit lookups. Validation ensures wave 5 and wave 10 actually reference these IDs.

### Why pass pre-scaled enemies in combat payload
Combat should not know about stage-specific HP curves or enemy scaling logic. It receives ready-to-use enemy configs just as it receives ready-to-use slot configs. This keeps combat testable in isolation and avoids a dependency on `StageConfig` inside combat code.

### Why session-only progress
For a first vertical slice testing core gameplay, persistence across reloads is unnecessary complexity. Session-only keeps the implementation trivial (a plain object, no serialization) and the full cycle is testable within a single play session. Browser reload → reset → fine for now.

### Why `SHOP_REROLL_INCREMENT` is in config
Previously the reroll cost formula was `baseCost + rerollCount`, hardcoding an increment of 1. Extracting the increment to config keeps tuning flexible without code changes.

## Validation and Testing

### Config Validation
- [ ] All 3 stage configs pass type checks against new `StageConfig` interface
- [ ] `EnemyDefinitions` has exactly the required enemy IDs (3 colors × 4 archetypes = 12 ordinary + 6 special = 18)
- [ ] All `specialEnemyId` references resolve to existing enemy definitions
- [ ] `hpMultipliers` length equals `totalWaves` for each stage
- [ ] `hpMultipliers` are monotonically non-decreasing
- [ ] `slotModifierCountWeights` values are non-negative
- [ ] No circular imports between stage configs, registry, and enemy definitions

### Functional Checks
- [ ] Boot → LobbyScene shows 3 stage cards
- [ ] Tapping a stage card selects it and updates detail panel
- [ ] Detail panel shows stage name, tags, elite/boss names
- [ ] "Start" button launches StageScene with correct stageId
- [ ] StageScene uses correct stage config (wave composition, HP scaling)
- [ ] Wave preview shows pill tags in correct order
- [ ] Elite wave preview shows Iron Kick card
- [ ] Boss wave preview shows Redline Headliner card
- [ ] Star calculation returns correct values for edge HP percentages (100%, 91%, 90%, 50%, 49%, 1%, 0%)
- [ ] Stage complete → return to lobby → result modal shows correct stars and HP
- [ ] Stage failed → return to lobby → result modal shows defeat
- [ ] "Retry" starts new run of same stage with fresh shop and modifiers
- [ ] "Close" dismisses modal, lobby shows selected stage
- [ ] Session best stars persist across multiple runs
- [ ] Defeat does not overwrite a previous successful result
- [ ] Reloading page resets all progress
- [ ] Stage 1 has 0 slot modifiers always
- [ ] Stage 2 has 1–2 slot modifiers from simple pool only
- [ ] Stage 3 has 3 slot modifiers from full pool

### Integration Checks
- [ ] Combat receives enemies with HP already scaled by wave multiplier
- [ ] Enemy archetype stats differ noticeably in combat (tank moves slower and has more HP than basic)
- [ ] Elite enemies have glow effect in combat
- [ ] Boss enemies have glow effect in combat
- [ ] Shop economy allows filling ~4–5 slots by wave 1, ~7–8 by wave 3
- [ ] Reroll cost increments correctly within a build phase and resets between phases

### Edge Case Checks
- [ ] Lobby handles case where no stages are defined in registry
- [ ] Stage config validation catches missing enemy IDs at load time
- [ ] HP multiplier array length mismatch caught at validation
- [ ] Session progress comparison correctly handles tie-breaking by HP

## Definition of Done

- [ ] All 3 stages are playable from lobby through to completion/defeat
- [ ] Star rating displays correctly on result modal and updates session-best on stage cards
- [ ] Pill tags display in lobby detail, wave preview, and build phase with correct colors
- [ ] Elite and boss special enemies are visually distinct (silhouette + glow) and show in lobby/wave preview
- [ ] All 12 pawns have updated damage numbers in config
- [ ] Economy values are updated in `StageFlowConfig`
- [ ] Reroll increment is configurable and functional
- [ ] `VISION.md` and `CONTEXT.md` are updated for same-color weakness and stage loop
- [ ] Existing tests pass or are updated/removed where contracts changed
- [ ] No ranged enemies remain in any playable wave or enemy definition
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] `npm run build` succeeds

## Assumptions

- The shape-based enemy renderer supports silhouette motifs and glow effects with the described constraints (no new sprite assets needed).
- The lobby layout (35% top for cards, 65% bottom for detail) fits within the 720×1280 viewport without scrolling.
- The current `stage:snapshot-updated` event consumer (UI) will be updated by whoever owns the build phase UI code.
- The `CombatBalanceConfig.BASE_HP` (100) remains the reference for star calculation.
- Animation system is capable of restrained idle pulse/bob for special enemies without heavy implementation cost.

## Open Questions

None. All design decisions were resolved through the design session.
