import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { advanceCombatRuntime, createCombatRuntime } from './CombatRuntime';

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
    expect(runtime.slots).toEqual([]);
    expect(runtime.enemies).toEqual([]);
    expect(runtime.wave.activeSubWaves).toEqual([]);
    expect(runtime.wave.enemiesRemaining).toBe(0);
    expect(runtime.outcome).toEqual({
      victory: false,
      defeat: false,
    });
    expect(runtime.effects).toEqual({
      transientIds: [],
    });
  });

  it('stores preview timing in runtime from combat balance config', () => {
    const runtime = createCombatRuntime();

    expect(runtime.preview).toEqual({
      elapsedMs: 0,
      durationMs: CombatBalanceConfig.PREVIEW_DURATION_MS,
    });
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
});
