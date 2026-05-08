# Combat Integration — Pre-Scaled Enemy Payload

## Task Intent

Update the combat initialization pipeline to receive enemy wave definitions and stat overrides from the stage launch payload instead of reading from global config. Modify `CombatRuntime.createCombatRuntime` and `CombatEnemyRuntimeFactory.createCombatEnemyRuntimes` to accept pre-built sub-wave definitions and enemy stat overrides (for HP scaling). Update `CombatScene` to pass these fields from the launch payload.

After this task, combat waves use stage-authored sub-waves with HP already scaled by the wave multiplier. Neither `CombatRuntime` nor `CombatEnemyRuntimeFactory` read from `CombatWaveConfig` — they consume what the payload provides.

## Relevant Context

Currently:
- `CombatScene` receives a launch payload with `waveIndex`, `totalWaves`, and slot configs
- `CombatRuntime.createCombatRuntime` calls `getCombatWaveDefinition(waveIndex)` from global config
- `CombatEnemyRuntimeFactory.createCombatEnemyRuntimes` reads `CombatContentConfig.ENEMY_DEFINITIONS` for enemy stats
- Enemy HP comes straight from `CombatBalanceConfig.ENEMY_MAX_HP` (flat value, already removed in task 02)

The new flow:
1. `StageFlowCoordinator` builds `subWaves` + `enemyStatOverrides` in the launch payload (task 08)
2. `CombatScene` passes them to `CombatRuntime`
3. `CombatRuntime` passes them to `CombatEnemyRuntimeFactory`
4. `CombatEnemyRuntimeFactory` uses the overrides instead of global config
5. No dependency on `CombatWaveConfig.waves` or `CombatBalanceConfig.ENEMY_MAX_HP` for wave content

## In Scope

- Extend `CreateCombatRuntimeOptions` to accept `subWaves` and `enemyStatOverrides`
- `CombatRuntime.createCombatRuntime` uses payload sub-waves instead of `getCombatWaveDefinition`
- `CombatEnemyRuntimeFactory.createCombatEnemyRuntimes` accepts enemy stat overrides and applies them (HP scaling)
- `CombatScene` reads extended fields from launch payload and passes to combat runtime
- `CombatWaveRuntime` uses payload sub-waves for spawn scheduling

## Out of Scope

- Enemy visual rendering (glow, silhouettes — task 17)
- The building of `subWaves` and `enemyStatOverrides` in the stage layer (task 08)
- Removing `CombatWaveConfig` entirely (it may still be used by tests — task 19 handles cleanup)
- Slot modifier changes in combat

## Detailed Requirements

### Payload Extension

The `stage:launch-combat-phase` command payload gains:

```ts
subWaves: SubWaveDefinition[];   // from stage config wave
enemyStatOverrides: Record<string, {        // definitionId → overrides
  maxHp: number;
}>;
```

### CombatScene Changes

In `CombatScene.create()` (or wherever it calls `createCombatRuntime`):
- Extract `subWaves` and `enemyStatOverrides` from scene data
- Pass them to `createCombatRuntime`

### CombatRuntime Changes

`CreateCombatRuntimeOptions` gains:
```ts
subWaves?: SubWaveDefinition[];
enemyStatOverrides?: Record<string, { maxHp: number }>;
```

In `createCombatRuntime`:
- If `options.subWaves` is provided, use it instead of calling `getCombatWaveDefinition(waveIndex)`
- The `initialWave` variable (used for `startAngleDeg` and `slotPresetId`) should still come from `CombatWaveConfig` OR have sensible defaults when using stage-scoped waves:
  - `startAngleDeg`: default to `CombatBalanceConfig.RECORD_START_ANGLE_DEG` (0)
  - `slotPresetId`: no longer used (player's build is the "preset")
- Pass `enemyStatOverrides` to `createCombatEnemyRuntimes`

### CombatEnemyRuntimeFactory Changes

Current signature:
```ts
export function createCombatEnemyRuntimes(
  waveDefinition: CombatWaveDefinition,
): CombatEnemyRuntime[];
```

New signature:
```ts
export function createCombatEnemyRuntimes(
  subWaves: SubWaveDefinition[],
  enemyStatOverrides?: Record<string, { maxHp: number }>,
): CombatEnemyRuntime[];
```

Implementation:
1. Iterate `subWaves` to build total spawn counts per definitionId (same as before)
2. For each enemy definition ID, look up base stats — BUT instead of `CombatContentConfig.ENEMY_DEFINITIONS`, use `CombatContentConfig.ENEMY_DEFINITIONS` still for the base stats, then apply `enemyStatOverrides[definitionId]?.maxHp` if present
3. If `enemyStatOverrides` provides `maxHp`, use the overridden value instead of the definition's `maxHp`

Actually, the cleaner approach: the factory still reads enemy definitions from `CombatContentConfig` (for archetype, color, speed, visualKey, etc.), but `maxHp` from the override. This way we only pass what's stage-scoped (HP) and keep everything else from the definition.

### CombatWaveRuntime Changes

`createInitialCombatWaveState` currently takes `CombatWaveDefinition`. Update to accept `SubWaveDefinition[]` directly. The `currentWaveId` and other wave-level metadata may need adjustment.

Simplest: `initializeCombatWaveRuntime` sets `activeSubWaves` and `pendingSubWaves` from the provided sub-wave array. The `spawnBags` map is built the same way.

### Backward Compatibility

For the old direct-combat flow (if `CombatScene` is launched without a stage — e.g., standalone testing), fall back to `CombatWaveConfig.WAVES`:
- If `subWaves` is not provided, use `getCombatWaveDefinition(waveIndex).subWaves`
- If `enemyStatOverrides` is not provided, use definition defaults

This keeps combat testable independently of the stage system.

## Acceptance Criteria

- [ ] `CombatRuntime.createCombatRuntime` accepts and uses `subWaves` and `enemyStatOverrides` from options
- [ ] `CombatEnemyRuntimeFactory.createCombatEnemyRuntimes` applies HP overrides from `enemyStatOverrides`
- [ ] `CombatWaveRuntime` uses payload sub-waves for spawn timing
- [ ] `CombatScene` passes extended fields from launch payload
- [ ] Fallback to global `CombatWaveConfig` when `subWaves` is not provided (backward compat)
- [ ] Enemies in combat have HP scaled by wave multiplier (verify: wave 10 enemies have ~3.7–4.1× more HP than wave 1)
- [ ] `npx tsc --noEmit` passes
- [ ] Existing combat tests pass or are noted for update (task 19)

## Technical Notes

- The `CombatWaveRuntime` module (`src/combat/CombatWaveRuntime.ts`) handles sub-wave activation, spawn timing, and enemies remaining. It currently receives a `CombatWaveDefinition` at init. Update its interface carefully — the `currentWaveId` field may become irrelevant, but keep it for backward compat.
- `CombatLayoutConfig.ENEMY_PREVIEW_SPAWN_X` and `ENEMY_PREVIEW_SPAWN_Y` are used for initial enemy positions. These are layout concerns, not stage content. Leave them as-is.
- The `PhaseSwarmRenderModel` and enemy presentation code read enemy visual keys. These should be unaffected by this task — visual keys come from enemy definitions, which are still looked up from `CombatContentConfig`.
- Make sure the spawn order within a sub-wave is preserved. `CombatEnemyRuntimeFactory` currently iterates `CombatContentConfig.ENEMY_DEFINITIONS` in definition order, then spawns per count. This order should be consistent regardless of whether `enemyStatOverrides` is provided.
- If `enemyStatOverrides` references an enemy ID not in `CombatContentConfig.ENEMY_DEFINITIONS` (e.g., a special enemy like `iron-kick`), the factory should still create the runtime using the override stats. Make sure the lookup handles this.

## Implementation Plan

1. Read `CombatScene.ts` — find where `createCombatRuntime` is called and what scene data is available
2. Read `CombatRuntime.ts` — understand `CreateCombatRuntimeOptions` and how `initialWave` is used
3. Read `CombatEnemyRuntimeFactory.ts` — understand the current factory logic
4. Read `CombatWaveRuntime.ts` — understand `createInitialCombatWaveState` and `initializeCombatWaveRuntime`
5. Extend `CreateCombatRuntimeOptions` with `subWaves` and `enemyStatOverrides`
6. Update `createCombatRuntime` to use `options.subWaves` when provided
7. Update `createCombatEnemyRuntimes` signature and add HP override logic
8. Update `createInitialCombatWaveState` to accept sub-waves directly
9. Update `CombatScene.create()` to pass the new fields
10. Run `npx tsc --noEmit` and fix errors
11. Run combat tests to check for regressions

## Blocked By

- Blocked by 08-task-flow-coordinator-plumbing (needs the `subWaves` and `enemyStatOverrides` fields in the combat launch payload)

## Type

AFK

## Design Spec Reference

- [Combat Payload Extension](../design-spec.md#combat-payload-extension)
- [Changed Systems — CombatEnemyRuntimeFactory](../design-spec.md#changed-systems)
- [Data Flow — Stage Selection → Stage Start](../design-spec.md#stage-selection--stage-start)
- [Architecture Notes — Why pass pre-scaled enemies](../design-spec.md#why-pass-pre-scaled-enemies-in-combat-payload)
