# StageFlowCoordinator Plumbing — Stage-Scoped Wave Resolution

## Task Intent

Update `StageFlowCoordinator` to use `runtime.stageConfig` instead of global `CombatWaveConfig` for wave resolution. On terminal phases (`stage_complete` / `stage_failed`), emit a new `stage:return-to-lobby` command that carries `{ stageId, stars, remainingBaseHp }`. Update the snapshot/preview command to use the new `StageWavePreviewModel` format from task 07.

After this task, the flow coordinator orchestrates stage-specific waves and signals when a stage run should return to the lobby.

## Relevant Context

The current `StageFlowCoordinator`:
- Uses `getCombatWaveDefinition(runtime.currentWaveIndex)` from global config
- Has no concept of stage identity or lobby return
- On completion/failure, just transitions to `stage_complete`/`stage_failed` phases

The new flow must:
- Read wave data from `runtime.stageConfig.waves[runtime.currentWaveIndex]`
- On `resolveStageCombatOutcome` hitting terminal phase, emit a `stage:return-to-lobby` command
- Pass the stage's `id`, calculated stars, and remaining base HP in the return command

The `StageFlowCommand` type gets a new variant:

```ts
| {
    type: 'stage:return-to-lobby';
    payload: {
      stageId: string;
      stars: number;
      remainingBaseHp: number;
    };
  }
```

## In Scope

- `StageFlowCoordinator` reads wave definitions from `runtime.stageConfig.waves` instead of `CombatWaveConfig`
- `createLaunchCombatCommand` builds the payload using stage-scoped wave data (sub-waves, enemy stat overrides from task 07)
- `createSnapshotCommand` passes the new `StageWavePreviewModel` in the snapshot event
- `resolveCombatReturn` (or a new handler) detects terminal phases and emits `stage:return-to-lobby`
- Add `stage:return-to-lobby` to `StageFlowCommand` union type
- Remove dependency on `getCombatWaveDefinition` from global config (keep the import for backward compat until all consumers are updated)

## Out of Scope

- `StageScene` handling the `stage:return-to-lobby` command (task 13)
- Building the scaled enemy payload (task 07 already provides the function — this task calls it)
- Star calculation (task 06 provides `calculateStageStars` — this task calls it)
- Combat receiving the payload (task 09)

## Detailed Requirements

### Wave Resolution from Stage Config

In `createLaunchCombatCommand(runtime)`:
- Replace `getCombatWaveDefinition(runtime.currentWaveIndex)` with `runtime.stageConfig.waves[runtime.currentWaveIndex]`
- The wave definition is now `StageWaveDefinition` instead of `CombatWaveDefinition`
- Build the enemy stat overrides by calling the helper from task 07
- Include sub-waves and overrides in the combat launch payload

### Combat Launch Payload Extension

Update the `stage:launch-combat-phase` command payload to include:

```ts
subWaves: SubWaveDefinition[];
enemyStatOverrides: Record<string, { maxHp: number }>;
```

These replace the combat scene's need to call `getCombatWaveDefinition`. The combat scene (task 09) will read sub-waves from the payload instead.

### Snapshot with Wave Preview Model

In `createSnapshotCommand` → `createStageSnapshotPayload`:
- Call the updated `createStageWavePreview` from task 07
- The snapshot payload now carries `wavePreview: StageWavePreviewModel | null` 
- Update `EventBus` `stage:snapshot-updated` type accordingly (if not done in task 07)

### Return to Lobby on Terminal Phases

In `resolveCombatReturn` (or wherever `resolveStageCombatOutcome` is called):
- After resolution, check if `runtime.phase === 'stage_complete' || runtime.phase === 'stage_failed'`
- If terminal, emit `stage:return-to-lobby` command with:
  - `stageId: runtime.stageConfig.id`
  - `stars`: calculated via `calculateStageStars(baseHp, CombatBalanceConfig.BASE_HP)` — need the base HP from somewhere
  - `remainingBaseHp`: the current base HP after combat

**Wait — where does the base HP come from?** The `StageRuntime` doesn't track base HP. Combat tracks it internally. When combat ends, `combat:ended` event carries `outcome` but NOT base HP.

Options:
1. Add `remainingBaseHp` to the `combat:ended` event
2. Have `StageScene` track base HP during combat (it receives `combat:base-damaged` events)
3. Add a `remainingBaseHp` field to `StageRuntime`

Option 3 is cleanest — `StageRuntime` tracks remaining base HP, updated via a new function `setStageBaseHp(runtime, hp)`. The combat end resolution would need the base HP value.

But wait — the current flow: `combat:ended` event → `StageScene.handleCombatEnded` → `StageFlowIntent.stage:combat-ended` → `resolveCombatReturn`. The base HP isn't in this flow.

Simplest approach: Add `remainingBaseHp` to the `combat:ended` event payload. The combat scene already knows base HP. Then pass it through the flow.

OR: Add `remainingBaseHp` to `StageFlowIntent`:

```ts
| { type: 'stage:combat-ended'; outcome: StageCombatOutcome; chronoRemaining: number; remainingBaseHp: number }
```

Then `StageScene.handleCombatEnded` reads it from the event and passes it through.

### Terminal Phase Detection

In `resolveCombatReturn`:
```ts
if (runtime.phase === 'stage_complete' || runtime.phase === 'stage_failed') {
  commands.push({
    type: 'stage:return-to-lobby',
    payload: {
      stageId: runtime.stageConfig.id,
      stars: resolution.stars,  // calculated from remainingBaseHp
      remainingBaseHp: resolution.remainingBaseHp,
    },
  });
}
```

The `StageFlowCommand` type needs the new variant added.

## Acceptance Criteria

- [ ] `StageFlowCoordinator` reads waves from `runtime.stageConfig.waves[waveIndex]` (not global config)
- [ ] `createLaunchCombatCommand` builds payload with `subWaves` and `enemyStatOverrides` from stage config
- [ ] `createSnapshotCommand` uses new `StageWavePreviewModel` in the snapshot event
- [ ] `stage:return-to-lobby` is a valid `StageFlowCommand` variant
- [ ] Terminal phases (`stage_complete` / `stage_failed`) emit `stage:return-to-lobby` with `{ stageId, stars, remainingBaseHp }`
- [ ] `StageRuntime` or `combat:ended` event carries `remainingBaseHp` for star calculation
- [ ] `npx tsc --noEmit` passes
- [ ] Existing flow coordinator tests pass or are noted for update (task 19)

## Technical Notes

- `StageFlowCoordinator` currently imports `getCombatWaveDefinition from '@config/CombatWaveConfig'`. This import should be removed (or kept if needed for non-stage-scoped flows, but in this feature everything is stage-scoped).
- The `stage:return-to-lobby` command needs handling in `StageScene.executeStageFlowCommands`. Add a new case for it. The handler should write to `SessionProgressStore` and start `LobbyScene` — but that's task 13. For now, just add the case with a placeholder/no-op.
- The `StageFlowCommand` union type must include the new variant. All `switch` statements on `command.type` should handle it (or at least have a `default` case).
- Combat launch payload size will increase with `subWaves` and `enemyStatOverrides`. These are passed as scene data to `CombatScene`. Phaser scene data is serialized, so keep payloads reasonable. 10 sub-waves × 5 enemy types each × small configs = fine.

## Implementation Plan

1. In `StageFlowCoordinator.ts`, update `createLaunchCombatCommand`:
   - Use `runtime.stageConfig.waves[runtime.currentWaveIndex]` to get the wave
   - Build `subWaves` from the wave definition
   - Call the `buildStageWaveEnemyPayload` helper (from task 07) to get `enemyStatOverrides`
   - Include both in the launch payload
2. Update the `stage:launch-combat-phase` command payload type to include `subWaves` and `enemyStatOverrides`
3. Update `createStageSnapshotPayload` to use the new `StageWavePreviewModel`:
   - Pass the `StageWaveDefinition` to `createStageWavePreview`
   - Include `wavePreview` in the snapshot event payload
4. Add `remainingBaseHp` to `StageFlowIntent['stage:combat-ended']`:
   - Update the type
   - Update `StageScene.handleCombatEnded` to pass it
   - Pipe it through `resolveCombatReturn`
5. Add `stage:return-to-lobby` to `StageFlowCommand` union
6. In `resolveCombatReturn`, detect terminal phase and emit `stage:return-to-lobby`
7. Add handling in `StageScene.executeStageFlowCommands` (placeholder for now)
8. Run `npx tsc --noEmit` and fix type errors

## Blocked By

- Blocked by 07-task-stage-runtime-plumbing (needs `buildStageWaveEnemyPayload`, updated `StageWavePreview`, `StageWavePreviewModel` type)

## Type

AFK

## Design Spec Reference

- [Changed Systems — StageFlowCoordinator](../design-spec.md#changed-systems)
- [Data Flow — Stage Completion → Lobby Return](../design-spec.md#stage-completion--lobby-return)
- [Combat Payload Extension](../design-spec.md#combat-payload-extension)
- [StageWavePreviewModel Contract](../design-spec.md#stagewavepreviewmodel-contract)
