# 02 — Stage Generation + StageRuntime Integration

## Task Intent

Implement the slot modifier generation logic and wire it into the stage runtime. This task creates the pure generation module (`StageSlotModifiers.ts`) and integrates it into the existing `StageRuntime.ts`.

After this task, calling `createStageRuntime(stageConfig)` produces a `StageRuntime` with a populated `slotModifiers` field. The generated modifiers persist across all waves within the stage. The generation is deterministic for a given RNG stream and respects all rarity, weight, and uniqueness constraints.

This task delivers the complete generation pipeline — config → generation → runtime state. It does NOT include combat application or UI rendering.

## Relevant Context

**From the Design Spec — Stage Generation Flow:**
1. Create stage runtime via `createStageRuntime(stageConfig)`.
2. Roll how many modified slots using `stageConfig.slotModifierCountWeights` for 0/1/2/3.
3. Choose that many unique slot indices uniformly from the 8 slots.
4. For each chosen slot, roll a modifier from the weighted pool.
5. While rolling: respect stage overrides, treat weight 0 as unavailable, enforce premium cap ≤ 1.
6. Store in `StageRuntime.slotModifiers` — persists for the entire stage.

**From the Design Spec — Invariants:**
- No more than 3 modified slots per stage
- No more than 1 premium modifier per stage
- Each slot index appears at most once
- Weight 0 means unavailable
- Common modifiers may repeat across slots; premium may not (due to cap)
- Slot choice is uniformly random across the 8 slots (v1)

**Current `createStageRuntime` signature:**
```ts
function createStageRuntime(
  options: CreateStageRuntimeOptions,
  random?: () => number,
): StageRuntime
```
Where `CreateStageRuntimeOptions = { totalWaves: number; initialCoins: number }`.

**The change:** `createStageRuntime` now accepts a `StageConfig` instead of raw options. The `totalWaves` and `initialCoins` come from the config. The random function is still an optional second parameter.

## In Scope

- `src/stage/StageSlotModifiers.ts` — pure generation logic + types
- `src/stage/StageSlotModifiers.test.ts` — generation tests
- `src/stage/StageRuntime.ts` — add `slotModifiers` field, change signature to accept `StageConfig`, call generation

## Out of Scope

- Combat integration (tasks 03–06)
- Build UI rendering (tasks 07–08)
- Modifier config changes (task 01)
- Any Phaser dependencies in generation module
- `StageConfig.ts` creation (task 01 — already done)

## Detailed Requirements

### StageSlotModifiers.ts — Types

```ts
interface SlotModifierAssignment {
  slotIndex: number;   // 0–7
  modifierId: string;
}

interface SlotModifierCountWeights {
  0: number;
  1: number;
  2: number;
  3: number;
}
```

### StageSlotModifiers.ts — Generation Function

```ts
function generateStageSlotModifiers(
  rng: () => number,
  stageConfig: StageConfig,
  modifierPool: SlotModifierDefinition[],
): SlotModifierAssignment[]
```

**Algorithm:**

1. **Roll count:** weighted random selection from `stageConfig.slotModifierCountWeights`. If all weights are 0, return `[]` (but validation in task 01 ensures at least one weight > 0).

2. **Choose slots:** select `count` unique indices from 0–7 uniformly. Use Fisher-Yates partial shuffle or rejection sampling. The RNG must be the sole source of randomness for reproducibility.

3. **For each chosen slot, roll a modifier:**
   - Build a list of eligible modifiers: exclude those with effective weight 0.
   - Effective weight = `stageConfig.slotModifierWeightOverrides?.[modifierId] ?? modifier.defaultWeight`.
   - If a premium has already been selected, all other premiums have effective weight 0.
   - Weighted random selection from eligible modifiers.
   - If no eligible modifiers remain (all weights 0), throw — this is a config error.

4. **Return** `SlotModifierAssignment[]` (length 0–3).

### StageSlotModifiers.test.ts

Test cases (use a seeded or mock RNG for deterministic tests):
- Count weights `{ 0: 1, 1: 0, 2: 0, 3: 0 }` always produces 0 modifiers
- Count weights `{ 0: 0, 1: 1, 2: 0, 3: 0 }` always produces 1 modifier
- Count weights `{ 0: 0, 1: 0, 2: 0, 3: 1 }` always produces 3 modifiers
- Generated slot indices are unique
- Slot indices are in range 0–7
- Premium cap: never more than 1 premium modifier
- Weight 0 global: modifier with `defaultWeight: 0` never appears
- Stage override weight 0: modifier never appears on that stage
- Stage override weight > 0: modifier can appear even if global weight is 0
- Common modifiers can repeat across slots within one stage
- All-weights-zero for a roll throws (if needed — depends on validation guarantees)

### StageRuntime.ts Changes

**Interface change:**
```ts
interface StageRuntime {
  // ... existing fields ...
  slotModifiers: SlotModifierAssignment[];
}
```

**Factory function change:**
```ts
function createStageRuntime(
  stageConfig: StageConfig,
  random?: () => number,
): StageRuntime
```

The function now extracts `totalWaves` and `initialCoins` from `stageConfig`. All existing logic for phase, chrono, and build state remains unchanged.

After creating the runtime object, call `generateStageSlotModifiers(random ?? Math.random, stageConfig, SLOT_MODIFIER_CONFIG.modifiers)` and assign the result to `runtime.slotModifiers`.

**Loadout export:**
`getStageCombatLoadoutSlots()` should also return modifier data. Add a new export or extend the existing one:

```ts
function getStageSlotModifiers(runtime: StageRuntime): SlotModifierAssignment[] {
  return runtime.slotModifiers;
}
```

**Backward compatibility for existing callers:**
- `StageScene.ts` calls `createStageRuntime({ totalWaves: 3, initialCoins: 6 })` — this must be updated to pass a `StageConfig`. Use the first entry from `STAGE_CONFIGS`.
- `StageScene.test.ts` — update all `createStageRuntime` calls to use a `StageConfig`.

### Update StageScene.ts Call Site

In `StageScene.ts` (around line 120), change:
```ts
this.runtime = createStageRuntime({
  totalWaves: someValue,
  initialCoins: someValue,
});
```
To:
```ts
import { STAGE_CONFIGS } from '@config/StageConfig';
this.runtime = createStageRuntime(STAGE_CONFIGS[0]);
```

**Important:** Preserve the existing values of `totalWaves` and `initialCoins` from the current call site when constructing the MVP `StageConfig` in task 01. Do NOT change gameplay numbers in this task.

### Update StageScene.test.ts

Update all `createStageRuntime(...)` calls to use `STAGE_CONFIGS[0]` (or a minimal inline StageConfig for test purposes).

## Acceptance Criteria

- [ ] `generateStageSlotModifiers()` produces correct modifier assignments for all count weight configurations
- [ ] Generated assignments have unique slot indices in range 0–7
- [ ] Premium cap is enforced (≤ 1 premium per stage)
- [ ] Weight-based selection works correctly (global defaults and stage overrides)
- [ ] All `StageSlotModifiers.test.ts` tests pass
- [ ] `StageRuntime` interface has `slotModifiers: SlotModifierAssignment[]`
- [ ] `createStageRuntime(stageConfig)` accepts a `StageConfig` and populates `slotModifiers`
- [ ] `getStageSlotModifiers()` exports modifiers alongside loadout
- [ ] `StageScene.ts` and `StageScene.test.ts` updated to pass `StageConfig`
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test:run` passes (including existing tests)
- [ ] No regression in stage creation, build phase, or combat phase

## Technical Notes

**RNG considerations:**
- The generation function takes `rng: () => number` as its first parameter for testability.
- Use the same RNG that `createStageRuntime` already receives (currently `Math.random` by default).
- Do NOT create a new RNG or seed system in this task.

**Weighted random selection:**
- Implement a simple weighted selection helper: sum all weights, roll `rng() * totalWeight`, iterate until cumulative weight exceeds roll.
- This is used for both count selection and modifier selection.

**Existing file changes — surgical only:**
- `StageRuntime.ts`: add field, change function signature, add generation call, add export. ~20 lines.
- `StageScene.ts`: change one call site. ~3 lines.
- `StageScene.test.ts`: update call sites. ~5-10 lines.
- Do NOT refactor or "improve" unrelated code in these files.

**The `StageConfig` import chain:**
- `StageRuntime.ts` imports `StageConfig` from `@config/StageConfig`
- `StageSlotModifiers.ts` imports `SlotModifierDefinition` from `@config/SlotModifierConfig` and `StageConfig` from `@config/StageConfig`

## Implementation Plan

1. Create `src/stage/StageSlotModifiers.ts`:
   - Define `SlotModifierAssignment` and `SlotModifierCountWeights` types
   - Implement `weightedRandomSelect<T>(items: T[], getWeight: (item: T) => number, rng: () => number): T`
   - Implement `generateStageSlotModifiers()` following the algorithm above
   - Export types and function

2. Create `src/stage/StageSlotModifiers.test.ts`:
   - Create a helper `mockRng(sequence: number[]): () => number` that returns predetermined values
   - Write tests for each acceptance criterion
   - Run tests to verify

3. Update `src/stage/StageRuntime.ts`:
   - Import `SlotModifierAssignment` from `./StageSlotModifiers`
   - Import `StageConfig` from `@config/StageConfig`
   - Import `SLOT_MODIFIER_CONFIG` from `@config/SlotModifierConfig`
   - Import `generateStageSlotModifiers` from `./StageSlotModifiers`
   - Add `slotModifiers: SlotModifierAssignment[]` to `StageRuntime` interface
   - Change `CreateStageRuntimeOptions` to accept `StageConfig` (or replace entirely)
   - In `createStageRuntime()`, extract `totalWaves` and `initialCoins` from `stageConfig`, generate modifiers
   - Add `getStageSlotModifiers()` export

4. Update `src/scenes/stage/StageScene.ts`:
   - Import `STAGE_CONFIGS` from `@config/StageConfig`
   - Change `createStageRuntime({...})` call to `createStageRuntime(STAGE_CONFIGS[0])`

5. Update `src/scenes/stage/StageScene.test.ts`:
   - Update all `createStageRuntime(...)` calls

6. Run full validation:
   - `npx tsc --noEmit`
   - `npm run test:run`
   - Fix any test failures

## Blocked By

- Blocked by 01-modifier-config (needs `SlotModifierDefinition`, `StageConfig`, `SLOT_MODIFIER_CONFIG`, `STAGE_CONFIGS`)

## Type

AFK

## Design Spec Reference

- [Stage Generation Flow](../design-spec.md#stage-generation-flow)
- [Standing Rules](../design-spec.md#standing-rules)
- [State Model — Persistent During a Stage](../design-spec.md#persistent-during-a-stage)
- [Invariants](../design-spec.md#invariants)
- [StageRuntime — Major Runtime Pieces](../design-spec.md#major-runtime-pieces)
- [Stage Config Schema](../design-spec.md#stage-config-schema)
- [Validation and Testing](../design-spec.md#validation-and-testing)
- [Integration Points — StageRuntime.ts](../design-spec.md#existing-files--light-changes-only)
- [Data Flow — Generation Path](../design-spec.md#generation-path)
