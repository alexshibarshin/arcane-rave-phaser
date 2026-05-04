# ADR-001: Split CombatRuntime God Function into Focused Sub-Modules

**Status:** Proposed
**Date:** 2026-05-04
**Related:** CONTEXT.md, VISION.md

---

## 1. Problem Statement

`src/combat/CombatRuntime.ts` is a ~570-line module that serves as the single source of truth for combat simulation. Its public interface consists of just two functions:

```ts
function createCombatRuntime(random: () => number): CombatRuntime
function advanceCombatRuntime(runtime: CombatRuntime, deltaMs: number, options?: { random?: () => number }): void
```

The `advanceCombatRuntime` function is a god function. When `runtime.state === 'running'`, it executes the following sequence:

1. Advance `combatElapsedMs` and `waveElapsedMs`
2. Activate pending sub-waves
3. Reset slot activation effects (clears `transientIds` and `pendingEvents`, resets `activationVisualState`)
4. Advance record rotation (`previousAngle` → `currentAngle`)
5. Process crossed slots (detect crossings, resolve generators/finishers, emit events)
6. Update enemy pressure (movement toward base, attack range transitions, base damage ticks)
7. Bootstrap enemy spawns (process spawn bags, place enemies on field)
8. Calculate enemies remaining
9. Evaluate victory/defeat

Each of these steps is implemented as a top-level function inside `CombatRuntime.ts`, and they are all tightly coupled through shared mutation of the `CombatRuntime` object. The file also contains numerous pure helper functions (`getDistance`, `resolveWeakness`, `collectCrossingsForSlot`, `getFinisherConsumedNotesMultiplier`, etc.).

### Friction

- **Poor locality.** A change to finisher logic requires understanding the entire `advanceCombatRuntime` flow, including record rotation, spawn timing, and enemy movement.
- **No test seam.** To test, for example, that a finisher correctly consumes N notes and applies the multiplier, you must construct a full `CombatRuntime`, call `advanceCombatRuntime`, and inspect `runtime.effects.pendingEvents`. You cannot test finisher logic in isolation.
- **Hard to reason about.** The module has ~570 lines with ~20 top-level functions. Understanding any single behaviour requires reading the whole file.
- **AI-navigability.** A future agent looking for "how do generators work?" must scan the entire file.

---

## 2. Design Decisions

### 2.1. Shared state via mutation (Decision: keep)

All sub-modules will receive a `CombatRuntime` reference and mutate it directly. No deep copying.

**Rationale:** `CombatRuntime` is a large object. Deep copying every frame would be expensive and unnecessary for a single-threaded game loop. Mutation is acceptable because the game loop is sequential — there is no concurrency.

### 2.2. Order of operations preserved (Decision: keep)

The call order in `advanceCombatRuntime` remains:

```
resetSlotActivationEffects → advanceRotation → resolveActivations → advanceEnemyMovement → processEnemyAttacks → processSpawns → calculateEnemiesRemaining → evaluateOutcome
```

**Rationale:** This order is part of the game's temporal contract. Changing it would alter gameplay timing (e.g., if spawns happened before slot activations, new enemies would appear on the same tick they were spawned, changing the feel of pressure).

### 2.3. Pure function for slot crossing detection (Decision: extract)

`detectSlotCrossings` will be a **pure function** with no side effects:

```ts
interface SlotCrossing {
  slotIndex: number;
  crossingAngle: number;
}

export function detectSlotCrossings(
  slot: CombatSlotRuntime,
  previousAngle: number,
  currentAngle: number,
): SlotCrossing[];
```

**Rationale:** Slot crossing detection is a mathematical problem (angle arithmetic). It has no dependencies on game state beyond the slot's own data. Making it pure makes it trivially testable and clearly separates the "what crossed" question from the "what happens because it crossed" question.

### 2.4. Pawn definition lookup stays inline (Decision: keep)

`processCrossedSlots` currently creates a `Map<id, pawnDefinition>` from `CombatContentConfig.PAWN_DEFINITIONS` inside the function. This stays as-is.

**Rationale:** There are only 6 pawn definitions. Creating a Map of 6 entries per frame is negligible. Premature optimization would add complexity without benefit.

### 2.5. Random dependency stays as-is (Decision: keep)

The `random` parameter stays in `advanceCombatRuntime`'s `options` and is passed through to `processSpawns`.

**Rationale:** Random is only needed by spawn processing. Extracting it to a separate module would be over-engineering.

### 2.6. `calculateEnemiesRemaining` stays in CombatRuntime.ts (Decision: keep)

This is a small utility function (~15 lines) that is called once per frame. It stays in `CombatRuntime.ts` next to `advanceCombatRuntime`.

### 2.7. Note packet mutation stays inside CombatActivation (Decision: keep for now)

`applyGeneratorPacketMutation` and `applyFinisherPacketMutation` stay inside the `CombatActivation` module.

**Rationale:** The user explicitly requested this. Note packet rules are tightly coupled to activation logic. They can be extracted later if they grow independently.

---

## 3. Target Module Structure

### 3.1. New files

```
src/combat/
├── CombatRuntime.ts              ← REWRITTEN (type + factory + state setters only)
├── CombatRuntimeAdvance.ts       ← NEW (thin pipeline)
├── CombatRotation.ts             ← NEW (record rotation + crossing detection)
├── CombatActivation.ts           ← NEW (pawn resolution + packet mutation)
├── CombatEnemyMovement.ts        ← NEW (enemy movement + state transitions)
├── CombatEnemyAttacks.ts         ← NEW (base damage ticks)
├── CombatSpawnManager.ts         ← NEW (spawn bag processing)
└── CombatOutcome.ts              ← NEW (victory/defeat evaluation)
```

### 3.2. File responsibilities

| File | Responsibility | Public API |
|------|---------------|------------|
| `CombatRuntime.ts` | Type definitions, `createCombatRuntime()`, `setCombatState()`, `setCombatNotePacket()`, `resetSlotActivationEffects()`, `calculateEnemiesRemaining()` | Types + factory + setters |
| `CombatRuntimeAdvance.ts` | Thin pipeline orchestrating sub-modules | `advanceCombatRuntime()` |
| `CombatRotation.ts` | Record angle advancement, slot crossing detection | `advanceRotation()`, `detectSlotCrossings()` |
| `CombatActivation.ts` | Pawn activation resolution, note packet mutation, event emission | `resolveActivations()` |
| `CombatEnemyMovement.ts` | Enemy movement toward base, moving→attacking transitions | `advanceEnemyMovement()` |
| `CombatEnemyAttacks.ts` | Periodic base damage ticks from attacking enemies | `processEnemyAttacks()` |
| `CombatSpawnManager.ts` | Spawn bag processing, enemy placement | `processSpawns()` |
| `CombatOutcome.ts` | Victory/defeat condition evaluation | `evaluateOutcome()` |

---

## 4. Detailed Module Specifications

### 4.1. CombatRuntime.ts (rewritten)

**What stays:** All type definitions (`CombatState`, `NoteColor`, `CombatEnemyState`, `CombatSlotRuntime`, `CombatNotePacketRuntime`, `CombatEnemyRuntime`, `CombatSubWaveSpawnBag`, `CombatWaveRuntime`, `CombatRuntime`).

**What stays:** `createCombatRuntime()` function (the factory that builds the initial state).

**What stays:** `setCombatState(runtime, nextState)` — toggles state, sets outcome flags.

**What stays:** `setCombatNotePacket(runtime, color, count)` — clamps count to capacity, emits warning for out-of-bounds.

**What moves in:** `resetSlotActivationEffects(runtime)` — clears `transientIds`, `pendingEvents`, resets all slot `activationVisualState` to `'idle'`.

**What moves in:** `calculateEnemiesRemaining(runtime)` — counts living enemies + pending in bags + pending in sub-waves.

**What moves out:** Everything else — rotation, activation, enemy logic, spawning, outcome evaluation.

**New public API:**
```ts
export type CombatState = 'preview' | 'running' | 'paused' | 'victory' | 'defeat';
export type NoteColor = (typeof CombatContentConfig.NOTE_COLORS)[number];
export type CombatEnemyState = 'moving' | 'attacking' | 'dead';

export interface CombatSlotRuntime { ... }
export interface CombatNotePacketRuntime { ... }
export interface CombatEnemyRuntime { ... }
export interface CombatSubWaveSpawnBag { ... }
export interface CombatWaveRuntime { ... }
export interface CombatRuntime { ... }

export function createCombatRuntime(random: () => number = Math.random): CombatRuntime;
export function setCombatState(runtime: CombatRuntime, nextState: CombatState): boolean;
export function setCombatNotePacket(runtime: CombatRuntime, color: NoteColor | null, count: number): void;
export function resetSlotActivationEffects(runtime: CombatRuntime): void;
export function calculateEnemiesRemaining(runtime: CombatRuntime): number;
```

**Internal (non-exported) helpers that stay:**
- `getSlotWorldPosition(centerX, centerY, angleDeg, radius)` — used by `createCombatRuntime` to compute initial slot positions
- `shuffleArray<T>(array, random)` — used by `activateSubWave`
- `activateSubWave(runtime, subWave, random)` — internal to factory
- `activatePendingSubWaves(runtime, random)` — internal to factory

**Code that moves out:**
- `advanceCombatRuntime()` → `CombatRuntimeAdvance.ts`
- `advanceRotation()` + `collectCrossingsForSlot()` → `CombatRotation.ts`
- `resolveGeneratorSlotActivation()` + `resolveFinisherSlotActivation()` + `applyGeneratorPacketMutation()` + `applyFinisherPacketMutation()` + `getFinisherConsumedNotes()` + `getFinisherConsumedNotesMultiplier()` + `pushNotePacketChangedEvent()` + `pushGeneratorNotesEmittedEvent()` + `selectNearestLivingEnemy()` → `CombatActivation.ts`
- `updateEnemyPressure()` → `CombatEnemyMovement.ts`
- `updateEnemyBaseAttacks()` → `CombatEnemyAttacks.ts`
- `bootstrapEnemySpawns()` + `selectEnemySpawnX()` → `CombatSpawnManager.ts`
- `evaluateVictory()` → `CombatOutcome.ts`
- `clampEnemyToAttackRange()` → `CombatEnemyMovement.ts`
- `getDistance()` → moved to wherever it's needed (or a shared utils module if used by multiple new files)
- `resolveWeakness()` → moved to `CombatActivation.ts`

### 4.2. CombatRuntimeAdvance.ts (new)

**Responsibility:** Thin pipeline that calls sub-modules in the correct order.

**Public API:**
```ts
export function advanceCombatRuntime(
  runtime: CombatRuntime,
  deltaMs: number,
  options?: { random?: () => number },
): void;
```

**Implementation:**
```ts
import { advanceRotation } from './CombatRotation.js';
import { resolveActivations } from './CombatActivation.js';
import { advanceEnemyMovement } from './CombatEnemyMovement.js';
import { processEnemyAttacks } from './CombatEnemyAttacks.js';
import { processSpawns } from './CombatSpawnManager.js';
import { evaluateOutcome } from './CombatOutcome.js';
import { resetSlotActivationEffects, calculateEnemiesRemaining } from './CombatRuntime.js';

export function advanceCombatRuntime(
  runtime: CombatRuntime,
  deltaMs: number,
  options: { random?: () => number } = {},
): void {
  // Handle non-running states
  if (runtime.state === 'preview') {
    runtime.combatElapsedMs += deltaMs;
    runtime.preview.elapsedMs = Math.min(
      runtime.preview.elapsedMs + deltaMs,
      runtime.preview.durationMs,
    );
    if (runtime.preview.elapsedMs >= runtime.preview.durationMs) {
      setCombatState(runtime, 'running');
    }
    return;
  }

  if (runtime.state !== 'running') {
    return;
  }

  // Phase 1: Reset per-frame state
  resetSlotActivationEffects(runtime);

  // Phase 2: Rotate record and detect crossings
  const crossings = advanceRotation(runtime, deltaMs);

  // Phase 3: Resolve pawn activations
  resolveActivations(runtime, crossings);

  // Phase 4: Advance enemy movement
  advanceEnemyMovement(runtime, deltaMs);

  // Phase 5: Process base damage ticks
  processEnemyAttacks(runtime, deltaMs);

  // Phase 6: Process spawns
  processSpawns(runtime, deltaMs, options.random ?? Math.random);

  // Phase 7: Calculate enemies remaining
  runtime.wave.enemiesRemaining = calculateEnemiesRemaining(runtime);

  // Phase 8: Evaluate outcome
  evaluateOutcome(runtime);
}
```

**Dependencies:** Imports from `CombatRuntime.ts`, `CombatRotation.ts`, `CombatActivation.ts`, `CombatEnemyMovement.ts`, `CombatEnemyAttacks.ts`, `CombatSpawnManager.ts`, `CombatOutcome.ts`.

### 4.3. CombatRotation.ts (new)

**Responsibility:** Record angle advancement and slot crossing detection.

**Imports:** `CombatBalanceConfig`, `COMBAT_SLOT_COUNT`, `COMBAT_NEEDLE_ANGLE_DEGREES` from `./CombatLayout.js` (or wherever these constants live).

**Public API:**
```ts
export interface SlotCrossing {
  slotIndex: number;
  crossingAngle: number;
}

export function advanceRotation(
  runtime: CombatRuntime,
  deltaMs: number,
): SlotCrossing[];

export function detectSlotCrossings(
  slot: CombatSlotRuntime,
  previousAngle: number,
  currentAngle: number,
): SlotCrossing[];
```

**`advanceRotation` implementation logic:**
1. Save `runtime.record.currentAngle` to `runtime.record.previousAngle`
2. Compute `angleChange = runtime.record.rotationSpeedDegPerSecond * (deltaMs / 1000)`
3. Set `runtime.record.currentAngle -= angleChange`
4. Collect crossings by calling `detectSlotCrossings` for each slot
5. Return the sorted crossings (sorted by `crossingAngle` descending, as the original code does)

**`detectSlotCrossings` implementation logic (pure function):**
1. If `sectorCenterAngleDeg === null` or `currentAngle >= previousAngle`, return `[]`
2. Compute `baseCrossingAngle = COMBAT_NEEDLE_ANGLE_DEGREES - sectorCenterAngleDeg`
3. Compute `firstCycle = Math.floor((currentAngle - baseCrossingAngle) / 360)`
4. Compute `lastCycle = Math.floor((previousAngle - baseCrossingAngle) / 360)`
5. For each `cycle` from `firstCycle` to `lastCycle` inclusive:
   - Compute `crossingAngle = baseCrossingAngle + cycle * 360`
   - If `crossingAngle <= previousAngle && crossingAngle > currentAngle`, add `{ slotIndex, crossingAngle }` to results
6. Return results

**Key invariant:** The crossing detection must handle the case where the record rotates more than 360° in a single frame (multiple crossings).

### 4.4. CombatActivation.ts (new)

**Responsibility:** Resolve pawn activations for crossed slots, mutate note packet, emit events.

**Imports:**
- `CombatContentConfig` (for `PAWN_DEFINITIONS`, `WEAKNESS_ADVANTAGE`)
- `CombatBalanceConfig` (for `NOTE_PACKET_CAPACITY`, `FINISHER_CONSUMED_NOTES_MULTIPLIER`, `WEAKNESS_MULTIPLIER`)
- `CombatRuntime` types from `./CombatRuntime.js`

**Public API:**
```ts
export function resolveActivations(
  runtime: CombatRuntime,
  crossings: SlotCrossing[],
): void;
```

**`resolveActivations` implementation logic:**
1. Build `pawnDefinitionsById: Map<string, CombatPawnDefinition>` from `CombatContentConfig.PAWN_DEFINITIONS`
2. For each crossing (sorted by `crossingAngle` descending):
   a. Get the slot: `const slot = runtime.slots[crossing.slotIndex]`
   b. Skip if slot is null
   c. Set `slot.activationVisualState = 'active'`
   d. Add `runtime.effects.transientIds.push(\`slot-activated:\${slot.slotIndex}\`)`
   e. Push `combat:slot-activated` event to `runtime.effects.pendingEvents`
   f. If `slot.pawnId === null`, continue (empty slot)
   g. Get pawn definition: `const pawn = pawnDefinitionsById.get(slot.pawnId)`
   h. If pawn is null, continue
   i. Push `combat:pawn-resolved` event with `{ slotIndex, pawnId: pawn.id, pawnType: pawn.type }`
   j. If `pawn.type === 'generator'`: call `resolveGeneratorActivation(runtime, slot, pawn)`
   k. If `pawn.type === 'finisher'`: call `resolveFinisherActivation(runtime, slot, pawn as CombatFinisherPawnDefinition)`

**`resolveGeneratorActivation` implementation logic:**
1. Call `selectNearestLivingEnemy(runtime, slot.worldPosition)` → `target`
2. If `target` exists:
   a. Call `resolveWeakness(pawn.color, target.color)` → `weaknessMultiplier`
   b. Compute `damage = Math.round(pawn.baseDamage * weaknessMultiplier)`
   c. Set `target.currentHp = Math.max(0, target.currentHp - damage)`
   d. Push `combat:enemy-hit` event
   e. If `target.currentHp <= 0 && target.state !== 'dead'`:
      - Set `target.state = 'dead'`
      - Decrement `runtime.wave.enemiesRemaining`
      - Push `combat:enemy-died` event
3. Call `applyGeneratorPacketMutation(runtime, slot, pawn.id, pawn.color)`

**`resolveFinisherActivation` implementation logic:**
1. Call `getFinisherConsumedNotes(runtime, pawn.color)` → `consumedNotes`
2. Call `getFinisherConsumedNotesMultiplier(consumedNotes)` → `consumedMultiplier`
3. Compute `baseDamage = Math.round(pawn.baseDamage * consumedMultiplier)`
4. Call `selectNearestLivingEnemy(runtime, slot.worldPosition)` → `target`
5. If `target` exists:
   a. Call `resolveWeakness(pawn.color, target.color)` → `weaknessMultiplier`
   b. Compute `damage = Math.round(baseDamage * weaknessMultiplier)`
   c. Set `target.currentHp = Math.max(0, target.currentHp - damage)`
   d. Push `combat:enemy-hit` event
   e. If `target.currentHp <= 0 && target.state !== 'dead'`:
      - Set `target.state = 'dead'`
      - Decrement `runtime.wave.enemiesRemaining`
      - Push `combat:enemy-died` event
6. Push `combat:finisher-consumed-notes` event
7. Call `applyFinisherPacketMutation(runtime, slot, pawn)`

**`selectNearestLivingEnemy` implementation logic:**
1. If `origin === null`, return `null`
2. Initialize `nearestEnemy = null`, `nearestDistance = Infinity`
3. For each enemy in `runtime.enemies`:
   - Skip if `!enemy.spawned || enemy.state === 'dead' || enemy.currentHp <= 0`
   - Compute `distance = hypot(enemy.x - origin.x, enemy.y - origin.y)`
   - If `distance < nearestDistance`: set `nearestEnemy = enemy`, `nearestDistance = distance`
4. Return `nearestEnemy`

**`resolveWeakness` implementation logic:**
1. Get `weakTarget = CombatContentConfig.WEAKNESS_ADVANTANCE[attackerColor]`
2. Return `weakTarget === targetColor ? CombatBalanceConfig.WEAKNESS_MULTIPLIER : 1`

**`applyGeneratorPacketMutation` implementation logic:**
1. Save `previousColor = runtime.notePacket.color`, `previousCount = runtime.notePacket.count`
2. If `previousColor === null || previousCount <= 0`:
   - Call `setCombatNotePacket(runtime, color, 2)`
   - Push `combat:generator-notes-emitted` event with `count: 2`
   - Push `combat:note-packet-changed` event
   - Return
3. If `previousColor === color`:
   - Compute `nextCount = min(previousCount + 2, NOTE_PACKET_CAPACITY)`
   - Compute `emittedNotes = max(0, nextCount - previousCount)`
   - Call `setCombatNotePacket(runtime, color, nextCount)`
   - Push `combat:generator-notes-emitted` event with `count: emittedNotes`
   - Push `combat:note-packet-changed` event
   - Return
4. (Color mismatch — packet break)
   - Push `combat:note-packet-color-broke` event with `{ previousColor, nextColor: color }`
   - Call `setCombatNotePacket(runtime, color, 2)`
   - Push `combat:generator-notes-emitted` event with `count: 2`
   - Push `combat:note-packet-changed` event

**`applyFinisherPacketMutation` implementation logic:**
1. If `runtime.notePacket.color !== null && runtime.notePacket.color !== pawn.color`:
   - Push `combat:note-packet-color-broke` event with `{ previousColor: runtime.notePacket.color, nextColor: pawn.outputNoteColor }`
2. Call `setCombatNotePacket(runtime, pawn.outputNoteColor, 1)`
3. Push `combat:finisher-output-note-emitted` event with `{ slotIndex, pawnId: pawn.id, color: pawn.outputNoteColor, count: 1 }`
4. Push `combat:note-packet-changed` event

**`getFinisherConsumedNotes` implementation logic:**
1. If `runtime.notePacket.color !== pawn.color || runtime.notePacket.count <= 0`, return `0`
2. Return `min(runtime.notePacket.count, NOTE_PACKET_CAPACITY)`

**`getFinisherConsumedNotesMultiplier` implementation logic:**
1. Normalize: `normalized = max(0, min(consumedNotes, FINISHER_CONSUMED_NOTES_MULTIPLIER.length - 1))`
2. Return `FINISHER_CONSUMED_NOTES_MULTIPLIER[normalized] ?? 0.75`

**Helper — `pushNotePacketChangedEvent`:**
```ts
runtime.effects.pendingEvents.push({
  event: 'combat:note-packet-changed',
  payload: { color: runtime.notePacket.color, count: runtime.notePacket.count },
});
```

**Helper — `pushGeneratorNotesEmittedEvent`:**
```ts
runtime.effects.pendingEvents.push({
  event: 'combat:generator-notes-emitted',
  payload: { slotIndex, pawnId, color, count },
});
```

### 4.5. CombatEnemyMovement.ts (new)

**Responsibility:** Enemy movement toward base and moving→attacking state transitions.

**Imports:**
- `CombatLayoutConfig` (for `ENEMY_ZONE_TOP`, `ENEMY_ZONE_BOTTOM`, etc.)
- `CombatContentConfig` (for `ENEMY_DEFINITIONS`)
- `CombatRuntime` types from `./CombatRuntime.js`

**Public API:**
```ts
export function advanceEnemyMovement(
  runtime: CombatRuntime,
  deltaMs: number,
): void;
```

**`advanceEnemyMovement` implementation logic:**
1. Build `enemyDefinitionsById: Map<string, CombatEnemyDefinition>` from `CombatContentConfig.ENEMY_DEFINITIONS`
2. Get layout from `createCombatLayoutPlan()` (or inline the base position values)
3. For each enemy in `runtime.enemies`:
   a. Skip if `!enemy.spawned`
   b. Get definition: `const def = enemyDefinitionsById.get(enemy.definitionId)`
   c. Skip if definition is null
   d. If `enemy.state === 'attacking'`:
      - Continue (base attacks are handled in `CombatEnemyAttacks`)
   e. If `enemy.state !== 'moving'`, continue
   f. Compute `distanceToBase = hypot(enemy.x - base.x, enemy.y - base.y)`
   g. If `distanceToBase <= def.attackRangePx`:
      - Clamp enemy position to attack range: `enemy.y = clampEnemyToAttackRange(enemy.x, base.x, base.y, def.attackRangePx)`
      - Set `enemy.state = 'attacking'`
      - Set `enemy.nextAttackAtMs = runtime.combatElapsedMs + def.attackCooldownMs`
      - Continue
   h. Compute step: `stepPx = def.moveSpeedPxPerSec * (deltaMs / 1000)`
   i. Compute `nextY = enemy.y + stepPx`
   j. Compute `nextDistanceToBase = hypot(enemy.x - base.x, nextY - base.y)`
   k. If `nextDistanceToBase <= def.attackRangePx`:
      - Clamp: `enemy.y = clampEnemyToAttackRange(enemy.x, base.x, base.y, def.attackRangePx)`
      - Set `enemy.state = 'attacking'`
      - Set `enemy.nextAttackAtMs = runtime.combatElapsedMs + def.attackCooldownMs`
      - Continue
   l. Otherwise: `enemy.y = nextY`

**`clampEnemyToAttackRange` implementation logic:**
1. Compute `deltaX = enemyX - baseX`
2. Compute `maxDeltaY = sqrt(max(attackRangePx² - deltaX², 0))`
3. Return `baseY - maxDeltaY`

### 4.6. CombatEnemyAttacks.ts (new)

**Responsibility:** Periodic base damage ticks from enemies in the 'attacking' state.

**Imports:**
- `CombatContentConfig` (for enemy definition attack cooldown/damage)
- `CombatBalanceConfig` (for `BASE_HP`)
- `CombatRuntime` types from `./CombatRuntime.js`

**Public API:**
```ts
export function processEnemyAttacks(
  runtime: CombatRuntime,
  deltaMs: number,
): void;
```

**`processEnemyAttacks` implementation logic:**
1. Build `enemyDefinitionsById: Map<string, CombatEnemyDefinition>` from `CombatContentConfig.ENEMY_DEFINITIONS`
2. For each enemy in `runtime.enemies`:
   a. Skip if `enemy.state !== 'attacking'`
   b. Get definition: `const def = enemyDefinitionsById.get(enemy.definitionId)`
   c. Skip if definition is null
   d. If `enemy.nextAttackAtMs <= 0`:
      - Set `enemy.nextAttackAtMs = def.attackCooldownMs`
      - Continue
   e. While `runtime.combatElapsedMs >= enemy.nextAttackAtMs`:
      - Set `runtime.baseHp = max(0, runtime.baseHp - def.attackDamage)`
      - Push `combat:base-damaged` event with `{ current: runtime.baseHp, max: BASE_HP }`
      - Push `combat:hud-base-hp-updated` event with `{ current: runtime.baseHp, max: BASE_HP }`
      - If `runtime.baseHp <= 0`:
        - Call `setCombatState(runtime, 'defeat')`
        - `return` (exit the function early)
      - Set `enemy.nextAttackAtMs += def.attackCooldownMs`

**Important:** The early `return` on defeat is critical — it prevents processing further enemies in the same tick after the base has fallen.

### 4.7. CombatSpawnManager.ts (new)

**Responsibility:** Spawn bag processing and enemy placement on the field.

**Imports:**
- `CombatLayoutConfig` (for `ENEMY_SPAWN_Y`, `ENEMY_SPAWN_X_MIN`, `ENEMY_SPAWN_X_MAX`)
- `CombatBalanceConfig` (for `ENEMY_SPAWN_MIN_GAP_PX`, `ENEMY_SPAWN_ATTEMPTS`)
- `CombatRuntime` types from `./CombatRuntime.js`

**Public API:**
```ts
export function processSpawns(
  runtime: CombatRuntime,
  deltaMs: number,
  random: () => number,
): void;
```

**`processSpawns` implementation logic:**
1. For each `subWave` in `runtime.wave.activeSubWaves`:
   a. Get `bag = runtime.wave.spawnBags.get(subWave.id)`
   b. Skip if bag is null
   c. While `bag.enemyRuntimeIds.length > 0 && runtime.waveElapsedMs >= bag.nextSpawnAtMs`:
      - `const enemyRuntimeId = bag.enemyRuntimeIds.shift()`
      - Find enemy: `const enemy = runtime.enemies.find(e => e.runtimeId === enemyRuntimeId)`
      - Skip if enemy is null
      - Set `enemy.spawned = true`
      - Set `enemy.state = 'moving'`
      - Set `enemy.nextAttackAtMs = 0`
      - Set `enemy.x = selectEnemySpawnX(random, runtime.spawn.lastSpawnX)`
      - Set `enemy.y = CombatLayoutConfig.ENEMY_SPAWN_Y`
      - Set `runtime.spawn.lastSpawnX = enemy.x`
      - Set `bag.nextSpawnAtMs += bag.intervalMs`

**`selectEnemySpawnX` implementation logic:**
1. Set `fallbackX = CombatLayoutConfig.ENEMY_SPAWN_X_MIN`
2. For `attempt` from 0 to `ENEMY_SPAWN_ATTEMPTS - 1`:
   a. Compute `candidateX = round(ENEMY_SPAWN_X_MIN + random() * (ENEMY_SPAWN_X_MAX - ENEMY_SPAWN_X_MIN))`
   b. Set `fallbackX = candidateX`
   c. If `lastSpawnX === null || abs(candidateX - lastSpawnX) >= ENEMY_SPAWN_MIN_GAP_PX`:
      - Return `candidateX`
3. Return `fallbackX`

### 4.8. CombatOutcome.ts (new)

**Responsibility:** Victory and defeat condition evaluation.

**Imports:**
- `CombatRuntime` types from `./CombatRuntime.js`
- `setCombatState` from `./CombatRuntime.js`

**Public API:**
```ts
export function evaluateOutcome(runtime: CombatRuntime): void;
```

**`evaluateOutcome` implementation logic:**
1. If `runtime.state !== 'running'`, return (only evaluate during running state)
2. Check **victory** conditions:
   a. `allSubWavesActivated = runtime.wave.pendingSubWaves.length === 0`
   b. `allBagsEmpty = all spawnBags have empty enemyRuntimeIds`
   c. `noLivingEnemies = all enemies are either not spawned or are dead`
   d. If all three are true: call `setCombatState(runtime, 'victory')`
3. Check **defeat** conditions:
   a. If `runtime.baseHp <= 0`: call `setCombatState(runtime, 'defeat')`

**Note:** Defeat is also checked inside `processEnemyAttacks` (early return path). This check in `evaluateOutcome` is a safety net for cases where base HP reaches 0 through other means (e.g., future mechanics).

---

## 5. Import Graph After Refactoring

```
CombatRuntime.ts
├── CombatContentConfig
├── CombatBalanceConfig
├── CombatLayoutConfig
├── CombatLayout (for COMBAT_SLOT_COUNT, COMBAT_NEEDLE_ANGLE_DEGREES, createCombatLayoutPlan)
└── CombatEnemyRuntimeFactory (for createCombatEnemyRuntimes)

CombatRuntimeAdvance.ts
├── CombatRuntime (setCombatState, resetSlotActivationEffects, calculateEnemiesRemaining)
├── CombatRotation (advanceRotation)
├── CombatActivation (resolveActivations)
├── CombatEnemyMovement (advanceEnemyMovement)
├── CombatEnemyAttacks (processEnemyAttacks)
├── CombatSpawnManager (processSpawns)
└── CombatOutcome (evaluateOutcome)

CombatRotation.ts
├── CombatRuntime (CombatSlotRuntime, CombatRuntime)
└── CombatLayout (COMBAT_SLOT_COUNT, COMBAT_NEEDLE_ANGLE_DEGREES)

CombatActivation.ts
├── CombatRuntime (CombatRuntime, CombatSlotRuntime, CombatFinisherPawnDefinition, NoteColor, setCombatNotePacket)
├── CombatContentConfig (PAWN_DEFINITIONS, WEAKNESS_ADVANTAGE)
└── CombatBalanceConfig (NOTE_PACKET_CAPACITY, FINISHER_CONSUMED_NOTES_MULTIPLIER, WEAKNESS_MULTIPLIER)

CombatEnemyMovement.ts
├── CombatRuntime (CombatRuntime, CombatEnemyRuntime)
├── CombatLayoutConfig (ENEMY_ZONE_TOP, ENEMY_ZONE_BOTTOM)
├── CombatContentConfig (ENEMY_DEFINITIONS)
└── CombatLayout (createCombatLayoutPlan or base position constants)

CombatEnemyAttacks.ts
├── CombatRuntime (CombatRuntime, setCombatState)
├── CombatContentConfig (ENEMY_DEFINITIONS)
└── CombatBalanceConfig (BASE_HP)

CombatSpawnManager.ts
├── CombatRuntime (CombatRuntime, CombatSubWaveSpawnBag)
├── CombatLayoutConfig (ENEMY_SPAWN_Y, ENEMY_SPAWN_X_MIN, ENEMY_SPAWN_X_MAX)
└── CombatBalanceConfig (ENEMY_SPAWN_MIN_GAP_PX, ENEMY_SPAWN_ATTEMPTS)

CombatOutcome.ts
├── CombatRuntime (CombatRuntime, setCombatState)
```

**No circular dependencies.** `CombatRuntimeAdvance.ts` is the only file that imports from all sub-modules. All sub-modules only import from `CombatRuntime.ts` (for types and `setCombatState`) and config/layout files.

---

## 6. Implementation Steps

### Step 1: Create `CombatRotation.ts`

**What to do:**
1. Create `src/combat/CombatRotation.ts`
2. Move `COMBAT_SLOT_COUNT`, `COMBAT_NEEDLE_ANGLE_DEGREES` imports from `./CombatLayout.js` (they already live there)
3. Move `collectCrossingsForSlot` → rename to `detectSlotCrossings`, make it a pure function with explicit parameters
4. Create `advanceRotation` that:
   - Saves `currentAngle` to `previousAngle`
   - Computes new `currentAngle`
   - Calls `detectSlotCrossings` for each slot
   - Returns sorted crossings (descending by `crossingAngle`)
5. Export both functions

**Verification:** Run `npx tsc --noEmit`. Check that no other file references `collectCrossingsForSlot`.

### Step 2: Create `CombatOutcome.ts`

**What to do:**
1. Create `src/combat/CombatOutcome.ts`
2. Move `evaluateVictory` logic → rename to `evaluateOutcome`, add defeat check
3. Export `evaluateOutcome`

**Verification:** Run `npx tsc --noEmit`.

### Step 3: Create `CombatSpawnManager.ts`

**What to do:**
1. Create `src/combat/CombatSpawnManager.ts`
2. Move `bootstrapEnemySpawns` → rename to `processSpawns`
3. Move `selectEnemySpawnX`
4. Export both functions

**Verification:** Run `npx tsc --noEmit`.

### Step 4: Create `CombatEnemyMovement.ts`

**What to do:**
1. Create `src/combat/CombatEnemyMovement.ts`
2. Move `updateEnemyPressure` → rename to `advanceEnemyMovement`, remove the `updateEnemyBaseAttacks` call from inside it
3. Move `clampEnemyToAttackRange`
4. Remove the base attack loop from `advanceEnemyMovement` (that moves to `CombatEnemyAttacks`)
5. Export `advanceEnemyMovement`

**Verification:** Run `npx tsc --noEmit`.

### Step 5: Create `CombatEnemyAttacks.ts`

**What to do:**
1. Create `src/combat/CombatEnemyAttacks.ts`
2. Move `updateEnemyBaseAttacks` → rename to `processEnemyAttacks`
3. Expand it to iterate over ALL attacking enemies (the original only handled one enemy at a time)
4. Export `processEnemyAttacks`

**Verification:** Run `npx tsc --noEmit`.

### Step 6: Create `CombatActivation.ts`

**What to do:**
1. Create `src/combat/CombatActivation.ts`
2. Move all activation-related functions:
   - `processCrossedSlots` → rename to `resolveActivations` (accepts crossings as parameter)
   - `resolveGeneratorSlotActivation` → `resolveGeneratorActivation`
   - `resolveFinisherSlotActivation` → `resolveFinisherActivation`
   - `applyGeneratorPacketMutation` → `applyGeneratorPacketMutation`
   - `applyFinisherPacketMutation` → `applyFinisherPacketMutation`
   - `getFinisherConsumedNotes` → `getFinisherConsumedNotes`
   - `getFinisherConsumedNotesMultiplier` → `getFinisherConsumedNotesMultiplier`
   - `selectNearestLivingEnemy` → `selectNearestLivingEnemy`
   - `resolveWeakness` → `resolveWeakness`
   - `pushNotePacketChangedEvent` → `pushNotePacketChangedEvent`
   - `pushGeneratorNotesEmittedEvent` → `pushGeneratorNotesEmittedEvent`
3. All functions receive `runtime` as a parameter (no module-level state)
4. Export `resolveActivations`

**Verification:** Run `npx tsc --noEmit`.

### Step 7: Rewrite `CombatRuntime.ts`

**What to do:**
1. Keep all type definitions exactly as they are
2. Keep `createCombatRuntime` exactly as it is
3. Keep `setCombatState` exactly as it is
4. Keep `setCombatNotePacket` exactly as it is
5. Keep `getSlotWorldPosition`, `shuffleArray`, `activateSubWave`, `activatePendingSubWaves` as internal helpers
6. Remove `advanceCombatRuntime` (moves to `CombatRuntimeAdvance.ts`)
7. Remove `advanceRotation`, `collectCrossingsForSlot` (moves to `CombatRotation.ts`)
8. Remove all activation functions (move to `CombatActivation.ts`)
9. Remove `updateEnemyPressure`, `updateEnemyBaseAttacks`, `clampEnemyToAttackRange` (move to `CombatEnemyMovement.ts` / `CombatEnemyAttacks.ts`)
10. Remove `bootstrapEnemySpawns`, `selectEnemySpawnX` (move to `CombatSpawnManager.ts`)
11. Remove `evaluateVictory` (move to `CombatOutcome.ts`)
12. Remove `getDistance` — either inline it where needed or add to a shared utils file
13. Add `resetSlotActivationEffects` (extracted from current `advanceCombatRuntime`)
14. Add `calculateEnemiesRemaining` (extracted from current `advanceCombatRuntime`)
15. Remove `activatePendingSubWaves` call from `createCombatRuntime` — wait, this IS used in the factory. Keep it.

**Verification:** Run `npx tsc --noEmit`. The file should be significantly shorter (~150-200 lines).

### Step 8: Create `CombatRuntimeAdvance.ts`

**What to do:**
1. Create `src/combat/CombatRuntimeAdvance.ts`
2. Implement the thin pipeline as specified in Section 4.2
3. Import all sub-module functions
4. Export `advanceCombatRuntime`

**Verification:** Run `npx tsc --noEmit`.

### Step 9: Update all import sites

**What to do:**
1. Find all files that import `advanceCombatRuntime` from `./CombatRuntime.js`
2. Update imports to `./CombatRuntimeAdvance.js`
3. Find all files that import `CombatRuntime` type — these stay as `./CombatRuntime.js`
4. Verify no remaining references to removed functions

**Verification:** Run `npx tsc --noEmit`. Run `npm run build`.

### Step 10: Run tests

**What to do:**
1. Run `npm test` (or whatever test command the project uses)
2. Fix any failing tests
3. The existing tests should still pass — the refactoring is purely internal

---

## 7. Files That Import CombatRuntime (Update Needed)

These files currently import from `CombatRuntime.ts` and need their imports updated:

| File | Current Import | Change |
|------|---------------|--------|
| `src/events/EventBus.ts` | `type { CombatState, NoteColor }` from `@combat/CombatRuntime` | No change (types only) |
| `src/systems/CombatStateSystem.ts` | `advanceCombatRuntime, type CombatRuntime` from `@combat/CombatRuntime` | Change `advanceCombatRuntime` import to `@combat/CombatRuntimeAdvance` |
| `src/scenes/combat/CombatScene.ts` | `createCombatRuntime, type CombatRuntime, CombatRuntime` from `@combat/CombatRuntime` | Change `advanceCombatRuntime` if imported; `createCombatRuntime` stays |
| `src/combat/CombatHudEvents.ts` | `type { CombatRuntime, CombatState }` from `./CombatRuntime` | No change (types only) |
| `src/combat/CombatHudBridge.ts` | `type { CombatRuntime, CombatState }` from `./CombatRuntime` | No change (types only) |
| `src/combat/CombatVfxSystem.ts` | `type { NoteColor }` from `./CombatRuntime` | No change (type only) |
| `src/combat/CombatRenderModel.ts` | No direct CombatRuntime import | No change |
| `src/combat/CombatSceneLifecycle.ts` | No CombatRuntime import | No change |
| `src/combat/CombatLayout.ts` | No CombatRuntime import | No change |
| `src/combat/CombatEnemyRuntimeFactory.ts` | `type { CombatEnemyRuntime }` from `./CombatRuntime` | No change (type only) |
| `src/combat/CombatNoteGlyph.ts` | No CombatRuntime import | No change |
| `src/combat/CombatVfxTextures.ts` | No CombatRuntime import | No change |
| `src/combat/CombatBaseHpBar.ts` | No CombatRuntime import | No change |
| `src/combat/CombatNotePacketView.ts` | No CombatRuntime import | No change |
| `src/combat/CombatVfxEventBridge.ts` | No CombatRuntime import | No change |
| `src/combat/CombatLayout.test.ts` | `type { CombatRuntime }` from `./CombatRuntime` | No change (type only) |
| `src/combat/CombatRuntime.test.ts` | `advanceCombatRuntime, createCombatRuntime, type CombatRuntime` from `./CombatRuntime` | Change `advanceCombatRuntime` import to `./CombatRuntimeAdvance` |
| `src/combat/CombatSceneLifecycle.test.ts` | `getCombatPresentationDelta` from `./CombatSceneLifecycle` | No change |
| `src/combat/CombatHudBridge.test.ts` | `createCombatHudBridgeEvents, createCombatStateTransitionEvents` from `./CombatHudBridge` | No change |
| `src/combat/CombatNotePacketView.test.ts` | `createCombatNotePacketViewModel` from `./CombatNotePacketView` | No change |
| `src/combat/CombatVfxSystem.test.ts` | `CombatVfxSystem` from `./CombatVfxSystem` | No change |
| `src/combat/CombatControlIntent.ts` | No CombatRuntime import | No change |
| `src/combat/CombatControlIntent.test.ts` | `resolveCombatControlIntent` from `./CombatControlIntent` | No change |
| `src/combat/CombatRenderModel.test.ts` | `createCombatRenderModel` from `./CombatRenderModel` | No change |
| `src/combat/CombatBaseHpBar.test.ts` | `getCombatBaseHpBarFillMetrics` from `./CombatBaseHpBar` | No change |
| `src/combat/CombatRuntime.test.ts` | `advanceCombatRuntime, createCombatRuntime, type CombatRuntime, setCombatState, setCombatNotePacket` from `./CombatRuntime` | Change `advanceCombatRuntime` import to `./CombatRuntimeAdvance` |

**Key change:** Only `advanceCombatRuntime` moves. Everything else (`createCombatRuntime`, `setCombatState`, `setCombatNotePacket`, types) stays in `CombatRuntime.ts`.

---

## 8. Testing Strategy

### 8.1. Existing tests

The project has existing tests in `src/combat/`:
- `CombatRuntime.test.ts` — tests `advanceCombatRuntime` and `createCombatRuntime`
- `CombatLayout.test.ts` — tests layout calculations
- `CombatSceneLifecycle.test.ts` — tests scene lifecycle
- `CombatHudBridge.test.ts` — tests HUD event generation
- `CombatNotePacketView.test.ts` — tests note packet view model
- `CombatVfxSystem.test.ts` — tests VFX system
- `CombatControlIntent.test.ts` — tests control intent resolution
- `CombatRenderModel.test.ts` — tests render model generation
- `CombatBaseHpBar.test.ts` — tests HP bar fill metrics

These tests should continue to pass after the refactoring. The public API (`createCombatRuntime`, `advanceCombatRuntime`, types) is unchanged.

### 8.2. New tests to add (optional, after refactoring)

After the refactoring, new focused tests can be added:

**CombatRotation.test.ts:**
- `detectSlotCrossings returns empty when no crossing`
- `detectSlotCrossings returns one crossing when slot passes needle`
- `detectSlotCrossings returns two crossings when record rotates more than 360°`
- `detectSlotCrossings returns empty when sectorCenterAngleDeg is null`
- `detectSlotCrossings returns empty when currentAngle >= previousAngle`

**CombatActivation.test.ts:**
- `resolveActivations emits slot-activated event for crossed slot`
- `resolveActivations emits pawn-resolved event with correct pawnType`
- `resolveActivations skips empty slots (pawnId === null)`
- `resolveGeneratorActivation emits generator-notes-emitted with count 2`
- `resolveGeneratorActivation emits enemy-hit when nearest enemy exists`
- `resolveGeneratorActivation applies weakness multiplier`
- `resolveGeneratorActivation does not emit events when no living enemy`
- `resolveFinisherActivation emits finisher-consumed-notes with correct consumed count`
- `resolveFinisherActivation applies consumed notes multiplier to damage`
- `resolveFinisherActivation emits finisher-output-note-emitted`
- `applyGeneratorPacketMutation creates new packet when previous is empty`
- `applyGeneratorPacketMutation extends packet when same color`
- `applyGeneratorPacketMutation clamps to capacity 5`
- `applyGeneratorPacketMutation breaks color and emits note-packet-color-broke`
- `applyFinisherPacketMutation breaks color when different`
- `applyFinisherPacketMutation sets output note color`
- `getFinisherConsumedNotes returns 0 when color mismatch`
- `getFinisherConsumedNotesMultiplier returns correct multiplier for 0-5 notes`

**CombatEnemyMovement.test.ts:**
- `advanceEnemyMovement moves enemy toward base at correct speed`
- `advanceEnemyMovement transitions to attacking when within range`
- `advanceEnemyMovement does not move dead enemies`
- `advanceEnemyMovement does not move unspawned enemies`
- `clampEnemyToAttackRange clamps Y to maintain attack range distance`

**CombatEnemyAttacks.test.ts:**
- `processEnemyAttacks deals damage to base at correct intervals`
- `processEnemyAttacks emits base-damaged event`
- `processEnemyAttacks sets state to defeat when base HP reaches 0`
- `processEnemyAttacks handles multiple attacking enemies`

**CombatSpawnManager.test.ts:**
- `processSpawns spawns enemies at correct time`
- `processSpawns places enemies at ENEMY_SPAWN_Y`
- `processSpawns respects ENEMY_SPAWN_MIN_GAP_PX`
- `processSpawns shifts enemyRuntimeIds from bag`

**CombatOutcome.test.ts:**
- `evaluateOutcome does nothing when state is not running`
- `evaluateOutcome sets victory when all conditions met`
- `evaluateOutcome does not set victory when enemies remain`
- `evaluateOutcome does not set victory when bags are not empty`
- `evaluateOutcome does not set victory when pending sub-waves exist`

### 8.3. Test verification command

After all steps are complete, run:
```bash
npx tsc --noEmit
npm test
```

---

## 9. Edge Cases and Gotchas

### 9.1. Multiple slot crossings in one frame

When the record rotates fast (e.g., during FastForward), multiple slots can cross the needle in one frame. The `detectSlotCrossings` function must correctly compute all crossing angles, and `resolveActivations` must process them in the correct order (descending by `crossingAngle`, which means the slot that crossed most recently is processed first).

### 9.2. Record angle wrapping

The record angle decreases over time (counter-clockwise rotation). It can go negative and keep decreasing. The crossing detection math must handle this correctly — it uses floor division by 360, which works for negative numbers in JavaScript (unlike some other languages).

### 9.3. Defeat early return

`processEnemyAttacks` has an early `return` when the base reaches 0 HP. This is critical: if the base dies during enemy 1's attack tick, we must NOT process enemy 2's attack in the same frame. The `evaluateOutcome` function also checks for defeat as a safety net.

### 9.4. Spawn bag empty check

`processSpawns` uses `bag.enemyRuntimeIds.shift()` in a while loop. The while condition checks `bag.enemyRuntimeIds.length > 0`, so this is safe — we never shift from an empty array.

### 9.5. Note packet clamping

`setCombatNotePacket` clamps the count to `[0, NOTE_PACKET_CAPACITY]`. If count exceeds capacity, excess notes are silently dropped. The function also emits a console warning. This behavior must be preserved exactly.

### 9.6. Preview state transition

When the preview timer expires, `advanceCombatRuntime` calls `setCombatState(runtime, 'running')`. This happens inside the preview branch, BEFORE any sub-module calls. The sub-modules will NOT be called in preview state.

### 9.7. `resetSlotActivationEffects` must be called BEFORE `advanceRotation`

The reset clears `transientIds` and `pendingEvents` for the new frame. If it were called after activation, the events from the current frame would be lost. This ordering is critical.

### 9.8. `calculateEnemiesRemaining` is called AFTER `processSpawns`

Spawning new enemies increases the count. If `calculateEnemiesRemaining` were called before `processSpawns`, it would return a stale count.

### 9.9. `getDistance` utility

The `getDistance` function is used in multiple places. After the refactor, it will be needed in:
- `CombatActivation.ts` (in `selectNearestLivingEnemy`)
- `CombatEnemyMovement.ts` (in `advanceEnemyMovement`)

Consider creating a small `src/combat/utils.ts` with `getDistance`, or duplicating it in both files. Duplicating is acceptable for a 3-line function.

### 9.10. `createCombatLayoutPlan` import

`CombatEnemyMovement.ts` needs the base position. Currently, `updateEnemyPressure` calls `createCombatLayoutPlan()`. After the split, `advanceEnemyMovement` needs the same. Import `createCombatLayoutPlan` from `./CombatLayout.js` in `CombatEnemyMovement.ts`.

---

## 10. Verification Checklist

After completing all steps, verify:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all existing tests
- [ ] No circular dependencies (check with `madge --circular src/` if available)
- [ ] `CombatRuntime.ts` is ~150-200 lines (down from ~570)
- [ ] `CombatRuntimeAdvance.ts` is ~40 lines (thin pipeline)
- [ ] All imports resolve correctly
- [ ] No references to removed functions (`collectCrossingsForSlot`, `bootstrapEnemySpawns`, `updateEnemyPressure`, `updateEnemyBaseAttacks`, `evaluateVictory`, `clampEnemyToAttackRange`, `selectEnemySpawnX`, `getDistance` as a top-level function in CombatRuntime)
- [ ] The game runs correctly in the browser (open `index.html` and verify combat works)

---

## 11. What This Does NOT Change

- **`CombatRuntime` type** — unchanged, same shape, same fields
- **`createCombatRuntime`** — unchanged, same initial state
- **`setCombatState`** — unchanged
- **`setCombatNotePacket`** — unchanged
- **Game behavior** — identical. This is a pure refactoring.
- **Event names and payloads** — unchanged
- **Config files** — unchanged
- **Scene files** — unchanged (only the import path for `advanceCombatRuntime`)
- **Test assertions** — unchanged (same public API)

---

## 12. Future Deepening (Out of Scope)

These are opportunities identified during this design but explicitly scoped out:

- Extract note packet mutation into its own module (`CombatNotePacket.ts`)
- Extract pawn definition lookup into a cache module
- Replace `EventBus` global singleton with a testable interface
- Split `CombatScene` god scene into `CombatLayoutPresenter` + `CombatVfxPresenter`
- Replace `CombatVfxSystem` switch with a dispatch table

These can be addressed in future ADRs.
