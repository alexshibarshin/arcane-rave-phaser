# 02 — Shape Primitives Module

## Task Intent

Create a module of pure shape-drawing functions that each draw one geometric primitive onto a Phaser Graphics object. These functions are the building blocks for all enemy archetypes. Each function takes a `Phaser.GameObjects.Graphics` and draws a single primitive in local space (centered at origin).

This task adds NO rendering dispatch logic, NO archetype-specific code, and NO changes to `CombatScene`. It is purely a new utility module that subsequent tasks will import.

## Relevant Context

The current `renderEnemyUnits()` in `CombatScene` draws a hardcoded basic enemy using raw Phaser Graphics calls:
- `fillRoundedRect` for the body
- `strokeRoundedRect` for the body outline
- `fillCircle` / `strokeCircle` for the head
- `strokeLineShape` for limbs and eyes

The new architecture replaces these ad-hoc calls with structured shape primitives. Each archetype specifies which primitives compose its body via `ENEMY.BODY_PRIMITIVES` in config (e.g., `basic: ['rectangle', 'trapezoid']`).

**Critical optimization**: All primitives for one enemy must be drawn in a SINGLE Graphics object to minimize draw calls (1 per enemy body instead of 5+).

## In Scope

Create `src/combat/EnemyShapePrimitives.ts` with the following functions:

### Body primitives (one per archetype need)

| Function | Shape | Notes |
|----------|-------|-------|
| `drawRectangle(g, width, height, radius?)` | Rounded rect | For basic torso |
| `drawTrapezoid(g, topWidth, bottomWidth, height, cornerRadius?)` | Trapezoid | For basic shoulders |
| `drawWideRectangle(g, width, height, radius?)` | Wide rounded rect | For tank armor |
| `drawOval(g, width, height)` | Filled ellipse | For fast body |
| `drawVShape(g, width, depth)` | V-shape lines | For fast stabilizers |
| `drawHexagon(g, radius)` | Regular hexagon | For ranged body |
| `drawThinRectangle(g, width, height, radius?)` | Thin rounded rect | For ranged antenna |
| `drawCapsule(g, width, height)` | Pill shape | For swarm body |
| `drawShortLeg(g, width, height)` | Short rect | For swarm legs |
| `drawCrown(g, width, height, points?)` | Crown shape | For boss crown |

### Head primitives

| Function | Shape | Archetype |
|----------|-------|-----------|
| `drawHeadBasic(g, size)` | Triangle | Basic, Boss |
| `drawHeadTank(g, size)` | Square | Tank |
| `drawHeadFast(g, width, height)` | Oval | Fast |
| `drawHeadRanged(g, radius)` | Semicircle | Ranged |
| `drawHeadSwarm(g, size)` | Diamond | Swarm |
| `drawHeadBoss(g, size)` | Triangle + 2 small triangles (horns) | Boss |

### Drawing conventions

- All coordinates are **local to the Graphics object** (centered at origin)
- `width` and `height` are the bounding box dimensions
- `radius` is optional for rounded corners (default: 0)
- Functions use `g.beginPath()`, fill/stroke operations, `g.closePath()`, `g.fillPath()` / `g.strokePath()`
- Functions do NOT call `g.clear()` — the caller manages the Graphics state
- Functions do NOT set fill/stroke styles — the caller sets `g.fillStyle()` and `g.lineStyle()` before calling

## Out of Scope

- Archetype-specific rendering logic (handled in task 03)
- Color application (handled in task 04)
- Animation transforms (handled in task 06/07)
- HP bar rendering (handled in task 05)
- Damage numbers (handled in task 10)
- Any changes to `CombatScene.ts`

## Detailed Requirements

1. Create `src/combat/EnemyShapePrimitives.ts`
2. Export all shape functions listed above
3. Each function must be a pure drawing call — no side effects, no state mutation
4. Functions must work correctly when called on a clean Graphics object
5. The module must have no dependencies on other combat modules (no circular imports)
6. Use `Phaser.Geom` primitives where appropriate (e.g., `Phaser.Geom.Polygon`, `Phaser.Geom.Ellipse`)

### Shape implementation details

**drawRectangle**: `fillRoundedRect(-width/2, -height/2, width, height, radius)`
**drawTrapezoid**: Use `beginPath()` + `moveTo`/`lineTo` for the trapezoid shape, then `fillPath()`/`strokePath()`
**drawWideRectangle**: Same as `drawRectangle` but intended for wider proportions
**drawOval**: `fillEllipse(0, 0, width, height)`
**drawVShape**: Two diagonal lines forming a V — `strokeLineShape(new Phaser.Geom.Line(-w/2, -d, 0, d))` and `strokeLineShape(new Phaser.Geom.Line(0, d, w/2, -d))`
**drawHexagon**: Six points around a circle, `fillPath()`/`strokePath()`
**drawThinRectangle**: Same as `drawRectangle` with small width
**drawCapsule**: `fillRoundedRect(-width/2, -height/2, width, height, height/2)`
**drawShortLeg**: Small rounded rect
**drawCrown**: Polygon with crown-like points on top
**drawHeadBasic**: Triangle pointing up
**drawHeadTank**: Square
**drawHeadFast**: Ellipse (taller than wide)
**drawHeadRanged**: Semicircle (top half of circle)
**drawHeadSwarm**: Diamond (rotated square)
**drawHeadBoss**: Triangle + two small triangles for horns

## Acceptance Criteria

- [ ] `EnemyShapePrimitives.ts` exists at `src/combat/EnemyShapePrimitives.ts`
- [ ] All 16 shape functions are exported and callable
- [ ] Each function draws the correct shape on a Phaser Graphics object
- [ ] Functions use local coordinates centered at origin
- [ ] Functions do NOT call `g.clear()` on the Graphics object
- [ ] Functions do NOT set fill/stroke styles (caller-controlled)
- [ ] No circular imports — the module is self-contained
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run test:run` passes (no existing tests affected)

## Technical Notes

- The module is imported by `CombatScene.ts` in task 03, so it must be importable
- Phaser Graphics `fillPath()`/`strokePath()` are used for non-rectilinear shapes (trapezoid, hexagon, crown)
- `Phaser.Geom.Polygon` can be used for complex shapes; `Phaser.Geom.Line` for V-shape
- The `radius` parameter for rounded corners is optional — default to 0 for sharp corners
- `drawHeadBoss` draws the triangle head + two small horn triangles — this is the only function that draws multiple sub-shapes

## Implementation Plan

1. Create `src/combat/EnemyShapePrimitives.ts`
2. Implement each shape function one at a time, verifying the shape looks correct
3. For polygonal shapes (trapezoid, hexagon, crown), use `beginPath()` + `moveTo`/`lineTo` + `fillPath()`/`strokePath()`
4. For elliptical shapes (oval, capsule head), use `fillEllipse()`/`strokeEllipse()`
5. For simple rectangles, use `fillRoundedRect()`/`strokeRoundedRect()`
6. Run `npx tsc --noEmit` to check for type errors
7. Run `npm run test:run` to confirm existing tests still pass

## Additional Notes

**Why pure functions?** Shape primitives are geometry-only. They don't know about colors, scales, or archetypes. This makes them easy to test independently and reuse across archetypes. The caller (archetype renderer) controls the visual appearance by setting fill/stroke styles before calling primitives.

**Why not use Phaser.Geom.Group?** Phaser.Geom.Group is for hit-testing, not rendering. We need direct Graphics drawing for the visual output.

## Blocked By

None — can start immediately.

## Type

AFK

## Design Spec Reference

- [Enemy Archetypes](../design-spec.md#enemy-archetypes) (body primitive table)
- [Rendering Architecture](../design-spec.md#rendering-architecture)
- [Rendering Pipeline](../design-spec.md#rendering-pipeline)
- [Technical Constraints](../design-spec.md#technical-constraints)
