# Enemy Visual Overhaul — Design Spec

## Document Intent

This document is a self-contained implementation handoff for the enemy visual overhaul feature. It must be understandable without access to the original discussion.

## Executive Summary

The enemy visual system needs a complete overhaul. Currently, the project has only one enemy archetype (`basic`) rendered as a simple stick figure using Phaser Graphics. The game's art direction calls for a neon/cyberpunk aesthetic with geometric shapes and simple forms, but the current enemy does not match this vision.

This feature adds 6 new enemy archetypes (Tank, Fast, Ranged, Swarm, Boss, and the existing Basic), each with a unique low-detail silhouette built from 2+ geometric primitives for the body plus a head, and 3 color variants per archetype (red, green, blue). All 18 combinations plus the boss variant are implemented as a single package. A new test wave (`wave-test-all`) is added to the wave config to visually verify all enemy types during development.

## Problem Statement

The current enemy visual is a generic stick figure (rounded rectangle body + circle head + line arms/legs + dot eyes) rendered with Phaser Graphics. It does not match the game's art direction (neon, glow, geometry, cyberpunk) and provides no visual variety for gameplay differentiation. There is only one archetype, and no visual language that communicates enemy type, size, or threat level.

## Goals

- Implement 6 distinct enemy archetypes with unique silhouettes readable at mobile screen resolution
- Each archetype has 3 color variants (red, green, blue) representing elemental weakness system
- Scale multipliers are fully configurable per archetype — if an archetype renders too large or too small, the multiplier can be adjusted in one line without touching rendering code
- Enemies visually contrast with player pawns (angular/cold vs pawns' round/warm)
- HP bars are red (standard game language for enemies) and currently visible (fixing the bug where they are not rendered)
- Damage numbers display above enemy HP bars and above the base HP bar
- All animations (idle, moving, attacking, hit, death) are implemented with the specified juice
- Boss death includes longer fade-out and camera shake
- Death knockback follows the shot vector (from needle activation point to enemy position)
- Add a test wave (`wave-test-all`) that spawns all enemy types for visual verification
- Update affected tests to pass with the new enemy definitions

## Non-Goals

- Attack VFX (already covered by the attacking animation)
- Death particles/sparks (deferred to future iteration)
- Spawn animation (deferred to future iteration)
- Per-archetype stat balancing (all enemies share the same stats for now)
- Global game configuration changes (the test wave is opt-in via config, not a default)

## Feature Scope

### Included

- **Content**: 18 new enemy definitions (6 archetypes × 3 colors) in `CombatContentConfig`
- **Visuals**: Phaser Graphics rendering for each archetype with 2+ body primitives + head
- **Animations**: idle (pulse), moving (Y hop), attacking (core flash + lunge), hit (white flash), death (scale + fade + knockback)
- **Boss special death**: longer fade + camera shake
- **HP bars**: red, visible for all enemies
- **Damage numbers**: white text with dark outline, above HP bar for enemies, above HP bar + offset for base
- **Config**: new test wave `wave-test-all` with 3 sub-waves by color
- **Tests**: adapt `CombatRuntime.test.ts` and any other tests that reference specific enemy IDs

### Excluded

- Attack VFX (beam, laser, projectile)
- Death particles
- Spawn animation
- Per-archetype stat tuning
- Pawn visual overhaul (separate feature)
- Base/DJ booth visual overhaul (separate feature)

## Player Experience

### What the player sees

During combat phase, enemies descend from the top of the screen toward the base (DJ booth). Each enemy has a distinct silhouette that communicates its role:

- **Basic**: Balanced rectangular body with shoulder trapezoid — the standard grunt
- **Tank**: Wide, heavy body — reads as a wall that takes longer to destroy
- **Fast**: Narrow, aerodynamic body — reads as quick and agile
- **Ranged**: Hexagonal body with antenna — reads as a ranged threat
- **Swarm**: Small capsule with short legs — reads as numerous and weak
- **Boss**: Same silhouette as Basic but 2.5× larger with crown/antenna accessories — reads as the main threat

Each enemy is colored by its element (red/green/blue) with one body primitive fully filled in the accent color, while the outline uses a muted version of the same color. The head is a geometric shape (triangle, square, etc.) with two white dot eyes.

### What the player does

The player observes enemy types visually and reacts by:
- Adjusting their pawn color strategy to exploit elemental weaknesses
- Prioritizing threats based on silhouette (tanks are dangerous because they last longer, swarms are dangerous because there are many)
- Recognizing the boss by its exaggerated size and accessories
- Getting satisfying feedback when enemies die with a knockback in the direction of the shot that killed them

### How it should feel

Enemies should feel like a cohesive enemy faction with distinct personalities, not just colored boxes. The angular/cold visual language should immediately signal "this is not me" against the player's warm/round pawns. Death should feel impactful with the knockback juice.

## Core Mechanics

### Enemy Archetypes

Each archetype is defined by its body primitive composition, head shape, and scale multiplier relative to the Basic archetype (1.0×):

| Archetype | Body Primitives | Head Shape | Scale |
|-----------|----------------|------------|-------|
| **Basic** | Rectangle (torso) + Trapezoid (shoulders) | Triangle (mask) | 1.0× |
| **Tank** | Wide rectangle (armor) + 2 short rectangles (legs) | Square (block mask) | 1.6× |
| **Fast** | Oval (streamlined body) + V-shape (stabilizers) | Elongated oval | 0.7× |
| **Ranged** | Hexagon (body) + thin rectangle (antenna) | Semicircle (dome) | 1.1× |
| **Swarm** | Capsule (rounded body) + 2 short legs | Small diamond | 0.5× |
| **Boss** | Same as Basic + crown (triangles on head) | Triangle + 2 small triangles (horns) | 2.5× |

### Color System

Each enemy has one of three element colors (red, green, blue). The color is applied as follows:

1. **Body fill**: One body primitive is fully filled with the accent color (alpha 1.0)
2. **Outline**: All primitives have an outline in the same color at reduced alpha (~0.3-0.4)
3. **Head**: White/grey outline, no fill
4. **Eyes**: Two white dots inside the head
5. **HP bar**: Always red (`0xff0000` or similar), not element-colored

### Scale System

Scale multipliers are applied to the base body dimensions (`ENEMY.BASE_BODY_WIDTH` × `ENEMY.BASE_BODY_HEIGHT`):

```
renderedWidth  = BASE_BODY_WIDTH  × SCALE_MULTIPLIERS[archetype]
renderedHeight = BASE_BODY_HEIGHT × SCALE_MULTIPLIERS[archetype]
```

| Archetype | Scale Multiplier | Approx. Width | Approx. Height |
|-----------|-----------------|---------------|----------------|
| Basic | 1.0× | 31px | 36px |
| Tank | 1.6× | ~50px | ~58px |
| Fast | 0.7× | ~22px | ~25px |
| Ranged | 1.1× | ~34px | ~40px |
| Swarm | 0.5× | ~16px | ~18px |
| Boss | 2.5× | ~78px | ~90px |

**Tuning**: If any archetype looks too big or too small on screen, change only its `SCALE_MULTIPLIER` value. No other code changes needed.

### Animation States

Each enemy transitions between these states:

| State | Visual Signal | Parameters |
|-------|--------------|------------|
| **Idle** | Scale pulse ±2% | Period: ~1.5s |
| **Moving** | Y-hop ~2-3px | Period: ~0.4s |
| **Attacking** | Accent primitive flashes white + body lunges forward ~3-5px | Duration: ~0.15s |
| **Hit** | All primitives flash white | Duration: ~0.08s |
| **Death** | Scale down to 0 + alpha fade to 0 + knockback | Duration: ~0.5s |

### Death Knockback

When an enemy dies, it receives a knockback impulse along a vector:

1. **Origin**: The needle activation point (where the pawn fires from — under the needle on the record)
2. **Target**: The enemy's current position
3. **Direction**: From origin toward target (normalized)
4. **Magnitude**: A fixed distance (e.g., 30-50px) — the enemy flies backward along this vector
5. **Timing**: Applied immediately on death, overlapped with the death fade-out

### Boss Death

In addition to the standard death animation (scale + fade + knockback), the boss receives:

- **Longer fade-out**: 1.0s instead of 0.5s
- **Camera shake**: Screen shake applied to the game camera on boss death (magnitude and duration configurable)

### HP Bars

- **Position**: Above the enemy's head, horizontally centered
- **Color**: Red fill, dark background
- **Width**: Configurable (current: 23px from `CombatVisualConfig.ENEMY.HP_BAR_WIDTH`)
- **Height**: 4px (current: `CombatVisualConfig.ENEMY.HP_BAR_HEIGHT`)
- **Bug fix**: HP bars are currently NOT rendered — this must be fixed

### Damage Numbers

- **Position**: Above enemy HP bars; above base HP bar with horizontal offset to avoid the capybara
- **Style**: White text with dark outline (for readability on any background)
- **Animation**: Float upward + alpha fade out
- **Duration**: Configurable (default ~0.6s)
- **Font size**: Configurable (default ~14-16px)
- **Config keys**: `DAMAGE_NUMBER.FLOAT_DURATION_MS`, `DAMAGE_NUMBER.FONT_SIZE_PX`

## Technical Design

### Architecture Overview

The enemy system spans three layers:

1. **Config layer** (`src/config/CombatContentConfig.ts`) — enemy definitions (id, archetype, color, stats, visualKey)
2. **Runtime layer** (`src/combat/CombatRuntime.ts`) — enemy state (position, HP, state, spawned flag)
3. **Render layer** (`src/scenes/combat/CombatScene.ts`) — Phaser Graphics rendering of each enemy

### New Enemy Definitions

Add to `CombatContentConfig.ENEMY_DEFINITIONS`:

```
enemy-red-basic, enemy-green-basic, enemy-blue-basic (existing)
enemy-red-tank, enemy-green-tank, enemy-blue-tank
enemy-red-fast, enemy-green-fast, enemy-blue-fast
enemy-red-ranged, enemy-green-ranged, enemy-blue-ranged
enemy-red-swarm, enemy-green-swarm, enemy-blue-swarm
enemy-red-boss, enemy-green-boss, enemy-blue-boss
```

Each definition has:
- `id`: unique string
- `archetype`: one of 'basic', 'tank', 'fast', 'ranged', 'swarm', 'boss'
- `color`: one of 'red', 'green', 'blue'
- `maxHp`: `CombatBalanceConfig.ENEMY_MAX_HP` (all same for now)
- `moveSpeedPxPerSec`: `CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC` (all same for now)
- `attackRangePx`: `CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX` (all same for now)
- `attackCooldownMs`: `CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS` (all same for now)
- `attackDamage`: `CombatBalanceConfig.ENEMY_ATTACK_DAMAGE` (all same for now)
- `visualKey`: e.g., 'enemy-basic-red'

### Rendering Architecture

Each enemy is rendered as a Phaser Container containing:
- `Graphics` object for the body (all primitives drawn in one Graphics call)
- `Graphics` object for the HP bar
- `Graphics` or `Container` for hit flash overlay

**Critical optimization**: Instead of one Graphics per primitive, each enemy should use ONE Graphics object for all body primitives. This reduces draw calls from ~5 per enemy to 1 per enemy.

### Rendering Pipeline

For each archetype, the body is drawn as a single Graphics object with multiple fill/stroke calls:

```
Graphics for enemy body:
  1. fillBodyPrimitive(accentColor) — the colored primitive
  2. strokeAllPrimitives(mutedColor, alpha 0.3-0.4)
  3. strokeHead(white/grey)
  4. fillEyes(white)
```

The head and eyes are drawn as separate primitives within the same Graphics object.

### Animation Implementation

Animations are applied as transforms on the enemy Container each frame:

- **Idle**: `container.scaleX` and `container.scaleY` oscillate ±2% using sine wave
- **Moving**: `container.y` oscillates ±2-3px using sine wave
- **Attacking**: Temporary scale/translate override for ~0.15s
- **Hit**: Temporary full-white tint override for ~0.08s
- **Death**: Scale from 1.0 to 0.0 + alpha from 1.0 to 0.0 over configurable duration, plus position offset for knockback

### Damage Number System

A new damage number system is needed:

**Component**: `CombatDamageNumber` (new class or function in `src/combat/`)

**Lifecycle**:
1. Created when `combat:enemy-hit` or `combat:base-damaged` event fires
2. Positioned at the target's screen position (above HP bar)
3. Displays the damage value as text
4. Floats upward and fades out over `DAMAGE_NUMBER.FLOAT_DURATION_MS`
5. Destroyed when animation completes

**Config**: Add to `CombatVisualConfig`:
```ts
DAMAGE_NUMBER: {
  FONT_SIZE_PX: 14,
  FLOAT_DURATION_MS: 600,
  FLOAT_DISTANCE_Y: 30,
  BASE_OFFSET_X: 0,
  BASE_OFFSET_Y: -20, // offset from base HP bar to avoid capybara
  ENEMY_OFFSET_Y: -10, // offset from enemy HP bar
}
```

### Wave Configuration

Add a new wave to `CombatWaveConfig.WAVES`:

```ts
{
  id: 'wave-test-all',
  slotPresetId: 'preset-starter-1',
  startAngleDeg: 0,
  subWaves: [
    {
      id: 'wave-test-all-red',
      startTimeMs: 0,
      spawnIntervalMs: 1200,
      enemies: {
        'enemy-red-basic': 1,
        'enemy-red-tank': 1,
        'enemy-red-fast': 1,
        'enemy-red-ranged': 1,
        'enemy-red-swarm': 1,
        'enemy-red-boss': 1,
      },
    },
    {
      id: 'wave-test-all-green',
      startTimeMs: 3000,
      spawnIntervalMs: 1200,
      enemies: {
        'enemy-green-basic': 1,
        'enemy-green-tank': 1,
        'enemy-green-fast': 1,
        'enemy-green-ranged': 1,
        'enemy-green-swarm': 1,
        'enemy-green-boss': 1,
      },
    },
    {
      id: 'wave-test-all-blue',
      startTimeMs: 6000,
      spawnIntervalMs: 1200,
      enemies: {
        'enemy-blue-basic': 1,
        'enemy-blue-tank': 1,
        'enemy-blue-fast': 1,
        'enemy-blue-ranged': 1,
        'enemy-blue-swarm': 1,
        'enemy-blue-boss': 1,
      },
    },
  ],
}
```

The game should be configured to run `wave-test-all` instead of `wave-1` during development.

### Config for Enemy Visuals

Add to `CombatVisualConfig`:

```ts
ENEMY: {
  // Base body dimensions (applied to Basic archetype at scale 1.0)
  // All other archetypes multiply these values by their SCALE_MULTIPLIER.
  // Tweak these two values if ALL enemies are too big or too small.
  BASE_BODY_WIDTH: 31,
  BASE_BODY_HEIGHT: 36,

  // Per-archetype scale multipliers. This is the PRIMARY tuning knob for enemy sizes.
  // If an archetype looks too big or too small on screen, adjust its multiplier here.
  // After changing, verify in the test wave.
  SCALE_MULTIPLIERS: {
    basic: 1.0,
    tank: 1.6,
    fast: 0.7,
    ranged: 1.1,
    swarm: 0.5,
    boss: 2.5,
  },

  // HP bar positioning (relative to enemy center)
  HP_BAR_OFFSET_Y: -25,
  HP_BAR_WIDTH: 23,
  HP_BAR_HEIGHT: 4,
  HIT_FLASH_OFFSET_Y: -3,

  // Head shape keys — mapped to rendering logic
  HEAD_SHAPES: {
    basic: 'triangle',
    tank: 'square',
    fast: 'oval',
    ranged: 'semicircle',
    swarm: 'diamond',
    boss: 'triangle-horned',
  },

  // Body primitive definitions — each archetype has 2+ primitives
  // The first primitive (index 0) is always the accent-filled one
  BODY_PRIMITIVES: {
    basic: ['rectangle', 'trapezoid'],
    tank: ['wide-rectangle', 'short-rectangle', 'short-rectangle'],
    fast: ['oval', 'v-shape'],
    ranged: ['hexagon', 'thin-rectangle'],
    swarm: ['capsule', 'short-leg', 'short-leg'],
    boss: ['rectangle', 'trapezoid', 'crown'],
  },
},
DAMAGE_NUMBER: {
  FONT_SIZE_PX: 14,
  FLOAT_DURATION_MS: 600,
  FLOAT_DISTANCE_Y: 30,
  BASE_OFFSET_X: 60, // offset from center to avoid capybara
  BASE_OFFSET_Y: -20,
  ENEMY_OFFSET_Y: -10,
},
```

**Tuning workflow**: If any archetype looks too big or too small, change only its `SCALE_MULTIPLIERS` value. The rendered size = `BASE_BODY_WIDTH × SCALE_MULTIPLIER`. No other changes needed.

## Data Flow

### Enemy Definition → Runtime

1. `CombatContentConfig.ENEMY_DEFINITIONS` defines all enemy types
2. `createCombatEnemyRuntimes()` reads the active wave's sub-waves and creates `CombatEnemyRuntime` objects for each spawn
3. Each runtime has a `definitionId` that maps back to the content config

### Runtime → Render

1. `createCombatRenderModel()` reads the active wave and creates `CombatEnemyRenderModel` entries
2. Each render model has: `body` (family, silhouetteKey, color, width, height), `hpBar`, `container` (position, depth)
3. `CombatScene.renderEnemyUnits()` reads the render model and creates Phaser Graphics containers
4. The render model's `body.variantKey` maps to the enemy's `visualKey` from the definition

### Combat Events → Visual Feedback

1. `combat:enemy-hit` event → trigger hit flash animation on the enemy's container
2. `combat:enemy-died` event → trigger death animation (scale + fade + knockback)
3. `combat:base-damaged` event → create damage number at base HP bar position

### Damage Number Flow

1. Event producer (`CombatRuntime`) emits `combat:enemy-hit` or `combat:base-damaged`
2. Event consumer (`CombatScene` or `CombatVfxSystem`) receives the event
3. Consumer creates a damage number GameObject at the appropriate position
4. Damage number animates (float up + fade) and destroys itself

## State Model

### Enemy States (CombatEnemyState)

```
moving → attacking → (loop: attack, wait, attack...)
moving → dead (killed by pawn attack)
attacking → dead (killed by pawn attack)
```

### Animation States (transient, per-frame)

Each enemy has transient animation state that is computed each frame:

```
idlePulse: sine wave, always active when alive and not moving
moveHop: sine wave, active when state === 'moving'
attackFlash: boolean flag, active for ~0.15s after attack starts
hitFlash: boolean flag, active for ~0.08s after receiving damage
death: { progress: 0→1, knockbackX, knockbackY }, active after death
```

### Invariants

- Every enemy has a `definitionId` that maps to a valid enemy definition
- Every enemy has a `color` that is one of the defined note colors
- An enemy's `archetype` determines its visual silhouette (not its stats)
- All enemies share the same base stats (HP, speed, damage, cooldown) until balancing is added
- The accent primitive index is always 0 (first body primitive) — the torso/body is always the colored one

## Integration Points

### Systems This Feature Touches

| System | File | Interaction |
|--------|------|-------------|
| Content Config | `src/config/CombatContentConfig.ts` | Add 18 new enemy definitions |
| Wave Config | `src/config/CombatWaveConfig.ts` | Add `wave-test-all` |
| Visual Config | `src/config/CombatVisualConfig.ts` | Add scale multipliers, damage number config |
| Layout Config | `src/config/CombatLayoutConfig.ts` | No changes needed |
| Render Model | `src/combat/CombatRenderModel.ts` | Update `createEnemyRenderModel()` to include archetype info |
| Enemy Runtime Factory | `src/combat/CombatEnemyRuntimeFactory.ts` | No changes needed (reads from config) |
| Combat Scene | `src/scenes/combat/CombatScene.ts` | Major changes: new enemy rendering, animations, damage numbers |
| Combat Runtime | `src/combat/CombatRuntime.ts` | No changes needed (events already exist) |
| Combat VFX System | `src/combat/CombatVfxSystem.ts` | May need to handle boss death camera shake |
| Tests | `src/combat/CombatRuntime.test.ts` | Update enemy ID references and counts |

### Existing Abstractions to Reuse

- `CombatEnemyRuntime` interface — already has all needed fields
- `CombatEnemyRenderModel` — extend with `archetype` and `scaleMultiplier`
- `Phaser.Graphics` — current rendering approach, keep it
- `combat:enemy-hit` event — already emitted, just add damage number consumer
- `combat:enemy-died` event — already emitted, add knockback logic
- `combat:base-damaged` event — already emitted, add damage number consumer

## Content and Configuration

### New Enemy Definitions

18 new entries in `CombatContentConfig.ENEMY_DEFINITIONS`. Each follows the same structure as existing definitions:

```ts
{
  id: 'enemy-{color}-{archetype}',
  archetype: '{archetype}',
  color: '{color}',
  maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
  moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
  attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
  attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
  attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
  visualKey: 'enemy-{archetype}-{color}',
}
```

### New Wave

One new wave entry in `CombatWaveConfig.WAVES`:
- `id: 'wave-test-all'`
- Uses existing `slotPresetId: 'preset-starter-1'`
- 3 sub-waves, one per color, 6 enemies each, 1200ms spawn interval

### Config Additions

All new configuration values go in `CombatVisualConfig`:
- `ENEMY.BASE_BODY_WIDTH` / `ENEMY.BASE_BODY_HEIGHT` — base dimensions for Basic archetype
- `ENEMY.SCALE_MULTIPLIERS` — **primary tuning knob** for adjusting each archetype's size
- `ENEMY.HEAD_SHAPES` — per-archetype head shape key
- `ENEMY.BODY_PRIMITIVES` — per-archetype primitive list
- `DAMAGE_NUMBER.*` — damage number system config

**Tuning workflow**: If any archetype looks too big or too small, change only its `SCALE_MULTIPLIERS` value. The rendered size = `BASE_BODY_WIDTH × SCALE_MULTIPLIER`. No other changes needed.

### Validation

The existing `validateCombatContentConfig()` and `validateCombatWaveConfig()` functions should automatically validate new enemy definitions and wave entries (they check for valid colors, valid IDs, valid slot preset references).

## Technical Constraints

### Platform

- Mobile portrait orientation (430×932px viewport)
- Enemies must be readable at small screen resolution
- Performance budget: up to 15 enemies on screen simultaneously
- Each enemy uses 1 Graphics object for body + 1 for HP bar = 2 draw calls per enemy = ~30 draw calls for 15 enemies (acceptable for Phaser on mobile)

### Engine

- Phaser 3 with TypeScript
- All rendering via `Phaser.Graphics` (no texture atlases for prototype)
- Colors applied at runtime (no pre-rendered textures)

### Determinism

- Knockback direction is deterministic (computed from shot origin to enemy position)
- Animation timing is frame-rate independent (based on delta time)

## Failure Modes and Edge Cases

### Multiple Enemies Overlapping

- Enemies spawn with anti-clumping (min gap from `CombatBalanceConfig.ENEMY_SPAWN_MIN_GAP_PX`)
- When enemies are killed, their death animations may overlap visually — no special handling needed, each enemy's container handles its own animation independently

### Boss Death Camera Shake

- Camera shake should not break the game state or cause visual glitches
- Shake should be limited in magnitude to avoid motion sickness
- Shake should not affect raycasting or input detection

### Damage Numbers Positioning

- If an enemy is near the edge of the screen, damage numbers should not clip off-screen
- If the base HP bar is near the capybara, damage numbers should offset horizontally to avoid overlap

### Enemy Death During Animation

- If an enemy dies while in the middle of an idle/moving animation, the death animation takes priority
- If an enemy receives damage while already in hit flash, the hit flash resets (no stacking)

### Wave Config Validation

- New wave references must use only defined enemy IDs
- New wave must reference a valid slot preset
- Sub-wave enemy counts must not exceed the total number of enemy runtimes created from definitions

## Architecture Notes

### Why Phaser Graphics over Texture Atlases

For the prototype phase, Phaser Graphics is preferred because:
1. Colors are applied at runtime via fill/stroke — no need to pre-render 18 color variants
2. Easy to iterate on shapes without redrawing assets
3. The performance budget (15 enemies × 2 draw calls) is well within Phaser's capabilities
4. No asset pipeline needed

### Why One Graphics Object Per Enemy

Drawing all body primitives in a single Graphics object reduces draw calls from 5+ per enemy to 1 per enemy. With 15 enemies on screen, this is ~15 draw calls instead of ~75+, which is critical for mobile performance.

### Why All Enemies Share Stats

Keeping all enemies at the same base stats minimizes regression risk in the existing test suite. The visual differentiation is the primary goal of this feature; stat balancing is a separate concern that can be addressed in a follow-up iteration.

### Why the Test Wave Uses 3 Sub-Waves by Color

Splitting by color (6 enemies per sub-wave) keeps each sub-wave manageable in density while still showing all archetypes. A single sub-wave with 18 enemies would be too crowded for visual verification.

## Validation and Testing

### Functional Checks

- [ ] All 18 enemy definitions are present in `CombatContentConfig.ENEMY_DEFINITIONS`
- [ ] Each enemy has a unique `id` and `visualKey`
- [ ] Each enemy has a valid `archetype` and `color`
- [ ] All enemies pass `validateCombatContentConfig()` validation
- [ ] `wave-test-all` is present in `CombatWaveConfig.WAVES`
- [ ] `wave-test-all` passes `validateCombatWaveConfig()` validation
- [ ] Each sub-wave in `wave-test-all` contains exactly 6 enemies (one per archetype)
- [ ] Each sub-wave contains one enemy per color

### Visual Checks

- [ ] Each archetype has a visually distinct silhouette
- [ ] Color variants are distinguishable (red/green/blue)
- [ ] Boss is visibly larger than Basic (2.5× scale)
- [ ] Head shape is distinct per archetype
- [ ] Accent primitive is clearly visible (filled with element color)
- [ ] HP bar is red and visible above all enemies
- [ ] Eyes (white dots) are visible on all enemies
- [ ] Idle animation (pulse) is visible
- [ ] Moving animation (Y-hop) is visible
- [ ] Attacking animation (flash + lunge) is visible
- [ ] Hit animation (white flash) is visible
- [ ] Death animation (scale + fade + knockback) is visible
- [ ] Boss death includes camera shake
- [ ] Damage numbers appear above enemies and base
- [ ] Damage numbers float upward and fade out

### Test Suite Checks

- [ ] `npm test` passes with no failures
- [ ] `CombatContentConfig.test.ts` passes (generic validation)
- [ ] `CombatWaveConfig.test.ts` passes (generic validation)
- [ ] `CombatRenderModel.test.ts` passes (enemy count matches runtimes)
- [ ] `CombatRuntime.test.ts` passes (all tests updated for new enemy IDs)

### Performance Checks

- [ ] Frame rate remains stable with 15 enemies on screen
- [ ] Memory usage is acceptable during a full wave
- [ ] No memory leaks from damage number objects (they should destroy themselves)

## Definition of Done

- All 18 enemy definitions implemented with unique visuals
- All 6 archetypes have distinct silhouettes
- Color system correctly applies element color to one body primitive
- HP bars are red and visible for all enemies
- Damage numbers system implemented for enemies and base
- All 5 animation states implemented with correct juice
- Boss death has longer fade + camera shake
- Death knockback follows shot vector
- Test wave `wave-test-all` added and functional
- All existing tests pass
- Config values are extractable and tunable

## Assumptions

- The existing `CombatEnemyRuntime` interface is sufficient — no runtime schema changes needed
- The `combat:enemy-hit`, `combat:enemy-died`, and `combat:base-damaged` events are already correctly emitted
- The existing `Phaser.Graphics` rendering approach in `CombatScene.renderEnemyUnits()` can be extended for new archetypes
- Camera shake can be achieved via Phaser's built-in camera shake or a custom tween
- Damage numbers do not need to be pooled (15 enemies × short animation = low allocation pressure)
- The test wave should replace the default wave in the game's initial state (not just be added to config)
- The `enemyRenderModel.body.variantKey` is used to look up the archetype-specific rendering logic
- The knockback magnitude is a fixed value (e.g., 40px) — not scaled by enemy size or archetype

## Open Questions

- What is the exact knockback magnitude (distance in pixels)?
- What are the exact camera shake parameters (magnitude, duration, easing)?
- Should damage numbers be pooled for performance?
- Should the test wave be the default wave, or should there be a config flag to select which wave to run?
- Should the `renderEnemyUnits()` method be refactored into a separate `EnemyRenderer` class for maintainability?
- Should the boss death camera shake be a global camera shake or a container-local shake?
