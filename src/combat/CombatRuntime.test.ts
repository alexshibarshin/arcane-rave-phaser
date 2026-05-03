import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { createCombatLayoutPlan } from './CombatLayout';
import { advanceCombatRuntime, createCombatRuntime, setCombatState } from './CombatRuntime';

describe('createCombatRuntime', () => {
  it('creates the initial combat source of truth from combat config', () => {
    const runtime = createCombatRuntime();

    expect(runtime.state).toBe('preview');
    expect(runtime.combatElapsedMs).toBe(0);
    expect(runtime.waveElapsedMs).toBe(0);
    expect(runtime.baseHp).toBe(CombatBalanceConfig.BASE_HP);
    expect(runtime.record).toEqual({
      currentAngle: CombatBalanceConfig.RECORD_START_ANGLE_DEG,
      previousAngle: CombatBalanceConfig.RECORD_START_ANGLE_DEG,
      rotationSpeedDegPerSecond: CombatBalanceConfig.RECORD_ROTATION_SPEED_DEG_PER_SECOND,
      startAngle: CombatBalanceConfig.RECORD_START_ANGLE_DEG,
    });
    expect(runtime.notePacket).toEqual({
      color: null,
      count: 0,
      visuals: [],
    });
    expect(runtime.wave.currentWaveIndex).toBe(0);
    expect(runtime.wave.totalWaves).toBe(CombatWaveConfig.WAVES.length);
    expect(runtime.wave.pendingSubWaves).toEqual(
      CombatWaveConfig.WAVES[0]?.subWaves ?? [],
    );
    expect(runtime.slots).toHaveLength(8);
    expect(runtime.enemies).toEqual([]);
    expect(runtime.wave.activeSubWaves).toEqual([]);
    expect(runtime.wave.enemiesRemaining).toBe(0);
    expect(runtime.outcome).toEqual({
      victory: false,
      defeat: false,
    });
    expect(runtime.effects).toEqual({
      transientIds: [],
      pendingEvents: [],
    });
  });

  it('stores preview timing in runtime from combat balance config', () => {
    const runtime = createCombatRuntime();

    expect(runtime.preview).toEqual({
      elapsedMs: 0,
      durationMs: CombatBalanceConfig.PREVIEW_DURATION_MS,
    });
  });

  it('creates stable runtime slots from the combat layout geometry', () => {
    const runtime = createCombatRuntime();
    const layout = createCombatLayoutPlan();

    expect(runtime.slots).toEqual(
      layout.record.slots.map((slot) => ({
        slotIndex: slot.index,
        pawnId:
          [
            'pawn-red-generator',
            'pawn-green-finisher',
            null,
            'pawn-blue-generator',
            'pawn-red-finisher',
            null,
            'pawn-green-generator',
            'pawn-blue-finisher',
          ][slot.index] ?? null,
        worldPosition: {
          x:
            layout.record.centerX
            + Math.cos((slot.centerAngleDeg * Math.PI) / 180) * layout.record.radius * 0.75,
          y:
            layout.record.centerY
            + Math.sin((slot.centerAngleDeg * Math.PI) / 180) * layout.record.radius * 0.75,
        },
        sectorCenterAngleDeg: slot.centerAngleDeg,
        activationVisualState: 'idle',
      })),
    );
  });

  it('advances from preview to running after the config-driven preview delay', () => {
    const runtime = createCombatRuntime();

    advanceCombatRuntime(runtime, CombatBalanceConfig.PREVIEW_DURATION_MS - 1);
    expect(runtime.state).toBe('preview');
    expect(runtime.preview.elapsedMs).toBe(CombatBalanceConfig.PREVIEW_DURATION_MS - 1);

    advanceCombatRuntime(runtime, 1);
    expect(runtime.state).toBe('running');
    expect(runtime.preview.elapsedMs).toBe(CombatBalanceConfig.PREVIEW_DURATION_MS);
  });

  it('rotates the record counterclockwise only while combat is running', () => {
    const runtime = createCombatRuntime();

    advanceCombatRuntime(runtime, 500);
    expect(runtime.record.previousAngle).toBe(CombatBalanceConfig.RECORD_START_ANGLE_DEG);
    expect(runtime.record.currentAngle).toBe(CombatBalanceConfig.RECORD_START_ANGLE_DEG);

    setCombatState(runtime, 'running');
    advanceCombatRuntime(runtime, 1000);

    expect(runtime.record.previousAngle).toBe(CombatBalanceConfig.RECORD_START_ANGLE_DEG);
    expect(runtime.record.currentAngle).toBe(
      CombatBalanceConfig.RECORD_START_ANGLE_DEG
        - CombatBalanceConfig.RECORD_ROTATION_SPEED_DEG_PER_SECOND,
    );

    setCombatState(runtime, 'paused');
    advanceCombatRuntime(runtime, 1000);

    expect(runtime.record.previousAngle).toBe(CombatBalanceConfig.RECORD_START_ANGLE_DEG);
    expect(runtime.record.currentAngle).toBe(
      CombatBalanceConfig.RECORD_START_ANGLE_DEG
        - CombatBalanceConfig.RECORD_ROTATION_SPEED_DEG_PER_SECOND,
    );
  });

  it('activates every crossed empty slot in temporal order during multi-crossing frames', () => {
    const runtime = createCombatRuntime();
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = -10;
    runtime.record.previousAngle = -10;
    runtime.record.rotationSpeedDegPerSecond = 180;

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.effects.transientIds).toEqual([
      'slot-activated:1',
      'slot-activated:2',
      'slot-activated:3',
      'slot-activated:4',
    ]);
    expect(runtime.slots[1]?.activationVisualState).toBe('active');
    expect(runtime.slots[2]?.activationVisualState).toBe('active');
    expect(runtime.slots[3]?.activationVisualState).toBe('active');
    expect(runtime.slots[4]?.activationVisualState).toBe('active');
    expect(runtime.slots[0]?.activationVisualState).toBe('idle');
    expect(runtime.slots[5]?.activationVisualState).toBe('idle');
  });
});
