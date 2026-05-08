# Session Progress Store and Star Calculation

## Task Intent

Create two new modules: `SessionProgressStore` (in-memory singleton tracking best stage results across a browser session) and `calculateStageStars` (pure function mapping remaining base HP to 0–3 stars using configurable thresholds). These provide the persistence and scoring infrastructure that the lobby, result modal, and stage completion flow depend on.

After this task, the lobby can display stars per stage, the result modal can show earned stars, and repeated stage runs correctly preserve session-best results.

## Relevant Context

### Session Progress

Session progress is in-memory only — no localStorage, no serialization. Browser reload resets everything. This is intentional for the first vertical slice.

The store tracks:
- Per stage: `{ stars: 0–3, bestRemainingBaseHp: number | null }`
- Last selected stage ID (for restoring selection in the lobby)

Results are only written to the store when the new result is "better" than the old one:
- Defeat (0 stars) never overwrites a successful result
- Higher stars always win
- Same stars → higher remaining HP wins

### Star Calculation

Stars are calculated from remaining `baseHp` as a fraction of `maxBaseHp` (default 100 from `CombatBalanceConfig.BASE_HP`):

| Condition | Stars |
|-----------|-------|
| `> 90%` HP remaining | 3 ★★★ |
| `50% – 90%` HP remaining | 2 ★★☆ |
| `< 50%` (base alive) | 1 ★☆☆ |
| Base destroyed (0 HP) | 0 ☆☆☆ (defeat) |

Thresholds must be configurable (in `CombatBalanceConfig` — added in task 01), not hardcoded in the function.

## In Scope

- Create `src/session/SessionProgressStore.ts` with singleton API
- Create `src/session/calculateStageStars.ts` (or inlined in SessionProgressStore)
- Export both from a barrel or the session directory
- Define `StageResult` type
- Implement `isBetter` comparison logic

## Out of Scope

- Persistent storage (localStorage, IndexedDB, server save)
- Session progress for anything other than stages (no Chrono, coin, or build persistence)
- UI rendering of stars (tasks 14–16)
- Integration with `StageScene` or `LobbyScene` (task 13)

## Detailed Requirements

### StageResult Type

```ts
interface StageResult {
  stageId: string;
  stars: number;                        // 0–3
  bestRemainingBaseHp: number | null;   // null if never completed successfully
}
```

### SessionProgressStore API

```ts
const SessionProgressStore = {
  getResult(stageId: string): StageResult | null,
  setResult(stageId: string, result: StageResult): void,
  getLastSelectedStageId(): string | null,
  setLastSelectedStageId(stageId: string): void,
};
```

Implementation:
- `results`: `Map<string, { stars: number, bestRemainingBaseHp: number | null }>`
- `lastSelectedStageId`: `string | null`

`setResult` uses `isBetter` comparison:
```ts
function isBetter(newResult: StageResult, oldResult: StageResult | null): boolean {
  if (oldResult === null) return true;
  if (newResult.stars > oldResult.stars) return true;
  if (newResult.stars === oldResult.stars && 
      (newResult.bestRemainingBaseHp ?? 0) > (oldResult.bestRemainingBaseHp ?? 0)) return true;
  return false;
}
```

Edge cases:
- If `bestRemainingBaseHp` is null (never completed successfully), only write if new result has stars > 0
- Defeat (0 stars, 0 HP) sets `stars: 0` but preserves existing `bestRemainingBaseHp` if any

### calculateStageStars

```ts
function calculateStageStars(
  remainingBaseHp: number, 
  maxBaseHp: number,
  thresholds?: { threeStarMinRatio: number; twoStarMinRatio: number }
): { stars: number } {
  if (remainingBaseHp <= 0) return { stars: 0 };
  
  const ratio = remainingBaseHp / maxBaseHp;
  const t = thresholds ?? {
    threeStarMinRatio: CombatBalanceConfig.STAR_THRESHOLDS.THREE_STAR_MIN_RATIO,
    twoStarMinRatio: CombatBalanceConfig.STAR_THRESHOLDS.TWO_STAR_MIN_RATIO,
  };
  
  if (ratio > t.threeStarMinRatio) return { stars: 3 };
  if (ratio >= t.twoStarMinRatio) return { stars: 2 };
  return { stars: 1 };
}
```

Note: The spec says `> 90%` for 3 stars and `50%–90%` for 2 stars. So 90% exactly is 2 stars. Code should use `>` for the 3-star check, and `>=` for the 2-star check.

## Acceptance Criteria

- [ ] `SessionProgressStore` singleton exists with `getResult`, `setResult`, `getLastSelectedStageId`, `setLastSelectedStageId`
- [ ] `setResult` only writes when new result is better than old (higher stars, or same stars + higher HP)
- [ ] Defeat (0 stars) does not overwrite a prior successful result's HP
- [ ] `calculateStageStars` returns correct values for edge cases:
  - 100 HP / 100 max → 3 stars
  - 91 HP / 100 max → 3 stars
  - 90 HP / 100 max → 2 stars
  - 50 HP / 100 max → 2 stars
  - 49 HP / 100 max → 1 star
  - 1 HP / 100 max → 1 star
  - 0 HP / 100 max → 0 stars
- [ ] `calculateStageStars` uses configurable thresholds (defaults from config on task 01, overridable via parameter)
- [ ] All state is in-memory (no persistence layer)
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests pass for both modules

## Technical Notes

- The module should be at `src/session/` — a new directory. Create `src/session/SessionProgressStore.ts` and `src/session/calculateStageStars.ts`.
- The singleton pattern can be as simple as a module-level object (ES module singletons via `export const` are naturally singleton in Node/browser).
- Do NOT use `localStorage`, `sessionStorage`, or any serialization. Plain in-memory `Map` and variables.
- The store will be imported by `StageScene` (to write results) and `LobbyScene` (to read results). Keep the API simple and synchronous.
- Star thresholds reference `CombatBalanceConfig.STAR_THRESHOLDS` — this config was added in task 01. If task 01 hasn't been done yet, add it here temporarily (it'll be consolidated later).

## Implementation Plan

1. Create `src/session/` directory
2. Create `src/session/calculateStageStars.ts`:
   - Define the function with the signature above
   - Import thresholds from `CombatBalanceConfig`
   - Handle edge cases (0 HP, negative HP, maxBaseHp = 0)
3. Create `src/session/SessionProgressStore.ts`:
   - Define `StageResult` type
   - Implement the singleton object
   - Implement `isBetter` helper
   - Wire `setResult` to use `isBetter`
4. Write unit tests for both modules:
   - Test `calculateStageStars` with boundary values
   - Test `SessionProgressStore.setResult` with various scenarios (first write, upgrade, downgrade, defeat vs previous victory)
5. Run `npx tsc --noEmit` and tests

## Additional Notes

### Edge Cases

- What happens if `maxBaseHp` is 0 or negative? The function should return `{ stars: 0 }` or handle gracefully.
- What happens if `remainingBaseHp` exceeds `maxBaseHp` (base was healed above max)? Cap the ratio at 1.0.
- Store: getting a result for an unplayed stage returns `null`.

## Blocked By

None — can start immediately. Technically depends on task 01 for `STAR_THRESHOLDS` constants in `CombatBalanceConfig`, but can add them here if needed.

## Type

AFK

## Design Spec Reference

- [Star Rating](../design-spec.md#star-rating)
- [Session Progress Flow](../design-spec.md#session-progress-flow)
- [Result Comparison Logic](../design-spec.md#result-comparison-logic)
- [SessionProgressStore Contract](../design-spec.md#sessionprogressstore-contract)
- [State Model — Session Progress State](../design-spec.md#session-progress-state)
