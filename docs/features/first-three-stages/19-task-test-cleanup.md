# Test Cleanup and Final Validation

## Task Intent

Update, fix, or remove existing tests broken by the contract changes made in tasks 01–17. Add config validation invariants. Verify that `npx tsc --noEmit` and `npm run build` succeed. This is the final polish task — it ensures the project compiles cleanly and all existing tests either pass or are intentionally removed/updated.

After this task, the entire First Three Stages feature is validated and ready for playtesting.

## Relevant Context

This feature touched many modules and changed contracts:

- `StageConfig` — new fields, new types (`StageWaveDefinition`, `StageWavePreviewModel`)
- `StageFlowConfig` — changed economy numbers
- `CombatBalanceConfig` — removed enemy stat constants, added star thresholds, changed tier multiplier
- `CombatContentConfig` — replaced enemy definitions, updated pawn damages, removed ranged enemies
- `StageRuntime` — new constructor signature, stores config, builds enemy payload
- `StageFlowCoordinator` — uses stage config, new commands, new preview model
- `CombatRuntime` / `CombatEnemyRuntimeFactory` — new payload fields, HP overrides
- `CombatWaveConfig` — test waves reference removed enemy IDs
- `EventBus` — new event payload shapes
- `StageScene` — reads stageId, creates runtime from registry, handles return-to-lobby
- `BootScene` — starts lobby instead of stage

Tests that reference old interfaces, old constant values, old enemy IDs, or old flow behavior will fail.

## In Scope

- Fix or remove tests broken by changed contracts
- Update test expectations for economy numbers (INITIAL_COINS 50→25, MERGE_REWARD_COINS 4→3)
- Update test expectations for pawn damage numbers
- Fix `CombatWaveConfig.test.ts` — test waves may reference removed enemy IDs (`enemy-*-ranged`, `enemy-*-boss`). Update test wave data or expected counts.
- Fix `StageConfig.test.ts` — may reference old `StageConfig` shape
- Fix `SlotModifierConfig.test.ts` — may need updates for modifier staging behavior
- Fix `CombatContentConfig.test.ts` — enemy count changed (18→18, but composition changed)
- Fix `StageScene.test.ts` — may reference old scene creation
- Add config validation invariants as tests or runtime checks (not snapshot tests of specific numbers):
  - Elite wave is at index 4 (wave 5, 0-based)
  - Boss wave is at index 9 (wave 10, 0-based)
  - `specialEnemyId` on elite wave matches `stageConfig.eliteEnemyId`
  - `specialEnemyId` on boss wave matches `stageConfig.bossEnemyId`
  - `hpMultipliers.length === totalWaves`
  - `hpMultipliers` are monotonically non-decreasing
  - `slotModifierCountWeights` values are non-negative
  - All `specialEnemyId` references resolve to existing enemy definitions
  - No circular imports in config module graph
  - `totalWaves === waves.length`

## Out of Scope

- Writing new feature tests (that's separate work)
- Playwright/E2E tests
- Performance benchmarks
- Balance tuning based on test results
- Removing all tests that assert exact numbers (only fix the ones that broke due to intentional changes)

## Detailed Requirements

### Step 1: Audit — Find All Failing Tests

Run the test suite:
```bash
npm run test:run
```

Collect all failures. Categorize them:
1. **Expected changes**: Tests that assert old economy numbers, pawn damages, enemy HP, tier multipliers — update the expected values
2. **Contract changes**: Tests that call removed functions, use old types, or depend on old flow — update to new APIs or remove if obsolete
3. **Config validation**: Tests that validate enemy IDs no longer present — update config or remove assertions
4. **Unrelated**: Tests that were already broken before this feature — note them but don't fix (out of scope)

### Step 2: Fix by Category

**Economy values**: Any test referencing `INITIAL_COINS: 50`, `MERGE_REWARD_COINS: 4`, `PAWN_TIER_DAMAGE_MULTIPLIER: [1, 3, 8]` → update to new values.

**Pawn damages**: Any test asserting specific damage numbers → update. If the test is purely a snapshot of current balance (which the AGENTS.md says to avoid), weaken the assertion to an invariant (e.g., `> 0`) or remove it.

**Enemy definitions**: `CombatWaveConfig.test.ts` likely validates wave enemy IDs. After removing ranged and boss enemies, test waves with `enemy-red-ranged` will fail. Update test wave data to use valid enemy IDs.

**StageConfig tests**: May assert old `StageConfig` shape without `stageTags`, `eliteEnemyId`, etc. Update.

**StageRuntime tests**: May call `createStageRuntime` with old `StageConfig` shape. Update.

**Slot modifier tests**: May not account for weight overrides. If tests pass without overrides, they're fine. If they test specific modifier assignments, ensure they still pass.

### Step 3: Config Validation Invariants

Add validation to `StageRegistry` or a dedicated validation module:

```ts
function validateStageConfigs(configs: StageConfig[]): void {
  for (const config of configs) {
    // HP multipliers
    if (config.hpMultipliers.length !== config.totalWaves) {
      throw new Error(`Stage "${config.id}": hpMultipliers length (${config.hpMultipliers.length}) != totalWaves (${config.totalWaves})`);
    }
    
    for (let i = 1; i < config.hpMultipliers.length; i++) {
      if (config.hpMultipliers[i] < config.hpMultipliers[i - 1]) {
        throw new Error(`Stage "${config.id}": hpMultipliers not monotonically non-decreasing at index ${i}`);
      }
    }
    
    // Waves
    if (config.waves.length !== config.totalWaves) {
      throw new Error(`Stage "${config.id}": waves.length (${config.waves.length}) != totalWaves (${config.totalWaves})`);
    }
    
    // Elite at wave 5 (0-based index 4)
    if (config.waves.length >= 5) {
      const eliteWave = config.waves[4];
      if (eliteWave?.kind !== 'elite') {
        throw new Error(`Stage "${config.id}": wave 5 should be elite, got "${eliteWave?.kind}"`);
      }
      if (eliteWave?.specialEnemyId !== config.eliteEnemyId) {
        throw new Error(`Stage "${config.id}": wave 5 specialEnemyId "${eliteWave?.specialEnemyId}" != stage eliteEnemyId "${config.eliteEnemyId}"`);
      }
    }
    
    // Boss at wave 10 (0-based index 9)
    if (config.waves.length >= 10) {
      const bossWave = config.waves[9];
      if (bossWave?.kind !== 'boss') {
        throw new Error(`Stage "${config.id}": wave 10 should be boss, got "${bossWave?.kind}"`);
      }
      if (bossWave?.specialEnemyId !== config.bossEnemyId) {
        throw new Error(`Stage "${config.id}": wave 10 specialEnemyId "${bossWave?.specialEnemyId}" != stage bossEnemyId "${config.bossEnemyId}"`);
      }
    }
    
    // Slot modifier count weights non-negative
    for (const [key, value] of Object.entries(config.slotModifierCountWeights)) {
      if (value < 0) {
        throw new Error(`Stage "${config.id}": slotModifierCountWeights[${key}] is negative (${value})`);
      }
    }
    
    // Tags
    if (config.stageTags.length < 2 || config.stageTags.length > 4) {
      throw new Error(`Stage "${config.id}": stageTags count (${config.stageTags.length}) out of range [2,4]`);
    }
  }
}
```

Run this validation at config load time (in `StageRegistry` init).

### Step 4: TypeScript and Build

```bash
npx tsc --noEmit
npm run build
```

Both must succeed with zero errors.

## Acceptance Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] `npm run test:run` passes (all existing tests green, or failing tests are removed/updated with documented reasoning)
- [ ] Config validation catches:
  - [ ] Wrong HP multiplier length
  - [ ] Non-monotonic HP multipliers
  - [ ] Missing elite at wave 5
  - [ ] Missing boss at wave 10
  - [ ] Elite/boss enemy ID mismatch
  - [ ] Negative slot modifier weights
- [ ] No test asserts exact numeric values from balance configs (unless testing the config loading mechanism itself)
- [ ] No test references removed enemy IDs (`enemy-*-ranged`, `enemy-*-boss`)
- [ ] No test uses old `StageConfig` shape without new fields

## Technical Notes

- Follow the AGENTS.md testing principles: test invariants and behavior, not exact config values. If a test asserts `INITIAL_COINS === 50`, change it to `INITIAL_COINS > 0` or remove the assertion.
- If a test is fundamentally about old behavior that no longer exists (e.g., "stage uses global CombatWaveConfig"), remove it.
- If a test needs significant rewrite and the behavior it tests is covered by other tests or is trivial, consider removing it rather than rewriting.
- The `CombatWaveConfig.test.ts` may have hardcoded wave data for validation. If updating the test wave data is complex, consider simplifying the test or marking it for removal.
- Don't add new test files for the feature — this task is cleanup only. Full feature tests are a separate effort.

## Implementation Plan

1. Run `npm run test:run` to see current failures
2. Categorize failures by root cause
3. Fix the easiest first (economy numbers, tier multiplier assertions)
4. Fix enemy ID references in CombatWaveConfig test
5. Fix StageConfig test shape assertions
6. Fix StageRuntime/FlowCoordinator tests if they exist
7. Add config validation invariants to StageRegistry
8. Run `npx tsc --noEmit`, fix type errors
9. Run `npm run build`, fix build errors
10. Run `npm run test:run` again, verify all green
11. Document any intentionally removed tests in this task file

## Blocked By

- Blocked by 01-task-config-types-and-registry through 17-task-enemy-visual-differentiation (needs all feature changes to be in place before testing)

## Completion Notes

### Removed tests
- `src/ui/SpecialEnemyCard.test.ts` — removed. The test imported Phaser at module level (`import Phaser from 'phaser'`) which triggers `ReferenceError: window is not defined` in Node/Vitest. Fixing requires a complete mock chain for Phaser.GameObjects.Graphics (fillRect, strokeRect, fillCircle, strokeCircle, beginPath, moveTo, lineTo, closePath, strokePath, arc, fillTriangle, etc.), which is fragile and low-value — the test was unit-testing UI rendering with fully mocked objects. The production code (`SpecialEnemyCard.ts`) is testable via Playwright integration tests.

### Validation invariants added
- `validateStageConfigs()` in `src/config/StageRegistry.ts`, runs at module import time
- Checks: hpMultipliers length/totalWaves match, monotonic non-decreasing, wave counts, elite at wave 5, boss at wave 10, enemy ID match, slot modifier weights non-negative, stageTags count [2,4], enemy definition resolution

### Verification results
- `npx tsc --noEmit`: ✅ zero errors
- `npm run build`: ✅ success
- `npm run test:run`: ✅ 44/44 files, 332/332 tests pass

## Type

AFK

## Design Spec Reference

- [Validation and Testing](../design-spec.md#validation-and-testing)
- [Config Validation](../design-spec.md#config-validation)
- [Functional Checks](../design-spec.md#functional-checks)
- [Integration Checks](../design-spec.md#integration-checks)
- [Edge Case Checks](../design-spec.md#edge-case-checks)
- [Technical Constraints](../design-spec.md#technical-constraints)
- [Definition of Done](../design-spec.md#definition-of-done)
