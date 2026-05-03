# Weakness Bonus

## What to Build

Add the elemental weakness triangle as a thin follow-up slice on top of working generator and finisher hits. The system should recognize `red > green`, `green > blue`, and `blue > red`, and apply a `1.5x` damage multiplier only on advantageous matchups.

This slice exists as a deliberately small combat rule layer so weakness math can be verified independently from note mechanics. Do not broaden it into resistances, status effects, or extra color systems.

## Acceptance Criteria

- [ ] The combat runtime or combat resolver contains one shared weakness rule used by both generator and finisher attacks.
- [ ] Advantageous color matchups apply a `1.5x` damage multiplier after the base generator or finisher damage calculation.
- [ ] Neutral and disadvantaged matchups apply no penalty, and the system introduces no resist behavior.

## Implementation Plan

- Add a shared combat helper or resolver for elemental advantage so generators and finishers use the same source of truth.
- Apply weakness after base damage and after the finisher consumed-note multiplier, matching the design spec formula.
- Ensure enemy color comes from runtime/content data rather than inferred from visuals.
- Add or update targeted tests for all three advantageous relationships plus at least one neutral or non-advantage check.
- Keep event payloads or diagnostics expressive enough that later VFX and debug logs can tell whether a weakness hit occurred.
- Avoid coupling this logic to rendering concerns.

## Blocked By

- Blocked by `07-task-enemy-archetype-render`
- Blocked by `10-task-generator-resolution`
- Blocked by `11-task-finisher-resolution`

## Type

AFK

## Design Spec Reference

- [Color System and Weakness](./design-spec.md#color-system-and-weakness)
- [Finisher Damage Multipliers](./design-spec.md#finisher-damage-multipliers)
- [Enemy Definitions](./design-spec.md#enemy-definitions)
- [Validation & Testing](./design-spec.md#validation--testing)
