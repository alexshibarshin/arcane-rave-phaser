import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatWaveConfig, type CombatSubWaveConfig } from '@config/CombatWaveConfig';
import {
  COMBAT_NEEDLE_ANGLE_DEGREES,
  createCombatLayoutPlan,
} from './CombatLayout';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';

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

export interface CombatWaveRuntime {
  currentWaveIndex: number;
  totalWaves: number;
  currentWaveId: string | null;
  activeSubWaves: CombatSubWaveConfig[];
  pendingSubWaves: CombatSubWaveConfig[];
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
    >;
  };
}

interface CombatRuntimeAdvanceOptions {
  random?: () => number;
}

export function createCombatRuntime(): CombatRuntime {
  const initialWave = CombatWaveConfig.WAVES[0];
  const startAngle = initialWave?.startAngleDeg ?? CombatBalanceConfig.RECORD_START_ANGLE_DEG;
  const layout = createCombatLayoutPlan();
  const slotAnchorRadius = layout.record.radius * 0.75;
  const slotPreset =
    CombatContentConfig.SLOT_PRESETS.find((preset) => preset.id === initialWave?.slotPresetId)
    ?? null;
  const enemies = createCombatEnemyRuntimes();

  return {
    state: 'preview',
    combatElapsedMs: 0,
    waveElapsedMs: 0,
    spawn: {
      pendingEnemyRuntimeIds: enemies.map((enemy) => enemy.runtimeId),
      nextSpawnAtMs: initialWave?.subWaves[0]?.startTimeMs ?? 0,
      lastSpawnX: null,
      intervalMs: initialWave?.subWaves[0]?.spawnIntervalMs ?? 900,
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
      enemiesRemaining: enemies.length,
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

export function advanceCombatRuntime(
  runtime: CombatRuntime,
  deltaMs: number,
  options: CombatRuntimeAdvanceOptions = {},
): void {
  runtime.combatElapsedMs += deltaMs;

  if (runtime.state === 'running') {
    runtime.waveElapsedMs += deltaMs;
    resetSlotActivationEffects(runtime);
    runtime.record.previousAngle = runtime.record.currentAngle;
    runtime.record.currentAngle -=
      runtime.record.rotationSpeedDegPerSecond * (deltaMs / 1000);
    processCrossedSlots(runtime);
    updateEnemyPressure(runtime, deltaMs);
    bootstrapEnemySpawns(runtime, options.random ?? Math.random);

    return;
  }

  if (runtime.state !== 'preview') {
    return;
  }

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
  }
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
  while (runtime.waveElapsedMs >= runtime.spawn.nextSpawnAtMs) {
    const nextEnemyRuntimeId = runtime.spawn.pendingEnemyRuntimeIds.shift();

    if (!nextEnemyRuntimeId) {
      return;
    }

    const enemy = runtime.enemies.find((entry) => entry.runtimeId === nextEnemyRuntimeId);

    if (!enemy) {
      runtime.spawn.nextSpawnAtMs += runtime.spawn.intervalMs;
      continue;
    }

    enemy.spawned = true;
    enemy.state = 'moving';
    enemy.nextAttackAtMs = 0;
    enemy.x = selectEnemySpawnX(random, runtime.spawn.lastSpawnX);
    enemy.y = CombatLayoutConfig.ENEMY_SPAWN_Y;
    runtime.spawn.lastSpawnX = enemy.x;
    runtime.spawn.nextSpawnAtMs += runtime.spawn.intervalMs;
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
