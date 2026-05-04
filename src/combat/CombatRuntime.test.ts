import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { createCombatLayoutPlan } from './CombatLayout';
import {
  advanceCombatRuntime,
  createCombatRuntime,
  setCombatNotePacket,
  setCombatState,
} from './CombatRuntime';

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
    expect(runtime.enemies).toHaveLength(CombatContentConfig.ENEMY_DEFINITIONS.length);
    expect(runtime.wave.activeSubWaves).toEqual([]);
    expect(runtime.wave.enemiesRemaining).toBe(CombatContentConfig.ENEMY_DEFINITIONS.length);
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

  it('centralizes note packet updates with capacity clamping and fresh visual ids', () => {
    const runtime = createCombatRuntime();

    setCombatNotePacket(runtime, 'red', CombatBalanceConfig.NOTE_PACKET_CAPACITY + 2);
    expect(runtime.notePacket).toEqual({
      color: 'red',
      count: CombatBalanceConfig.NOTE_PACKET_CAPACITY,
      visuals: [
        'note-packet:red:0',
        'note-packet:red:1',
        'note-packet:red:2',
        'note-packet:red:3',
        'note-packet:red:4',
      ],
    });

    setCombatNotePacket(runtime, 'blue', 2);
    expect(runtime.notePacket).toEqual({
      color: 'blue',
      count: 2,
      visuals: ['note-packet:blue:0', 'note-packet:blue:1'],
    });

    setCombatNotePacket(runtime, 'blue', 0);
    expect(runtime.notePacket).toEqual({
      color: null,
      count: 0,
      visuals: [],
    });
  });

  it('creates one placeholder runtime enemy per content definition with future combat fields', () => {
    const runtime = createCombatRuntime();

    expect(runtime.enemies).toEqual(
      CombatContentConfig.ENEMY_DEFINITIONS.map((enemy, index) => ({
        runtimeId: `enemy-runtime-${index + 1}`,
        definitionId: enemy.id,
        archetype: enemy.archetype,
        color: enemy.color,
        currentHp: enemy.maxHp,
        maxHp: enemy.maxHp,
        x: [180, 360, 540][index],
        y: [240, 320, 400][index],
        state: 'moving',
        spawned: false,
        nextAttackAtMs: 0,
        renderContainerName: `enemy-container-${index + 1}`,
      })),
    );
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

  it('moves enemies downward until they enter base attack range and then switches them to attacking', () => {
    const runtime = createCombatRuntime();
    const enemy = runtime.enemies[0];

    expect(enemy).toBeDefined();

    if (!enemy) {
      return;
    }

    runtime.spawn.pendingEnemyRuntimeIds = [];
    enemy.x = CombatLayoutConfig.BASE_X;
    enemy.y = CombatLayoutConfig.ENEMY_ZONE_TOP;
    enemy.spawned = true;
    setCombatState(runtime, 'running');

    advanceCombatRuntime(runtime, 1000);

    expect(enemy.x).toBe(CombatLayoutConfig.BASE_X);
    expect(enemy.y).toBe(
      CombatLayoutConfig.ENEMY_ZONE_TOP + CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
    );
    expect(enemy.state).toBe('moving');

    advanceCombatRuntime(runtime, 15750);

    expect(enemy.x).toBe(CombatLayoutConfig.BASE_X);
    expect(enemy.y).toBe(
      CombatLayoutConfig.BASE_Y - CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
    );
    expect(enemy.state).toBe('attacking');
  });

  it('lets an attacking enemy damage the base on its cooldown until combat reaches defeat', () => {
    const runtime = createCombatRuntime();
    const enemy = runtime.enemies[0];

    expect(enemy).toBeDefined();

    if (!enemy) {
      return;
    }

    runtime.spawn.pendingEnemyRuntimeIds = [];
    runtime.baseHp = 2;
    enemy.state = 'attacking';
    enemy.spawned = true;
    enemy.nextAttackAtMs = 0;
    setCombatState(runtime, 'running');

    advanceCombatRuntime(runtime, CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS - 1);
    expect(runtime.baseHp).toBe(2);
    expect(runtime.state).toBe('running');

    advanceCombatRuntime(runtime, 1);
    expect(runtime.baseHp).toBe(1);
    expect(runtime.state).toBe('running');

    advanceCombatRuntime(runtime, CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS);
    expect(runtime.baseHp).toBe(0);
    expect(runtime.state).toBe('defeat');
  });

  it('bootstraps enemy spawns into the top lane with config-driven x range and anti-clumping', () => {
    const runtime = createCombatRuntime();
    const randomValues = [0.1, 0.12, 0.9];
    let randomIndex = 0;
    const nextRandom = (): number => {
      const value = randomValues[randomIndex] ?? randomValues[randomValues.length - 1] ?? 0.5;

      randomIndex += 1;

      return value;
    };

    setCombatState(runtime, 'running');

    advanceCombatRuntime(runtime, 1, { random: nextRandom });

    expect(runtime.enemies[0]).toMatchObject({
      spawned: true,
      state: 'moving',
      y: CombatLayoutConfig.ENEMY_SPAWN_Y,
    });
    expect(runtime.enemies[0]?.x).toBeGreaterThanOrEqual(CombatLayoutConfig.ENEMY_SPAWN_X_MIN);
    expect(runtime.enemies[0]?.x).toBeLessThanOrEqual(CombatLayoutConfig.ENEMY_SPAWN_X_MAX);
    expect(runtime.enemies[1]?.spawned).toBe(false);

    advanceCombatRuntime(runtime, CombatWaveConfig.WAVES[0]?.subWaves[0]?.spawnIntervalMs ?? 900, {
      random: nextRandom,
    });

    expect(runtime.enemies[1]).toMatchObject({
      spawned: true,
      state: 'moving',
      y: CombatLayoutConfig.ENEMY_SPAWN_Y,
    });
    expect(
      Math.abs((runtime.enemies[1]?.x ?? 0) - (runtime.enemies[0]?.x ?? 0)),
    ).toBeGreaterThanOrEqual(CombatBalanceConfig.ENEMY_SPAWN_MIN_GAP_PX);
  });
});
