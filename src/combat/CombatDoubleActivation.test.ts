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
import { resolveCombatActivations } from './CombatActivation';
import type { CombatRuntimeEvent } from './CombatRuntimeEvents';

describe('double activation', () => {
  it('schedules a delayed second activation for a double-activation slot', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'double-activation' };

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    const resolvedEvents = runtime.effects.pendingEvents.filter(
      (e) => e.event === 'combat:pawn-resolved' && e.payload.slotIndex === 0,
    );

    expect(resolvedEvents).toHaveLength(1);
    expect(runtime.scheduledActivations).toEqual([
      {
        slotIndex: 0,
        triggerAtMs: CombatBalanceConfig.DOUBLE_ACTIVATION_DELAY_MS,
      },
    ]);
  });

  it('triggers one pawn-resolved event for a slot without double-activation', () => {
    const runtime = createReadyRuntime('ruby-needle');

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    const resolvedEvents = runtime.effects.pendingEvents.filter(
      (e) => e.event === 'combat:pawn-resolved' && e.payload.slotIndex === 0,
    );

    expect(resolvedEvents).toHaveLength(1);
  });

  it('does not change record angle when scheduling double activation', () => {
    const runtime = createReadyRuntime('thorn-fan');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'double-activation' };

    const angleBefore = runtime.record.currentAngle;

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    expect(runtime.record.currentAngle).toBe(angleBefore);
  });

  it('fires the second generator activation only after the configured delay', () => {
    const runtime = createReadyRuntime('ruby-needle');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'double-activation' };

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    expect(runtime.effects.pendingEvents.filter(
      (e): e is Extract<CombatRuntimeEvent, { event: 'combat:generator-notes-emitted' }> =>
        e.event === 'combat:generator-notes-emitted' && e.payload.slotIndex === 0,
    )).toHaveLength(1);

    runtime.slots[0]!.sectorCenterAngleDeg = null;
    advanceCombatRuntime(runtime, CombatBalanceConfig.DOUBLE_ACTIVATION_DELAY_MS - 1);
    expect(runtime.effects.pendingEvents.filter((e) => e.event === 'combat:pawn-resolved')).toHaveLength(0);

    advanceCombatRuntime(runtime, 1);

    const generatorEvents = runtime.effects.pendingEvents.filter(
      (e): e is Extract<CombatRuntimeEvent, { event: 'combat:generator-notes-emitted' }> =>
        e.event === 'combat:generator-notes-emitted' && e.payload.slotIndex === 0,
    );

    expect(generatorEvents).toHaveLength(1);
    expect(generatorEvents[0]!.payload.count).toBeGreaterThan(0);
    expect(runtime.scheduledActivations).toHaveLength(0);
  });

  it('finisher second activation sees depleted note packet without scheduling again', () => {
    const runtime = createReadyRuntime('thorn-fan');
    runtime.slotModifiers[0] = { slotIndex: 0, modifierId: 'double-activation' };

    setCombatNotePacket(runtime, 'green', 3);

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    runtime.slots[0]!.sectorCenterAngleDeg = null;
    advanceCombatRuntime(runtime, CombatBalanceConfig.DOUBLE_ACTIVATION_DELAY_MS);

    const consumedEvents = runtime.effects.pendingEvents.filter(
      (e): e is Extract<CombatRuntimeEvent, { event: 'combat:finisher-consumed-notes' }> =>
        e.event === 'combat:finisher-consumed-notes' && e.payload.slotIndex === 0,
    );

    expect(consumedEvents).toHaveLength(1);
    expect(consumedEvents[0]!.payload.consumedNotes).toBe(0);
    expect(runtime.scheduledActivations).toHaveLength(0);
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
