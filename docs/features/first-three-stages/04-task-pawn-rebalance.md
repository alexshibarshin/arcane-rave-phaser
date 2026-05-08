# Pawn Rebalance

## Task Intent

Update all 12 pawn `baseDamage` values in `CombatContentConfig` to match the rebalanced design spec numbers. Also update `PAWN_TIER_DAMAGE_MULTIPLIER` from `[1, 3, 8]` to `[1, 2.5, 6]`. This is a pure content-tuning task — no logic changes, no new abilities, no behavior modifications.

After this task, pawns deal different amounts of damage and tier scaling is less extreme, making tier 2 and 3 pawns strong but not dominant.

## Relevant Context

The baseline for balance is `Ruby Needle = 50` damage at tier 1. All other pawns are tuned relative to this baseline (×BL column in the table below). Finishers assume ~1.5× consumed notes multiplier at design time.

The old tier multiplier `[1, 3, 8]` made tier 2 and 3 pawns vastly more powerful than tier 1, encouraging merge-at-all-costs strategies. The new multiplier `[1, 2.5, 6]` keeps merges valuable but reduces the gap, making base-tier pawn placement and synergy more relevant.

### Active Deck (8 pawns)

| ID | Type | Color | Old Damage (t1) | New Damage (t1) | ×BL | Role |
|----|------|-------|-----------------|-----------------|-----|------|
| `ruby-needle` | gen | red | 20 | 50 | 1.0x | Baseline single-target |
| `bass-bomb` | gen | red | 36 | 38 | 0.76x | Red AOE (120r) |
| `heatline` | fin→blue | red | 12 | 10 (×6 ticks = 60) | 1.2x | Sustained beam eliminator |
| `meteor-drop` | fin→green | red | 100 | 40 (+burn 4×4=16) | 0.8+0.32x | Delayed blast + burn zone |
| `moss-patch` | gen | green | 14 | 9 (×5 ticks = 45) | 0.9x | Zone DoT (130r) |
| `thorn-fan` | fin→red | green | 28 | 5 (×14 shots = 70) | 1.4x | Shotgun close-range burst |
| `frost-sweep` | gen | blue | 10 | 15/hit | 0.75x | Sweep beam + slow |
| `arc-bounce` | fin→green | blue | 24 | 3 (×15 shots = 45) + bounce | 0.9–1.4x | Volley + bounce finisher |

### Inactive Deck (4 pawns)

| ID | Type | Color | Old Damage (t1) | New Damage (t1) | ×BL | Role |
|----|------|-------|-----------------|-----------------|-----|------|
| `lifebloom-scatter` | gen | green | 20 | 3 (×14 = 42) | 0.84x | Heal 50% compensates |
| `pulse-garden` | fin→blue | green | 16 | 10 (×4 ticks = 40) | 0.8x | Zone + next-slot buff 35% |
| `prism-volley` | gen | blue | 18 | 3 (×14 = 42) + split | 0.84–1.7x | Volley + split projectiles |
| `pressure-burst` | fin→red | blue | 42 | 42 (63 vs fresh) | 0.84–1.26x | Opener, +50% vs >75% HP |

### Tier Multipliers

- Old: `[1, 3, 8]`
- New: `[1, 2.5, 6]`

## In Scope

- Update `baseDamage` in each of the 12 pawn definitions in `CombatContentConfig.ts`
- Update `PAWN_TIER_DAMAGE_MULTIPLIER` in `CombatBalanceConfig.ts` to `[1, 2.5, 6]`
- Update pawn tooltip `shortDescription` strings if they mention specific damage numbers
- Update `FINISHER_CONSUMED_NOTES_MULTIPLIER` and other finisher-related constants ONLY if the design spec mentions changes (it doesn't — leave as-is unless you spot a necessary adjustment)

## Out of Scope

- Changing pawn abilities, archetypes, targeting rules, or secondary effects
- Changing which pawns are in the active deck
- Adding or removing pawns
- Modifying `FINISHER_CONSUMED_NOTES_MULTIPLIER` (unchanged per spec)
- Modifying `GENERATOR_BASE_DAMAGE` or `FINISHER_BASE_DAMAGE` (these are legacy constants — may not be used anymore)

## Detailed Requirements

1. In `CombatContentConfig.ts`, locate each pawn definition and update the `damage` parameter passed to `createGeneratorPawnDefinition` / `createFinisherPawnDefinition` and the `damage` in the `ability` object
2. For multi-hit pawns (heatline with ticks, moss-patch with zone ticks, thorn-fan with multiple projectiles, etc.), update the per-hit/ per-tick damage AND ensure the tooltip description reflects the correct total
3. In `CombatBalanceConfig.ts`, change `PAWN_TIER_DAMAGE_MULTIPLIER` to `[1, 2.5, 6]`
4. The `heatline` pawn has damage in two places: `damage` (passed to factory) and `ability.damage` (the beam tick damage). Both must match.
5. The `moss-patch` pawn: damage 9 per tick, 5 ticks at 500ms intervals = 45 total over 2.5s
6. The `thorn-fan` pawn: damage 5 per projectile, 14 projectiles (5 base + damage seems off — re-read spec: `5×14=70`. Actually, the spec says 5 damage × 14 shots? That's 14 projectiles. Check current projectileCount in ability — it's 5. The spec value of 70 suggests it was originally 14 projectiles at 5 damage each. The old config has `projectileCount: 5` at damage 28. The new spec says damage 5 with 14 projectiles. Update both the damage AND projectileCount.)
7. For `frost-sweep`: the ability damage is 10 per tick. New is 15. Update ability.damage.
8. For `arc-bounce`: old damage 24, new is 3 per shot. But the spec says `3×15=45`. The volleyShotCount is 3. So each volley fires 3 shots? Actually looking at the spec more carefully: `3×15=45` means 15 projectiles at 3 damage each? No — the pattern is "burst-volley" which fires N timed shots. Old config has `volleyShotCount: 3`. The spec `3×15=45` means 3 damage × 15 shots? That doesn't match current volleyShotCount 3. Let's interpret: damage=3 per projectile, and with volleyShotCount of 3 at projectileCount proportional scaling... Actually: `damage: 3` is the base damage per projectile. The `volleyShotCount: 3` fires 3 projects. So `3×3=9` per activation? That's too low. Wait — "burst-volley" fires `volleyShotCount` projectiles, each dealing `damage`. So 3 projectiles × 3 damage = 9. That's way below 45.

   Re-reading the ability definition: the pattern is `burst-volley` with `volleyShotCount: 3`. The spec says `3×15=45` which implies 15 projectiles at 3 damage each. Looking at projectile count: the base `projectileCount` for burst-volley might be 5 per volley shot. So 3 volley shots × 5 projectiles per shot = 15 projectiles at 3 damage = 45 total.

   The current code for arc-bounce has `damage: 24` and `volleyShotCount: 3` but no `projectileCount`. The `projectileCount` field is optional in `CombatProjectileAbilityDefinition`. For burst-volley, when `projectileCount` is not set, it probably defaults to 1. With volleyShotCount=3, that's 3 projectiles per activation.

   For the new balance: set `damage: 3`, `volleyShotCount: 3`, and add `projectileCount: 5`. This gives 3×5=15 projectiles at 3 damage = 45 total potential. But adding `projectileCount` to a finisher might interact with note consumption... Actually, projectileCount controls how many projectiles fire per volley shot. For burst-volley: fires `volleyShotCount` times, each time firing `projectileCount` (default 1) projectiles. So with `volleyShotCount: 3` and `projectileCount: 5`, we get 15 total at damage 3 each = 45.

   BUT: this is a significant ability change (adding projectileCount: 5). The design spec's pawn balance section says damage `3×15=45` with the note `Volley + bounce finisher`. This implies the pawn fires many low-damage projectiles. The current config has only 3 volley shots. The spec explicitly says 15 total projectiles. So YES, update both damage and projectile count.

9. For `prism-volley`: old damage 18, new is 3 per projectile. Spec: `3×14=42+split`. Current `volleyShotCount: 3`. With projectileCount logic: 3 volley shots × something = 14? Not clean. Maybe set volleyShotCount to 14/factor or add projectileCount. The spec says 14 projectiles. Update volleyShotCount to 14? Or add projectileCount: something. The spec says this is a volley with 14 shots. Probably change volleyShotCount to 14 and damage to 3.

Treat pawn config as needing ABILITY changes too when the spec implies different projectile counts. Read the spec carefully for each pawn.

## Acceptance Criteria

- [ ] All 12 pawn `baseDamage` values match the spec table above
- [ ] `PAWN_TIER_DAMAGE_MULTIPLIER` is `[1, 2.5, 6]`
- [ ] Pawn ability objects have matching damage/projectile count values where the spec implies structural changes (thorn-fan: projectileCount 14, damage 5; arc-bounce: projectileCount 5, damage 3; prism-volley: volleyShotCount 14, damage 3)
- [ ] Pawn tooltip strings are updated if they hardcode damage numbers
- [ ] `npx tsc --noEmit` passes
- [ ] Config validation passes (including the validation that checks pawn definitions)

## Technical Notes

- The `baseDamage` field on pawn definitions is separate from `ability.damage`. Both must be updated consistently. The `baseDamage` is used for display/scaling, while `ability.damage` is the actual combat value.
- `getScaledPawnDamage(baseDamage, tier)` uses `PAWN_TIER_DAMAGE_MULTIPLIER`. After changing the multiplier, tier-2 and tier-3 pawns will deal less damage than before.
- The `FINISHER_CONSUMED_NOTES_MULTIPLIER` array `[0.75, 1.0, 1.15, 1.4, 1.75, 2.25]` is NOT changed by this task.
- Some pawns have `secondaryEffect` with `damagePerTick` (burn zone for meteor-drop). Update those values too:
  - `meteor-drop` burn zone: `damagePerTick` should be 4 (was 18). Burn zone duration 2000ms, tick interval 500ms = 4 ticks × 4 = 16 burn damage. Combined with blast 40 = 56 total.
  - `moss-patch`: damage per tick = 9 (was 14)
  - `pulse-garden`: damage per tick = 10 (was 16)
  - `frost-sweep`: per-hit damage = 15 (was 10)

## Implementation Plan

1. Open `CombatContentConfig.ts`, find each of the 12 pawn definitions
2. For each pawn, update:
   - The `damage` parameter in the factory call
   - The `ability.damage` value
   - Any `ability.projectileCount` or `ability.volleyShotCount` that needs structural change
   - Any `secondaryEffect.damagePerTick` values
   - The `tooltip` string if it hardcodes damage numbers
3. Open `CombatBalanceConfig.ts`, change `PAWN_TIER_DAMAGE_MULTIPLIER`
4. Run `npx tsc --noEmit`
5. Run config validation

## Blocked By

None — can start immediately. Technically independent of tasks 01–03.

## Type

AFK

## Design Spec Reference

- [Pawn Balance — Active Deck](../design-spec.md#active-deck-8-pawns)
- [Pawn Balance — Inactive](../design-spec.md#inactive-4-pawns-balanced-but-not-in-deck)
- [Economy changes (tier multiplier)](../design-spec.md#economy)
