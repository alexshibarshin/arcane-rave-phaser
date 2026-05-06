# Pulse Garden Next-Slot Buff

## Task Intent

This task implements the MVP pawn-to-pawn buff system and uses it to complete `Pulse Garden`. The buff increases damage for the next slot on the circular record and is consumed on that slot’s next activation.

This slice exists because the overhaul explicitly includes inter-pawn synergy as part of making the roster feel like a real build system rather than isolated turrets. The player-facing result is that `Pulse Garden` still deals zone damage, but also grants a clearly telegraphed pending damage bonus to the next slot if occupied.

This task should not broaden into a generalized buff framework beyond the one authored MVP buff type.

## Relevant Context

- MVP has exactly one pawn-buff type: next-slot damage buff.
- The source pawn always targets the next slot on the circular record, with slot `7` wrapping to slot `0`.
- If the next slot is empty, the buff is wasted.
- A slot can hold at most one pending buff.
- Stronger buffs replace older ones; equal or weaker buffs do not stack.
- The buff affects only damage, not note behavior, projectile count, radius, duration, or beam count.
- The buff expires on the next activation of that slot, even if no enemies exist, or on wave end cleanup.
- `Pulse Garden` is a green finisher zone pawn with blue output note and this buff rider.

## In Scope

- Add authoritative pawn-buff runtime state.
- Implement next-slot damage buff storage, replacement, and consumption rules.
- Make `Pulse Garden` apply the buff while using the zone family for its primary effect.
- Add buff-applied and buff-consumed feedback hooks.

## Out of Scope

- Additional buff types.
- Real-time duration-based buff timers.
- Changes to projectile count, radius, or other non-damage stats.

## Detailed Requirements

- Extend combat runtime with a pawn-buff state keyed by slot or otherwise authoritatively tied to exact target slots.
- On `Pulse Garden` activation:
  - resolve the placed zone primary effect
  - compute the next slot index with circular wraparound
  - apply the authored pending damage buff to that exact slot if occupied
- Buff storage rules:
  - one pending buff per slot
  - stronger replaces weaker
  - equal/weaker does not stack
- Activation rules:
  - the buff is read at activation start for the exact slot
  - it snapshots into that activation’s output
  - it is consumed immediately after that slot’s activation resolves, even if no combat effect was created because no enemies existed
- Clear all pending buffs on wave end.

## Acceptance Criteria

- [ ] `Pulse Garden` grants a pending damage buff to the next occupied slot on the record with correct wraparound semantics.
- [ ] Only one pending buff can exist per slot, with stronger-replaces and no-stacking behavior.
- [ ] The buff snapshots into the target slot’s next activation and is consumed afterward even if that activation had no valid enemy targets.

## Technical Notes

- The design spec recommends a dedicated `CombatPawnBuffs.ts` or similar helper module.
- Keep buff state separate from note packet state and separate from slot content definitions.
- The source snapshot rules mean this buff must be captured once at activation start and then applied to all output from that activation.

## Implementation Plan

1. Add pawn-buff runtime types keyed by exact slot target.
2. Add helpers for applying, replacing, reading, consuming, and wave-end clearing buffs.
3. Refactor activation flow so source snapshots read pending next-slot buff at activation start.
4. Implement `Pulse Garden` secondary effect to target the next slot after creating its zone.
5. Emit feedback events for buff application/consumption and validate empty-next-slot behavior.
6. Confirm that buffed activations carry the snapshot across full activation output, including persistent effects where relevant.

## Additional Notes

- UX note: the spec calls for a green upward-arrow buff marker on the next-slot pawn; this task should at least create the semantic/runtime hook needed for that later or current presentation.

## Blocked By

- Blocked by 07-task-moss-patch-zone

## Type

AFK

## Design Spec Reference

- [Next-Slot Pawn Buff Rules](../design-spec.md#next-slot-pawn-buff-rules)
- [Source Snapshot Rules](../design-spec.md#source-snapshot-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
