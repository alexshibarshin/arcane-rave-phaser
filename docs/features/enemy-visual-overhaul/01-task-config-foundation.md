# 01 — Config Foundation: Scale Multipliers, Primitive Definitions, Damage Number Config, New Enemy Definitions

## Task Intent

Add all new configuration data that the visual overhaul depends on. This task touches only config files — no game logic, no rendering code, no tests. The existing config validators (`validateCombatContentConfig` and `validateCombatWaveConfig`) will automatically validate the new data.

This is the data foundation for the entire feature. Every subsequent task reads from these config values.

## Relevant Context

The current codebase has:
- 3 enemy definitions (`enemy-red-basic`, `enemy-green-basic`, `enemy-blue-basic`) in `CombatContentConfig.ENEMY_DEFINITIONS`
- `CombatVisualConfig.ENEMY` with only `BODY_WIDTH: 31`, `BODY_HEIGHT: 36`, `HP_BAR_OFFSET_Y: -25`, `HP_BAR_WIDTH: 23`, `HP_BAR_HEIGHT: 4`, `HIT_FLASH_OFFSET_Y: -3`
- No `SCALE_MULTIPLIERS`, `HEAD_SHAPES`, `BODY_PRIMITIVES`, or `DAMAGE_NUMBER` config sections

All new enemies share the same stats (HP, speed, damage, cooldown) — only visual differentiation is the goal.

## In Scope

### CombatVisualConfig additions

Add these sections to `CombatVisualConfig`:

```ts
ENEMY: {
  BASE_BODY_WIDTH: 31,
  BASE_BODY_HEIGHT: 36,
  SCALE_MULTIPLIERS: {
    basic: 1.0,
    tank: 1.6,
    fast: 0.7,
    ranged: 1.1,
    swarm: 0.5,
    boss: 2.5,
  },
  HEAD_SHAPES: {
    basic: 'triangle',
    tank: 'square',
    fast: 'oval',
    ranged: 'semicircle',
    swarm: 'diamond',
    boss: 'triangle-horned',
  },
  BODY_PRIMITIVES: {
    basic: ['rectangle', 'trapezoid'],
    tank: ['wide-rectangle', 'short-rectangle', 'short-rectangle'],
    fast: ['oval', 'v-shape'],
    ranged: ['hexagon', 'thin-rectangle'],
    swarm: ['capsule', 'short-leg', 'short-leg'],
    boss: ['rectangle', 'trapezoid', 'crown'],
  },
  HP_BAR_OFFSET_Y: -25,
  HP_BAR_WIDTH: 23,
  HP_BAR_HEIGHT: 4,
  HIT_FLASH_OFFSET_Y: -3,
},
DAMAGE_NUMBER: {
  FONT_SIZE_PX: 14,
  FLOAT_DURATION_MS: 600,
  FLOAT_DISTANCE_Y: 30,
  BASE_OFFSET_X: 60,
  BASE_OFFSET_Y: -20,
  ENEMY_OFFSET_Y: -10,
},
```

**Important**: Keep the existing `ENEMY.BODY_WIDTH` and `ENEMY.BODY_HEIGHT` keys as aliases for `BASE_BODY_WIDTH` and `BASE_BODY_HEIGHT` respectively, to avoid breaking existing code that reads `CombatVisualConfig.ENEMY.BODY_WIDTH`.

### CombatContentConfig additions

Add 15 new enemy definitions to `CombatContentConfig.ENEMY_DEFINITIONS`:

```
enemy-red-tank, enemy-green-tank, enemy-blue-tank
enemy-red-fast, enemy-green-fast, enemy-blue-fast
enemy-red-ranged, enemy-green-ranged, enemy-blue-ranged
enemy-red-swarm, enemy-green-swarm, enemy-blue-swarm
enemy-red-boss, enemy-green-boss, enemy-blue-boss
```

Each follows the same structure as existing definitions:

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

Where `{archetype}` is one of `'tank' | 'fast' | 'ranged' | 'swarm' | 'boss'` and `{color}` is one of `'red' | 'green' | 'blue'`.

## Out of Scope

- Rendering code for new archetypes
- Animation code
- Damage number system
- Test wave
- Test updates (done inline in later tasks)
- Any changes to existing enemy behavior or stats

## Detailed Requirements

1. Add all config values exactly as specified above to `CombatVisualConfig`
2. Add all 15 enemy definitions to `CombatContentConfig.ENEMY_DEFINITIONS`
3. Keep `ENEMY.BODY_WIDTH` and `ENEMY.BODY_HEIGHT` as working aliases
4. All enemies use `CombatBalanceConfig` constants for stats (no hardcoded values)
5. The `satisfies CombatEnemyDefinition[]` type guard must still pass
6. The `validateCombatContentConfig()` call at the bottom of the file must still pass

## Acceptance Criteria

- [ ] `CombatVisualConfig` contains `ENEMY.SCALE_MULTIPLIERS` with all 6 archetypes
- [ ] `CombatVisualConfig` contains `ENEMY.HEAD_SHAPES` with all 6 archetypes
- [ ] `CombatVisualConfig` contains `ENEMY.BODY_PRIMITIVES` with all 6 archetypes
- [ ] `CombatVisualConfig` contains `DAMAGE_NUMBER` with all 5 config keys
- [ ] `ENEMY.BODY_WIDTH` and `ENEMY.BODY_HEIGHT` still exist and work
- [ ] 15 new enemy definitions added (3 colors × 5 new archetypes)
- [ ] All new definitions have valid `archetype`, `color`, and `visualKey`
- [ ] `validateCombatContentConfig()` passes at module load
- [ ] `validateCombatWaveConfig()` passes at module load
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes (existing tests still pass — no visual code changed)

## Technical Notes

- The existing `CombatEnemyDefinition` interface already has all needed fields — no interface changes
- The `validateCombatContentConfig()` function checks that enemy colors are in `NOTE_COLORS` — all new definitions use valid colors
- The `validateCombatWaveConfig()` function checks that wave sub-waves reference valid enemy IDs — not affected yet since no new wave is added
- Keep the `as const` assertion on the config object
- The `satisfies CombatContentConfigShape` type guard ensures all required fields are present

## Implementation Plan

1. Read `src/config/CombatVisualConfig.ts` and add the new config sections
2. Read `src/config/CombatContentConfig.ts` and add the 15 new enemy definitions
3. Run `npx tsc --noEmit` to check for type errors
4. Run `npm test` to confirm all existing tests still pass

## Additional Notes

**Tuning workflow for future**: If any archetype looks too big or too small, change only its `SCALE_MULTIPLIERS` value. The rendered size = `BASE_BODY_WIDTH × SCALE_MULTIPLIER`. No other code changes needed.

**Archetype scale reference**:

| Archetype | Scale | Approx. Width | Approx. Height |
|-----------|-------|---------------|----------------|
| Basic | 1.0× | 31px | 36px |
| Tank | 1.6× | ~50px | ~58px |
| Fast | 0.7× | ~22px | ~25px |
| Ranged | 1.1× | ~34px | ~40px |
| Swarm | 0.5× | ~16px | ~18px |
| Boss | 2.5× | ~78px | ~90px |

## Blocked By

None — can start immediately.

## Type

AFK

## Design Spec Reference

- [Enemy Archetypes](../design-spec.md#enemy-archetypes)
- [Color System](../design-spec.md#color-system)
- [Scale System](../design-spec.md#scale-system)
- [Config for Enemy Visuals](../design-spec.md#config-for-enemy-visuals)
- [New Enemy Definitions](../design-spec.md#new-enemy-definitions)
- [Content and Configuration](../design-spec.md#content-and-configuration)
