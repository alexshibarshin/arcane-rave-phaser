# 06 — Extra Beam Modifier

## Task Intent

Implement the `+1 extra beam` slot modifier — when a beam-archetype pawn activates on a modified slot, a second beam instance is spawned with special targeting rules that prevent overlap with the first beam.

After this task:
- `CombatSlotModifierResolver` returns `extraBeamCount: 1` for the `beam-count-bonus` modifier.
- `CombatExtraBeam.ts` handles spawning the second beam with differentiated targeting.
- Lock-on beams target different enemies; sweeping beams sweep in opposite directions.
- If no valid second target/configuration exists, the second beam is gracefully skipped.

## Relevant Context

**From the Design Spec — Extra Beam Rules:**
- `+1 extra beam` spawns a second beam instance in addition to the normal beam.
- **Lock-on beam:** two beams MUST target different enemies.
  - First beam: `frontmost enemy` (normal behavior).
  - Second beam: `frontmost enemy` excluding the first beam's target.
  - If no second valid target exists, second beam is not created.
- **Sweeping beam:** two beams MUST sweep in opposite directions.
  - First beam: normal sweep direction (left-to-right in screen space).
  - Second beam: reverse sweep direction (right-to-left). Swap `sweepStartAngleRad` and `sweepEndAngleRad` (or negate the sweep arc).
- Both beams share the same: damage, duration, tick interval, source snapshot as the original activation.
- Each beam independently applies its own secondary effects (e.g., slow-on-hit from Frost Sweep).

**Current code:**
- `CombatBeams.ts` line 14: `createBeam(runtime, pawn, slotIndex, sourceSnapshot, damage, durationMs, tickIntervalMs, beamType, sweepArcDeg, sweepLengthPx, sweepHitRadiusPx)`
- `CombatBeams.ts` line 29: `const target = beamType === 'lock-on' ? selectFrontmostEnemy(runtime) : null` — target is selected INSIDE `createBeam`, not passed in.
- `CombatBeams.ts` line 54-55: sweep angles computed as `REF - halfArc` to `REF + halfArc` for normal sweep.
- `CombatTargeting.ts` line 11: `selectFrontmostEnemyExcluding(runtime, excludedRuntimeIds: string[])` already exists — can be used for lock-on second target.

**Problem:** `createBeam` hardcodes `selectFrontmostEnemy(runtime)` for lock-on target selection. The extra beam needs a different target. This requires a small surgical change to `createBeam` — add an optional `targetOverride` parameter.

## In Scope

- `CombatSlotModifierResolver.ts` — handle `beam-count-bonus` effect kind
- `src/combat/CombatExtraBeam.ts` — second beam spawning with targeting rules
- `CombatBeams.ts` — small change: accept optional `targetOverride` parameter
- `CombatActivation.ts` — wire extra beam spawning after beam ability resolves
- Tests for extra beam targeting

## Out of Scope

- More than one extra beam (the modifier's `extraBeamCount: 1` is used as-is; the code supports higher counts if authored later)
- Changes to secondary effect logic (each beam independently uses existing secondary effect code)
- Visual differentiation between the two beams beyond their different targets/directions

## Detailed Requirements

### CombatSlotModifierResolver.ts — Extend

Add handling for `beam-count-bonus` effect kind:
- Verify the pawn's `primaryArchetype` is `'beam'`. If not, return default mutations.
- `extraBeamCount = modifier.effectParams.extraBeamCount`
- All other fields at defaults.

### CombatBeams.ts — Small Surgical Change

Add optional `targetOverride` parameter to `createBeam`:

```ts
export function createBeam(
  runtime: CombatRuntime,
  pawn: CombatPawnDefinition,
  slotIndex: number,
  sourceSnapshot: CombatSourceSnapshot,
  damage: number,
  durationMs: number,
  tickIntervalMs: number | null,
  beamType: 'lock-on' | 'sweeping',
  sweepArcDeg: number | null,
  sweepLengthPx: number | null,
  sweepHitRadiusPx: number | null,
  targetOverride?: CombatEnemyRuntime | null,  // NEW
): void
```

**Logic change (line 29):**
```ts
const target = beamType === 'lock-on'
  ? (targetOverride ?? selectFrontmostEnemy(runtime))
  : null;
```

If `targetOverride` is provided (even if `null`), use it instead of calling `selectFrontmostEnemy`. This allows:
- Normal calls (no override) work exactly as before.
- Extra beam passes a specific target.
- If the override is `null` (no valid second target), `createBeam` returns early — no beam created.

### CombatExtraBeam.ts

```ts
function spawnExtraBeams(
  runtime: CombatRuntime,
  slotIndex: number,
  pawn: CombatPawnDefinition,
  ability: CombatBeamAbilityDefinition,
  sourceSnapshot: CombatSourceSnapshot,
  extraBeamCount: number,
): void
```

**Lock-on beam targeting:**
```ts
if (ability.pattern === 'lock-on-beam') {
  // First beam was already created by the normal activation flow.
  // Find its target from runtime.beams (the most recently created beam for this slot).
  const existingBeam = findLastBeamForSlot(runtime, slotIndex);
  const firstTargetId = existingBeam?.targetEnemyRuntimeId;

  if (!firstTargetId) {
    // No first target — create one extra beam targeting the frontmost enemy (fallback).
    createBeam(runtime, pawn, slotIndex, sourceSnapshot, ability.damage, ability.durationMs,
      ability.tickIntervalMs ?? null, 'lock-on', null, null, null,
      selectFrontmostEnemy(runtime));
    return;
  }

  // Select a DIFFERENT frontmost enemy for the second beam.
  const secondTarget = selectFrontmostEnemyExcluding(runtime, [firstTargetId]);

  if (!secondTarget) {
    // No valid second target — second beam is not created. This is intentional.
    return;
  }

  createBeam(runtime, pawn, slotIndex, sourceSnapshot, ability.damage, ability.durationMs,
    ability.tickIntervalMs ?? null, 'lock-on', null, null, null,
    secondTarget);
}
```

**Sweeping beam — reverse direction:**
```ts
if (ability.pattern === 'sweeping-beam') {
  const sweepArcDeg = ability.sweepArcDeg ?? DEFAULT_SWEEP_ARC_DEG;
  // Negate the arc for reverse sweep: swap start and end angles.
  // Instead of sweeping left-to-right, the second beam sweeps right-to-left.
  const reverseSweepArcDeg = -sweepArcDeg;

  createBeam(runtime, pawn, slotIndex, sourceSnapshot, ability.damage, ability.durationMs,
    ability.tickIntervalMs ?? null, 'sweeping',
    reverseSweepArcDeg, // Negative arc → reversed sweep
    ability.sweepLengthPx ?? null,
    ability.sweepHitRadiusPx ?? null);
}
```

**Helper — `findLastBeamForSlot`:**
Find the most recently created beam for a given slot in `runtime.beams`. Since beams are added in order, the last matching entry is the first beam from the current activation:

```ts
function findLastBeamForSlot(runtime: CombatRuntime, slotIndex: number): CombatBeamRuntime | undefined {
  for (let i = runtime.beams.length - 1; i >= 0; i--) {
    if (runtime.beams[i].slotIndex === slotIndex) {
      return runtime.beams[i];
    }
  }
  return undefined;
}
```

### CombatActivation.ts — Wire

In `resolveBeamAbility()` (or in `resolvePawnAbility` after calling `resolveBeamAbility`), check for extra beams:

```ts
resolveBeamAbility(runtime, slot, pawn, ability, sourceSnapshot);

// After normal beam creation, check for extra beams:
const mutations = resolveSlotModifierMutations(runtime, slot.slotIndex);
if (mutations.extraBeamCount > 0) {
  spawnExtraBeams(runtime, slot.slotIndex, pawn, ability, sourceSnapshot, mutations.extraBeamCount);
}
```

This requires the mutations to be available in `resolvePawnAbility()` — which aligns with the pattern from task 04 where mutations are resolved once before the switch statement.

### Tests

**Lock-on beam tests:**
- Slot with `+1 extra beam`, two or more enemies alive: two beams created, targeting different enemies
- Slot with `+1 extra beam`, only one enemy alive: one beam created (the normal one), second beam skipped
- First beam targets frontmost enemy, second beam targets the next frontmost (excluding first)
- Non-beam pawn on `+1 extra beam` slot: resolver returns default mutations, no extra beam

**Sweeping beam tests:**
- Slot with `+1 extra beam`, sweeping beam pawn: first beam sweeps normal direction, second beam sweeps reverse
- Reverse sweep: verify `sweepStartAngleRad` and `sweepEndAngleRad` are swapped relative to normal

**Shared behavior tests:**
- Both beams have the same damage, duration, tickInterval, sourceSnapshot
- Secondary effects (e.g., slow-on-hit) apply independently to each beam

## Acceptance Criteria

- [ ] `resolveSlotModifierMutations()` returns `extraBeamCount: 1` for `beam-count-bonus` on beam pawn
- [ ] `resolveSlotModifierMutations()` returns defaults for `beam-count-bonus` on non-beam pawn
- [ ] Lock-on: second beam targets a different enemy (via `selectFrontmostEnemyExcluding`)
- [ ] Lock-on: if only one enemy, second beam is not created (no crash, no dummy beam)
- [ ] Sweeping: second beam receives negated sweep arc (reverse direction)
- [ ] Both beams share the same damage, duration, tick interval, and source snapshot
- [ ] Existing beam behavior (no modifier) is unchanged
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass
- [ ] New extra beam tests pass

## Technical Notes

**Why modify `createBeam` instead of duplicating:**
The `createBeam` function is ~45 lines and initializes ~20 fields. Duplicating it would create 45 lines of near-identical code. Adding one optional parameter is a 2-line change and preserves the single source of truth for beam creation.

**Negating sweep arc for reverse direction:**
Current sweep: `startAngle = REF - halfArc, endAngle = REF + halfArc`. With negated `sweepArcDeg`: `halfArc = (-arcDeg * PI) / 360 = -(arcDeg * PI / 360)`. So `startAngle = REF - (-halfArc_nominal) = REF + halfArc_nominal`, `endAngle = REF + (-halfArc_nominal) = REF - halfArc_nominal`. The start and end are effectively swapped, producing a right-to-left sweep. This is mathematically clean — no special-case logic needed in `createBeam`.

**Secondary effects:**
Each beam instance gets its own `slowOnHit` field from the pawn's ability definition. `createBeam` already handles this — it reads secondary effects from the pawn definition passed to it. Both beams receive the same pawn definition, so both get the same secondary effect configuration. They apply independently at tick time.

**Lock-on beam target lifetime:**
The second beam's target is a different enemy. If that enemy dies, the existing beam retargeting logic in `advanceCombatBeams` will handle it — beams already retarget when their target dies. No special handling needed.

## Implementation Plan

1. Extend `src/combat/CombatSlotModifierResolver.ts`:
   - Add `beam-count-bonus` case: check `primaryArchetype === 'beam'`, set `extraBeamCount`

2. Update `src/combat/CombatBeams.ts`:
   - Add optional `targetOverride?: CombatEnemyRuntime | null` parameter to `createBeam`
   - Update the target selection line: use `targetOverride ?? selectFrontmostEnemy(runtime)`

3. Create `src/combat/CombatExtraBeam.ts`:
   - Import `createBeam` from `./CombatBeams`
   - Import `selectFrontmostEnemy`, `selectFrontmostEnemyExcluding` from `./CombatTargeting`
   - Implement `spawnExtraBeams()` with lock-on and sweeping branches
   - Implement `findLastBeamForSlot` helper

4. Update `src/combat/CombatActivation.ts`:
   - In `resolvePawnAbility()`: resolve mutations once before the switch (if not already done in task 04)
   - In `resolveBeamAbility()` call site: after normal beam creation, check `mutations.extraBeamCount > 0` and call `spawnExtraBeams()`

5. Write tests in `CombatExtraBeam.test.ts`:
   - Test lock-on targeting with 2+ enemies
   - Test lock-on targeting with 1 enemy (no second beam)
   - Test sweeping reverse direction
   - Test non-beam pawn (no effect)

6. Validate: `npx tsc --noEmit`, `npm run test:run`

## Additional Notes

**Edge case — two extra beams:**
The resolver returns `extraBeamCount` (currently 1). `spawnExtraBeams` receives the count and passes it. For future modifiers with `extraBeamCount > 1`, the function would need to select N different targets. For v1 with `extraBeamCount = 1`, this is simple. The function signature accepts a count to avoid a redesign later.

**Edge case — extra beam for non-lock-on, non-sweeping beams:**
The spec only defines two beam patterns: `lock-on-beam` and `sweeping-beam`. If a new pattern is added later, the extra beam logic would need updating. For now, handle both known patterns and add a fallthrough/no-op for unknown patterns.

## Blocked By

- Blocked by 03-combat-note-modifiers (needs `SlotModifierMutations` type, resolver infrastructure)

## Type

AFK

## Design Spec Reference

- [Extra Beam Rules](../design-spec.md#extra-beam-rules)
- [First Content Pool — Archetype Modifiers](../design-spec.md#common-archetype-modifiers)
- [CombatExtraBeam Module](../design-spec.md#combat-layer)
- [Failure Modes — Extra Beam Edge Cases](../design-spec.md#failure-modes-and-edge-cases)
