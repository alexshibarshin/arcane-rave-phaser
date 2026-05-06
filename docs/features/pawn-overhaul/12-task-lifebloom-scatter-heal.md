# Lifebloom Scatter Heal

## Task Intent

This task implements the first healing rider by making `Lifebloom Scatter` convert dealt damage into base healing. It is a secondary-effect slice that reuses the shotgun projectile work rather than introducing a new primary archetype.

This slice exists because the roster includes advanced authored pawns outside the initial active deck, and healing from dealt damage is one of the core readability promises in combat feedback. The player-facing result is that `Lifebloom Scatter` can restore base HP based on actual enemy HP removed, with visible heal feedback at the base.

This task should stay focused on the healing rider and not expand build-phase or general support systems beyond what healing needs.

## Relevant Context

- `Base heal from dealt damage` is based on actual HP removed from enemies, not theoretical pre-clamp damage.
- The heal is calculated per damage event.
- Heal can be aggregated for display per frame at the base.
- Healing clamps to max base HP and does not reverse an already reached defeat state.
- `Lifebloom Scatter` is a green generator projectile pawn using shotgun spread and base-heal rider.
- This pawn is authored but inactive in the first playable deck, so it must exist in content without needing shop exposure immediately.

## In Scope

- Add the base-heal-from-damage secondary effect.
- Make `Lifebloom Scatter` use shotgun spread plus healing rider.
- Add heal feedback events/signals for the base.

## Out of Scope

- New primary projectile mechanics beyond reuse of shotgun spread.
- Other secondary effects.
- Build UI changes to expose inactive pawns.

## Detailed Requirements

- Extend shared damage resolution or post-hit handling so a pawn can request healing based on actual HP removed.
- The heal amount must:
  - use actual damage dealt after clamps/modifiers
  - apply per damage event
  - clamp to max base HP
  - not reverse an already-resolved defeat state
- `Lifebloom Scatter` should fire via the shared shotgun projectile path and apply healing on each valid hit according to authored percentage values.
- Emit `combat:base-healed` or equivalent semantic feedback for presentation/floating numbers.
- Ensure this rider is authored as pawn-specific ability data, not a universal effect-composer framework.

## Acceptance Criteria

- [ ] `Lifebloom Scatter` heals the base based on actual HP removed by its hits, not on raw theoretical damage.
- [ ] Base HP never exceeds max HP and healing does not undo a defeat that already occurred.
- [ ] Healing feedback is emitted through the combat event/presentation layer in a reusable way.

## Technical Notes

- The healing calculation belongs near the shared damage pipeline or its result handling, because it depends on actual HP removed.
- Keep the effect authored and explicit in content rather than inferring from pawn names or colors.
- Since the pawn is inactive in the temporary deck, validate it through direct setup/tests rather than assuming shop access.

## Implementation Plan

1. Inspect the shared damage application path and find the exact place where actual HP removed is known.
2. Add an authored healing rider config and evaluation path.
3. Refactor `Lifebloom Scatter` to use existing shotgun projectile code with the healing rider attached.
4. Apply base-heal logic on each concrete hit and emit feedback events.
5. Validate clamp behavior, multi-hit aggregation, and defeated-base edge cases.

## Additional Notes

- UX note: even if heal numbers are aggregated visually per frame, the authoritative healing math should still happen per damage event.

## Blocked By

- Blocked by 08-task-thorn-fan-shotgun

## Type

AFK

## Design Spec Reference

- [Damage and Healing Rules](../design-spec.md#damage-and-healing-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
- [Temporary Active Deck](../design-spec.md#temporary-active-deck)
