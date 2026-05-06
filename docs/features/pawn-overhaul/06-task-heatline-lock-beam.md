# Heatline Lock Beam

## Task Intent

This task introduces the beam runtime family through `Heatline`, the first finisher beam pawn. It delivers a short-lived lock-on beam that snapshots its target at cast time, ticks damage over time, and terminates early if the target dies.

This slice exists because beams are one of the four primary archetypes promised by the overhaul and require a runtime model distinct from projectiles and explosions. The player-facing result is that `Heatline` visibly sustains a beam onto the frontmost enemy, making finishers feel materially different from single-hit attacks.

This task should implement only the lock-on beam variant. Sweeping beams and slow status belong later.

## Relevant Context

- Beams are short-lived runtime effects with bound origins.
- Beam origins follow the source slot world position as the record rotates.
- `Lock-on beam` selects the frontmost enemy at cast time, has `durationMs`, applies damage ticks at `tickIntervalMs`, ends if the target dies, and does not retarget.
- Finisher power snapshot is captured once at activation start and applies to the entire output of that activation, including beam lifetime damage.
- If no valid enemy exists at activation time, the beam is not created but note-rule behavior still resolves.

## In Scope

- Add authoritative beam runtime state.
- Insert beam-family updates into the combat loop.
- Implement lock-on beam behavior and make `Heatline` use it.
- Respect finisher/source snapshot architecture for beam lifetime damage.

## Out of Scope

- Sweeping beams.
- Slow status.
- Projectile, zone, delayed-explosion, or pawn-buff systems.

## Detailed Requirements

- Extend combat runtime with a beam collection containing:
  - source slot reference
  - bound origin behavior
  - target reference
  - remaining duration
  - tick timing state
  - stored source damage snapshot
- At `Heatline` activation:
  - capture finisher/source snapshots once
  - select frontmost enemy
  - create a lock-on beam runtime if a target exists
- During updates:
  - recompute beam origin from the current slot world position
  - tick damage at the authored interval
  - stop the beam when duration ends or target dies
  - never retarget to a different enemy
- Provide semantic events or presentation hooks for beam start and beam ticks.
- Clear active beams on wave end.

## Acceptance Criteria

- [ ] `Heatline` creates a short-lived lock-on beam that follows the source slot origin and damages the cast-time target over time.
- [ ] Beam lifetime damage uses an activation-start snapshot rather than re-reading mutable note/buff state every tick.
- [ ] Beams end immediately on target death, do not retarget, and are cleaned up on wave end.

## Technical Notes

- Likely files include a dedicated `CombatBeams.ts` plus loop changes in `CombatRuntime.ts`.
- Keep beam lifetime logic outside `CombatActivation.ts`; activation should only orchestrate creation.
- Damage ticks should still route through the shared damage pipeline so later effects such as high-HP bonus remain composable where appropriate.

## Implementation Plan

1. Add beam runtime types and update helpers for lock-on behavior.
2. Insert beam updates into the recommended post-activation combat phase.
3. Refactor `Heatline` activation to create a beam instance using authored duration/tick interval values.
4. Store a source snapshot on beam creation and consume it on every beam tick.
5. Add one-shot feedback events and any persistent render-model plumbing required by the combat view.
6. Validate early termination when the target dies or disappears.

## Additional Notes

- UX note: beam readability matters; even a minimal line/segment view is enough if it is stable and clearly anchored to the source slot.

## Blocked By

- Blocked by 01-task-pawn-content-foundation
- Blocked by 02-task-pawn-atlas-integration

## Type

AFK

## Design Spec Reference

- [Beam Rules](../design-spec.md#beam-rules)
- [Source Snapshot Rules](../design-spec.md#source-snapshot-rules)
- [Combat Runtime Extensions](../design-spec.md#combat-runtime-extensions)
