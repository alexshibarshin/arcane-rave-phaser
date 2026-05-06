# Pawn Overhaul - Design Spec

## Document Intent

This document is a self-contained implementation handoff for the `Arcane Rave` pawn overhaul. It is written for an implementation agent with zero access to the original discussion. It captures the intended gameplay model, combat runtime changes, content roster, UI/UX behavior, art direction, and technical integration expectations needed to replace the current prototype pawn scaffold with a first production-shaped version.

## Executive Summary

`Arcane Rave` currently has only six primitive pawns, hard-coded `generator` / `finisher` behavior, and a combat runtime that resolves nearly every attack as an immediate single-target hit. That prototype is enough to prove the note packet loop, but it is too flat to support meaningful build variety, future `slot modifier` depth, or a believable roster of combat content.

This feature overhauls the pawn model into two orthogonal axes: a `note rule family` and an `ability`. The note rule controls note packet behavior. The ability controls the actual combat behavior a pawn performs when activated. The first authored roster contains `12` distinct pawns spanning `projectile`, `explosion`, `beam`, and `zone` archetypes, plus a corresponding combat runtime rework to support real projectiles, delayed explosions, zones, beams, simple status effects, and pawn-to-pawn buffs.

Successful implementation should feel like the game has graduated from a generic prototype into a real content-driven combat system. Players should be able to read the shop quickly, inspect a pawn with a compact tooltip, understand what it does without studying a spreadsheet, and see the battlefield clearly communicate shots, beams, delayed blasts, zones, slows, healing, and inter-pawn buffs.

## Problem Statement

The current combat and build prototype has several structural limitations:

- pawn content is too small and too homogeneous;
- `generator` and `finisher` are modeled as entire pawn identities rather than one axis of pawn behavior;
- combat attacks resolve mostly as immediate nearest-target damage, which prevents meaningful differentiation between `projectile`, `explosion`, `beam`, and `zone`;
- the current build UI and visuals do not sell a roster of distinct combat constructs;
- the shop currently draws from all pawn definitions, which does not support a curated first playable slice;
- future `slot modifiers` already expect simple gameplay-facing ability categories such as `projectile`, `aoe/explosion`, and `beam`.

The feature exists to solve all of those at once while deliberately keeping the note packet system simple and preserving mobile readability.

## Goals

- Replace the prototype pawn model with a durable `note rule family + ability` structure.
- Keep `generator` and `finisher` as the first note-rule families, but no longer treat them as the only identity a pawn has.
- Ship a first authored roster of `12` unique pawns with clear names, combat identities, and role coverage.
- Introduce real runtime support for `projectile`, `explosion`, `beam`, and `zone` abilities.
- Support a first set of secondary effects without building an over-generalized effect composer.
- Preserve the current note packet model unchanged.
- Keep combat and build readability strong on a mobile portrait screen.
- Replace placeholder pawn visuals with a single generated sprite atlas of `12` pawn sprites.
- Add compact shop cards and unified long-press tooltips that explain pawns without clutter.
- Keep the first playable slice scoped to a temporary config-driven `8`-pawn combat deck.
- Remain compatible with the already approved `slot modifiers` direction, especially modifiers that care about `output note`, `projectile`, `explosion/AoE`, and `beam`.

## Non-Goals

- This feature does not redesign the `note packet` model.
- This feature does not add new note-rule families beyond `generator` and `finisher`.
- This feature does not add a full collection screen or deck-building feature.
- This feature does not redesign the enemy roster, stage progression, or wave structure.
- This feature does not add more enemy status types beyond `slow`.
- This feature does not add a universal targeting framework with dozens of target rules.
- This feature does not implement the `slot modifier` feature itself, though it must remain compatible with it.
- This feature does not require localization.
- This feature does not define a large lore layer for pawns.
- This feature does not require animation-rich multi-frame pawn art; one sprite per pawn is enough for this iteration.
- This feature does not rebalance elemental weakness rules; current elemental behavior remains authoritative outside this feature.

## Feature Scope

In scope for this iteration:

- a new pawn content model;
- a new authored roster of `12` named pawns;
- config-driven control over which `8` pawns are active in the first playable slice;
- updates to shop drawing logic so active shop offers come from the active deck, not automatically from all pawn definitions;
- runtime combat support for:
  - real projectiles,
  - delayed explosion instances,
  - static world zones,
  - lock-on beams,
  - sweeping beams,
  - enemy slow status,
  - next-slot pawn damage buffs;
- new semantic combat events for the new effect families;
- replacement of placeholder build/combat pawn visuals with atlas-driven pawn sprites;
- lean shop card presentation;
- unified top-of-screen hold tooltip for shop cards and placed pawns;
- combat readability hooks for all new mechanics;
- authored sprite-atlas prompt documentation.

Out of scope for this iteration:

- full deck-building UI;
- collection browsing UI;
- save/load persistence for owned pawn collections;
- more than one enemy status type;
- more than one inter-pawn buff type;
- generalized rider stacking systems;
- full audio specification beyond identifying likely hooks;
- changing the underlying build-phase economy values unless needed for temporary testing.

## Player Experience

In build phase, the player sees a record with upright pawn sprites rather than abstract placeholder badges. Shop cards are intentionally minimal: pawn name, sprite, note-rule glyph line, and price. If the player presses and holds a shop card or a pawn already placed on the record, a wide tooltip appears pinned at the top of the screen. The tooltip stays visible during drag and shows only the information needed to decide whether a pawn fits the current build: name, sprite, tier stars, generator/finisher tag, note-rule glyphs, and a short mechanical description with baked-in numbers.

During combat, the player should immediately feel that different pawns do different things in the world. Some fire actual projectiles that can miss, some create delayed blast markers, some leave damage zones on the field, some sustain a lock-on beam, and some sweep through enemies with a moving line attack. Secondary effects should read through clear battlefield feedback: healing numbers at the base, a slow marker on enemies, a green upward-arrow buff marker on the next-slot pawn, and persistent zone/telegraph visuals.

The first playable slice intentionally exposes only `8` of the `12` total pawns through the active combat deck. That slice still covers both note-rule families and all four ability archetypes, while keeping complexity bounded. The other `4` pawns exist in content and spec but are not part of the active shop pool until a later deck/collection feature arrives.

## Core Mechanics

### Standing Rules

- A pawn is defined by:
  - `displayName`
  - `color`
  - `noteRuleFamily`
  - `ability`
  - `optional secondary effect`
  - `art metadata`
- `noteRuleFamily` and `ability` are orthogonal axes.
- MVP note-rule families are only:
  - `generator`
  - `finisher`
- MVP primary ability archetypes are only:
  - `projectile`
  - `explosion`
  - `beam`
  - `zone`
- Every pawn has exactly one `primary ability archetype`.
- Secondary effects are authored as part of a pawn’s ability, not as a generic combinator system.
- Most advanced pawns have exactly one secondary effect.
- Basic pawns have zero secondary effects.
- The current note packet rules remain unchanged:
  - one packet;
  - one color at a time;
  - existing capacity cap;
  - wave-end reset.

### Roster Structure Rules

- Total roster size: `12` pawns.
- Per color: `4` pawns.
- Per color split: `2 generator + 2 finisher`.
- Global archetype split:
  - `5 projectile`
  - `3 explosion`
  - `2 beam`
  - `2 zone`
- Basic pawns without secondary effects: `5`.
- Advanced pawns with exactly one unique secondary effect: `7`.
- All `12` are unique content pieces, not mirror variants with different tags.

### Note Rule Rules

- `Generator`
  - always creates notes of its own color;
  - always casts its combat ability regardless of note packet state;
  - note packet overflow only clamps emitted notes and never weakens or cancels the cast.
- `Finisher`
  - always consumes notes of its own color if present;
  - always casts its combat ability even if matching notes are `0`;
  - always emits its authored `outputNoteColor` after the cast;
  - `outputNoteColor` is authored per pawn and can never equal the finisher’s own color.

### Combat Activation Order

For a single pawn activation:

1. Determine the activating pawn and its slot.
2. Read any pending next-slot pawn damage buff on that exact target slot.
3. If the pawn is a finisher, capture its consumed-notes power snapshot at activation start.
4. Resolve the ability cast:
   - apply source-side snapshots;
   - select targets/points if enemies exist;
   - create runtime objects or immediate burst effects.
5. Resolve note-rule mutation:
   - generator emits notes;
   - finisher consumes/mutates and emits output note.
6. Consume the next-slot pawn damage buff if this slot had one pending.

### Source Snapshot Rules

- `Finisher` power snapshot is captured once at activation start.
- That snapshot applies to the entire output of that activation:
  - immediate hits;
  - all spawned projectiles;
  - all `burst volley` sub-shots;
  - beam lifetime damage;
  - zone lifetime damage;
  - delayed explosions;
  - secondary burn zones created by that activation.
- `Next pawn damage buff` is also snapshot once at activation start and applies to the entire output of that activation.
- Future changes to the note packet never retroactively change already created effects from that activation.

### Targeting Rules

- `frontmost enemy` means:
  - enemy is spawned;
  - enemy is alive;
  - enemy has the minimum current distance to the base by current world position;
  - ties are broken by stable runtime order.
- `random enemy` selects from the current alive+spawned list using the combat runtime random source.
- If only one enemy is alive, `random enemy` selects that enemy.
- `Projectile` abilities use only `frontmost enemy`.
- `Beam` abilities use only `frontmost enemy`.
- `Explosion` abilities may use:
  - `frontmost enemy`
  - `random enemy`
- `Zone` abilities may use:
  - `frontmost enemy`
  - `random enemy`
- If a cast pattern requires an enemy target/point and there are no alive enemies at activation time:
  - the combat effect is not created;
  - the note-rule still resolves normally.

### Projectile Rules

- All projectiles are real runtime entities.
- All projectiles use `fired direction`, not homing.
- A projectile’s starting direction is computed from:
  - the effect origin at fire time;
  - the chosen aim point, typically the current anchor of the `frontmost enemy`.
- Every projectile has:
  - current position;
  - previous position;
  - direction;
  - speed;
  - remaining lifetime;
  - collision rules;
  - source references.
- Collision uses `swept movement segment` checks, not only the projectile’s end position for the frame.
- Default projectile collision behavior:
  - dies on first valid hit.
- `Single shot`
  - one projectile in aimed direction.
- `Shotgun spread`
  - authored `projectileCount`;
  - authored `coneAngleDeg`;
  - projectile directions are evenly distributed within the cone around the aimed centerline.
- `Burst volley`
  - authored `shotCount`;
  - authored `intervalMs`;
  - spawns a series of sub-shots over time, not a single instant packet;
  - each sub-shot uses the current bound origin and re-aims toward the current `frontmost enemy`.
- `Bounce`
  - can happen once only;
  - after first hit, the projectile retargets to `frontmost enemy excluding first hit target`;
  - if no second target exists, the projectile dies;
  - lifetime does not reset after the bounce;
  - projectile dies after second hit.
- `Split`
  - parent projectile dies on hit;
  - spawns child projectiles with authored `childCount` and `splitConeAngleDeg`;
  - child directions are evenly distributed within a cone centered on the parent projectile direction at impact time;
  - child projectiles fully ignore the enemy that spawned them for their entire lives;
  - child projectiles receive their own authored lifetimes;
  - child projectiles inherit the source-side damage snapshot;
  - child projectiles do not recursively split or bounce in MVP.
- A projectile that expires by lifetime without a hit is simply a miss.

### Explosion Rules

- `Explosion` is not a persistent effect family by default.
- `Targeted burst`
  - resolves immediately as a burst impact event.
- `Delayed blast`
  - creates a short-lived pending explosion runtime;
  - stores a fixed world point chosen at cast time;
  - always detonates at that stored point even if the original target moved away.
- `Explosion` target selection chooses an enemy at cast time, then stores that enemy position at cast time as the impact point.
- Both `targeted burst` and `delayed blast` may use:
  - `frontmost enemy`
  - `random enemy`
- All explosions damage `all enemies in radius`.
- If a delayed explosion reaches wave end before detonation, it is removed without exploding.
- `Linger burn zone after cast`
  - spawns if and only if the delayed blast actually detonated;
  - does not require the primary blast to have hit any enemy;
  - does not appear if the delayed blast is cleaned up before detonation.

### Beam Rules

- Beams are short-lived runtime effects with bound origins.
- Beam origins follow the source slot world position as the record rotates.
- `Lock-on beam`
  - selects the `frontmost enemy` at cast time;
  - has `durationMs`;
  - has authored `tickIntervalMs`;
  - applies damage ticks over time;
  - if the target dies, the beam ends immediately;
  - does not retarget.
- `Sweeping beam`
  - selects the `frontmost enemy` at cast time;
  - constructs a sweep path from that cast-time choice;
  - does not retarget during its life;
  - has `durationMs`;
  - does not use `tickIntervalMs` for damage;
  - damage is applied on `new crossing` events:
    - if an enemy was not intersected by the beam last frame but is intersected this frame, it receives a hit;
    - if it stays under the beam continuously, no repeat hit occurs until a new crossing happens;
  - can hit multiple enemies in one frame if all were newly crossed.
- Beams with no valid enemy at activation time are not created.

### Zone Rules

- All zones are static `world-anchored` effects.
- Zones do not follow the slot and do not stick to enemies.
- Zones are placed at enemy positions chosen at cast time:
  - `frontmost enemy`
  - `random enemy`
- Zones have:
  - world center;
  - radius;
  - duration;
  - `tickIntervalMs`;
  - per-tick damage profile.
- First zone tick happens immediately on spawn.
- Default zone tick interval is `0.5s`.
- A zone damages `all enemies in radius` on each tick.
- A single zone instance cannot hit the same enemy more than once per tick.
- Zones do not use crossing detection; if an enemy enters and exits between ticks, it receives no damage.

### Status Rules

- MVP enemy statuses contain only one type:
  - `slow`
- `Slow`
  - affects only enemy movement speed;
  - does not affect enemy attack cadence after reaching the base;
  - does not stack by magnitude;
  - strongest magnitude wins;
  - equal or weaker reapplies duration only.

### Next-Slot Pawn Buff Rules

- MVP has one pawn buff type:
  - next-slot damage buff
- The source pawn always targets the next slot on the circular record:
  - slot `7` wraps to slot `0`;
  - if the next slot is empty, the buff is wasted.
- The buff is stored against that exact target slot.
- A slot can hold at most one pending buff.
- If a stronger buff arrives, it replaces the older one.
- If an equal or weaker buff arrives, it does not stack.
- The buff affects only damage, by authored percentage bonus.
- It does not modify:
  - note behavior;
  - projectile count;
  - radius;
  - duration;
  - beam count.
- The buff expires on:
  - the next activation of that slot, even if no enemies exist;
  - or wave end cleanup.
- The buff has no real-time duration.

### Damage and Healing Rules

- Damage modifier order:
  1. base ability hit damage;
  2. source-side snapshots:
     - finisher consumed-notes power
     - next-slot damage buff
  3. target-conditional modifier:
     - bonus damage vs high-hp targets
  4. elemental weakness modifier
  5. final rounding and HP clamp
- `Bonus damage vs high-hp targets`
  - is evaluated at each concrete hit;
  - checks current target HP ratio at that hit;
  - is a percentage bonus to damage;
  - only affects the qualifying hit, not downstream secondary effects.
- `Base heal from dealt damage`
  - is based on actual HP removed from enemies, not pre-clamp theoretical damage;
  - is calculated per damage event;
  - can be aggregated for display per frame at the base;
  - clamps to max base HP;
  - does not reverse an already reached defeat state.

### Cleanup Rules

- On wave end, clear all transient combat state:
  - projectiles
  - active beams
  - pending delayed explosions
  - zones
  - enemy statuses
  - pawn buffs
- Enemy death is immediate:
  - once an enemy dies, it is removed from later targeting and collision checks in the same frame.
- Different effect instances may damage the same enemy in the same frame if each one legitimately resolves a hit.

## Gameplay Flow

### Build Phase

1. Stage enters build phase with the current placed roster, coins, and active deck shop pool.
2. Shop cards render available offers from the active deck only.
3. The player presses and holds a pawn card or placed pawn.
4. A top-screen tooltip opens for that pawn and remains visible during drag.
5. The player buys, drags, swaps, merges, and reorders pawns on the record.
6. Once ready, the player starts the wave.

### Combat Phase

1. Combat starts with the current eight-slot loadout, tiers, chrono state, and wave data.
2. Record rotation advances as usual.
3. When a slot crosses the needle:
   - the pawn reads its source snapshots;
   - the ability cast creates immediate results or runtime effect instances;
   - the note rule mutates the note packet.
4. After slot activations, the combat runtime updates living effect families:
   - projectiles
   - delayed explosions
   - beams
   - zones
   - statuses
   - pawn-buff maintenance
5. Enemies advance and attack the base using existing enemy-pressure logic.
6. Runtime emits semantic events for one-shot feedback and keeps persistent effect state authoritative for presentation.
7. Wave ends on victory or defeat.
8. All transient combat effect state is cleared on wave exit.

### Stage Return Flow

1. On combat victory, stage returns to build phase with:
   - updated coins;
   - updated chrono;
   - existing placed pawns preserved;
   - shop rerolled from the active deck.
2. On combat defeat, stage fails as normal.

## System Model

Major runtime and content pieces involved:

- `CombatContentConfig` or successor pawn-content config
  - authoritative pawn roster definitions, active deck list, effect parameters, and art keys.
- `StageBuildState` in `src/stage/StageBuild.ts`
  - current placed pawn instances, shop offers, reroll count.
- `StageRuntime` in `src/stage/StageRuntime.ts`
  - wave progression, coins, chrono, build state.
- `StageScene` in `src/scenes/stage/StageScene.ts`
  - build-phase presentation, shop cards, drag interactions, top tooltip, record pawn sprite rendering.
- `CombatRuntime` in `src/combat/CombatRuntime.ts`
  - authoritative combat state.
- `CombatActivation`
  - resolves slot activations and source snapshots.
- New combat effect families
  - projectile runtime family;
  - delayed explosion runtime family;
  - beam runtime family;
  - zone runtime family;
  - enemy status runtime family;
  - pawn buff runtime family.
- Shared combat helpers
  - targeting selection;
  - damage calculation;
  - collision testing;
  - wave-end cleanup.
- `CombatRenderModel` and `CombatSceneViewGraph`
  - structural combat scene layout and view construction.
- `CombatPresentationRuntime`
  - state-driven rendering of persistent effects plus event-driven one-shot feedback.
- `EventBus`
  - central cross-system event channel.
- `BootScene`
  - asset preload point for the pawn sprite atlas.

## Technical Design

### Recommended Implementation Shape

Keep the existing scene/runtime separation, but stop growing the current prototype by pushing more branches into `CombatActivation.ts`. Instead:

- keep `CombatRuntime` authoritative over all combat state;
- keep `CombatActivation` responsible for activation-time orchestration only;
- move living effect behavior into dedicated family-specific modules;
- keep content data in `src/config/`;
- keep presentation concerns in scene/view/presentation runtime layers;
- keep cross-scene notifications flowing through `EventBus`.

### Pawn Content Schema Direction

The current `CombatContentConfig` models pawns as a small union of:

- `generator`
- `finisher`

with direct fields like `baseDamage` and `outputNoteColor`.

This feature should evolve that shape into a richer authored definition. The exact TypeScript names are implementation choice, but the model should explicitly represent:

- identity:
  - `id`
  - `displayName`
  - `color`
- note rule:
  - `family`
  - generator/finisher-specific fields
- ability:
  - `primaryArchetype`
  - `primaryCastPattern`
  - target/point selection rule
  - origin behavior
  - numeric tuning fields
  - optional secondary effect config
- art:
  - sprite atlas frame key
- tooltip/card authoring:
  - concise player-facing ability description
- availability:
  - whether the pawn is in the active eight-pawn deck for the current playable slice

### Combat Runtime Extensions

Extend `CombatRuntime` with typed state families such as:

- `projectiles`
- `pendingExplosions`
- `beams`
- `zones`
- `enemyStatuses`
- `pawnBuffs`

Add matching update modules under `src/combat/` rather than inflating the central runtime file. Likely candidates:

- `CombatTargeting.ts`
- `CombatDamage.ts`
- `CombatProjectiles.ts`
- `CombatExplosions.ts`
- `CombatBeams.ts`
- `CombatZones.ts`
- `CombatStatuses.ts`
- `CombatPawnBuffs.ts`
- `CombatEffectCleanup.ts`

These can be named differently, but the responsibilities should stay separate.

### Combat Update Loop Changes

The current running-state update order in `CombatRuntime.advanceCombatRuntime` is:

1. activate pending subwaves
2. reset frame effects
3. apply time control
4. rotate record
5. resolve slot activations
6. advance enemy pressure
7. spawn enemies
8. compute outcome

The new version should preserve that overall shape but insert a post-activation combat effects phase before outcome evaluation. A recommended order:

1. activate pending subwaves
2. reset transient frame effects
3. advance time control and record rotation
4. resolve slot activations
5. update projectile family
6. update pending delayed explosions
7. update beam family
8. update zone family
9. update enemy status maintenance
10. update pawn-buff maintenance
11. advance enemy pressure
12. spawn enemies
13. recalculate remaining enemies
14. evaluate outcome

### Stage/Shop Changes

`StageBuild.drawStageShopOffers()` currently samples from `CombatContentConfig.PAWN_DEFINITIONS` directly. That must change. The first playable slice should draw only from the active `8`-pawn deck. The temporary deck must be config-driven so it can be swapped later without implementing a full deckbuilder.

### Presentation Changes

Persistent combat objects should be rendered from authoritative runtime arrays, not reconstructed from events:

- projectile views derive from `projectiles`
- beam views derive from `beams`
- zone views derive from `zones`
- delayed explosion telegraphs derive from `pendingExplosions`

Semantic combat events should be used only for:

- muzzle flashes / launch pops
- damage and heal floating numbers
- note flights / packet break reactions
- base hit flashes
- buff applied / consumed pops
- debug hooks

### Event Model Changes

The current event set is too centered on prototype note and hit flow. Add new semantic events for one-shot feedback. Recommended minimum families:

- `combat:projectile-spawned`
- `combat:projectile-hit`
- `combat:beam-started`
- `combat:beam-ticked`
- `combat:zone-spawned`
- `combat:zone-ticked`
- `combat:slow-applied`
- `combat:base-healed`
- `combat:pawn-buff-applied`
- `combat:pawn-buff-consumed`

Keep a general hit event like `combat:enemy-hit` for HP sync and shared damage-number handling.

## Data Flow

- `StageRuntime` owns placed pawns and shop state.
- `StageBuildState` references pawn IDs and tiers per slot.
- Shop offer generation pulls only from the active deck ID list in config.
- Starting a combat wave passes slot loadout data into `CombatRuntime`.
- `CombatRuntime` resolves slot activations by:
  - reading pawn content definitions;
  - reading current slot runtime info;
  - reading note packet state;
  - reading pending pawn buffs;
  - creating immediate hits or runtime effect objects.
- New runtime effect families mutate enemies/base over time.
- Damage and heal events emit semantic feedback through `EventBus`.
- Presentation reads:
  - persistent objects from runtime state;
  - one-shot reactions from semantic events.
- Build UI reads:
  - pawn sprite atlas;
  - tooltip/card authoring strings;
  - note-rule glyph definitions;
  - current pawn instance tier.

Authoritative vs derived:

- Authoritative:
  - runtime effect arrays
  - note packet state
  - enemy HP/state
  - base HP
  - pending pawn buffs
  - stage build slots and shop offers
- Derived:
  - tooltip UI
  - build shop card layout
  - persistent world visuals
  - floating numbers
  - VFX pulses and markers

## State Model

### Persistent Content State

- pawn definitions
- active deck list
- sprite atlas keys
- note-rule glyph presentation
- all default tuning values

### Stage Runtime State

- current phase
- current wave index
- total waves
- coins
- chrono
- placed pawns and tiers
- shop offers
- reroll count

### Combat Runtime State

- record rotation state
- note packet
- enemy runtimes
- slot runtimes
- projectile runtimes
- pending delayed explosions
- beam runtimes
- zone runtimes
- enemy status runtimes
- pawn buff runtimes
- transient event/output channels

### UI Transient State

- currently inspected pawn/card
- top tooltip visibility and content
- current drag payload
- build-phase slot highlights

### Invariants

- a pawn always has exactly one note-rule family and one primary archetype;
- a finisher’s output note color is never its own color;
- all runtime effect families are cleared on wave end;
- one slot can hold at most one pending next-slot damage buff;
- one enemy can have at most one effective slow magnitude at a time;
- pawn sprites remain upright in all phases;
- shop offers in the first playable slice come only from the configured active deck.

## Integration Points

- `src/config/CombatContentConfig.ts`
  - likely the main pawn-content extension point unless split into a dedicated pawn config module.
- `src/stage/StageBuild.ts`
  - shop draw source must become active-deck-aware.
- `src/stage/StageRuntime.ts`
  - build state remains authoritative for placed pawns and loadout export.
- `src/scenes/stage/StageScene.ts`
  - replace placeholder pawn tiles/cards with sprite-driven content and top tooltip.
- `src/combat/CombatRuntime.ts`
  - extend authoritative combat state and loop ordering.
- `src/combat/CombatActivation.ts`
  - keep activation orchestration but move living-effect logic out.
- `src/scenes/combat/CombatScene.ts`
  - subscribe to new semantic events and pass runtime state to new persistent object views.
- `src/combat/CombatRenderModel.ts`
  - remove pedestal-centric pawn assumptions and support upright sprite presentation.
- `src/scenes/BootScene.ts`
  - preload the pawn atlas.
- `src/events/EventBus.ts`
  - extend event map for new combat semantic events.
- `docs/features/slot-modifiers/design-spec.md`
  - maintain compatibility with output-note and ability-archetype modifier logic.

## Content and Configuration

### Required Pawn Content

The first authored roster is:

| Name | Color | Note Rule | Primary Archetype | Pattern | Secondary Effect | Finisher Output |
| --- | --- | --- | --- | --- | --- | --- |
| Ruby Needle | red | generator | projectile | single shot | none | n/a |
| Bass Bomb | red | generator | explosion | targeted burst | none | n/a |
| Heatline | red | finisher | beam | lock-on beam | none | blue |
| Meteor Drop | red | finisher | explosion | delayed blast | burn zone after cast | green |
| Moss Patch | green | generator | zone | placed damage zone | none | n/a |
| Lifebloom Scatter | green | generator | projectile | shotgun spread | base heal from dealt damage | n/a |
| Thorn Fan | green | finisher | projectile | shotgun spread | none | red |
| Pulse Garden | green | finisher | zone | placed damage zone | next-slot damage buff | blue |
| Frost Sweep | blue | generator | beam | sweeping beam | slow on hit | n/a |
| Prism Volley | blue | generator | projectile | burst volley | split on hit | n/a |
| Pressure Burst | blue | finisher | explosion | targeted burst | bonus damage vs high-hp | red |
| Arc Bounce | blue | finisher | projectile | burst volley | bounce to next enemy | green |

### Temporary Active Deck

For the first playable slice, only these `8` pawns are active in shop/deck:

- Ruby Needle
- Bass Bomb
- Heatline
- Moss Patch
- Thorn Fan
- Frost Sweep
- Meteor Drop
- Arc Bounce

The inactive-but-authored pawns remain in content and can later be re-enabled through config:

- Lifebloom Scatter
- Pulse Garden
- Prism Volley
- Pressure Burst

### Required Tuning Surfaces

Each pawn or pattern may need authored values such as:

- base damage
- projectile speed
- projectile lifetime
- projectile count
- cone angle
- volley shot count
- volley interval
- explosion radius
- explosion delay
- zone radius
- zone duration
- zone tick interval
- beam duration
- lock-on beam tick interval
- slow magnitude
- slow duration
- heal percent from damage
- high-hp threshold ratio
- high-hp bonus percent
- next-slot damage buff percent
- split child count
- split cone angle

These values should live in config modules under `src/config/`.

### Validation Rules

- every finisher must define a valid non-self output note color;
- every pawn must have a sprite atlas frame key;
- every pawn must define a concise tooltip description;
- active deck IDs must all correspond to valid pawn definitions;
- first playable slice deck size must be exactly `8`;
- no pawn may define more than one secondary effect in MVP;
- `generator/finisher` names and ability descriptions should remain stable once authored.

## Technical Constraints

- The repo architecture expects runtime-level tunables in `src/config/`.
- `EventBus` is the shared cross-system channel and should remain the only global event bridge.
- Stage/build logic lives in `src/stage/`.
- Build UI currently lives in `src/scenes/stage/StageScene.ts`.
- Combat runtime logic currently centers on `src/combat/CombatRuntime.ts` and `src/combat/CombatActivation.ts`.
- Phaser 3 is already configured with Arcade physics, but the current combat runtime is mostly custom numeric simulation. This feature should stay lightweight and should not require full physics bodies for every effect unless clearly justified.
- Deterministic testability matters:
  - `random enemy` selection must use the injected combat RNG.
- Mobile portrait readability matters more than maximal systemic generality.
- Performance should remain compatible with a small but effect-rich mobile battlefield; avoid needlessly expensive generic effect graphs.

## Failure Modes and Edge Cases

- Projectile ability with no alive enemies:
  - no projectile spawned;
  - note rule still resolves.
- Beam ability with no alive enemies:
  - no beam spawned;
  - note rule still resolves.
- Explosion or zone ability with no alive enemies:
  - no effect spawned;
  - note rule still resolves.
- Finisher with zero matching notes:
  - still casts;
  - still emits output note;
  - simply uses weak/no-payoff snapshot.
- Generator packet overflow:
  - cast unaffected;
  - only emitted notes clamp/burn.
- Delayed blast target moved away:
  - blast still detonates at stored point.
- Delayed blast reaches wave end before detonation:
  - removed without exploding.
- Burn zone spawn condition:
  - only after a real detonation.
- Next-slot buff with empty next slot:
  - wasted.
- Next-slot buff target activates with no enemies:
  - buff still consumed.
- Lock-on beam target dies early:
  - beam ends early.
- Sweeping beam has no targets during later frames:
  - continues its full duration, possibly hitting nothing.
- Projectile child from split overlaps its source enemy:
  - source enemy is ignored for that child’s entire life.
- Projectile bounce finds no second target:
  - projectile dies after first hit.
- Enemy dies mid-frame:
  - excluded from later targeting/collision checks in that frame.
- Multiple instances hit the same enemy in one frame:
  - all legitimate hits apply.

## Architecture Notes

- `Note rule family + ability` is preferred over “generator pawn type vs finisher pawn type” because it creates a content matrix without forcing early system over-complexity.
- Typed combat effect families are preferred over a single universal effect-instance bag because each family has meaningfully different lifecycle, collision, and presentation semantics.
- A small authored whitelist of target-selection rules is preferred over a generalized targeting DSL because MVP content does not justify the extra abstraction cost.
- Persistent combat objects should be rendered from runtime state, not from fire-and-forget events, because projectiles, zones, delayed telegraphs, and beams all need stable frame-to-frame synchronization.
- Shop cards are intentionally sparse. The design deliberately trusts sprite readability plus tooltips rather than trying to cram full mechanics into the card face.
- Upright pawn sprites are preferred over rotating sprites because combat readability is more important than literal record-relative orientation.
- The active `8`-pawn deck is config-driven rather than hard-coded into shop logic so later deck experimentation does not require a second feature first.

Alternatives intentionally rejected:

- encoding all pawn identity solely as `generator` vs `finisher`;
- generalized composable rider stacks for MVP;
- homing projectiles as default;
- retargeting lock-on beams;
- using one universal tooltip and card with many stat rows;
- keeping Phaser primitive pedestals and text labels as the long-term pawn visual language.

## Validation and Testing

- `StageBuild.drawStageShopOffers()` draws only from the configured active deck IDs in the first playable slice.
- The authored roster contains exactly `12` pawns with the approved names, colors, note-rule families, archetypes, patterns, and secondary effects.
- The active deck contains exactly `8` approved pawns and excludes the other `4`.
- Every finisher has a valid non-self output note color.
- Long-pressing a shop card shows the unified top tooltip.
- Long-pressing a placed pawn shows the same tooltip structure.
- Tooltip remains visible during drag and remains tied to the dragged origin pawn/card.
- Shop card face shows only sprite, name, note-rule glyph row, and price.
- Tooltip layout matches the approved structure:
  - left column with name, sprite, tier stars;
  - right column with generator/finisher tag, note-rule row, and short description.
- Pawn sprites remain upright in build phase.
- Pawn sprites remain upright in combat phase.
- Tier stars still render correctly on placed pawns and in tooltip.
- `single shot` projectile fires toward the current frontmost enemy and can miss if the enemy moves away.
- `shotgun spread` uses authored projectile count and cone angle.
- `burst volley` spawns sub-shots over time using bound origin behavior.
- Projectile collision uses swept segment checks and does not tunnel through enemies at high speed.
- `bounce` hits at most two targets and never returns to the same target.
- `split` spawns child projectiles that ignore the source-hit enemy.
- `targeted burst` damages all enemies inside radius immediately.
- `delayed blast` telegraphs, waits, and detonates at stored point even if the target moved.
- `delayed blast` that reaches wave end before detonation disappears without exploding.
- `lock-on beam` ticks over time and ends if its target dies.
- `sweeping beam` damages enemies on new crossings, not only on coarse tick timing.
- `zone` applies immediate first tick on spawn and later ticks on its interval.
- `zone` does not use crossing-based hits.
- `slow` only changes movement speed and uses strongest-wins behavior.
- `next-slot damage buff` applies only to the next circular slot and is wasted on empty slots.
- `next-slot damage buff` is consumed on the target slot’s next activation even if that activation creates no effect because there are no enemies.
- `base heal from dealt damage` uses actual HP removed and aggregates visual numbers per frame at the base.
- `bonus damage vs high-hp` is evaluated per hit against the target’s current HP ratio.
- Wave-end cleanup removes all persistent effect instances and transient statuses/buffs.
- New semantic combat events emit correctly and are consumed by presentation without needing persistent objects to depend on them.
- TypeScript compiles cleanly with `npx tsc --noEmit`.
- Project builds successfully with `npm run build`.
- Automated tests cover representative edge cases for each new runtime family.

## Definition of Done

- The approved `12`-pawn roster exists in authored config and validates successfully.
- The temporary active `8`-pawn deck is config-driven and powers shop offer generation.
- Combat supports real projectile, explosion, beam, and zone runtime behaviors according to this spec.
- `slow`, `base heal from damage`, `bounce`, `split`, `next-slot damage buff`, `burn zone after delayed blast`, and `bonus damage vs high-hp` behave as specified.
- Build phase uses sprite-based pawn presentation instead of the current placeholder construct tile treatment.
- Shop cards and top-screen long-press tooltip behave exactly as specified.
- Combat presentation clearly communicates projectile, beam, explosion, delayed blast, zone, slow, heal, and next-slot-buff behaviors.
- The pawn atlas is integrated through preload/bootstrap and used consistently in build/combat/tooltip/card contexts.
- New tests cover critical edge cases and deterministic rules.
- The feature works as a self-contained first playable slice without requiring the future deckbuilder feature.

## Assumptions

- Existing economy knobs such as shop cost, reroll cost, reposition cost, merge reward, and max tier stay unchanged unless tuning proves otherwise.
- Existing tier damage scaling in combat remains usable for the first implementation pass.
- Pawn display names approved during design discussion are stable enough to use in content and UI.
- The pawn atlas can be loaded through the existing BootScene preload flow, even if the exact final atlas loader call differs from the current single-image preload example.
- The current elemental weakness implementation remains unchanged by this feature and should not be “fixed” as part of this scope.
- Tooltip descriptions are authored strings, not dynamically generated from raw config at runtime in the first implementation.

## Open Questions

- Exact numeric tuning is still unresolved for each pawn:
  - damage values
  - counts
  - radii
  - durations
  - projectile speeds
  - lifetimes
  - heal percentages
  - slow magnitudes
  - high-hp threshold
  - note-scaling curves if changed beyond current prototype defaults
- Final atlas packaging details are unresolved:
  - exact pixel size of each pawn sprite
  - exact atlas dimensions
  - whether export uses a plain PNG atlas plus metadata file or another Phaser-friendly packing format
- Audio/SFX implementation is not specified in this document beyond obvious event hooks.

## UI / UX

- Build-phase tooltip is a top-screen pinned overlay, not a contextual popover near the finger.
- Tooltip is allowed to remain visible during drag to avoid gesture conflicts.
- Shop cards should stay visually sparse and highly scannable.
- Tooltip descriptions should be player-facing and concrete, using short sentences with numbers embedded directly into the text.
- Example description style:
  - `Burst of 3 projectiles for 20 damage each. Heals the base for 50% of damage dealt.`
  - `After 1 sec., calls down a meteor: 100 damage in a 150 radius. Leaves a burning zone for 2 sec.`
- No color text labels are needed in tooltip if sprite and note-rule visuals are doing their job.
- No archetype label is needed in tooltip if sprite and description already communicate it.

## Art Direction

### Visual Language Rules

- Pawn art style: semi-literal rave-tech combat constructs.
- Perspective: top-down.
- Orientation: all pawn sprites face vertically upward.
- One sprite per pawn.
- No tier-based sprite variants.
- Generator family visual language:
  - more open;
  - emissive;
  - distributive;
  - emitter / distributor feel.
- Finisher family visual language:
  - more focused;
  - chambered;
  - discharge-oriented;
  - collector / focusing-device feel.
- Archetype silhouette families:
  - projectile: barrel / launcher / firing ports
  - explosion: mortar / bombard / impact chamber
  - beam: lens / rail / focusing array
  - zone: field projector / coil ring / hazard emitter
- Color language:
  - neutral rave-tech chassis material;
  - large, easy-to-read colored energy masses and emitters for red/green/blue identity;
  - not merely tiny accent lines.
- Secondary effects may receive subtle thematic hints, but do not require a universal iconographic language in the base sprite.

### Atlas Prompt Requirements

The final implementation spec should include prompts for generating the pawn sprite atlas. This document already defines the required prompt direction.

Shared atlas prompt:

`Create a unified sprite atlas of 12 top-down rave-tech combat turrets for a mobile portrait roguelike tower defense game. Each turret is a stylized semi-literal arcane-cyberpunk weapon construct seen from above, facing vertically upward, with strong silhouette readability on a small UI scale. Keep a consistent bounding box, consistent lighting, and a cohesive atlas style. Use a neutral dark metallic chassis with large glowing elemental energy zones for red, green, or blue color identity. Distinguish generator turrets as open emitters/distributors and finisher turrets as focused chamber/discharge devices. Avoid background, floor, pedestal, text, UI frames, or perspective rotation. Clean alpha background only.`

Per-pawn prompt descriptors:

- `Ruby Needle`: red generator projectile single-shot turret; compact forward barrel; open emitter body; crisp precision shooter read.
- `Bass Bomb`: red generator explosion targeted-burst mortar; open bombard chamber; visible blast cup; simple bombard silhouette.
- `Heatline`: red finisher lock-on beam cannon; focused central lens; chambered beam projector; concentrated discharge silhouette.
- `Meteor Drop`: red finisher delayed-blast meteor cannon; heavy bombard body; charged impact chamber; fiery meteor read.
- `Moss Patch`: green generator zone projector; open field emitter; ringed projector pads; persistent hazard-field read.
- `Lifebloom Scatter`: green generator projectile shotgun turret; multi-port muzzle; supportive luminous core; scatter-heal feel.
- `Thorn Fan`: green finisher projectile shotgun cannon; focused chamber with fan-like muzzle spread; discharge shotgun read.
- `Pulse Garden`: green finisher zone projector; chambered pulse core; focused field emitter; buffing control-field read.
- `Frost Sweep`: blue generator sweeping-beam emitter; open sweeping rail array; cool energetic beam sweep read.
- `Prism Volley`: blue generator projectile volley launcher; multi-stage launcher body; repeated burst fire read.
- `Pressure Burst`: blue finisher explosion targeted-burst cannon; focused impact chamber; heavy burst detonation read.
- `Arc Bounce`: blue finisher projectile volley cannon; chambered burst launcher; energetic ricochet projectile read.

## Game Content

- The feature adds a first real pawn roster, not just a systems shell.
- Content authoring includes:
  - names
  - colors
  - note-rule family
  - finisher output colors
  - primary archetypes
  - primary cast patterns
  - secondary effects
  - tuning numbers
  - tooltip descriptions
  - art frame keys
  - active deck membership
- The roster should be authored so future slot modifiers can inspect at minimum:
  - output-note behavior
  - primary archetype (`projectile`, `explosion`, `beam`, `zone`)

## Data / Persistence

- No new save-data feature is required in this iteration.
- The temporary active deck is config-authored, not player-authored.
- No migration layer is required unless implementation chooses to change the shape of existing pawn config in a way that affects tests or build-time validators.
- If a dedicated pawn content config module is introduced, add validation similar in rigor to the current `CombatContentConfig` validation tests.

## Performance / Technical Constraints

- Avoid rebuilding complex effect graphs every frame from scratch when persistent runtime state can be updated incrementally.
- Prefer lightweight numeric simulation for projectile, beam, zone, and delayed explosion behavior.
- Keep persistent object counts bounded by authored content; MVP content is intentionally small and should not require general-purpose pooling infrastructure beyond normal Phaser/runtime hygiene.
- Because projectile, beam, and zone visuals are state-driven, view pooling or reuse is recommended in presentation layers to avoid per-frame object churn.

## Edge Cases & Error States

- Missing atlas frame for a pawn should fail loudly in development rather than silently rendering a wrong sprite.
- Invalid finisher output note color should fail validation.
- Invalid active deck ID should fail validation.
- Tooltip should degrade gracefully if invoked on an unknown pawn ID during development.
- If shop config references a pawn that is not in content, shop generation should fail validation instead of generating an empty/broken offer.
