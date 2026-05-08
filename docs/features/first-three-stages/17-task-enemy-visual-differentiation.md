# Enemy Visual Differentiation — Silhouette Motifs and Glow

## Task Intent

Implement visual differentiation for special enemies (elites and bosses) and ordinary enemies in combat. Add silhouette ornaments (chevrons, satellites, trails, crown, ring waves, petals) for the 6 special enemies, a colored outline glow effect rendered behind enemy shapes, a subtle idle pulse animation, and assign distinct base shapes to ordinary enemies (circle/basic, diamond/fast, hexagon/tank, triangle/swarm).

After this task, special enemies are immediately recognizable in combat (and in lobby/wave preview cards from tasks 15–16), and ordinary enemies have clear visual archetype distinction beyond just color.

## Relevant Context

The current combat renderer draws all enemies as simple colored shapes (circles or generic polygons) with no differentiation between archetypes, no glow, and no special enemy motifs. The `CombatEnemyPresenter` handles enemy rendering.

### Special Enemy Silhouette Motifs

| Enemy | Core Shape | Ornamentation |
|-------|-----------|---------------|
| Iron Kick (elite tank) | Hexagon | Four outward-pointing chevrons (cardinal directions) |
| Static Choir (elite swarm) | Triangle cluster | Orbiting smaller triangles (satellite motes) |
| Backstage Blur (elite fast) | Diamond | 2–3 thin motion-line trails behind shape |
| Redline Headliner (boss) | Large hexagon | Concentric ring pulse + crown ornament (3 triangles on top) |
| Blue Noise Monarch (boss) | Large triangle-cluster | Expanding ring wave (concentric circles fading outward) + orbiting motes |
| Verdant Encore (boss) | Large diamond | 6 interleaved geometric petals (ellipses radiating from center) |

### Glow Effect

Rendered as a **separate pass behind** the enemy shape (not a stroke):
- **Elite**: 6px blur radius, 70% opacity, color = enemy color
- **Boss**: 10px blur radius, 85% opacity, color = enemy color
- Elite glow colors: Red `#FF5555`, Green `#55E870`, Blue `#5588FF`
- Boss glow colors: Red `#FF7070`, Green `#70FF90`, Blue `#70A0FF`

### Idle Animation

A subtle synchronized pulse on both glow opacity and shape scale:
- Glow opacity: ±15% over 1.5s, sine wave
- Scale: ±3% over 1.5s, sine wave, 0.25s phase offset from glow pulse
- Applies to all special enemies (elite and boss), same animation parameters

### Ordinary Enemy Shapes

| Archetype | Shape | Notes |
|-----------|-------|-------|
| basic | Circle | Default |
| fast | Diamond | Rotated square (45°) |
| tank | Hexagon | Larger, conveys toughness |
| swarm | Small triangle | Points downward |

Ordinary enemies: color fill with subtle gradient (darker edges, brighter center), NO glow.

### Scale in Combat

- Elite enemies: 1.3× normal enemy size
- Boss enemies: 1.6× normal enemy size
- Ordinary enemies: standard size (from `CombatVisualConfig`)

## In Scope

- Read `silhouetteMotif` and `isSpecial` from `CombatEnemyRuntime` (populated from enemy definition)
- Implement 6 silhouette motif drawing functions using Phaser Graphics
- Add glow rendering pass behind special enemy shapes (using Graphics with alpha/blend mode or a separate game object)
- Implement idle pulse animation (Phaser tween on glow alpha and shape scale)
- Update ordinary enemy shape rendering to use archetype-appropriate shapes
- Apply scale multipliers for elite (1.3×) and boss (1.6×)
- Apply enemy-specific fill colors from the palette reference

## Out of Scope

- New sprite assets (this uses geometry-only rendering)
- Enemy death animations
- Hit flash (existing `CombatEnemyHitFlashRenderer` works independently)
- Lobby/wave preview rendering of these motifs (tasks 15–16 — those use the same `SpecialEnemyCard` component which currently has placeholders; this task makes the visual available for them to call into)

## Detailed Requirements

### Silhouette Motif Drawing

Each motif is a function that takes a `Phaser.GameObjects.Graphics` and draws ornamentation around a core shape:

```ts
function drawSilhouetteMotif(
  graphics: Phaser.GameObjects.Graphics,
  motif: string,
  centerX: number,
  centerY: number,
  baseRadius: number,
  color: number,
): void;
```

**Motif implementations:**

1. **`chevron-armor`** (Iron Kick):
   - Draw hexagon core (60px radius)
   - Four chevrons (^ shapes) at 0°, 90°, 180°, 270°, offset by 70px from center
   - Each chevron: two lines forming a V pointing outward

2. **`satellite-motes`** (Static Choir):
   - Draw triangle cluster core (3 small triangles in a group, 40px radius)
   - 4–6 orbiting small triangles at radius 55px, evenly spaced
   - Orbit animation handled by idle pulse (rotation tween optional)

3. **`motion-trails`** (Backstage Blur):
   - Draw diamond core (50px radius)
   - 2–3 horizontal streak lines behind the diamond (offset -15px to -30px), each fading in alpha

4. **`crown-ring`** (Redline Headliner):
   - Draw large hexagon core (75px radius)
   - One concentric hexagon ring at 90px (stroke only, dashed or lower alpha)
   - Three small triangles at top (crown), centered at 12 o'clock, offset by 85px

5. **`ring-wave`** (Blue Noise Monarch):
   - Draw large triangle-cluster core (60px)
   - 2 concentric circle rings at radius 75px and 90px (stroke only, alpha fading outward)
   - 6 orbiting motes (small circles) at radius 70px

6. **`geometric-petals`** (Verdant Encore):
   - Draw large diamond core (65px radius)
   - 6 ellipses (or elongated shapes) radiating from center at 60° intervals
   - Each ellipse: 20px wide, 55px long, oriented radially

### Glow Rendering

For enemies with `isSpecial === true`:
1. Determine glow color from enemy color + elite/boss subtype:
   - Red elite: `#FF5555`, Red boss: `#FF7070`
   - Green elite: `#55E870`, Green boss: `#70FF90`
   - Blue elite: `#5588FF`, Blue boss: `#70A0FF`
2. Draw a larger version of the core shape behind the enemy with:
   - Fill in glow color
   - Alpha at 70% (elite) or 85% (boss)
   - Blur simulated by drawing multiple concentric shapes with decreasing alpha, OR use a Phaser render texture with blur, OR use a simple larger semi-transparent shape

**Simple glow approach** (recommended): Draw 2–3 concentric shapes behind the enemy, each slightly larger and more transparent:
- Inner: 1.15× radius, alpha 0.5
- Mid: 1.3× radius, alpha 0.25
- Outer: 1.5× radius, alpha 0.1

This creates a soft glow without needing render-to-texture blur.

### Idle Pulse Animation

On enemy creation (in `CombatEnemyPresenter`), add two tweens:
```ts
// Glow alpha pulse
scene.tweens.add({
  targets: glowGraphics,
  alpha: { from: baseAlpha, to: baseAlpha * 0.85 },
  duration: 750,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
});

// Scale pulse (with phase offset)
scene.tweens.add({
  targets: enemyContainer,
  scaleX: { from: baseScale, to: baseScale * 1.03 },
  scaleY: { from: baseScale, to: baseScale * 1.03 },
  duration: 750,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
  delay: 375, // 0.25s phase offset = half of 750ms
});
```

### Ordinary Enemy Shapes

In the enemy presenter, when `isSpecial !== true`:
- `archetype === 'basic'` → circle
- `archetype === 'fast'` → diamond (square rotated 45°)
- `archetype === 'tank'` → hexagon
- `archetype === 'swarm'` → small downward-pointing triangle

Fill with enemy's color (`CombatVisualConfig` has color mappings or use the palette ref). Apply subtle gradient: darker at edges, brighter at center (can be simulated with a radial gradient fill if Phaser Graphics supports it, or just use solid color).

### Scale

- Elite (`archetype === 'elite'`): multiply shape radius by 1.3
- Boss (`archetype === 'boss'`): multiply shape radius by 1.6
- Ordinary: standard radius

### Color Palette

| Role | Red | Green | Blue |
|------|-----|-------|------|
| Ordinary fill | `#E03C3C` | `#3CC850` | `#3C64DC` |
| Elite glow | `#FF5555` | `#55E870` | `#5588FF` |
| Boss glow | `#FF7070` | `#70FF90` | `#70A0FF` |

## Acceptance Criteria

- [ ] 6 special enemies each have visible silhouette ornaments in combat
- [ ] Elite enemies have a colored outline glow (6px-equivalent, 70% opacity)
- [ ] Boss enemies have a thicker colored outline glow (10px-equivalent, 85% opacity)
- [ ] Special enemies pulse subtly (glow ±15%, scale ±3% over 1.5s)
- [ ] Ordinary enemies render with correct shape per archetype:
  - [ ] basic → circle
  - [ ] fast → diamond
  - [ ] tank → hexagon
  - [ ] swarm → small triangle
- [ ] Ordinary enemies have no glow effect
- [ ] Elite enemies visually larger than ordinary (1.3×)
- [ ] Boss enemies visually larger than elite (1.6×)
- [ ] Colors match the palette reference
- [ ] Performance: 20+ enemies on screen with glow don't drop below 30 FPS
- [ ] `npx tsc --noEmit` passes

## Technical Notes

- The `CombatEnemyPresenter` (in `src/scenes/combat/presentation/CombatEnemyPresenter.ts`) creates and updates enemy visuals. It currently uses `CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X/Y` for positioning and likely draws simple shapes.
- Read `CombatEnemyRuntime.color` to get the enemy's color, `CombatEnemyRuntime.archetype` for shape, and `CombatEnemyRuntime.isSpecial` for glow/pulse.
- The `silhouetteMotif` field comes from the enemy definition. It's available in the runtime via `CombatEnemyRuntime` or needs to be looked up from the definition. Check if `CombatEnemyRuntime` carries `silhouetteMotif` — if not, add it (or look up from `CombatContentConfig` by `definitionId`).
- Glow rendering approach: Phaser Graphics doesn't have native blur. The multi-layered concentric shape approach is the simplest and most performant. For a more authentic glow, consider using a `Phaser.GameObjects.RenderTexture` with the enemy shape drawn on it, but that's complex and may affect performance.
- The idle pulse animation should pause when combat is paused. Check how existing animations handle combat pause in the presenter.
- The `CombatRenderModel` (in `src/combat/CombatRenderModel.ts`) may define enemy visual properties. Check before adding visual logic to the presenter.

## Implementation Plan

1. Read `CombatEnemyPresenter.ts` — understand current enemy rendering
2. Read `CombatRenderModel.ts` — understand visual property storage
3. Add `silhouetteMotif` and `isSpecial` fields to `CombatEnemyRuntime` if missing (or look up from definitions)
4. Create `src/combat/presentation/EnemySilhouetteRenderer.ts` (or add to `CombatEnemyPresenter`):
   - `drawSilhouetteMotif()` function
   - Glow rendering helper
   - Shape selection per archetype
5. Update enemy creation in `CombatEnemyPresenter` to:
   - Choose core shape based on archetype
   - Draw silhouette motif if `isSpecial`
   - Add glow pass for special enemies
   - Add idle pulse tweens for special enemies
   - Apply scale multipliers
6. Apply color palette from the spec
7. Test in combat: spawn an elite wave (wave 5 of any stage) and verify glow + motif visible
8. Test performance with many enemies (wave 9 of Stage 2 — 23 enemies)
9. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 03-task-special-enemies (needs `silhouetteMotif` and `isSpecial` fields on enemy definitions)
- Blocked by 09-task-combat-integration (needs combat to receive and render the new enemy types)

## Type

HITL

## Design Spec Reference

- [Enemy Silhouette Motifs](../design-spec.md#enemy-silhouette-motifs)
- [Glow](../design-spec.md#enemy-silhouette-motifs) (glow specs are within silhouette section)
- [Idle animation](../design-spec.md#enemy-silhouette-motifs)
- [Scale in lobby vs combat](../design-spec.md#enemy-silhouette-motifs)
- [Ordinary Enemy Visual Differentiation](../design-spec.md#ordinary-enemy-visual-differentiation)
- [Color Palette Reference](../design-spec.md#color-palette-reference)
