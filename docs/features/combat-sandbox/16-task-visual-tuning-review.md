# Visual Tuning Review

## What to Build

Run the first human-in-the-loop visual pass on the combat sandbox and lock the most important readability decisions. This includes validating the `graphic neon schematic` direction, deciding whether rule text should stay on an arc or fall back to a straight layout, and tuning the hybrid record render so rotating and upright elements feel intentional instead of accidental.

This slice exists because the design spec explicitly leaves some visual questions open, and the right answer depends on how the scene actually feels in motion. It should result in small implementation adjustments and explicit approvals, not a brand-new rendering architecture.

## Acceptance Criteria

- [ ] A human review confirms whether the current record, pawn, note, enemy, and VFX presentation is readable on the portrait combat screen during real motion.
- [ ] The team makes an explicit keep-or-fallback decision on arc-shaped rule text versus a simpler straight layout.
- [ ] The final tuning pass preserves the intended hybrid behavior: rule-zone graphics and pedestals rotate with the record, while pawn constructs and tier stars stay upright and readable.

## Implementation Plan

- Review the live scene in motion rather than relying only on static screenshots, because record rotation and note/VFX timing are part of the readability problem.
- Inspect whether generators and finishers are visually distinct enough under actual combat pacing and whether note packet color changes remain legible.
- Validate the upright-versus-rotating split and adjust container structure or transforms if it currently looks physically inconsistent or jittery.
- Decide on arc text versus straight fallback based on implementation cost and on-screen clarity, then document or encode the chosen direction.
- Make only targeted tuning changes to layout values, text placement, glow intensity, or silhouettes. Avoid reopening combat logic unless a visual bug depends on it.
- Capture any residual visual follow-ups separately if they exceed a narrow tuning pass.

## Blocked By

- Blocked by `06-task-pawn-visual-primitives`
- Blocked by `09-task-note-packet-view`
- Blocked by `11-task-finisher-resolution`
- Blocked by `14-task-combat-vfx-system`
- Blocked by `15-task-pause-restart-hardening`

## Type

HITL

## Design Spec Reference

- [What Stays Upright](./design-spec.md#what-stays-upright)
- [Record and Slots](./design-spec.md#record-and-slots)
- [Pawn Visual Identity](./design-spec.md#pawn-visual-identity)
- [Overall Style](./design-spec.md#overall-style)
- [Open Questions](./design-spec.md#open-questions)
