# 11 — Test Wave: wave-test-all

## Task Intent

Add a new test wave `wave-test-all` to `CombatWaveConfig.WAVES` that spawns all enemy types for visual verification. Also update the game's initial wave selection to use `wave-test-all` instead of `wave-1` during development.

## Relevant Context

The current default wave is `wave-1` (defined as the first entry in `CombatWaveConfig.WAVES`). The game's combat system reads `CombatWaveConfig.WAVES[0]` as the active wave (see `createCombatRuntime()` in `CombatRuntime.ts`: `const initialWave = CombatWaveConfig.WAVES[0];`).

The spec says: "The game should be configured to run `wave-test-all` instead of `wave-1` during development" and "The test wave should replace the default wave in the game's initial state (not just be added to config)."

## In Scope

### 1. Add wave-test-all to CombatWaveConfig

Add a new wave definition to `CombatWaveConfig.WAVES`:

```ts
{
  id: 'wave-test-all',
  slotPresetId: 'preset-starter-1',
  startAngleDeg: 0,
  subWaves: [
    {
      id: 'wave-test-all-red',
      startTimeMs: 0,
      spawnIntervalMs: 1200,
      enemies: {
        'enemy-red-basic': 1,
        'enemy-red-tank': 1,
        'enemy-red-fast': 1,
        'enemy-red-ranged': 1,
        'enemy-red-swarm': 1,
        'enemy-red-boss': 1,
      },
    },
    {
      id: 'wave-test-all-green',
      startTimeMs: 3000,
      spawnIntervalMs: 1200,
      enemies: {
        'enemy-green-basic': 1,
        'enemy-green-tank': 1,
        'enemy-green-fast': 1,
        'enemy-green-ranged': 1,
        'enemy-green-swarm': 1,
        'enemy-green-boss': 1,
      },
    },
    {
      id: 'wave-test-all-blue',
      startTimeMs: 6000,
      spawnIntervalMs: 1200,
      enemies: {
        'enemy-blue-basic': 1,
        'enemy-blue-tank': 1,
        'enemy-blue-fast': 1,
        'enemy-blue-ranged': 1,
        'enemy-blue-swarm': 1,
        'enemy-blue-boss': 1,
      },
    },
  ],
}
```

### 2. Make wave-test-all the default wave

The spec says "should replace the default wave in the game's initial state." There are two approaches:

**Approach A**: Move `wave-test-all` to the first position in `WAVES` array, making it the default (since `createCombatRuntime()` reads `WAVES[0]`).

**Approach B**: Keep `wave-1` as the first entry and add a config flag `DEFAULT_WAVE_ID: 'wave-test-all'` that `createCombatRuntime()` reads instead of `WAVES[0]`.

**Decision**: Use Approach A — move `wave-test-all` to the first position. This is simpler and doesn't require changes to `CombatRuntime.ts` or any other file. The wave config validator will auto-validate the new wave.

After this change, the WAVES array order is:
```ts
WAVES: [
  { id: 'wave-test-all', ... },  // ← first = default
  { id: 'wave-1', ... },         // ← still available, just not default
]
```

### 3. Validation

The existing `validateCombatWaveConfig()` function checks:
- Wave references a valid slot preset — `preset-starter-1` exists ✓
- Sub-waves reference valid enemy IDs — all 18 enemy IDs exist (from task 01) ✓
- At least one sub-wave per wave — 3 sub-waves ✓

No additional validation logic is needed.

## Out of Scope

- Making the test wave opt-in via a config flag (spec says "replace the default")
- Per-sub-wave slot presets (all sub-waves use `preset-starter-1`)
- Test wave balancing (each sub-wave has exactly 6 enemies, one per archetype)
- Test updates (done inline in tasks that break tests)
- Any changes to `CombatRuntime.ts` (the runtime reads `WAVES[0]` which will now be `wave-test-all`)

## Detailed Requirements

1. Add `wave-test-all` to `CombatWaveConfig.WAVES` as the first entry
2. Keep `wave-1` in the array (second position) — do not remove it
3. Each sub-wave has exactly 6 enemies (one per archetype: basic, tank, fast, ranged, swarm, boss)
4. Each sub-wave uses `slotPresetId: 'preset-starter-1'`
5. Sub-wave timing: red at 0ms, green at 3000ms, blue at 6000ms
6. Spawn interval: 1200ms per sub-wave
7. `validateCombatWaveConfig()` must pass at module load

## Acceptance Criteria

- [ ] `wave-test-all` is present in `CombatWaveConfig.WAVES` as the first entry
- [ ] `wave-1` is still present in `CombatWaveConfig.WAVES` (second entry)
- [ ] `wave-test-all` has 3 sub-waves (one per color)
- [ ] Each sub-wave has exactly 6 enemies (one per archetype)
- [ ] Sub-wave timing: red 0ms, green 3000ms, blue 6000ms
- [ ] Spawn interval is 1200ms for all sub-waves
- [ ] `validateCombatWaveConfig()` passes at module load
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes (tests that reference specific enemy counts may need inline fixes)

## Technical Notes

- `createCombatRuntime()` reads `CombatWaveConfig.WAVES[0]` as the initial wave — by making `wave-test-all` the first entry, it becomes the default
- The `slotPresetId: 'preset-starter-1'` references the existing slot preset — no changes needed
- Each sub-wave spawns 6 enemies at 1200ms intervals = 7.2 seconds total per sub-wave
- Total wave duration: ~21.6 seconds (3 sub-waves × 7.2s)
- The wave validator checks that all enemy IDs in sub-waves exist in `ENEMY_DEFINITIONS` — this is satisfied by task 01

## Implementation Plan

1. Open `src/config/CombatWaveConfig.ts`
2. Add the `wave-test-all` wave definition as a constant
3. Add it to the `WAVES` array as the first entry
4. Run `npx tsc --noEmit` to check for type errors
5. Run `npm test` to check for test failures (fix any that break)
6. Open the game in browser — should load `wave-test-all` by default

## Additional Notes

**Why keep wave-1 in the array?** Removing `wave-1` would break any code that references it by index or ID. Keeping it as the second entry preserves backward compatibility while making `wave-test-all` the default.

**Why 1200ms spawn interval?** The spec says "1200ms spawn interval." This gives enough time to see each enemy spawn individually (6 enemies × 1200ms = 7.2 seconds per sub-wave).

**Why 3 sub-waves by color?** The spec says "Splitting by color (6 enemies per sub-wave) keeps each sub-wave manageable in density while still showing all archetypes. A single sub-wave with 18 enemies would be too crowded for visual verification."

## Blocked By

- Task 01 (new enemy definitions must exist)

## Type

AFK

## Design Spec Reference

- [Wave Configuration](../design-spec.md#wave-configuration)
- [Content and Configuration](../design-spec.md#content-and-configuration)
- [Assumptions](../design-spec.md#assumptions) ("The test wave should replace the default wave in the game's initial state")
