import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, getCombatWaveDefinition } from '@config/CombatWaveConfig';
import { createCombatLayoutPlan } from './CombatLayout';
import { resolveCombatActivations } from './CombatActivation';
import { advanceCombatEnemyPressure } from './CombatEnemyPressure';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import { evaluateCombatOutcome } from './CombatOutcome';
import { advanceCombatRotation } from './CombatRotation';
import {
  initializeCombatWaveRuntime,
  activatePendingCombatSubWaves,
  calculateCombatEnemiesRemaining,
  createInitialCombatWaveState,
  spawnCombatEnemies,
} from './CombatWaveRuntime';
import {
  resetCombatFrameEffects,
  type CombatRuntimeEvent,
} from './CombatRuntimeEvents';
import type { CombatSubWaveConfig, CombatWaveDefinition } from '@config/CombatWaveConfig';

export type CombatState = 'preview' | 'running' | 'paused' | 'victory' | 'defeat';
export type NoteColor = (typeof CombatContentConfig.NOTE_COLORS)[number];
export type CombatEnemyState = 'moving' | 'attacking' | 'dead';

export interface CombatSlotRuntime {
  slotIndex: number;
  pawnId: string | null;
  pawnTier: number | null;
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
    pendingEvents: CombatRuntimeEvent[];
  };
}

interface CombatRuntimeAdvanceOptions {
  random?: () => number;
}

export interface CombatLoadoutSlot {
  pawnId: string | null;
  tier: number | null;
}

export interface CreateCombatRuntimeOptions {
  waveIndex?: number;
  totalWaves?: number;
  slotPawns?: CombatLoadoutSlot[];
  slotPawnIds?: Array<string | null>;
  slotPawnTiers?: Array<number | null>;
}

export function createCombatRuntime(
  random: () => number = Math.random,
  options: CreateCombatRuntimeOptions = {},
): CombatRuntime {
  const waveIndex = options.waveIndex ?? 0;
  const totalWaves = options.totalWaves ?? CombatWaveConfig.WAVES.length;
  const initialWave = getCombatWaveDefinition(waveIndex);
  const startAngle = initialWave?.startAngleDeg ?? CombatBalanceConfig.RECORD_START_ANGLE_DEG;
  const layout = createCombatLayoutPlan();
  const slotAnchorRadius = layout.record.radius * 0.75;
  const slotPreset =
    CombatContentConfig.SLOT_PRESETS.find((preset) => preset.id === initialWave?.slotPresetId)
    ?? null;
  const slotPawns = resolveCombatLoadoutSlots(options, slotPreset?.slots ?? []);
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
      pawnId: slotPawns[slot.index]?.pawnId ?? null,
      pawnTier: resolveInitialSlotPawnTier(
        slotPawns[slot.index]?.pawnId ?? null,
        slotPawns[slot.index]?.tier ?? null,
      ),
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
    wave: createInitialCombatWaveState(waveIndex, totalWaves, initialWave),
    outcome: {
      victory: false,
      defeat: false,
    },
    effects: {
      transientIds: [],
      pendingEvents: [],
    },
  };

  initializeCombatWaveRuntime(runtime, random);

  return runtime;
}

function resolveCombatLoadoutSlots(
  options: CreateCombatRuntimeOptions,
  fallbackPawnIds: Array<string | null>,
): CombatLoadoutSlot[] {
  if (options.slotPawns) {
    return options.slotPawns.map((slot) => ({
      pawnId: slot?.pawnId ?? null,
      tier: slot?.pawnId === null ? null : Math.max(1, slot?.tier ?? 1),
    }));
  }

  const slotPawnIds = options.slotPawnIds ?? fallbackPawnIds;
  const slotPawnTiers = options.slotPawnTiers ?? [];

  return slotPawnIds.map((pawnId, index) => ({
    pawnId: pawnId ?? null,
    tier: pawnId === null ? null : Math.max(1, slotPawnTiers[index] ?? 1),
  }));
}

function resolveInitialSlotPawnTier(
  pawnId: string | null,
  pawnTier: number | null,
): number | null {
  if (pawnId === null) {
    return null;
  }

  return Math.max(1, pawnTier ?? 1);
}

export function advanceCombatRuntime(
  runtime: CombatRuntime,
  deltaMs: number,
  options: CombatRuntimeAdvanceOptions = {},
): void {
  if (runtime.state === 'running') {
    runtime.combatElapsedMs += deltaMs;
    runtime.waveElapsedMs += deltaMs;
    activatePendingCombatSubWaves(runtime, options.random ?? Math.random);
    resetCombatFrameEffects(runtime);
    const crossings = advanceCombatRotation(runtime, deltaMs);
    resolveCombatActivations(runtime, crossings);
    advanceCombatEnemyPressure(runtime, deltaMs);
    spawnCombatEnemies(runtime, options.random ?? Math.random);
    runtime.wave.enemiesRemaining = calculateCombatEnemiesRemaining(runtime);
    evaluateCombatOutcome(runtime);

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
