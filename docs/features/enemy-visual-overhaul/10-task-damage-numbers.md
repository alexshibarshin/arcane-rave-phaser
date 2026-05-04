# 10 — Damage Numbers

## Task Intent

Implement the damage number system: floating text that appears when damage is dealt. Damage numbers spawn on `combat:enemy-hit` (above enemy HP bar) and `combat:base-damaged` (above base HP bar with horizontal offset). They float upward and fade out over a configurable duration, then self-destroy.

## Relevant Context

The existing event system already emits:
- `combat:enemy-hit` — with payload `{ enemyId, slotIndex, attackerColor, damage, currentHp, maxHp, wasWeaknessHit }`
- `combat:base-damaged` — with payload `{ current, max }`

These events are consumed by `CombatVfxSystem` for VFX, but NOT for damage numbers. This task adds damage number spawning as an additional consumer of these events.

The config for damage numbers was added in task 01:

```ts
DAMAGE_NUMBER: {
  FONT_SIZE_PX: 14,
  FLOAT_DURATION_MS: 600,
  FLOAT_DISTANCE_Y: 30,
  BASE_OFFSET_X: 60,
  BASE_OFFSET_Y: -20,
  ENEMY_OFFSET_Y: -10,
},
```

The animation state from task 06 is available for computing enemy screen positions.

## In Scope

### 1. Damage number component

Create a `CombatDamageNumber` class (or inline factory function) in `src/combat/CombatDamageNumber.ts`:

```ts
export class CombatDamageNumber {
  readonly text: Phaser.GameObjects.Text;
  private readonly startTime: number;
  private readonly durationMs: number;
  private readonly floatDistanceY: number;
  private readonly baseY: number;
  private readonly baseX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: number,
    startTime: number,
    config: {
      fontSizePx: number;
      floatDurationMs: number;
      floatDistanceY: number;
    },
  ) {
    this.baseX = x;
    this.baseY = y;
    this.startTime = startTime;
    this.durationMs = config.floatDurationMs;
    this.floatDistanceY = config.floatDistanceY;

    this.text = scene.add.text(x, y, String(value), {
      fontSize: `${config.fontSizePx}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.text.setOrigin(0.5, 0.5);
  }

  update(elapsedMs: number): void {
    const progress = Math.min(1, elapsedMs / this.durationMs);

    // Float upward
    this.text.y = this.baseY - this.floatDistanceY * progress;

    // Fade out
    this.text.setAlpha(1 - progress);

    // Slight scale bounce at peak
    const bounce = Math.sin(progress * Math.PI);
    this.text.setScale(1 + bounce * 0.1);
  }

  get isComplete(): boolean {
    return elapsedMs >= this.durationMs;
  }

  destroy(): void {
    this.text.destroy();
  }
}
```

### 2. Damage number manager in CombatScene

In `CombatScene`, maintain a list of active damage numbers:

```ts
private readonly damageNumbers: CombatDamageNumber[] = [];
```

On each frame in `syncCombatPresentation()`, update all active damage numbers and remove completed ones:

```ts
const elapsed = this.runtime.combatElapsedMs;
for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
  const dn = this.damageNumbers[i];
  dn.update(elapsed - dn.startTime);
  if (dn.isComplete) {
    dn.destroy();
    this.damageNumbers.splice(i, 1);
  }
}
```

### 3. Event listeners

In `createSceneContent()`, listen for damage events and spawn damage numbers:

```ts
on('combat:enemy-hit', (payload) => {
  const view = this.enemyViews.get(payload.enemyId);
  if (!view) return;

  const config = CombatVisualConfig.DAMAGE_NUMBER;
  const x = view.container.x;
  const y = view.container.y + CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y + config.ENEMY_OFFSET_Y;

  this.damageNumbers.push(new CombatDamageNumber(
    this,
    x,
    y,
    payload.damage,
    this.runtime.combatElapsedMs,
    {
      fontSizePx: config.FONT_SIZE_PX,
      floatDurationMs: config.FLOAT_DURATION_MS,
      floatDistanceY: config.FLOAT_DISTANCE_Y,
    },
  ));
});

on('combat:base-damaged', (payload) => {
  const config = CombatVisualConfig.DAMAGE_NUMBER;
  const baseHpBarView = this.baseHpBarView;
  if (!baseHpBarView) return;

  this.damageNumbers.push(new CombatDamageNumber(
    this,
    baseHpBarView.x + config.BASE_OFFSET_X,
    baseHpBarView.y + config.BASE_OFFSET_Y,
    payload.current > 0 ? payload.max - payload.current : payload.max,
    this.runtime.combatElapsedMs,
    {
      fontSizePx: config.FONT_SIZE_PX,
      floatDurationMs: config.FLOAT_DURATION_MS,
      floatDistanceY: config.FLOAT_DISTANCE_Y,
    },
  ));
});
```

### 4. Cleanup

On scene shutdown, destroy all active damage numbers:

```ts
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  // ... existing cleanup ...
  this.damageNumbers.forEach((dn) => dn.destroy());
  this.damageNumbers.length = 0;
});
```

## Out of Scope

- Damage number pooling (spec says "do not need to be pooled" — low allocation pressure)
- Critical hit styling (no special visual for weakness hits)
- Damage number positioning on screen edges (spec says "no special handling needed" for clipping)
- Damage number formatting (just show the raw number, no "+" prefix)
- Test wave — handled in task 11

## Detailed Requirements

1. Create `src/combat/CombatDamageNumber.ts` with the `CombatDamageNumber` class
2. Add damage number management to `CombatScene` (list, update loop, event listeners)
3. Damage numbers spawn at enemy HP bar position for `combat:enemy-hit`
4. Damage numbers spawn at base HP bar position (with offset) for `combat:base-damaged`
5. Damage numbers float upward and fade out over `FLOAT_DURATION_MS` (~600ms)
6. Damage numbers self-destroy when animation completes
7. Damage numbers are white text with dark stroke (for readability)
8. Font size is `FONT_SIZE_PX` (default 14px)
9. Cleanup all damage numbers on scene shutdown

### Positioning details

**Enemy damage number**:
- X: `enemyView.container.x` (horizontally centered on enemy)
- Y: `enemyView.container.y + HP_BAR_OFFSET_Y + ENEMY_OFFSET_Y` (above HP bar)

**Base damage number**:
- X: `baseHpBarView.x + BASE_OFFSET_X` (offset to avoid capybara)
- Y: `baseHpBarView.y + BASE_OFFSET_Y` (above base HP bar)

### Damage value for base

For `combat:base-damaged`, the damage value is `max - current` (the amount of damage dealt). However, the event payload only has `current` and `max` — compute the damage as `payload.max - payload.current`.

Wait — the event payload is `{ current: number; max: number }`. The `max` is always the same (`CombatBalanceConfig.BASE_HP`). The damage is `max - current`.

## Acceptance Criteria

- [ ] `CombatDamageNumber.ts` exists and exports the `CombatDamageNumber` class
- [ ] Damage numbers spawn on `combat:enemy-hit` above enemy HP bar
- [ ] Damage numbers spawn on `combat:base-damaged` above base HP bar with offset
- [ ] Damage numbers float upward and fade out over ~600ms
- [ ] Damage numbers self-destroy when animation completes
- [ ] Damage numbers are white text with dark stroke
- [ ] No memory leaks (all damage numbers destroyed on scene shutdown)
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes

## Technical Notes

- **No pooling**: The spec explicitly says "Damage numbers do not need to be pooled (15 enemies × short animation = low allocation pressure)." Each damage number creates a new `Phaser.GameObjects.Text` and destroys it when done.
- **Self-destroy**: The `CombatDamageNumber` class manages its own lifecycle — `update()` returns `isComplete`, and the manager calls `destroy()` when complete.
- **Font**: Use `fontFamily: 'monospace'` to match the game's aesthetic.
- **Stroke**: Use `stroke: '#000000'` and `strokeThickness: 3` for readability on any background.
- **Scale bounce**: A slight scale bounce (`1 + sin(progress * PI) * 0.1`) adds juice — the number pops slightly at the peak of its float.

## Implementation Plan

1. Create `src/combat/CombatDamageNumber.ts` with the `CombatDamageNumber` class
2. Add `damageNumbers` array to `CombatScene`
3. Add update loop in `syncCombatPresentation()`
4. Add event listeners in `createSceneContent()`
5. Add cleanup in the SHUTDOWN event handler
6. Run `npx tsc --noEmit` to check for type errors
7. Run `npm test` to confirm no regressions
8. Open the game in browser — deal damage to see floating numbers

## Additional Notes

**Why not pool damage numbers?** Phaser.Text objects are relatively cheap to create/destroy for short-lived effects. With at most ~15 enemies × short animation duration, the allocation pressure is negligible. Pooling would add complexity (pool management, object reset logic) for no measurable benefit.

**Why compute damage as `max - current`?** The event payload gives us the current HP and max HP. The damage dealt is the difference. This is the most reliable way to get the damage value from the event.

**Why not use Phaser.Text styles for stroke?** Phaser 3's Text styles support `stroke` and `strokeThickness` directly. This is the correct approach for text outlines.

## Blocked By

- Task 06 (animation state must exist for computing enemy screen positions)

## Type

AFK

## Design Spec Reference

- [Damage Numbers](../design-spec.md#damage-numbers)
- [Damage Number System](../design-spec.md#damage-number-system)
- [Config](../design-spec.md#config) (`DAMAGE_NUMBER.*` config keys)
