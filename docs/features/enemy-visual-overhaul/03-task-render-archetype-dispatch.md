# 03 — Render Archetype Dispatch

## Task Intent

Refactor `renderEnemyUnits()` in `CombatScene` to route rendering per-archetype using the `enemy.body.family` field (which maps to the archetype string like `'basic'`, `'tank'`, etc.). Extract the existing hardcoded basic enemy rendering into archetype-specific render functions.

**Critical**: The basic enemy visual must remain IDENTICAL after this refactor. No visual changes — only structural refactoring. The existing 3 enemy definitions (red/green/blue basic) will look exactly the same.

## Relevant Context

Currently `renderEnemyUnits()` renders EVERY enemy with the same hardcoded code:
- A rounded rectangle body (fill + stroke)
- A circle head (fill + stroke)
- Line arms
- Line legs
- Two white dot eyes

This works for the basic archetype but won't work for tank, fast, ranged, swarm, or boss. The render model already has `enemy.body.family` (archetype) and `enemy.body.variantKey` (visual key like `'enemy-basic-red'`). The new shape primitives from task 02 are available at `src/combat/EnemyShapePrimitives.ts`.

## In Scope

1. Refactor `renderEnemyUnits()` to dispatch based on `enemy.body.family`
2. Create archetype-specific render functions: `renderBasicEnemy`, `renderTankEnemy`, `renderFastEnemy`, `renderRangedEnemy`, `renderSwarmEnemy`, `renderBossEnemy`
3. Each function draws the correct shape primitives for its archetype
4. The basic enemy render function must produce IDENTICAL output to the current hardcoded rendering
5. Keep the HP bar rendering and hit flash anchor in `renderEnemyUnits()` (not in archetype functions)
6. Keep the container setup (position, depth, name) in `renderEnemyUnits()`

### Archetype render function signatures

```ts
function renderBasicEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void;

function renderTankEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void;

function renderFastEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void;

function renderRangedEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void;

function renderSwarmEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void;

function renderBossEnemy(
  g: Phaser.GameObjects.Graphics,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void;
```

### Dispatch structure

```ts
// In renderEnemyUnits():
const archetype = enemy.body.family; // 'basic' | 'tank' | 'fast' | 'ranged' | 'swarm' | 'boss'

const body = this.add.graphics();
// ... HP bar setup ...
// ... hit flash setup ...

// Dispatch to archetype-specific renderer
switch (archetype) {
  case 'basic': renderBasicEnemy(body, ...); break;
  case 'tank': renderTankEnemy(body, ...); break;
  // ... etc
  default: renderBasicEnemy(body, ...); break; // fallback
}

container.add([hpBar, body, hitFlashAnchor]);
```

### Basic enemy render (must match current hardcoded output)

The current hardcoded rendering draws:
1. `fillRoundedRect(-bodyHalfWidth, -bodyHalfHeight + 12, bodyWidth, bodyHeight - 20, 22)` with `body.fillStyle(enemy.body.color, 0.16)` and `body.lineStyle(3, enemy.body.color, 0.95)`
2. `fillCircle(0, -bodyHalfHeight + 10, 26)` with `body.fillStyle(enemy.body.color, 0.2)` and `body.lineStyle(3, 0xe8fbff, 0.8)`
3. `strokeLineShape(new Phaser.Geom.Line(-18, 8, -34, 28))`
4. `strokeLineShape(new Phaser.Geom.Line(18, 8, 34, 28))`
5. `strokeLineShape(new Phaser.Geom.Line(-14, 28, -24, 54))`
6. `strokeLineShape(new Phaser.Geom.Line(14, 28, 24, 54))`
7. `fillCircle(-10, -bodyHalfHeight + 8, 4)` with `body.fillStyle(0xe8fbff, 0.95)`
8. `fillCircle(10, -bodyHalfHeight + 8, 4)` with `body.fillStyle(0xe8fbff, 0.95)`

The basic render function should use shape primitives to produce the same visual output. The torso is a rounded rectangle, the head is a circle, and the limbs/eyes are lines and dots.

### Other archetype renders (visual design from spec)

| Archetype | Body Primitives | Head | Notes |
|-----------|----------------|------|-------|
| Tank | wide-rectangle (armor) + 2 short-rectangles (legs) | square | Wide, heavy appearance |
| Fast | oval (body) + V-shape (stabilizers) | elongated oval | Narrow, aerodynamic |
| Ranged | hexagon (body) + thin-rectangle (antenna) | semicircle | Geometric, antenna on top |
| Swarm | capsule (body) + 2 short legs | diamond | Small, rounded, cute |
| Boss | rectangle + trapezoid (same as basic) + crown | triangle + 2 small triangles (horns) | Same as basic but larger (scale 2.5×) |

For tank, fast, ranged, and swarm: the render functions should use the shape primitives from task 02. The exact proportions are up to you but should match the visual descriptions in the spec.

For boss: reuse the basic render + add the crown on top of the head. The boss scale (2.5×) is applied by the render model's body dimensions.

## Out of Scope

- Color application (accent color fill, muted outlines) — handled in task 04
- Animation transforms — handled in task 06/07
- HP bar color fix — handled in task 05
- Damage numbers — handled in task 10
- Test wave — handled in task 11
- Any changes to `CombatRenderModel.ts` (the model already has `body.family`)

## Detailed Requirements

1. Create archetype render functions in `CombatScene.ts` (or a new `EnemyRenderer.ts` module if preferred)
2. Each function draws its archetype's body primitives onto a single Graphics object
3. The dispatch switch statement routes based on `enemy.body.family`
4. The basic enemy render produces IDENTICAL output to the current hardcoded rendering
5. Unknown archetypes fall back to basic rendering (defensive)
6. Keep HP bar and hit flash anchor creation in `renderEnemyUnits()`
7. Keep container setup (position, depth, name, visibility) in `renderEnemyUnits()`

### Proportions for new archetypes

Use the following proportions relative to `bodyWidth` and `bodyHeight`:

**Tank** (wide, heavy):
- Armor: `drawWideRectangle(g, bodyWidth, bodyHeight * 0.6, 4)` — takes up top 60%
- Legs: two `drawShortLeg(g, bodyWidth * 0.15, bodyHeight * 0.35)` at bottom, spaced apart

**Fast** (narrow, aerodynamic):
- Body: `drawOval(g, bodyWidth, bodyHeight * 0.7, 4)` — oval in center
- Stabilizers: `drawVShape(g, bodyWidth * 0.4, bodyHeight * 0.2)` — V at bottom

**Ranged** (geometric):
- Body: `drawHexagon(g, bodyWidth * 0.45)` — hexagon centered
- Antenna: `drawThinRectangle(g, bodyWidth * 0.1, bodyHeight * 0.25)` — on top

**Swarm** (small, capsule):
- Body: `drawCapsule(g, bodyWidth * 0.8, bodyHeight * 0.7)` — capsule centered
- Legs: two `drawShortLeg(g, bodyWidth * 0.12, bodyHeight * 0.25)` at bottom

**Boss**:
- Same as basic (rectangle + trapezoid) + crown on head
- Crown: `drawCrown(g, bodyWidth * 0.5, bodyHeight * 0.15)` — on top of head

## Acceptance Criteria

- [ ] `renderEnemyUnits()` dispatches to archetype-specific render functions
- [ ] All 6 archetype render functions exist (`basic`, `tank`, `fast`, `ranged`, `swarm`, `boss`)
- [ ] The basic enemy visual is IDENTICAL to the current hardcoded rendering
- [ ] Each archetype render function draws on a single Graphics object
- [ ] Unknown archetypes fall back to basic rendering
- [ ] HP bar and hit flash anchor remain in `renderEnemyUnits()`
- [ | Container setup (position, depth, name) remains in `renderEnemyUnits()`
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes (existing tests still pass — visual output unchanged for basic enemies)

## Technical Notes

- The existing `renderEnemyUnits()` method is ~40 lines. After refactoring, it will be ~30 lines (dispatch + container setup) with archetype functions added separately.
- `enemy.body.width` and `enemy.body.height` come from the render model and are already scaled by the archetype's `SCALE_MULTIPLIER`.
- The `enemy.body.color` is the accent color for the archetype — color application is handled in task 04.
- Consider extracting archetype render functions to a separate `src/combat/EnemyRenderer.ts` module to keep `CombatScene.ts` manageable. If you do this, make sure the module exports are clean.
- The `default` case in the switch should render basic as a fallback — this is defensive coding in case an unknown archetype slips through.

## Implementation Plan

1. Read `src/combat/EnemyShapePrimitives.ts` to understand the available primitives
2. Read the current `renderEnemyUnits()` method in `CombatScene.ts` to understand the hardcoded rendering
3. Create archetype render functions that use the shape primitives
4. Refactor `renderEnemyUnits()` to dispatch based on `enemy.body.family`
5. Verify the basic enemy visual is identical (compare the function calls)
6. Run `npx tsc --noEmit` to check for type errors
7. Run `npm test` to confirm existing tests still pass

## Additional Notes

**Why not use a data-driven approach?** The spec says "prefer concrete instructions over generic implementation advice." Archetype rendering is visual and context-sensitive — a data-driven approach (e.g., "draw primitive 0 at position X with color Y") would be harder to reason about than explicit render functions. Explicit functions make it easy to adjust proportions per archetype.

**Why keep HP bar in renderEnemyUnits()?** The HP bar is the same for all archetypes — it doesn't need archetype-specific rendering. It's infrastructure, not content.

**Testing the visual identity**: The easiest way to verify the basic enemy looks identical is to run the game and compare. Since there's no screenshot comparison test, rely on code review of the function calls.

## Blocked By

- Task 02 (shape primitives module must exist)

## Type

AFK

## Design Spec Reference

- [Enemy Archetypes](../design-spec.md#enemy-archetypes) (body primitive table)
- [Rendering Architecture](../design-spec.md#rendering-architecture)
- [Rendering Pipeline](../design-spec.md#rendering-pipeline)
- [Technical Constraints](../design-spec.md#technical-constraints) (performance budget)
