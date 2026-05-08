# Stage 3 — Greenroom Collapse Config

## Task Intent

Create the complete stage config for **Greenroom Collapse** — the third and hardest playable stage. This is the "mixed" stage that alternates between single-target and crowd pressure, uses all four archetypes, and demands an adaptable build. All 10 waves with explicit sub-wave composition, HP multipliers, tags, and special enemy references.

## Relevant Context

Greenroom Collapse is the full system stress test. It has the longest waves (6 sub-waves for the boss), the highest HP multipliers, all four archetypes, and frequent off-color swings to prevent monochrome builds.

### Stage Identity
- **Display Name**: `Greenroom Collapse`
- **Stage ID**: `greenroom-collapse`
- **Tags**: `['Green', 'Mixed', 'Fast']`
- **Dominant Color**: Green (~70% of enemies)
- **Archetypes Available**: basic, fast, tank, swarm (all four)
- **Slot Modifiers**: 3, full pool
- **Elite (Wave 5)**: `backstage-blur` — Backstage Blur (green elite fast bruiser)
- **Boss (Wave 10)**: `verdant-encore` — Verdant Encore (green boss)
- **Total Waves**: 10
- **Total Enemies**: ~123
- **Total Sub-Waves**: 42

### HP Multipliers
```ts
hpMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0, 2.35, 2.75, 3.2, 3.6, 4.1]
```

### Slot Modifier Config
```ts
slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 }
// No weight overrides — uses default weights for all 9 modifiers
```

### Wave Plan

| Wave | Kind | Tags | Special Enemy | Sub-Waves |
|------|------|------|---------------|-----------|
| 1 | normal | `Green`, `Mixed`, `Fast` | — | 3 |
| 2 | normal | `Red`, `Single-Target`, `Tanky` | — | 4 |
| 3 | normal | `Blue`, `Crowd`, `Swarm` | — | 3 |
| 4 | normal | `Green`, `Mixed`, `Fast` | — | 4 |
| 5 | elite | `Green`, `Elite`, `Mixed` | `backstage-blur` | 4 |
| 6 | normal | `Red`, `Mixed`, `Crowd` | — | 3 |
| 7 | normal | `Green`, `Single-Target`, `Fast` | — | 5 |
| 8 | normal | `Blue`, `Crowd`, `Mixed` | — | 5 |
| 9 | normal | `Green`, `Mixed`, `Tanky` | — | 5 |
| 10 | boss | `Green`, `Boss`, `Mixed` | `verdant-encore` | 6 |

## In Scope

- Create `src/config/stages/GreenroomCollapse.ts`
- Export `greenroomCollapseConfig: StageConfig` with all 10 waves authored per the Design Spec tables
- Register in `StageRegistry`
- All sub-wave data from the Design Spec under **"Stage 3 — Greenroom Collapse"**
- Validate: 6 sub-waves for wave 10 (longest wave in the game), elite at wave 5, boss at wave 10

## Out of Scope

- Stage 1 or 2 configs
- Any rendering or UI
- Balance tuning beyond spec values

## Detailed Requirements

All sub-wave tables are in the Design Spec at:

**[Stage 3 — Greenroom Collapse (Green, Mixed, Fast)](#stage-3--greenroom-collapse-green-mixed-fast)**

Copy every sub-wave exactly from those tables. Key characteristics:
- Uses all four archetypes (basic, fast, tank, swarm) — the only stage that does
- Every third wave is an off-color palette cleanser (wave 2 = Red, wave 3 = Blue, wave 6 = Red, wave 8 = Blue)
- Wave 10 has 6 sub-waves — the longest wave, with the boss exiting at sub-wave 3 and off-color tanks in sub-waves 4–5
- Two tanks in waves 7 and 9 — the build must handle both single-target and crowd simultaneously
- Wave 4 introduces swarm for the first time in this stage
- Wave 8 has blue basic enemies anchoring the crowd — can't just splash them down

### Special Enemies
- Wave 5 sub-wave 2: `backstage-blur` ×1 + `enemy-green-fast` ×2 escort
- Wave 10 sub-wave 3: `verdant-encore` ×1 alone (escort: sub-wave 1–2 before, 4–6 after, including off-color tanks at sub-waves 4–5)

### Stage Config Object
```ts
export const greenroomCollapseConfig: StageConfig = {
  id: 'greenroom-collapse',
  displayName: 'Greenroom Collapse',
  stageTags: ['Green', 'Mixed', 'Fast'],
  eliteEnemyId: 'backstage-blur',
  bossEnemyId: 'verdant-encore',
  totalWaves: 10,
  hpMultipliers: [1.0, 1.2, 1.4, 1.7, 2.0, 2.35, 2.75, 3.2, 3.6, 4.1],
  slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 },
  waves: [
    // ... all 10 waves from Design Spec tables
  ],
};
```

## Acceptance Criteria

- [ ] `greenroomCollapseConfig` is a valid `StageConfig`
- [ ] 10 waves, 42 total sub-waves
- [ ] ~123 total enemies across all waves
- [ ] All four archetypes (basic, fast, tank, swarm) appear at least once
- [ ] Wave 5: `kind: 'elite'`, `specialEnemyId: 'backstage-blur'`
- [ ] Wave 10: `kind: 'boss'`, `specialEnemyId: 'verdant-encore'`, 6 sub-waves
- [ ] `hpMultipliers` length 10, monotonically non-decreasing, last value 4.1 (highest in game)
- [ ] Registered in `StageRegistry`, retrievable via `getStageConfig('greenroom-collapse')`
- [ ] `npx tsc --noEmit` passes

## Technical Notes

Same pattern as tasks 10–11. This is the most complex stage config due to:
- 6 sub-waves on wave 10 (the only wave with this many)
- Highest HP multipliers (4.1× at wave 10)
- All four archetypes present
- Tank + swarm combinations in the same wave (waves 4, 9, 10)

The `slotModifierCountWeights: {0:0, 1:0, 2:0, 3:1}` guarantees exactly 3 modifiers every run.

## Implementation Plan

1. Create `src/config/stages/GreenroomCollapse.ts`
2. Copy wave/sub-wave data from the Design Spec
3. Import and register in `StageRegistry.ts`
4. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 01-task-config-types-and-registry
- Blocked by 02-task-enemy-definitions
- Blocked by 03-task-special-enemies (needs `backstage-blur`, `verdant-encore`)

## Type

AFK

## Design Spec Reference

- [Stage 3 — Greenroom Collapse](../design-spec.md#stage-3--greenroom-collapse-green-mixed-fast)
- All 10 wave sub-wave tables in the Design Spec
- [Summary tables](../design-spec.md#summary-enemy-count-by-stage)
