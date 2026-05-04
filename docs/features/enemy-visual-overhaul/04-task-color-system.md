# 04 — Color System: Element Color Application

## Task Intent

Apply the element color system to the new archetype rendering. Each enemy has one of three element colors (red, green, blue). The color is applied as follows:

1. **Body fill**: The first body primitive (index 0) is filled with the accent color at full opacity (alpha 1.0)
2. **Outline**: All primitives have an outline in the same color at reduced alpha (~0.3-0.4)
3. **Head**: White/grey outline, no fill
4. **Eyes**: Two white dots inside the head

The color value comes from `enemy.body.color` in the render model, which is already mapped from `CombatVisualConfig.NOTE_COLORS[definition.color]` (e.g., `0xff5f7a` for red, `0x63f5a6` for green, `0x5db7ff` for blue).

This task makes all 18 enemy variants (6 archetypes × 3 colors) visually correct with their element colors.

## Relevant Context

The current rendering draws all enemies in a single color scheme: body fill at alpha 0.16, body stroke at alpha 0.95, head at white/grey, eyes at white. This is the "basic" visual that doesn't differentiate by element color.

After task 03, each archetype has its own render function. This task modifies those render functions to accept the enemy's element color and apply it according to the color system rules.

The render model provides:
- `enemy.body.color` — the accent color number (e.g., `0xff5f7a`)
- `enemy.body.family` — the archetype string (e.g., `'basic'`)
- `enemy.body.width` / `enemy.body.height` — scaled dimensions

## In Scope

1. Modify each archetype render function to accept a `color: number` parameter (already present in the signature from task 03)
2. Apply the accent color to the first body primitive (index 0) at full opacity
3. Apply muted outlines to all primitives
4. Keep head as white/grey outline, eyes as white dots

### Color application per archetype

**Basic** (rectangle torso + trapezoid shoulders):
- Torso (rectangle): `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- Shoulders (trapezoid): `lineStyle(accentColor, 0.35)` only (no fill, or fill at very low alpha)
- Head (circle): `lineStyle(0xe8fbff, 0.8)` (white/grey outline, no fill)
- Eyes (dots): `fillStyle(0xe8fbff, 0.95)`
- Limbs (lines): `lineStyle(0xe8fbff, 0.6)`

**Tank** (wide-rectangle armor + 2 short-rect legs):
- Armor (wide-rectangle): `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- Legs: `lineStyle(accentColor, 0.35)`
- Head (square): `lineStyle(0xe8fbff, 0.8)` (white/grey outline, no fill)
- Eyes: `fillStyle(0xe8fbff, 0.95)`

**Fast** (oval body + V-shape stabilizers):
- Body (oval): `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- Stabilizers (V-shape): `lineStyle(accentColor, 0.35)`
- Head (oval): `lineStyle(0xe8fbff, 0.8)` (white/grey outline, no fill)
- Eyes: `fillStyle(0xe8fbff, 0.95)`

**Ranged** (hexagon body + thin-rectangle antenna):
- Body (hexagon): `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- Antenna (thin-rectangle): `lineStyle(accentColor, 0.35)`
- Head (semicircle): `lineStyle(0xe8fbff, 0.8)` (white/grey outline, no fill)
- Eyes: `fillStyle(0xe8fbff, 0.95)`

**Swarm** (capsule body + 2 short legs):
- Body (capsule): `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- Legs: `lineStyle(accentColor, 0.35)`
- Head (diamond): `lineStyle(0xe8fbff, 0.8)` (white/grey outline, no fill)
- Eyes: `fillStyle(0xe8fbff, 0.95)`

**Boss** (rectangle + trapezoid + crown):
- Torso (rectangle): `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- Shoulders (trapezoid): `lineStyle(accentColor, 0.35)`
- Crown: `lineStyle(accentColor, 0.35)`
- Head (triangle): `lineStyle(0xe8fbff, 0.8)` (white/grey outline, no fill)
- Horns: `lineStyle(0xe8fbff, 0.8)`
- Eyes: `fillStyle(0xe8fbff, 0.95)`

### Unified rule

The accent color is applied consistently:
- **First primitive (index 0)**: `fillStyle(accentColor, 1.0)` + `lineStyle(accentColor, 0.35)`
- **Subsequent primitives**: `lineStyle(accentColor, 0.35)` only (no fill, or fill at very low alpha like 0.05)
- **Head**: `lineStyle(0xe8fbff, 0.8)` (white/grey outline)
- **Eyes**: `fillStyle(0xe8fbff, 0.95)`
- **Limbs/accessories**: `lineStyle(0xe8fbff, 0.6)` (white/grey)

## Out of Scope

- Changing the head/eye colors (they stay white/grey for all archetypes)
- Animation color changes (handled in task 07)
- HP bar color (handled in task 05)
- Damage numbers (handled in task 10)
- Test wave (handled in task 11)

## Detailed Requirements

1. Each archetype render function applies the accent color to the first body primitive at full opacity (alpha 1.0)
2. All primitives get outlines in the same accent color at alpha 0.3-0.4
3. Head stays white/grey outline, eyes stay white dots
4. The color parameter comes from `enemy.body.color` in the render model
5. Apply the color in `renderEnemyUnits()` when calling the archetype render function

### Call site in renderEnemyUnits()

```ts
// In renderEnemyUnits():
const body = this.add.graphics();
const archetype = enemy.body.family;
const color = enemy.body.color;
const bw = enemy.body.width;
const bh = enemy.body.height;

switch (archetype) {
  case 'basic': renderBasicEnemy(body, bw, bh, color); break;
  case 'tank': renderTankEnemy(body, bw, bh, color); break;
  // ... etc
  default: renderBasicEnemy(body, bw, bh, color); break;
}
```

## Acceptance Criteria

- [ ] Each archetype render function applies the accent color to the first body primitive at alpha 1.0
- [ ] All primitives have outlines in the accent color at alpha 0.3-0.4
- [ ] Head is white/grey outline, eyes are white dots (unchanged)
- [ ] All 18 enemy variants (6 archetypes × 3 colors) render with correct element colors
- [ ] Red enemies have reddish bodies, green have greenish, blue have blueish
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run test:run` passes (no visual tests exist yet, but no type errors)

## Technical Notes

- `enemy.body.color` is a Phaser color number (e.g., `0xff5f7a` for red)
- Phaser Graphics `fillStyle(color, alpha)` and `lineStyle(width, color, alpha)` are used
- The accent color is a "neon" color from `CombatVisualConfig.NOTE_COLORS` — these are already bright and saturated
- The muted outline at alpha 0.35 creates a subtle glow effect against the dark background
- Head/eye colors (`0xe8fbff` for head outline, `0xe8fbff` for eyes) provide contrast against any element color

## Implementation Plan

1. For each archetype render function, apply the accent color to the first primitive
2. Apply muted outline to all other primitives
3. Keep head/eye colors as white/grey
4. Update the call site in `renderEnemyUnits()` to pass `enemy.body.color`
5. Run `npx tsc --noEmit` to check for type errors
6. Run `npm run test:run` to confirm no regressions
7. Open the game in browser to visually verify all 18 enemy variants render with correct colors

## Additional Notes

**Why alpha 0.35 for outlines?** The spec says "reduced alpha (~0.3-0.4)". Alpha 0.35 provides a good balance — visible but not overpowering the filled primitive. Against the dark background, it creates a subtle neon glow effect.

**Why keep head white/grey?** The spec says "Head: White/grey outline, no fill". This is intentional — the head should be a neutral geometric shape that reads as a "mask" rather than an element-colored part.

## Blocked By

- Task 03 (archetype dispatch and render functions must exist)

## Type

AFK

## Design Spec Reference

- [Color System](../design-spec.md#color-system)
- [Content and Configuration](../design-spec.md#content-and-configuration)
