# 06 — Animation State Machine

## Task Intent

Add transient animation state tracking to the `CombatEnemyView` interface and update `syncEnemyPresentation()` to manage animation state each frame. This task creates the state machine infrastructure — it tracks animation phases and timers but does NOT apply visual transforms yet (those come in task 07).

The animation state is purely visual and reads from the enemy's runtime state (moving, attacking, dead). It does not change game logic.

## Relevant Context

The current `CombatEnemyView` interface in `CombatScene.ts` is:

```ts
interface CombatEnemyView {
  container: Phaser.GameObjects.Container;
  sortY: number;
}
```

Each enemy needs transient animation state that is computed each frame:

```ts
idlePulse: sine wave, always active when alive and not moving
moveHop: sine wave, active when state === 'moving'
attackFlash: boolean flag, active for ~0.15s after attack starts
hitFlash: boolean flag, active for ~0.08s after receiving damage
death: { progress: 0→1, knockbackX, knockbackY }, active after death
```

The enemy runtime provides:
- `enemy.state` — `'moving' | 'attacking' | 'dead'`
- `enemy.spawned` — whether the enemy has been spawned
- `enemy.currentHp` — current HP (for death detection)

The `syncEnemyPresentation()` method is called every frame and is the right place to update animation state.

## In Scope

1. Extend `CombatEnemyView` interface with animation state fields
2. Initialize animation state when creating enemy views in `renderEnemyUnits()`
3. Update animation state in `syncEnemyPresentation()` based on runtime state
4. Export animation state as computed values (phases, flags, progress) for task 07 to consume

### Extended CombatEnemyView interface

```ts
interface CombatEnemyView {
  container: Phaser.GameObjects.Container;
  sortY: number;

  // Animation state (transient, updated each frame)
  animation: {
    idlePulsePhase: number;     // radians, sine wave phase
    moveHopPhase: number;       // radians, sine wave phase
    attackFlashAt: number;      // ms timestamp, 0 if not attacking
    hitFlashAt: number;         // ms timestamp, 0 if not hit
    deathProgress: number;      // 0→1, 0 if not dead
    deathStartX: number;        // position at death start
    deathStartY: number;        // position at death start
    deathKnockbackX: number;    // accumulated knockback X
    deathKnockbackY: number;    // accumulated knockback Y
  };
}
```

### Initialization (in renderEnemyUnits)

When creating a new enemy view, initialize animation state:

```ts
animation: {
  idlePulsePhase: 0,
  moveHopPhase: 0,
  attackFlashAt: 0,
  hitFlashAt: 0,
  deathProgress: 0,
  deathStartX: 0,
  deathStartY: 0,
  deathKnockbackX: 0,
  deathKnockbackY: 0,
}
```

### State updates (in syncEnemyPresentation)

Each frame, for each enemy:

```ts
const runtimeState = enemy.state; // 'moving' | 'attacking' | 'dead'
const anim = enemyView.animation;
const elapsed = this.runtime.combatElapsedMs; // or use delta

switch (runtimeState) {
  case 'moving':
    anim.idlePulsePhase += deltaRad; // continue idle pulse
    anim.moveHopPhase += deltaRad;   // move hop sine wave
    anim.attackFlashAt = 0;
    anim.hitFlashAt = 0;
    anim.deathProgress = 0;
    break;

  case 'attacking':
    anim.idlePulsePhase += deltaRad;
    anim.moveHopPhase = 0;
    anim.attackFlashAt = anim.attackFlashAt || elapsed; // set on first frame of attack
    anim.hitFlashAt = 0;
    anim.deathProgress = 0;
    break;

  case 'dead':
    anim.idlePulsePhase = 0;
    anim.moveHopPhase = 0;
    anim.attackFlashAt = 0;
    anim.hitFlashAt = 0;
    if (anim.deathProgress === 0) {
      anim.deathProgress = 0;
      anim.deathStartX = enemy.x;
      anim.deathStartY = enemy.y;
    }
    anim.deathProgress = Math.min(1, anim.deathProgress + deltaMs / DEATH_DURATION_MS);
    break;
}
```

### Constants

Add these as module-level constants in `CombatScene.ts` (or in `CombatVisualConfig`):

```ts
const IDLE_PULSE_PERIOD_MS = 1500;    // ~1.5s
const MOVE_HOP_PERIOD_MS = 400;       // ~0.4s
const ATTACK_FLASH_DURATION_MS = 150; // ~0.15s
const HIT_FLASH_DURATION_MS = 80;     // ~0.08s
const DEATH_DURATION_MS = 500;        // ~0.5s (1000 for boss)
const DEATH_BOSS_DURATION_MS = 1000;  // ~1.0s for boss
```

## Out of Scope

- Applying visual transforms (scale, position, tint) — handled in task 07
- Death knockback magnitude and direction — handled in task 08
- Boss camera shake — handled in task 09
- Damage numbers — handled in task 10
- Test wave — handled in task 11
- Hit flash trigger (listening to `combat:enemy-hit` event) — can be done inline in this task or task 07

## Detailed Requirements

1. Extend `CombatEnemyView` with the `animation` field as shown above
2. Initialize animation state in `renderEnemyUnits()` when creating each enemy view
3. Update animation state in `syncEnemyPresentation()` based on runtime state
4. Use `combatElapsedMs` from the runtime as the time source
5. Death progress is a 0→1 value updated each frame by `deltaMs / DEATH_DURATION_MS`
6. Attack flash and hit flash are timestamps — if the current time minus the timestamp exceeds the duration, they are considered expired (set back to 0)
7. Idle pulse phase and move hop phase are radians that increment each frame

### Hit flash trigger

When the `combat:enemy-hit` event fires, set `hitFlashAt` to the current `combatElapsedMs`. The hit flash expires after `HIT_FLASH_DURATION_MS`.

Listen for `combat:enemy-hit` in `createSceneContent()`:

```ts
on('combat:enemy-hit', (payload) => {
  const view = this.enemyViews.get(payload.enemyId);
  if (view) {
    view.animation.hitFlashAt = this.runtime.combatElapsedMs;
  }
});
```

### Boss death detection

When an enemy dies and its archetype is `'boss'`, set `DEATH_DURATION_MS` to `DEATH_BOSS_DURATION_MS` for that enemy. This can be done by storing the death duration in the animation state or by checking the archetype at death time.

**Decision**: Add a `deathDurationMs` field to the animation state:

```ts
deathDurationMs: number; // DEATH_DURATION_MS or DEATH_BOSS_DURATION_MS
```

Set this when the enemy first dies (when `deathProgress` transitions from 0 to >0).

## Acceptance Criteria

- [ ] `CombatEnemyView` interface has the `animation` field with all required sub-fields
- [ ] Animation state is initialized to defaults when creating enemy views
- [ ] Animation state is updated each frame in `syncEnemyPresentation()`
- [ ] Moving enemies: idle pulse + move hop phases increment
- [ ] Attacking enemies: attack flash timestamp is set
- [ ] Dead enemies: death progress increments from 0 to 1
- [ ] Hit flash is triggered on `combat:enemy-hit` event
- [ ] Boss death uses `DEATH_BOSS_DURATION_MS` (1000ms) instead of `DEATH_DURATION_MS` (500ms)
- [ ] Expired flash timers reset to 0
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

## Technical Notes

- The animation state is transient — it is recomputed each frame and does not persist across scene transitions
- `combatElapsedMs` is the global combat timer, shared between the runtime and the scene
- The idle pulse and move hop phases use radians (0 to 2π) for sine wave computation
- Death progress is a normalized 0→1 value — task 07 uses this to compute scale and alpha
- The `deathStartX` and `deathStartY` store the enemy's position at the moment of death — task 08 uses these for knockback calculation
- The `deathKnockbackX` and `deathKnockbackY` accumulate the knockback offset during death — task 08 sets these

## Implementation Plan

1. Read the current `CombatEnemyView` interface in `CombatScene.ts`
2. Add the `animation` field to the interface
3. Initialize animation state in `renderEnemyUnits()`
4. Add the animation constants as module-level values
5. Update `syncEnemyPresentation()` to manage animation state
6. Add the `combat:enemy-hit` event listener in `createSceneContent()`
7. Run `npx tsc --noEmit` to check for type errors
8. Run `npm test` to confirm no regressions
9. Open the game in browser — enemies should not visually change yet (no transforms applied)

## Additional Notes

**Why separate state tracking from visual transforms?** The state machine is pure logic — it computes phases, flags, and progress values. The visual transforms are rendering concerns. Separating them makes each easier to reason about and test. Task 07 consumes the state from this task and applies transforms.

**Why use timestamps for flash timers?** Timestamps (combatElapsedMs) are more robust than frame counters because they are frame-rate independent. The duration check is `currentElapsed - flashAt < DURATION_MS`.

**Why store deathStartX/Y?** The death animation and knockback need to know where the enemy was when it died, so the fade-out and knockback can be computed relative to that position.

## Blocked By

- Task 03 (archetype dispatch must exist, though this task works with any archetype)

## Type

AFK

## Design Spec Reference

- [Animation States (transient, per-frame)](../design-spec.md#animation-states-transient-per-frame)
- [Core Mechanics](../design-spec.md#core-mechanics)
- [Technical Constraints](../design-spec.md#technical-constraints) (determinism, frame-rate independence)
