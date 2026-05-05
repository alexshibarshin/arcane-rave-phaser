# Generator Resolution

## Task Intent

Implement the first real pawn combat resolution slice for `generator` slots. When a generator sector crosses the fixed `needle`, the combat runtime must trigger slot feedback, select the nearest living enemy by world distance, apply the generator's base damage, and then mutate the shared `note packet` according to the same-color and foreign-color rules.

This slice exists to deliver the first end-to-end combat interaction that is more than pure presentation: rotation crossing leads to target resolution, damage, packet mutation, and semantic combat events. The task should stay tightly scoped to generator behavior only. Do not pull in finisher consumption, elemental weakness, or full VFX polish here.

## Relevant Context

- `Combat Sandbox` validates the core fantasy that a rotating record under a fixed `needle` produces readable, deterministic combat actions.
- The runtime already assumes a single shared `note packet` with one color at a time and a hard capacity of `5` notes.
- Generator rules are intentionally simple:
  - generator always deals its `baseDamage`;
  - same-color input adds `2` notes up to the packet cap without changing packet color;
  - foreign-color input breaks the old packet and replaces it with a new `2`-note packet of the generator color.
- All pawn activations in this feature use the same targeting rule: choose the nearest living enemy by Euclidean world distance, with no range limit.
- Slot activations must remain compatible with robust crossing processing. If multiple slots cross in one frame, generator resolution must be deterministic and safe to run several times in sequence.
- The feature explicitly requires meaningful semantic events so later HUD, VFX, and diagnostics can react without peeking into internals.

## In Scope

- Generator-only pawn activation resolution.
- Nearest-enemy target selection using the existing enemy runtime collection.
- Base damage application for generator attacks.
- Shared note-packet mutation for same-color add and foreign-color break/replace flows.
- Semantic combat events and diagnostics needed by later VFX or debugging work.

## Out of Scope

- Finisher consume-and-output behavior.
- Elemental weakness multiplier logic.
- Rich beam, packet-break, or note-flight presentation beyond lightweight hooks/events.
- Reworking slot crossing detection itself.
- Rebalancing generator damage, packet cap, or color-system rules from the design spec.

## Detailed Requirements

- Route occupied generator slots through a dedicated generator resolution path instead of relying on ad hoc inline checks in scene code.
- Resolve the target from currently living enemies only. Dead, despawning, or already-invalid runtime entries must not be selected.
- If no enemy is available, the generator activation must still complete safely:
  - slot activation feedback/eventing still happens;
  - no exception is thrown;
  - generator packet rules still resolve normally, because packet mutation is tied to slot activation rather than to target existence;
  - the attack simply resolves into empty space.
- Same-color packet input:
  - preserve packet color;
  - add exactly `2` notes;
  - clamp to packet cap `5`;
  - never produce an invalid `count > 5`.
- Foreign-color packet input:
  - emit a semantic "color break" style signal;
  - discard the old packet state cleanly;
  - create a new packet with generator color and count `2`.
- Empty or null packet input should behave like creating a new generator-colored packet of `2`.
- Packet mutation should happen through one shared packet API or helper so later finisher logic can reuse the same source of truth.
- Combat events should be semantic enough for later systems. Examples include:
  - slot activated;
  - pawn resolved;
  - enemy hit;
  - enemy killed;
  - packet changed;
  - packet color broke.

## Acceptance Criteria

- [ ] A generator slot activation selects the nearest living enemy by world distance and safely does nothing harmful if no enemy exists.
- [ ] Same-color packet input adds two notes up to the packet cap without changing the packet color.
- [ ] Foreign-color packet input breaks the old packet, replaces it with a new two-note packet of the generator color, and emits enough semantic signals for future VFX and diagnostics.
- [ ] Empty or null packet input creates a valid two-note packet of the generator color without special-case scene errors.
- [ ] Generator resolution does not duplicate packet logic across multiple scene or render layers.

## Technical Notes

- Keep `CombatRuntime` as the mutable source of truth. Do not scatter packet state, enemy HP, or activation bookkeeping across unrelated scene fields.
- Prefer a combat resolver or pawn-resolution helper over embedding generator behavior directly into `CombatScene.update()`.
- Target selection should use runtime world positions already assigned to slots and enemies. Do not infer targeting from render depth or screen-space approximations if runtime coordinates already exist.
- If damage application can mark enemies dead, preserve compatibility with the existing cleanup phase instead of deleting render objects mid-resolution.
- Emit typed `EventBus` messages or an equivalent internal semantic event layer so the later `CombatVfxSystem` can subscribe to meaning, not to low-level state diffs.
- Guard packet overflow and suspicious invalid states with lightweight diagnostics such as `console.warn`, matching the design spec's debugging guidance.

## Implementation Plan

1. Identify the existing slot-activation entry point and carve out a dedicated generator resolution function or resolver module.
2. Read generator content data from combat content config rather than hardcoding color, damage, or packet behavior inline.
3. Implement nearest-enemy lookup against the current live enemy runtime list using Euclidean distance from pawn world position to enemy world position.
4. Apply generator base damage to the chosen target and update runtime death flags or HP in a way that remains compatible with later cleanup.
5. Route all packet changes through a shared packet helper:
   - handle null packet;
   - handle same-color add with cap clamp;
   - handle foreign-color break and replacement;
   - emit semantic packet events.
6. Add semantic combat events and diagnostics for generator activation, hit resolution, packet change, and color break.
7. Validate behavior with focused checks for:
   - no target present;
   - same-color packet at counts `0..5`;
   - foreign-color replacement;
   - overflow prevention at packet cap.

## Additional Notes

- Player readability matters even before the dedicated VFX task. If minimal temporary feedback is needed, keep it narrow and event-driven rather than building bespoke visuals here.
- This task is the first place where the record loop becomes meaningfully testable as combat, so clear logs around packet transitions and target choice will pay off during debugging.

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
- [Robust Slot Crossing Processing](./design-spec.md#robust-slot-crossing-processing)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
