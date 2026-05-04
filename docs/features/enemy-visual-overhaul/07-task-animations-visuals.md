# 07 — Animation Transforms: Idle, Move, Attack, Hit, Death

## Task Intent

Apply visual transforms to enemy containers each frame based on the animation state computed in task 06. This task reads the animation state (phases, flags, progress) and applies Phaser Container transforms (scale, position, tint) to produce the visible animations.

## Relevant Context

Task 06 creates the animation state machine that tracks:
- `idlePulsePhase` — radians for idle pulse sine wave
- `moveHopPhase` — radians for move hop sine wave
- `attackFlashAt` — timestamp for attack flash
- `hitFlashAt` — timestamp for hit flash
- `deathProgress` — 0→1 for death fade
- `deathStartX/Y` — position at death start
- `deathKnockbackX/Y` — accumulated knockback offset

The `syncEnemyPresentation()` method in `CombatScene` is called every frame and is the right place to apply transforms. It already updates position and depth:

```ts
enemyView.container.setPosition(enemy.x, enemy.y);
enemyView.container.setDepth(this.getEnemyContainerDepth(enemyView.sortY));
```

This task ADDS animation transforms on top of the existing position/depth updates.

## In Scope

### 1. Idle pulse (±2% scale)

When the enemy is alive and not in attack/hit/death state:

```ts
const pulse = Math.sin(anim.idlePulsePhase) * 0.02; // ±2%
container.setScale(1 + pulse);
```

Period: ~1.5s (IDLE_PULSE_PERIOD_MS). The phase increments each frame by `(deltaMs / IDLE_PULSE_PERIOD_MS) * 2π`.

### 2. Moving Y-hop (±2-3px)

When the enemy state is `'moving'`:

```ts
const hop = Math.sin(anim.moveHopPhase) * 3; // ±3px
container.setY(enemy.y + hop);
```

Period: ~0.4s (MOVE_HOP_PERIOD_MS). The phase increments each frame by `(deltaMs / MOVE_HOP_PERIOD_MS) * 2π`.

**Note**: This overrides the Y position set by `setPosition(enemy.x, enemy.y)`. Apply the hop AFTER setting the base position.

### 3. Attacking (flash + lunge)

When `attackFlashAt > 0` and the flash has not expired (`combatElapsedMs - attackFlashAt < ATTACK_FLASH_DURATION_MS`):

```ts
const attackElapsed = combatElapsedMs - attackFlashAt;
const attackProgress = attackElapsed / ATTACK_FLASH_DURATION_MS; // 0→1

// Lunge: translate forward ~4px (toward base)
const lungeAmount = Math.sin(attackProgress * Math.PI) * 4;
container.setY(enemy.y + lungeAmount);

// Flash: tint the container white briefly
if (attackProgress < 0.3) {
  container.setTint(0xffffff);
} else {
  container.clearTint();
}
```

Duration: ~0.15s (ATTACK_FLASH_DURATION_MS). The lunge peaks at the middle of the attack and returns to normal.

### 4. Hit flash (white flash)

When `hitFlashAt > 0` and the flash has not expired (`combatElapsedMs - hitFlashAt < HIT_FLASH_DURATION_MS`):

```ts
const hitElapsed = combatElapsedMs - hitFlashAt;
const hitProgress = hitElapsed / HIT_FLASH_DURATION_MS; // 0→1

// Flash: tint the container white
container.setTint(0xffffff);

// Reset flash after duration
if (hitProgress >= 1) {
  container.clearTint();
}
```

Duration: ~0.08s (HIT_FLASH_DURATION_MS). The entire container flashes white.

**Priority**: Hit flash overrides idle pulse and move hop (if an enemy is hit while moving, it stops hopping and flashes white).

### 5. Death (scale + fade + knockback)

When `deathProgress > 0`:

```ts
const progress = anim.deathProgress; // 0→1

// Scale down to 0
const scale = 1 - progress;
container.setScale(scale);

// Fade out
container.setAlpha(1 - progress);

// Apply knockback offset
container.setPosition(
  enemy.x + anim.deathKnockbackX,
  enemy.y + anim.deathKnockbackY
);
```

Duration: `anim.deathDurationMs` (500ms for normal, 1000ms for boss). The death progress is set by task 06.

### Transform priority

When multiple animation states overlap, apply in this order:
1. **Death** (highest priority) — overrides everything
2. **Hit flash** — overrides idle/move, but not death
3. **Attack** — overrides idle, but not hit
4. **Move hop** — overrides idle Y position
5. **Idle pulse** — default, always active when nothing else is active

### Implementation in syncEnemyPresentation

```ts
private syncEnemyPresentation(): void {
  if (!this.runtime) return;

  for (const enemy of this.runtime.enemies) {
    const enemyView = this.enemyViews.get(enemy.runtimeId);
    if (!enemyView) continue;

    const { container, animation: anim } = enemyView;
    const elapsed = this.runtime.combatElapsedMs;
    const delta = this.game.loop.actualFps > 0 ? 1000 / this.game.loop.actualFps : 16.67;

    // Base position update
    container.setPosition(enemy.x, enemy.y);
    container.setDepth(this.getEnemyContainerDepth(enemy.sortY));

    // Apply animation transforms (priority: death > hit > attack > move > idle)
    if (anim.deathProgress > 0) {
      this.applyDeathTransform(container, anim, delta);
    } else if (anim.hitFlashAt > 0 && elapsed - anim.hitFlashAt < HIT_FLASH_DURATION_MS) {
      this.applyHitTransform(container, anim, elapsed);
    } else if (anim.attackFlashAt > 0 && elapsed - anim.attackFlashAt < ATTACK_FLASH_DURATION_MS) {
      this.applyAttackTransform(container, anim, elapsed);
    } else if (enemy.state === 'moving') {
      this.applyMoveTransform(container, anim, delta);
    } else {
      this.applyIdleTransform(container, anim, delta);
    }
  }
}
```

## Out of Scope

- Death knockback magnitude and direction computation — handled in task 08
- Boss camera shake — handled in task 09
- Damage numbers — handled in task 10
- Test wave — handled in task 11
- Hit flash trigger (event listener) — handled in task 06

## Detailed Requirements

1. Implement `applyIdleTransform()`, `applyMoveTransform()`, `applyAttackTransform()`, `applyHitTransform()`, `applyDeathTransform()` as private methods on `CombatScene`
2. Each method applies the correct transform to the container
3. Transform priority is as specified above (death > hit > attack > move > idle)
4. The idle pulse and move hop phases continue incrementing in task 06's state machine
5. Death transform uses `anim.deathProgress` from task 06
6. Boss death uses `anim.deathDurationMs` from task 06

### Transform details

**Idle pulse**: `setScale(1 + Math.sin(phase) * 0.02)` — applies to both scaleX and scaleY equally
**Move hop**: `setY(enemy.y + Math.sin(phase) * 3)` — only Y position, not scale
**Attack**: `setY(enemy.y + Math.sin(progress * Math.PI) * 4)` + `setTint(0xffffff)` for first 30% of duration
**Hit**: `setTint(0xffffff)` for entire duration
**Death**: `setScale(1 - progress)` + `setAlpha(1 - progress)` + position offset from knockback

### Lunge direction

The attack lunge is toward the base (downward in screen space, positive Y). The lunge amount is ~4px. For the boss, the lunge is proportionally larger: `4px * SCALE_MULTIPLIER[boss]` = `4 * 2.5` = `10px`.

**Decision**: Scale the lunge amount by the enemy's scale multiplier. The scale multiplier is `enemy.body.width / CombatVisualConfig.ENEMY.BASE_BODY_WIDTH`.

## Acceptance Criteria

- [ ] Idle enemies pulse at ±2% scale with ~1.5s period
- [ ] Moving enemies hop ±3px in Y with ~0.4s period
- [ ] Attacking enemies flash white and lunge ~4px toward base for ~0.15s
- [ ] Hit enemies flash white for ~0.08s
- [ ] Dead enemies scale down to 0 + fade out over ~0.5s (1.0s for boss)
- [ ] Transform priority is correct (death > hit > attack > move > idle)
- [ ] Boss death uses 1.0s duration instead of 0.5s
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

## Technical Notes

- `container.setScale(scale)` sets both scaleX and scaleY equally
- `container.setTint(0xffffff)` tints the entire container white
- `container.clearTint()` removes the tint
- `container.setAlpha(value)` sets overall alpha (0 = invisible, 1 = fully opaque)
- The lunge direction is toward the base (positive Y in screen space)
- The idle pulse and move hop phases are in radians — use `Math.sin(phase)` for the oscillation
- Death progress is a 0→1 value set by task 06 — use `1 - progress` for scale and alpha

### Why separate methods per transform?

Each transform has different logic (scale vs position vs tint vs alpha). Separate methods make each transform easy to reason about and debug. The priority logic in `syncEnemyPresentation()` is simple: if death, do death; else if hit, do hit; etc.

## Implementation Plan

1. Add private transform methods to `CombatScene`: `applyIdleTransform`, `applyMoveTransform`, `applyAttackTransform`, `applyHitTransform`, `applyDeathTransform`
2. Update `syncEnemyPresentation()` to call the appropriate transform method based on priority
3. Run `npx tsc --noEmit` to check for type errors
4. Run `npm test` to confirm no regressions
5. Open the game in browser — enemies should now have idle pulse, move hop, attack flash, hit flash, and death animations

## Additional Notes

**Why sine waves for idle and move hop?** Sine waves provide smooth, continuous oscillation without abrupt transitions. The period controls the speed, and the amplitude controls the intensity.

**Why tint for flash effects?** Phaser's `setTint()` is the most efficient way to temporarily change an object's appearance. It's faster than recreating Graphics objects and works on Containers and their children.

**Why not use Phaser Tweens?** The spec says "animations are applied as transforms on the enemy Container each frame." Using frame-by-frame transforms gives us full control and avoids tween management (creation, cleanup, conflict resolution).

## Blocked By

- Task 06 (animation state machine must exist)

## Type

AFK

## Design Spec Reference

- [Animation States](../design-spec.md#animation-states)
- [Animation Implementation](../design-spec.md#animation-implementation)
- [Core Mechanics](../design-spec.md#core-mechanics)
