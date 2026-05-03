# Generator Resolution

## What to Build

Implement the first real pawn combat behavior through generator slots. When a generator crosses the needle, it should pick the nearest enemy, deal its base damage, and then mutate the note packet according to the same-color or foreign-color rules.

This slice exists to create the first complete vertical combat action from slot crossing to target selection to packet mutation. Keep it scoped to generators only; finishers, weakness bonuses, and richer VFX come later.

## Acceptance Criteria

- [ ] A generator slot activation selects the nearest living enemy by world distance and safely does nothing harmful if no enemy exists.
- [ ] Same-color packet input adds two notes up to the packet cap without changing the packet color.
- [ ] Foreign-color packet input breaks the old packet, replaces it with a new two-note packet of the generator color, and emits enough semantic signals for future VFX and diagnostics.

## Implementation Plan

- Extend slot runtime or pawn activation code so occupied generator slots resolve through a dedicated generator path rather than generic switchless logic.
- Reuse the enemy runtime collection to choose the nearest valid target by Euclidean distance from the pawn world position.
- Apply base damage to the chosen enemy and update enemy death flags or HP as needed, even if death cleanup remains simple for now.
- Mutate the note packet only through the central packet API added in the previous task. Clamp overflow and log unexpected invalid states.
- Emit semantic feedback events such as packet changed, color break, enemy hit, or slot activated so future VFX and HUD hooks do not need to inspect domain internals.
- Do not implement finisher ingestion or weakness math here.

## Blocked By

- Blocked by `04-task-record-crossings-empty-slots`
- Blocked by `08-task-enemy-pressure-loop`
- Blocked by `09-task-note-packet-view`

## Type

AFK

## Design Spec Reference

- [Generator Rules](./design-spec.md#generator-rules)
- [Pawn Targeting](./design-spec.md#pawn-targeting)
- [Activation Sequence](./design-spec.md#activation-sequence)
- [Color Break Sequence](./design-spec.md#color-break-sequence)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
