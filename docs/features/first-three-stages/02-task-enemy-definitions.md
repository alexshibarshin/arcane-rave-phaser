# Enemy Definitions and Archetype Differentiation

## Task Intent

Replace the flat, identical-stat enemy definitions in `CombatContentConfig` with archetype-differentiated templates. Create a new `EnemyDefinitions.ts` module with `ENEMY_ARCHETYPE_TEMPLATES` (basic, fast, tank, swarm — each with unique HP, speed, damage, cooldown values) and a `createEnemy()` factory function. Remove all ranged enemy entries. Update `CombatBalanceConfig` to remove the flat `ENEMY_MAX_HP` constant (stats are now per-archetype).

After this task, ordinary enemies in combat will have noticeably different stats: tanks are slower and tougher, fast enemies are quick but fragile, swarms are numerous but weak. This is the foundation that makes authored wave design meaningful.

## Relevant Context

The current `CombatContentConfig.ENEMY_DEFINITIONS` defines 18 enemies (3 colors × 6 archetypes: basic, tank, fast, ranged, swarm, boss), all using the same `CombatBalanceConfig.ENEMY_MAX_HP`, `ENEMY_MOVE_SPEED_PX_PER_SEC`, etc. This makes every enemy feel identical.

The new archetype stat templates from the design spec:

| Archetype | HP | Speed | Attack Damage | Attack Cooldown |
|-----------|-----|-------|---------------|-----------------|
| basic | 1.0x (100) | 1.0x (40 px/s) | 2 | 1500 ms |
| fast | 0.65x (65) | 1.55x (62 px/s) | 2 | 1100 ms |
| tank | 2.6x (260) | 0.7x (28 px/s) | 4 | 2200 ms |
| swarm | 0.4x (40) | 1.25x (50 px/s) | 1 | 1800 ms |

All share `attackRangePx: 370`. Base HP of basic = 100 is calibrated so that `Ruby Needle` (50 damage, tier 1) kills a basic enemy in exactly 2 activations.

Ranged enemies are **removed from active content** entirely — they need projectile VFX to read correctly which is deferred. The `enemy-*-ranged` and `enemy-*-boss` entries are deleted (bosses become special enemies in task 03).

## In Scope

- Create `src/config/EnemyDefinitions.ts` with `ENEMY_ARCHETYPE_TEMPLATES`
- Implement `createEnemy(archetype, color): CombatEnemyDefinition` factory
- Replace all ordinary enemy definitions in `CombatContentConfig.ENEMY_DEFINITIONS` (3 colors × 4 archetypes = 12 ordinary enemies)
- Remove ranged enemies (`enemy-red-ranged`, `enemy-green-ranged`, `enemy-blue-ranged`)
- Remove old boss enemies (`enemy-red-boss`, `enemy-green-boss`, `enemy-blue-boss`) — bosses become special enemies in task 03
- Remove `ENEMY_MAX_HP` and other flat enemy stat constants from `CombatBalanceConfig`
- Update `combatContentConfig.ENEMY_DEFINITIONS` to import from `EnemyDefinitions`
- Update any validation code that references the old enemy count or IDs

## Out of Scope

- Special enemies (elite and boss — task 03)
- Combat integration with pre-scaled HP from payload (task 09)
- Enemy visual rendering changes (task 17)
- Modifying `CombatWaveConfig` test waves (they still reference old enemy IDs — task 19 handles test cleanup)
- Changing `CombatEnemyRuntimeFactory` to accept payload enemies (task 09)

## Detailed Requirements

### EnemyDefinitions Module

```ts
export const ENEMY_ARCHETYPE_TEMPLATES = {
  basic: { hp: 100, speed: 40, range: 370, cooldown: 1500, damage: 2 },
  fast:  { hp: 65,  speed: 62, range: 370, cooldown: 1100, damage: 2 },
  tank:  { hp: 260, speed: 28, range: 370, cooldown: 2200, damage: 4 },
  swarm: { hp: 40,  speed: 50, range: 370, cooldown: 1800, damage: 1 },
} as const;

export function createEnemy(
  archetype: keyof typeof ENEMY_ARCHETYPE_TEMPLATES,
  color: NoteColor,
): CombatEnemyDefinition;
```

The `createEnemy` function generates IDs like `enemy-red-basic`, `enemy-green-fast`, etc., following the existing naming convention. It reads stats from the template and assigns `visualKey` values like `enemy-basic-red`, `enemy-fast-green`, etc.

### CombatBalanceConfig Changes

Remove these constants (they are now per-archetype):
- `ENEMY_MAX_HP`
- `ENEMY_MOVE_SPEED_PX_PER_SEC`
- `ENEMY_ATTACK_RANGE_PX` (keep if used elsewhere, but enemy range is now per-template)
- `ENEMY_ATTACK_COOLDOWN_MS`
- `ENEMY_ATTACK_DAMAGE`

Keep `ENEMY_SPAWN_MIN_GAP_PX` and `ENEMY_SPAWN_ATTEMPTS` (spawn system params, not per-enemy).

### CombatContentConfig.ENEMY_DEFINITIONS

Replace the inline array of 18 definitions with:

```ts
ENEMY_DEFINITIONS: [
  // 3 colors × 4 archetypes = 12 ordinary enemies
  ...(['red', 'green', 'blue'] as NoteColor[]).flatMap(color =>
    (['basic', 'fast', 'tank', 'swarm'] as const).map(archetype =>
      createEnemy(archetype, color)
    )
  ),
  // Special enemies added in task 03
] satisfies CombatEnemyDefinition[]
```

### Visual Keys

Ordinary enemies use shape assignments (visual differentiation happens in task 17, but the `visualKey` string should be set correctly now):
- basic → circle shape
- fast → diamond shape
- tank → hexagon shape
- swarm → small triangle shape

The `visualKey` format follows existing pattern: `enemy-{archetype}-{color}`.

## Acceptance Criteria

- [ ] `EnemyDefinitions.ts` exports `ENEMY_ARCHETYPE_TEMPLATES` and `createEnemy`
- [ ] `CombatContentConfig.ENEMY_DEFINITIONS` contains exactly 12 ordinary enemy definitions (3 colors × 4 archetypes)
- [ ] No ranged enemy definitions remain (`enemy-*-ranged`)
- [ ] No old boss definitions remain (`enemy-*-boss`)
- [ ] `CombatBalanceConfig` no longer has flat `ENEMY_MAX_HP` and related per-enemy stats
- [ ] `npx tsc --noEmit` passes
- [ ] Config validation (`validateCombatContentConfig`) still passes
- [ ] Ordinary enemies have visibly different stats when inspected (tank HP = 260, fast HP = 65, etc.)

## Technical Notes

- `CombatEnemyDefinition` has an `archetype` field (string). The archetype value should match the template key: `'basic'`, `'fast'`, `'tank'`, `'swarm'`. Special enemies (task 03) will use `'elite'` and `'boss'`.
- The `CombatWaveConfig` test waves reference enemy IDs like `enemy-red-basic`, `enemy-red-ranged`, `enemy-red-boss`. After ranged and boss removal, the test waves will have invalid references. This is expected — task 19 (test cleanup) will fix them. To keep tests compiling, you may need to update the test wave configs minimally or mark them for later fix.
- `visualKey` is used by the combat renderer to know what shape to draw. The renderer maps visualKey to shape logic. Don't change the visualKey format unless you also update the renderer. For now, keep the existing format.
- This task touches `CombatBalanceConfig` which is imported broadly. Be surgical — only remove enemy-specific stats, don't touch combat balance numbers that are still in use (`BASE_HP`, `PAWN_TIER_DAMAGE_MULTIPLIER`, etc.).

## Implementation Plan

1. Create `src/config/EnemyDefinitions.ts` with templates and `createEnemy` factory
2. In `CombatBalanceConfig.ts`, comment out or remove: `ENEMY_MAX_HP`, `ENEMY_MOVE_SPEED_PX_PER_SEC`, `ENEMY_ATTACK_RANGE_PX`, `ENEMY_ATTACK_COOLDOWN_MS`, `ENEMY_ATTACK_DAMAGE`
3. In `CombatContentConfig.ts`, replace the `ENEMY_DEFINITIONS` array with the archetype-based generation using `createEnemy`. Import from `EnemyDefinitions`.
4. Update `CombatWaveConfig.ts` test waves to remove references to `enemy-*-ranged` and `enemy-*-boss` enemies (replace with basic/fast/tank/swarm equivalents)
5. Run `npx tsc --noEmit` and fix any compilation errors from removed `CombatBalanceConfig` fields
6. Run config validation to confirm it still passes

## Blocked By

- Blocked by 01-task-config-types-and-registry (needs `StageConfig` types to be in place for context, but technically this task is mostly independent)

## Type

AFK

## Design Spec Reference

- [Archetype Stat Templates](../design-spec.md#archetype-stat-templates-relative-to-basic)
- [EnemyDefinitions Contract](../design-spec.md#enemydefinitions-contract)
- [Ranged enemies removed](../design-spec.md#special-enemies-6-total--3-elite-3-boss)
- [Ordinary Enemy Visual Differentiation](../design-spec.md#ordinary-enemy-visual-differentiation)
