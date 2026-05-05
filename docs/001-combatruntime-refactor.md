# ADR-001: Deepen Combat Runtime Around Real Seams

**Status:** Proposed (revised after code review)  
**Date:** 2026-05-05  
**Related:** [CONTEXT.md](../CONTEXT.md), [VISION.md](../VISION.md)

---

## 1. Review Summary

The previous draft of this ADR is stale.

It described `src/combat/CombatRuntime.ts` as a ~570-line god function and proposed a broad split into many small files. Since then, the codebase changed:

- `src/combat/CombatRuntime.ts` is now ~935 lines, not ~570.
- `src/scenes/combat/CombatScene.ts` is now ~1384 lines and depends on the combat runtime as a stable source of truth.
- New adjacent modules already exist:
  - `src/combat/CombatHudBridge.ts`
  - `src/combat/CombatHudEvents.ts`
  - `src/combat/CombatVfxEventBridge.ts`
  - `src/combat/CombatSceneLifecycle.ts`
  - `src/combat/CombatRenderModel.ts`
  - `src/combat/CombatEnemyRuntimeFactory.ts`

This matters because the old plan aimed at a future architecture that no longer matches the code around the runtime.

### Current friction

#### 1.1. `CombatRuntime.ts` is still a shallow module

The module owns too many rules at one seam:

- runtime factory
- stage preview timing
- record rotation and slot crossing detection
- generator and finisher resolution
- note packet mutation
- enemy damage and death
- enemy movement and base attacks
- sub-wave activation and spawn bag processing
- victory / defeat evaluation
- the shape of `effects.pendingEvents`

The interface is still small in exported symbols, but the caller and the tests must understand too many internal invariants. That reduces **leverage** and **locality**.

#### 1.2. The event contract is spread across multiple modules

Today the combat event shape lives in several places:

- `EventMap` in `src/events/EventBus.ts`
- the inline union in `runtime.effects.pendingEvents`
- `CombatHudEventMap` in `src/combat/CombatHudBridge.ts`
- `CombatVfxEvent` in `src/combat/CombatVfxSystem.ts`

This is architectural friction. A new combat event requires edits in multiple files, and the runtime event seam is not explicit.

#### 1.3. The old split was too file-oriented

The previous ADR proposed modules like `CombatEnemyMovement.ts` and `CombatEnemyAttacks.ts`.

After review, that split fails the **deletion test**. Enemy movement and enemy attacks share one concept: enemy pressure on the `base` during the `combat phase`. Splitting them would mostly move coupling across files instead of concentrating it.

The same applies to a thin `CombatRuntimeAdvance.ts`. A pipeline file with one exported function and no real behaviour would be a shallow module.

#### 1.4. The runtime now has real downstream adapters

`CombatStateSystem`, `CombatHudEvents`, `CombatHudBridge`, `CombatVfxEventBridge`, `HUDScene`, and `CombatScene` already treat the runtime as the source of truth for the `combat phase`.

That means this refactor must preserve the outer interface and deepen the implementation behind it, rather than forcing a broad scene rewrite in the same pass.

---

## 2. Goal

Deepen the combat runtime so that the `combat phase` rules are concentrated into a small number of real modules, each with high **locality** and clear **leverage**, while preserving:

- `CombatRuntime` as the single mutable source of truth
- the fixed update order inside the combat loop
- the existing EventBus-based adapters for HUD and VFX
- current gameplay behaviour

This ADR is not about abstracting everything behind new interfaces. It is about moving real rule clusters behind better seams.

---

## 3. Decisions

### 3.1. Keep one mutable `CombatRuntime`

The runtime remains the authoritative state for the `combat phase`. We will not introduce immutable snapshots or deep-copy updates.

Reason:

- Phaser loop is sequential
- the current tests already treat runtime as the source of truth
- copying this state each frame would reduce clarity and add cost without adding leverage

### 3.2. Preserve frame order exactly

The runtime pipeline keeps its temporal contract:

1. advance preview or running clocks
2. activate pending sub-waves
3. reset frame-local combat effects
4. advance record rotation and collect slot crossings
5. resolve crossed slot activations
6. advance enemy pressure on the `base`
7. spawn enemies from active sub-waves
8. recalculate enemies remaining
9. evaluate victory / defeat

If we change this order, we change gameplay feel.

### 3.3. Add a real seam for combat runtime events

The runtime-owned event union becomes a named module instead of an inline type buried in `CombatRuntime.ts`.

This is a real seam because multiple adapters already depend on it:

- HUD publishing
- VFX publishing
- scene feedback
- tests

This seam should own:

- the `CombatRuntimeEvent` union
- helper functions for pushing typed events
- frame-local event queue reset helpers

### 3.4. Prefer deeper rule modules over micro-files

We will not split only by verb. We will split by rule cluster.

Examples:

- enemy movement + enemy attack cadence belong together in one module
- note packet mutation + pawn activation belong together in one module
- sub-wave activation + spawn bag draining belong together in one module

### 3.5. Keep EventBus as an outer adapter

This ADR does not replace EventBus with a new adapter.

Reason:

- there is only one real outer adapter today
- no second adapter exists yet
- adding a new seam here would be hypothetical, not real

### 3.6. `CombatScene` deepening is out of scope for this ADR

`CombatScene.ts` is large and deserves its own refactor, but this document focuses on the combat runtime and its immediate seams.

We should avoid coupling the runtime refactor to a large scene rewrite.

---

## 4. Target Module Structure

The target is not "many small files." The target is "a few deeper modules."

```text
src/combat/
├── CombatRuntime.ts
├── CombatRuntimeEvents.ts
├── CombatRotation.ts
├── CombatActivation.ts
├── CombatEnemyPressure.ts
├── CombatWaveRuntime.ts
└── CombatOutcome.ts
```

### 4.1. `CombatRuntime.ts`

Owns the public combat runtime interface:

- runtime types
- `createCombatRuntime()`
- `advanceCombatRuntime()`
- `setCombatState()`
- `setCombatNotePacket()`

Also owns only the minimum orchestration needed to preserve one public seam for callers.

This stays the caller-facing module because deleting it would leak combat loop ordering into callers and tests.

### 4.2. `CombatRuntimeEvents.ts`

Owns the runtime event seam:

- `CombatRuntimeEvent`
- `resetCombatFrameEffects(runtime)`
- typed helpers such as:
  - `pushCombatSlotActivated(...)`
  - `pushCombatEnemyHit(...)`
  - `pushCombatEnemyDied(...)`
  - `pushCombatNotePacketChanged(...)`
  - `pushCombatBaseDamaged(...)`

Benefits:

- one place to extend combat events
- better test surface
- less duplicated event-shape knowledge across modules

### 4.3. `CombatRotation.ts`

Owns:

- record angle advancement
- slot crossing detection
- ordering of crossings inside one frame

Public interface:

```ts
export interface CombatSlotCrossing {
  slotIndex: number;
  crossingAngle: number;
}

export function advanceCombatRotation(
  runtime: CombatRuntime,
  deltaMs: number,
): CombatSlotCrossing[];

export function detectCombatSlotCrossings(
  slot: CombatSlotRuntime,
  previousAngle: number,
  currentAngle: number,
): CombatSlotCrossing[];
```

This is a deep module because crossing logic is mathematical and independent, and the pure function gives high leverage to tests.

### 4.4. `CombatActivation.ts`

Owns one rule cluster:

- crossed `slot` activation
- pawn definition lookup
- generator damage
- finisher damage
- weakness resolution
- target selection
- note packet mutation
- event emission related to activation

Public interface:

```ts
export function resolveCombatActivations(
  runtime: CombatRuntime,
  crossings: CombatSlotCrossing[],
): void;
```

This is where the `record` interacts with `pawn`, `enemy`, `note packet`, and `weakness`.

That is one real concept, so it should stay together.

### 4.5. `CombatEnemyPressure.ts`

Owns one rule cluster:

- enemy movement toward the `base`
- transition from `moving` to `attacking`
- attack cadence while in range
- base damage application
- defeat trigger
- clamping enemies onto attack range

Public interface:

```ts
export function advanceCombatEnemyPressure(
  runtime: CombatRuntime,
  deltaMs: number,
): void;
```

This replaces the old idea of splitting movement and attacks into separate modules.

### 4.6. `CombatWaveRuntime.ts`

Owns one rule cluster:

- pending sub-wave activation
- spawn bag allocation
- enemy spawn timing
- spawn position selection
- enemies remaining calculation

Public interface:

```ts
export function activatePendingCombatSubWaves(
  runtime: CombatRuntime,
  random: () => number,
): void;

export function spawnCombatEnemies(
  runtime: CombatRuntime,
  random: () => number,
): void;

export function calculateCombatEnemiesRemaining(
  runtime: CombatRuntime,
): number;
```

This keeps all `wave` and spawn timing knowledge behind one seam.

### 4.7. `CombatOutcome.ts`

Owns:

- victory evaluation
- defeat evaluation helpers only if they are not already fully concentrated in `CombatEnemyPressure.ts`

Public interface:

```ts
export function evaluateCombatOutcome(runtime: CombatRuntime): void;
```

This module should stay small, but it is still a useful seam because outcome rules are explicit game rules.

---

## 5. What Changes Compared To The Previous Draft

### Removed from the plan

- `CombatRuntimeAdvance.ts`
- `CombatEnemyMovement.ts`
- `CombatEnemyAttacks.ts`
- `CombatSpawnManager.ts`

Reason:

- they would be too shallow
- they would increase file count faster than they increase leverage
- they would spread one rule cluster across several seams

### Added to the plan

- `CombatRuntimeEvents.ts`
- `CombatWaveRuntime.ts`
- explicit acknowledgement of existing downstream adapters

Reason:

- the event seam is now one of the main sources of friction
- sub-wave activation and spawning are one rule cluster in the current code
- the runtime refactor must fit the current architecture, not the older draft

---

## 6. Migration Plan

### Phase 0. Lock behaviour with characterization tests

Before moving logic, keep and extend the existing runtime tests around:

- preview to running transition
- multi-crossing frames
- generator packet mutation
- finisher packet mutation
- weakness damage
- enemy attack cadence through pause / resume
- sub-wave activation timing
- spawn gap randomness rules
- victory and defeat conditions

Goal:

- protect gameplay timing while modules move

### Phase 1. Extract `CombatRuntimeEvents.ts`

Move first:

- the `pendingEvents` union type
- event push helpers
- frame-local effect reset

Expected result:

- `CombatRuntime.ts` no longer owns inline event-shape noise
- tests can assert against one named event type
- HUD and VFX adapters can converge on the same event vocabulary

### Phase 2. Extract `CombatRotation.ts`

Move:

- `collectCrossingsForSlot`
- record angle advancement
- crossing sorting

Keep pure tests for:

- one crossing
- multiple crossings in one frame
- no crossing on reverse / paused paths

Expected result:

- better locality for `record` and `needle` math

### Phase 3. Extract `CombatActivation.ts`

Move:

- `processCrossedSlots`
- nearest enemy selection
- weakness resolution
- generator logic
- finisher logic
- note packet mutation helpers

Important:

- do not split packet mutation into its own module yet
- there is still only one real caller cluster: pawn activation

Expected result:

- tests for `generator` and `finisher` rules stop depending on unrelated spawn and pressure code

### Phase 4. Extract `CombatEnemyPressure.ts`

Move:

- `updateEnemyPressure`
- `updateEnemyBaseAttacks`
- `clampEnemyToAttackRange`
- any enemy-definition lookups used only for pressure

Expected result:

- all `enemy -> base` pressure logic concentrated in one place
- easier to change pressure pacing without touching `record` or `note packet` rules

### Phase 5. Extract `CombatWaveRuntime.ts`

Move:

- `activateSubWave`
- `activatePendingSubWaves`
- `bootstrapEnemySpawns`
- `selectEnemySpawnX`
- `calculateEnemiesRemaining`
- local shuffle helper if still only used here

Expected result:

- all `wave` timing and enemy entry rules behind one seam

### Phase 6. Extract `CombatOutcome.ts`

Move:

- `evaluateVictory`
- optional shared outcome helpers if needed after earlier phases

Expected result:

- end-of-wave rules become explicit and easy to review

### Phase 7. Shrink `CombatRuntime.ts` to orchestration plus public commands

Target responsibilities left in `CombatRuntime.ts`:

- types
- runtime factory
- public commands
- top-level frame order

Everything else should be implementation detail behind deeper modules.

---

## 7. Non-Goals

- Replacing EventBus
- Refactoring `CombatScene.ts` in the same ADR
- Reworking `HUDScene.ts`
- Changing gameplay timing
- Introducing polymorphic adapters where we only have one implementation

---

## 8. Expected Benefits

### Locality

- `record` math lives together
- `pawn` activation rules live together
- `enemy` pressure on the `base` lives together
- `wave` timing lives together
- combat event shape lives together

### Leverage

- tests can target smaller rule clusters through clearer seams
- future feature work can find the right module faster
- AI agents can navigate the `combat phase` by concept instead of scanning one giant file

### Safer follow-up refactors

After this ADR lands, a separate ADR can deepen `CombatScene.ts` without first untangling combat simulation logic again.

---

## 9. Acceptance Criteria

This refactor is complete when:

- `CombatRuntime.ts` no longer contains the full implementations of activation, enemy pressure, wave spawning, and crossing math
- combat runtime events are defined in one named module
- all current combat tests pass
- no gameplay timing changes are introduced
- callers still use the same top-level runtime seam:
  - `createCombatRuntime()`
  - `advanceCombatRuntime()`
  - `setCombatState()`
  - `setCombatNotePacket()`

---

## 10. Follow-Up ADR

After this work, open a separate ADR for deepening `src/scenes/combat/CombatScene.ts`.

That follow-up should evaluate seams around:

- static combat layout rendering
- enemy view orchestration
- VFX snapshot presentation
- combat result presentation
- scene-local animation state
