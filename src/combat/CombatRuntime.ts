import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig, getCombatPawnDefinitionById } from '@config/CombatContentConfig';
import { CombatTimeControlConfig } from '@config/CombatTimeControlConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';

import type { SubWaveDefinition } from '@config/StageConfig';
import type { SlotModifierAssignment } from '@modifiers/SlotModifierAssignment';
import { createCombatLayoutPlan } from './CombatLayout';
import { resolveCombatActivations } from './CombatActivation';
import { advanceCombatBeams, clearCombatBeams } from './CombatBeams';
import { advanceCombatEnemyPressure } from './CombatEnemyPressure';
import { advanceCombatPendingExplosions, clearCombatPendingExplosions } from './CombatExplosions';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import { evaluateCombatOutcome } from './CombatOutcome';
import { advanceCombatPawnBuffs, clearCombatPawnBuffs } from './CombatPawnBuffs';
import { advanceCombatProjectiles, advanceCombatQueuedVolleys, clearCombatProjectiles } from './CombatProjectiles';
import { advanceCombatRotation, rewindCombatRotation } from './CombatRotation';
import { advanceCombatStatuses, clearCombatEnemyStatuses } from './CombatStatuses';
import {
  initializeCombatWaveRuntime,
  activatePendingCombatSubWaves,
  createInitialCombatWaveState,
  spawnCombatEnemies,
} from './CombatWaveRuntime';
import {
  resetCombatFrameEffects,
  type CombatRuntimeEvent,
} from './CombatRuntimeEvents';
import { advanceCombatZones, clearCombatZones } from './CombatZones';
import type { CombatSubWaveConfig } from '@config/CombatWaveConfig';

const SLOT_SPRITE_REST_OFFSET_Y_PX = -2;
const EMPTY_NOTE_PACKET_VISUALS: string[] = [];
const NOTE_PACKET_VISUALS_CACHE = new Map<string, string[]>();

export type CombatState = 'preview' | 'running' | 'paused' | 'victory' | 'defeat';
export type NoteColor = (typeof CombatContentConfig.NOTE_COLORS)[number];
export type CombatEnemyState = 'moving' | 'attacking' | 'dead';
export type CombatTimeControlMode = 'idle' | 'rewind' | 'fast-forward';

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
  silhouetteMotif?: string;
  isSpecial?: boolean;
}

export interface CombatSourceSnapshot {
  damageMultiplier: number;
  finisherConsumedNotes: number;
  finisherDamageMultiplier: number;
  nextSlotBuffBonusPercent: number;
}

export interface CombatProjectileRuntime {
  runtimeId: string;
  pawnId: string;
  slotIndex: number;
  color: NoteColor;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  directionX: number;
  directionY: number;
  speedPxPerSec: number;
  remainingLifetimeMs: number;
  damage: number;
  sourceSnapshot: CombatSourceSnapshot;
  bounceRemaining: number;
  splitChildCount: number;
  splitConeAngleDeg: number;
  splitChildLifetimeMs: number;
  ignoredEnemyRuntimeIds: string[];
  canSplit: boolean;
}

export interface CombatQueuedVolleyRuntime {
  runtimeId: string;
  pawnId: string;
  slotIndex: number;
  color: NoteColor;
  damage: number;
  shotsRemaining: number;
  intervalMs: number;
  nextFireAtMs: number;
  projectileSpeedPxPerSec: number;
  projectileLifetimeMs: number;
  sourceSnapshot: CombatSourceSnapshot;
  bounceRemaining: number;
  splitChildCount: number;
  splitConeAngleDeg: number;
  splitChildLifetimeMs: number;
}

export interface CombatPendingExplosionRuntime {
  runtimeId: string;
  pawnId: string;
  slotIndex: number;
  color: NoteColor;
  centerX: number;
  centerY: number;
  radius: number;
  damage: number;
  detonateAtMs: number;
  sourceSnapshot: CombatSourceSnapshot;
  burnZoneOnDetonate: {
    radius: number;
    durationMs: number;
    tickIntervalMs: number;
    damagePerTick: number;
  } | null;
}

export interface CombatBeamRuntime {
  runtimeId: string;
  pawnId: string;
  slotIndex: number;
  color: NoteColor;
  beamType: 'lock-on' | 'sweeping';
  damage: number;
  startedAtMs: number;
  expiresAtMs: number;
  sourceSnapshot: CombatSourceSnapshot;
  targetEnemyRuntimeId: string | null;
  tickIntervalMs: number | null;
  nextTickAtMs: number | null;
  originX: number;
  originY: number;
  sweepStartAngleRad: number | null;
  sweepEndAngleRad: number | null;
  sweepLengthPx: number | null;
  sweepHitRadiusPx: number | null;
  previouslyIntersectedEnemyRuntimeIds: Set<string>;
  slowOnHit: {
    slowMultiplier: number;
    durationMs: number;
  } | null;
}

export interface CombatZoneRuntime {
  runtimeId: string;
  pawnId: string;
  slotIndex: number;
  color: NoteColor;
  centerX: number;
  centerY: number;
  radius: number;
  damagePerTick: number;
  tickIntervalMs: number;
  nextTickAtMs: number;
  expiresAtMs: number;
  sourceSnapshot: CombatSourceSnapshot;
  nextSlotDamageBuffPercent: number | null;
}

export interface CombatEnemyStatusRuntime {
  enemyRuntimeId: string;
  slowMultiplier: number;
  expiresAtMs: number;
}

export interface CombatPawnBuffRuntime {
  kind: 'next-slot-damage-buff';
  slotIndex: number;
  sourcePawnId: string;
  damageBonusPercent: number;
}

export interface CombatScheduledActivationRuntime {
  slotIndex: number;
  triggerAtMs: number;
}

export interface CombatSubWaveSpawnBag {
  enemyRuntimeIds: string[];
  nextEnemyIndex: number;
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
  lastSpawnX: number | null;
}

export interface CombatTargetingRuntime {
  dirty: boolean;
  targetableEnemies: CombatEnemyRuntime[];
  frontmostEnemy: CombatEnemyRuntime | null;
  bucketsByRow: Map<number, CombatEnemyRuntime[]>;
}

export interface CombatRuntime {
  state: CombatState;
  combatElapsedMs: number;
  waveElapsedMs: number;
  simulation: {
    accumulatorMs: number;
  };
  preview: {
    elapsedMs: number;
    durationMs: number;
  };
  time: {
    chrono: {
      current: number;
      max: number;
    };
    requestedMode: CombatTimeControlMode;
    activeMode: CombatTimeControlMode;
    activeIntensity: number;
  };
  baseHp: number;
  record: {
    currentAngle: number;
    previousAngle: number;
    rotationSpeedDegPerSecond: number;
    startAngle: number;
  };
  slots: CombatSlotRuntime[];
  slotModifiers: Array<SlotModifierAssignment | null>;
  notePacket: CombatNotePacketRuntime;
  enemies: CombatEnemyRuntime[];
  enemyById: Map<string, CombatEnemyRuntime>;
  enemyQueuesByDefinitionId: Map<string, CombatEnemyRuntime[]>;
  enemyQueueCursorByDefinitionId: Map<string, number>;
  targeting: CombatTargetingRuntime;
  projectiles: CombatProjectileRuntime[];
  queuedVolleys: CombatQueuedVolleyRuntime[];
  pendingExplosions: CombatPendingExplosionRuntime[];
  beams: CombatBeamRuntime[];
  zones: CombatZoneRuntime[];
  enemyStatuses: Map<string, CombatEnemyStatusRuntime>;
  pawnBuffs: Array<CombatPawnBuffRuntime | null>;
  scheduledActivations: CombatScheduledActivationRuntime[];
  wave: CombatWaveRuntime;
  outcome: {
    victory: boolean;
    defeat: boolean;
  };
  effects: {
    transientIds: string[];
    pendingEvents: CombatRuntimeEvent[];
  };
  ids: {
    nextEffectId: number;
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
  slotModifiers?: SlotModifierAssignment[];
  slotPawnIds?: Array<string | null>;
  slotPawnTiers?: Array<number | null>;
  chronoCurrent?: number;
  chronoMax?: number;
  subWaves?: SubWaveDefinition[];
  enemyStatOverrides?: Record<string, { maxHp: number }>;
}

export function createCombatRuntime(
  random: () => number = Math.random,
  options: CreateCombatRuntimeOptions = {},
): CombatRuntime {
  const waveIndex = options.waveIndex ?? 0;
  const totalWaves = options.totalWaves ?? 1;
  const startAngle = CombatBalanceConfig.RECORD_START_ANGLE_DEG;
  const layout = createCombatLayoutPlan();

  const subWaves = options.subWaves ?? [];
  const enemyStatOverrides = options.enemyStatOverrides;

  // Slot pawns always come from stage-provided loadout
  const slotPawns = resolveCombatLoadoutSlots(options, []);
  const slotModifiers = resolveCombatSlotModifiers(options.slotModifiers);
  const enemies = createCombatEnemyRuntimes(subWaves, enemyStatOverrides);
  const enemyById = new Map(enemies.map((enemy) => [enemy.runtimeId, enemy]));
  const enemyQueuesByDefinitionId = createEnemyQueuesByDefinitionId(enemies);
  const chronoMax = Math.max(0, options.chronoMax ?? CombatTimeControlConfig.CHRONO_MAX);
  const chronoCurrent = PhaserMathClamp(
    options.chronoCurrent ?? CombatTimeControlConfig.CHRONO_START,
    0,
    chronoMax,
  );

  const runtime: CombatRuntime = {
    state: 'preview',
    combatElapsedMs: 0,
    waveElapsedMs: 0,
    simulation: {
      accumulatorMs: 0,
    },
    preview: {
      elapsedMs: 0,
      durationMs: CombatBalanceConfig.PREVIEW_DURATION_MS,
    },
    time: {
      chrono: {
        current: chronoCurrent,
        max: chronoMax,
      },
      requestedMode: 'idle',
      activeMode: 'idle',
      activeIntensity: 0,
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
      worldPosition: null,
      sectorCenterAngleDeg: slot.centerAngleDeg,
      activationVisualState: 'idle',
    })),
    slotModifiers,
    notePacket: {
      color: null,
      count: 0,
      visuals: [],
    },
    enemies,
    enemyById,
    enemyQueuesByDefinitionId,
    enemyQueueCursorByDefinitionId: new Map(
      Array.from(enemyQueuesByDefinitionId.keys(), (definitionId) => [definitionId, 0]),
    ),
    targeting: {
      dirty: true,
      targetableEnemies: [],
      frontmostEnemy: null,
      bucketsByRow: new Map(),
    },
    projectiles: [],
    queuedVolleys: [],
    pendingExplosions: [],
    beams: [],
    zones: [],
    enemyStatuses: new Map(),
    pawnBuffs: Array.from({ length: CombatContentConfig.SLOT_COUNT }, () => null),
    scheduledActivations: [],
    wave: createInitialCombatWaveState(waveIndex, totalWaves, subWaves),
    outcome: {
      victory: false,
      defeat: false,
    },
    effects: {
      transientIds: [],
      pendingEvents: [],
    },
    ids: {
      nextEffectId: 1,
    },
  };

  syncCombatSlotWorldPositions(runtime);
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

function resolveCombatSlotModifiers(
  assignments: SlotModifierAssignment[] | undefined,
): Array<SlotModifierAssignment | null> {
  const slotModifiers = Array.from(
    { length: CombatContentConfig.SLOT_COUNT },
    (): SlotModifierAssignment | null => null,
  );

  for (const assignment of assignments ?? []) {
    slotModifiers[assignment.slotIndex] = assignment;
  }

  return slotModifiers;
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
  const clampedFrameDeltaMs = Math.min(deltaMs, CombatBalanceConfig.MAX_FRAME_DELTA_MS);

  if (runtime.state === 'running') {
    resetCombatFrameEffects(runtime);

    if (deltaMs <= CombatBalanceConfig.MAX_FRAME_DELTA_MS) {
      runtime.simulation.accumulatorMs = 0;
      simulateCombatRuntimeStep(
        runtime,
        clampedFrameDeltaMs,
        options.random ?? Math.random,
      );
      return;
    }

    runtime.simulation.accumulatorMs = Math.min(
      clampedFrameDeltaMs,
      CombatBalanceConfig.SIMULATION_STEP_MS * CombatBalanceConfig.MAX_SIMULATION_STEPS_PER_FRAME,
    );

    let processedSteps = 0;

    while (
      runtime.simulation.accumulatorMs > 0
      && processedSteps < CombatBalanceConfig.MAX_SIMULATION_STEPS_PER_FRAME
    ) {
      const stepDeltaMs = Math.min(
        CombatBalanceConfig.SIMULATION_STEP_MS,
        runtime.simulation.accumulatorMs,
      );
      simulateCombatRuntimeStep(runtime, stepDeltaMs, options.random ?? Math.random);
      runtime.simulation.accumulatorMs -= stepDeltaMs;
      processedSteps += 1;

      if (runtime.state !== 'running') {
        runtime.simulation.accumulatorMs = 0;
        break;
      }
    }

    runtime.simulation.accumulatorMs = 0;

    return;
  }

  if (runtime.state !== 'preview') {
    return;
  }

  runtime.combatElapsedMs += clampedFrameDeltaMs;
  runtime.preview.elapsedMs = Math.min(
    runtime.preview.elapsedMs + clampedFrameDeltaMs,
    runtime.preview.durationMs,
  );

  if (runtime.preview.elapsedMs >= runtime.preview.durationMs) {
    setCombatState(runtime, 'running');
  }
}

function simulateCombatRuntimeStep(
  runtime: CombatRuntime,
  deltaMs: number,
  random: () => number,
): void {
  runtime.combatElapsedMs += deltaMs;
  runtime.waveElapsedMs += deltaMs;
  runtime.targeting.dirty = true;
  activatePendingCombatSubWaves(runtime, random);
  const forwardDeltaMs = advanceCombatTimeControl(runtime, deltaMs);
  const crossings = forwardDeltaMs > 0 ? advanceCombatRotation(runtime, forwardDeltaMs) : [];
  syncCombatSlotWorldPositions(runtime);
  resolveCombatActivations(runtime, crossings);
  advanceCombatScheduledActivations(runtime);
  advanceCombatQueuedVolleys(runtime);
  advanceCombatProjectiles(runtime, forwardDeltaMs);
  advanceCombatPendingExplosions(runtime);
  advanceCombatBeams(runtime, forwardDeltaMs);
  advanceCombatZones(runtime);
  advanceCombatStatuses(runtime);
  advanceCombatPawnBuffs(runtime);
  advanceCombatEnemyPressure(runtime, deltaMs);
  runtime.targeting.dirty = true;
  spawnCombatEnemies(runtime, random);
  evaluateCombatOutcome(runtime);
}

export function setCombatTimeControlMode(
  runtime: CombatRuntime,
  mode: CombatTimeControlMode,
): void {
  runtime.time.requestedMode = mode;
}

export function restoreCombatChrono(runtime: CombatRuntime, amount: number): void {
  runtime.time.chrono.current = PhaserMathClamp(
    runtime.time.chrono.current + Math.max(0, amount),
    0,
    runtime.time.chrono.max,
  );
}

export function setCombatState(runtime: CombatRuntime, nextState: CombatState): boolean {
  if (runtime.state === nextState) {
    return false;
  }

  runtime.state = nextState;
  runtime.outcome.victory = nextState === 'victory';
  runtime.outcome.defeat = nextState === 'defeat';

  if (nextState === 'victory' || nextState === 'defeat') {
    clearCombatTransientState(runtime);
  }

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
      ? EMPTY_NOTE_PACKET_VISUALS
      : getCachedNotePacketVisualIds(nextColor, clampedCount);
}

export function syncCombatSlotWorldPositions(runtime: CombatRuntime): void {
  const layout = createCombatLayoutPlan();
  const slotAnchorRadius = layout.record.radius * CombatVisualConfig.SLOT.OUTER_ZONE_OFFSET_RATIO;

  for (const slot of runtime.slots) {
    if (slot.sectorCenterAngleDeg === null) {
      continue;
    }

    const radians = ((slot.sectorCenterAngleDeg + runtime.record.currentAngle) * Math.PI) / 180;
    const pawnDefinition = slot.pawnId === null ? null : getCombatPawnDefinitionById(slot.pawnId);
    const spriteOffsetX = pawnDefinition?.art.offsetX ?? 0;
    const spriteOffsetY = pawnDefinition?.art.offsetY ?? 0;

    slot.worldPosition = {
      x: layout.record.centerX + Math.cos(radians) * slotAnchorRadius + spriteOffsetX,
      y:
        layout.record.centerY
        + Math.sin(radians) * slotAnchorRadius
        + spriteOffsetY
        + SLOT_SPRITE_REST_OFFSET_Y_PX,
    };
  }
}

function advanceCombatTimeControl(runtime: CombatRuntime, deltaMs: number): number {
  const requestedMode = runtime.time.requestedMode;
  const seconds = deltaMs / 1000;

  runtime.time.activeMode = 'idle';
  runtime.time.activeIntensity = 0;

  if (requestedMode === 'idle') {
    restoreCombatChrono(runtime, CombatTimeControlConfig.CHRONO_IDLE_REGEN_PER_SECOND * seconds);
    return deltaMs;
  }

  const drainPerSecond =
    requestedMode === 'rewind'
      ? CombatTimeControlConfig.REWIND_CHRONO_DRAIN_PER_SECOND
      : CombatTimeControlConfig.FAST_FORWARD_CHRONO_DRAIN_PER_SECOND;
  const requestedCost = drainPerSecond * seconds;

  if (requestedCost <= 0 || runtime.time.chrono.current <= 0) {
    runtime.time.requestedMode = 'idle';
    return deltaMs;
  }

  const intensity = PhaserMathClamp(runtime.time.chrono.current / requestedCost, 0, 1);
  const spentChrono = requestedCost * intensity;
  runtime.time.chrono.current = Math.max(0, runtime.time.chrono.current - spentChrono);
  runtime.time.activeMode = requestedMode;
  runtime.time.activeIntensity = intensity;

  if (requestedMode === 'rewind') {
    const rewindDeltaMs = deltaMs * intensity;

    if (rewindDeltaMs > 0) {
      rewindCombatRotation(
        runtime,
        rewindDeltaMs,
        CombatTimeControlConfig.REWIND_ROTATION_SPEED_MULTIPLIER,
      );
    }

    return deltaMs * (1 - intensity);
  }

  return (
    deltaMs
    * (
      1
      + (CombatTimeControlConfig.FAST_FORWARD_ROTATION_SPEED_MULTIPLIER - 1) * intensity
    )
  );
}

function PhaserMathClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clearCombatTransientState(runtime: CombatRuntime): void {
  clearCombatProjectiles(runtime);
  clearCombatPendingExplosions(runtime);
  clearCombatBeams(runtime);
  clearCombatZones(runtime);
  clearCombatEnemyStatuses(runtime);
  clearCombatPawnBuffs(runtime);
  runtime.scheduledActivations = [];
}

function getCachedNotePacketVisualIds(color: NoteColor, count: number): string[] {
  const cacheKey = `${color}:${count}`;
  const cachedIds = NOTE_PACKET_VISUALS_CACHE.get(cacheKey);

  if (cachedIds) {
    return cachedIds;
  }

  const ids = Array.from({ length: count }, (_, index) => `note-packet:${color}:${index}`);
  NOTE_PACKET_VISUALS_CACHE.set(cacheKey, ids);
  return ids;
}

function advanceCombatScheduledActivations(runtime: CombatRuntime): void {
  if (runtime.scheduledActivations.length === 0) {
    return;
  }

  const dueActivations: CombatScheduledActivationRuntime[] = [];
  const pendingActivations: CombatScheduledActivationRuntime[] = [];

  for (const activation of runtime.scheduledActivations) {
    if (activation.triggerAtMs <= runtime.combatElapsedMs) {
      dueActivations.push(activation);
      continue;
    }

    pendingActivations.push(activation);
  }

  if (dueActivations.length === 0) {
    return;
  }

  dueActivations.sort((left, right) => left.triggerAtMs - right.triggerAtMs);
  runtime.scheduledActivations = pendingActivations;

  resolveCombatActivations(runtime, [], {
    scheduledActivations: dueActivations,
  });
}

function createEnemyQueuesByDefinitionId(
  enemies: CombatEnemyRuntime[],
): Map<string, CombatEnemyRuntime[]> {
  const queues = new Map<string, CombatEnemyRuntime[]>();

  for (const enemy of enemies) {
    const existingQueue = queues.get(enemy.definitionId);

    if (existingQueue) {
      existingQueue.push(enemy);
      continue;
    }

    queues.set(enemy.definitionId, [enemy]);
  }

  return queues;
}
