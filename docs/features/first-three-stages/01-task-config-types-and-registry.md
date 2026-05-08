# Config Types and Stage Registry

## Task Intent

Establish the new type contracts, config structure, and registry that the rest of the feature depends on. This task expands `StageConfig` with fields needed for authored stage identity (tags, elite/boss references, HP multipliers per wave), defines the new `StageWaveDefinition` and `StageWavePreviewModel` types, creates a `StageRegistry` module for id-based config lookup, adds the `LOBBY` scene key, and defines star rating threshold constants.

This is the foundation — every other task builds on these types. Nothing is playable after this task, but `npx tsc --noEmit` should pass with the new types in place.

## Relevant Context

The game currently has a single test stage defined inline in `StageConfig.ts` with flat enemy stats from `CombatBalanceConfig` and waves from `CombatWaveConfig`. The new design replaces this with three authored stages, each carrying its own wave definitions, tags, elite/boss identity, and HP scaling curve. The `StageConfig` interface must expand to carry all this data, and a registry must provide lookup by stage ID.

Star thresholds need to live in config (not hardcoded) to stay tunable. The `CombatBalanceConfig.BASE_HP` (100) is the reference for star percentage calculations.

## In Scope

- Expand `StageConfig` interface with `stageTags`, `eliteEnemyId`, `bossEnemyId`, `hpMultipliers`, and replace `waveDefinitions` type to `StageWaveDefinition[]`
- Define `StageWaveDefinition` type with `kind`, `tags`, `specialEnemyId`, `subWaves`
- Define `SubWaveDefinition` type with `id`, `startTimeMs`, `spawnIntervalMs`, `enemies: Record<string, number>`
- Define `StageWavePreviewModel` type with `waveNumber`, `totalWaves`, `waveKind`, `tags`, `specialEnemyId`, `specialEnemyName`
- Create `StageRegistry` module exporting `getStageConfig(id)` and `getAllStageConfigs()`
- Add `LOBBY: 'LobbyScene'` to `SceneKeys` in `GameConfig.ts`
- Add `LobbyScene` to `appSceneKeys` in `AppSceneKeys.ts`
- Define star threshold constants (possibly in `CombatBalanceConfig` or a new dedicated spot)

## Out of Scope

- Creating any actual stage config files (those are tasks 10–12)
- Creating `EnemyDefinitions` (task 02)
- Modifying `StageRuntime` or `StageFlowCoordinator` (tasks 07–08)
- Modifying combat systems
- Creating any UI

## Detailed Requirements

### StageConfig Changes

Current:
```ts
interface StageConfig {
  id: string;
  displayName: string;
  totalWaves: number;
  initialCoins: number;
  waveDefinitions: CombatWaveDefinition[];
  slotModifierCountWeights: SlotModifierCountWeights;
  slotModifierWeightOverrides?: Record<string, number>;
}
```

New fields to add:
- `stageTags: string[]` — 2–4 pill tags describing the stage identity (e.g. `['Red', 'Single-Target', 'Tanky']`)
- `eliteEnemyId: string` — enemy definition ID of the stage's elite (appears wave 5)
- `bossEnemyId: string` — enemy definition ID of the stage's boss (appears wave 10)
- `hpMultipliers: number[]` — one multiplier per wave, length must equal `totalWaves`

Remove or replace:
- `waveDefinitions: CombatWaveDefinition[]` → `waves: StageWaveDefinition[]`
- `initialCoins` stays (used from economy config via `StageFlowConfig.INITIAL_COINS`)

### StageWaveDefinition

```ts
interface StageWaveDefinition {
  kind: 'normal' | 'elite' | 'boss';
  tags: string[];           // 1–4 pill tags for wave preview
  specialEnemyId: string | null;  // non-null for elite/boss waves
  subWaves: SubWaveDefinition[];
}
```

Note: This replaces `CombatWaveDefinition` for authored stages. It drops `slotPresetId` and `startAngleDeg` (those are no longer wave-specific — the slot preset is the player's build, and start angle can be a constant).

### SubWaveDefinition

```ts
interface SubWaveDefinition {
  id: string;
  startTimeMs: number;
  spawnIntervalMs: number;
  enemies: Record<string, number>;  // enemyId → count
}
```

This is structurally identical to `CombatSubWaveConfig` from `CombatWaveConfig.ts`. Consider whether to reuse it or define a parallel type. Reusing is acceptable if the import direction is clean.

### StageWavePreviewModel

```ts
interface StageWavePreviewModel {
  waveNumber: number;
  totalWaves: number;
  waveKind: 'normal' | 'elite' | 'boss';
  tags: string[];
  specialEnemyId: string | null;
  specialEnemyName: string | null;  // resolved from EnemyDefinitions
}
```

### StageRegistry

Module at `src/config/StageRegistry.ts`:

```ts
export function getStageConfig(stageId: string): StageConfig | undefined;
export function getAllStageConfigs(): StageConfig[];
```

Initial implementation returns an empty array (stages registered in later tasks). The module should import from individual stage config files once they exist.

### SceneKeys

Add `LOBBY: 'LobbyScene'` to the existing `SceneKeys` object.

### Star Thresholds

Add to `CombatBalanceConfig` (or a new location, but keeping all balance numbers together is cleaner):

```ts
STAR_THRESHOLDS: {
  THREE_STAR_MIN_RATIO: 0.9,   // >90% HP → 3 stars
  TWO_STAR_MIN_RATIO: 0.5,     // 50%–90% HP → 2 stars
  // below 50% but base alive → 1 star
  // base dead → 0 stars
}
```

## Acceptance Criteria

- [ ] `StageConfig` interface compiles with new fields
- [ ] `StageWaveDefinition` and `SubWaveDefinition` types are defined and exported
- [ ] `StageWavePreviewModel` type is defined and exported
- [ ] `StageRegistry` module exists with `getStageConfig` and `getAllStageConfigs` exports
- [ ] `SceneKeys.LOBBY` exists
- [ ] `LobbyScene` is in `appSceneKeys`
- [ ] Star threshold constants exist in config
- [ ] `npx tsc --noEmit` passes (note: existing code referencing old `StageConfig` shape will need updating in later tasks)
- [ ] No circular imports

## Technical Notes

- The old `CombatWaveDefinition` type (with `slotPresetId`, `startAngleDeg`) should NOT be removed yet — it's still used by combat code. The new `StageWaveDefinition` is a separate type for authored stage content. The bridge between them happens in `StageRuntime` (task 07).
- `SubWaveDefinition` is structurally identical to `CombatSubWaveConfig`. Consider extracting a shared `SubWaveConfig` type or just using `CombatSubWaveConfig` directly. If keeping separate, document why.
- The `StageRegistry` needs to be importable by `StageScene` (to get the selected stage config) and `LobbyScene` (to list stages). Avoid importing stage config files that don't exist yet — use a registration pattern where stages register themselves.
- Types should be exported from a central location. Consider `src/config/StageConfig.ts` as the home for `StageConfig`, `StageWaveDefinition`, `SubWaveDefinition`, and `StageWavePreviewModel`.
- This task intentionally leaves `StageConfig.waves` empty or untyped for now. The old `STAGE_CONFIGS` array in `StageConfig.ts` should be updated to match the new shape, but can contain zero stages until tasks 10–12 add them.

## Implementation Plan

1. Define `SubWaveDefinition` type (or verify `CombatSubWaveConfig` can be reused)
2. Define `StageWaveDefinition` type
3. Define `StageWavePreviewModel` type
4. Expand `StageConfig` interface with new fields; update the old `STAGE_CONFIGS` inline config to match new shape (0 stages or a placeholder)
5. Add star thresholds to `CombatBalanceConfig`
6. Add `LOBBY` to `SceneKeys` and `appSceneKeys`
7. Create `src/config/StageRegistry.ts` with stub functions (empty array initially)
8. Run `npx tsc --noEmit` and fix any type errors from the `StageConfig` shape change in other files (e.g. `StageScene.ts` and `StageRuntime.ts` may reference old fields — update minimally to compile)

## Additional Notes

- The old `StageConfig.ts` has `stageConfigs` array with one test stage. Update it to match new interface, but keep it as a single placeholder stage using the old `CombatWaveDefinition[]` for `waves` if needed to avoid breaking `StageScene` until task 07.
- Actually, since `StageWaveDefinition` differs from `CombatWaveDefinition`, you may need to keep the old `StageConfig` shape as-is and make the new fields optional for now, or accept that `StageScene.ts` will temporarily reference a type that doesn't yet have wave data in the new format. Either approach works as long as compilation succeeds.

## Blocked By

None — can start immediately.

## Type

AFK

## Design Spec Reference

- [StageConfig Contract](../design-spec.md#stageconfig-contract)
- [StageWaveDefinition Contract](../design-spec.md#stagewavedefinition-contract)
- [StageWavePreviewModel Contract](../design-spec.md#stagewavepreviewmodel-contract)
- [Config File Structure](../design-spec.md#config-file-structure)
- [Core Mechanics — Star Rating](../design-spec.md#star-rating)
- [Technical Design](../design-spec.md#technical-design)
