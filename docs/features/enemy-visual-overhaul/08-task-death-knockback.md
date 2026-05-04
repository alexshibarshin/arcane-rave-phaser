# 08 — Death Knockback

## Task Intent

Implement death knockback: when an enemy dies, it flies backward along a vector from the needle activation point to the enemy's position. The knockback is overlapped with the death fade-out animation from task 07.

## Relevant Context

The enemy death animation (from task 07) already handles scale-down and alpha-fade. This task adds position offset during the death animation.

The knockback vector is computed as:
1. **Origin**: Needle tip position (`model.needle.tipX`, `model.needle.tipY`) — available from the render model
2. **Target**: Enemy's current position at death time (`enemy.x`, `enemy.y`)
3. **Direction**: Normalized vector from origin to target
4. **Magnitude**: 40px (configurable constant)
5. **Application**: Position offset applied during death fade-out

The animation state from task 06 stores:
- `deathStartX` / `deathStartY` — enemy position at death time
- `deathKnockbackX` / `deathKnockbackY` — accumulated knockback offset

## In Scope

1. Compute knockback vector when the enemy first dies (when `deathProgress` transitions from 0)
2. Store the knockback offset in the animation state
3. Apply the knockback offset in the death transform (task 07)

### Knockback computation

```ts
// In syncEnemyPresentation(), when deathProgress transitions from 0:
const needleX = model.needle.tipX; // from render model
const needleY = model.needle.tipY;
const dx = enemy.x - needleX;
const dy = enemy.y - needleY;
const distance = Math.hypot(dx, dy);

if (distance > 0) {
  const knockbackMagnitude = 40; // CONFIGURABLE
  const knockbackX = (dx / distance) * knockbackMagnitude;
  const knockbackY = (dy / distance) * knockbackMagnitude;

  anim.deathKnockbackX = knockbackX;
  anim.deathKnockbackY = knockbackY;
}
```

### Application in death transform

The death transform from task 07 already applies position:

```ts
container.setPosition(
  enemy.x + anim.deathKnockbackX,
  enemy.y + anim.deathKnockbackY
);
```

This is correct — the knockback offset is added to the enemy's current position. Note that `enemy.x` and `enemy.y` may continue to change during death (the enemy runtime may still update position), so the knockback is an ADDITIONAL offset on top of the runtime position.

**Decision**: Use `deathStartX` / `deathStartY` instead of `enemy.x` / `enemy.y` for the base position during death. This ensures the enemy doesn't "drift" from where it died:

```ts
container.setPosition(
  anim.deathStartX + anim.deathKnockbackX,
  anim.deathStartY + anim.deathKnockbackY
);
```

### Config

Add a configurable knockback magnitude constant:

```ts
const KNOCKBACK_MAGNITUDE_PX = 40;
```

This is a module-level constant in `CombatScene.ts`. If it needs to be tunable per-archetype, add it to `CombatVisualConfig.ENEMY.KNOCKBACK_MAGNITUDE_PX`.

**Decision**: Keep it as a single constant for now. The spec says "Magnitude: A fixed distance (e.g., 30-50px)". 40px is a good middle ground.

## Out of Scope

- Boss camera shake — handled in task 09
- Damage numbers — handled in task 10
- Test wave — handled in task 11
- Knockback magnitude tuning (can be done by changing the constant)
- Per-archetype knockback magnitudes (not in spec)

## Detailed Requirements

1. Compute knockback vector when the enemy first dies (deathProgress transitions from 0)
2. Store knockback offset in `anim.deathKnockbackX` and `anim.deathKnockbackY`
3. Use `deathStartX/Y` as the base position during death (not `enemy.x/y`)
4. Apply knockback as: `setPosition(deathStartX + knockbackX, deathStartY + knockbackY)`
5. The knockback magnitude is 40px (configurable constant)
6. The knockback direction is from needle tip to enemy position (normalized)
7. If distance is 0 (enemy at needle tip), no knockback is applied

### Edge cases

- **Enemy at needle tip**: If `distance === 0`, skip knockback (no direction to compute)
- **Dead enemy still moving**: The enemy runtime may continue to update `enemy.x/y` during death. Use `deathStartX/Y` to prevent drift.
- **Multiple enemies dying simultaneously**: Each enemy computes its own knockback independently — no special handling needed.
- **Boss death**: Same knockback logic as regular enemies. Boss death has longer fade (handled in task 06/07) but knockback magnitude is the same.

## Acceptance Criteria

- [ ] Dead enemies fly backward along the vector from needle tip to their position
- [ ] Knockback magnitude is 40px
- [ ] Knockback is overlapped with death fade-out animation
- [ ] Dead enemies do not drift from their death position
- [ ] If enemy is at needle tip, no knockback is applied (no division by zero)
- [ ] Boss death uses same knockback logic as regular enemies
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

## Technical Notes

- The needle tip position is `model.needle.tipX` and `model.needle.tipY` from the render model
- The render model is available in `renderStaticCombatLayout()` but NOT in `syncEnemyPresentation()`
- **Decision**: Store the needle tip position as a class property on `CombatScene` so it's accessible in `syncEnemyPresentation()`:

```ts
private needleTipX = 0;
private needleTipY = 0;
```

Set these in `renderStaticCombatLayout()` after rendering the needle:

```ts
this.needleTipX = model.needle.tipX;
this.needleTipY = model.needle.tipY;
```

- The knockback is computed ONCE when death starts (when deathProgress transitions from 0), not every frame
- The knockback offset is stored in the animation state and applied every frame during death
- The knockback direction is deterministic (same input → same output)

## Implementation Plan

1. Add `needleTipX` and `needleTipY` class properties to `CombatScene`
2. Set these properties in `renderStaticCombatLayout()` from the render model
3. Add `KNOCKBACK_MAGNITUDE_PX = 40` constant
4. In `syncEnemyPresentation()`, when deathProgress transitions from 0, compute knockback vector
5. Store knockback in animation state
6. Update death transform to use `deathStartX/Y + knockbackX/Y`
7. Run `npx tsc --noEmit` to check for type errors
8. Run `npm test` to confirm no regressions
9. Open the game in browser — dead enemies should fly backward when killed

## Additional Notes

**Why store needle tip as class property?** The render model is created once in `renderStaticCombatLayout()` and not available in `syncEnemyPresentation()`. Storing the needle tip position as a class property makes it accessible for knockback computation.

**Why not scale knockback by enemy size?** The spec says "Magnitude: A fixed distance (e.g., 30-50px) — the enemy flies backward along this vector." It does not mention scaling by enemy size. A fixed 40px knockback feels consistent across all enemy sizes.

## Blocked By

- Task 06 (animation state must have deathKnockbackX/Y fields)
- Task 07 (death transform must use knockback offset)

## Type

AFK

## Design Spec Reference

- [Death Knockback](../design-spec.md#death-knockback)
- [Core Mechanics](../design-spec.md#core-mechanics)
