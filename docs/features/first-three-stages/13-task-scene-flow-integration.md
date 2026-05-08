# Scene Flow Integration — Lobby, Stage, and Return Loop

## Task Intent

Wire up the full gameplay loop: `BootScene → LobbyScene → StageScene → LobbyScene (with result)`. Update `BootScene` to start `LobbyScene` instead of `StageScene`. Make `StageScene` accept a `stageId` from scene data, create `StageRuntime` with the matching `StageConfig`, and on terminal phase (stage complete or failed), calculate stars, write to `SessionProgressStore`, and transition back to `LobbyScene` with `{ showResult: true, stageId }`.

After this task, the complete stage selection → play → result loop is functional end-to-end, even if the lobby UI is minimal (tasks 14–15 add the full UI).

## Relevant Context

The current flow: `BootScene → StageScene` (always stage index 0). No lobby, no stage selection, no return loop.

The new flow:
```
BootScene → LobbyScene
              ├── tap stage card → detail panel updates
              ├── tap Start → StageScene(stageId)
              │                  ├── build → combat → ... 
              │                  ├── terminal → calculate stars → setResult → return
              │                  └── return to LobbyScene(showResult=true)
              └── LobbyScene shows result modal (Retry | Close)
```

### Scene Data Conventions

When starting `StageScene`:
```ts
this.scene.start(SceneKeys.STAGE, { stageId: 'redline-routine' });
```

When starting `LobbyScene` with result:
```ts
this.scene.start(SceneKeys.LOBBY, { showResult: true, stageId: 'redline-routine' });
```

## In Scope

- `BootScene.create()` starts `LobbyScene` instead of `StageScene`
- `StageScene.create()` reads `stageId` from scene data, looks up `StageConfig` from `StageRegistry`
- `StageScene` creates `StageRuntime` with the correct config (not hardcoded index 0)
- Handle `stage:return-to-lobby` command in `StageScene.executeStageFlowCommands`:
  - Calculate stars using `calculateStageStars` (requires remaining base HP — obtain from the return payload or track during combat)
  - Write result to `SessionProgressStore.setResult()`
  - Start `LobbyScene` with `{ stageId, showResult: true }`
- `LobbyScene` receives `showResult` in scene data (actual modal rendering is task 15, but the scene should accept the data)
- Ensure `LobbyScene` is created (even if a stub) and registered in `AppScenes.ts`
- Remove or comment out the old `STAGE_CONFIGS` hardcoded array in `StageConfig.ts` (replaced by `StageRegistry`)

## Out of Scope

- Full LobbyScene UI (tasks 14–15)
- Result modal rendering (task 15)
- Wave preview UI (task 16)
- Enemy visuals (task 17)

## Detailed Requirements

### BootScene Changes

In `BootScene.create()`, change:
```ts
this.scene.start(SceneKeys.STAGE);
```
To:
```ts
this.scene.start(SceneKeys.LOBBY);
```

### LobbyScene Stub

Create a minimal `LobbyScene` class (in `src/scenes/lobby/LobbyScene.ts` or co-located with other scenes):

```ts
export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.LOBBY });
  }

  create(data?: { showResult?: boolean; stageId?: string }): void {
    // Stub: just starts Stage 1 for now (so the loop is functional)
    // Full UI in tasks 14–15
    this.scene.start(SceneKeys.STAGE, { stageId: 'redline-routine' });
  }
}
```

Register it in `AppScenes.ts`:
```ts
import { LobbyScene } from '@scenes/lobby/LobbyScene';
// Add to the exported array
```

### StageScene Changes

**Reading stageId:**
```ts
create(data?: { stageId?: string }): void {
  const stageId = data?.stageId ?? 'redline-routine'; // fallback
  const stageConfig = getStageConfig(stageId);
  
  if (!stageConfig) {
    throw new Error(`Unknown stage ID: ${stageId}`);
  }
  
  this.runtime = createStageRuntime(stageConfig);
  // ... rest of initialization
}
```

Replace `STAGE_CONFIGS[0]!` with the lookup above.

**Handling stage:return-to-lobby:**

In `executeStageFlowCommands`, add a case:
```ts
case 'stage:return-to-lobby': {
  const { stageId, stars, remainingBaseHp } = command.payload;
  
  SessionProgressStore.setResult(stageId, { stageId, stars, bestRemainingBaseHp: remainingBaseHp });
  
  this.scene.start(SceneKeys.LOBBY, {
    showResult: true,
    stageId,
  });
  return; // Stop processing further commands
}
```

Import `SessionProgressStore` from `@session/SessionProgressStore`.

### Obtaining remainingBaseHp

The `stage:return-to-lobby` command (from task 08) carries `remainingBaseHp`. This must reach the command handler. If `StageFlowCoordinator` doesn't have access to base HP, you need to track it in `StageRuntime` or pass it through another path.

Approach: Add `remainingBaseHp` to `StageRuntime`:
```ts
interface StageRuntime {
  // ... existing fields
  remainingBaseHp: number;  // updated when combat ends
}
```

Set it when handling `stage:combat-ended` in `StageScene.handleCombatEnded`:
- The `combat:ended` event needs to carry `baseHpCurrent`. Update EventBus if needed.
- OR: track base HP via `combat:base-damaged` events during combat and store last known value.

Simplest: Add `remainingBaseHp` to the `combat:ended` event:
```ts
'combat:ended': { outcome: 'victory' | 'defeat'; chronoCurrent: number; chronoMax: number; remainingBaseHp: number };
```

Then `StageScene.handleCombatEnded` reads it and passes to `StageFlowIntent`:
```ts
runStageFlowIntent({
  type: 'stage:combat-ended',
  outcome: payload.outcome,
  chronoRemaining: payload.chronoCurrent,
  remainingBaseHp: payload.remainingBaseHp,
});
```

And `StageRuntime` stores it, and the `stage:return-to-lobby` command reads `runtime.remainingBaseHp`.

### Old Config Cleanup

In `StageConfig.ts`, the old `stageConfigs` array with one test stage can be removed or commented out. `STAGE_CONFIGS` export can be deprecated — `StageRegistry` is the new source of truth.

## Acceptance Criteria

- [ ] `BootScene` starts `LobbyScene` (not `StageScene`)
- [ ] `LobbyScene` class exists (even as stub) and is registered in `AppScenes`
- [ ] `LobbyScene` stub starts `StageScene` with `{ stageId: 'redline-routine' }` so the loop is functional
- [ ] `StageScene.create()` reads `stageId` from scene data and creates runtime from `StageRegistry`
- [ ] `StageScene` handles `stage:return-to-lobby` — writes to `SessionProgressStore`, starts `LobbyScene` with result
- [ ] `combat:ended` event carries `remainingBaseHp` (or it's tracked elsewhere)
- [ ] Terminal phases correctly return to lobby
- [ ] `npx tsc --noEmit` passes
- [ ] The game boots, shows something, and the stage loop works (even if lobby is a stub)

## Technical Notes

- `LobbyScene` stub is critical — without it, the game can't boot. Make it minimal but functional (immediately starts Stage 1). The full UI is tasks 14–15.
- `StageScene` currently imports `STAGE_CONFIGS` from `@config/StageConfig` and uses index 0. Remove this import and use `getStageConfig` from `StageRegistry` instead.
- The `scene.start` method passes data via Phaser's scene data mechanism. In `create(data)`, the data parameter is the payload from the previous scene.
- If the lobby stub starts Stage 1 directly, the full cycle is: `Boot → Lobby(stub) → Stage → Lobby(stub, showResult=true) → Stage → ...`. This is sufficient to verify the plumbing works before building UI.

## Implementation Plan

1. Create `LobbyScene` stub in `src/scenes/lobby/LobbyScene.ts`
2. Register in `AppScenes.ts` (add to the exported scene array)
3. Update `BootScene.create()` to start `LobbyScene` instead of `StageScene`
4. Update `StageScene.create()` to read `stageId` from data and use `StageRegistry`
5. Add `remainingBaseHp` tracking: update `combat:ended` event, `StageFlowIntent`, and `StageRuntime`
6. Add `stage:return-to-lobby` handling in `StageScene.executeStageFlowCommands`
7. Import `SessionProgressStore` and `calculateStageStars` in `StageScene`
8. Clean up old `STAGE_CONFIGS` import/usage
9. Run `npx tsc --noEmit`

## Blocked By

- Blocked by 06-task-session-progress-and-stars (needs `SessionProgressStore`, `calculateStageStars`)
- Blocked by 08-task-flow-coordinator-plumbing (needs `stage:return-to-lobby` command)
- Blocked by 10-task-stage-1-redline-routine (needs at least one stage config registered)

## Type

AFK

## Design Spec Reference

- [Gameplay Flow — Main Loop](../design-spec.md#main-loop)
- [Session Progress Flow](../design-spec.md#session-progress-flow)
- [Data Flow — Stage Selection → Stage Start](../design-spec.md#stage-selection--stage-start)
- [Data Flow — Stage Completion → Lobby Return](../design-spec.md#stage-completion--lobby-return)
- [Changed Systems — BootScene, SceneKeys](../design-spec.md#changed-systems)
