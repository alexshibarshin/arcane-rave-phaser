# Special Enemy Definitions

## Task Intent

Define 6 special enemies (3 elite, 3 boss) with explicit inline stats, display names, visual identities, and special flags. These are authored as separate `CombatEnemyDefinition` entries — not derived from archetype templates — because their stats are hand-tuned for dramatic encounters. Add them to `CombatContentConfig.ENEMY_DEFINITIONS`.

After this task, all enemy IDs referenced by stage wave configs (tasks 10–12) will exist and resolve correctly.

## Relevant Context

Special enemies are the centerpiece encounters in waves 5 (elite) and 10 (boss). They anchor the dramatic arc of each stage. Each special enemy has:

- **Explicit stats**: not templated, but mentally designed as multipliers over parent archetype:
  - Elite HP: ~2.5–3.5× parent archetype
  - Elite damage: 5
  - Boss HP: ~5–6× parent archetype  
  - Boss damage: 8
- **A silhouette motif**: geometric ornamentation that makes them visually distinct (rendered in task 17)
- **`isSpecial: true`**: flag used by combat to enable glow effects and special rendering

The 6 special enemies:

| ID | Name | Color | Role | Stage | Parent Archetype |
|----|------|-------|------|-------|-----------------|
| `iron-kick` | Iron Kick | red | elite tank | Stage 1 | tank |
| `static-choir` | Static Choir | blue | elite swarm leader | Stage 2 | swarm |
| `backstage-blur` | Backstage Blur | green | elite fast bruiser | Stage 3 | fast |
| `redline-headliner` | Redline Headliner | red | boss | Stage 1 | tank |
| `blue-noise-monarch` | Blue Noise Monarch | blue | boss | Stage 2 | swarm |
| `verdant-encore` | Verdant Encore | green | boss | Stage 3 | fast |

## In Scope

- Define 6 special enemy objects with complete `CombatEnemyDefinition` fields
- Add `displayName`, `silhouetteMotif`, `isSpecial` fields to `CombatEnemyDefinition` (or extend it)
- Add special enemies to `CombatContentConfig.ENEMY_DEFINITIONS`
- Set appropriate archetype values (`'elite'` / `'boss'`)
- Set `visualKey` values that the renderer can key off for silhouette motifs

## Out of Scope

- Rendering silhouette motifs or glow effects (task 17)
- Idle animations for special enemies (task 17)
- Wave configs that reference these enemies (tasks 10–12)
- Lobby detail panel showing special enemies (task 15)
- Balancing HP/damage beyond the initial spec values (balance iteration is separate)

## Detailed Requirements

### CombatEnemyDefinition Extension

Add these optional fields:
```ts
displayName?: string;        // Human-readable name for UI (e.g. "Iron Kick")
silhouetteMotif?: string;    // Key for renderer: "chevron-armor", "satellite-motes", "motion-trails", "crown-ring", "ring-wave", "geometric-petals"
isSpecial?: boolean;         // true for elite/boss
```

### Special Enemy Definitions

#### Iron Kick (elite tank, red, Stage 1)
- `id: 'iron-kick'`
- `archetype: 'elite'`
- `color: 'red'`
- `maxHp: 700` (~2.7× tank's 260)
- `moveSpeedPxPerSec: 22` (slightly slower than tank's 28)
- `attackRangePx: 370`
- `attackCooldownMs: 2400` (slower attacks)
- `attackDamage: 5`
- `visualKey: 'enemy-elite-iron-kick'`
- `silhouetteMotif: 'chevron-armor'` — hexagon core + four outward-pointing chevrons
- `isSpecial: true`

#### Static Choir (elite swarm leader, blue, Stage 2)
- `id: 'static-choir'`
- `archetype: 'elite'`
- `color: 'blue'`
- `maxHp: 120` (~3× swarm's 40)
- `moveSpeedPxPerSec: 40` (slower than swarm's 50, anchors the flock)
- `attackRangePx: 370`
- `attackCooldownMs: 1600`
- `attackDamage: 5`
- `visualKey: 'enemy-elite-static-choir'`
- `silhouetteMotif: 'satellite-motes'` — triangle cluster core + orbiting smaller triangles
- `isSpecial: true`

#### Backstage Blur (elite fast bruiser, green, Stage 3)
- `id: 'backstage-blur'`
- `archetype: 'elite'`
- `color: 'green'`
- `maxHp: 200` (~3.1× fast's 65)
- `moveSpeedPxPerSec: 56` (slightly slower than fast's 62)
- `attackRangePx: 370`
- `attackCooldownMs: 1000` (faster attacks)
- `attackDamage: 5`
- `visualKey: 'enemy-elite-backstage-blur'`
- `silhouetteMotif: 'motion-trails'` — diamond core + 2–3 thin streak lines
- `isSpecial: true`

#### Redline Headliner (boss, red, Stage 1)
- `id: 'redline-headliner'`
- `archetype: 'boss'`
- `color: 'red'`
- `maxHp: 1400` (~5.4× tank)
- `moveSpeedPxPerSec: 24`
- `attackRangePx: 370`
- `attackCooldownMs: 2000`
- `attackDamage: 8`
- `visualKey: 'enemy-boss-redline-headliner'`
- `silhouetteMotif: 'crown-ring'` — large hexagon + concentric ring pulse + crown ornament (3 triangles on top)
- `isSpecial: true`

#### Blue Noise Monarch (boss, blue, Stage 2)
- `id: 'blue-noise-monarch'`
- `archetype: 'boss'`
- `color: 'blue'`
- `maxHp: 220` (~5.5× swarm)
- `moveSpeedPxPerSec: 44`
- `attackRangePx: 370`
- `attackCooldownMs: 1600`
- `attackDamage: 8`
- `visualKey: 'enemy-boss-blue-noise-monarch'`
- `silhouetteMotif: 'ring-wave'` — large triangle-cluster + expanding ring wave + orbiting motes
- `isSpecial: true`

#### Verdant Encore (boss, green, Stage 3)
- `id: 'verdant-encore'`
- `archetype: 'boss'`
- `color: 'green'`
- `maxHp: 380` (~5.8× fast)
- `moveSpeedPxPerSec: 54`
- `attackRangePx: 370`
- `attackCooldownMs: 950` (fast attacks)
- `attackDamage: 8`
- `visualKey: 'enemy-boss-verdant-encore'`
- `silhouetteMotif: 'geometric-petals'` — large diamond + 6 interleaved ellipses radiating from center
- `isSpecial: true`

### Display Names

Used in lobby detail panel, wave preview special enemy cards, and potentially in combat HUD. The `displayName` field should be set for all 6.

## Acceptance Criteria

- [ ] `CombatEnemyDefinition` has (or is extended with) `displayName`, `silhouetteMotif`, `isSpecial` fields (all optional to preserve backward compat)
- [ ] All 6 special enemies are defined in `EnemyDefinitions.ts` (or inline in `CombatContentConfig` — whichever architecture task 02 established)
- [ ] `CombatContentConfig.ENEMY_DEFINITIONS` includes all 6 special enemies (total: 12 ordinary + 6 special = 18)
- [ ] Each special enemy has correct `archetype` value (`'elite'` or `'boss'`)
- [ ] HP values are approximately correct per the spec (exact tuning may change)
- [ ] `npx tsc --noEmit` passes
- [ ] Config validation passes

## Technical Notes

- The `archetype` field is a string — adding `'elite'` and `'boss'` as new values is fine since the type is just `string`. If there's validation that restricts archetype values, update it.
- `silhouetteMotif` is a rendering hint — the actual rendering logic is in task 17. For now, it's just a string that future code can switch on.
- The `visualKey` values follow the pattern `enemy-{elite|boss}-{kebab-name}`. The renderer may need these keys registered, but that's task 17.
- Special enemy stats may need adjustment after playtesting. The current numbers are initial values from the design spec.
- Consider creating a helper like `createSpecialEnemy(config)` to reduce boilerplate and ensure consistency across all 6 definitions.

## Implementation Plan

1. Add `displayName?`, `silhouetteMotif?`, `isSpecial?` fields to `CombatEnemyDefinition` interface in `CombatContentConfig.ts`
2. In `EnemyDefinitions.ts` (or wherever task 02 put enemy definitions), define 6 special enemy objects with the stats above
3. Export them and add to `CombatContentConfig.ENEMY_DEFINITIONS` array
4. Run `npx tsc --noEmit` and fix type errors
5. Verify that `find(e => e.id === 'iron-kick')` returns the correct definition

## Blocked By

- Blocked by 02-task-enemy-definitions (needs `ENEMY_ARCHETYPE_TEMPLATES` architecture and the `CombatEnemyDefinition` type to be in place)

## Type

AFK

## Design Spec Reference

- [Special Enemies](../design-spec.md#special-enemies-6-total--3-elite-3-boss)
- [Enemy Silhouette Motifs](../design-spec.md#enemy-silhouette-motifs)
- [EnemyDefinitions Contract](../design-spec.md#enemydefinitions-contract)
- [Color Palette Reference](../design-spec.md#color-palette-reference)
