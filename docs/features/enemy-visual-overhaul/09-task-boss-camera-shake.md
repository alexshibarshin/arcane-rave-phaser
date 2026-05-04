# 09 — Boss Death Camera Shake

## Task Intent

Trigger a Phaser camera shake effect when a boss-type enemy dies. The shake is a brief screen effect that adds impact to the boss death. It should not break game state or affect raycasting/input detection.

## Relevant Context

The boss death is already handled by the death animation system (tasks 06/07). This task adds one additional effect: camera shake on boss death.

The enemy's archetype is available from `enemy.body.family` in the render model and from `enemy.archetype` in the runtime. The death event is detected when `deathProgress` transitions from 0 (in `syncEnemyPresentation()`).

Phaser 3 has a built-in camera shake method: `scene.cameras.main.shake(duration, intensity, fade, force)`.

## In Scope

1. Detect boss death (when an enemy with archetype `'boss'` first dies)
2. Trigger Phaser camera shake with configurable parameters
3. Ensure the shake does not break game state or visual glitches

### Camera shake parameters

Add to `CombatVisualConfig`:

```ts
BOSS_DEATH: {
  CAMERA_SHAKE_DURATION_MS: 300,
  CAMERA_SHAKE_INTENSITY: 0.05,
  CAMERA_SHAKE_FADE: true,
  CAMERA_SHAKE_FORCE: false,
},
```

Trigger in `syncEnemyPresentation()`:

```ts
if (enemy.archetype === 'boss' && anim.deathProgress > 0 && anim.deathProgress <= 0.02) {
  // First frame of death — trigger shake
  if (!anim.shakeTriggered) {
    this.cam.main.shake(
      CombatVisualConfig.BOSS_DEATH.CAMERA_SHAKE_DURATION_MS,
      CombatVisualConfig.BOSS_DEATH.CAMERA_SHAKE_INTENSITY,
      CombatVisualConfig.BOSS_DEATH.CAMERA_SHAKE_FADE,
      CombatVisualConfig.BOSS_DEATH.CAMERA_SHAKE_FORCE,
    );
    anim.shakeTriggered = true;
  }
}
```

### Animation state extension

Add `shakeTriggered: boolean` to the animation state in task 06:

```ts
deathTriggeredShake: boolean; // true once camera shake has been triggered
```

Initialize to `false` in `renderEnemyUnits()`. Set to `true` when the boss first dies.

## Out of Scope

- Death knockback — handled in task 08
- Damage numbers — handled in task 10
- Test wave — handled in task 11
- Per-boss shake parameters (all bosses use the same shake)
- Custom shake implementation (use Phaser's built-in)

## Detailed Requirements

1. Add `BOSS_DEATH` config section to `CombatVisualConfig` with shake parameters
2. Add `deathTriggeredShake: boolean` to the animation state (extend task 06's interface)
3. In `syncEnemyPresentation()`, detect boss death and trigger camera shake
4. Use `this.cam.main.shake()` with parameters from config
5. Ensure shake is triggered only once per boss death
6. Shake parameters: duration 300ms, intensity 0.05 (low to avoid motion sickness)

### Why intensity 0.05?

The spec says "Shake should be limited in magnitude to avoid motion sickness." Intensity 0.05 is subtle — just enough to add impact without being disorienting. If the shake feels too weak, it can be increased to 0.08.

### Why not use a custom shake?

Phaser's built-in `shake()` is well-tested and doesn't affect game state or raycasting. A custom implementation would require manually offsetting all game objects, which is error-prone and unnecessary.

## Acceptance Criteria

- [ ] Boss death triggers camera shake
- [ ] Camera shake duration is 300ms
- [ ] Camera shake intensity is 0.05 (subtle)
- [ ] Camera shake does not break game state
- [ ] Camera shake does not affect raycasting or input detection
- [ ] Shake is triggered only once per boss death
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

## Technical Notes

- `this.cam.main.shake()` is a Phaser 3 Camera class method
- The shake is applied to the camera, not to individual game objects
- The shake does not affect the game world coordinate system
- The shake is purely visual — it does not modify any game state
- The `deathTriggeredShake` flag prevents re-triggering the shake on subsequent frames

## Implementation Plan

1. Add `BOSS_DEATH` config to `CombatVisualConfig`
2. Add `deathTriggeredShake` field to animation state (extend task 06's interface changes)
3. Initialize `deathTriggeredShake` to `false` in `renderEnemyUnits()`
4. In `syncEnemyPresentation()`, detect boss death and trigger shake
5. Run `npx tsc --noEmit` to check for type errors
6. Run `npm test` to confirm no regressions
7. Open the game in browser — spawn a boss and kill it to verify camera shake

## Additional Notes

**Why not use VFX system?** The spec mentions `CombatVfxSystem` for visual effects. However, camera shake is a camera-level effect, not a game object effect. It doesn't fit the VFX system's architecture (which manages game object animations). Using Phaser's built-in `shake()` is the simplest and most correct approach.

**Why intensity 0.05 and not higher?** Mobile portrait orientation (430×932px viewport) means the screen is tall and narrow. A high-intensity shake would be more disorienting on a small screen. 0.05 is a safe starting point.

## Blocked By

- Task 06 (animation state must have deathTriggeredShake field)
- Task 07 (death detection must work)

## Type

AFK

## Design Spec Reference

- [Boss Death](../design-spec.md#boss-death)
- [Failure Modes and Edge Cases](../design-spec.md#failure-modes-and-edge-cases) ("Camera shake should not break the game state")
