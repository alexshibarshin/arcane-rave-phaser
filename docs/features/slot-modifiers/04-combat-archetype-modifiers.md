# 04 — Archetype Modifiers: Projectile, AoE Radius

## Task Intent

Extend the `CombatSlotModifierResolver` and `CombatActivation` to apply archetype-specific slot modifier effects: `+1 projectile`, `+50% AoE radius`. These affect pawns whose `primaryArchetype` matches the modifier's target archetype.

After this task:
- `resolveSlotModifierMutations()` returns `projectileCountBonus`, `volleyShotCountBonus`, and `radiusMultiplier`.
- `resolveProjectileAbility` applies the count bonuses depending on the pawn's projectile pattern.
- `resolveExplosionAbility` and `resolveZoneAbility` apply the radius multiplier.
- The `+1 extra beam` modifier is NOT implemented here (task 06).

## Relevant Context

**From the Design Spec — `+1 projectile` mechanics:**
- `shotgun-spread` pattern → adds to `projectileCount` (e.g. 3 → 4)
- Volley pattern (uses `volleyShotCount`) → adds to `volleyShotCount` (e.g. 3 → 4)
- `single-shot` pattern → no effect (intentional)

**From the Design Spec — `+50% AoE radius`:**
- Multiplies `ability.radius` by `radiusMultiplier` (1.5 for the authored modifier).
- Applies to BOTH `explosion` and `zone` archetypes.
- Does NOT apply to `projectile` or `beam`.

**From the Design Spec — effectParams:**
- `projectile-bonus`: `{ projectileCountBonus: number; volleyShotCountBonus: number }`
- `aoe-radius-scale`: `{ radiusMultiplier: number }`

**Current code locations:**
- `CombatActivation.ts` line 131: `resolveProjectileAbility()` — reads `ability.projectileCount`, `ability.volleyShotCount`, passes them to `spawnShotgunProjectiles()` and `queueProjectileVolley()`
- `CombatActivation.ts` line 197: `resolveExplosionAbility()` — passes `ability.radius` to `createImmediateTargetedExplosion()` / `queueDelayedExplosion()`
- `CombatActivation.ts` line 261: `resolveZoneAbility()` — passes `ability.radius` to `createTargetedZone()`
- `CombatContentConfig.ts` line 123: `CombatProjectileAbilityDefinition` — has `projectileCount?: number`, `volleyShotCount?: number`, `pattern: CombatProjectilePattern`
- `CombatContentConfig.ts` line 137: `CombatExplosionAbilityDefinition` — has `radius: number`
- `CombatContentConfig.ts` line 160: `CombatZoneAbilityDefinition` — has `radius: number`

## In Scope

- `CombatSlotModifierResolver.ts` — extend to handle `projectile-bonus` and `aoe-radius-scale` effect kinds
- `CombatActivation.ts` — apply `projectileCountBonus`/`volleyShotCountBonus` in `resolveProjectileAbility`, apply `radiusMultiplier` in `resolveExplosionAbility` and `resolveZoneAbility`
- Tests for archetype modifier behavior

## Out of Scope

- `beam-count-bonus` effect kind (task 06)
- Double activation (task 05)
- Build UI rendering
- Changing projectile/explosion/zone creation functions themselves

## Detailed Requirements

### CombatSlotModifierResolver.ts — Extend

Add handling for two new effect kinds in `resolveSlotModifierMutations()`:

**`projectile-bonus`:**
- Verify that the pawn's `primaryArchetype` is `'projectile'`. If not, return default mutations (modifier doesn't apply).
- `projectileCountBonus = modifier.effectParams.projectileCountBonus`
- `volleyShotCountBonus = modifier.effectParams.volleyShotCountBonus`
- All other fields at defaults.

**`aoe-radius-scale`:**
- Verify that the pawn's `primaryArchetype` is `'explosion'` OR `'zone'`. If not, return default mutations.
- `radiusMultiplier = modifier.effectParams.radiusMultiplier`
- All other fields at defaults.

**Important:** The archetype check is done in the resolver, not in the activation code. The resolver returns default mutations for incompatible archetypes.

### CombatActivation.ts — Extend

**`resolveProjectileAbility`:**
- After resolving modifier mutations, read `mutations.projectileCountBonus` and `mutations.volleyShotCountBonus`.
- For `shotgun-spread` pattern: pass `(ability.projectileCount ?? 1) + mutations.projectileCountBonus` to `spawnShotgunProjectiles()`.
- For volley pattern (the else-branch that calls `queueProjectileVolley`): pass `(ability.volleyShotCount ?? 1) + mutations.volleyShotCountBonus` to `queueProjectileVolley()`.
- For `single-shot` pattern: no change (intentional — modifier does nothing).

**`resolveExplosionAbility`:**
- After resolving modifier mutations, compute `effectiveRadius = ability.radius * mutations.radiusMultiplier`.
- Pass `effectiveRadius` instead of `ability.radius` to `createImmediateTargetedExplosion()` and `queueDelayedExplosion()`.

**`resolveZoneAbility`:**
- After resolving modifier mutations, compute `effectiveRadius = ability.radius * mutations.radiusMultiplier`.
- Pass `effectiveRadius` instead of `ability.radius` to `createTargetedZone()`.

**How to get mutations into resolve functions:**
Option A (recommended): Call `resolveSlotModifierMutations(runtime, slot.slotIndex)` once in `resolvePawnAbility()` before the switch statement, and pass the mutations object down to each `resolve*Ability` function as a parameter.

Option B: Call the resolver inside each `resolve*Ability` function.

Prefer Option A — it's one call site and makes the flow explicit.

### Tests

**`+1 projectile` tests:**
- Shotgun-spread pawn with `projectileCount: 3` on a `+1 projectile` slot spawns 4 projectiles
- Volley pawn with `volleyShotCount: 3` on a `+1 projectile` slot queues 4 shots
- Single-shot pawn on a `+1 projectile` slot — no change, single projectile spawned
- Non-projectile pawn (e.g. beam) on `+1 projectile` slot — resolver returns default mutations

**`+50% AoE radius` tests:**
- Explosion pawn on AoE slot — `effectiveRadius = ability.radius * 1.5`
- Zone pawn on AoE slot — `effectiveRadius = ability.radius * 1.5`
- Projectile pawn on AoE slot — resolver returns default mutations (`radiusMultiplier: 1.0`)
- Beam pawn on AoE slot — resolver returns default mutations

## Acceptance Criteria

- [ ] `resolveSlotModifierMutations()` returns `projectileCountBonus: 1, volleyShotCountBonus: 1` for `projectile-bonus` on projectile pawn
- [ ] `resolveSlotModifierMutations()` returns `radiusMultiplier: 1.5` for `aoe-radius-scale` on explosion pawn
- [ ] `resolveSlotModifierMutations()` returns `radiusMultiplier: 1.5` for `aoe-radius-scale` on zone pawn
- [ ] `resolveSlotModifierMutations()` returns defaults for `projectile-bonus` on non-projectile pawn
- [ ] `resolveSlotModifierMutations()` returns defaults for `aoe-radius-scale` on projectile/beam pawn
- [ ] Shotgun-spread projectile count is increased by `projectileCountBonus`
- [ ] Volley shot count is increased by `volleyShotCountBonus`
- [ ] Single-shot is unaffected by `projectileCountBonus`
- [ ] Explosion radius is multiplied by `radiusMultiplier`
- [ ] Zone radius is multiplied by `radiusMultiplier`
- [ ] `npx tsc --noEmit` passes
- [ ] All existing tests pass
- [ ] New archetype modifier tests pass

## Technical Notes

**Why archetype checking lives in the resolver:**
The resolver is the single source of truth for "does this modifier apply to this pawn?" The activation code just applies whatever mutations it receives. This keeps the activation code simple and avoids duplicating archetype checks.

**Radius multiplier semantics:**
- `radiusMultiplier` defaults to `1.0` (no change).
- For `+50% AoE radius`, `radiusMultiplier = 1.5`, so `effectiveRadius = ability.radius * 1.5`.
- This is a multiplier, not an additive bonus. The spec intentionally chose this because AoE effects scale geometrically.

**Projectile count semantics:**
- The base count comes from the ability definition (`ability.projectileCount ?? 1`, `ability.volleyShotCount ?? 1`).
- The bonus is ADDED to the base count, not multiplied.
- Zero bonus leaves the count unchanged.
- This is consistent with the spec's "simpler and more legible" philosophy.

**Pitfall — `single-shot` pattern:**
The `single-shot` pattern uses `spawnSingleProjectile()` directly and does NOT read `projectileCount` or `volleyShotCount`. Do not add complexity to single-shot for the modifier — it intentionally does nothing for this pattern.

## Implementation Plan

1. Extend `src/combat/CombatSlotModifierResolver.ts`:
   - Add `projectile-bonus` case: check archetype, set `projectileCountBonus` and `volleyShotCountBonus`
   - Add `aoe-radius-scale` case: check archetype (explosion OR zone), set `radiusMultiplier`
   - Ensure all other effect kinds still return defaults (they'll be filled in by tasks 05-06)

2. Update `src/combat/CombatActivation.ts`:
   - In `resolvePawnAbility()`: call `resolveSlotModifierMutations()` once before the switch, store in a local const
   - Pass `mutations` as a parameter to `resolveProjectileAbility`, `resolveExplosionAbility`, `resolveZoneAbility`
   - In `resolveProjectileAbility()`: apply `projectileCountBonus` (shotgun-spread) or `volleyShotCountBonus` (volley)
   - In `resolveExplosionAbility()`: apply `radiusMultiplier` to `ability.radius`
   - In `resolveZoneAbility()`: apply `radiusMultiplier` to `ability.radius`

3. Write/update tests:
   - Add test cases to `CombatSlotModifierResolver.test.ts` for archetype modifier resolution
   - If combat integration tests exist, add cases for modified projectile counts and radii

4. Validate: `npx tsc --noEmit`, `npm run test:run`

## Blocked By

- Blocked by 03-combat-note-modifiers (needs `SlotModifierMutations` type, resolver infrastructure, activation integration pattern)

## Type

AFK

## Design Spec Reference

- [First Content Pool — Archetype Modifiers](../design-spec.md#common-archetype-modifiers)
- [Modifier Compatibility Model — Archetype Modifiers](../design-spec.md#modifier-compatibility-model)
- [Modifier Definition Schema — effectParams](../design-spec.md#modifier-definition-schema)
- [CombatSlotModifierResolver](../design-spec.md#combat-layer)
- [CombatActivation Changes — radiusMultiplier](../design-spec.md#existing-files-that-need-light-changes)
