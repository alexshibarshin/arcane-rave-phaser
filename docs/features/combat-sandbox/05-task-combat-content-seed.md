# Combat Content Seed

## What to Build

Create the first combat content dataset that later systems can consume without hardcoded scene logic. This includes the six starting pawn definitions, three enemy color variants, one eight-slot preset, base placeholder numbers, and a baseline one-wave setup with one or more sub-waves.

This slice exists because the feature should stay config-driven and tunable. It should not add new runtime behavior by itself; the goal is to give later tasks stable content sources and validation hooks.

## Acceptance Criteria

- [ ] Combat content config contains all six starting pawn definitions and enforces the required fields for generators and finishers, including `outputNoteColor` for finishers.
- [ ] Enemy content config contains one archetype expressed as three color variants with the placeholder stat block from the design spec.
- [ ] Wave content config contains a valid first-wave preset and slot preset so later systems can spawn combat without scene-local hardcoded content arrays.

## Implementation Plan

- Create typed config/data modules for pawn definitions, enemy definitions, slot preset data, base placeholder values, and the initial wave/sub-wave content.
- Encode the generator and finisher mapping exactly as the design spec describes, especially the `outputNoteColor` rotation for finishers.
- Keep content schema explicit and narrow so later tasks can validate it early rather than discover malformed data during simulation.
- Add lightweight runtime validation or dev-time assertions for impossible content states such as missing colors or invalid finisher output color.
- Do not render or simulate the content here beyond the minimum needed for bootstrap wiring.
- Avoid baking numbers directly into `CombatScene`; all placeholder combat content should flow from config.

## Blocked By

- Blocked by `01-task-combat-foundation`

## Type

AFK

## Design Spec Reference

- [Config Strategy](./design-spec.md#config-strategy)
- [Pawn Definition Data](./design-spec.md#pawn-definition-data)
- [Enemy Definition Data](./design-spec.md#enemy-definition-data)
- [Wave Data](./design-spec.md#wave-data)
- [Sub-wave Data](./design-spec.md#sub-wave-data)
- [Pawn Definitions](./design-spec.md#pawn-definitions)
- [Enemy Definitions](./design-spec.md#enemy-definitions)
