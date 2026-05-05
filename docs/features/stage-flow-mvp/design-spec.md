# Stage Flow MVP - Design Spec

## Document Intent

This document is a self-contained implementation handoff for the Stage Flow MVP feature in `Arcane Rave`. It is written so that an implementation agent can understand the intent, player flow, architecture, state model, and validation requirements without access to prior chat context.

## Executive Summary

Stage Flow MVP introduces the first real `stage` loop to the current combat sandbox. Instead of booting directly into a standalone combat simulation, the game should support explicit phase transitions between a player-controlled `build phase` and a runtime-driven `combat phase`, then return to the next build phase after combat resolution.

This feature exists because the core vision of `Arcane Rave` is not “a battle toy” but “a sequence of short waves separated by build decisions.” The current project already has a solid combat sandbox with wave progression, HUD, combat outcome, and note/record systems, but it lacks the orchestration layer that turns that combat into a stage-based game loop.

Successful implementation should feel like the first believable slice of the real game: the player enters a build screen, sees their available coins and the upcoming wave, manually starts combat, watches the combat resolve, receives a reward, and returns to a new build phase with updated stage state.

## Problem Statement

The current application structure starts `BootScene` and immediately transitions into `CombatScene`. This is useful for sandbox iteration but does not represent the intended product flow from `VISION.md`, where each `stage` is a sequence of alternating `build phase` and `combat phase` segments. As a result:

- there is no authoritative runtime model for a stage across multiple waves;
- there is no place to hold cross-wave resources such as `coins` and phase state;
- combat victory currently terminates the combat sandbox rather than advancing stage progression;
- the future `shop` has no lifecycle anchor for when it appears, refreshes, or pays out.

Without a stage loop, adding more combat content deepens an isolated sandbox instead of moving the project toward the actual game.

## Goals

- Add an authoritative `stage` runtime that survives across multiple waves.
- Introduce explicit phase states for `build` and `combat`.
- Let the player manually launch the next wave from build phase.
- Return to build phase after combat victory with updated stage progression and reward payout.
- Provide a player-visible `next wave preview` and current `coins` readout during build phase.
- Establish the architectural foundation that the future `shop`, `merge`, and `repositioning` systems will plug into.
- Keep the first implementation narrow enough to ship without redesigning the existing combat runtime.

## Non-Goals

- Full `shop` design with reroll scaling, complete pawn assortment rules, and merge UX.
- Finalized drag/drop record editing or complete build-phase interaction model.
- Stage preview before entering a stage.
- Boss-wave flow, star rating, or end-of-stage summary.
- Save persistence, meta-progression, unlocks, or economy balancing beyond simple per-wave rewards.
- Replacing the current combat runtime with a generalized multi-mode simulation engine.

## Feature Scope

This iteration includes:

- A new stage-level runtime/state holder that tracks:
  - current stage phase;
  - current wave index;
  - total waves;
  - current `coins`;
  - pending combat result;
  - whether the stage is still in progress.
- A `build phase` presentation layer that shows:
  - phase label;
  - current coins;
  - next wave preview summary;
  - a `Start Wave` action.
- A transition from build phase into combat phase only when the player triggers it manually.
- Use of the existing combat sandbox as the combat executor for the current wave.
- A return path from combat victory into build phase with a simple reward grant and next-wave increment.
- A defeat path that ends the stage loop for this MVP in a simple game-over state.
- Minimal hooks needed so a later Shop MVP can plug into the build phase without refactoring the stage model.

This iteration may optionally include a tiny placeholder shop panel, but that panel is not required for the Stage Flow MVP to be considered complete.

## Player Experience

The player launches the game and lands in a calm build-oriented state instead of instant combat. They can immediately see that the game has phases: there is a visible build state, a visible currency counter, and a visible preview of what comes next.

From there, the player performs one high-intent action: starting the next wave manually. Combat then takes over using the already-built combat presentation and simulation systems. The player watches the outcome using the existing combat HUD and runtime behaviors.

When the wave ends in victory, the game should not feel “finished”; it should feel like the player has advanced to the next decision window. The combat scene exits, the build phase returns, the player sees their updated coins and new upcoming wave, and the loop clearly invites the next run. On defeat, the state should communicate that the stage failed and the loop has stopped.

Moment to moment, this feature should feel like a scaffolding of the final game loop rather than a menu overlay bolted on top of the combat sandbox.

## Core Mechanics

1. Game boot enters a stage controller flow rather than launching combat immediately.
2. A fresh `stage runtime` is created with:
   - phase = `build`;
   - current wave index = `0`;
   - initial coins from config;
   - no pending combat result;
   - stage status = `in_progress`.
3. In build phase, the player can inspect:
   - current coins;
   - next wave number;
   - next wave preview data derived from authored combat wave content.
4. The player starts combat explicitly via a `Start Wave` control.
5. Starting combat transitions stage state from `build` to `combat` and launches the combat scene for the current wave.
6. The combat scene runs the existing combat loop for that wave.
7. When combat emits `combat:ended`:
   - on `victory`, the stage runtime records success, grants coins, increments the wave index, and either:
     - returns to `build` if more waves remain;
     - or transitions to a simple `stage_complete` terminal state if no waves remain;
   - on `defeat`, the stage runtime transitions to a simple `stage_failed` terminal state.
8. While not in `build`, the `Start Wave` action is unavailable.

Standing rules:

- Build phase is player-paced. There is no timer.
- Combat phase is not auto-started after build initialization.
- The current wave preview in build phase is read-only in this MVP.
- Stage rewards are granted only on combat victory.
- Combat restart/pause behavior remains combat-local and should not bypass the authoritative stage result flow.
- If the stage reaches a terminal state, build controls should no longer allow starting a new wave.

## Gameplay Flow

Primary flow:

1. App boots.
2. Stage runtime initializes for a fresh stage.
3. Build phase UI appears with coins and upcoming wave preview.
4. Player presses `Start Wave`.
5. Combat scene runs the current wave using stage-selected wave data.
6. Combat ends in victory.
7. Stage runtime grants a simple reward and advances to the next wave.
8. Build phase UI reappears with updated coins and the next wave preview.
9. Loop repeats until all configured waves are cleared.

Victory terminal flow:

1. Player clears the final authored wave.
2. Stage runtime transitions to `stage_complete`.
3. UI displays a simple completed-state message for this MVP.
4. No further wave can be started.

Defeat terminal flow:

1. Player loses a combat wave.
2. Stage runtime transitions to `stage_failed`.
3. UI displays a simple failed-state message for this MVP.
4. No further wave can be started.

## System Model

- `StageRuntime`
  - Authoritative stage-local session state across waves.
  - Owns phase, wave progression, reward application, and terminal state.
- `StageFlowSystem` or equivalent scene-bound controller
  - Advances stage transitions in response to player commands and combat outcome events.
  - Bridges stage state to scenes/HUD without embedding logic in rendering code.
- `BuildPhaseScene` or stage overlay scene
  - Presents build-phase UI and receives player input such as `Start Wave`.
  - Does not own authoritative progression logic.
- Existing `CombatScene`
  - Executes combat for the currently selected wave.
  - Should become a consumer of stage-selected wave context rather than a globally self-starting sandbox.
- Existing `HUDScene`
  - Either remains combat-only, or is split into combat/build overlays depending on implementation shape.
  - Should not become the source of stage truth.
- `EventBus`
  - Remains the single shared communication channel between scenes and systems.
- Config layer
  - Stores stage-flow constants such as starting coins and victory rewards.
- Combat wave content
  - Remains the authoritative source for wave preview and combat composition.

## Technical Design

The feature should add a stage orchestration layer above the existing combat runtime instead of trying to extend `CombatRuntime` to do build/combat switching internally. Combat is already a self-contained simulation with its own state machine (`preview`, `running`, `paused`, `victory`, `defeat`). Stage flow is a higher-level concern and should remain separate.

Recommended implementation shape:

- Add a new `StageScene` as the main scene entered from `BootScene`.
- Keep `CombatScene` as a sub-scene launched and stopped by `StageScene`.
- Add a new build-oriented overlay scene, or let `StageScene` directly render the minimal build UI if that keeps the MVP simpler.
- Introduce a new `StageRuntime` module under a stage-focused folder such as `src/stage/` to avoid combat coupling.
- Add a `StageStateSystem` or `StageFlowSystem` under `src/systems/` if the project wants stage updates to follow the same system conventions as combat.

Responsibilities should be divided as follows:

- `BootScene`
  - Preload minimal assets.
  - Start the new main stage scene instead of `CombatScene`.
- `StageScene`
  - Create and own the stage runtime instance.
  - Subscribe to `combat:ended`.
  - Launch/stop combat and build overlays based on stage phase.
  - Emit stage-level events for UI synchronization.
- `CombatScene`
  - Accept selected wave context from the stage layer rather than always constructing wave `0`.
  - Continue owning combat-only runtime, visuals, and combat-local pause/restart controls.
- `EventBus`
  - Gain new stage-level events rather than overloading combat event names with stage semantics.

Suggested new modules:

- `src/stage/StageRuntime.ts`
- `src/stage/StageEvents.ts` or stage helpers colocated with `EventBus` typing
- `src/config/StageFlowConfig.ts`
- `src/scenes/stage/StageScene.ts`
- `src/scenes/stage/BuildPhaseScene.ts` or `src/scenes/stage/BuildOverlayScene.ts`

Suggested new scene keys:

- `STAGE`
- `BUILD`

Combat should be integrated by parameterization, not by branching the combat scene between “sandbox mode” and “stage mode” everywhere possible. The stage layer should provide the selected wave index or wave definition at creation/reset time.

Lifecycle concerns:

- Stage runtime should be created once per app run for this MVP.
- Combat runtime should be recreated each time a wave starts.
- Stage subscriptions to `EventBus` must be removed on scene shutdown.
- Build UI should update reactively from stage state rather than polling combat internals.
- Restart behavior must be clearly scoped:
  - combat-local restart can remain for sandbox convenience, but it should either be disabled in Stage Flow MVP or wired to restart the current wave without corrupting stage state.

## Data Flow

- Input enters through build-phase UI actions such as `Start Wave`.
- Build UI emits a stage-level command event such as `stage:start-wave-requested`.
- `StageScene` or `StageFlowSystem` validates the request against authoritative stage runtime.
- If valid, stage runtime transitions to `combat`.
- `StageScene` launches `CombatScene` and passes the selected wave context.
- `CombatScene` creates a combat runtime for that selected wave and publishes existing combat events.
- On combat completion, `CombatScene` emits `combat:ended`.
- `StageScene` consumes `combat:ended`, resolves rewards/progression, updates the stage runtime, and emits a stage snapshot update.
- Build UI consumes stage snapshot events and redraws coins/phase/preview labels.

Authoritative data:

- current stage phase;
- current wave index;
- current coins;
- stage terminal result;
- selected wave definition for the next combat launch.

Derived data:

- build-phase labels;
- preview text;
- whether the `Start Wave` button is enabled;
- “stage complete” / “stage failed” messaging.

## State Model

Persistent state for this MVP:

- None beyond the app session. No save/load is required.

Session/runtime state:

- `StagePhase`
  - `build`
  - `combat`
  - `stage_complete`
  - `stage_failed`
- `currentWaveIndex`
- `totalWaves`
- `coins`
- `lastCombatOutcome` or equivalent transient result field

Transient/action state:

- `isStartingWave`
- `pendingCombatLaunch`
- temporary UI readiness flags if scenes initialize asynchronously

State transition rules:

- `build -> combat`
  - allowed only if:
    - stage is not terminal;
    - current wave index is within authored wave bounds;
    - no combat scene is already active.
- `combat -> build`
  - allowed only on combat victory when additional waves remain.
- `combat -> stage_complete`
  - allowed only on combat victory when the cleared wave is the last authored wave.
- `combat -> stage_failed`
  - allowed only on combat defeat.

Invariants:

- Exactly one stage runtime is authoritative at a time.
- Build and combat are never both authoritative phases simultaneously.
- `currentWaveIndex` always points to the next wave to launch while phase is `build`.
- `coins` never become negative through stage-flow logic.
- Terminal stage states do not allow further wave launches.

## Integration Points

- [src/scenes/BootScene.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/scenes/BootScene.ts)
  - must stop launching combat directly.
- [src/config/AppScenes.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/config/AppScenes.ts)
  - must register the new stage/build scenes.
- [src/config/GameConfig.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/config/GameConfig.ts)
  - should receive new scene keys.
- [src/events/EventBus.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/events/EventBus.ts)
  - must add stage-level typed events.
- [src/scenes/combat/CombatScene.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/scenes/combat/CombatScene.ts)
  - must accept wave selection from stage flow and publish terminal result back.
- [src/combat/CombatRuntime.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/combat/CombatRuntime.ts)
  - likely needs a way to initialize from a specific wave index or wave definition.
- [src/scenes/combat/HUDScene.ts](/Users/aleksey.shibarshin/Documents/Projects/PhaserProjects/arcane-rave-phaser/src/scenes/combat/HUDScene.ts)
  - may remain combat-only, but should not interfere with build presentation.

## Content and Configuration

Required new configuration:

- `INITIAL_COINS`
- `WAVE_CLEAR_REWARD_COINS`
- optional per-wave reward override support, if desired
- optional copy strings for build labels and terminal messages

Recommended config home:

- `src/config/StageFlowConfig.ts`

Content/data surfaces:

- Stage flow should use existing authored waves from `CombatWaveConfig`.
- Build-phase preview can initially show:
  - wave number;
  - enemy count;
  - enemy archetype summary;
  - color summary if cheaply derivable.

Validation rules:

- `INITIAL_COINS >= 0`
- reward values `>= 0`
- stage flow cannot reference a wave index outside `CombatWaveConfig.WAVES`
- total waves should equal the authored wave count unless an explicit subset feature is introduced later

## Technical Constraints

- The repo follows the rule that `EventBus` is the single shared communication channel.
- Runtime-level tunables should live in `src/config/`.
- Existing `GameScene` establishes a fixed frame pipeline; new runtime systems should respect that pattern if they update per frame.
- Avoid cyclic imports between stage modules, scenes, and combat modules.
- Combat should stay reusable as a self-contained execution layer rather than becoming stage-owned logic spread across scenes.
- MVP implementation should favor testable pure runtime transitions over scene-driven ad hoc state mutations.

## Failure Modes and Edge Cases

- Player presses `Start Wave` twice rapidly.
  - Only the first request should launch combat.
- Combat ends after stage scene has already shut down.
  - The event listener should be detached cleanly to avoid stale state mutations.
- `CombatWaveConfig.WAVES` is empty.
  - Stage should fail safe into a non-interactive terminal message or dev-facing assertion path.
- Build UI scene launches before stage runtime is ready.
  - UI should wait for an initial stage snapshot event or receive state during scene startup.
- Combat-local restart is used during a staged wave.
  - Behavior must be intentionally defined; for MVP the safest path is to disable or ignore restart in staged mode unless explicitly wired.
- Final-wave victory occurs.
  - System must not increment wave index past bounds and then reopen build phase.
- Defeat occurs.
  - Build controls must not remain interactable behind defeat messaging.
- Combat preview state exists inside `CombatRuntime`.
  - Stage flow should treat this as combat-local pre-roll, not as a replacement for the build phase.

## Architecture Notes

Stage flow should be modeled as a higher-level orchestration layer because it represents product structure, not combat simulation. Keeping stage state outside `CombatRuntime` preserves separation of concerns:

- combat remains responsible for one wave execution;
- stage remains responsible for progression between waves.

This structure is preferred because future systems such as shop, merge resolution, repositioning costs, reward choices, and stage summaries all belong naturally to the stage/build layer. If those concerns are pushed into combat now, future work will require untangling that coupling.

The main tradeoff is that scene coordination becomes slightly more complex: there are more scene keys, more event types, and a stronger need for authoritative ownership. That tradeoff is worthwhile because it creates a stable spine for all non-combat progression features.

Alternative rejected:

- extending `CombatScene` with a top-level mode switch for build/combat/stage-end

This was rejected because it would make one scene own unrelated responsibilities, blur the meaning of combat events, and increase the chance of UI/gameplay coupling.

## Validation and Testing

- Starting the app lands in build phase, not direct combat.
- Build phase shows a phase label, current coins, and upcoming wave information.
- Pressing `Start Wave` launches exactly one combat instance for the current wave.
- While combat is active, build-phase controls are unavailable or hidden.
- Clearing a non-final wave returns the player to build phase.
- Clearing a non-final wave increments the wave index by one.
- Clearing a non-final wave increases coins by the configured reward amount.
- Returning to build phase after a win shows the next wave preview, not the cleared one.
- Clearing the final wave transitions to a terminal completed state and does not reopen build.
- Losing a wave transitions to a terminal failed state and does not reopen build.
- Stage runtime never references an out-of-range wave index.
- Event subscriptions are removed on scene shutdown and do not duplicate after restart/reload.
- Existing combat pause flow still works during combat if it remains enabled.
- Existing combat HUD still reflects combat-only data correctly when combat is active.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- Relevant unit tests cover stage runtime transitions for:
  - start wave request acceptance/rejection;
  - victory progression;
  - final victory terminal transition;
  - defeat terminal transition;
  - reward application.

## Definition of Done

- The app no longer boots directly into standalone combat.
- A player can move through at least one full loop of `build -> combat -> build`.
- Stage progression across multiple authored waves is functional.
- Coins are tracked at stage level and visibly updated after wave victory.
- Build-phase UI exposes a manual wave-start action and next-wave preview.
- Combat result is consumed by stage flow rather than ending in an isolated sandbox state.
- The implementation introduces a clear architectural home for future shop/build systems.
- The feature is covered by automated validation for core state transitions and passes the project validation commands.

## Assumptions

- The next feature after this spec will likely be a Shop MVP that plugs into build phase rather than replacing it.
- For this MVP, a flat per-wave reward is acceptable even though the long-term economy may require scaling or per-wave authored rewards.
- Build phase can begin as a lightweight UI layer without full record-editing interactions.
- Reusing `CombatWaveConfig` as the source of truth for stage wave order is preferable to introducing a separate stage-authoring format immediately.
- A simple terminal message for `stage_complete` and `stage_failed` is sufficient for now.
- The current combat HUD can remain combat-only, with build UI handled separately.

## Open Questions

- Should combat-local pause remain available in staged mode, or should stage flow temporarily disable it to simplify the first implementation?
- Should combat-local restart be disabled in staged mode, or should it restart only the current wave while preserving stage-level coins and wave index?
- Should the Stage Flow MVP include a tiny placeholder shop strip now, or should that remain a follow-up feature after the build/combat loop is stable?
- Does the project want a dedicated stage-authored preview model later, or is deriving preview from combat wave content sufficient for the foreseeable future?

## UI / UX

- Build phase should read clearly as a different mode from combat.
- The `Start Wave` action must be prominent and should communicate manual control.
- Coins should be visible without competing with combat-centric HUD styling.
- Next-wave preview should be informative but compact:
  - wave number;
  - enemy count;
  - one-line composition summary.
- Terminal states should be visually distinct enough that the user understands the run cannot continue.
- If build phase overlays the record, it should preserve room for a future shop band near the lower screen area in portrait orientation.

## Progression / Economy

- `coins` become the first cross-wave persistent resource inside a stage.
- The MVP should use wave-clear rewards to make progression visible immediately.
- Reward pacing does not need to be balanced perfectly yet; its purpose is to validate the loop and establish data ownership.
- The economy source of truth should live at stage level, not combat level.

## Data / Persistence

- No save data is required in this iteration.
- Stage runtime is session-local and recreated on app boot.
- Future persistence should serialize stage phase, current wave index, coins, and record/build state, so this runtime model should be shaped with serializability in mind even if persistence is not implemented now.

## Live Ops / Tuning

- Starting coins and wave-clear rewards should be defined as config values rather than hardcoded literals in scenes.
- If per-wave reward tuning is added later, it should extend the config/content layer rather than bypass it in scene logic.
