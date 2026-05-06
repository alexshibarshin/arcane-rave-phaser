# Slot Modifiers - Design Spec

## Document Intent

This document is a self-contained implementation handoff for the `slot modifier` feature in `Arcane Rave`. It is written for an agent with zero access to the original discussion. It captures the player-facing intent, confirmed design decisions, integration expectations, implementation shape, data model, UI behavior, and validation requirements needed to build a first solid version safely inside the current Phaser 3 + TypeScript scaffold.

## Executive Summary

`Slot modifier` is a stage-level build mechanic that places a small number of special effects onto individual `record` slots. These effects stay fixed for the entire `stage` and exist to deepen build decisions in `build phase`: where to place pawns, which pawn subclasses to prioritize, and which note-producing segments are worth assembling on this particular run.

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

## Non-Goals

- This iteration does not design the full future pawn roster.
- This iteration does not redesign the entire note system.
- This iteration does not add complex conditional slot rules such as neighbor checks, packet-state branches, or multi-slot logic puzzles.
- This iteration does not add save/load persistence beyond current stage runtime needs.
- This iteration does not solve long-term content scaling for dozens of modifiers.
- This iteration does not add subclass weight groups or stage-level modifier-class multipliers.
- This iteration does not require modifiers to be rendered directly inside occupied slots.

## Feature Scope

In scope for `v1`:

- A new authored content set of `slot modifiers`.
- Stage-time generation of `0-3` modified slots when a stage runtime is created.
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

- Authoring a large subclass taxonomy.
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
- some runs produce one obvious “interesting slot”;
- rare premium slots create a stronger “I should build around this” moment.

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

Modifiers work through one of two readable compatibility shapes:

- note-output modifiers: they affect any pawn activation that emits `output note`;
- subclass modifiers: they affect pawns that belong to a supported gameplay subclass such as `projectile`, `aoe`, or `beam`.

Important confirmed rule:

- note bonuses are defined in terms of `output note`, not `generator-only note generation`;
- therefore both `generator` and `finisher` can benefit if their activation emits output notes.

### First Content Pool

#### Common note modifiers

1. `+1 output note`
2. `+1 red output note`
3. `+1 green output note`
4. `+1 blue output note`

#### Common subclass modifiers

5. `+1 projectile`
6. `+50% AoE radius`
7. `+1 extra beam`

#### Premium modifiers

8. `+2 output notes`
9. `Double activation`

### Double Activation Rules

- `Double activation` performs two real activations of the same slot back-to-back within one beat.
- The second activation resolves against the updated combat state after the first activation.
- There is no special-case protection for `finisher`.
- If a finisher spends its notes on the first activation, the second activation uses whatever note packet remains.
- This asymmetry is desired and part of the slot’s build meaning.
- The effect is logically one beat, not a separate global time-control action.

### Sequential Flows

#### Stage generation flow

1. Create stage runtime.
2. Roll how many modified slots exist using stage-configured count weights for `0/1/2/3`.
3. Choose that many unique slot indices uniformly from the 8 slots.
4. For each chosen slot, roll a modifier from the weighted pool.
5. While rolling:
   - respect the stage-specific override weight if present;
   - otherwise use the global modifier weight;
   - treat weight `0` as unavailable;
   - if one premium has already been chosen, all other premium candidates are treated as weight `0`.
6. Store the generated modifier assignment in stage runtime.

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
5. Modifier compatibility passively shapes where pawns feel “best”.

### Combat Phase

1. Player manually starts the wave.
2. Combat scene is launched with stage loadout and stage modifier data.
3. Slot modifiers affect runtime activations:
   - note-output count increases;
   - subclass-specific behavior bumps;
   - double activation when applicable.
4. Wave ends as usual.
5. Stage returns to build phase with the same slot modifier positions and identities still intact.

### Stage Progression / Onboarding

- Stage configuration controls whether slot modifiers appear at all.
- Early onboarding can use `0` modifiers.
- Later stages can bias toward specific modifiers by weight override.
- The MVP should be able to introduce:
  - no modifiers first;
  - then simple note-output modifiers;
  - then subclass modifiers;
  - then `Double activation` as an early premium teaching moment.

## System Model

### Major Runtime Pieces

- `StageRuntime`
  - authoritative stage-local owner of generated slot modifiers.
  - persists modifier assignments across waves within a stage.

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

### Recommended Implementation Shape

Introduce the feature as three coordinated layers:

1. authored config and data schema;
2. stage-time generation and runtime state ownership;
3. build/combat integration.

### Proposed New / Extended Modules

- `src/config/SlotModifierConfig.ts`
  - authoritative catalog of all modifier definitions.
  - includes IDs, rarity, default global weight, icon/display keys, effect type, and effect parameters.

- `src/config/StageModifierConfig.ts` or stage fields added to existing stage config
  - per-stage weights for modifier counts `0/1/2/3`.
  - optional per-modifier weight overrides.
  - if the project later has an explicit stage definition file, these fields should live there instead of a separate config.

- `src/stage/StageSlotModifiers.ts`
  - pure logic for rolling slot modifiers.
  - no Phaser dependencies.
  - validates rarity cap and unique slot assignment.

- `src/stage/StageRuntime.ts`
  - extend runtime shape with generated slot modifiers.
  - generation should happen in `createStageRuntime`.

- `src/scenes/stage/StageScene.ts`
  - render outer-rim modifier badges.
  - handle hold-to-inspect.
  - manage top-center tooltip container.
  - compute compatibility between slot modifier and occupying pawn.
  - render temporary inspect/build-confirmation links.

- `src/combat/CombatRuntime.ts`
  - accept modifier data in `CreateCombatRuntimeOptions`.
  - store slot modifier mapping in runtime.

- `src/combat/CombatActivation.ts`
  - apply modifier effects during activation resolution.
  - add local helper functions for note-output mutation and repeated activation.

### Responsibilities and Boundaries

- Modifier generation must remain data-driven and deterministic for a given RNG stream.
- Build UI rendering logic must not own modifier generation rules.
- Combat activation should consume modifier effects, not reinterpret stage config directly.
- Tooltip UI should be feature-local to stage scene for now rather than expanding the global `UIScene`, unless the implementation naturally benefits from a reusable overlay presenter.

### Why this Structure Fits the Repo

The current architecture already separates:

- config values in `src/config/`;
- runtime state in `src/stage/` and `src/combat/`;
- scene presentation in `src/scenes/`;
- shared scene communication in `src/events/EventBus.ts`.

The feature should follow the same split to avoid tangling authored balance data with Phaser scene code or combat internals.

## Data Flow

### Inputs

- global slot modifier definitions;
- stage-specific modifier count weights;
- stage-specific per-modifier weight overrides;
- current pawn placement on build slots;
- combat slot activations and current note packet state.

### Generation Path

1. `createStageRuntime()` initializes stage state.
2. Slot modifier generation rolls count and per-slot effect assignment.
3. Generated slot modifier map is stored in stage runtime.
4. `StageScene` reads that runtime state and renders icons.

### Transition into Combat

1. Stage prepares loadout from `runtime.build.slots`.
2. Stage also passes current slot modifier map into combat scene/runtime creation.
3. Combat runtime stores modifier references aligned by slot index.

### Runtime Application

1. Slot crossing triggers activation.
2. Activation logic resolves base pawn effect.
3. Slot modifier mutates the activation:
   - note output amount;
   - subclass-specific attack behavior;
   - extra activation count for `Double activation`.
4. Resulting note packet and combat events are emitted normally.

### Outputs

- build-phase visuals for modifier icons and compatibility links;
- tooltip content for active inspection target;
- combat behavior changes;
- optional new runtime events for modifier-triggered VFX if desired.

## State Model

### Persistent During a Stage

- generated set of modified slot indices;
- exact modifier ID assigned to each modified slot.

### Recomputed / Derived

- whether the pawn currently on a slot is compatible with that slot’s modifier;
- whether a green compatibility link should currently be visible;
- tooltip content based on the currently held target.

### Combat Runtime State

- slot modifier mapping aligned to combat slot indices;
- any transient “double activation in progress” flag if needed internally for sequencing or VFX.

### Invariants

- no more than 3 modified slots per stage;
- no more than 1 premium modifier per stage;
- each modified slot has exactly one modifier;
- each slot index appears at most once in the generated mapping;
- weight `0` means unavailable in the current stage roll;
- common modifiers may repeat across slots, premium may not due to cap;
- a modifier never changes meaning based on inspection context;
- note-output modifiers apply to any pawn activation that emits output notes.

## Integration Points

- `src/stage/StageRuntime.ts`
  - add generation and storage of stage modifiers.

- `src/stage/StageBuild.ts`
  - likely unchanged for generation, but may need helper accessors if UI wants slot-aligned combined data.

- `src/scenes/stage/StageScene.ts`
  - primary build-phase UI integration point.

- `src/combat/CombatRuntime.ts`
  - receives stage modifier data.

- `src/combat/CombatActivation.ts`
  - applies runtime effect mutations.

- `src/events/EventBus.ts`
  - may gain new typed events for tooltip or modifier-triggered UI/VFX if needed.

- `src/config/CombatContentConfig.ts`
  - future pawn subclass tagging likely belongs here or in adjacent pawn-content schema.

- `src/scenes/UIScene.ts`
  - currently minimal; may remain untouched if tooltip lives inside `StageScene`.

## Content and Configuration

### Modifier Definition Schema

Each modifier definition should include, at minimum:

- `id`
- `rarity`: `common | premium`
- `defaultWeight`
- `displayName`
- `shortDescription`
- `iconKey` or icon descriptor
- `effectKind`
- `effectParams`

Recommended `effectKind` values for `v1`:

- `output-note-bonus`
- `color-output-note-bonus`
- `projectile-bonus`
- `aoe-radius-scale`
- `beam-count-bonus`
- `double-activation`

Recommended parameters:

- note bonus count
- target color, when relevant
- projectile bonus count
- AoE radius multiplier
- beam bonus count
- activation repeat count

### Pawn Compatibility Metadata

`v1` needs lightweight pawn subclass metadata for subclass modifiers.

Recommended shape:

- small gameplay subclass / capability tags attached to pawn definitions;
- keep the set intentionally small;
- enough for `projectile`, `aoe`, and `beam`.

This should not become a deep generic tag system in `v1`. It only needs to support the current modifier pool and near-future pawn roster work.

### Stage Config Schema

Each stage should be able to author:

- `slotModifierCountWeights`
  - weights for counts `0`, `1`, `2`, `3`

- `slotModifierWeightOverrides`
  - record from modifier ID to override weight

Behavior:

- omitted override => use global default weight;
- override `0` => modifier banned on that stage.

### Suggested Defaults

- most stages should bias toward `1` modifier;
- `2` should be less common;
- `3` should be rare;
- early onboarding stages may set `0` high or exclusive;
- `Double activation` can be effectively forced by setting other premium weights to `0` and its own weight high on the teaching stage.

### Validation Rules

- every stage count weight table must define `0-3`;
- weights must be non-negative;
- at least one count weight must be greater than `0`;
- every override key must reference a known modifier ID;
- every modifier ID must be unique;
- every modifier icon/display reference must be valid;
- every modifier `effectKind` must have the required params;
- every subclass modifier must target a supported pawn capability in content.

## Technical Constraints

- The repo currently uses `config/` for runtime-level tunables; new modifier content should follow that pattern.
- The repo already relies on `EventBus` as the only shared communication channel between scenes and systems.
- Current combat content only has `generator` and `finisher`; subclass metadata for future pawns is not yet fully authored.
- The project targets mobile portrait readability, so UI density is a hard constraint.
- The build phase already has several simultaneous informational layers: shop, slot order, synergy, wave preview, coins, and drag interactions. Modifier UI must remain lightweight.
- The combat activation pipeline is currently direct and deterministic; modifier integration should preserve this clarity.

## Failure Modes and Edge Cases

- Stage count weights all set to zero
  - validation error in config tests.

- All available modifier weights for a chosen roll resolve to zero
  - generation should fail loudly in tests/development rather than silently producing malformed state.

- Modifier assigned to slot, but no compatible pawn exists in current content
  - acceptable at runtime; the slot simply becomes an unattractive option this run.

- Pawn placed on incompatible modified slot
  - no negative warning spam; no green link; tooltip remains available.

- Color-specific note modifier on pawn that emits a different output color
  - no effect.

- `+1 output note` or `+2 output notes` on finisher
  - applies to finisher output note because bonuses target `output note`, not generator-only emission.

- `Double activation` on finisher with no remaining packet on second cast
  - second cast resolves honestly with reduced or zero benefit.

- `Double activation` visual readability
  - must not appear as two unrelated beats; show the small vinyl rebound / needle reread.

- Tooltip conflict between pawn and modifier inspection
  - only one active tooltip target at a time.

- Modified slot occupied by pawn
  - icon must remain visible because it lives outside the record, not underneath the pawn.

## Architecture Notes

- Complex conditional modifiers were intentionally rejected for `v1` because they create too much build-phase parsing cost.
- Neighbor-based or packet-state-based rules were intentionally rejected because they are hard to iconize and would fight mobile readability.
- Modifier compatibility uses a small capability model for future pawn subclasses, but `v1` should avoid overengineering a universal tagging framework.
- `Double activation` is intentionally a real repeated activation, not a disguised numeric multiplier. This preserves gameplay honesty and creates natural asymmetry between pawn behaviors.
- Stage-specific weight override was chosen over class-level multipliers because it is more explicit and easier to reason about in balance tuning.
- The modifier icon is intentionally outside the slot because placing it inside the slot would make the rule disappear behind the pawn at the exact moment the player most needs to remember it.

## Validation and Testing

- A stage with count weights forcing `0` generates no slot modifiers.
- A stage with count weights forcing `1`, `2`, or `3` generates exactly that many unique modified slots.
- Slot generation never assigns more than one modifier to the same slot.
- Stage generation never produces more than one premium modifier.
- A modifier with global weight `0` never appears unless a stage override raises it above `0`.
- A modifier with stage override weight `0` never appears on that stage.
- Common modifiers are allowed to repeat across different slots in one stage.
- Premium modifiers never repeat within one stage.
- `+1 output note` correctly increases generator output notes.
- `+1 output note` correctly increases finisher output notes.
- `+1 red output note` only applies when the activation emits red output notes.
- `+1 projectile` only applies to projectile-compatible pawns.
- `+50% AoE radius` only applies to AoE-compatible pawns.
- `+1 extra beam` only applies to beam-compatible pawns.
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
- Stage runtime generates `0-3` slot modifiers using weighted stage rules and per-modifier weights.
- Generated slot modifiers persist for the full stage across multiple waves.
- Stage build UI renders modifier icons outside the record and supports hold-to-inspect tooltips.
- A dedicated top-center tooltip presentation area works for both modifier and pawn inspection.
- Compatible pawn/modifier matches produce positive link feedback in build phase.
- Combat activation logic applies the first 9 modifiers correctly.
- `Double activation` is both mechanically correct and visually legible through a vinyl rebound / reread presentation.
- Existing build/combat flow still works end-to-end.
- There are automated tests for generation rules, config validation, and at least core modifier runtime behavior.

## Assumptions

- There will be at least three authored stages in MVP, and stage configs are a valid place to tune modifier introduction pacing.
- Stage definition data is either already present elsewhere or will soon become explicit enough to host modifier weight overrides cleanly.
- Future pawn content will add lightweight subclass/capability metadata for `projectile`, `aoe`, and `beam`.
- Tooltip rendering can live in `StageScene` initially without violating architectural constraints, even though a reusable overlay system may emerge later.
- Modifier icons can be implemented with simple Phaser display objects first, even if final art is not yet ready.
- The current note packet model remains single-color and capacity-limited as already implemented.
- Combat VFX for modifier-triggered behavior can initially reuse or lightly extend existing event-driven visuals rather than requiring a new dedicated VFX subsystem.

## Open Questions

- Exact authored stage config location for modifier count weights and per-modifier weight overrides is not yet confirmed in the repo structure.
- Exact pawn capability metadata schema is not yet confirmed because the future pawn roster is still to be designed.
- Exact tooltip visual styling, animation timing, and art assets are not yet specified.
- Exact VFX treatment for non-premium subclass modifiers such as `+1 projectile` and `+1 extra beam` is not yet specified.

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
  - the needle visually rereads the same slot;
  - the player can immediately understand why the slot fired twice.
- Green compatibility links should be semi-transparent, broad enough to feel lush rather than technical, and short-lived to avoid clutter.

## Performance / Technical Constraints

- Build-phase compatibility visualization must remain cheap; only up to 3 modified slots exist, so per-frame cost should stay low.
- Tooltip and link rendering should avoid creating large numbers of transient objects during drag operations.
- Combat double activation should avoid recursive or fragile logic; prefer an explicit repeated resolution path with clear guardrails.

## Live Ops / Tuning

- Every modifier has a global default weight.
- Every stage can override specific modifier weights.
- Weight `0` is the canonical disable mechanism.
- Stage tuning for onboarding should rely on weights rather than stage-specific bespoke logic.
- Modifier count distribution is stage-authored via explicit weights for `0`, `1`, `2`, and `3`.
