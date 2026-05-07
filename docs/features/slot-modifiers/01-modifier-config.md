# 01 — Modifier Config + StageConfig Foundation

## Task Intent

Establish the authored content foundation for the slot modifier feature. This task creates two config modules:

1. **`SlotModifierConfig.ts`** — the authoritative catalog of all 9 slot modifier definitions, including IDs, rarity classes, global spawn weights, display metadata, effect kinds, and effect parameters. Includes a `validateSlotModifierConfig()` function that runs at import time and fails fast on misconfiguration.
2. **`StageConfig.ts`** — the `StageConfig` interface (the foundational data model for a stage run) and a const array of authored stage configs. Each entry defines: stage identity, wave count, economy, wave definitions, and slot modifier tuning (count weights + per-modifier weight overrides).

This is a pure config task — no runtime integration, no Phaser dependencies, no generation logic. The output is validated data that downstream tasks consume.

## Relevant Context

**From the Design Spec — Feature Scope:**
- 9 modifiers total: 4 common note-output, 3 common archetype, 2 premium.
- Two rarity classes: `common` and `premium`.
- Hard cap: at most 1 `premium` per stage.
- `+50% AoE radius` is intentionally cross-archetype (explosion + zone).

**From the Design Spec — Stage Config:**
- `StageConfig` combines waves, economy, and modifier tuning into one object.
- `createStageRuntime()` will accept a `StageConfig` instead of raw `{ totalWaves, initialCoins }`.
- For MVP there is one stage config. In the future, multiple configs power a stage-select screen.
- `waveDefinitions` replaces the current global `CombatWaveConfig.WAVES` over time. During transition, both coexist.

**Modifier Definition Schema:**
Each modifier must have: `id`, `rarity`, `defaultWeight`, `displayName`, `shortDescription`, `iconKey`, `effectKind`, `effectParams`.

## In Scope

- `src/config/SlotModifierConfig.ts` — modifier catalog, types, validation
- `src/config/SlotModifierConfig.test.ts` — config validation tests
- `src/config/StageConfig.ts` — `StageConfig` interface + `STAGE_CONFIGS` array
- Type exports: `SlotModifierEffectKind`, `SlotModifierEffectParams`, `SlotModifierDefinition`, `StageConfig`, `SlotModifierCountWeights`

## Out of Scope

- Generation logic (`StageSlotModifiers.ts`) — done in task 02
- StageRuntime changes — done in task 02
- Any runtime integration or Phaser code
- Editing existing `CombatWaveConfig.ts` (wave definitions co-exist during transition)
- Editing `createStageRuntime()` (done in task 02)

## Detailed Requirements

### SlotModifierConfig

**Types to define:**

```ts
type SlotModifierRarity = 'common' | 'premium';

type SlotModifierEffectKind =
  | 'output-note-bonus'
  | 'color-output-note-bonus'
  | 'projectile-bonus'
  | 'aoe-radius-scale'
  | 'beam-count-bonus'
  | 'double-activation';

type NoteColor = 'red' | 'green' | 'blue'; // reuse from CombatContentConfig if possible

interface SlotModifierDefinition {
  id: string;
  rarity: SlotModifierRarity;
  defaultWeight: number;
  displayName: string;
  shortDescription: string;
  iconKey: string;
  effectKind: SlotModifierEffectKind;
  effectParams: SlotModifierEffectParams;
}
```

**Effect params per kind (use a discriminated union or a shared interface):**

| effectKind | params |
|---|---|
| `output-note-bonus` | `{ bonusNoteCount: number }` |
| `color-output-note-bonus` | `{ bonusNoteCount: number; targetColor: NoteColor }` |
| `projectile-bonus` | `{ projectileCountBonus: number; volleyShotCountBonus: number }` |
| `aoe-radius-scale` | `{ radiusMultiplier: number }` |
| `beam-count-bonus` | `{ extraBeamCount: number }` |
| `double-activation` | `{ activationCount: number }` |

**The 9 modifier definitions:**

1. `plus-one-output-note` — common, `output-note-bonus`, `bonusNoteCount: 1`
2. `plus-one-red-output-note` — common, `color-output-note-bonus`, `bonusNoteCount: 1, targetColor: 'red'`
3. `plus-one-green-output-note` — common, `color-output-note-bonus`, `bonusNoteCount: 1, targetColor: 'green'`
4. `plus-one-blue-output-note` — common, `color-output-note-bonus`, `bonusNoteCount: 1, targetColor: 'blue'`
5. `plus-one-projectile` — common, `projectile-bonus`, `projectileCountBonus: 1, volleyShotCountBonus: 1`
6. `plus-fifty-aoe-radius` — common, `aoe-radius-scale`, `radiusMultiplier: 1.5`
7. `plus-one-extra-beam` — common, `beam-count-bonus`, `extraBeamCount: 1`
8. `plus-two-output-notes` — premium, `output-note-bonus`, `bonusNoteCount: 2`
9. `double-activation` — premium, `double-activation`, `activationCount: 2`

**Validation function — `validateSlotModifierConfig()`:**
- Every modifier ID is unique
- Every `effectKind` is a valid value from the union
- Every `effectKind` has the required params (not missing, not extra)
- Every `rarity` is `'common'` or `'premium'`
- Every `defaultWeight` is non-negative
- `color-output-note-bonus` — `targetColor` is a valid `NoteColor`
- `aoe-radius-scale` is the only cross-archetype effect kind in v1
- The function throws (or returns errors) on failure; call it at module load time

**Design decisions for the config module:**
- Export a const `SLOT_MODIFIER_CONFIG` object with a `modifiers: SlotModifierDefinition[]` array and a `getModifierById(id: string)` lookup helper.
- Export `PREMIUM_MODIFIER_IDS` as a derived const for use in generation logic.
- Modifier definitions are ordered from common to premium for readability.

### StageConfig

**Interface:**

```ts
interface StageConfig {
  id: string;
  displayName: string;
  totalWaves: number;
  initialCoins: number;
  waveDefinitions: CombatWaveDefinition[];
  slotModifierCountWeights: Record<0 | 1 | 2 | 3, number>;
  slotModifierWeightOverrides?: Record<string, number>;
}
```

**Details:**
- `waveDefinitions` — import `CombatWaveDefinition` from `CombatWaveConfig.ts`. For the MVP stage, reference the existing `CombatWaveConfig.WAVES` entries that match this stage's wave count.
- `slotModifierCountWeights` — must define keys 0, 1, 2, 3. All non-negative. At least one > 0.
- `slotModifierWeightOverrides` — optional. Keys are modifier IDs. Omitted keys use the modifier's `defaultWeight`. Weight `0` bans the modifier.

**MVP stage config:**
- One stage entry in `STAGE_CONFIGS`:
  - `id`: `'stage-1'`
  - `displayName`: `'First Contact'` (placeholder)
  - `totalWaves`: use the current number of waves from `CombatWaveConfig.WAVES.length` or a sensible default like 3
  - `initialCoins`: use the current default from the existing stage creation code (check `StageScene.ts` for what it passes to `createStageRuntime`)
  - `waveDefinitions`: reference the existing wave definitions for waves 0..totalWaves-1
  - `slotModifierCountWeights`: `{ 0: 1, 1: 3, 2: 2, 3: 1 }` — bias toward 1 modifier, 3 is rare
  - `slotModifierWeightOverrides`: `undefined` (use global defaults)

**Exports:**
- `STAGE_CONFIGS: StageConfig[]`
- `getStageConfig(stageId: string): StageConfig | undefined`

## Acceptance Criteria

- [ ] `SlotModifierConfig.ts` exports a validated `SLOT_MODIFIER_CONFIG` with 9 modifier definitions
- [ ] `validateSlotModifierConfig()` passes for the authored catalog
- [ ] Tests verify: duplicate IDs detected, invalid effectKind detected, missing params detected, non-negative weights enforced, invalid targetColor detected
- [ ] `StageConfig.ts` exports `STAGE_CONFIGS` with exactly one MVP entry
- [ ] `StageConfig` interface has all fields: id, displayName, totalWaves, initialCoins, waveDefinitions, slotModifierCountWeights, slotModifierWeightOverrides
- [ ] `STAGE_CONFIGS[0].slotModifierCountWeights` defines keys 0-3 with non-negative values summing to > 0
- [ ] `TypeScript` compiles without errors (`npx tsc --noEmit`)
- [ ] All new tests pass (`npm run test:run`)

## Technical Notes

**File locations:**
- `src/config/SlotModifierConfig.ts`
- `src/config/SlotModifierConfig.test.ts`
- `src/config/StageConfig.ts`

**Existing code to reference but NOT modify:**
- `src/config/CombatContentConfig.ts` — reuse `NoteColor` type if exported; if not, define locally in `SlotModifierConfig.ts`
- `src/config/CombatWaveConfig.ts` — import `CombatWaveDefinition` type for `StageConfig.waveDefinitions`
- `src/scenes/stage/StageScene.ts` — check what `createStageRuntime()` currently receives to set correct `initialCoins` and `totalWaves` defaults

**Pattern to follow:**
- Follow the existing `CombatBalanceConfig.ts` style: const object with values, validated at module level
- Tests use Vitest (check existing test files like `CombatContentConfig.test.ts` for conventions)

**Avoid:**
- Do NOT modify `createStageRuntime()` signature (task 02)
- Do NOT modify `CombatWaveConfig.ts` (coexistence during transition)
- Do NOT add Phaser dependencies to config files

## Implementation Plan

1. Create `src/config/SlotModifierConfig.ts`:
   - Define all types (`SlotModifierRarity`, `SlotModifierEffectKind`, `SlotModifierEffectParams`, `SlotModifierDefinition`)
   - Write the 9 modifier definitions as a const array
   - Write `validateSlotModifierConfig()` — iterate definitions, check each invariant, collect errors, throw if any
   - Call validation at module scope
   - Export `SLOT_MODIFIER_CONFIG`, `getModifierById()`, `PREMIUM_MODIFIER_IDS`, and all types

2. Create `src/config/SlotModifierConfig.test.ts`:
   - Test: valid config passes validation
   - Test: duplicate ID detected
   - Test: invalid effectKind detected
   - Test: missing required params detected
   - Test: negative weight detected
   - Test: invalid targetColor in color-output-note-bonus detected
   - Use Vitest conventions from existing test files

3. Create `src/config/StageConfig.ts`:
   - Import `CombatWaveDefinition` from `CombatWaveConfig.ts`
   - Define `StageConfig` interface
   - Import wave definitions from `CombatWaveConfig.WAVES` for the MVP stage
   - Create `STAGE_CONFIGS` array with one entry
   - Export `STAGE_CONFIGS`, `getStageConfig()`, and the `StageConfig` type

4. Run `npx tsc --noEmit` to verify types
5. Run `npm run test:run` to verify tests pass

## Additional Notes

**Content notes:** The modifier display names and short descriptions should be player-facing English text. Keep them short — max 3 words for displayName, max 50 chars for shortDescription. Examples: `displayName: '+1 Note'`, `shortDescription: 'This slot produces one extra output note.'`

**Tuning notes:** Default weights are starting points. Common note-output modifiers should have higher weights than archetype modifiers initially, since note-output modifiers are simpler and more universally useful. Suggested defaults: note-output common = 10, archetype common = 6, premium = 2.

## Blocked By

None — can start immediately.

## Type

AFK

## Design Spec Reference

- [Modifier Definition Schema](../design-spec.md#modifier-definition-schema)
- [First Content Pool](../design-spec.md#first-content-pool)
- [Stage Config Schema](../design-spec.md#stage-config-schema)
- [Validation Rules](../design-spec.md#validation-rules)
- [Content and Configuration](../design-spec.md#content-and-configuration)
- [Pawn Compatibility — No New Metadata Needed](../design-spec.md#pawn-compatibility--no-new-metadata-needed)
