# Visual Tuning Review

## Task Intent

Run the first human-in-the-loop visual review for the playable combat sandbox and lock the most important readability decisions. This task is where the team validates whether the implemented scene actually feels coherent in motion on the portrait combat screen and makes explicit keep-or-adjust decisions on the open visual questions left by the design spec.

The main outcome is not a new rendering architecture. It is a narrow tuning pass plus documented review decisions. Specifically, the task should confirm whether the `graphic neon schematic` direction is landing, whether arc-shaped rule text remains worth keeping, and whether the hybrid record rendering rule is visually intentional: rule-zone graphics and pedestals rotate with the record, while pawn constructs and tier stars stay upright and readable.

## Relevant Context

- The combat sandbox is meant to answer whether the visual language is readable on a `9:16` combat screen while the record is continuously rotating and enemies apply pressure from above.
- The design spec deliberately leaves some presentation questions open for real-world evaluation:
  - whether rule text should stay on an arc or fall back to a straight layout;
  - whether the hybrid rotating/upright slot composition reads as intentional rather than broken;
  - whether the first primitive-based neon schematic pass is expressive enough.
- Readability priorities outrank ornament:
  - sectors must stay legible;
  - generators and finishers should be distinguishable;
  - note packet state changes should be readable during real combat pacing;
  - enemies, beams, and flashes should not muddy the scene.
- This task is HITL because the spec explicitly calls for human approval on some visual tradeoffs.

## In Scope

- Live visual review of the implemented combat sandbox in motion.
- Explicit keep/adjust/fallback decisions on:
  - arc text versus straight rule text;
  - upright versus rotating slot-element split;
  - overall readability of record, pawns, notes, enemies, and VFX.
- Narrow implementation adjustments to layout values, glow strengths, text placement, transforms, silhouettes, or related presentation details.
- Documentation of review outcomes so future agents do not reopen the same visual question blindly.

## Out of Scope

- New combat mechanics or state-machine changes unless a visual bug is impossible to fix otherwise.
- A large art overhaul or replacement of the primitive-based rendering direction.
- Audio implementation.
- New architecture for UI/HUD ownership.
- Endless polish passes; this task is a first review and targeted tune, not a final art lock.

## Detailed Requirements

- Review the scene in motion, not only in static screenshots, because slot rotation, note timing, enemy movement, and VFX overlap are core to the readability question.
- Evaluate whether the record remains the dominant compositional anchor without swallowing the rest of the combat information.
- Confirm that empty slots, generators, and finishers remain distinguishable under actual combat pacing.
- Check whether note packet color and count changes remain legible above the capybara/base block during repeated activations.
- Verify the hybrid transform rule:
  - rule text, rule graphics, and pedestals rotate with the record;
  - pawn constructs and tier stars stay upright;
  - the result should feel deliberate rather than jittery or physically contradictory.
- Make an explicit decision on arc text:
  - keep it if readable and implementation cost is acceptable;
  - use the straight fallback if arc text is visually weak, too brittle, or too expensive to maintain.
- Limit code changes to targeted tuning unless the review uncovers a concrete visual bug that cannot be solved without a small structural adjustment.
- Capture residual visual follow-ups separately if they exceed the narrow scope of this review.

## Acceptance Criteria

- [ ] A human review confirms whether the current record, pawn, note, enemy, and VFX presentation is readable on the portrait combat screen during real motion.
- [ ] The team makes an explicit keep-or-fallback decision on arc-shaped rule text versus a simpler straight layout.
- [ ] The final tuning pass preserves the intended hybrid behavior: rule-zone graphics and pedestals rotate with the record, while pawn constructs and tier stars stay upright and readable.
- [ ] Any changes made in response to the review remain targeted to presentation, layout, or transform tuning rather than reopening unrelated combat logic.
- [ ] The review outcome is documented in the task artifact or adjacent notes so future agents know which visual decisions were approved.

## Technical Notes

- Because this is HITL, the implementation agent should prepare the scene for review and, if possible, make it easy to replay the relevant combat moments repeatedly.
- Prefer config-driven tuning where possible:
  - layout coordinates;
  - glow intensity;
  - text offsets;
  - silhouette scale;
  - spacing around packet notes.
- If upright-versus-rotating behavior needs adjustment, prefer container or transform cleanup over rewriting the entire slot render model.
- Avoid coupling review-driven tweaks back into combat rules unless a presentation bug truly originates from incorrect runtime data.
- Be especially mindful of portrait-screen clutter. Stronger effects are not automatically better if they erase slot readability.

## Implementation Plan

1. Run the live combat scene and inspect it in motion through the most important gameplay states:
   - early preview/start;
   - repeated slot activations;
   - packet color changes;
   - enemy pressure;
   - victory or defeat.
2. Review readability of the main visual actors:
   - record and slots;
   - generators versus finishers;
   - note packet and note flights;
   - enemies and hit feedback;
   - overlay/result emphasis.
3. Make an explicit decision on arc rule text versus straight fallback and document that decision.
4. Inspect the hybrid transform model and tune container structure, rotation behavior, or offsets if any element looks unintentionally unstable.
5. Apply only targeted presentation changes, preferring config and transform tuning over architectural churn.
6. Record any remaining visual follow-ups separately if they fall outside this task's narrow tuning scope.

## Additional Notes

- This task is successful when the team has more confidence in what to keep, not when every last pixel is polished.
- If a visual question cannot be settled without broader art or UX exploration, document it clearly instead of smuggling a large redesign into this review pass.

## Blocked By

- Blocked by `06-task-pawn-visual-primitives`
- Blocked by `09-task-note-packet-view`
- Blocked by `11-task-finisher-resolution`
- Blocked by `14-task-combat-vfx-system`
- Blocked by `15-task-pause-restart-hardening`

## Type

HITL

## Design Spec Reference

- [Definition of Done](./design-spec.md#definition-of-done)
- [What Stays Upright](./design-spec.md#what-stays-upright)
- [Screen Composition](./design-spec.md#screen-composition)
- [Overall Style](./design-spec.md#overall-style)
- [Record and Slots](./design-spec.md#record-and-slots)
- [Pawn Visual Identity](./design-spec.md#pawn-visual-identity)
- [Enemies](./design-spec.md#enemies)
- [Open Questions](./design-spec.md#open-questions)
