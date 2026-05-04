import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { COMBAT_NEEDLE_ANGLE_DEGREES, createCombatLayoutPlan } from './CombatLayout';
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
      CombatWaveConfig.WAVES[0]?.subWaves.filter((sw) => sw.startTimeMs > 0) ?? [],
    );
    expect(runtime.slots).toHaveLength(8);
    expect(runtime.enemies).toHaveLength(6);
    expect(runtime.wave.activeSubWaves).toHaveLength(1);
    expect(runtime.wave.activeSubWaves[0]?.id).toBe('wave-1-a');
    expect(runtime.wave.enemiesRemaining).toBe(6);
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

  it('creates runtime enemies for all spawns across all sub-waves', () => {
    const runtime = createCombatRuntime();

    // wave-1-a: 2 red + 1 green = 3
    // wave-1-b: 2 blue + 1 red = 3
    // Total: 3 red + 1 green + 2 blue = 6
    expect(runtime.enemies).toHaveLength(6);

    const redEnemies = runtime.enemies.filter((e) => e.definitionId === 'enemy-red-basic');
    const greenEnemies = runtime.enemies.filter((e) => e.definitionId === 'enemy-green-basic');
    const blueEnemies = runtime.enemies.filter((e) => e.definitionId === 'enemy-blue-basic');

    expect(redEnemies).toHaveLength(3);
    expect(greenEnemies).toHaveLength(1);
    expect(blueEnemies).toHaveLength(2);

    expect(runtime.enemies[0]!.runtimeId).toBe('enemy-runtime-1');
    expect(runtime.enemies[0]!.definitionId).toBe('enemy-red-basic');
    expect(runtime.enemies[3]!.runtimeId).toBe('enemy-runtime-4');
    expect(runtime.enemies[3]!.definitionId).toBe('enemy-green-basic');
    expect(runtime.enemies[5]!.runtimeId).toBe('enemy-runtime-6');
    expect(runtime.enemies[5]!.definitionId).toBe('enemy-blue-basic');

    for (const enemy of runtime.enemies) {
      expect(enemy.spawned).toBe(false);
      expect(enemy.state).toBe('moving');
    }
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

  it('resolves a crossed generator slot against the nearest living enemy and creates a new packet from empty', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const generatorSlot = runtime.slots[0];

    expect(generatorSlot).toBeDefined();

    if (!generatorSlot) {
      return;
    }

    generatorSlot.pawnId = 'pawn-red-generator';
    generatorSlot.worldPosition = { x: 100, y: 100 };
    generatorSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    const nearestEnemy = runtime.enemies[0];
    const fartherEnemy = runtime.enemies[1];

    expect(nearestEnemy).toBeDefined();
    expect(fartherEnemy).toBeDefined();

    if (!nearestEnemy || !fartherEnemy) {
      return;
    }

    nearestEnemy.spawned = true;
    nearestEnemy.state = 'moving';
    nearestEnemy.currentHp = nearestEnemy.maxHp;
    nearestEnemy.x = 120;
    nearestEnemy.y = 100;

    fartherEnemy.spawned = true;
    fartherEnemy.state = 'moving';
    fartherEnemy.currentHp = fartherEnemy.maxHp;
    fartherEnemy.x = 320;
    fartherEnemy.y = 260;

    for (const enemy of runtime.enemies.slice(2)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.effects.transientIds).toContain('slot-activated:0');
    expect(runtime.slots[0]?.activationVisualState).toBe('active');
    expect(nearestEnemy.currentHp).toBe(
      nearestEnemy.maxHp - CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
    );
    expect(fartherEnemy.currentHp).toBe(fartherEnemy.maxHp);
    expect(runtime.notePacket).toEqual({
      color: 'red',
      count: 2,
      visuals: ['note-packet:red:0', 'note-packet:red:1'],
    });
  });

  it('adds two notes to a same-color packet and clamps the count at the packet cap', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;
    setCombatNotePacket(runtime, 'green', CombatBalanceConfig.NOTE_PACKET_CAPACITY - 1);

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 200, y: 200 };
      slot.sectorCenterAngleDeg = null;
    }

    const generatorSlot = runtime.slots[0];

    expect(generatorSlot).toBeDefined();

    if (!generatorSlot) {
      return;
    }

    generatorSlot.pawnId = 'pawn-green-generator';
    generatorSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket).toEqual({
      color: 'green',
      count: CombatBalanceConfig.NOTE_PACKET_CAPACITY,
      visuals: [
        'note-packet:green:0',
        'note-packet:green:1',
        'note-packet:green:2',
        'note-packet:green:3',
        'note-packet:green:4',
      ],
    });
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:note-packet-changed',
      payload: {
        color: 'green',
        count: CombatBalanceConfig.NOTE_PACKET_CAPACITY,
      },
    });
  });

  it('breaks a foreign-color packet, replaces it with a two-note generator packet, and emits a color-break signal', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;
    setCombatNotePacket(runtime, 'blue', 4);

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 200, y: 200 };
      slot.sectorCenterAngleDeg = null;
    }

    const generatorSlot = runtime.slots[0];

    expect(generatorSlot).toBeDefined();

    if (!generatorSlot) {
      return;
    }

    generatorSlot.pawnId = 'pawn-red-generator';
    generatorSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket).toEqual({
      color: 'red',
      count: 2,
      visuals: ['note-packet:red:0', 'note-packet:red:1'],
    });
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:note-packet-color-broke',
      payload: {
        previousColor: 'blue',
        nextColor: 'red',
      },
    });
  });

  it('ignores dead or invalid enemies, resolves safely into empty space, and still mutates the packet', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const generatorSlot = runtime.slots[0];

    expect(generatorSlot).toBeDefined();

    if (!generatorSlot) {
      return;
    }

    generatorSlot.pawnId = 'pawn-blue-generator';
    generatorSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    const nearestDeadEnemy = runtime.enemies[0];
    const unspawnedEnemy = runtime.enemies[1];

    expect(nearestDeadEnemy).toBeDefined();
    expect(unspawnedEnemy).toBeDefined();

    if (!nearestDeadEnemy || !unspawnedEnemy) {
      return;
    }

    nearestDeadEnemy.spawned = true;
    nearestDeadEnemy.state = 'dead';
    nearestDeadEnemy.currentHp = 0;
    nearestDeadEnemy.x = 105;
    nearestDeadEnemy.y = 100;

    unspawnedEnemy.spawned = false;
    unspawnedEnemy.state = 'moving';
    unspawnedEnemy.currentHp = unspawnedEnemy.maxHp;
    unspawnedEnemy.x = 110;
    unspawnedEnemy.y = 100;

    for (const enemy of runtime.enemies.slice(2)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:enemy-hit')).toBe(false);
    expect(runtime.notePacket).toEqual({
      color: 'blue',
      count: 2,
      visuals: ['note-packet:blue:0', 'note-packet:blue:1'],
    });
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:pawn-resolved',
      payload: {
        slotIndex: 0,
        pawnId: 'pawn-blue-generator',
        pawnType: 'generator',
      },
    });
  });

  it('consumes a same-color packet, scales finisher damage by consumed notes, and leaves one output note', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;
    setCombatNotePacket(runtime, 'green', 3);

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const finisherSlot = runtime.slots[0];
    const targetEnemy = runtime.enemies[0];

    expect(finisherSlot).toBeDefined();
    expect(targetEnemy).toBeDefined();

    if (!finisherSlot || !targetEnemy) {
      return;
    }

    finisherSlot.pawnId = 'pawn-green-finisher';
    finisherSlot.worldPosition = { x: 100, y: 100 };
    finisherSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    targetEnemy.spawned = true;
    targetEnemy.state = 'moving';
    targetEnemy.currentHp = targetEnemy.maxHp;
    targetEnemy.x = 120;
    targetEnemy.y = 100;

    for (const enemy of runtime.enemies.slice(1)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    expect(targetEnemy.currentHp).toBe(
      targetEnemy.maxHp
        - Math.round(
          CombatBalanceConfig.FINISHER_BASE_DAMAGE
            * CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER[3],
        ),
    );
    expect(runtime.notePacket).toEqual({
      color: 'blue',
      count: 1,
      visuals: ['note-packet:blue:0'],
    });
  });

  it('breaks a foreign-color packet, still attacks on the zero-consumed multiplier path, and emits one output note', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;
    setCombatNotePacket(runtime, 'red', 5);

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const finisherSlot = runtime.slots[0];
    const targetEnemy = runtime.enemies[0];

    expect(finisherSlot).toBeDefined();
    expect(targetEnemy).toBeDefined();

    if (!finisherSlot || !targetEnemy) {
      return;
    }

    finisherSlot.pawnId = 'pawn-green-finisher';
    finisherSlot.worldPosition = { x: 100, y: 100 };
    finisherSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    targetEnemy.spawned = true;
    targetEnemy.state = 'moving';
    targetEnemy.currentHp = targetEnemy.maxHp;
    targetEnemy.x = 120;
    targetEnemy.y = 100;

    for (const enemy of runtime.enemies.slice(1)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    expect(targetEnemy.currentHp).toBe(
      targetEnemy.maxHp
        - Math.round(
          CombatBalanceConfig.FINISHER_BASE_DAMAGE
            * CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER[0],
        ),
    );
    expect(runtime.notePacket).toEqual({
      color: 'blue',
      count: 1,
      visuals: ['note-packet:blue:0'],
    });
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:note-packet-color-broke',
      payload: {
        previousColor: 'red',
        nextColor: 'blue',
      },
    });
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:finisher-consumed-notes',
      payload: {
        slotIndex: 0,
        pawnId: 'pawn-green-finisher',
        consumedNotes: 0,
        multiplier: CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER[0],
      },
    });
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:finisher-output-note-emitted',
      payload: {
        slotIndex: 0,
        pawnId: 'pawn-green-finisher',
        color: 'blue',
        count: 1,
      },
    });
  });

  it('moves enemies downward until they enter base attack range and then switches them to attacking', () => {
    const runtime = createCombatRuntime();
    const enemy = runtime.enemies[0];

    expect(enemy).toBeDefined();

    if (!enemy) {
      return;
    }

    // Prevent spawn bag from interfering with manual test setup
    runtime.wave.activeSubWaves = [];
    runtime.wave.spawnBags.clear();
    for (const slot of runtime.slots) {
      slot.pawnId = null;
    }
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

    // Prevent spawn bag from interfering with manual test setup
    runtime.wave.activeSubWaves = [];
    runtime.wave.spawnBags.clear();
    for (const slot of runtime.slots) {
      slot.pawnId = null;
    }
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

  it('applies a 1.5x weakness multiplier when a red generator attacks a green enemy', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const generatorSlot = runtime.slots[0];
    const targetEnemy = runtime.enemies[0];
    const otherEnemy = runtime.enemies[1];

    expect(generatorSlot).toBeDefined();
    expect(targetEnemy).toBeDefined();
    expect(otherEnemy).toBeDefined();

    if (!generatorSlot || !targetEnemy || !otherEnemy) {
      return;
    }

    generatorSlot.pawnId = 'pawn-red-generator';
    generatorSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    // enemy[0] is green (weak to red) — should take weakness damage
    targetEnemy.color = 'green';
    targetEnemy.spawned = true;
    targetEnemy.state = 'moving';
    targetEnemy.currentHp = targetEnemy.maxHp;
    targetEnemy.x = 120;
    targetEnemy.y = 100;

    // enemy[1] is red (no weakness advantage) — should take normal damage
    otherEnemy.color = 'red';
    otherEnemy.spawned = true;
    otherEnemy.state = 'moving';
    otherEnemy.currentHp = otherEnemy.maxHp;
    otherEnemy.x = 320;
    otherEnemy.y = 260;

    for (const enemy of runtime.enemies.slice(2)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    // red > green => weakness multiplier 1.5x applied
    expect(targetEnemy.currentHp).toBe(
      targetEnemy.maxHp - Math.round(CombatBalanceConfig.GENERATOR_BASE_DAMAGE * 1.5),
    );
    // no weakness for same-color matchup
    expect(otherEnemy.currentHp).toBe(otherEnemy.maxHp);
    // event payload must include the weakness flag
    const hitPayload = runtime.effects.pendingEvents.find(
      (e) => e.event === 'combat:enemy-hit' && e.payload.enemyId === targetEnemy.runtimeId,
    )?.payload as { damage: number; wasWeaknessHit: boolean };
    expect(hitPayload.damage).toBe(Math.round(CombatBalanceConfig.GENERATOR_BASE_DAMAGE * 1.5));
    expect(hitPayload.wasWeaknessHit).toBe(true);
  });

  it('applies a 1.5x weakness multiplier to finisher damage when attacker color has advantage', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;
    setCombatNotePacket(runtime, 'red', 3);

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const finisherSlot = runtime.slots[0];
    const targetEnemy = runtime.enemies[0];
    const otherEnemy = runtime.enemies[1];

    expect(finisherSlot).toBeDefined();
    expect(targetEnemy).toBeDefined();
    expect(otherEnemy).toBeDefined();

    if (!finisherSlot || !targetEnemy || !otherEnemy) {
      return;
    }

    finisherSlot.pawnId = 'pawn-red-finisher';
    finisherSlot.worldPosition = { x: 100, y: 100 };
    finisherSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    // enemy[0] is green (weak to red) — should take weakness damage
    targetEnemy.color = 'green';
    targetEnemy.spawned = true;
    targetEnemy.state = 'moving';
    targetEnemy.currentHp = targetEnemy.maxHp;
    targetEnemy.x = 120;
    targetEnemy.y = 100;

    // enemy[1] is red (no weakness) — should take normal finisher damage
    otherEnemy.color = 'red';
    otherEnemy.spawned = true;
    otherEnemy.state = 'moving';
    otherEnemy.currentHp = otherEnemy.maxHp;
    otherEnemy.x = 320;
    otherEnemy.y = 260;

    for (const enemy of runtime.enemies.slice(2)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    // finisher base: 20 * 1.4 (3 notes) = 28, then weakness 28 * 1.5 = 42
    const finisherBaseDamage = Math.round(
      CombatBalanceConfig.FINISHER_BASE_DAMAGE
        * CombatBalanceConfig.FINISHER_CONSUMED_NOTES_MULTIPLIER[3],
    );
    const finisherWeakDamage = Math.round(finisherBaseDamage * 1.5);

    expect(targetEnemy.currentHp).toBe(Math.max(0, targetEnemy.maxHp - finisherWeakDamage));
    // other enemy was not targeted (only nearest is hit)
    expect(otherEnemy.currentHp).toBe(otherEnemy.maxHp);

    const hitPayload = runtime.effects.pendingEvents.find(
      (e) => e.event === 'combat:enemy-hit' && e.payload.enemyId === targetEnemy.runtimeId,
    )?.payload as { damage: number; wasWeaknessHit: boolean };
    expect(hitPayload.damage).toBe(finisherWeakDamage);
    expect(hitPayload.wasWeaknessHit).toBe(true);
  });

  it('applies no multiplier for disadvantaged and same-color matchups', () => {
    const runtime = createCombatRuntime();

    runtime.spawn.pendingEnemyRuntimeIds = [];
    setCombatState(runtime, 'running');
    runtime.record.currentAngle = 10;
    runtime.record.previousAngle = 10;
    runtime.record.rotationSpeedDegPerSecond = 20;

    for (const slot of runtime.slots) {
      slot.pawnId = null;
      slot.worldPosition = { x: 100, y: 100 };
      slot.sectorCenterAngleDeg = null;
    }

    const generatorSlot = runtime.slots[0];
    const targetEnemy = runtime.enemies[0];

    expect(generatorSlot).toBeDefined();
    expect(targetEnemy).toBeDefined();

    if (!generatorSlot || !targetEnemy) {
      return;
    }

    generatorSlot.pawnId = 'pawn-green-generator';
    generatorSlot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

    // green vs red = disadvantaged (red > green, not green > red)
    targetEnemy.color = 'red';
    targetEnemy.spawned = true;
    targetEnemy.state = 'moving';
    targetEnemy.currentHp = targetEnemy.maxHp;
    targetEnemy.x = 120;
    targetEnemy.y = 100;

    for (const enemy of runtime.enemies.slice(1)) {
      enemy.spawned = false;
      enemy.state = 'dead';
      enemy.currentHp = 0;
    }

    advanceCombatRuntime(runtime, 1000);

    // disadvantaged: no weakness multiplier, plain baseDamage
    expect(targetEnemy.currentHp).toBe(targetEnemy.maxHp - CombatBalanceConfig.GENERATOR_BASE_DAMAGE);

    const hitPayload = runtime.effects.pendingEvents.find(
      (e) => e.event === 'combat:enemy-hit' && e.payload.enemyId === targetEnemy.runtimeId,
    )?.payload as { damage: number; wasWeaknessHit: boolean };
    expect(hitPayload.damage).toBe(CombatBalanceConfig.GENERATOR_BASE_DAMAGE);
    expect(hitPayload.wasWeaknessHit).toBe(false);
  });

  it('activates sub-waves by absolute startTimeMs from wave start, not by completion order', () => {
    const runtime = createCombatRuntime();

    // At t=0: first sub-wave (startTimeMs: 0) should be active with spawn bag
    expect(runtime.wave.activeSubWaves).toHaveLength(1);
    expect(runtime.wave.activeSubWaves[0]?.id).toBe('wave-1-a');
    expect(runtime.wave.pendingSubWaves).toHaveLength(1);
    expect(runtime.wave.pendingSubWaves[0]?.id).toBe('wave-1-b');
    expect(runtime.wave.spawnBags.get('wave-1-a')?.enemyRuntimeIds).toHaveLength(3);
    const redRuntimes = runtime.enemies.filter((e) => e.definitionId === 'enemy-red-basic');
    const greenRuntime = runtime.enemies.find((e) => e.definitionId === 'enemy-green-basic');
    expect(redRuntimes.length).toBe(3);
    expect(greenRuntime).toBeDefined();
    expect(runtime.wave.spawnBags.get('wave-1-a')?.enemyRuntimeIds).toContain(
      redRuntimes[0]?.runtimeId,
    );
    expect(runtime.wave.spawnBags.get('wave-1-a')?.enemyRuntimeIds).toContain(
      greenRuntime?.runtimeId,
    );

    // After advancing past second sub-wave start time (2500ms)
    setCombatState(runtime, 'running');
    runtime.waveElapsedMs = 2500;

    advanceCombatRuntime(runtime, 1);

    expect(runtime.wave.activeSubWaves).toHaveLength(2);
    expect(runtime.wave.pendingSubWaves).toHaveLength(0);
    // Bag exists (contents immediately consumed by bootstrapEnemySpawns in same advance call)
    expect(runtime.wave.spawnBags.has('wave-1-b')).toBe(true);
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

    for (const slot of runtime.slots) {
      slot.pawnId = null;
    }
    setCombatState(runtime, 'running');

    advanceCombatRuntime(runtime, 1, { random: nextRandom });

    // After 1ms the first enemy from the shuffled bag should be spawned
    const spawnedAfterFirst = runtime.enemies.filter((e) => e.spawned);
    expect(spawnedAfterFirst).toHaveLength(1);
    expect(spawnedAfterFirst[0]?.state).toBe('moving');
    expect(spawnedAfterFirst[0]?.y).toBe(CombatLayoutConfig.ENEMY_SPAWN_Y);
    expect(spawnedAfterFirst[0]?.x).toBeGreaterThanOrEqual(
      CombatLayoutConfig.ENEMY_SPAWN_X_MIN,
    );
    expect(spawnedAfterFirst[0]?.x).toBeLessThanOrEqual(CombatLayoutConfig.ENEMY_SPAWN_X_MAX);

    advanceCombatRuntime(runtime, CombatWaveConfig.WAVES[0]?.subWaves[0]?.spawnIntervalMs ?? 900, {
      random: nextRandom,
    });

    // After 900ms more the second enemy from the bag should be spawned
    const spawnedAfterSecond = runtime.enemies.filter((e) => e.spawned);
    expect(spawnedAfterSecond).toHaveLength(2);
    // One enemy was just spawned (y at spawn line), the other moved down
    expect(spawnedAfterSecond.some((e) => e.y === CombatLayoutConfig.ENEMY_SPAWN_Y)).toBe(true);
    const spawnXs = spawnedAfterSecond.map((e) => e.x ?? 0);
    expect(Math.abs((spawnXs[1] ?? 0) - (spawnXs[0] ?? 0))).toBeGreaterThanOrEqual(
      CombatBalanceConfig.ENEMY_SPAWN_MIN_GAP_PX,
    );
  });

  it('evaluates victory when all sub-waves started, all bags empty, and all enemies dead', () => {
    const runtime = createCombatRuntime();
    setCombatState(runtime, 'running');

    // Advance past all sub-wave spawn times:
    // wave-1-a: spawns at 0, 900, 1800 (3 runtime IDs: 2 red + 1 green)
    // wave-1-b: activates at 2500, spawns at 2500 (3 runtime IDs: 2 blue + 1 red)
    advanceCombatRuntime(runtime, 5000);

    const allSpawned = runtime.enemies.filter((e) => e.spawned);
    expect(allSpawned).toHaveLength(6);

    // Kill all enemies
    for (const enemy of runtime.enemies) {
      if (enemy.spawned) {
        enemy.state = 'dead';
        enemy.currentHp = 0;
      }
    }

    // After all enemies dead and all bags empty, victory should be true
    advanceCombatRuntime(runtime, 1);

    expect(runtime.state).toBe('victory');
    expect(runtime.outcome.victory).toBe(true);
  });

  it('does not evaluate victory when future sub-waves are still pending', () => {
    const runtime = createCombatRuntime();
    setCombatState(runtime, 'running');

    // Advance time to spawn all enemies from wave-1-a (wave-1-b still pending at 2000ms)
    advanceCombatRuntime(runtime, 2000);

    // Kill all currently spawned enemies
    for (const enemy of runtime.enemies) {
      if (enemy.spawned) {
        enemy.state = 'dead';
        enemy.currentHp = 0;
      }
    }

    // Advance a bit more - victory should NOT trigger because wave-1-b is still pending
    advanceCombatRuntime(runtime, 500);

    expect(runtime.state).toBe('running');
    expect(runtime.outcome.victory).toBe(false);
  });

  it('emits enemies-left count via runtime wave state', () => {
    const runtime = createCombatRuntime();
    setCombatState(runtime, 'running');

    // Advance to spawn wave-1-a enemies (wave-1-b still pending)
    // wave-1-a: spawns at 0, 900, 1800 (3 enemies total)
    advanceCombatRuntime(runtime, 2000);

    const spawnedAfterFirst = runtime.enemies.filter((e) => e.spawned);
    expect(spawnedAfterFirst).toHaveLength(3);

    // enemiesRemaining = living enemies (3) + enemies in active bags (0) + enemies in pending sub-waves (3)
    expect(runtime.wave.enemiesRemaining).toBe(6);
  });
});
