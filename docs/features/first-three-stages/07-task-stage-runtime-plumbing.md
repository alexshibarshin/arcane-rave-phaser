# StageRuntime Plumbing — Stage-Scoped Waves and Combat Payload

## Task Intent

Update `StageRuntime` to work with the new `StageConfig` shape: it stores the stage config, reads waves from `stageConfig.waves` instead of the global `CombatWaveConfig`, uses `stageConfig.hpMultipliers` to pre-scale enemy HP for the combat payload, and resolves special enemy names for wave previews. Also update `StageWavePreview` to return the new `StageWavePreviewModel` type (with tags, special enemy ID/name) instead of the old text-based `bodyLines`/`archetypeSummary` format.

After this task, `StageRuntime` is fully stage-config-aware. Waves, HP scaling, and preview data are all driven by the selected stage rather than global config.

## Relevant Context

### What changes

The current `StageRuntime`:
- Reads `stageConfig.totalWaves` but NOT the wave definitions
- Uses `CombatWaveConfig.WAVES` and `getCombatWaveDefinition(waveIndex)` globally for all stages
- Has no concept of stage-specific waves, HP multipliers, or special enemies
- `StageWavePreview` produces text lines (bodyLines) and archetype summary strings from global enemy definitions

The new `StageRuntime` must:
- Store the full `StageConfig` (now with `waves: StageWaveDefinition[]`)
- Read wave data from `stageConfig.waves[waveIndex]` instead of global config
- Build `enemies: ScaledEnemyConfig[]` for the combat launch payload by resolving enemy definitions and applying `hpMultipliers[waveIndex]`
- `StageWavePreview` produces `StageWavePreviewModel` with tags, `specialEnemyId`, and resolved `specialEnemyName`

### HP Scaling

For a wave at index `i`:
1. Read `stageConfig.waves[i].subWaves`
2. For each sub-wave, iterate `enemies: Record<string, number>` (enemyId → count)
3. Resolve each enemyId to its `CombatEnemyDefinition` from `EnemyDefinitions`
4. Multiply `maxHp` by `stageConfig.hpMultipliers[i]`
5. Pass the scaled config in the combat payload

### Special Enemy Name Resolution

When creating a `StageWavePreviewModel`, if `wave.specialEnemyId` is non-null:
1. Look up the enemy definition by ID
2. Set `specialEnemyName` to the enemy's `displayName`

## In Scope

- `StageRuntime` stores `stageConfig: StageConfig`
- `createStageRuntime` accepts and stores the config
- Add function to build scaled enemy payload from stage config waves
- `StageWavePreview.createStageWavePreview` returns `StageWavePreviewModel` instead of text-based model
- Resolve special enemy names from `EnemyDefinitions`
- Update `StageFlowCoordinator.createSnapshotCommand` (or the snapshot payload builder) to use new preview model

## Out of Scope

- `StageFlowCoordinator` using `stageConfig.waves` instead of global config (task 08)
- Combat receiving and using the scaled enemy payload (task 09)
- UI rendering of the new preview model (tasks 15–16)
- Creating `EnemyDefinitions` or special enemies (tasks 02–03)
- `StageScene` integration (task 13)

## Detailed Requirements

### StageRuntime Changes

`createStageRuntime` already takes `StageConfig`. Enhance it:

```ts
export function createStageRuntime(
  stageConfig: StageConfig,
  random: () => number = Math.random,
): StageRuntime {
  // ... existing initialization ...
  return {
    // ... existing fields ...
    stageConfig,  // store the full config
  };
}
```

Add to `StageRuntime` interface:
```ts
stageConfig: StageConfig;
```

### Build Scaled Enemy Payload

New function (in `StageRuntime.ts` or a helper):

```ts
function buildScaledEnemyPayload(
  stageConfig: StageConfig,
  waveIndex: number,
): ScaledEnemyConfig[] {
  const wave = stageConfig.waves[waveIndex];
  if (!wave) return [];
  
  const multiplier = stageConfig.hpMultipliers[waveIndex] ?? 1.0;
  const configs: ScaledEnemyConfig[] = [];
  
  for (const subWave of wave.subWaves) {
    for (const [enemyId, count] of Object.entries(subWave.enemies)) {
      const definition = getEnemyDefinitionById(enemyId);
      if (!definition) {
        throw new Error(`Unknown enemy ID "${enemyId}" in wave ${waveIndex} of stage "${stageConfig.id}"`);
      }
      
      for (let i = 0; i < count; i++) {
        configs.push({
          definitionId: definition.id,
          displayName: definition.displayName ?? definition.id,
          archetype: definition.archetype,
          color: definition.color,
          maxHp: Math.round(definition.maxHp * multiplier),
          moveSpeedPxPerSec: definition.moveSpeedPxPerSec,
          attackRangePx: definition.attackRangePx,
          attackCooldownMs: definition.attackCooldownMs,
          attackDamage: definition.attackDamage,
          visualKey: definition.visualKey,
          silhouetteMotif: definition.silhouetteMotif,
        });
      }
    }
  }
  
  return configs;
}
```

Wait — this builds individual enemy configs per spawn. But `CombatEnemyRuntimeFactory` currently creates runtimes from the wave definition (with spawn timing). The payload should carry the wave definition + enemy definitions for lookup, OR carry pre-built enemy configs alongside spawn timing.

Actually, re-reading the design spec:

> `StageRuntime` builds this array by:
> 1. Reading `StageConfig.waves[waveIndex].subWaves`
> 2. Resolving each `enemyId` from `EnemyDefinitions`
> 3. Multiplying `maxHp` by `StageConfig.hpMultipliers[waveIndex]`
> 4. Passing the result to `launch-combat-phase`

And the combat payload gains:
```ts
enemies: Array<{
  definitionId: string;
  displayName: string;
  archetype: string;
  color: NoteColor;
  maxHp: number;  // already scaled
  ...
}>
```

But the sub-wave structure (timing) still needs to reach combat. The simplest approach: pass BOTH the sub-waves (for timing) AND a lookup map of scaled enemy configs (per definitionId). Combat uses the sub-wave config for timing/spawning and the lookup for stats.

OR: keep the current flow where combat reads from global `CombatContentConfig.ENEMY_DEFINITIONS` but with a twist — the scaled HP is passed in the payload. Each enemy in the sub-wave gets its maxHp overridden by the payload.

The cleanest approach per the spec: pass a `scaledEnemyConfigs` map in the combat payload. Combat's `createCombatEnemyRuntimes` uses these instead of reading from `CombatContentConfig`.

But the payload should NOT contain individual runtime instances — just the definition overrides. Something like:

```ts
enemyConfigOverrides: Record<string, { maxHp: number; /* other overrides? */ }>
```

Combined with the sub-wave definitions (which carry enemyId → count and timing), combat can build runtimes with overridden HP.

Actually, let's keep it simpler. The spec says `enemies: ScaledEnemyConfig[]` — an array of per-enemy-instance configs. But we need to preserve spawn ordering and timing from sub-waves.

Best approach: pass the `StageWaveDefinition` (sub-waves + timing) PLUS a lookup of scaled enemy stats. Combat replaces its global lookup with this payload lookup.

OR: the simplest change — pass `subWaves` as before but with an additional `enemyStatOverrides` field:

```ts
// In launch payload:
subWaves: SubWaveDefinition[];  // from stage config wave
enemyStatOverrides: Record<string, { maxHp: number }>;  // definitionId → overrides
```

Combat uses `subWaves` for timing (replacing `getCombatWaveDefinition().subWaves`) and applies `enemyStatOverrides` when creating runtimes.

This is cleaner than pre-building individual enemy configs. Let's go with this approach.

### StageWavePreview Changes

Current `createStageWavePreview(wave: CombatWaveDefinition, ...)` returns:
```ts
{ bodyLines: string[], archetypeSummary: string }
```

New version:
```ts
function createStageWavePreview(
  wave: StageWaveDefinition,
  currentWave: number,
  totalWaves: number,
): StageWavePreviewModel;
```

Where `StageWavePreviewModel` has `tags`, `specialEnemyId`, `specialEnemyName` instead of text lines.

Implementation:
1. `tags` comes directly from `wave.tags`
2. `specialEnemyId` comes from `wave.specialEnemyId`
3. `specialEnemyName` is resolved by looking up the enemy definition and reading `displayName`
4. Keep `waveNumber` and `totalWaves` from parameters
5. `waveKind` from `wave.kind`

### Update Snapshot Command Building

In `StageFlowCoordinator.createSnapshotCommand` (or wherever the stage snapshot is built), the call to `createStageWavePreview` now uses `StageWaveDefinition` and returns `StageWavePreviewModel`. Update the snapshot payload to carry the new model shape.

The `stage:snapshot-updated` event currently has:
```ts
previewTitle: string;
previewBody: string;
```

These need to be replaced or extended with the new model. Options:
1. Replace with `wavePreview: StageWavePreviewModel | null`
2. Keep old fields for backward compat and ADD new fields

Since this is a feature overhaul, replacing is fine — update all consumers. The EventBus type in `EventBus.ts` needs updating.

## Acceptance Criteria

- [ ] `StageRuntime` has `stageConfig: StageConfig` field
- [ ] `createStageRuntime` stores the passed config
- [ ] A function exists to build enemy stat overrides from stage config waves (HP scaled by multiplier)
- [ ] The combat launch payload includes `subWaves` and `enemyStatOverrides` (or equivalent)
- [ ] `StageWavePreview.createStageWavePreview` accepts `StageWaveDefinition` and returns `StageWavePreviewModel`
- [ ] `specialEnemyName` is correctly resolved from `EnemyDefinitions` when `specialEnemyId` is non-null
- [ ] `stage:snapshot-updated` event payload carries the new preview model (or at least is compatible)
- [ ] `npx tsc --noEmit` passes
- [ ] Existing tests that reference `StageWavePreview` are updated or noted for task 19

## Technical Notes

- The `StageRuntime` currently doesn't expose `stageConfig` publicly — it only reads from it in `createStageRuntime`. Add it as a public field.
- `requestStageWaveStart` needs the wave data to build the combat payload. Currently the payload is built in `StageFlowCoordinator.createLaunchCombatCommand`. Move the enemy stat override building there, or add a new `getStageWaveEnemyPayload(runtime)` function that `StageFlowCoordinator` calls.
- The `StageWavePreview` function is in `src/stage/StageWavePreview.ts`. It currently imports from `CombatWaveConfig` and `CombatContentConfig`. Update imports to use `StageConfig` types and `EnemyDefinitions`.
- The `stage:snapshot-updated` event type is in `src/events/EventBus.ts`. Adding `wavePreview: StageWavePreviewModel | null` requires importing the type there. This creates a dependency from events → stage types. That's fine — EventBus already imports from stage types.

## Implementation Plan

1. Add `stageConfig: StageConfig` to `StageRuntime` interface
2. In `createStageRuntime`, store the config
3. Create helper `buildStageWaveEnemyPayload(runtime, waveIndex)` that returns `{ subWaves: SubWaveDefinition[], enemyStatOverrides: Record<string, { maxHp: number }> }`
4. Update `StageWavePreview.createStageWavePreview`:
   - Change parameter type from `CombatWaveDefinition` to `StageWaveDefinition`
   - Return `StageWavePreviewModel` with tags, specialEnemyId, specialEnemyName
   - Resolve specialEnemyName from enemy definitions
5. Update `createStageSnapshotPayload` in `StageFlowCoordinator.ts` to use new preview function and include preview model in snapshot
6. Update `EventBus.ts` `stage:snapshot-updated` type to include `wavePreview: StageWavePreviewModel | null`
7. Run `npx tsc --noEmit` and fix all type errors from the changed signatures

## Blocked By

- Blocked by 01-task-config-types-and-registry (needs `StageConfig.waves`, `StageWaveDefinition`, `SubWaveDefinition`, `StageWavePreviewModel` types)
- Blocked by 02-task-enemy-definitions (needs `EnemyDefinitions` module with `createEnemy` and enemy lookup)
- Blocked by 03-task-special-enemies (needs special enemy definitions with `displayName` for name resolution)

## Type

AFK

## Design Spec Reference

- [Combat Payload Extension](../design-spec.md#combat-payload-extension)
- [Data Flow — Stage Selection → Stage Start](../design-spec.md#stage-selection--stage-start)
- [Data Flow — Wave Preview Data Flow](../design-spec.md#wave-preview-data-flow)
- [StageWavePreviewModel Contract](../design-spec.md#stagewavepreviewmodel-contract)
- [StageRuntime changes](../design-spec.md#changed-systems)
