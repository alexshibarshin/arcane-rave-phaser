# Finisher Resolution

## Task Intent

Implement `finisher` slot resolution on top of the working slot crossing, targeting, enemy runtime, and shared `note packet` systems. When a finisher crosses the `needle`, it must optionally consume matching notes from the current packet, scale its damage using the global consumed-note multiplier table, attack even when no matching notes exist, and then emit exactly one new output note of its configured `outputNoteColor`.

This slice exists to complete the intended note loop of `generator -> finisher -> new packet seed`. It is the first task that makes packet composition matter strategically instead of only cosmetically. Keep the work focused on finisher behavior itself and leave elemental weakness and richer VFX treatment to later tasks.

## Relevant Context

- The combat sandbox uses a single shared `note packet` above the base as a transportable resource with one active color and capacity `5`.
- Finishers do not use a separate `consumedColor`; they always consume notes of their own color.
- If packet color matches finisher color:
  - finisher consumes all notes in the packet;
  - damage uses the global multiplier table for `0..5` consumed notes;
  - after the attack, the finisher emits one new output note.
- If packet color does not match:
  - the old packet breaks;
  - the finisher still attacks;
  - consumed-note count is `0`, so the `0 => 0.75` multiplier applies;
  - after the attack, the finisher still emits one output note.
- `outputNoteColor` must come from pawn content data and must always differ from the finisher's own color.
- The design spec treats packet transition and attack sequencing as explicit gameplay communication, so resolution should be centralized and legible in code.

## In Scope

- Dedicated finisher activation path.
- Consumed-note counting and multiplier lookup.
- Finisher packet consume/break/output transitions via the shared packet API.
- Validation of finisher content assumptions, especially invalid output color.
- Semantic events or diagnostics required for later VFX and debugging.

## Out of Scope

- Elemental weakness multiplier logic.
- Redesigning generator behavior.
- Rich packet-flight or discharge VFX beyond event hooks or narrow placeholders.
- Content rebalance of the multiplier table or output-color mappings.
- New UI beyond keeping the packet state coherent for existing packet view code.

## Detailed Requirements

- Implement a dedicated finisher resolution path rather than piggybacking on generator logic with many special cases.
- Resolve the target using the same nearest-living-enemy rule as other pawns, so finisher behavior remains consistent with feature-wide targeting.
- Determine consumed-note count from the current shared packet:
  - if packet color matches finisher color, consume the full current packet count;
  - if packet color differs or packet is empty/null, consumed count is `0`.
- Use the global multiplier table from balance config:
  - `0 => 0.75`
  - `1 => 1.0`
  - `2 => 1.15`
  - `3 => 1.4`
  - `4 => 1.75`
  - `5 => 2.25`
- Apply finisher damage as `baseDamage * finisherConsumedNotesMultiplier[consumedNotes]` before any future weakness bonus.
- Foreign-color packet input must explicitly break the old packet state rather than silently overwrite it.
- After every finisher activation, produce exactly one output note of configured `outputNoteColor`.
- Resulting packet state after finisher resolution must be explicit and consistent:
  - matching packet: consumed packet disappears, then a new one-note packet of `outputNoteColor` remains;
  - foreign-color or empty packet: broken/empty packet still ends as a new one-note packet of `outputNoteColor`.
- Validate invalid content early. `outputNoteColor == finisher.color` should fail loudly through runtime guardrails, config validation, or a strong diagnostic path.
- No activation path may skip the attack merely because the packet is empty or mismatched.
- If no enemy target exists, finisher activation must still consume or break the packet as normal and still emit its single output note; only the damage lands on empty space.

## Acceptance Criteria

- [ ] A finisher consumes all notes of its own color when the current packet matches, applies the correct multiplier for `0..5` consumed notes, and leaves behind exactly one output note of the configured output color.
- [ ] A foreign-color packet still breaks, the finisher still attacks using the `0 consumed` multiplier path, and the system does not skip activation.
- [ ] Finishers always emit exactly one output note of their configured `outputNoteColor`, and invalid `outputNoteColor == finisher.color` states are rejected or loudly validated.
- [ ] The finisher multiplier table comes from shared balance config rather than duplicated hardcoded values inside activation code.
- [ ] Finisher packet transitions are centralized in a shared packet API or resolver rather than fragmented across scene and render code.

## Technical Notes

- Keep the attack formula layered:
  - finisher base damage;
  - consumed-note multiplier;
  - future weakness multiplier in the next task.
- The packet system should remain a single source of truth. Do not allow the render layer to infer packet state separately from runtime mutation.
- Prefer a reusable combat resolver interface where slot activation delegates to generator or finisher handlers based on pawn type.
- Validate multiplier lookup indices and packet counts defensively; corrupted counts should not cause out-of-range reads.
- If no target exists, keep the activation safe and deterministic. Packet transition still occurs normally; only the damage has no recipient.
- Emit semantic events for:
  - finisher consumed notes;
  - packet break;
  - output note emitted;
  - attack resolved;
  - possible invalid finisher config.

## Implementation Plan

1. Extract or add a dedicated finisher resolver that plugs into the same slot-activation entry point used by generators.
2. Read finisher config from content/balance data, including `baseDamage`, `color`, `outputNoteColor`, and the shared multiplier table.
3. Inspect current packet state and compute `consumedNotes` according to same-color versus foreign-color rules.
4. Apply the appropriate finisher multiplier and resolve attack damage against the selected target without mixing in weakness logic yet.
5. Update packet state centrally:
   - remove or break the old packet as required;
   - emit semantic packet-transition events;
   - create the new one-note output packet of `outputNoteColor`.
6. Add validation or guardrails for invalid finisher content, especially output-color loops that violate the spec.
7. Verify behavior with focused checks for:
   - empty packet;
   - foreign-color packet;
   - same-color packets at counts `1..5`;
   - invalid finisher output color.

## Additional Notes

- This task is where the slot order starts affecting damage in a meaningful, legible way. The documentation and diagnostics should make that relationship obvious for future balancing work.
- Keep terminology consistent with the design spec: "consume", "break", and "output note" should map cleanly to runtime behavior and later VFX hooks.

## Blocked By

- Blocked by `09-task-note-packet-view`
- Blocked by `10-task-generator-resolution`

## Type

AFK

## Design Spec Reference

- [Finisher Rules](./design-spec.md#finisher-rules)
- [Finisher Damage Multipliers](./design-spec.md#finisher-damage-multipliers)
- [Activation Sequence](./design-spec.md#activation-sequence)
- [Color Break Sequence](./design-spec.md#color-break-sequence)
- [Pawn Definitions](./design-spec.md#pawn-definitions)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
