# Slot Modifiers — Design Spec

## Document Intent

This document is a self-contained implementation handoff for the `slot modifier` feature in `Arcane Rave`. It is written for an agent with zero access to the original discussion. It captures the player-facing intent, confirmed design decisions, integration expectations, implementation shape, data model, UI behavior, and validation requirements.

**This revision has been audited against the implemented pawn overhaul and current codebase (May 2026).** All terminology, archetype references, file paths, and integration points reflect the actual state of the repo. Conflicts resolved in this revision are documented at the end of the document.

## Executive Summary

`Slot modifier` is a stage-level build mechanic that places a small number of special effects onto individual `record` slots. These effects stay fixed for the entire `stage` and exist to deepen build decisions in `build phase`: where to place pawns, which pawn archetypes to prioritize, and which note-producing segments are worth assembling on this particular run.

The feature exists to solve two design problems. First, the current build space is too flat: the default strongest segment tends to collapse toward familiar note-efficient patterns such as `generator + generator + finisher`. Second, the current combat content does not yet provide enough positional variance between runs. Slot modifiers give each run a light, readable puzzle without overloading the player with complex rule text.

Successful implementation should feel immediately legible. A player should be able to glance at a modifier icon, understand what kind of pawn or note-output pattern it likes, and make a placement decision without reading dense text or simulating hidden math. The system should feel stylish, local, and build-warping, not like a spreadsheet of invisible buffs.

## Problem Statement

`Arcane Rave` is built around arranging pawns on an 8-slot rotating `record`, where slot order and note flow determine combat outcomes. The game already has the right high-level fantasy, but it needs one more layer of meaningful build variation between stage attempts.

Without slot modifiers:

- the positional puzzle on the `record` is weaker than intended;
- the player has fewer reasons to rethink a familiar segment formula;
- run-to-run variation depends too heavily on `shop` randomness alone;
- stage onboarding cannot gradually introduce increasingly expressive build constraints.

The feature must add variation without violating the project's core readability goals:

- no complicated conditional rules in the first version;
- no effects that require parsing hidden exceptions;
- no UI approach where the modifier becomes unreadable once a pawn occupies the slot.

## Goals

- Add persistent per-stage slot effects that increase build-phase decision depth.
- Make slot position matter more, not by raw stat inflation alone, but by changing which pawns and note-output patterns are attractive on specific slots.
- Create a system that can sometimes disrupt the default best segment pattern and encourage alternative chains.
- Keep the first version cognitively light enough for mobile portrait play.
- Ensure every modifier is understandable through a small icon plus a short tooltip.
- Support gradual introduction across multiple stages in MVP.
- Fit cleanly into the existing `StageRuntime`, build UI, and combat activation pipeline.
- Remain compatible with the implemented pawn overhaul: the `noteRuleFamily + ability` model, the 4 primary archetypes (`projectile`, `explosion`, `beam`, `zone`), and the existing `primaryArchetype` field on ability definitions.

## Non-Goals

- This iteration does not design the full future pawn roster.
- This iteration does not redesign the entire note system.
- This iteration does not add complex conditional slot rules such as neighbor checks, packet-state branches, or multi-slot logic puzzles.
- This iteration does not add save/load persistence beyond current stage runtime needs.
- This iteration does not solve long-term content scaling for dozens of modifiers.
- This iteration does not add archetype weight groups or stage-level modifier-class multipliers.
- This iteration does not require modifiers to be rendered directly inside occupied slots.

## Feature Scope

In scope for `v1`:

- A new authored content set of `slot modifiers`.
- Stage-time generation of `0–3` modified slots when a stage runtime is created.
- Stage config control over how many modifiers can appear and how likely each count is.
- A global weighted modifier pool with per-stage weight overrides.
- Two rarity classes for modifiers: `common` and `premium`.
- A hard cap of at most `1 premium` modifier per stage.
- UI presentation for modifier icons outside the `record`.
- Tooltip inspection for modifiers in build phase.
- Positive compatibility feedback between a modifier and the pawn currently occupying that slot.
- Combat/runtime logic that applies modifier effects during note-output and activation resolution.
- A first content pool of `9` modifiers.

Out of scope for `v1`:

- Authoring a large archetype taxonomy beyond what the pawn overhaul already provides.
- Rich modifier chains or nested effects.
- Runtime modifier changes mid-stage.
- Multiple modifiers per slot.
- Modifier-specific audio systems beyond simple future hooks.
- Full stage progression rebalance beyond enabling stage-specific weights.

## Player Experience

At stage start, the player enters `build phase` and sees the `record` with zero to three modifier icons attached to specific slots. The icons live just outside the outer rim of the vinyl, so they remain visible even if the slot contains a pawn.

The player can hold a modifier icon to inspect a tooltip in a dedicated tooltip area at the top center of the build screen. The player can also hold a pawn to inspect the pawn in the same tooltip area. Only one inspected thing is shown at a time.

The player learns the system primarily through simple, local rules:

- this slot gives more note output;
- this slot wants a projectile pawn;
- this slot double-activates;
- this slot specifically rewards a red output source.

When the player places or moves a compatible pawn into a modified slot, the game gives a short positive visual confirmation: a translucent green animated link appears between the modifier icon and the pawn, then fades. Later, while inspecting either the pawn or the modifier, the same link can be shown again as a contextual reminder.

The intended emotional arc:

- the first read is simple;
- the placement decision feels meaningful;
- some runs produce one obvious "interesting slot";
- rare premium slots create a stronger "I should build around this" moment.

## Core Mechanics

### Standing Rules

- A `slot modifier` belongs to one specific slot on the `record`.
- Modifiers are rolled once on stage entry and remain fixed for the entire stage.
- A stage can generate `0`, `1`, `2`, or `3` modified slots.
- No slot can hold more than one modifier.
- In `v1`, slot choice is uniformly random across the 8 slots.
- Modifier effects are local, atomic, and low-complexity.
- `v1` modifiers do not inspect neighboring slots, packet state conditions, or multi-slot patterns.
- A modifier may do nothing for some pawns. This is intentional.
- `common` modifiers may repeat on multiple slots within one stage.
- `premium` modifiers may not repeat because premium count is capped at `1` per stage.

### Modifier Compatibility Model

Modifiers work through one of three readable compatibility shapes:

- **note-output modifiers**: they affect any pawn activation that emits `output note`. Both `generator` and `finisher` benefit, because both emit output notes during activation. The bonus notes are added on top of the pawn's normal output — the base note-rule behavior is not changed.
- **archetype modifiers**: they affect pawns whose ability `primaryArchetype` matches the modifier's target archetype. The pawn overhaul already defines `primaryArchetype` on every `CombatPawnAbilityDefinition` as one of `'projectile' | 'explosion' | 'beam' | 'zone'`. No new metadata system is needed — compatibility is determined by reading the pawn's existing `ability.primaryArchetype` field.
- **cross-archetype AoE modifier**: the `+50% AoE radius` modifier affects **both** `explosion` and `zone` archetypes, since both deal area damage. It does NOT match `projectile` or `beam` pawns.

Important confirmed rule:

- note bonuses are defined in terms of `output note`, not `generator-only note generation`;
- therefore both `generator` and `finisher` can benefit if their activation emits output notes.

### First Content Pool

#### Common note-output modifiers

1. `+1 output note`
2. `+1 red output note`
3. `+1 green output note`
4. `+1 blue output note`

#### Common archetype modifiers

5. `+1 projectile` — matches pawns with `primaryArchetype: 'projectile'`. Effect depends on the pawn's projectile pattern:
   - `shotgun-spread` pattern → adds 1 to `projectileCount` (e.g. 3 → 4 projectiles in the spread)
   - volley pattern (uses `volleyShotCount`) → adds 1 to `volleyShotCount` (e.g. 3 → 4 shots in the volley)
   - `single-shot` pattern → no effect (intentional — the modifier does nothing for this pawn)
6. `+50% AoE radius` — matches pawns with `primaryArchetype: 'explosion'` OR `'zone'`
7. `+1 extra beam` — matches pawns with `primaryArchetype: 'beam'`

#### Premium modifiers

8. `+2 output notes`
9. `Double activation`

**Note:** the original v1 spec listed 9 modifiers. The pool is now 9 — `+50% AoE radius` is intentionally cross-archetype (explosion + zone) rather than having separate modifiers for each, because both archetypes share the concept of a damage radius.

### Note-Output Modifier Rules

- Note-output modifiers add bonus notes on top of the normal generator/finisher output.
- The underlying note-rule logic (generator emits 2 notes of its own color, finisher consumes then emits 1 output note) is **not changed**.
- A `+1 output note` modifier on a generator slot causes the generator to emit 3 notes instead of 2.
- A `+1 output note` modifier on a finisher slot causes the finisher to emit 2 output notes instead of 1.
- **Bonus notes are added before capacity clamping** — the total is computed as a single sum then clamped by `NOTE_PACKET_CAPACITY`. For same-color generator stacking: `nextCount = min(prevCount + 2 + bonusNotes, CAPACITY)`. For finishers: `nextCount = min(1 + bonusNotes, CAPACITY)`. This ensures "bonus notes do not bypass the capacity cap."
- A `+1 red output note` only adds its bonus if the activation is already emitting red output notes. The check differs by pawn type:
  - For **generators**: the "output color" is the pawn's own `color` (generators don't have `outputNoteColor`).
  - For **finishers**: the "output color" is the authored `outputNoteColor`.
  - Examples: a red generator gets the bonus (it emits red). A blue finisher with `outputNoteColor: 'red'` gets the bonus. A red finisher with `outputNoteColor: 'blue'` does NOT get the bonus.
- `+2 output notes` works identically to `+1 output note` but adds 2 instead of 1.

### Double Activation Rules

- `Double activation` performs two real activations of the same slot back-to-back within one beat.
- The second activation resolves against the updated combat state after the first activation.
- **Interaction with note-output modifiers**: v1 prohibits multiple modifiers per slot, so the only effect present on a double-activation slot is `Double activation` itself. The resolver is called independently for each of the two activations — if future versions ever allow combining modifiers, this contract is already correct.
- There is no special-case protection for `finisher`.
- If a finisher spends its notes on the first activation, the second activation uses whatever note packet remains.
- This asymmetry is desired and part of the slot's build meaning.
- The effect is logically one beat, not a separate global time-control action.
- Visual presentation: the record snaps slightly backward after the first activation and the needle visually re-reads the same slot. This sells the "double take" physically.
- Implementation contract: `CombatSlotModifierResolver` returns a `doubleActivation` flag in its mutations. The caller (`resolveCombatActivations`) checks this flag and, if set, calls `CombatDoubleActivation.resolveDoubleActivation()` which runs the full activation pipeline twice, updating runtime state between calls. The resolver is stateless — each activation call re-evaluates modifier effects independently against current runtime state.

### Extra Beam Rules

- `+1 extra beam` spawns a second beam instance in addition to the pawn's normal beam.
- **Lock-on beam**: the two beams MUST target different enemies.
  - First beam: targets the `frontmost enemy` (normal behavior).
  - Second beam: targets the `frontmost enemy` excluding the first beam's target. If no second valid target exists, the second beam is not created.
- **Sweeping beam**: the two beams MUST sweep in opposite directions so they do not visually overlap.
  - First beam: sweeps in its normal direction (left-to-right in screen space).
  - Second beam: sweeps in the reverse direction (right-to-left in screen space). Implementation: negate the sweep arc or swap start/end angles.
- Both beam instances share the same damage, duration, tick interval, and source snapshot as the original activation.
- Each beam instance independently applies its own secondary effects (e.g., `slow-on-hit` from Frost Sweep).

### Sequential Flows

#### Stage generation flow

1. Create stage runtime via `createStageRuntime(stageConfig)` — the function now takes a `StageConfig` object.
2. Roll how many modified slots exist using `stageConfig.slotModifierCountWeights` for `0/1/2/3`.
3. Choose that many unique slot indices uniformly from the 8 slots.
4. For each chosen slot, roll a modifier from the weighted pool.
5. While rolling:
   - respect the `stageConfig.slotModifierWeightOverrides` if present for that modifier;
   - otherwise use the global modifier weight from `SlotModifierConfig`;
   - treat weight `0` as unavailable;
   - if one premium has already been chosen, all other premium candidates are treated as weight `0`.
6. Store the generated modifier assignment in stage runtime — modifiers persist for the entire stage across all waves.

#### Build phase interaction flow

1. Player sees outer-rim modifier icons for all modified slots.
2. Player holds an icon to inspect its tooltip.
3. Player drags or moves a pawn into a slot.
4. The game recomputes whether the pawn matches the slot modifier.
5. If the pawn is compatible:
   - a short green animated link flashes between icon and pawn;
   - optional lightweight glow/affirmation can appear;
   - tooltip inspection later can re-show the link.
6. If the pawn is incompatible:
   - no penalty UI is shown;
   - the modifier icon remains visible;
   - the player can still inspect both pieces independently.

#### Combat resolution flow

1. Combat runtime receives the stage loadout and stage slot modifiers.
2. When a slot activates, the activation resolver checks whether a modifier exists for that slot.
3. The modifier mutates the activation in a local and explicit way.
4. For `Double activation`, the slot is immediately resolved a second time.
5. Note packet changes, VFX events, and HUD events are emitted from the actual resulting runtime state.

## Gameplay Flow

### Build Phase

1. Stage enters `build`.
2. Record UI renders all eight slots and any generated slot modifiers.
3. Player inspects icons and pawns as needed via hold-to-inspect.
4. Player buys, merges, and repositions pawns.
5. Modifier compatibility passively shapes where pawns feel "best".

### Combat Phase

1. Player manually starts the wave.
2. Combat scene is launched with stage loadout and stage modifier data.
3. Slot modifiers affect runtime activations:
   - note-output count increases;
   - archetype-specific behavior bumps;
   - double activation when applicable.
4. Wave ends as usual.
5. Stage returns to build phase with the same slot modifier positions and identities still intact.

### Stage Progression / Onboarding

- `StageConfig.slotModifierCountWeights` controls whether slot modifiers appear at all.
- Early onboarding stages set `{ 0: 1, 1: 0, 2: 0, 3: 0 }` — no modifiers.
- Later stages bias toward specific modifiers via `slotModifierWeightOverrides`.
- The MVP should be able to introduce:
  - no modifiers first;
  - then simple note-output modifiers;
  - then archetype modifiers;
  - then `Double activation` as an early premium teaching moment.
- Since each `StageConfig` carries its own `waveDefinitions`, onboarding stages can also tune enemy composition alongside modifier introduction.

## System Model

### Major Runtime Pieces

- `StageRuntime`
  - authoritative stage-local owner of generated slot modifiers.
  - persists modifier assignments across waves within a stage.
  - receives a `StageConfig` object at creation that defines all stage parameters (waves, economy, modifier tuning).
  - `createStageRuntime(stageConfig)` — factory function now takes a `StageConfig` instead of raw options.

- `StageBuildState`
  - still owns pawn placement and shop state.
  - should remain focused on build slots and not absorb unrelated modifier generation policy.

- `StageScene`
  - presents modifier icons and inspect interactions in build phase.
  - computes and renders positive compatibility feedback.
  - includes tooltip target routing for pawns and modifiers.

- `CombatRuntime`
  - receives the per-slot modifier mapping as part of combat setup.
  - must expose modifiers to activation logic.

- `CombatActivation`
  - applies modifier effects when a slot activates.
  - owns the rules for note-output mutation and double activation sequencing.

- Content config modules
  - define modifier catalog, weights, rarity class, display metadata, and stage override data.

- `EventBus`
  - the shared cross-scene communication layer for any new inspect or runtime events.

## Technical Design

### Architecture Principle: Small Modules

The current codebase has some large files (`StageScene.ts` is ~1600 lines, `CombatRuntime.ts` is ~600 lines, `CombatActivation.ts` is ~380 lines). The slot modifier feature must NOT inflate these further. Instead, the integration should be decomposed into focused, single-responsibility modules that are wired into the existing files via clean imports. Each module should be small enough to read in one screen and testable in isolation.

### Recommended Implementation Shape

Introduce the feature as four coordinated layers:

1. **authored config and data schema** — modifier definitions, stage-level weights, validation;
2. **stage-time generation and runtime state** — pure logic for rolling modifiers, no Phaser dependencies;
3. **build-phase UI integration** — small presenter modules consumed by `StageScene`;
4. **combat integration** — small resolver modules consumed by `CombatActivation` and `CombatRuntime`.

### Proposed New Modules

All modules should be small and focused. Estimated ~50–150 lines each.

#### Config layer

- `src/config/SlotModifierConfig.ts`
  - Authoritative catalog of all modifier definitions.
  - Includes IDs, rarity, default global weight, icon/display keys, effect kind, and effect parameters.
  - Modifier definition schema, const arrays for effect kinds, and a `validateSlotModifierConfig()` function.
  - Exports the validated config object and lookup helpers.

- `src/config/SlotModifierConfig.test.ts`
  - Validation tests: duplicate IDs, invalid effect kinds, missing params, weight invariants.

- Stage-level configuration lives in a new `StageConfig` type. This is the foundational data model for a stage run — it combines waves, economy, and modifier tuning into one object that `createStageRuntime()` consumes:

- `src/config/StageConfig.ts`
  - Exports the `StageConfig` interface and a const array of authored stage configs.
  - Each entry defines: `id`, `displayName`, `totalWaves`, `initialCoins`, `waveDefinitions`, `slotModifierCountWeights`, and optional `slotModifierWeightOverrides`.
  - For MVP there is one stage config. In the future, multiple configs power a stage-select screen.
  - Exports: `STAGE_CONFIGS: StageConfig[]`, `getStageConfig(stageId: string)`.

#### Generation layer

- `src/stage/StageSlotModifiers.ts`
  - Pure logic: `generateStageSlotModifiers(rng, stageConfig, modifierPool) → SlotModifierAssignment[]`.
  - No Phaser dependencies, no scene references.
  - Validates rarity cap, unique slot assignment, weight-based selection.
  - Exported types: `SlotModifierAssignment`, `SlotModifierCountWeights`.

- `src/stage/StageSlotModifiers.test.ts`
  - Tests for: count distribution, unique slots, premium cap, weight-0 exclusion, stage overrides.

#### Build UI layer (small modules consumed by StageScene)

- `src/scenes/stage/ModifierIconRenderer.ts`
  - Renders modifier icons outside the record rim at the correct angular position.
  - Handles visibility regardless of slot occupancy (icons are outside the record, not on it).
  - Provides a simple `createModifierIcons(stageRuntime, recordGroup)` factory.

- `src/scenes/stage/ModifierCompatibility.ts`
  - Pure function: `isPawnCompatibleWithModifier(pawnId, modifierId) → boolean`.
  - Implements the three compatibility shapes: note-output, archetype, cross-archetype AoE.
  - Reads pawn definitions from `CombatContentConfig` — no runtime state needed.

- `src/scenes/stage/ModifierTooltipBridge.ts`
  - Wires hold-to-inspect for modifier icons into the existing StageScene tooltip system.
  - Manages the "one tooltip at a time" invariant between pawn and modifier inspection.

- `src/scenes/stage/ModifierLinkEffect.ts`
  - Creates and destroys the green animated compatibility link between a modifier icon and a pawn.
  - Short-lived tween/alpha animation, pooled or reused to avoid per-frame churn.

#### Combat layer

- `src/combat/CombatSlotModifierResolver.ts`
  - Pure logic: given a slot index + the modifier map + the pawn definition + the runtime state, returns the mutations to apply.
  - Exports: `resolveSlotModifierMutations(runtime, slotIndex) → SlotModifierMutations`.
  - This is the single place where modifier → activation transformations are defined.
  - `SlotModifierMutations` shape:
    - `bonusNotes: number` — added to generator or finisher output (default `0`).
    - `colorFilter: NoteColor | null` — for color-specific note bonuses; if set, `bonusNotes` only applies when the activation's output color matches.
    - `projectileCountBonus: number` — added to `projectileCount` for shotgun-spread patterns (default `0`).
    - `volleyShotCountBonus: number` — added to `volleyShotCount` for volley patterns (default `0`).
    - `radiusMultiplier: number` — multiplied with explosion/zone radius (default `1.0`).
    - `extraBeamCount: number` — extra beam instances to spawn (default `0`).
    - `doubleActivation: boolean` — whether to repeat the slot activation (default `false`).

- `src/combat/CombatDoubleActivation.ts`
  - Handles the double-activation sequencing: `resolveDoubleActivation(runtime, slotIndex, pawn)`.
  - Calls the normal activation path twice, updating runtime state between calls.
  - Emits appropriate events for presentation (vinyl rebound, needle reread).

- `src/combat/CombatExtraBeam.ts`
  - Handles spawning the second beam for `+1 extra beam` modifier.
  - Lock-on: targets `frontmostEnemyExcluding(firstTargetId)`.
  - Sweeping: reverses sweep angles for the second beam.
  - Both beams share the same source snapshot and damage profile.

### Existing Files That Need Light Changes

These files need small, surgical additions — not rewrites:

- `src/stage/StageRuntime.ts`
  - Add `slotModifiers: SlotModifierAssignment[]` to `StageRuntime` interface.
  - Call `generateStageSlotModifiers()` inside `createStageRuntime()`.
  - Export slot modifier data alongside loadout in `getStageCombatLoadoutSlots()` (or add a parallel accessor).

- `src/combat/CombatRuntime.ts`
  - Add `slotModifiers: Array<SlotModifierAssignment | null>` (indexed by slot) to `CombatRuntime` interface.
  - Add `slotModifiers` to `CreateCombatRuntimeOptions`.
  - Initialize in `createCombatRuntime()`, synced alongside slot pawns.

- `src/combat/CombatActivation.ts`
  - In `resolveCombatActivations()`, after the main activation resolves, check for a slot modifier.
  - If present, delegate to `CombatSlotModifierResolver` to mutate note output counts.
  - If modifier is `Double activation`, call `resolveDoubleActivation()`.
  - The hardcoded `emittedNotes = 2` in `applyGeneratorPacketMutation` and `count: 1` in `applyFinisherPacketMutation` should accept an optional `bonusNotes` parameter (default `0`).

- `src/combat/CombatRuntimeEvents.ts`
  - `pushCombatFinisherOutputNoteEmitted` — change payload `count: 1` to `count: number`.
  - `pushCombatGeneratorNotesEmitted` — already accepts `count: number`.
  - Optionally add `combat:modifier-applied` event for VFX hooks.

- `src/events/EventBus.ts`
  - Add `combat:modifier-applied` event type if visual feedback is desired in HUD/presentation.

- `src/scenes/stage/StageScene.ts`
  - In build-phase rendering, call `ModifierIconRenderer` to place modifier icons.
  - Wire hold-to-inspect through `ModifierTooltipBridge`.
  - Call `ModifierCompatibility.isPawnCompatibleWithModifier()` on pawn placement/move to trigger link effects.

### Responsibilities and Boundaries

- Modifier generation must remain data-driven and deterministic for a given RNG stream.
- Build UI rendering logic must not own modifier generation rules.
- Combat activation should consume modifier effects, not reinterpret stage config directly.
- Tooltip UI should be feature-local to stage scene for now rather than expanding the global `UIScene`.
- Each new module should be independently testable.

### Why This Structure Fits the Repo

The current architecture already separates:

- config values in `src/config/`;
- runtime state in `src/stage/` and `src/combat/`;
- scene presentation in `src/scenes/`;
- shared scene communication in `src/events/EventBus.ts`.

The feature follows the same split, with an emphasis on **small modules over monolithic files**.

## Data Flow

### Inputs

- global slot modifier definitions;
- stage-specific modifier count weights;
- stage-specific per-modifier weight overrides;
- current pawn placement on build slots;
- combat slot activations and current note packet state.

### Generation Path

1. `createStageRuntime(stageConfig)` initializes stage state from a `StageConfig` object.
2. Slot modifier generation rolls count and per-slot effect assignment via `StageSlotModifiers.generateStageSlotModifiers()`.
3. Generated slot modifier map is stored in `StageRuntime.slotModifiers` and persists across all waves within the stage.
4. `StageScene` reads that runtime state and renders icons via `ModifierIconRenderer`.

### Transition into Combat

1. Stage prepares loadout from `runtime.build.slots`.
2. Stage also passes current slot modifier map into `CreateCombatRuntimeOptions.slotModifiers`.
3. `CombatRuntime` stores modifiers in `runtime.slotModifiers`, indexed by slot.

### Runtime Application

1. Slot crossing triggers activation.
2. Activation logic resolves base pawn effect (unchanged from current code).
3. `CombatSlotModifierResolver` checks for a modifier on the slot and returns mutations:
   - note output bonus count (with optional color filter);
   - `Double activation` flag.
4. If `Double activation`, `CombatDoubleActivation.resolveDoubleActivation()` repeats the activation.
5. Resulting note packet and combat events are emitted normally.

### Outputs

- build-phase visuals for modifier icons and compatibility links;
- tooltip content for active inspection target;
- combat behavior changes;
- optional new runtime events for modifier-triggered VFX.

## State Model

### Persistent During a Stage

- generated set of modified slot indices;
- exact modifier ID assigned to each modified slot.

### Recomputed / Derived

- whether the pawn currently on a slot is compatible with that slot's modifier;
- whether a green compatibility link should currently be visible;
- tooltip content based on the currently held target.

### Combat Runtime State

- `slotModifiers: Array<SlotModifierAssignment | null>` — indexed by slot index, `null` for unmodified slots;
- any transient "double activation in progress" flag if needed internally for sequencing or VFX.

### Invariants

- no more than 3 modified slots per stage;
- no more than 1 premium modifier per stage;
- each modified slot has exactly one modifier;
- each slot index appears at most once in the generated mapping;
- weight `0` means unavailable in the current stage roll;
- common modifiers may repeat across slots, premium may not due to cap;
- a modifier never changes meaning based on inspection context;
- note-output modifiers apply to any pawn activation that emits output notes;
- `+50% AoE radius` matches both `explosion` and `zone` archetypes.

## Integration Points

These are the exact files that will be touched, with the nature of the change:

### New files

| File | Purpose |
|------|---------|
| `src/config/SlotModifierConfig.ts` | Modifier catalog, weights, validation |
| `src/config/SlotModifierConfig.test.ts` | Config validation tests |
| `src/config/StageConfig.ts` | `StageConfig` interface + authored stage definitions (waves, economy, modifier tuning) |
| `src/stage/StageSlotModifiers.ts` | Pure generation logic |
| `src/stage/StageSlotModifiers.test.ts` | Generation tests |
| `src/scenes/stage/ModifierIconRenderer.ts` | Build-phase icon rendering |
| `src/scenes/stage/ModifierCompatibility.ts` | Pawn↔modifier compatibility check |
| `src/scenes/stage/ModifierTooltipBridge.ts` | Hold-to-inspect wiring |
| `src/scenes/stage/ModifierLinkEffect.ts` | Green compatibility link animation |
| `src/combat/CombatSlotModifierResolver.ts` | Activation mutation logic |
| `src/combat/CombatDoubleActivation.ts` | Double activation sequencing |
| `src/combat/CombatExtraBeam.ts` | Extra beam spawning with targeting rules |

### Existing files — light changes only

| File | Change |
|------|--------|
| `src/stage/StageRuntime.ts` | Add `slotModifiers` to interface; change `createStageRuntime()` to accept `StageConfig` instead of raw options; call `generateStageSlotModifiers()` inside; export modifiers alongside loadout |
| `src/combat/CombatRuntime.ts` | Add `slotModifiers` field to `CombatRuntime` and `CreateCombatRuntimeOptions` |
| `src/combat/CombatActivation.ts` | In `resolveCombatActivations()`, after base activation resolve, delegate to `CombatSlotModifierResolver`; accept `bonusNotes` param in `applyGeneratorPacketMutation` and `applyFinisherPacketMutation`; apply `radiusMultiplier` in `resolveExplosionAbility` and `resolveZoneAbility` |
| `src/combat/CombatRuntimeEvents.ts` | Change `pushCombatFinisherOutputNoteEmitted` signature to accept `count: number`; change payload type from `count: 1` to `count: number` |
| `src/events/EventBus.ts` | Optionally add `combat:modifier-applied` event type |
| `src/scenes/stage/StageScene.ts` | Wire modifier icon rendering, tooltip bridge, and compatibility link calls |

### Existing files — no changes expected

| File | Reason |
|------|--------|
| `src/stage/StageBuild.ts` | Build state remains focused on pawn placement; modifier data lives in StageRuntime |
| `src/stage/StageFlowCoordinator.ts` | Phase transitions unchanged |
| `src/config/CombatContentConfig.ts` | Pawn definitions already carry `primaryArchetype` — no new metadata needed |
| `src/config/CombatBalanceConfig.ts` | Tuning surface for modifiers lives in `SlotModifierConfig`, not here |
| `src/config/CombatWaveConfig.ts` | Wave definitions migrate into `StageConfig.waveDefinitions` over time; during transition, global `WAVES` array and `getCombatWaveDefinition()` coexist with stage config |
| `src/combat/CombatPawnBuffs.ts` | Pawn-to-pawn buffs are a separate system from slot modifiers |
| `src/scenes/combat/*` | Combat presentation consumes existing events; modifier VFX can reuse existing event flow |

## Content and Configuration

### Modifier Definition Schema

Each modifier definition must include:

- `id: string` — unique identifier, e.g. `'plus-one-output-note'`
- `rarity: 'common' | 'premium'`
- `defaultWeight: number` — global spawn weight (0 = disabled by default)
- `displayName: string` — player-facing short name
- `shortDescription: string` — tooltip text
- `iconKey: string` — texture key or procedural icon descriptor
- `effectKind: SlotModifierEffectKind`
- `effectParams: SlotModifierEffectParams`

`effectKind` values for `v1`:

- `'output-note-bonus'` — adds N notes to any activation output
- `'color-output-note-bonus'` — adds N notes only if output color matches
- `'projectile-bonus'` — adds projectile count for projectile-archetype pawns
- `'aoe-radius-scale'` — multiplies radius for explosion AND zone archetype pawns
- `'beam-count-bonus'` — adds extra beam instance for beam-archetype pawns
- `'double-activation'` — repeats the slot activation

`effectParams` for each kind:

| kind | params |
|------|--------|
| `output-note-bonus` | `{ bonusNoteCount: number }` |
| `color-output-note-bonus` | `{ bonusNoteCount: number, targetColor: NoteColor }` |
| `projectile-bonus` | `{ projectileCountBonus: number; volleyShotCountBonus: number }` |
| `aoe-radius-scale` | `{ radiusMultiplier: number }` |
| `beam-count-bonus` | `{ extraBeamCount: number }` |
| `double-activation` | `{ activationCount: number }` |

### Pawn Compatibility — No New Metadata Needed

The pawn overhaul (`CombatContentConfig.ts`) already defines:

- `ability.primaryArchetype` on every pawn — used directly for archetype modifier matching.
- `type: 'generator' | 'finisher'` and `color: NoteColor` — used for note-output modifier matching.
- For finishers: `outputNoteColor` (from `CombatFinisherPawnDefinition`) — used for color-specific note bonus matching.

No new tags, capability metadata, or archetype taxonomy is required. The `ModifierCompatibility` module reads the existing pawn definition and the modifier definition and returns a boolean.

### Stage Config Schema

A `StageConfig` defines all parameters for one stage run — waves, economy, and modifier tuning. It is passed to `createStageRuntime()` and consumed once at stage creation time. In the future, multiple `StageConfig` instances will power a stage-select screen.

```ts
interface StageConfig {
  /** Unique identifier for this stage definition. */
  id: string;
  /** Display name shown in future stage-select UI. */
  displayName: string;
  /** Total number of waves in this stage. */
  totalWaves: number;
  /** Starting coin count for build phase. */
  initialCoins: number;
  /** Wave definitions for this stage, keyed by wave index (0..totalWaves-1). */
  waveDefinitions: CombatWaveDefinition[];
  /** Weights for how many modified slots appear (keys 0-3). Must sum to > 0. */
  slotModifierCountWeights: Record<0 | 1 | 2 | 3, number>;
  /** Per-modifier weight overrides for this stage. Omitted keys use global default. Weight 0 bans the modifier. */
  slotModifierWeightOverrides?: Record<string, number>;
}
```

The `waveDefinitions` array replaces the current global `CombatWaveConfig.WAVES` — each stage carries its own wave definitions. During combat setup, `createCombatRuntime()` receives the stage's wave definition for the current `waveIndex`.

**Backward compatibility**: the current `CombatWaveConfig.WAVES` global array and `getCombatWaveDefinition(waveIndex)` still exist during the transition. The stage config simply overrides them. Once all stages are config-driven, the global array can be deprecated.

### Stage Config Defaults

- `slotModifierCountWeights` — most stages should bias toward `1` modifier. `2` should be less common. `3` should be rare. Early onboarding stages may set `0` high or exclusive.
- `slotModifierWeightOverrides` — omit for most stages to use global weights. Use overrides for onboarding (force specific modifiers as teaching moments) or late-game tuning.
- `Double activation` can be forced as a teaching moment by setting other premium weights to `0` and its own weight high.

### Validation Rules

- Every `StageConfig` count weight table must define keys `0–3`.
- Weights must be non-negative.
- At least one count weight must be greater than `0`.
- Every override key in `slotModifierWeightOverrides` must reference a known modifier ID.
- Every modifier ID must be unique.
- Every modifier icon/display reference must be valid.
- Every modifier `effectKind` must have the required params.
- Every archetype modifier must target an archetype that exists in `PRIMARY_ARCHETYPES`.
- `aoe-radius-scale` is the only cross-archetype effect kind in v1.
- `projectile-bonus` on a `single-shot` pawn is not a validation error — it is a valid config that intentionally produces no effect for that pawn.
- `color-output-note-bonus` — the `targetColor` must be a valid `NoteColor`. It is validated that the color exists in the note color palette; it is NOT validated that any pawn emits that color (pawn roster may change independently).

## Technical Constraints

- The repo uses `config/` for runtime-level tunables; new modifier content follows that pattern.
- The repo already relies on `EventBus` as the only shared communication channel between scenes and systems.
- The pawn overhaul already provides `primaryArchetype` on all pawn ability definitions — no new pawn metadata infrastructure is needed.
- The project targets mobile portrait readability, so UI density is a hard constraint.
- The build phase already has several simultaneous informational layers: shop, slot order, synergy, wave preview, coins, and drag interactions. Modifier UI must remain lightweight.
- The combat activation pipeline is currently direct and deterministic; modifier integration must preserve this clarity.
- `StageScene.ts` is already 1593 lines — modifier UI must be added via small imported modules, not inline code.

## Failure Modes and Edge Cases

- Stage count weights all set to zero → validation error in config tests.
- All available modifier weights for a chosen roll resolve to zero → generation must fail loudly in tests/development rather than silently producing malformed state.
- Modifier assigned to slot, but no compatible pawn exists in current content → acceptable at runtime; the slot simply becomes an unattractive option this run.
- Pawn placed on incompatible modified slot → no negative warning spam; no green link; tooltip remains available.
- Color-specific note modifier on pawn that emits a different output color → no bonus notes.
- `+1 output note` or `+2 output notes` on finisher → adds to finisher's output note count (base of 1 becomes 2 or 3).
- `+1 output note` on generator → adds to generator's emitted note count (base of 2 becomes 3).
- `Double activation` on finisher with no remaining packet on second cast → second cast resolves honestly with reduced or zero benefit.
- `Double activation` visual readability → must not appear as two unrelated beats; show the small vinyl rebound / needle reread.
- `+1 extra beam` on lock-on beam with only one enemy alive → second beam is not created (no valid second target).
- `+1 extra beam` on sweeping beam → second beam sweeps in reverse direction; both beams must not visually overlap.
- Tooltip conflict between pawn and modifier inspection → only one active tooltip target at a time.
- Modified slot occupied by pawn → icon must remain visible because it lives outside the record, not underneath the pawn.
- Note packet overflow with bonus notes → bonus notes are clamped by existing `NOTE_PACKET_CAPACITY` just like base notes.

## Architecture Notes

- Complex conditional modifiers were intentionally rejected for `v1` because they create too much build-phase parsing cost.
- Neighbor-based or packet-state-based rules were intentionally rejected because they are hard to iconize and would fight mobile readability.
- Modifier compatibility uses the pawn's existing `primaryArchetype` field — the pawn overhaul already provides this. No new tagging infrastructure is needed.
- `Double activation` is intentionally a real repeated activation, not a disguised numeric multiplier. This preserves gameplay honesty and creates natural asymmetry between pawn behaviors.
- Stage-specific weight override was chosen over class-level multipliers because it is more explicit and easier to reason about in balance tuning.
- The modifier icon is intentionally outside the slot because placing it inside the slot would make the rule disappear behind the pawn at the exact moment the player most needs to remember it.
- The `+50% AoE radius` modifier is intentionally cross-archetype (explosion + zone) because both archetypes share the concept of a damage radius. This avoids modifier pool bloat.
- `+1 extra beam` requires special targeting rules (different enemies for lock-on, reverse sweep for sweeping) to ensure the two beams don't redundantly overlap.

## Validation and Testing

- A stage with count weights forcing `0` generates no slot modifiers.
- A stage with count weights forcing `1`, `2`, or `3` generates exactly that many unique modified slots.
- Slot generation never assigns more than one modifier to the same slot.
- Stage generation never produces more than one premium modifier.
- A modifier with global weight `0` never appears unless a stage override raises it above `0`.
- A modifier with stage override weight `0` never appears on that stage.
- Common modifiers are allowed to repeat across different slots in one stage.
- Premium modifiers never repeat within one stage.
- `+1 output note` correctly increases generator output notes (2 → 3).
- `+1 output note` correctly increases finisher output notes (1 → 2).
- `+1 red output note` only applies when the activation emits red output notes.
- `+1 projectile` only applies to pawns with `primaryArchetype: 'projectile'`.
- `+50% AoE radius` applies to pawns with `primaryArchetype: 'explosion'` OR `'zone'`.
- `+50% AoE radius` does NOT apply to pawns with `primaryArchetype: 'projectile'` or `'beam'`.
- `+1 extra beam` only applies to pawns with `primaryArchetype: 'beam'`.
- `+1 extra beam` lock-on: second beam targets a different enemy or is not created.
- `+1 extra beam` sweeping: second beam sweeps in the opposite direction.
- `+2 output notes` is rarer than common modifiers according to config weights and respects premium cap.
- `Double activation` resolves two real activations in sequence.
- `Double activation` on finisher uses post-first-cast packet state for the second cast.
- Returning from combat to build phase preserves the same modifier assignments for the stage.
- Modifier icons remain visible when slots are occupied.
- Holding a modifier icon shows the correct tooltip in the top-center tooltip area.
- Holding a pawn shows the pawn tooltip in the same tooltip area.
- Only one tooltip is visible at a time.
- Placing a compatible pawn into a modified slot triggers the positive link flash.
- Incompatible placement does not show false-positive synergy UI.
- Inspecting a compatible slot or pawn can re-show the compatibility link.
- Build-phase UI remains readable with 3 modified slots present.
- No regressions in existing stage purchasing, merging, repositioning, rerolling, or wave-start flow.

## Definition of Done

- Slot modifiers can be authored in config and validated by automated tests.
- Stage runtime generates `0–3` slot modifiers using weighted stage rules and per-modifier weights.
- Generated slot modifiers persist for the full stage across multiple waves.
- Stage build UI renders modifier icons outside the record and supports hold-to-inspect tooltips.
- A dedicated top-center tooltip presentation area works for both modifier and pawn inspection.
- Compatible pawn/modifier matches produce positive link feedback in build phase.
- Combat activation logic applies all modifiers correctly, including archetype matching and double activation.
- `+1 extra beam` targeting rules (different enemy / reverse sweep) work correctly.
- `Double activation` is both mechanically correct and visually legible through a vinyl rebound / reread presentation.
- Existing build/combat flow still works end-to-end.
- There are automated tests for generation rules, config validation, and core modifier runtime behavior.
- Each new module is independently testable and reasonably small.

## Assumptions

- The MVP ships with one `StageConfig`. In the future, multiple configs power a stage-select screen — the `StageConfig` interface is designed for this from day one.
- During the transition, `CombatWaveConfig.WAVES` and `getCombatWaveDefinition()` coexist with `StageConfig.waveDefinitions`. Eventually the global array is deprecated.
- The pawn overhaul is already implemented — `primaryArchetype` is available on all pawn ability definitions as `'projectile' | 'explosion' | 'beam' | 'zone'`.
- Future pawn content will continue to use the same archetype system; no new metadata is needed for modifier compatibility.
- Tooltip rendering can live in `StageScene` initially without violating architectural constraints, via small imported bridge modules.
- Modifier icons can be implemented with simple Phaser display objects first, even if final art is not yet ready.
- The current note packet model remains single-color and capacity-limited as already implemented.
- Combat VFX for modifier-triggered behavior can initially reuse or lightly extend existing event-driven visuals rather than requiring a new dedicated VFX subsystem.
- The `StageScene` tooltip system can be extended for modifier inspection without a full rewrite.

## Open Questions

- Exact tooltip visual styling, animation timing, and art assets are not yet specified.
- Exact VFX treatment for `+1 extra beam` sweeping in reverse and for `Double activation` vinyl rebound is not yet specified — implement as simple tween/rotation transforms initially.
- Whether combat VFX for modifier-triggered behavior should use a dedicated `combat:modifier-applied` event or simply be derived from the existing note/activation events. Recommendation: start with existing events; add a dedicated event only if VFX needs prove distinct.
- Exact art for modifier icons — can start with procedural placeholder shapes keyed by `iconKey`.

## UI / UX

- Modifier icons should sit just outside the outer edge of the record at the angular position of their slot.
- Icons should be visually attractive and legible at mobile size.
- Tooltip interaction uses hold-to-inspect, not toggle-lock.
- Tooltip area should be centered near the top of the build screen and reused for both pawns and modifiers.
- Only one tooltip target is active at any time.
- Positive compatibility should be communicated by:
  - brief green animated link on successful placement or move;
  - optional re-display of the link while inspecting related objects.
- The UI should emphasize successful matches but not actively shame mismatches.

## Art Direction

- Modifier visuals should feel native to the vinyl / neon-cyberpunk style of the game.
- The icon should read like a stylish attachment to the record, not like debug markup.
- `Double activation` should be sold through physical motion:
  - the record snaps slightly backward;
  - the needle visually re-reads the same slot;
  - the player can immediately understand why the slot fired twice.
- Green compatibility links should be semi-transparent, broad enough to feel lush rather than technical, and short-lived to avoid clutter.

## Performance / Technical Constraints

- Build-phase compatibility visualization must remain cheap; only up to 3 modified slots exist, so per-frame cost should stay low.
- Tooltip and link rendering should avoid creating large numbers of transient objects during drag operations.
- Combat double activation should avoid recursive or fragile logic; prefer an explicit repeated resolution path with clear guardrails.
- Each new module should be small and independently testable — avoid adding hundreds of lines to already-large files.
- Beam, projectile, explosion, and zone family modules already exist and are well-factored — modifier integration should follow the same modular pattern.

## Live Ops / Tuning

- Every modifier has a global default weight in `SlotModifierConfig`.
- Every `StageConfig` can override specific modifier weights via `slotModifierWeightOverrides`.
- Weight `0` is the canonical disable mechanism.
- Stage tuning for onboarding should rely on weights rather than stage-specific bespoke logic.
- Modifier count distribution is stage-authored via explicit weights for `0`, `1`, `2`, and `3`.
- Adding a new stage config means adding a new entry to `STAGE_CONFIGS` — no code changes needed beyond the config object.

---

## Appendix A: Conflict Resolution Log (May 2026 Audit)

This revision was produced by auditing the original spec against the implemented pawn overhaul and current codebase. The following conflicts were resolved:

| # | Conflict | Resolution |
|---|----------|------------|
| 1 | Spec used "AoE" / "aoe" as archetype name; code uses `'explosion'` | Kept "AoE" as the **player-facing modifier name** (`+50% AoE radius`), but the compatibility logic matches against `primaryArchetype: 'explosion'` AND `'zone'` — it is a cross-archetype modifier. |
| 2 | Spec used "subclass" for pawn categories; code uses `primaryArchetype` | Replaced all "subclass" terminology with "archetype" to match pawn overhaul. |
| 3 | Spec proposed lightweight "pawn subclass metadata" tags | Removed — compatibility reads `primaryArchetype` directly from pawn ability definitions. No new metadata needed. |
| 4 | Spec's first content pool had 9 modifiers with no zone mention | Kept 9 modifiers. Clarified that `+50% AoE radius` is cross-archetype (explosion + zone). |
| 5 | Spec referenced `StageModifierConfig.ts` or "stage fields in existing stage config" | Recommended new `StageContentConfig.ts` keyed by wave index, since no standalone stage config exists today. |
| 6 | Spec's `StageRuntime` extension was abstract | Specified exact field: `slotModifiers: SlotModifierAssignment[]` in the interface, generated in `createStageRuntime()`. |
| 7 | Spec's `CombatRuntime` extension was abstract | Specified exact field: `slotModifiers: Array<SlotModifierAssignment \| null>` indexed by slot, added to `CreateCombatRuntimeOptions`. |
| 8 | Spec didn't address hardcoded note counts in activation | Clarified: `bonusNotes` parameter added to existing note mutation helpers. Base logic unchanged. |
| 9 | Spec didn't address `count: 1` hardcode in `pushCombatFinisherOutputNoteEmitted` | Specified: change payload to `count: number`. |
| 10 | Spec mentioned large files (`CombatActivation.ts`, `StageScene.ts`) | Added explicit architecture principle: all new integration is via small, focused modules — no inflating existing monoliths. |
| 11 | `+1 extra beam` had no targeting rules | Added: lock-on beams must target different enemies; sweeping beams must sweep in opposite directions. |
| 12 | Spec listed "Open Questions" about pawn capability metadata | Removed — answered by pawn overhaul's `primaryArchetype`. |
| 13 | Spec listed "Open Questions" about stage config location | Updated with concrete recommendation (`StageContentConfig.ts`). |
| 14 | `EventBus` integration was vague | Specified exact optional event: `combat:modifier-applied`. Noted existing events already cover VFX needs. |
| 15 | Spec didn't reference actual `CombatPawnBuffs.ts` | Added note: pawn buff system is separate from slot modifiers — no conflict, no shared code needed. |
| 16 | `+1 projectile` effect undefined — add to `projectileCount`, `volleyShotCount`, or spawn separate? | Resolved: adds to `projectileCount` for shotgun-spread, `volleyShotCount` for volley, no effect for single-shot. Specified in content pool and effect params. |
| 17 | `bonusNotes` application point in same-color stacking ambiguous | Resolved: bonus applied before clamping as single sum. `min(prevCount + 2 + bonusNotes, CAPACITY)`. Specified in Note-Output Modifier Rules. |
| 18 | `+50% AoE radius` application point unspecified | Resolved: resolver returns `radiusMultiplier` (default `1.0`); `resolveExplosionAbility` and `resolveZoneAbility` apply it to `ability.radius`. Specified in SlotModifierMutations shape and CombatActivation changes. |
| 19 | Stage config location ambiguous; wave-index keying contradicts per-stage persistence | Resolved: introduced `StageConfig` interface as foundational data model. Combines waves, economy, and modifier tuning. `createStageRuntime()` accepts `StageConfig`. Wave definitions move into each stage config. Future-proofed for stage-select screen. |
| 20 | `pushCombatFinisherOutputNoteEmitted` — only payload type mentioned, function signature change omitted | Fixed: spec now states both function signature AND payload type change to accept `count: number`. |
| 21 | `resolveCombatActivations` not mentioned by name | Fixed: spec now references the exact function name in integration instructions. |
| 22 | Generator vs finisher color check for color-specific modifiers not distinguished | Fixed: spec now explicitly states generators use `pawn.color`, finishers use `outputNoteColor`. |
| 23 | File size estimates stale (`CombatRuntime.ts` 421→595, `CombatActivation.ts` 273→375) | Updated to current approximate sizes. |
| 24 | "10 modifiers" vs 9 listed — contradiction | Fixed: "9" throughout. |
| 25 | Open Questions: `+1 projectile`, stage config location resolved | Removed from open questions. Remaining: visual styling, VFX, icon art. |
