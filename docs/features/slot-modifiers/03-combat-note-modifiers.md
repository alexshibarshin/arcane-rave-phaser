# 03 — Combat Plumbing + Note-Output Modifiers

## Task Intent

Deliver the first combat-visible slot modifier behavior: note-output bonuses. This task creates the plumbing that carries modifier data into combat and implements the note-output mutation logic.

After this task:
- `CombatRuntime` stores per-slot modifier assignments.
- `CombatSlotModifierResolver` exists and resolves note-output mutations (`bonusNotes` + `colorFilter`).
- `CombatActivation` applies bonus notes during generator and finisher activation.
- `pushCombatFinisherOutputNoteEmitted` correctly reports dynamic note counts.
- `+1 output note`, `+2 output notes`, and color-specific note bonuses all work in combat.

This is the first true vertical slice: config → generation → runtime → combat activation.

## Relevant Context

**From the Design Spec — Note-Output Modifier Rules:**
- Note-output modifiers add bonus notes on top of normal generator/finisher output. Base logic is unchanged.
- Bonus is applied **before capacity clamping** as a single sum: `min(prevCount + 2 + bonusNotes, CAPACITY)` for same-color generator stacking, `min(1 + bonusNotes, CAPACITY)` for finishers.
- Color-specific notes check the activation's actual output color. For generators: `pawn.color`. For finishers: `pawn.outputNoteColor`.
- `+2 output notes` works identically but adds 2 instead of 1.

**From the Design Spec — CombatSlotModifierResolver:**
- Pure function: `resolveSlotModifierMutations(runtime, slotIndex) → SlotModifierMutations`.
- This task implements the `bonusNotes` and `colorFilter` fields of `SlotModifierMutations`.

**From the Design Spec — CombatActivation Changes:**
- `applyGeneratorPacketMutation` and `applyFinisherPacketMutation` accept `bonusNotes` parameter (default 0).
- The hardcoded `2` and `1` become base values; bonus is added before clamping.

**Current code locations:**
- `CombatActivation.ts` line 303: `applyGeneratorPacketMutation` — `let emittedNotes = 2`, `setCombatNotePacket(runtime, color, 2)`
- `CombatActivation.ts` line 336: `applyFinisherPacketMutation` — `setCombatNotePacket(runtime, pawn.outputNoteColor, 1)`
- `CombatActivation.ts` line 346: `pushCombatFinisherOutputNoteEmitted(runtime, slot, pawn.id, pawn.outputNoteColor)` — no count param
- `CombatRuntimeEvents.ts` line 240: `pushCombatFinisherOutputNoteEmitted` — hardcodes `count: 1`
- `CombatRuntimeEvents.ts` line 69: event type `combat:finisher-output-note-emitted` — payload has `count: 1`

**Current `createCombatRuntime` call chain:**
- `StageScene` calls `createCombatRuntime(random, { waveIndex, totalWaves, slotPawnIds, slotPawnTiers, chronoCurrent, chronoMax })`
- `CreateCombatRuntimeOptions` has: `waveIndex`, `totalWaves`, `slotPawns`, `slotPawnIds`, `slotPawnTiers`, `chronoCurrent`, `chronoMax`
- Combat slots are created in `resolveCombatLoadoutSlots()`

## In Scope

- `src/combat/CombatSlotModifierResolver.ts` — resolver function (first version: bonusNotes + colorFilter)
- `src/combat/CombatRuntime.ts` — add `slotModifiers` field and update `CreateCombatRuntimeOptions`
- `src/combat/CombatActivation.ts` — bonusNotes parameter, wire resolver, note-output mutations
- `src/combat/CombatRuntimeEvents.ts` — fix `pushCombatFinisherOutputNoteEmitted` signature and payload type
- `src/scenes/stage/StageScene.ts` — pass slot modifiers when creating combat runtime
- Tests for note-output modifier behavior

## Out of Scope

- Archetype modifiers (projectile, AoE radius) — task 04
- Double activation — task 05
- Extra beam — task 06
- Build UI rendering — tasks 07–08
- `CombatSlotModifierResolver` fields other than `bonusNotes` and `colorFilter`

## Detailed Requirements

### CombatRuntime.ts Changes

**Add to `CombatRuntime` interface:**
```ts
slotModifiers: Array<SlotModifierAssignment | null>; // indexed by slot index, null = unmodified
```

**Add to `CreateCombatRuntimeOptions`:**
```ts
slotModifiers?: SlotModifierAssignment[];
```

**In `createCombatRuntime()`:**
- Accept the new option and build the `slotModifiers` array (length 8, indexed by slot).
- For each modifier in `options.slotModifiers ?? []`, set `runtime.slotModifiers[assignment.slotIndex] = assignment`.
- All other indices remain `null`.

### CombatSlotModifierResolver.ts

```ts
interface SlotModifierMutations {
  bonusNotes: number;
  colorFilter: NoteColor | null;
  // Fields for tasks 04-06, defaulted here:
  projectileCountBonus: number;
  volleyShotCountBonus: number;
  radiusMultiplier: number;
  extraBeamCount: number;
  doubleActivation: boolean;
}

function resolveSlotModifierMutations(
  runtime: CombatRuntime,
  slotIndex: number,
): SlotModifierMutations
```

**Resolution logic for this task:**

1. Get `assignment = runtime.slotModifiers[slotIndex]`. If `null`, return default mutations (all zeros/false, `radiusMultiplier: 1.0`).
2. Get modifier definition via `SLOT_MODIFIER_CONFIG.getModifierById(assignment.modifierId)`.
3. Get pawn definition from `CombatContentConfig` via `runtime.slots[slotIndex].pawnId`.
4. Switch on `modifier.effectKind`:

   **`output-note-bonus`:**
   - `bonusNotes = modifier.effectParams.bonusNoteCount`
   - `colorFilter = null`

   **`color-output-note-bonus`:**
   - Determine the activation's output color:
     - If generator: `pawn.color`
     - If finisher: `pawn.outputNoteColor`
   - If output color matches `modifier.effectParams.targetColor`: `bonusNotes = modifier.effectParams.bonusNoteCount`
   - Otherwise: `bonusNotes = 0`
   - `colorFilter = modifier.effectParams.targetColor`

   **All other kinds:** return default mutations (will be implemented in tasks 04-06).

### CombatActivation.ts Changes

**`applyGeneratorPacketMutation`:**
- Add `bonusNotes = 0` parameter.
- Change base note count from `2` to `2 + bonusNotes` in all three branches:
  - Empty/different-color packet: `setCombatNotePacket(runtime, color, Math.min(2 + bonusNotes, CAPACITY))`
  - Same-color: `nextCount = Math.min(previousCount + 2 + bonusNotes, CAPACITY)`
  - Color break: `setCombatNotePacket(runtime, color, Math.min(2 + bonusNotes, CAPACITY))`
- `emittedNotes` calculation already uses `nextCount - previousCount` for same-color; for other branches use `Math.min(2 + bonusNotes, CAPACITY)` as the effective emitted count.

**`applyFinisherPacketMutation`:**
- Add `bonusNotes = 0` parameter.
- Change: `setCombatNotePacket(runtime, pawn.outputNoteColor, Math.min(1 + bonusNotes, CAPACITY))`
- Pass actual emitted count to `pushCombatFinisherOutputNoteEmitted`.

**`applyNoteRuleMutation`:**
- Before calling the mutation helpers, resolve slot modifier mutations via `resolveSlotModifierMutations(runtime, slot.slotIndex)`.
- Apply `colorFilter`: if set and the pawn's output color doesn't match, set `bonusNotes = 0` (the resolver already handles this, but the activation code should also check for safety).
- Pass `mutations.bonusNotes` to the mutation helper.

**In `resolveCombatActivations`:**
- After `applyNoteRuleMutation(runtime, slot, pawn)`, the modifier check already happens inside `applyNoteRuleMutation`. No additional call site change needed for this task.

### CombatRuntimeEvents.ts Changes

**`pushCombatFinisherOutputNoteEmitted`:**
- Add `count: number` parameter.
- Change `count: 1` to `count` in the payload.

**Event type `combat:finisher-output-note-emitted`:**
- Change payload type from `count: 1` to `count: number`.

### StageScene.ts — Pass Modifiers to Combat

In the method that creates combat runtime (search for `createCombatRuntime` call in `StageScene.ts`):
- Pass `slotModifiers: getStageSlotModifiers(this.runtime)` in the options.

## Acceptance Criteria

- [ ] `CombatRuntime.slotModifiers` is populated correctly (length 8, indexed by slot)
- [ ] `resolveSlotModifierMutations()` returns correct `bonusNotes` for `output-note-bonus` modifier
- [ ] `resolveSlotModifierMutations()` returns correct `bonusNotes` for `color-output-note-bonus` when color matches
- [ ] `resolveSlotModifierMutations()` returns `bonusNotes: 0` for `color-output-note-bonus` when color doesn't match
- [ ] Generator with `+1 output note` emits 3 notes (was 2)
- [ ] Generator with `+2 output notes` emits 4 notes (was 2)
- [ ] Finisher with `+1 output note` emits 2 notes (was 1)
- [ ] Same-color stacking with bonus notes respects `NOTE_PACKET_CAPACITY` (5)
- [ ] Red generator on slot with `+1 red output note` gets bonus
- [ ] Blue finisher with `outputNoteColor: 'red'` on slot with `+1 red output note` gets bonus
- [ ] Red finisher with `outputNoteColor: 'blue'` on slot with `+1 red output note` does NOT get bonus
- [ ] `pushCombatFinisherOutputNoteEmitted` receives correct `count` for bonus-augmented activations
- [ ] `npx tsc --noEmit` passes
- [ ] Existing combat tests still pass
- [ ] New tests for note-output modifier behavior pass

## Technical Notes

**The `createCombatRuntime` call site:**
Search for `createCombatRuntime(` in `StageScene.ts`. The current call passes options like `waveIndex`, `totalWaves`, `slotPawnIds`, etc. Add `slotModifiers` to this options object.

**Clean separation:**
- `CombatSlotModifierResolver` is pure logic — no Phaser, no scene references. It takes `CombatRuntime` (which has all game state) and returns a plain object.
- `CombatActivation` consumes the mutations and applies them to the runtime.
- Do NOT put modifier logic directly in `CombatActivation.ts` — always delegate to the resolver.

**Bonus notes and clamping — the exact formula:**
```
For generator, no packet or different color:
  nextCount = min(2 + bonusNotes, NOTE_PACKET_CAPACITY)

For generator, same color:
  nextCount = min(previousCount + 2 + bonusNotes, NOTE_PACKET_CAPACITY)

For finisher:
  nextCount = min(1 + bonusNotes, NOTE_PACKET_CAPACITY)
```

**Color matching for color-specific modifiers:**
- Generator: use `pawn.color` directly.
- Finisher: use `pawn.outputNoteColor` from `CombatFinisherPawnDefinition`.
- The pawn type check (`pawn.type === 'generator'` / `'finisher'`) is already available in the activation code; the resolver needs the same check.

**Tests:**
- Create test cases in a new `CombatSlotModifierResolver.test.ts` (or inline in `CombatRuntime.test.ts` if that pattern is preferred — check existing test structure).
- Mock `CombatRuntime` with minimal state: `slotModifiers` array, `slots` with pawnId, `notePacket`.
- Use the `createCombatRuntime` test helpers from `CombatRuntime.test.ts` if available.

## Implementation Plan

1. Create `src/combat/CombatSlotModifierResolver.ts`:
   - Define `SlotModifierMutations` interface with all fields (default-d future ones)
   - Import `SLOT_MODIFIER_CONFIG` from `@config/SlotModifierConfig`
   - Import pawn lookup from `@config/CombatContentConfig`
   - Implement `resolveSlotModifierMutations()` — handle `output-note-bonus` and `color-output-note-bonus`, return defaults for other kinds
   - Export the function and types

2. Update `src/combat/CombatRuntime.ts`:
   - Import `SlotModifierAssignment` from `@stage/StageSlotModifiers`
   - Add `slotModifiers` field to `CombatRuntime` interface
   - Add `slotModifiers` to `CreateCombatRuntimeOptions`
   - Initialize in `createCombatRuntime()` — build the indexed array

3. Update `src/combat/CombatRuntimeEvents.ts`:
   - Change `pushCombatFinisherOutputNoteEmitted` signature to `(runtime, slot, pawnId, color, count)`
   - Update the payload to use the `count` parameter
   - Update the event type definition

4. Update `src/combat/CombatActivation.ts`:
   - Import `resolveSlotModifierMutations` from `./CombatSlotModifierResolver`
   - Add `bonusNotes = 0` param to `applyGeneratorPacketMutation` — update all three branches
   - Add `bonusNotes = 0` param to `applyFinisherPacketMutation` — update setCombatNotePacket call and the event push
   - In `applyNoteRuleMutation`: call resolver, pass `mutations.bonusNotes` to helpers
   - Ensure `pushCombatFinisherOutputNoteEmitted` receives the actual emitted count

5. Update `src/scenes/stage/StageScene.ts`:
   - Import `getStageSlotModifiers` from `@stage/StageRuntime`
   - Pass `slotModifiers: getStageSlotModifiers(this.runtime)` to `createCombatRuntime()`

6. Create tests:
   - `CombatSlotModifierResolver.test.ts`: test each effect kind's mutation output
   - Verify existing tests pass

7. Validate: `npx tsc --noEmit`, `npm run test:run`

## Blocked By

- Blocked by 01-modifier-config (needs `SLOT_MODIFIER_CONFIG` types)
- Blocked by 02-stage-generation (needs `SlotModifierAssignment` type, `getStageSlotModifiers()`, and `StageRuntime.slotModifiers` populated)

## Type

AFK

## Design Spec Reference

- [Note-Output Modifier Rules](../design-spec.md#note-output-modifier-rules)
- [Modifier Compatibility Model](../design-spec.md#modifier-compatibility-model)
- [CombatSlotModifierResolver](../design-spec.md#combat-layer)
- [CombatActivation Changes](../design-spec.md#existing-files-that-need-light-changes)
- [CombatRuntimeEvents Changes](../design-spec.md#existing-files-that-need-light-changes)
- [Combat Resolution Flow](../design-spec.md#combat-resolution-flow)
- [Transition into Combat](../design-spec.md#transition-into-combat)
- [Runtime Application](../design-spec.md#runtime-application)
