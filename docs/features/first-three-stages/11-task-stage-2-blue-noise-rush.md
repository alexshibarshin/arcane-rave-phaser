# Stage 2 — Blue Noise Rush Config

## Task Intent

Create the complete stage config for **Blue Noise Rush** — the second playable stage. This is a crowd/swarm-focused stage with high enemy density, fast tempo, and no tank archetype. All 10 waves with explicit sub-wave composition, HP multipliers, tags, and special enemy references.

## Relevant Context

Blue Noise Rush is the crowd-control stress test. It introduces swarm enemies and demands AOE throughput. The player's build must handle screen density without leaking enemies to the base.

### Stage Identity
- **Display Name**: `Blue Noise Rush`
- **Stage ID**: `blue-noise-rush`
- **Tags**: `['Blue', 'Crowd', 'Swarm']`
- **Dominant Color**: Blue (~70% of enemies)
- **Archetypes Available**: basic, fast, swarm (no tank)
- **Slot Modifiers**: 1–2, simple pool only
- **Elite (Wave 5)**: `static-choir` — Static Choir (blue elite swarm leader)
- **Boss (Wave 10)**: `blue-noise-monarch` — Blue Noise Monarch (blue boss)
- **Total Waves**: 10
- **Total Enemies**: ~150
- **Total Sub-Waves**: 40

### HP Multipliers
```ts
hpMultipliers: [1.0, 1.15, 1.35, 1.6, 1.9, 2.2, 2.55, 3.0, 3.45, 4.0]
```

### Slot Modifier Config
```ts
slotModifierCountWeights: { 0: 0, 1: 7, 2: 3, 3: 0 }
slotModifierWeightOverrides: {
  'plus-one-projectile': 12,
  'plus-fifty-aoe-radius': 12,
  'plus-one-output-note': 15,
  'plus-one-red-output-note': 10,
  'plus-one-green-output-note': 10,
  'plus-one-blue-output-note': 10,
  'double-activation': 0,
  'plus-two-output-notes': 0,
  'plus-one-extra-beam': 0,
}
```

### Wave Plan

| Wave | Kind | Tags | Special Enemy | Sub-Waves |
|------|------|------|---------------|-----------|
| 1 | normal | `Blue`, `Crowd`, `Swarm` | — | 3 |
| 2 | normal | `Red`, `Crowd`, `Fast` | — | 3 |
| 3 | normal | `Blue`, `Crowd`, `Swarm` | — | 4 |
| 4 | normal | `Green`, `Crowd`, `Mixed` | — | 4 |
| 5 | elite | `Blue`, `Elite`, `Crowd` | `static-choir` | 4 |
| 6 | normal | `Red`, `Crowd`, `Swarm` | — | 3 |
| 7 | normal | `Blue`, `Crowd`, `Fast` | — | 4 |
| 8 | normal | `Green`, `Crowd`, `Mixed` | — | 5 |
| 9 | normal | `Blue`, `Swarm`, `Crowd` | — | 5 |
| 10 | boss | `Blue`, `Boss`, `Crowd` | `blue-noise-monarch` | 5 |

## In Scope

- Create `src/config/stages/BlueNoiseRush.ts`
- Export `blueNoiseRushConfig: StageConfig` with all 10 waves authored per the Design Spec tables
- Register in `StageRegistry`
- All sub-wave data from the Design Spec under **"Stage 2 — Blue Noise Rush"**
- Validate enemy IDs, HP multiplier monotonicity, wave 5 = elite, wave 10 = boss

## Out of Scope

- Stage 1 or 3 configs
- Any rendering or UI
- Balance tuning beyond spec values

## Detailed Requirements

All sub-wave tables are in the Design Spec at:

**[Stage 2 — Blue Noise Rush (Blue, Crowd, Swarm)](#stage-2--blue-noise-rush-blue-crowd-swarm)**

Copy every sub-wave exactly from those tables. Key characteristics of this stage:
- Very high enemy counts (9–23 enemies per wave)
- Swarm enemies (`enemy-blue-swarm`, `enemy-red-swarm`, `enemy-green-swarm`) appear in large groups (3–5 per sub-wave)
- No tank enemies at all (blue-noise-rush has no tank archetype)
- Faster spawn intervals (500–700ms for swarm waves) to maintain pressure
- Green wave 4 and 8 include `enemy-green-basic` (medium HP) among swarm — pure AOE isn't a free pass
- Wave 9 (pre-boss) has 23 enemies — the highest non-boss enemy count in the game

### Special Enemies
- Wave 5 sub-wave 2: `static-choir` ×1 + `enemy-blue-swarm` ×3 escort
- Wave 10 sub-wave 3: `blue-noise-monarch` ×1 alone (escort follows in sub-waves 4–5)

## Acceptance Criteria

- [ ] `blueNoiseRushConfig` is a valid `StageConfig`
- [ ] 10 waves, 40 total sub-waves
- [ ] ~150 total enemies across all waves
- [ ] No tank enemies referenced anywhere (verify: grep for `tank` in the file returns nothing except maybe comments)
- [ ] Wave 5: `kind: 'elite'`, `specialEnemyId: 'static-choir'`
- [ ] Wave 10: `kind: 'boss'`, `specialEnemyId: 'blue-noise-monarch'`
- [ ] `hpMultipliers` length 10, monotonically non-decreasing
- [ ] Registered in `StageRegistry`, retrievable via `getStageConfig('blue-noise-rush')`
- [ ] `npx tsc --noEmit` passes

## Technical Notes

Same implementation pattern as task 10. Create the file in `src/config/stages/`, export the config object, register in `StageRegistry.ts`.

The swarm archetype (`enemy-*-swarm`) has HP 40 (base), speed 50, damage 1. At wave 10 with 4.0× multiplier, swarm enemies have 160 HP each. With 15+ swarm enemies in later waves, this demands serious AOE.

## Implementation Plan

1. Create `src/config/stages/BlueNoiseRush.ts`
2. Copy wave/sub-wave data from the Design Spec (10 waves × 3–5 sub-waves each)
3. Set `slotModifierCountWeights` and `slotModifierWeightOverrides` as specified
4. Import and register in `StageRegistry.ts`
5. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 01-task-config-types-and-registry
- Blocked by 02-task-enemy-definitions
- Blocked by 03-task-special-enemies (needs `static-choir`, `blue-noise-monarch`)

## Type

AFK

## Design Spec Reference

- [Stage 2 — Blue Noise Rush](../design-spec.md#stage-2--blue-noise-rush-blue-crowd-swarm)
- All 10 wave sub-wave tables in the Design Spec
- [Summary tables](../design-spec.md#summary-enemy-count-by-stage)
