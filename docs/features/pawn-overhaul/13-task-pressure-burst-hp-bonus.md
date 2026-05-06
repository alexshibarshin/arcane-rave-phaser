# Pressure Burst High-HP Bonus

## Task Intent

This task adds the high-HP conditional damage modifier and uses it to complete `Pressure Burst`. It is a small but important damage-pipeline slice that keeps the modifier system explicit and pawn-authored rather than ad hoc.

This slice exists because the authored roster includes an advanced finisher whose identity depends on punishing healthy targets. The player-facing result is that `Pressure Burst` deals extra damage only when the struck enemy is above the configured HP-ratio threshold at the moment of the hit.

This task should remain narrow: implement the modifier cleanly in the damage pipeline and avoid broad rebalance work.

## Relevant Context

- Damage modifier order is:
  1. base ability hit damage
  2. source-side snapshots
  3. target-conditional modifier: bonus damage vs high-HP targets
  4. elemental weakness modifier
  5. final rounding and HP clamp
- The high-HP bonus is evaluated at each concrete hit using the target’s current HP ratio at that hit.
- The bonus is a percentage damage increase affecting only the qualifying hit, not downstream secondary effects.
- `Pressure Burst` is a blue finisher explosion pawn with red output note and this secondary effect.

## In Scope

- Add the high-HP conditional damage modifier to the shared damage pipeline.
- Make `Pressure Burst` use the modifier through authored content data.
- Ensure the modifier composes correctly with source snapshots and elemental weakness ordering.

## Out of Scope

- Explosion-family changes beyond reuse of immediate targeted burst.
- Other secondary effects.
- Damage-pipeline redesign unrelated to the modifier order in the design spec.

## Detailed Requirements

- Extend damage calculation so a hit can optionally check:
  - current target HP ratio
  - authored threshold ratio
  - authored bonus percent
- Evaluate the condition at each real hit, not once at activation creation time.
- Apply the bonus after source snapshots and before elemental weakness.
- Scope the bonus to the qualifying hit only.
- Keep the modifier authored per pawn/ability rather than as a hard-coded rule for all explosions or finishers.

## Acceptance Criteria

- [ ] `Pressure Burst` gains extra damage only when the target meets the authored high-HP ratio condition at hit time.
- [ ] The high-HP modifier is applied in the correct damage-pipeline order relative to snapshots and elemental weakness.
- [ ] The modifier is represented as authored ability data and can be queried or reused by later content.

## Technical Notes

- The cleanest place is likely a shared damage helper such as `CombatDamage.ts`.
- Avoid baking the rule into `Pressure Burst` activation code; it should live in the common damage calculation path.
- Since the pawn is inactive in the temporary deck, validate via tests or direct setup rather than relying on normal shop flow.

## Implementation Plan

1. Inspect existing damage calculation order and identify the extension point for target-conditional modifiers.
2. Add authored content fields for high-HP threshold and bonus percent if not already present.
3. Implement the conditional modifier in shared damage calculation.
4. Ensure `Pressure Burst` routes through the same immediate explosion path as other burst explosions.
5. Validate threshold behavior around boundary cases and interaction with elemental weakness.

## Additional Notes

- Balance note: keep the modifier readable in tooltip text and debug output because its value depends on target HP state at hit time.

## Blocked By

- Blocked by 05-task-bass-bomb-burst

## Type

AFK

## Design Spec Reference

- [Damage and Healing Rules](../design-spec.md#damage-and-healing-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
- [Technical Design](../design-spec.md#technical-design)
