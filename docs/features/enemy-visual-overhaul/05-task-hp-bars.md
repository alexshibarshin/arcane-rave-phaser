# 05 — HP Bars: Fix Color Bug

## Task Intent

Fix the HP bar color bug: change the HP bar fill from green (`0x58f29b`) to red (`0xff0000`). HP bars are already rendered per-enemy in `renderEnemyUnits()` — this is a one-line color fix.

This task also ensures HP bars are always visible (not hidden by the `container.setVisible(false)` call that hides invisible enemies).

## Relevant Context

The current `renderEnemyUnits()` in `CombatScene` creates an HP bar Graphics for each enemy:

```ts
hpBar.fillStyle(0x201927, 1);
hpBar.fillRoundedRect(hpBarX, hpBarY, enemy.hpBar.width, enemy.hpBar.height, 6);
hpBar.fillStyle(0x58f29b, 1);  // ← GREEN — this is the bug
hpBar.fillRoundedRect(
  hpBarX + 2,
  hpBarY + 2,
  enemy.hpBar.width - 4,
  enemy.hpBar.height - 4,
  4,
);
```

The spec says: "HP bar: Always red (`0xff0000` or similar), not element-colored". This is a design decision — red is the standard game language for enemy HP.

The HP bar is positioned above the enemy's head, horizontally centered. The `hpBarX` and `hpBarY` are already computed correctly in the existing code.

## In Scope

1. Change `hpBar.fillStyle(0x58f29b, 1)` to `hpBar.fillStyle(0xff0000, 1)` in `renderEnemyUnits()`
2. Ensure HP bars are visible when the enemy container is visible

### Visibility handling

The existing code sets `container.setVisible(false)` for enemies. The HP bar is added to the container via `container.add([hpBar, body, hitFlashAnchor])`, so it inherits the container's visibility. When `syncEnemyPresentation()` sets the container visible (for living enemies), the HP bar becomes visible automatically.

However, for dead enemies, the container is hidden but the death animation should still be visible. Check if the death animation (to be implemented in task 07) needs the HP bar to remain visible during the death fade-out. If so, add the HP bar as a sibling of the container (not a child) so it doesn't inherit the container's visibility.

**Decision**: Keep the HP bar as a child of the container for now. During death, the container is hidden but the death animation (scale + fade) is applied to the container, so the HP bar will fade out with the enemy. This is the correct behavior — the HP bar should disappear as the enemy dies.

## Out of Scope

- HP bar position changes (already correct)
- HP bar width/height changes (already correct)
- Dynamic HP bar fill based on current HP (this would require reading `currentHp` from the runtime — not in scope for this task)
- Base HP bar color change (the base HP bar uses green `0x58f29b` — this is INTENTIONAL because the base is player-owned, not an enemy)
- Damage numbers (handled in task 10)

## Detailed Requirements

1. Change the HP bar fill color from `0x58f29b` (green) to `0xff0000` (red) in `renderEnemyUnits()`
2. The HP bar background (dark fill) stays the same: `0x201927`
3. The HP bar corner radius stays the same: `6` for frame, `4` for fill
4. HP bar positioning stays the same: `hpBarX = -enemy.hpBar.width / 2`, `hpBarY = enemy.hpBar.offsetY - enemy.hpBar.height / 2`

## Acceptance Criteria

- [ ] Enemy HP bar fill color is `0xff0000` (red) instead of `0x58f29b` (green)
- [ ] HP bar background frame color is `0x201927` (dark)
- [ ] HP bars are visible for all living enemies
- [ ] HP bars fade out with enemy death animation
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

## Technical Notes

- This is a single-line change: `0x58f29b` → `0xff0000`
- The base HP bar (player-owned) intentionally stays green — do NOT change it
- The HP bar is a child of the enemy container, so it inherits visibility
- The HP bar width and height come from `CombatVisualConfig.ENEMY.HP_BAR_WIDTH` and `HP_BAR_HEIGHT`

## Implementation Plan

1. Open `src/scenes/combat/CombatScene.ts`
2. Find the `renderEnemyUnits()` method
3. Find the line `hpBar.fillStyle(0x58f29b, 1);`
4. Change it to `hpBar.fillStyle(0xff0000, 1);`
5. Run `npx tsc --noEmit` to check for type errors
6. Run `npm test` to confirm no regressions
7. Open the game in browser to visually verify HP bars are red

## Additional Notes

**Why red for enemies?** The spec says "HP bars are red (standard game language for enemies)". This is a well-established game design convention — red = enemy/hostile, green = friend/healthy.

**Why not change the base HP bar?** The base is player-owned. The spec says "HP bar: Always red" specifically for enemies. The base HP bar is a separate visual element with different semantics.

## Blocked By

- Task 03 (archetype dispatch must exist, though this task doesn't depend on the new archetypes)

## Type

AFK

## Design Spec Reference

- [HP Bars](../design-spec.md#hp-bars)
- [Goals](../design-spec.md#goals) ("HP bars are red (standard game language for enemies)")
