# Stage 1 — Redline Routine Config

## Task Intent

Create the complete stage config for **Redline Routine** — the first of three playable stages. This is a pure content-authoring task: all 10 waves with explicit sub-wave composition, HP multipliers, tags, and special enemy references. The config file plugs into `StageRegistry` and is immediately consumable by `StageRuntime` (after task 07) and `LobbyScene` (after task 14).

## Relevant Context

Redline Routine is the onboarding stage. It teaches basic build rhythm, color matchup, and reading basic/fast/tank pressure. It finishes with a single-target exam (boss wave 10).

### Stage Identity
- **Display Name**: `Redline Routine`
- **Stage ID**: `redline-routine` (kebab-case)
- **Tags**: `['Red', 'Single-Target', 'Tanky']`
- **Dominant Color**: Red (~70% of enemies)
- **Archetypes Available**: basic, fast, tank (no swarm)
- **Slot Modifiers**: Always 0
- **Elite (Wave 5)**: `iron-kick` — Iron Kick (red elite tank)
- **Boss (Wave 10)**: `redline-headliner` — Redline Headliner (red boss)
- **Total Waves**: 10

### HP Multipliers
```ts
hpMultipliers: [1.0, 1.1, 1.3, 1.5, 1.75, 2.05, 2.4, 2.8, 3.2, 3.7]
```

### Slot Modifier Config
```ts
slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 }
// No weight overrides
```

### Wave Plan

| Wave | Kind | Tags | Special Enemy | Sub-Waves |
|------|------|------|---------------|-----------|
| 1 | normal | `Red`, `Single-Target`, `Fast` | — | 3 |
| 2 | normal | `Green`, `Single-Target`, `Tanky` | — | 3 |
| 3 | normal | `Red`, `Tanky`, `Single-Target` | — | 4 |
| 4 | normal | `Blue`, `Mixed`, `Fast` | — | 4 |
| 5 | elite | `Red`, `Single-Target`, `Elite` | `iron-kick` | 4 |
| 6 | normal | `Green`, `Single-Target`, `Fast` | — | 3 |
| 7 | normal | `Red`, `Tanky`, `Single-Target` | — | 5 |
| 8 | normal | `Blue`, `Mixed`, `Fast` | — | 5 |
| 9 | normal | `Red`, `Tanky`, `Single-Target` | — | 5 |
| 10 | boss | `Red`, `Boss`, `Single-Target` | `redline-headliner` | 5 |

### Authored Sub-Wave Data

Every sub-wave has: `id`, `startTimeMs`, `spawnIntervalMs`, `enemies: Record<enemyId, count>`.

Full sub-wave tables are in the Design Spec under [Stage 1 — Redline Routine](#stage-1--redline-routine-red-single-target-tanky). **Reference the spec directly for the complete data.** Below is a summary of the total enemy composition and structure.

<details>
<summary>Wave 1 — Red, Single-Target, Fast (3 sub-waves, 7 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 1-a | wave-1-redline-1 | `enemy-red-basic` ×3 | 0 | 900 |
| 1-b | wave-1-redline-2 | `enemy-green-fast` ×2 | 3500 | 800 |
| 1-c | wave-1-redline-3 | `enemy-red-fast` ×2 | 6000 | 1000 |
</details>

<details>
<summary>Wave 2 — Green, Single-Target, Tanky (3 sub-waves, 6 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 2-a | wave-2-redline-1 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 0 | 900 |
| 2-b | wave-2-redline-2 | `enemy-red-basic` ×2 | 3000 | 1000 |
| 2-c | wave-2-redline-3 | `enemy-green-tank` ×1 | 5500 | 1200 |
</details>

<details>
<summary>Wave 3 — Red, Tanky, Single-Target (4 sub-waves, 8 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 3-a | wave-3-redline-1 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 0 | 900 |
| 3-b | wave-3-redline-2 | `enemy-red-tank` ×1, `enemy-green-basic` ×1 | 3500 | 1000 |
| 3-c | wave-3-redline-3 | `enemy-red-fast` ×2 | 6500 | 800 |
| 3-d | wave-3-redline-4 | `enemy-red-tank` ×1 | 9000 | 1200 |
</details>

<details>
<summary>Wave 4 — Blue, Mixed, Fast (4 sub-waves, 9 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 4-a | wave-4-redline-1 | `enemy-blue-fast` ×3 | 0 | 700 |
| 4-b | wave-4-redline-2 | `enemy-blue-basic` ×2 | 3000 | 900 |
| 4-c | wave-4-redline-3 | `enemy-red-basic` ×1, `enemy-blue-tank` ×1 | 5500 | 1000 |
| 4-d | wave-4-redline-4 | `enemy-blue-fast` ×1, `enemy-red-fast` ×1 | 8500 | 800 |
</details>

<details>
<summary>Wave 5 — Red, Single-Target, Elite (4 sub-waves, 9 enemies + elite)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 5-a | wave-5-redline-1 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 0 | 900 |
| 5-b | wave-5-redline-2 | `iron-kick` ×1, `enemy-red-basic` ×1 | 3500 | 1200 |
| 5-c | wave-5-redline-3 | `enemy-green-fast` ×2 | 7000 | 800 |
| 5-d | wave-5-redline-4 | `enemy-red-basic` ×2 | 9500 | 900 |
</details>

<details>
<summary>Wave 6 — Green, Single-Target, Fast (3 sub-waves, 7 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 6-a | wave-6-redline-1 | `enemy-green-fast` ×2, `enemy-green-basic` ×1 | 0 | 800 |
| 6-b | wave-6-redline-2 | `enemy-red-basic` ×2 | 3000 | 1000 |
| 6-c | wave-6-redline-3 | `enemy-green-fast` ×2 | 5500 | 800 |
</details>

<details>
<summary>Wave 7 — Red, Tanky, Single-Target (5 sub-waves, 9 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 7-a | wave-7-redline-1 | `enemy-red-basic` ×2 | 0 | 1000 |
| 7-b | wave-7-redline-2 | `enemy-green-tank` ×1, `enemy-green-fast` ×1 | 2500 | 1100 |
| 7-c | wave-7-redline-3 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 5500 | 1000 |
| 7-d | wave-7-redline-4 | `enemy-red-fast` ×2 | 9000 | 800 |
| 7-e | wave-7-redline-5 | `enemy-red-tank` ×1 | 11500 | 1200 |
</details>

<details>
<summary>Wave 8 — Blue, Mixed, Fast (5 sub-waves, 11 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 8-a | wave-8-redline-1 | `enemy-blue-fast` ×2, `enemy-blue-basic` ×1 | 0 | 700 |
| 8-b | wave-8-redline-2 | `enemy-red-tank` ×1 | 3000 | 1200 |
| 8-c | wave-8-redline-3 | `enemy-blue-basic` ×2, `enemy-blue-fast` ×1 | 5000 | 800 |
| 8-d | wave-8-redline-4 | `enemy-green-fast` ×2 | 8000 | 700 |
| 8-e | wave-8-redline-5 | `enemy-blue-tank` ×1, `enemy-red-fast` ×1 | 10500 | 1000 |
</details>

<details>
<summary>Wave 9 — Red, Tanky, Single-Target (5 sub-waves, 11 enemies)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 9-a | wave-9-redline-1 | `enemy-red-basic` ×2 | 0 | 900 |
| 9-b | wave-9-redline-2 | `enemy-red-tank` ×1, `enemy-red-fast` ×1 | 2500 | 1100 |
| 9-c | wave-9-redline-3 | `enemy-green-basic` ×2, `enemy-green-fast` ×1 | 5500 | 800 |
| 9-d | wave-9-redline-4 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 9000 | 1000 |
| 9-e | wave-9-redline-5 | `enemy-red-fast` ×2 | 12500 | 800 |
</details>

<details>
<summary>Wave 10 — Red, Boss, Single-Target (5 sub-waves, 10 enemies + boss)</summary>

| Sub | ID | Enemies | Start (ms) | Interval (ms) |
|-----|-----|---------|------------|---------------|
| 10-a | wave-10-redline-1 | `enemy-red-basic` ×2, `enemy-red-fast` ×1 | 0 | 900 |
| 10-b | wave-10-redline-2 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 3000 | 1000 |
| 10-c | wave-10-redline-3 | `redline-headliner` ×1 | 6000 | 1500 |
| 10-d | wave-10-redline-4 | `enemy-red-fast` ×2, `enemy-green-basic` ×1 | 9000 | 800 |
| 10-e | wave-10-redline-5 | `enemy-red-tank` ×1, `enemy-red-basic` ×1 | 12000 | 1000 |
</details>

## In Scope

- Create `src/config/stages/RedlineRoutine.ts`
- Export a `StageConfig` object with all fields populated
- Register the stage in `StageRegistry` (update `StageRegistry.ts` to import and include this stage)
- Validate:
  - 10 waves, each with correct `kind`
  - Wave 5 is `elite` with `specialEnemyId: 'iron-kick'`
  - Wave 10 is `boss` with `specialEnemyId: 'redline-headliner'`
  - `hpMultipliers.length === 10`
  - `hpMultipliers` are monotonically non-decreasing
  - All enemy IDs exist (will be true after tasks 02–03)
  - Every sub-wave has at least 1 enemy

## Out of Scope

- Stage 2 or Stage 3 configs (tasks 11–12)
- Visual rendering of enemies in this stage
- Lobby display of this stage
- Balancing changes beyond what's in the spec

## Detailed Requirements

### File Structure

```
src/config/stages/RedlineRoutine.ts
```

Export:
```ts
import type { StageConfig } from '@config/StageConfig';

export const redlineRoutineConfig: StageConfig = {
  id: 'redline-routine',
  displayName: 'Redline Routine',
  stageTags: ['Red', 'Single-Target', 'Tanky'],
  eliteEnemyId: 'iron-kick',
  bossEnemyId: 'redline-headliner',
  totalWaves: 10,
  hpMultipliers: [1.0, 1.1, 1.3, 1.5, 1.75, 2.05, 2.4, 2.8, 3.2, 3.7],
  slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 },
  waves: [
    // Wave 1
    {
      kind: 'normal',
      tags: ['Red', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 3 },
        },
        // ... etc
      ],
    },
    // ... waves 2–10
  ],
};
```

### Registry Registration

In `StageRegistry.ts`, after importing:
```ts
import { redlineRoutineConfig } from './stages/RedlineRoutine';

const stageConfigs: StageConfig[] = [
  redlineRoutineConfig,
  // More stages added in tasks 11–12
];
```

## Acceptance Criteria

- [ ] `redlineRoutineConfig` is a valid `StageConfig`
- [ ] All 10 waves are defined with correct `kind`, `tags`, and `specialEnemyId`
- [ ] 41 total sub-waves across all 10 waves
- [ ] `totalEnemies` ≈ 91 (verify from spec tables)
- [ ] Wave 5 has `kind: 'elite'` and `specialEnemyId: 'iron-kick'`
- [ ] Wave 10 has `kind: 'boss'` and `specialEnemyId: 'redline-headliner'`
- [ ] `hpMultipliers` length is 10 and values are monotonically non-decreasing
- [ ] Stage is registered in `StageRegistry` and retrievable via `getStageConfig('redline-routine')`
- [ ] `npx tsc --noEmit` passes
- [ ] No duplicate sub-wave IDs across the stage

## Technical Notes

- Sub-wave IDs must be unique. Use the pattern `wave-{N}-redline-{letter}` as shown in the tables.
- The `enemies` field is `Record<string, number>` — enemy ID to count. All IDs reference `EnemyDefinitions` (ordinary: `enemy-{color}-{archetype}`, special: `iron-kick`, `redline-headliner`).
- `startTimeMs` is absolute from wave start (not relative to previous sub-wave). Spawn order is by `startTimeMs`.
- `spawnIntervalMs` is the delay between individual enemy spawns within the sub-wave.
- The config object should be `as const satisfies StageConfig` to catch type errors at compile time.
- This is a large data structure (~150+ lines). Organize it cleanly with inline comments noting each wave's purpose.

## Implementation Plan

1. Create `src/config/stages/` directory
2. Create `RedlineRoutine.ts` with the full config from the spec tables
3. Copy sub-wave data from the Design Spec tables above — double-check every count, timing, and enemy ID
4. Add validation assertions (or rely on TypeScript types)
5. Import and register in `StageRegistry.ts`
6. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 01-task-config-types-and-registry (needs `StageConfig`, `StageWaveDefinition`, `SubWaveDefinition` types)
- Blocked by 02-task-enemy-definitions (needs ordinary enemy IDs like `enemy-red-basic`)
- Blocked by 03-task-special-enemies (needs `iron-kick` and `redline-headliner` enemy IDs)

## Type

AFK

## Design Spec Reference

- [Stage 1 — Redline Routine](../design-spec.md#stage-1--redline-routine-red-single-target-tanky)
- [Wave Content Tables (all 10 waves)](../design-spec.md#stage-1--redline-routine-red-single-target-tanky)
- [HP Multipliers table](../design-spec.md#stage-1--redline-routine)
- [Summary tables](../design-spec.md#summary-enemy-count-by-stage)
