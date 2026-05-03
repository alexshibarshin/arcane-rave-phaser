# Record Crossings and Empty Slots

## What to Build

Make the record actually rotate and process slot activations correctly, including lag-safe multi-crossing frames. This slice exists to prove the core fantasy of the combat surface before pawn logic is added: the vinyl rotates continuously under a fixed needle, and slots activate in the correct order even when a single frame crosses multiple sectors.

At this stage, activated slots only need empty-slot style feedback and runtime bookkeeping. Do not implement note packet mutation, pawn damage logic, or beam VFX beyond minimal trigger feedback.

## Acceptance Criteria

- [ ] The record rotates counterclockwise using config-driven speed and starting angle values stored in runtime state.
- [ ] Slot activation is based on crossing each sector center line under the fixed needle, using `previousRecordAngle` and `currentRecordAngle` so no crossings are lost on large `delta`.
- [ ] Empty slots still produce visible activation feedback without trying to attack or mutate the note packet.

## Implementation Plan

- Add record angle fields and update them during the simulation phase only while combat is in `running`.
- Represent the 8 slots in runtime with stable slot indices and enough geometry metadata to evaluate crossings and later spawn visuals.
- Implement robust crossing processing that collects every crossed slot between two angles and resolves them in the correct temporal order.
- Trigger a lightweight activation feedback path for all slots, including empty ones, and emit a semantic `slot activated` event for later VFX integration.
- Keep slot processing deterministic and stateless enough that future `FastForward` can build on it.
- Avoid real pawn behavior here. If a slot has content, it may log or mark that it would have activated, but it should not yet resolve damage or notes.

## Blocked By

- Blocked by `02-task-static-combat-layout`
- Blocked by `03-task-state-machine-hud-bridge`

## Type

AFK

## Design Spec Reference

- [Record, Needle, Rotation](./design-spec.md#record-needle-rotation)
- [Slot Activation Feedback](./design-spec.md#slot-activation-feedback)
- [Robust Slot Crossing Processing](./design-spec.md#robust-slot-crossing-processing)
- [Activation Sequence](./design-spec.md#activation-sequence)
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
