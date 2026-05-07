import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { COMBAT_NEEDLE_ANGLE_DEGREES } from './CombatLayout';
import {
  advanceCombatRuntime,
  createCombatRuntime,
  setCombatNotePacket,
  setCombatState,
  syncCombatSlotWorldPositions,
  type CombatRuntime,
} from './CombatRuntime';

describe('CombatRuntime', () => {
  it('creates combat state with effect-family containers for the overhaul', () => {
    const runtime = createCombatRuntime();

    expect(runtime.projectiles).toEqual([]);
    expect(runtime.queuedVolleys).toEqual([]);
    expect(runtime.pendingExplosions).toEqual([]);
    expect(runtime.beams).toEqual([]);
    expect(runtime.zones).toEqual([]);
    expect(Array.from(runtime.enemyStatuses.values())).toEqual([]);
    expect(runtime.pawnBuffs).toHaveLength(runtime.slots.length);
  });

  it('indexes provided slot modifier assignments into a full slot-sized runtime array', () => {
    const runtime = createCombatRuntime(undefined, {
      slotModifiers: [
        { slotIndex: 2, modifierId: 'plus-one-output-note' },
        { slotIndex: 5, modifierId: 'plus-two-output-notes' },
      ],
    });

    expect(runtime.slotModifiers).toHaveLength(8);
    expect(runtime.slotModifiers).toEqual([
      null,
      null,
      { slotIndex: 2, modifierId: 'plus-one-output-note' },
      null,
      null,
      { slotIndex: 5, modifierId: 'plus-two-output-notes' },
      null,
      null,
    ]);
  });

  it('spawns a Ruby Needle projectile, damages an enemy, and still emits generator notes', () => {
    const runtime = createReadyRuntime('ruby-needle');
    const target = primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red' });

    advanceCombatRuntime(runtime, 1000);

    expect(target.currentHp).toBeLessThan(target.maxHp);
    expect(runtime.notePacket.color).toBe('red');
    expect(runtime.notePacket.count).toBeGreaterThan(0);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:projectile-spawned')).toBe(true);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:projectile-hit')).toBe(true);
  });

  it('clamps same-color generator note overflow while still allowing no-target casts', () => {
    const runtime = createReadyRuntime('moss-patch');
    setCombatNotePacket(runtime, 'green', 4);

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('green');
    expect(runtime.notePacket.count).toBeGreaterThan(0);
    expect(runtime.notePacket.count).toBeLessThanOrEqual(CombatBalanceConfig.NOTE_PACKET_CAPACITY);
    expect(runtime.zones).toHaveLength(0);
  });

  it('adds bonus output notes for generators from slot modifiers', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-output-note' };

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('red');
    expect(runtime.notePacket.count).toBeGreaterThan(2);
  });

  it('supports plus-two output note modifiers for generators', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-two-output-notes' };

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('red');
    expect(runtime.notePacket.count).toBeGreaterThan(3);
  });

  it('applies generator bonus notes before same-color capacity clamping', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-two-output-notes' };
    setCombatNotePacket(runtime, 'red', 4);

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('red');
    expect(runtime.notePacket.count).toBeGreaterThanOrEqual(4);
    expect(runtime.notePacket.count).toBeLessThanOrEqual(CombatBalanceConfig.NOTE_PACKET_CAPACITY);
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:generator-notes-emitted',
      payload: {
        slotIndex: 0,
        pawnId: 'ruby-needle',
        color: 'red',
        count: 1,
      },
    });
  });

  it('applies color-specific output bonuses using the generator color', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-red-output-note' };

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('red');
    expect(runtime.notePacket.count).toBeGreaterThan(2);
  });

  it('captures finisher notes for Heatline, starts a beam, and emits its output note', () => {
    const runtime = createReadyRuntime('heatline');
    const target = primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red', hp: 200 });
    setCombatNotePacket(runtime, 'red', 3);

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).not.toBe('red');
    expect(runtime.notePacket.count).toBeGreaterThan(0);
    expect(runtime.beams).toHaveLength(1);
    const beam = runtime.beams[0];
    expect(beam).toBeDefined();
    expect(beam ? beam.expiresAtMs - beam.startedAtMs : 0).toBeGreaterThan(0);
    expect(target.currentHp).toBeLessThan(target.maxHp);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:beam-started')).toBe(true);
  });

  it('reports dynamic finisher output note counts when slot modifiers add bonus notes', () => {
    const runtime = createReadyRuntime('heatline');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-output-note' };
    setCombatNotePacket(runtime, 'red', 3);
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red', hp: 200 });

    advanceCombatRuntime(runtime, 1000);

    expect(typeof runtime.notePacket.color).toBe('string');
    expect(runtime.notePacket.count).toBeGreaterThan(1);
    expect(runtime.effects.pendingEvents).toContainEqual({
      event: 'combat:finisher-output-note-emitted',
      payload: {
        slotIndex: 0,
        pawnId: 'heatline',
        color: runtime.notePacket.color,
        count: runtime.notePacket.count,
      },
    });
  });

  it('applies color-specific output note bonuses using the finisher output color', () => {
    const runtime = createReadyRuntime('pressure-burst');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-red-output-note' };
    setCombatNotePacket(runtime, 'blue', 3);
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red', hp: 200 });

    advanceCombatRuntime(runtime, 1000);

    expect(typeof runtime.notePacket.color).toBe('string');
    expect(runtime.notePacket.count).toBeGreaterThan(1);
  });

  it('does not apply color-specific output bonuses when the finisher output color does not match', () => {
    const runtime = createReadyRuntime('heatline');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-red-output-note' };
    setCombatNotePacket(runtime, 'red', 3);
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red', hp: 200 });

    advanceCombatRuntime(runtime, 1000);

    expect(typeof runtime.notePacket.color).toBe('string');
    expect(runtime.notePacket.count).toBeGreaterThanOrEqual(1);
  });

  it('queues Meteor Drop, detonates it later, and leaves a burn zone after impact', () => {
    const runtime = createReadyRuntime('meteor-drop');
    const target = primeEnemyNearSlot(runtime, 0, 0, { dx: 24, dy: -180, color: 'green' });

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.pendingExplosions).toHaveLength(1);
    expect(target.currentHp).toBe(target.maxHp);

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.pendingExplosions).toHaveLength(0);
    expect(runtime.zones.length).toBeGreaterThan(0);
  });

  it('spawns a Moss Patch zone and applies immediate zone damage', () => {
    const runtime = createReadyRuntime('moss-patch');
    const target = primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -120, color: 'red' });

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.zones).toHaveLength(1);
    expect(target.currentHp).toBeLessThan(target.maxHp);
  });

  it('heals the base from Lifebloom Scatter using actual damage dealt', () => {
    const runtime = createReadyRuntime('lifebloom-scatter');
    runtime.baseHp = 40;
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'blue', hp: 120 });

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.baseHp).toBeGreaterThan(40);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:base-healed')).toBe(true);
  });

  it('stores a Pulse Garden buff on the next occupied slot and consumes it on that slot activation', () => {
    const runtime = createReadyRuntime('pulse-garden', 0);
    runtime.slots[1]!.pawnId = 'ruby-needle';
    runtime.slots[1]!.pawnTier = 1;
    runtime.slots[1]!.sectorCenterAngleDeg = null;
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -140, color: 'red', hp: 120 });

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.pawnBuffs[1]?.damageBonusPercent).toBeGreaterThan(0);

    runtime.slots[0]!.sectorCenterAngleDeg = null;
    runtime.slots[1]!.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;
    runtime.record.currentAngle = 1;
    runtime.record.previousAngle = 1;
    advanceCombatRuntime(runtime, 1000);

    expect(runtime.pawnBuffs[1]).toBeNull();
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:pawn-buff-consumed')).toBe(true);
  });

  it('creates Frost Sweep sweeping beam metadata after activation', () => {
    const runtime = createReadyRuntime('frost-sweep');
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -220, color: 'green', hp: 120 });

    for (let index = 0; index < 5; index += 1) {
      advanceCombatRuntime(runtime, 200);
    }

    expect(runtime.beams[0]?.sweepLengthPx).toBeGreaterThan(0);
    expect(runtime.beams[0]?.sweepHitRadiusPx).toBeGreaterThan(0);
    expect(runtime.beams[0]?.sweepStartAngleRad).not.toBeNull();
    expect(runtime.beams[0]?.sweepEndAngleRad).not.toBeNull();
    expect(
      ((runtime.beams[0]?.sweepEndAngleRad ?? 0) - (runtime.beams[0]?.sweepStartAngleRad ?? 0))
      * 180
      / Math.PI,
    ).toBeGreaterThan(0);
  });

  it('gives Pressure Burst its high-hp damage bonus only while the target is still healthy', () => {
    const runtime = createReadyRuntime('pressure-burst');
    const target = primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'blue', hp: 200 });

    advanceCombatRuntime(runtime, 1000);
    const firstHitHp = target.currentHp;
    const firstHitDamage = target.maxHp - firstHitHp;

    target.currentHp = 80;
    runtime.record.currentAngle = 1;
    runtime.record.previousAngle = 1;
    runtime.slots[0]!.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;
    advanceCombatRuntime(runtime, 1000);

    const secondHitDamage = 80 - target.currentHp;
    expect(firstHitDamage).toBeGreaterThan(secondHitDamage);
  });

  it('fires Arc Bounce as a timed volley after activation', () => {
    const runtime = createReadyRuntime('arc-bounce');
    const firstTarget = primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'green', hp: 120 });
    primeEnemyNearSlot(runtime, 1, 0, { dx: 46, dy: -228, color: 'red', hp: 120 });

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.queuedVolleys).toHaveLength(1);

    let projectileHitEvents = runtime.effects.pendingEvents.filter((event) => event.event === 'combat:projectile-hit').length;
    for (let index = 0; index < 5; index += 1) {
      advanceCombatRuntime(runtime, 200);
      projectileHitEvents += runtime.effects.pendingEvents.filter((event) => event.event === 'combat:projectile-hit').length;
    }

    expect(firstTarget.currentHp).toBeLessThan(firstTarget.maxHp);
    expect(projectileHitEvents).toBeGreaterThan(0);
  });

  it('splits Prism Volley shots into child projectiles that continue after the first hit', () => {
    const runtime = createReadyRuntime('prism-volley');
    const firstTarget = primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red', hp: 120 });
    const secondTarget = primeEnemyNearSlot(runtime, 1, 0, { dx: 72, dy: -236, color: 'green', hp: 120 });

    advanceCombatRuntime(runtime, 1000);
    advanceCombatRuntime(runtime, 250);

    expect(runtime.projectiles.length).toBeGreaterThan(0);
    expect(firstTarget.currentHp).toBeLessThan(firstTarget.maxHp);
    expect(secondTarget.currentHp).toBeLessThanOrEqual(secondTarget.maxHp);
  });

  it('spawns extra shotgun projectiles from a projectile-bonus slot modifier', () => {
    const runtime = createReadyRuntime('lifebloom-scatter');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-projectile' };
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'blue', hp: 200 });

    advanceCombatRuntime(runtime, 200);

    const slotProjectiles = runtime.projectiles.filter((p) => p.slotIndex === 0);
    expect(slotProjectiles.length).toBeGreaterThan(3);
  });

  it('queues extra volley shots from a projectile-bonus slot modifier', () => {
    const runtime = createReadyRuntime('prism-volley');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-projectile' };
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red', hp: 200 });

    advanceCombatRuntime(runtime, 200);

    expect(runtime.queuedVolleys).toHaveLength(1);
    expect(runtime.queuedVolleys[0]?.shotsRemaining).toBeGreaterThan(2);
  });

  it('does not affect single-shot pattern with projectile-bonus modifier', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-one-projectile' };
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'red' });

    advanceCombatRuntime(runtime, 200);

    const slotProjectiles = runtime.projectiles.filter((p) => p.slotIndex === 0);
    expect(slotProjectiles).toHaveLength(1);
  });

  it('multiplies delayed explosion radius with aoe-radius-scale modifier', () => {
    const runtime = createReadyRuntime('meteor-drop');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' };
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -210, color: 'green', hp: 300 });

    advanceCombatRuntime(runtime, 200);

    expect(runtime.pendingExplosions).toHaveLength(1);
    expect(runtime.pendingExplosions[0]?.radius).toBeGreaterThan(150);
  });

  it('multiplies zone radius with aoe-radius-scale modifier', () => {
    const runtime = createReadyRuntime('moss-patch');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'plus-fifty-aoe-radius' };
    primeEnemyNearSlot(runtime, 0, 0, { dx: 0, dy: -120, color: 'red' });

    advanceCombatRuntime(runtime, 200);

    expect(runtime.zones).toHaveLength(1);
    expect(runtime.zones[0]?.radius).toBeGreaterThan(130);
  });
});

function createReadyRuntime(
  pawnId: string,
  slotIndex = 0,
): CombatRuntime {
  const runtime = createCombatRuntime();
  setCombatState(runtime, 'running');
  runtime.preview.elapsedMs = runtime.preview.durationMs;
  runtime.record.currentAngle = 1;
  runtime.record.previousAngle = 1;
  const slot = runtime.slots[slotIndex]!;
  slot.pawnId = pawnId;
  slot.pawnTier = 1;
  slot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;
  syncCombatSlotWorldPositions(runtime);

  return runtime;
}

function primeEnemyNearSlot(
  runtime: CombatRuntime,
  enemyIndex: number,
  slotIndex: number,
  options: { dx: number; dy: number; color: 'red' | 'green' | 'blue'; hp?: number },
) {
  const origin = runtime.slots[slotIndex]?.worldPosition;

  if (!origin) {
    throw new Error(`Slot ${slotIndex} has no world position`);
  }

  const enemy = runtime.enemies[enemyIndex]!;
  enemy.spawned = true;
  enemy.state = 'moving';
  enemy.x = origin.x + options.dx;
  enemy.y = origin.y + options.dy;
  enemy.color = options.color;
  enemy.maxHp = options.hp ?? enemy.maxHp;
  enemy.currentHp = options.hp ?? enemy.maxHp;
  return enemy;
}
