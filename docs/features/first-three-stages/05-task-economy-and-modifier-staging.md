# Economy Rebalance and Slot Modifier Staging

## Task Intent

Update the in-stage economy numbers in `StageFlowConfig` to match the new balance curve, make the reroll cost increment configurable (not hardcoded `+1`), and configure slot modifier count weights and pool restrictions per stage so that Stage 1 always has 0 modifiers, Stage 2 gets 1–2 from a simple pool, and Stage 3 gets exactly 3 from the full pool.

After this task, the player starts with 25 coins (enough for 4–5 slots wave 1), merges grant 3 coins (less than purchase cost of 5), and reroll costs scale by a configurable increment. Slot modifier generation respects per-stage counts and pool filters.

## Relevant Context

### Economy Changes

| Parameter | Old | New | Reason |
|-----------|-----|-----|--------|
| `INITIAL_COINS` | 50 | 25 | Fill ~4–5 slots wave 1, not all 8 |
| `WAVE_CLEAR_REWARD_COINS` | 15 | 15 | Unchanged |
| `MERGE_REWARD_COINS` | 4 | 3 | Less than purchase cost (5), so merging for economy isn't free |
| `SHOP_PURCHASE_COST` | 5 | 5 | Unchanged |
| `SHOP_REROLL_BASE_COST` | 1 | 1 | Unchanged |
| `SHOP_REROLL_INCREMENT` | **(new)** | 1 | Was hardcoded +1 in reroll logic |
| `REPOSITION_COST` | 1 | 1 | Unchanged |
| `SHOP_OFFER_COUNT` | 3 | 3 | Unchanged |
| `MAX_PAWN_TIER` | 3 | 3 | Unchanged |

Reroll cost formula: `baseCost + rerollCount × increment`. Reroll count resets each build phase.

### Slot Modifier Staging

| Stage | Count Weights `[w0,w1,w2,w3]` | Pool | Notes |
|-------|------------------------------|------|-------|
| 1 | `[1, 0, 0, 0]` | n/a | Always 0 modifiers |
| 2 | `[0, 7, 3, 0]` | simple | Boosted simple modifiers only |
| 3 | `[0, 0, 0, 1]` | full | 3 modifiers from full pool |

**Stage 2 simple pool** — allowed modifiers with boosted weight:
- `plus-one-projectile` — boosted
- `plus-fifty-aoe-radius` — boosted
- `plus-one-output-note` — boosted
- `plus-one-red-output-note` — default weight
- `plus-one-green-output-note` — default weight
- `plus-one-blue-output-note` — default weight

**Stage 2 hidden** (weight set to 0 via overrides):
- `double-activation`
- `plus-two-output-notes`
- `plus-one-extra-beam`

## In Scope

- Add `SHOP_REROLL_INCREMENT: 1` to `StageFlowConfig`
- Update `INITIAL_COINS` to 25
- Update `MERGE_REWARD_COINS` to 3
- Update `getStageRerollCost` in `StageBuild.ts` to use `SHOP_REROLL_INCREMENT` from config instead of hardcoded `+1`
- Set appropriate `slotModifierCountWeights` per stage in their configs (tasks 10–12 will apply these, but the mechanism must work)
- Implement `slotModifierWeightOverrides` support — the `SlotModifierAssignment` module already accepts `weightOverrides?: Record<string, number>`. Ensure it works correctly when overrides set weights to 0 (hiding modifiers) or > default (boosting).
- Stage 1 config gets `slotModifierCountWeights: {0: 1, 1: 0, 2: 0, 3: 0}` and no weight overrides
- Stage 2 config gets `slotModifierCountWeights: {0: 0, 1: 7, 2: 3, 3: 0}` and weight overrides that zero out premium + beam modifiers while boosting simple ones
- Stage 3 config gets `slotModifierCountWeights: {0: 0, 1: 0, 2: 0, 3: 1}` and no weight overrides (uses default weights)

## Out of Scope

- Creating actual stage config files (tasks 10–12) — but this task makes the values correct so those tasks just plug them in
- Changing the reroll UI or shop card views
- Adding new slot modifier definitions
- Changing `SlotModifierAssignment` algorithm (it already supports weights and overrides — just needs correct inputs)

## Detailed Requirements

### StageFlowConfig Changes

```ts
export const StageFlowConfig = {
  INITIAL_COINS: 25,              // was 50
  WAVE_CLEAR_REWARD_COINS: 15,   // unchanged
  MERGE_REWARD_COINS: 3,          // was 4
  SHOP_OFFER_COUNT: 3,           // unchanged
  SHOP_PURCHASE_COST: 5,         // unchanged
  SHOP_REROLL_BASE_COST: 1,      // unchanged
  SHOP_REROLL_INCREMENT: 1,      // NEW
  REPOSITION_COST: 1,            // unchanged
  MAX_PAWN_TIER: 3,              // unchanged
} as const;
```

### Reroll Cost Update

Find `getStageRerollCost` in `StageBuild.ts`. Currently it likely does:
```ts
return StageFlowConfig.SHOP_REROLL_BASE_COST + state.rerollCount;
```

Change to:
```ts
return StageFlowConfig.SHOP_REROLL_BASE_COST + state.rerollCount * StageFlowConfig.SHOP_REROLL_INCREMENT;
```

### Slot Modifier Weight Overrides

Verify `generateStageSlotModifiers` in `SlotModifierAssignment.ts` reads `stageConfig.slotModifierWeightOverrides` and applies them. If not, implement:

1. For each modifier definition, use `stageConfig.slotModifierWeightOverrides?.[mod.id] ?? mod.defaultWeight` as the effective weight
2. If effective weight is 0, the modifier is excluded from the pool
3. Normalize weights across remaining modifiers before selection

### Expected Config Values (to be used in tasks 10–12)

**Stage 1 (Redline Routine):**
```ts
slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 }
// No weight overrides needed — no modifiers are ever assigned
```

**Stage 2 (Blue Noise Rush):**
```ts
slotModifierCountWeights: { 0: 0, 1: 7, 2: 3, 3: 0 }
slotModifierWeightOverrides: {
  'plus-one-projectile': 12,       // boosted from 6
  'plus-fifty-aoe-radius': 12,     // boosted from 6
  'plus-one-output-note': 15,      // boosted from 10
  'plus-one-red-output-note': 10,  // default
  'plus-one-green-output-note': 10,
  'plus-one-blue-output-note': 10,
  'double-activation': 0,          // hidden
  'plus-two-output-notes': 0,      // hidden
  'plus-one-extra-beam': 0,        // hidden
}
```

**Stage 3 (Greenroom Collapse):**
```ts
slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 }
// No weight overrides — uses default weights from all 9 modifiers
```

## Acceptance Criteria

- [ ] `StageFlowConfig` has `SHOP_REROLL_INCREMENT: 1`
- [ ] `StageFlowConfig.INITIAL_COINS` is 25
- [ ] `StageFlowConfig.MERGE_REWARD_COINS` is 3
- [ ] `getStageRerollCost` uses `SHOP_REROLL_INCREMENT` from config, not hardcoded
- [ ] `SlotModifierAssignment` correctly applies `slotModifierWeightOverrides` (zero = hidden, boosted value = more likely)
- [ ] Slot modifier generation with count weights `{0: 1, 1: 0, 2: 0, 3: 0}` always produces 0 modifiers
- [ ] Slot modifier generation with count weights `{0: 0, 1: 0, 2: 0, 3: 1}` always produces 3 modifiers
- [ ] `npx tsc --noEmit` passes
- [ ] Existing slot modifier tests still pass or are updated

## Technical Notes

- The `SlotModifierAssignment.generateStageSlotModifiers` function takes `stageConfig` as a parameter. It already reads `stageConfig.slotModifierCountWeights`. Check if it also reads `stageConfig.slotModifierWeightOverrides` — it may already do so. Read the function before implementing.
- The `SlotModifierConfig.modifiers` array has `defaultWeight` on each modifier. The override mechanism should use `weightOverrides` to replace the `defaultWeight` for specific modifier IDs during pool construction.
- The `StageConfig` interface already has `slotModifierCountWeights` and `slotModifierWeightOverrides?`. This task ensures the override mechanism actually works end-to-end.

## Implementation Plan

1. Update `StageFlowConfig.ts` with new values (add `SHOP_REROLL_INCREMENT`, change `INITIAL_COINS` and `MERGE_REWARD_COINS`)
2. Find `getStageRerollCost` in `StageBuild.ts` (or wherever the reroll cost is calculated) and update to use config increment
3. Read `SlotModifierAssignment.ts` → verify `generateStageSlotModifiers` reads and applies `weightOverrides`
4. If weight overrides are not yet implemented, add them: build a weighted pool where each modifier's weight = `overrides[id] ?? defaultWeight`, skip modifiers with weight ≤ 0
5. Write or update a unit test that verifies:
   - Stage 1 weights always give 0 modifiers
   - Stage 3 weights always give 3 modifiers
   - Override weight of 0 excludes a modifier
6. Run `npx tsc --noEmit`

## Additional Notes

### Balance / Tuning

- The economy arc is: wave 1 → 4–5 slots filled, wave 2 → 6–7 slots, wave 3 → 7–8 slots plateau, wave 5 → 1–2 tier-2 pawns, wave 10 → 2–4 tier-2 + rare tier-3
- `INITIAL_COINS: 25` lets the player buy 5 pawns at 5 coins each, filling most but not all slots. The remaining 3 slots must be earned through wave clear rewards.
- `MERGE_REWARD_COINS: 3` means a merge costs 5 (purchase) and returns 3, net -2. This makes merging a strategic choice to improve pawn quality, not a coin farming tactic.

## Blocked By

- Blocked by 01-task-config-types-and-registry (needs `StageConfig` with `slotModifierWeightOverrides` field and `SlotModifierCountWeights` type)

## Type

AFK

## Design Spec Reference

- [Economy](../design-spec.md#economy)
- [Slot Modifier Staging](../design-spec.md#slot-modifier-staging)
- [Stage 1 Details](../design-spec.md#stage-1--redline-routine)
- [Stage 2 Details](../design-spec.md#stage-2--blue-noise-rush)
- [Stage 3 Details](../design-spec.md#stage-3--greenroom-collapse)
