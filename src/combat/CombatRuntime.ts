import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, type CombatSubWaveConfig } from '@config/CombatWaveConfig';
import {
  COMBAT_NEEDLE_ANGLE_DEGREES,
  createCombatLayoutPlan,
} from './CombatLayout';

export type CombatState = 'preview' | 'running' | 'paused' | 'victory' | 'defeat';
export type NoteColor = (typeof CombatContentConfig.NOTE_COLORS)[number];

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
  id: string;
  enemyType: string;
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
    pendingEvents: Array<{
      event: 'combat:slot-activated';
      payload: { slotIndex: number };
    }>;
  };
}

export function createCombatRuntime(): CombatRuntime {
  const initialWave = CombatWaveConfig.WAVES[0];
  const startAngle = initialWave?.startAngleDeg ?? CombatBalanceConfig.RECORD_START_ANGLE_DEG;
  const layout = createCombatLayoutPlan();
  const slotAnchorRadius = layout.record.radius * 0.75;

  return {
    state: 'preview',
    combatElapsedMs: 0,
    waveElapsedMs: 0,
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
      pawnId: null,
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
    enemies: [],
    wave: {
      currentWaveIndex: 0,
      totalWaves: CombatWaveConfig.WAVES.length,
      currentWaveId: initialWave?.id ?? null,
      activeSubWaves: [],
      pendingSubWaves: [...(initialWave?.subWaves ?? [])],
      enemiesRemaining: 0,
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

export function advanceCombatRuntime(runtime: CombatRuntime, deltaMs: number): void {
  runtime.combatElapsedMs += deltaMs;

  if (runtime.state === 'running') {
    resetSlotActivationEffects(runtime);
    runtime.record.previousAngle = runtime.record.currentAngle;
    runtime.record.currentAngle -=
      runtime.record.rotationSpeedDegPerSecond * (deltaMs / 1000);
    processCrossedSlots(runtime);

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
