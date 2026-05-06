# Meteor Drop Delayed Blast

## Task Intent

This task adds the delayed-explosion runtime family and the authored burn-zone rider needed for `Meteor Drop`. It turns explosion gameplay from purely immediate AoE into a telegraphed, delayed detonation that can leave a lingering damage zone after a successful blast.

This slice exists because the overhaul explicitly promises delayed blasts and secondary burn zones as part of the first production-shaped roster. The player-facing result is that `Meteor Drop` marks a point, detonates there after a delay even if enemies move away, and then leaves behind a damaging zone when the detonation actually occurs.

This task should not introduce a generalized effect composer. It is specifically for delayed blast plus the one authored follow-up zone behavior.

## Relevant Context

- `Delayed blast` creates a short-lived pending explosion runtime storing a fixed world point chosen at cast time.
- It always detonates at that stored point even if the original target moved away.
- All explosions damage all enemies in radius.
- If a delayed explosion reaches wave end before detonation, it is removed without exploding.
- `Linger burn zone after cast` spawns if and only if the delayed blast actually detonated.
- The burn zone does not require the primary blast to have hit any enemy.
- `Meteor Drop` is a red finisher explosion pawn with green output note and burn-zone secondary effect.

## In Scope

- Add authoritative pending delayed-explosion runtime state.
- Add delayed-explosion update logic and telegraph presentation hooks.
- Make `Meteor Drop` use delayed blast behavior.
- Spawn a lingering damage zone after detonation using the zone family from task 07.

## Out of Scope

- Other explosion riders or generalized post-effect combinators.
- New status types or pawn buffs.
- Retrofitting unrelated explosion pawns.

## Detailed Requirements

- Extend combat runtime with a pending explosion collection containing:
  - stored world point
  - radius
  - delay timer
  - source snapshot data
  - authored post-detonation rider info
- At activation:
  - select the authored target enemy
  - snapshot the impact point at cast time
  - create a pending explosion runtime if a target exists
- During updates:
  - count down delay
  - detonate exactly at the stored world point
  - apply AoE damage to all enemies in radius
  - emit semantic feedback for telegraph and detonation
- On successful detonation, spawn the authored lingering burn zone at the same point.
- On wave end before detonation, remove the pending explosion with no blast and no burn zone.
- Finisher/source snapshots must apply to both the blast and the spawned burn zone.

## Acceptance Criteria

- [ ] `Meteor Drop` creates a pending delayed blast at a cast-time point and detonates there after the authored delay even if enemies moved away.
- [ ] A lingering burn zone is spawned only when the delayed blast actually detonates.
- [ ] Pending explosions are cleared silently on wave end if they have not detonated yet.

## Technical Notes

- Likely helpers include `CombatExplosions.ts` for both immediate and delayed paths plus reuse of `CombatZones.ts` for the burn zone.
- Keep the delayed-explosion state authoritative and render telegraphs from that state rather than only from spawn events.
- Source snapshot data must be preserved across the delay so post-detonation damage does not re-read mutable note/buff state.

## Implementation Plan

1. Extend explosion helpers/types to include pending delayed instances.
2. Insert delayed-explosion updates into the combat loop in the recommended post-activation phase.
3. Refactor `Meteor Drop` activation to create a pending explosion with stored point and snapshot data.
4. Implement detonation resolution and presentation signals.
5. Reuse or extend the zone family to spawn the authored burn zone after detonation.
6. Validate wave-end cleanup and the rule that no burn zone appears if detonation never happens.

## Additional Notes

- Visual note: the telegraph only needs to be clear and legible; perfect FX polish is not required for this slice.

## Blocked By

- Blocked by 05-task-bass-bomb-burst
- Blocked by 07-task-moss-patch-zone

## Type

AFK

## Design Spec Reference

- [Explosion Rules](../design-spec.md#explosion-rules)
- [Cleanup Rules](../design-spec.md#cleanup-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
