import { describe, expect, it } from 'vitest';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import { CombatVfxSystem, type CombatVfxAnchorResolver } from './CombatVfxSystem';

function createResolver(): CombatVfxAnchorResolver {
  return {
    getSlotAnchor: (slotIndex) =>
      slotIndex === 0
        ? { x: 120, y: 220, hasPawn: true }
        : { x: 220, y: 220, hasPawn: false },
    getEnemyAnchor: () => null,
    getNotePacketAnchor: () => ({ x: 360, y: 960 }),
    getBaseAnchor: () => ({ x: 360, y: 1120 }),
  };
}

describe('CombatVfxSystem', () => {
  it('refreshes one occupied-slot activation channel instead of stacking duplicate pulses', () => {
    const vfx = new CombatVfxSystem(createResolver());

    vfx.handleEvent({
      event: 'combat:slot-activated',
      payload: { slotIndex: 0 },
    });

    const firstSnapshot = vfx.getSnapshot();
    expect(firstSnapshot.slotActivations).toHaveLength(1);
    expect(firstSnapshot.slotActivations[0]).toMatchObject({
      slotIndex: 0,
      hasPawn: true,
    });
    expect(firstSnapshot.slotActivations[0]?.sectorAlpha).toBeCloseTo(1);
    expect(firstSnapshot.slotActivations[0]?.ruleZoneAlpha).toBeCloseTo(1);
    expect(firstSnapshot.slotActivations[0]?.pawnGlowAlpha).toBeCloseTo(1);

    vfx.update(CombatBalanceConfig.SLOT_ACTIVATION_PULSE_DURATION_MS / 2);

    const decayedSnapshot = vfx.getSnapshot();
    expect(decayedSnapshot.slotActivations).toHaveLength(1);
    expect(decayedSnapshot.slotActivations[0]!.sectorAlpha).toBeLessThan(
      firstSnapshot.slotActivations[0]!.sectorAlpha,
    );

    vfx.handleEvent({
      event: 'combat:slot-activated',
      payload: { slotIndex: 0 },
    });

    const refreshedSnapshot = vfx.getSnapshot();
    expect(refreshedSnapshot.slotActivations).toHaveLength(1);
    expect(refreshedSnapshot.slotActivations[0]?.sectorAlpha).toBeCloseTo(1);
    expect(refreshedSnapshot.slotActivations[0]?.pawnGlowAlpha).toBeCloseTo(1);
  });

  it('creates generator beam, enemy-hit flash, and two outbound note flights from semantic combat events', () => {
    const vfx = new CombatVfxSystem({
      ...createResolver(),
      getEnemyAnchor: (enemyId) =>
        enemyId === 'enemy-runtime-1'
          ? { x: 520, y: 300 }
          : null,
    });

    vfx.handleEvent({
      event: 'combat:enemy-hit',
      payload: {
        enemyId: 'enemy-runtime-1',
        slotIndex: 0,
        attackerColor: 'red',
        damage: 20,
        currentHp: 10,
        maxHp: 30,
        wasWeaknessHit: false,
      },
    });
    vfx.handleEvent({
      event: 'combat:generator-notes-emitted',
      payload: {
        slotIndex: 0,
        pawnId: 'pawn-red-generator',
        color: 'red',
        count: 2,
      },
    });

    const snapshot = vfx.getSnapshot();

    expect(snapshot.beamHits).toHaveLength(1);
    expect(snapshot.beamHits[0]).toMatchObject({
      color: 'red',
      from: { x: 120, y: 220 },
      to: { x: 520, y: 300 },
      weakness: false,
    });

    expect(snapshot.enemyHitFlashes).toHaveLength(1);
    expect(snapshot.enemyHitFlashes[0]).toMatchObject({
      enemyId: 'enemy-runtime-1',
      color: 'red',
      weakness: false,
    });

    expect(snapshot.noteFlights).toHaveLength(2);
    expect(snapshot.noteFlights.map((flight) => flight.id)).toEqual([
      'note-flight:1',
      'note-flight:2',
    ]);
    expect(snapshot.noteFlights.every((flight) => flight.direction === 'slot-to-packet')).toBe(true);
    expect(snapshot.noteFlights.every((flight) => flight.color === 'red')).toBe(true);
    expect(snapshot.noteFlights.every((flight) => flight.from.x === 120)).toBe(true);
    expect(new Set(snapshot.noteFlights.map((flight) => flight.to.x)).size).toBeGreaterThan(1);
  });

  it('creates finisher intake, weakness beam, color-break burst, and one output note flight from semantic events', () => {
    const vfx = new CombatVfxSystem({
      ...createResolver(),
      getEnemyAnchor: (enemyId) =>
        enemyId === 'enemy-runtime-2'
          ? { x: 540, y: 320 }
          : null,
    });

    vfx.handleEvent({
      event: 'combat:note-packet-color-broke',
      payload: {
        previousColor: 'red',
        nextColor: 'blue',
      },
    });
    vfx.handleEvent({
      event: 'combat:finisher-consumed-notes',
      payload: {
        slotIndex: 1,
        pawnId: 'pawn-green-finisher',
        color: 'green',
        consumedNotes: 3,
        multiplier: 1.4,
      },
    });
    vfx.handleEvent({
      event: 'combat:enemy-hit',
      payload: {
        enemyId: 'enemy-runtime-2',
        slotIndex: 1,
        attackerColor: 'green',
        damage: 42,
        currentHp: 0,
        maxHp: 30,
        wasWeaknessHit: true,
      },
    });
    vfx.handleEvent({
      event: 'combat:finisher-output-note-emitted',
      payload: {
        slotIndex: 1,
        pawnId: 'pawn-green-finisher',
        color: 'blue',
        count: 1,
      },
    });

    const snapshot = vfx.getSnapshot();

    expect(snapshot.packetBreakBursts).toHaveLength(1);
    expect(snapshot.packetBreakBursts[0]).toMatchObject({
      previousColor: 'red',
      nextColor: 'blue',
    });

    expect(snapshot.noteFlights).toHaveLength(1);
    expect(snapshot.noteFlights[0]).toMatchObject({
      direction: 'packet-to-slot',
      color: 'green',
    });

    vfx.update(CombatVfxConfig.FINISHER.INPUT_STAGGER_MS + 1);

    const staggeredSnapshot = vfx.getSnapshot();
    expect(staggeredSnapshot.noteFlights.length).toBeGreaterThan(1);
    expect(staggeredSnapshot.noteFlights.every((flight) => flight.direction === 'packet-to-slot')).toBe(
      true,
    );
    expect(new Set(staggeredSnapshot.noteFlights.map((flight) => flight.from.x)).size).toBeGreaterThan(1);

    vfx.update(
      CombatVfxConfig.NOTE_FLIGHT.DURATION_MS
        + CombatVfxConfig.FINISHER.OUTPUT_DELAY_MS
        + CombatVfxConfig.FINISHER.INPUT_STAGGER_MS * 2
        + 1,
    );

    const returnSnapshot = vfx.getSnapshot();
    expect(returnSnapshot.noteFlights).toHaveLength(1);
    expect(returnSnapshot.noteFlights[0]).toMatchObject({
      direction: 'slot-to-packet',
      color: 'blue',
    });

    expect(snapshot.beamHits).toHaveLength(1);
    expect(snapshot.beamHits[0]).toMatchObject({
      color: 'green',
      weakness: true,
      thickness: 12,
    });
  });

  it('creates distinct base-hit feedback and result emphasis from combat outcome events', () => {
    const vfx = new CombatVfxSystem(createResolver());

    vfx.handleEvent({
      event: 'combat:base-damaged',
      payload: {
        current: 72,
        max: 100,
      },
    });
    vfx.handleEvent({
      event: 'combat:ended',
      payload: {
        outcome: 'victory',
      },
    });

    const snapshot = vfx.getSnapshot();

    expect(snapshot.baseHitFlashes).toHaveLength(1);
    expect(snapshot.baseHitFlashes[0]).toMatchObject({
      x: 360,
      y: 1120,
    });

    expect(snapshot.resultEmphasis).toMatchObject({
      outcome: 'victory',
      alpha: 1,
    });
  });
});
