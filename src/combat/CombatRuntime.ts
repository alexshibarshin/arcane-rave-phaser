import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig, type CombatSubWaveConfig } from '@config/CombatWaveConfig';

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
  };
}

export function createCombatRuntime(): CombatRuntime {
  const initialWave = CombatWaveConfig.WAVES[0];
  const startAngle = initialWave?.startAngleDeg ?? CombatBalanceConfig.RECORD_START_ANGLE_DEG;

  return {
    state: 'preview',
    combatElapsedMs: 0,
    waveElapsedMs: 0,
    baseHp: CombatBalanceConfig.BASE_HP,
    record: {
      currentAngle: startAngle,
      previousAngle: startAngle,
      rotationSpeedDegPerSecond: CombatBalanceConfig.RECORD_ROTATION_SPEED_DEG_PER_SECOND,
      startAngle,
    },
    slots: [],
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
    },
  };
}
