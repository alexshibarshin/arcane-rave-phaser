import { describe, expect, it } from 'vitest';
import { createCombatRuntime, setCombatNotePacket } from './CombatRuntime';
import { resolveCombatActivations } from './CombatActivation';
import type { CombatRuntimeEvent } from './CombatRuntimeEvents';

describe('double activation', () => {
  it('triggers two pawn-resolved events for a double-activation slot', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'ruby-needle', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'double-activation' }],
    });

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    const resolvedEvents = runtime.effects.pendingEvents.filter(
      (e) => e.event === 'combat:pawn-resolved' && e.payload.slotIndex === 0,
    );

    expect(resolvedEvents).toHaveLength(2);
  });

  it('triggers one pawn-resolved event for a slot without double-activation', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'ruby-needle', tier: 1 }],
    });

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    const resolvedEvents = runtime.effects.pendingEvents.filter(
      (e) => e.event === 'combat:pawn-resolved' && e.payload.slotIndex === 0,
    );

    expect(resolvedEvents).toHaveLength(1);
  });

  it('visual rebound changes record angle during double activation', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'thorn-fan', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'double-activation' }],
    });

    const angleBefore = runtime.record.currentAngle;

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    expect(runtime.record.currentAngle).not.toBe(angleBefore);
  });

  it('generator second activation sees augmented note packet', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'ruby-needle', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'double-activation' }],
    });

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    const generatorEvents = runtime.effects.pendingEvents.filter(
      (e): e is Extract<CombatRuntimeEvent, { event: 'combat:generator-notes-emitted' }> =>
        e.event === 'combat:generator-notes-emitted' && e.payload.slotIndex === 0,
    );

    // First activation generates 2 base notes, second sees the augmented packet (same color)
    expect(generatorEvents).toHaveLength(2);
    // Both events should have count > 0
    expect(generatorEvents[0]!.payload.count).toBeGreaterThan(0);
    expect(generatorEvents[1]!.payload.count).toBeGreaterThan(0);
  });

  it('finisher second activation sees depleted note packet', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'thorn-fan', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'double-activation' }],
    });

    setCombatNotePacket(runtime, 'green', 3);

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    const consumedEvents = runtime.effects.pendingEvents.filter(
      (e): e is Extract<CombatRuntimeEvent, { event: 'combat:finisher-consumed-notes' }> =>
        e.event === 'combat:finisher-consumed-notes' && e.payload.slotIndex === 0,
    );

    expect(consumedEvents).toHaveLength(2);
    expect(consumedEvents[0]!.payload.consumedNotes).toBeGreaterThan(0);
    expect(consumedEvents[1]!.payload.consumedNotes).toBe(0);
  });
});
