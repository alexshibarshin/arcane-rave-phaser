# Frost Sweep Slow

## Task Intent

This task expands the beam family to support sweeping beams and introduces the MVP enemy status runtime via `slow`. It makes `Frost Sweep` fully functional as a generator beam that sweeps across space and applies movement slow on hit.

This slice exists because the overhaul’s first advanced pawns need at least one meaningful secondary effect, and sweeping beams have materially different hit semantics from lock-on beams. The player-facing result is that `Frost Sweep` creates a moving beam line that can clip multiple enemies and visibly debuff them.

This task should remain tightly focused on sweeping beam behavior plus the single supported status type, `slow`.

## Relevant Context

- `Sweeping beam` selects the frontmost enemy at cast time, constructs a sweep path from that cast-time choice, and does not retarget.
- Sweeping beams apply damage on `new crossing` events only.
- If an enemy stays continuously under the beam, it does not take repeated hits until a new crossing happens.
- MVP status support includes only `slow`.
- Slow affects only enemy movement speed, does not stack by magnitude, strongest magnitude wins, and equal/weaker applications only refresh duration.
- `Frost Sweep` is a blue generator beam with slow-on-hit secondary effect.

## In Scope

- Extend beam runtime to support sweeping-path behavior.
- Add authoritative enemy status runtime for `slow`.
- Make `Frost Sweep` apply slow on hit crossings.
- Add presentation/event hooks for slow application feedback.

## Out of Scope

- Other statuses beyond slow.
- Lock-on beam changes beyond reuse of shared beam infrastructure.
- Other secondary effects such as heal, buffs, split, or burn zones.

## Detailed Requirements

- Add a sweeping beam mode that:
  - snapshots a cast-time target/aim basis
  - defines a path over the beam’s lifetime
  - tracks which enemies were intersected last frame
  - damages only on new crossings
- The sweep must not retarget during lifetime.
- Multiple enemies may be hit in one frame if all are newly crossed.
- Introduce `slow` status runtime with:
  - magnitude
  - remaining duration
  - strongest-wins rules
  - refresh behavior for equal/weaker reapply
- Slow must affect only enemy movement speed and not alter base-attack cadence after reaching the base.
- Apply slow only on real beam hit events, not merely on beam existence.
- Clear statuses on wave end.

## Acceptance Criteria

- [ ] `Frost Sweep` creates a sweeping beam that damages enemies only when they are newly crossed by the beam path.
- [ ] Enemies hit by the sweep receive `slow` with strongest-wins and duration-refresh semantics.
- [ ] Slow affects enemy movement only and is fully cleared on wave end.

## Technical Notes

- Likely helpers include `CombatBeams.ts` plus a dedicated `CombatStatuses.ts`.
- Keep status state authoritative in combat runtime rather than mutating ad hoc flags directly on enemy instances without tracking timers.
- A common failure mode is repeatedly damaging enemies every frame while under the beam; crossing memory needs to be explicit per beam instance.

## Implementation Plan

1. Extend beam runtime types with sweeping-path state and per-frame crossing memory.
2. Add status runtime types plus update/maintenance helpers for slow.
3. Refactor `Frost Sweep` activation to spawn a sweeping beam from authored content.
4. On crossing hits, route damage through shared damage application and then apply slow.
5. Connect slow-applied feedback into EventBus or the project’s semantic combat event model.
6. Validate multiple-enemy crossings, no-retarget behavior, and strongest-wins refresh rules.

## Additional Notes

- Visual note: the sweep path should prioritize readability over complex interpolation; a simple, clear arc or pivoting line is enough for MVP.

## Blocked By

- Blocked by 06-task-heatline-lock-beam

## Type

AFK

## Design Spec Reference

- [Beam Rules](../design-spec.md#beam-rules)
- [Status Rules](../design-spec.md#status-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
