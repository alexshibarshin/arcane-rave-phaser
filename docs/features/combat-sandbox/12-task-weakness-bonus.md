# Weakness Bonus

## Task Intent

Add the elemental weakness triangle as a narrow combat-rule slice on top of the already working generator and finisher resolution flows. The runtime must recognize `red > green`, `green > blue`, and `blue > red`, and apply a `1.5x` damage multiplier only when the attacking pawn color has advantage over the target enemy color.

This slice exists so elemental matchups can be validated independently from packet generation and consumption. It should remain a small, well-isolated rules layer. Do not broaden it into resistances, penalties for disadvantaged colors, status effects, or extra elemental systems.

## Relevant Context

- The first combat sandbox already standardizes on three colors across pawns, notes, attacks, and enemies: `red`, `green`, `blue`.
- Weakness is the only color-combat modifier in this feature:
  - `red > green`
  - `green > blue`
  - `blue > red`
- Advantage gives `x1.5` damage.
- Neutral and disadvantaged pairings apply no penalty and no resistance.
- Damage order matters:
  - generator damage is just `baseDamage`, then weakness if applicable;
  - finisher damage is `baseDamage * consumedNotesMultiplier`, then weakness if applicable.
- Enemy color must come from content/runtime data, not from whatever render tint happens to be visible.

## In Scope

- Shared weakness rule and helper/resolver.
- Applying weakness to both generator and finisher attacks.
- Diagnostics or events that can communicate whether advantage fired.
- Focused automated checks for the three advantageous matchups and neutral/non-advantage behavior.

## Out of Scope

- Resist systems.
- Negative multipliers or penalties for disadvantage.
- Extra colors beyond `red`, `green`, `blue`.
- Reworking packet logic or target selection.
- VFX polish for weakness hits beyond semantic hooks.

## Detailed Requirements

- Implement one shared weakness source of truth rather than two separate branches for generator and finisher.
- Represent the advantage rule explicitly enough that future agents can extend or inspect it without reverse engineering nested conditionals.
- Apply weakness after the normal base attack calculation:
  - generator: `baseDamage`, then possible weakness;
  - finisher: `baseDamage * consumedMultiplier`, then possible weakness.
- Use attacker pawn color and target enemy color from runtime/content state.
- Preserve all non-advantage cases as neutral:
  - matching colors;
  - disadvantageous colors;
  - any future non-triangle edge case if introduced accidentally.
- Make weakness activation observable through events, return payloads, or diagnostics so later VFX work can distinguish a normal hit from an advantaged hit.
- Keep the weakness rule independent of rendering, scene ownership, and packet visuals.

## Acceptance Criteria

- [ ] The combat runtime or combat resolver contains one shared weakness rule used by both generator and finisher attacks.
- [ ] Advantageous color matchups apply a `1.5x` damage multiplier after the base generator or finisher damage calculation.
- [ ] Neutral and disadvantaged matchups apply no penalty, and the system introduces no resist behavior.
- [ ] Enemy color is read from runtime/content data rather than inferred from visual tint or asset choice.
- [ ] Focused tests or equivalent checks cover all three advantageous relationships plus at least one neutral or non-advantage scenario.

## Technical Notes

- Prefer a small pure helper or combat-rules module for weakness lookup. That keeps the rule easy to test and reduces coupling with scene objects.
- If combat resolution already returns a structured attack result, include a flag such as `wasWeaknessHit` instead of forcing later systems to recompute matchup logic.
- Be careful not to double-apply weakness if attack resolution becomes layered over multiple helper calls.
- If current tests are sparse, add targeted combat-rule tests rather than broad integration-only coverage.
- Keep naming aligned with the design spec: "weakness" or "advantage" is clearer than generic "bonus color damage".

## Implementation Plan

1. Add a shared weakness helper or combat-rules module for the `red/green/blue` advantage triangle.
2. Thread attacker color and target enemy color into the common damage resolution path for both generator and finisher attacks.
3. Apply the multiplier only after the generator or finisher base calculation has been completed.
4. Expose whether the weakness rule fired through events, diagnostics, or structured combat-resolution data.
5. Add focused validation for:
   - `red -> green`;
   - `green -> blue`;
   - `blue -> red`;
   - at least one neutral or disadvantage case.
6. Confirm that no other combat subsystem needs to know the triangle directly unless it is consuming the shared helper.

## Additional Notes

- This task is intentionally small. If implementation pressure starts pulling in new effects or color-specific UI, stop and leave those to later slices.
- The weakness rule is part of combat readability as much as balance, so make the semantics clean even before VFX emphasis exists.

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
- [Edge Cases & Error States](./design-spec.md#edge-cases--error-states)
- [Validation & Testing](./design-spec.md#validation--testing)
