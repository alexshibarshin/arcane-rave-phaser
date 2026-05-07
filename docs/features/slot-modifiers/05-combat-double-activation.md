# 05 — Double Activation

## Task Intent

Implement the `Double activation` premium modifier — a slot effect that repeats the slot's activation twice back-to-back within a single beat. This is the most mechanically distinctive premium modifier and a key build-around moment for players.

After this task:
- `CombatSlotModifierResolver` returns `doubleActivation: true` for the `double-activation` modifier.
- `CombatDoubleActivation.ts` contains the double-activation sequencing logic.
- `resolveCombatActivations` detects the flag and delegates to the double-activation module.
- The record performs a small visual "rebound" (vinyl snaps backward, needle re-reads) between the two activations.

## Relevant Context

**From the Design Spec — Double Activation Rules:**
- Performs two real activations back-to-back within one beat.
- The second activation resolves against the updated combat state after the first.
- No special-case protection for finisher — if it spends notes on first activation, second uses what remains.
- This asymmetry is desired.
- Not a separate global time-control action — logically one beat.
- Visual: the record snaps slightly backward after the first activation and the needle re-reads the slot.

**From the Design Spec — Implementation Contract:**
- `CombatSlotModifierResolver` returns `doubleActivation: true` in mutations.
- Caller (`resolveCombatActivations`) checks the flag and calls `resolveDoubleActivation()`.
- The resolver is stateless — each activation call re-evaluates against current state.

**From the Design Spec — v1 Interaction:**
- v1 prohibits multiple modifiers per slot, so a double-activation slot has no other modifier.
- The resolver is called independently for each activation — this contract is already correct for future modifier stacking.

**Current code:**
- `CombatRotation.ts` has `rewindCombatRotation()` — can be used for the visual rebound.
- `resolveCombatActivations()` iterates `crossings` and resolves each slot once.

## In Scope

- `CombatSlotModifierResolver.ts` — handle `double-activation` effect kind
- `src/combat/CombatDoubleActivation.ts` — double activation sequencing module
- `CombatActivation.ts` — wire double-activation check into `resolveCombatActivations`
- Vinyl rebound visual via `rewindCombatRotation`
- Tests for double activation mechanics

## Out of Scope

- Note-output modifiers on double-activation slots (impossible in v1 — single modifier per slot)
- Build UI rendering or icons
- Any changes to `CombatRotation` beyond calling the existing `rewindCombatRotation`

## Detailed Requirements

### CombatSlotModifierResolver.ts — Extend

Add handling for `double-activation` effect kind:
- `doubleActivation = true`
- All other fields at defaults (no note bonuses, no archetype effects).

The `double-activation` modifier is premium, so it's the only modifier on its slot in v1. The resolver doesn't need to handle interactions with other modifiers.

### CombatDoubleActivation.ts

```ts
function resolveDoubleActivation(
  runtime: CombatRuntime,
  slotIndex: number,
  pawn: CombatPawnDefinition,
  crossings: CombatSlotCrossing[], // the same crossings array from resolveCombatActivations
): void
```

**Sequencing logic:**

1. Complete the first activation (already done by `resolveCombatActivations` before calling this function — the standard activation has already fired once for this slot).
2. Apply the vinyl rebound visual:
   - Call `rewindCombatRotation(runtime, rewindAngleDeg)` where `rewindAngleDeg` is a small configurable value (e.g., the angular span of one slot: `360 / 8 = 45` degrees, or a smaller value like `15` degrees that reads better visually).
   - The rewind should be quick and snap-like — it doesn't need a new animation system; a rapid rotation change is sufficient for v1.
3. Run the activation a second time:
   - Re-read the slot's pawn from `runtime.slots[slotIndex]` (state may have changed).
   - Call `resolvePawnAbility()` and `applyNoteRuleMutation()` again — these are the same functions used in the first activation.
   - The second activation uses the current combat state (note packet, enemy HP, buffs, etc.) as mutated by the first activation.

**Important constraints:**
- Do NOT recurse into another double-activation check. The second activation should NOT trigger a third. Either pass a flag or simply check the modifier only on the first activation.
- Emit the same events as a normal activation (`combat:slot-activated`, `combat:pawn-resolved`, etc.) so VFX and HUD respond correctly to both activations.

### CombatActivation.ts — Wire

In `resolveCombatActivations()`, after the main activation resolves for a slot:

```ts
// After resolvePawnAbility() and applyNoteRuleMutation() and consumePendingSlotDamageBuff()

const mutations = resolveSlotModifierMutations(runtime, slot.slotIndex);

if (mutations.doubleActivation) {
  resolveDoubleActivation(runtime, slot.slotIndex, pawn, crossings);
}
```

**Note:** The resolver is called AFTER the first activation completes. This is correct — the first activation mutates combat state, and the resolver is stateless. For double-activation, the resolver always returns `true`, so the order doesn't matter. For future modifiers that might inspect state, post-activation resolution is the right default.

Actually, looking at the activation flow more carefully: `applyNoteRuleMutation` should already call the resolver to get `bonusNotes`. For the current task, `applyNoteRuleMutation` for a double-activation slot returns default mutations (no note bonus). The double-activation check is separate.

**Simplified approach:**
1. `applyNoteRuleMutation` calls resolver → gets `bonusNotes` (which is 0 for this slot).
2. After the full activation resolves, `resolveCombatActivations` calls resolver again → gets `doubleActivation: true`.
3. If true, calls `resolveDoubleActivation()`.

This means the resolver is called twice for double-activation slots. That's fine — it's cheap and stateless.

**Alternative simpler approach (recommended):**
Call the resolver once before activation, store mutations, use them throughout:

```ts
const mutations = resolveSlotModifierMutations(runtime, slot.slotIndex);

// Pass mutations.bonusNotes to applyNoteRuleMutation
// After activation, check mutations.doubleActivation
```

This integrates cleanly with the pattern from task 03.

### Visual Rebound

The `rewindCombatRotation` function already exists. Check its signature and call it with a small angle (try `360 / 8 = 45` degrees first, tune down if it looks too aggressive). The rewind should be nearly instantaneous — the player should see a brief snap, not a slow animation.

No new animation or tween system is needed for v1. A direct rotation change on the record state is sufficient.

### Tests

- Slot with `double-activation` modifier triggers two activations
- Second activation uses updated note packet state (after first activation's mutation)
- Finisher with `double-activation`: first activation consumes notes, second activation sees depleted/empty packet
- Generator with `double-activation`: first activation adds notes, second activation sees the augmented packet
- Double activation does NOT recurse (no third activation)
- Slot without modifier activates once (normal behavior unchanged)
- Slot with `+1 output note` modifier (task 03) still works correctly alongside double-activation infrastructure
- Vinyl rebound: `rewindCombatRotation` is called with the expected angle

## Acceptance Criteria

- [ ] `resolveSlotModifierMutations()` returns `doubleActivation: true` for the `double-activation` modifier
- [ ] `resolveDoubleActivation()` runs a second full activation of the same slot
- [ ] Second activation uses updated combat state (note packet, enemy state) from first activation
- [ ] Finisher double-activation: second cast uses whatever packet remains
- [ ] No recursive double-activation (second cast does not trigger a third)
- [ ] Visual rebound: `rewindCombatRotation` is called between activations on double-activation slots
- [ ] Normal (non-double) slots activate exactly once — no regression
- [ ] Events are emitted for both activations (HUD/VFX see both)
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass
- [ ] New double-activation tests pass

## Technical Notes

**Preventing recursion:**
The simplest mechanism: the `resolveDoubleActivation` function directly calls `resolvePawnAbility` and `applyNoteRuleMutation` without going through `resolveCombatActivations` again. This naturally prevents re-checking the modifier. The double-activation path is a direct call to the activation primitives, not a re-entry into the dispatcher.

**Angle for rewind:**
Check `CombatRotation.ts` for `rewindCombatRotation`'s signature. The function likely takes an angle in degrees. Start with `45` degrees (one slot width) and tune. If `rewindCombatRotation` doesn't exist under that exact name, search for rotation manipulation functions.

**Event emission:**
The second activation should emit the same events as a normal activation. Check what `resolvePawnAbility` and `applyNoteRuleMutation` already emit — if they use `pushCombatRuntimeEvent` internally, the second activation automatically emits events. No extra wiring needed.

**Double activation slots and note-output bonuses:**
In v1, a double-activation slot has ONLY the double-activation modifier (single modifier per slot). So `bonusNotes` is always 0 for these slots. Don't add logic to handle combined modifiers — that's future work.

## Implementation Plan

1. Extend `src/combat/CombatSlotModifierResolver.ts`:
   - Add `double-activation` case: set `doubleActivation: true`, all other fields defaults

2. Create `src/combat/CombatDoubleActivation.ts`:
   - Import `rewindCombatRotation` from `./CombatRotation`
   - Import `resolvePawnAbility` and `applyNoteRuleMutation` from `./CombatActivation` (if they're exported — if not, they need to be extracted or the double activation logic lives in CombatActivation.ts)
   - **Important:** Check if `resolvePawnAbility` and `applyNoteRuleMutation` are exported. If they're module-private, the double activation logic should be added directly in `CombatActivation.ts` instead of a separate module.
   - Implement `resolveDoubleActivation()` following the sequencing logic above

3. Update `src/combat/CombatActivation.ts`:
   - In `resolveCombatActivations()`: resolve mutations once before activation, pass `bonusNotes` to note mutation, check `doubleActivation` flag after activation
   - If `doubleActivation` is true, call the double activation logic

4. Check `CombatRotation.ts` for the rewind function:
   - Verify `rewindCombatRotation` exists and accepts the needed parameters
   - If it doesn't exist, implement a minimal version: adjust `record.previousAngle` or `record.currentAngle` backward by the given degrees

5. Write tests:
   - Create `CombatDoubleActivation.test.ts` with test cases from the acceptance criteria
   - Test with controlled/mocked runtime state

6. Validate: `npx tsc --noEmit`, `npm run test:run`

## Blocked By

- Blocked by 03-combat-note-modifiers (needs `SlotModifierMutations` type, resolver infrastructure, activation integration pattern)

## Type

AFK

## Design Spec Reference

- [Double Activation Rules](../design-spec.md#double-activation-rules)
- [Premium Modifiers](../design-spec.md#premium-modifiers)
- [CombatDoubleActivation Module](../design-spec.md#combat-layer)
- [Combat Resolution Flow](../design-spec.md#combat-resolution-flow)
- [Visual Presentation — Vinyl Rebound](../design-spec.md#art-direction)
