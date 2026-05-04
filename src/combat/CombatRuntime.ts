import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import {
  CombatContentConfig,
  type CombatFinisherPawnDefinition,
} from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatWaveConfig, type CombatSubWaveConfig } from '@config/CombatWaveConfig';
import {
  COMBAT_NEEDLE_ANGLE_DEGREES,
  createCombatLayoutPlan,
} from './CombatLayout';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import type { CombatWaveDefinition } from '@config/CombatWaveConfig';

export type CombatState = 'preview' | 'running' | 'paused' | 'victory' | 'defeat';
export type NoteColor = (typeof CombatContentConfig.NOTE_COLORS)[number];
export type CombatEnemyState = 'moving' | 'attacking' | 'dead';

export interface CombatSlotRuntime {
  slotIndex: number;
  pawnId: string | null;
  worldPosition: { x: number; y: number } | null;
  sectorCenterAngleDeg: number | null;
  activationVisualState: 'idle' | 'pending' | 'active';
}

export interface CombatNotePacketRuntime {
  color: NoteColor | null;
  count: number;
  visuals: string[];
}

export interface CombatEnemyRuntime {
  runtimeId: string;
  definitionId: string;
  archetype: string;
  color: NoteColor;
  currentHp: number;
  maxHp: number;
  x: number;
  y: number;
  state: CombatEnemyState;
  spawned: boolean;
  nextAttackAtMs: number;
  renderContainerName: string;
}

export interface CombatSubWaveSpawnBag {
  enemyRuntimeIds: string[];
  nextSpawnAtMs: number;
  intervalMs: number;
}

export interface CombatWaveRuntime {
  currentWaveIndex: number;
  totalWaves: number;
  currentWaveId: string | null;
  activeSubWaves: CombatSubWaveConfig[];
  pendingSubWaves: CombatSubWaveConfig[];
  spawnBags: Map<string, CombatSubWaveSpawnBag>;
  enemiesRemaining: number;
}

export interface CombatRuntime {
  state: CombatState;
  combatElapsedMs: number;
  waveElapsedMs: number;
  spawn: {
    pendingEnemyRuntimeIds: string[];
    nextSpawnAtMs: number;
    lastSpawnX: number | null;
    intervalMs: number;
  };
  preview: {
    elapsedMs: number;
    durationMs: number;
  };
  baseHp: number;
  record: {
    currentAngle: number;
    previousAngle: number;
    rotationSpeedDegPerSecond: number;
    startAngle: number;
  };
  slots: CombatSlotRuntime[];
  notePacket: CombatNotePacketRuntime;
  enemies: CombatEnemyRuntime[];
  wave: CombatWaveRuntime;
  outcome: {
    victory: boolean;
    defeat: boolean;
  };
  effects: {
    transientIds: string[];
    pendingEvents: Array<
      | {
        event: 'combat:slot-activated';
        payload: { slotIndex: number };
      }
      | {
        event: 'combat:base-damaged';
        payload: { current: number; max: number };
      }
      | {
        event: 'combat:hud-base-hp-updated';
        payload: { current: number; max: number };
      }
      | {
        event: 'combat:pawn-resolved';
        payload: { slotIndex: number; pawnId: string; pawnType: 'generator' | 'finisher' };
      }
      | {
        event: 'combat:enemy-hit';
        payload: {
          enemyId: string;
          slotIndex: number;
          attackerColor: NoteColor;
          damage: number;
          currentHp: number;
          maxHp: number;
          wasWeaknessHit: boolean;
        };
      }
      | {
        event: 'combat:enemy-died';
        payload: { enemyId: string; remaining: number };
      }
      | {
        event: 'combat:note-packet-changed';
        payload: { color: NoteColor | null; count: number };
      }
      | {
        event: 'combat:note-packet-color-broke';
        payload: { previousColor: NoteColor; nextColor: NoteColor };
      }
      | {
        event: 'combat:finisher-consumed-notes';
        payload: {
          slotIndex: number;
          pawnId: string;
          color: NoteColor;
          consumedNotes: number;
          multiplier: number;
        };
      }
      | {
        event: 'combat:generator-notes-emitted';
        payload: {
          slotIndex: number;
          pawnId: string;
          color: NoteColor;
          count: number;
        };
      }
      | {
        event: 'combat:finisher-output-note-emitted';
        payload: {
          slotIndex: number;
          pawnId: string;
          color: NoteColor;
          count: 1;
        };
      }
    >;
  };
}

interface CombatRuntimeAdvanceOptions {
  random?: () => number;
}

export function createCombatRuntime(
  random: () => number = Math.random,
): CombatRuntime {
  const initialWave = CombatWaveConfig.WAVES[0];
  const startAngle = initialWave?.startAngleDeg ?? CombatBalanceConfig.RECORD_START_ANGLE_DEG;
  const layout = createCombatLayoutPlan();
  const slotAnchorRadius = layout.record.radius * 0.75;
  const slotPreset =
    CombatContentConfig.SLOT_PRESETS.find((preset) => preset.id === initialWave?.slotPresetId)
    ?? null;
  const enemies = createCombatEnemyRuntimes(initialWave as CombatWaveDefinition);

  const runtime: CombatRuntime = {
    state: 'preview',
    combatElapsedMs: 0,
    waveElapsedMs: 0,
    spawn: {
      pendingEnemyRuntimeIds: [],
      nextSpawnAtMs: 0,
      lastSpawnX: null,
      intervalMs: 900,
    },
    preview: {
      elapsedMs: 0,
      durationMs: CombatBalanceConfig.PREVIEW_DURATION_MS,
    },
    baseHp: CombatBalanceConfig.BASE_HP,
    record: {
      currentAngle: startAngle,
      previousAngle: startAngle,
      rotationSpeedDegPerSecond: CombatBalanceConfig.RECORD_ROTATION_SPEED_DEG_PER_SECOND,
      startAngle,
    },
    slots: layout.record.slots.map((slot) => ({
      slotIndex: slot.index,
      pawnId: slotPreset?.slots[slot.index] ?? null,
      worldPosition: getSlotWorldPosition(
        layout.record.centerX,
        layout.record.centerY,
        slot.centerAngleDeg,
        slotAnchorRadius,
      ),
      sectorCenterAngleDeg: slot.centerAngleDeg,
      activationVisualState: 'idle',
    })),
    notePacket: {
      color: null,
      count: 0,
      visuals: [],
    },
    enemies,
    wave: {
      currentWaveIndex: 0,
      totalWaves: CombatWaveConfig.WAVES.length,
      currentWaveId: initialWave?.id ?? null,
      activeSubWaves: [],
      pendingSubWaves: [...(initialWave?.subWaves ?? [])],
      spawnBags: new Map(),
      enemiesRemaining: (initialWave?.subWaves ?? []).reduce(
        (sum, subWave) =>
          sum + Object.values(subWave.enemies).reduce((a, b) => a + b, 0),
        0,
      ),
    },
    outcome: {
      victory: false,
      defeat: false,
    },
    effects: {
      transientIds: [],
      pendingEvents: [],
    },
  };

  activatePendingSubWaves(runtime, random);

  return runtime;
}

function getSlotWorldPosition(
  centerX: number,
  centerY: number,
  angleDeg: number,
  radius: number,
): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;

  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY + Math.sin(radians) * radius,
  };
}

function shuffleArray<T>(array: readonly T[], random: () => number): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = shuffled[i] as T;
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp;
  }

  return shuffled;
}

function activateSubWave(
  runtime: CombatRuntime,
  subWave: CombatSubWaveConfig,
  random: () => number,
): void {
  const { activeSubWaves, pendingSubWaves, spawnBags } = runtime.wave;
  const index = pendingSubWaves.indexOf(subWave);

  if (index === -1) {
    return;
  }

  pendingSubWaves.splice(index, 1);
  activeSubWaves.push(subWave);

  const alreadyAllocatedIds = new Set(
    Array.from(spawnBags.values()).flatMap((bag) => bag.enemyRuntimeIds),
  );

  const enemyRuntimeIds: string[] = Object.entries(subWave.enemies).flatMap(
    ([definitionId, count]) => {
      const matchingEnemies = runtime.enemies.filter(
        (enemy) =>
          enemy.definitionId === definitionId && !enemy.spawned && !alreadyAllocatedIds.has(enemy.runtimeId),
      );

      for (const enemy of matchingEnemies.slice(0, count)) {
        alreadyAllocatedIds.add(enemy.runtimeId);
      }

      return matchingEnemies.slice(0, count).map((enemy) => enemy.runtimeId);
    },
  );

  spawnBags.set(subWave.id, {
    enemyRuntimeIds: shuffleArray(enemyRuntimeIds, random),
    nextSpawnAtMs: 0,
    intervalMs: subWave.spawnIntervalMs,
  });
}

function activatePendingSubWaves(runtime: CombatRuntime, random: () => number): void {
  const { pendingSubWaves } = runtime.wave;
  const toActivate: CombatSubWaveConfig[] = [];

  for (const subWave of pendingSubWaves) {
    if (runtime.waveElapsedMs >= subWave.startTimeMs) {
      toActivate.push(subWave);
    }
  }

  for (const subWave of toActivate) {
    activateSubWave(runtime, subWave, random);
  }
}

function calculateEnemiesRemaining(runtime: CombatRuntime): number {
  const livingEnemies = runtime.enemies.filter(
    (enemy) => enemy.spawned && enemy.state !== 'dead',
  ).length;

  const pendingInBags = Array.from(runtime.wave.spawnBags.values()).reduce(
    (sum, bag) => sum + bag.enemyRuntimeIds.length,
    0,
  );

  const pendingInSubWaves = runtime.wave.pendingSubWaves.reduce(
    (sum, subWave) =>
      sum + Object.values(subWave.enemies).reduce((a, b) => a + b, 0),
    0,
  );

  return livingEnemies + pendingInBags + pendingInSubWaves;
}

function evaluateVictory(runtime: CombatRuntime): void {
  if (runtime.state !== 'running') {
    return;
  }

  // Victory requires: all sub-waves activated, all bags empty, no living enemies
  const allSubWavesActivated = runtime.wave.pendingSubWaves.length === 0;

  const allBagsEmpty = Array.from(runtime.wave.spawnBags.values()).every(
    (bag) => bag.enemyRuntimeIds.length === 0,
  );

  const noLivingEnemies = runtime.enemies.every(
    (enemy) => !enemy.spawned || enemy.state === 'dead',
  );

  if (allSubWavesActivated && allBagsEmpty && noLivingEnemies) {
    setCombatState(runtime, 'victory');
  }
}

export function advanceCombatRuntime(
  runtime: CombatRuntime,
  deltaMs: number,
  options: CombatRuntimeAdvanceOptions = {},
): void {
  if (runtime.state === 'running') {
    runtime.combatElapsedMs += deltaMs;
    runtime.waveElapsedMs += deltaMs;
    activatePendingSubWaves(runtime, options.random ?? Math.random);
    resetSlotActivationEffects(runtime);
    runtime.record.previousAngle = runtime.record.currentAngle;
    runtime.record.currentAngle -=
      runtime.record.rotationSpeedDegPerSecond * (deltaMs / 1000);
    processCrossedSlots(runtime);
    updateEnemyPressure(runtime, deltaMs);
    bootstrapEnemySpawns(runtime, options.random ?? Math.random);
    runtime.wave.enemiesRemaining = calculateEnemiesRemaining(runtime);
    evaluateVictory(runtime);

    return;
  }

  if (runtime.state !== 'preview') {
    return;
  }

  runtime.combatElapsedMs += deltaMs;
  runtime.preview.elapsedMs = Math.min(
    runtime.preview.elapsedMs + deltaMs,
    runtime.preview.durationMs,
  );

  if (runtime.preview.elapsedMs >= runtime.preview.durationMs) {
    setCombatState(runtime, 'running');
  }
}

export function setCombatState(runtime: CombatRuntime, nextState: CombatState): boolean {
  if (runtime.state === nextState) {
    return false;
  }

  runtime.state = nextState;
  runtime.outcome.victory = nextState === 'victory';
  runtime.outcome.defeat = nextState === 'defeat';

  return true;
}

export function setCombatNotePacket(
  runtime: CombatRuntime,
  color: NoteColor | null,
  count: number,
): void {
  const clampedCount = Math.max(0, Math.min(count, CombatBalanceConfig.NOTE_PACKET_CAPACITY));

  if (count !== clampedCount) {
    console.warn(
      `Combat note packet count ${count} exceeded bounds and was clamped to ${clampedCount}.`,
    );
  }

  if (clampedCount > 0 && color === null) {
    console.warn('Combat note packet cannot keep notes without a color; clearing packet instead.');
  }

  const nextColor = clampedCount > 0 ? color : null;

  runtime.notePacket.color = nextColor;
  runtime.notePacket.count = clampedCount;
  runtime.notePacket.visuals =
    nextColor === null
      ? []
      : Array.from({ length: clampedCount }, (_, index) => `note-packet:${nextColor}:${index}`);
}

function resetSlotActivationEffects(runtime: CombatRuntime): void {
  runtime.effects.transientIds = [];
  runtime.effects.pendingEvents = [];

  for (const slot of runtime.slots) {
    slot.activationVisualState = 'idle';
  }
}

function processCrossedSlots(runtime: CombatRuntime): void {
  const pawnDefinitionsById = new Map(
    CombatContentConfig.PAWN_DEFINITIONS.map((pawn) => [pawn.id, pawn]),
  );
  const crossings = runtime.slots
    .flatMap((slot) =>
      collectCrossingsForSlot(
        slot.slotIndex,
        slot.sectorCenterAngleDeg,
        runtime.record.previousAngle,
        runtime.record.currentAngle,
      ),
    )
    .sort((left, right) => right.crossingAngle - left.crossingAngle);

  for (const crossing of crossings) {
    const slot = runtime.slots[crossing.slotIndex];

    if (!slot) {
      continue;
    }

    slot.activationVisualState = 'active';
    runtime.effects.transientIds.push(`slot-activated:${slot.slotIndex}`);
    runtime.effects.pendingEvents.push({
      event: 'combat:slot-activated',
      payload: { slotIndex: slot.slotIndex },
    });

    if (slot.pawnId === null) {
      continue;
    }

    const pawn = pawnDefinitionsById.get(slot.pawnId);

    if (!pawn) {
      continue;
    }

    runtime.effects.pendingEvents.push({
      event: 'combat:pawn-resolved',
      payload: {
        slotIndex: slot.slotIndex,
        pawnId: pawn.id,
        pawnType: pawn.type,
      },
    });

    if (pawn.type === 'generator') {
      resolveGeneratorSlotActivation(runtime, slot, pawn.id, pawn.color, pawn.baseDamage);
      continue;
    }

    resolveFinisherSlotActivation(runtime, slot, pawn);
  }
}

function resolveGeneratorSlotActivation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
  baseDamage: number,
): void {
  const target = selectNearestLivingEnemy(runtime, slot.worldPosition);

  if (target) {
    const weaknessMultiplier = resolveWeakness(color, target.color);
    const damage = Math.round(baseDamage * weaknessMultiplier);
    target.currentHp = Math.max(0, target.currentHp - damage);
    runtime.effects.pendingEvents.push({
      event: 'combat:enemy-hit',
      payload: {
        enemyId: target.runtimeId,
        slotIndex: slot.slotIndex,
        attackerColor: color,
        damage,
        currentHp: target.currentHp,
        maxHp: target.maxHp,
        wasWeaknessHit: weaknessMultiplier > 1,
      },
    });

    if (target.currentHp <= 0 && target.state !== 'dead') {
      target.state = 'dead';
      runtime.wave.enemiesRemaining = Math.max(0, runtime.wave.enemiesRemaining - 1);
      runtime.effects.pendingEvents.push({
        event: 'combat:enemy-died',
        payload: {
          enemyId: target.runtimeId,
          remaining: runtime.wave.enemiesRemaining,
        },
      });
    }
  }

  applyGeneratorPacketMutation(runtime, slot, pawnId, color);
}

function resolveFinisherSlotActivation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatFinisherPawnDefinition,
): void {
  const consumedNotes = getFinisherConsumedNotes(runtime, pawn.color);
  const consumedMultiplier = getFinisherConsumedNotesMultiplier(consumedNotes);
  const baseDamage = Math.round(pawn.baseDamage * consumedMultiplier);
  const target = selectNearestLivingEnemy(runtime, slot.worldPosition);
  const weaknessMultiplier = target ? resolveWeakness(pawn.color, target.color) : 1;
  const damage = Math.round(baseDamage * weaknessMultiplier);

  runtime.effects.pendingEvents.push({
    event: 'combat:finisher-consumed-notes',
    payload: {
      slotIndex: slot.slotIndex,
      pawnId: pawn.id,
      color: pawn.color,
      consumedNotes,
      multiplier: consumedMultiplier,
    },
  });

  if (target) {
    target.currentHp = Math.max(0, target.currentHp - damage);
    runtime.effects.pendingEvents.push({
      event: 'combat:enemy-hit',
      payload: {
        enemyId: target.runtimeId,
        slotIndex: slot.slotIndex,
        attackerColor: pawn.color,
        damage,
        currentHp: target.currentHp,
        maxHp: target.maxHp,
        wasWeaknessHit: weaknessMultiplier > 1,
      },
    });

    if (target.currentHp <= 0 && target.state !== 'dead') {
      target.state = 'dead';
      runtime.wave.enemiesRemaining = Math.max(0, runtime.wave.enemiesRemaining - 1);
      runtime.effects.pendingEvents.push({
        event: 'combat:enemy-died',
        payload: {
          enemyId: target.runtimeId,
          remaining: runtime.wave.enemiesRemaining,
        },
      });
    }
  }

  applyFinisherPacketMutation(runtime, slot, pawn);
}

function selectNearestLivingEnemy(
  runtime: CombatRuntime,
  origin: CombatSlotRuntime['worldPosition'],
): CombatEnemyRuntime | null {
  if (origin === null) {
    return null;
  }

  let nearestEnemy: CombatEnemyRuntime | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of runtime.enemies) {
    if (!enemy.spawned || enemy.state === 'dead' || enemy.currentHp <= 0) {
      continue;
    }

    const distance = getDistance(origin.x, origin.y, enemy.x, enemy.y);

    if (distance < nearestDistance) {
      nearestEnemy = enemy;
      nearestDistance = distance;
    }
  }

  return nearestEnemy;
}

function applyGeneratorPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
): void {
  const previousColor = runtime.notePacket.color;
  const previousCount = runtime.notePacket.count;
  let emittedNotes = 2;

  if (previousColor === null || previousCount <= 0) {
    setCombatNotePacket(runtime, color, 2);
    pushGeneratorNotesEmittedEvent(runtime, slot, pawnId, color, emittedNotes);
    pushNotePacketChangedEvent(runtime);
    return;
  }

  if (previousColor === color) {
    const nextCount = Math.min(
      previousCount + 2,
      CombatBalanceConfig.NOTE_PACKET_CAPACITY,
    );
    emittedNotes = Math.max(0, nextCount - previousCount);

    setCombatNotePacket(runtime, color, nextCount);
    pushGeneratorNotesEmittedEvent(runtime, slot, pawnId, color, emittedNotes);
    pushNotePacketChangedEvent(runtime);
    return;
  }

  runtime.effects.pendingEvents.push({
    event: 'combat:note-packet-color-broke',
    payload: {
      previousColor,
      nextColor: color,
    },
  });
  setCombatNotePacket(runtime, color, 2);
  pushGeneratorNotesEmittedEvent(runtime, slot, pawnId, color, emittedNotes);
  pushNotePacketChangedEvent(runtime);
}

function getFinisherConsumedNotes(runtime: CombatRuntime, color: NoteColor): number {
  if (runtime.notePacket.color !== color || runtime.notePacket.count <= 0) {
    return 0;
  }

  return Math.min(runtime.notePacket.count, CombatBalanceConfig.NOTE_PACKET_CAPACITY);
}

function getFinisherConsumedNotesMultiplier(consumedNotes: number): number {
  const normalizedConsumedNotes = Math.max(
    0,
    Math.min(consumedNotes, CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER.length - 1),
  );

  return CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER[normalizedConsumedNotes] ?? 0.75;
}

function applyFinisherPacketMutation(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawn: CombatFinisherPawnDefinition,
): void {
  if (runtime.notePacket.color !== null && runtime.notePacket.color !== pawn.color) {
    runtime.effects.pendingEvents.push({
      event: 'combat:note-packet-color-broke',
      payload: {
        previousColor: runtime.notePacket.color,
        nextColor: pawn.outputNoteColor,
      },
    });
  }

  setCombatNotePacket(runtime, pawn.outputNoteColor, 1);
  runtime.effects.pendingEvents.push({
    event: 'combat:finisher-output-note-emitted',
    payload: {
      slotIndex: slot.slotIndex,
      pawnId: pawn.id,
      color: pawn.outputNoteColor,
      count: 1,
    },
  });
  pushNotePacketChangedEvent(runtime);
}

function pushNotePacketChangedEvent(runtime: CombatRuntime): void {
  runtime.effects.pendingEvents.push({
    event: 'combat:note-packet-changed',
    payload: {
      color: runtime.notePacket.color,
      count: runtime.notePacket.count,
    },
  });
}

function pushGeneratorNotesEmittedEvent(
  runtime: CombatRuntime,
  slot: CombatSlotRuntime,
  pawnId: string,
  color: NoteColor,
  count: number,
): void {
  runtime.effects.pendingEvents.push({
    event: 'combat:generator-notes-emitted',
    payload: {
      slotIndex: slot.slotIndex,
      pawnId,
      color,
      count,
    },
  });
}

function updateEnemyPressure(runtime: CombatRuntime, deltaMs: number): void {
  const layout = createCombatLayoutPlan();
  const enemyDefinitionsById = new Map(
    CombatContentConfig.ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
  );

  for (const enemy of runtime.enemies) {
    if (!enemy.spawned) {
      continue;
    }

    const definition = enemyDefinitionsById.get(enemy.definitionId);

    if (!definition) {
      continue;
    }

    if (enemy.state === 'attacking') {
      updateEnemyBaseAttacks(runtime, enemy, definition.attackCooldownMs, definition.attackDamage);
      continue;
    }

    if (enemy.state !== 'moving') {
      continue;
    }

    const distanceToBase = getDistance(enemy.x, enemy.y, layout.base.x, layout.base.y);

    if (distanceToBase <= definition.attackRangePx) {
      enemy.state = 'attacking';
      enemy.nextAttackAtMs = runtime.combatElapsedMs + definition.attackCooldownMs;
      continue;
    }

    const stepPx = definition.moveSpeedPxPerSec * (deltaMs / 1000);
    const nextY = enemy.y + stepPx;
    const nextDistanceToBase = getDistance(enemy.x, nextY, layout.base.x, layout.base.y);

    if (nextDistanceToBase <= definition.attackRangePx) {
      enemy.y = clampEnemyToAttackRange(enemy.x, layout.base.x, layout.base.y, definition.attackRangePx);
      enemy.state = 'attacking';
      enemy.nextAttackAtMs = runtime.combatElapsedMs + definition.attackCooldownMs;
      continue;
    }

    enemy.y = nextY;
  }
}

function bootstrapEnemySpawns(runtime: CombatRuntime, random: () => number): void {
  for (const subWave of runtime.wave.activeSubWaves) {
    const bag = runtime.wave.spawnBags.get(subWave.id);

    if (!bag) {
      continue;
    }

    while (bag.enemyRuntimeIds.length > 0 && runtime.waveElapsedMs >= bag.nextSpawnAtMs) {
      const enemyRuntimeId = bag.enemyRuntimeIds.shift()!;
      const enemy = runtime.enemies.find((entry) => entry.runtimeId === enemyRuntimeId);

      if (!enemy) {
        continue;
      }

      enemy.spawned = true;
      enemy.state = 'moving';
      enemy.nextAttackAtMs = 0;
      enemy.x = selectEnemySpawnX(random, runtime.spawn.lastSpawnX);
      enemy.y = CombatLayoutConfig.ENEMY_SPAWN_Y;
      runtime.spawn.lastSpawnX = enemy.x;
      bag.nextSpawnAtMs += bag.intervalMs;
    }
  }
}

function selectEnemySpawnX(random: () => number, lastSpawnX: number | null): number {
  let fallbackX: number = CombatLayoutConfig.ENEMY_SPAWN_X_MIN;

  for (let attempt = 0; attempt < CombatBalanceConfig.ENEMY_SPAWN_ATTEMPTS; attempt += 1) {
    const candidateX = Math.round(
      CombatLayoutConfig.ENEMY_SPAWN_X_MIN
      + random() * (CombatLayoutConfig.ENEMY_SPAWN_X_MAX - CombatLayoutConfig.ENEMY_SPAWN_X_MIN),
    );

    fallbackX = candidateX;

    if (
      lastSpawnX === null
      || Math.abs(candidateX - lastSpawnX) >= CombatBalanceConfig.ENEMY_SPAWN_MIN_GAP_PX
    ) {
      return candidateX;
    }
  }

  return fallbackX;
}

function updateEnemyBaseAttacks(
  runtime: CombatRuntime,
  enemy: CombatEnemyRuntime,
  attackCooldownMs: number,
  attackDamage: number,
): void {
  if (enemy.nextAttackAtMs <= 0) {
    enemy.nextAttackAtMs = attackCooldownMs;
    return;
  }

  while (runtime.state === 'running' && runtime.combatElapsedMs >= enemy.nextAttackAtMs) {
    runtime.baseHp = Math.max(0, runtime.baseHp - attackDamage);
    runtime.effects.pendingEvents.push({
      event: 'combat:base-damaged',
      payload: {
        current: runtime.baseHp,
        max: CombatBalanceConfig.BASE_HP,
      },
    });
    runtime.effects.pendingEvents.push({
      event: 'combat:hud-base-hp-updated',
      payload: {
        current: runtime.baseHp,
        max: CombatBalanceConfig.BASE_HP,
      },
    });

    if (runtime.baseHp <= 0) {
      setCombatState(runtime, 'defeat');
      return;
    }

    enemy.nextAttackAtMs += attackCooldownMs;
  }
}

function clampEnemyToAttackRange(
  enemyX: number,
  baseX: number,
  baseY: number,
  attackRangePx: number,
): number {
  const deltaX = enemyX - baseX;
  const maxDeltaY = Math.sqrt(Math.max(attackRangePx ** 2 - deltaX ** 2, 0));

  return baseY - maxDeltaY;
}

function getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.hypot(toX - fromX, toY - fromY);
}

function collectCrossingsForSlot(
  slotIndex: number,
  sectorCenterAngleDeg: number | null,
  previousAngle: number,
  currentAngle: number,
): Array<{ slotIndex: number; crossingAngle: number }> {
  if (sectorCenterAngleDeg === null || currentAngle >= previousAngle) {
    return [];
  }

  const baseCrossingAngle = COMBAT_NEEDLE_ANGLE_DEGREES - sectorCenterAngleDeg;
  const firstCycle = Math.floor((currentAngle - baseCrossingAngle) / 360);
  const lastCycle = Math.floor((previousAngle - baseCrossingAngle) / 360);
  const crossings: Array<{ slotIndex: number; crossingAngle: number }> = [];

  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    const crossingAngle = baseCrossingAngle + cycle * 360;

    if (crossingAngle <= previousAngle && crossingAngle > currentAngle) {
      crossings.push({ slotIndex, crossingAngle });
    }
  }

  return crossings;
}

function resolveWeakness(attackerColor: NoteColor, targetColor: NoteColor): number {
  const weakTarget = CombatContentConfig.WEAKNESS_ADVANTAGE[attackerColor];

  return weakTarget === targetColor ? CombatBalanceConfig.WEAKNESS_MULTIPLIER : 1;
}
