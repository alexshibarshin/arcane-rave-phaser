# Bass Bomb Burst

## Task Intent

This task adds the first explosion-based combat slice by making `Bass Bomb` resolve as an immediate targeted burst with area damage around the selected impact point. It establishes the non-persistent explosion path without introducing delayed-state complexity yet.

This slice exists so the overhaul can demonstrate a second archetype with minimal surface area after projectiles are proven out. The player-facing result is that `Bass Bomb` now hits all enemies in radius around a chosen target point, clearly reading as AoE rather than single-target damage.

This task should stay focused on immediate targeted bursts and not include delayed explosions or lingering zones.

## Relevant Context

- Explosion target selection chooses an enemy at cast time and stores that enemy position at cast time as the impact point.
- `Targeted burst` resolves immediately as a burst impact event.
- Explosions damage all enemies in radius.
- Explosion abilities may target the frontmost enemy or a random enemy depending on authored data.
- If no alive enemy exists at activation time, the effect is not created but note-rule behavior still resolves.
- `Bass Bomb` is a red generator with the `explosion` archetype and no secondary effect.

## In Scope

- Implement immediate targeted burst resolution for explosion abilities.
- Make `Bass Bomb` use that path end-to-end.
- Add semantic event hooks or presentation contracts needed for one-shot explosion feedback.

## Out of Scope

- Delayed explosions and pending explosion runtime state.
- Linger burn zones.
- Beam, zone, status, projectile enhancements, or pawn buffs.

## Detailed Requirements

- Add a reusable explosion resolution path for immediate targeted bursts.
- At activation:
  - pick the authored target according to content
  - capture the world impact point from the target’s current position
  - resolve AoE damage against all enemies in radius at that point
- Damage must route through the shared combat damage pipeline so later modifiers can compose cleanly.
- The system should support frontmost or random target rules as content data, even if `Bass Bomb` uses only one of them.
- Emit a semantic one-shot event or equivalent presentation signal for the burst impact.
- Ensure note-rule mutation still happens even if the burst is skipped because there were no valid enemies.

## Acceptance Criteria

- [ ] `Bass Bomb` resolves as an immediate AoE burst at a cast-time enemy point and damages all enemies in radius.
- [ ] Explosion impact is represented through the shared combat damage path and supports later presentation hooks.
- [ ] No persistent delayed-explosion state is introduced in this slice.

## Technical Notes

- This can live in a dedicated helper such as `CombatExplosions.ts` even if the first version only handles immediate bursts.
- Keep the concept of an impact point separate from the chosen target entity so delayed-blast work later can reuse the same targeting snapshot shape.
- Avoid writing explosion math directly into pawn-specific branches.

## Implementation Plan

1. Inspect how immediate damage currently resolves in combat activation.
2. Extract or add a helper for explosion impact resolution at a world point.
3. Refactor `Bass Bomb` activation to use content-driven explosion targeting and radius values.
4. Route resulting hits through shared damage application and event emission.
5. Validate zero-target behavior and multi-enemy radius hits.

## Additional Notes

- Visual note: this slice only needs enough event/presentation support to show a readable burst; persistent telegraphs belong to delayed explosions later.

## Blocked By

- Blocked by 01-task-pawn-content-foundation
- Blocked by 02-task-pawn-atlas-integration

## Type

AFK

## Design Spec Reference

- [Explosion Rules](../design-spec.md#explosion-rules)
- [Required Pawn Content](../design-spec.md#required-pawn-content)
- [Presentation Changes](../design-spec.md#presentation-changes)
