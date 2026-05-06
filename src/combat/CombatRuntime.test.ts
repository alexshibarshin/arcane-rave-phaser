import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { COMBAT_NEEDLE_ANGLE_DEGREES } from './CombatLayout';
import {
  advanceCombatRuntime,
  createCombatRuntime,
  setCombatNotePacket,
  setCombatState,
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
    expect(runtime.pawnBuffs).toHaveLength(8);
  });

  it('spawns a Ruby Needle projectile, damages an enemy, and still emits generator notes', () => {
    const runtime = createReadyRuntime('ruby-needle');
    const target = primeEnemy(runtime, 0, { x: 100, y: 60, color: 'red' });

    advanceCombatRuntime(runtime, 1000);

    expect(target.currentHp).toBe(0);
    expect(runtime.notePacket.color).toBe('red');
    expect(runtime.notePacket.count).toBe(2);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:projectile-spawned')).toBe(true);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:projectile-hit')).toBe(true);
  });

  it('clamps same-color generator note overflow while still allowing no-target casts', () => {
    const runtime = createReadyRuntime('moss-patch');
    setCombatNotePacket(runtime, 'green', 4);

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('green');
    expect(runtime.notePacket.count).toBe(CombatBalanceConfig.NOTE_PACKET_CAPACITY);
    expect(runtime.zones).toHaveLength(0);
  });

  it('captures finisher notes for Heatline, starts a beam, and emits its output note', () => {
    const runtime = createReadyRuntime('heatline');
    const target = primeEnemy(runtime, 0, { x: 100, y: 80, color: 'red', hp: 200 });
    setCombatNotePacket(runtime, 'red', 3);

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.notePacket.color).toBe('blue');
    expect(runtime.notePacket.count).toBe(1);
    expect(runtime.beams).toHaveLength(1);
    expect(target.currentHp).toBeLessThan(target.maxHp);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:beam-started')).toBe(true);
  });

  it('queues Meteor Drop, detonates it later, and leaves a burn zone after impact', () => {
    const runtime = createReadyRuntime('meteor-drop');
    const target = primeEnemy(runtime, 0, { x: 110, y: 70, color: 'green' });

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.pendingExplosions).toHaveLength(1);
    expect(target.currentHp).toBe(target.maxHp);

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.pendingExplosions).toHaveLength(0);
    expect(runtime.zones.length).toBeGreaterThan(0);
  });

  it('ticks Moss Patch zones immediately on spawn and on later intervals', () => {
    const runtime = createReadyRuntime('moss-patch');
    const target = primeEnemy(runtime, 0, { x: 90, y: 90, color: 'red' });

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.zones).toHaveLength(1);
    const hpAfterFirstTick = target.currentHp;
    expect(hpAfterFirstTick).toBeLessThan(target.maxHp);

    advanceCombatRuntime(runtime, 500);
    expect(target.currentHp).toBeLessThan(hpAfterFirstTick);
  });

  it('heals the base from Lifebloom Scatter using actual damage dealt', () => {
    const runtime = createReadyRuntime('lifebloom-scatter');
    runtime.baseHp = 40;
    primeEnemy(runtime, 0, { x: 100, y: 80, color: 'blue', hp: 120 });

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.baseHp).toBeGreaterThan(40);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:base-healed')).toBe(true);
  });

  it('stores a Pulse Garden buff on the next occupied slot and consumes it on that slot activation', () => {
    const runtime = createReadyRuntime('pulse-garden', 0);
    runtime.slots[1]!.pawnId = 'ruby-needle';
    runtime.slots[1]!.pawnTier = 1;
    runtime.slots[1]!.sectorCenterAngleDeg = null;
    primeEnemy(runtime, 0, { x: 100, y: 80, color: 'red', hp: 120 });

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.pawnBuffs[1]?.damageBonusPercent).toBe(0.35);

    runtime.slots[0]!.sectorCenterAngleDeg = null;
    runtime.slots[1]!.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;
    runtime.record.currentAngle = 1;
    runtime.record.previousAngle = 1;
    advanceCombatRuntime(runtime, 1000);

    expect(runtime.pawnBuffs[1]).toBeNull();
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:pawn-buff-consumed')).toBe(true);
  });

  it('applies Frost Sweep slow through the sweeping beam runtime', () => {
    const runtime = createReadyRuntime('frost-sweep');
    const target = primeEnemy(runtime, 0, { x: 100, y: 90, color: 'green', hp: 120 });

    advanceCombatRuntime(runtime, 1000);

    expect(runtime.enemyStatuses.get(target.runtimeId)?.slowMultiplier).toBe(0.55);
    expect(runtime.effects.pendingEvents.some((event) => event.event === 'combat:slow-applied')).toBe(true);
  });

  it('gives Pressure Burst its high-hp damage bonus only while the target is still healthy', () => {
    const runtime = createReadyRuntime('pressure-burst');
    const target = primeEnemy(runtime, 0, { x: 100, y: 70, color: 'blue', hp: 200 });

    advanceCombatRuntime(runtime, 1000);
    const firstHitHp = target.currentHp;

    target.currentHp = 80;
    runtime.record.currentAngle = 1;
    runtime.record.previousAngle = 1;
    runtime.slots[0]!.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;
    advanceCombatRuntime(runtime, 1000);

    expect(firstHitHp).toBeLessThan(158);
    expect(target.currentHp).toBeGreaterThan(17);
  });

  it('fires Arc Bounce as a timed volley and can hit a second enemy after bouncing', () => {
    const runtime = createReadyRuntime('arc-bounce');
    const firstTarget = primeEnemy(runtime, 0, { x: 100, y: 70, color: 'green', hp: 120 });
    const secondTarget = primeEnemy(runtime, 1, { x: 108, y: 56, color: 'red', hp: 120 });

    advanceCombatRuntime(runtime, 1000);
    expect(runtime.queuedVolleys).toHaveLength(1);

    let projectileHitEvents = 0;
    for (let index = 0; index < 5; index += 1) {
      advanceCombatRuntime(runtime, 200);
      projectileHitEvents += runtime.effects.pendingEvents.filter((event) => event.event === 'combat:projectile-hit').length;
    }

    expect(firstTarget.currentHp).toBeLessThan(firstTarget.maxHp);
    expect(projectileHitEvents).toBeGreaterThan(1);
    expect(secondTarget.currentHp).toBeLessThanOrEqual(secondTarget.maxHp);
  });

  it('splits Prism Volley shots into child projectiles that continue after the first hit', () => {
    const runtime = createReadyRuntime('prism-volley');
    const firstTarget = primeEnemy(runtime, 0, { x: 100, y: 70, color: 'red', hp: 120 });
    const secondTarget = primeEnemy(runtime, 1, { x: 126, y: 48, color: 'green', hp: 120 });

    advanceCombatRuntime(runtime, 1000);
    advanceCombatRuntime(runtime, 250);

    expect(runtime.projectiles.length).toBeGreaterThan(0);
    expect(firstTarget.currentHp).toBeLessThan(firstTarget.maxHp);
    expect(secondTarget.currentHp).toBeLessThanOrEqual(secondTarget.maxHp);
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
  slot.worldPosition = { x: 100, y: 120 };
  slot.sectorCenterAngleDeg = COMBAT_NEEDLE_ANGLE_DEGREES;

  return runtime;
}

function primeEnemy(
  runtime: CombatRuntime,
  enemyIndex: number,
  options: { x: number; y: number; color: 'red' | 'green' | 'blue'; hp?: number },
) {
  const enemy = runtime.enemies[enemyIndex]!;
  enemy.spawned = true;
  enemy.state = 'moving';
  enemy.x = options.x;
  enemy.y = options.y;
  enemy.color = options.color;
  enemy.maxHp = options.hp ?? enemy.maxHp;
  enemy.currentHp = options.hp ?? enemy.maxHp;
  return enemy;
}
