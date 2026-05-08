import { describe, expect, it } from 'vitest';
import { getCombatPawnDefinitionById } from '@config/CombatContentConfig';
import { createCombatRuntime, syncCombatSlotWorldPositions } from './CombatRuntime';
import { createBeam } from './CombatBeams';
import { resolveCombatActivations } from './CombatActivation';
import type { CombatEnemyRuntime } from './CombatRuntime';

function createTestEnemy(overrides: Partial<CombatEnemyRuntime> = {}): CombatEnemyRuntime {
  return {
    runtimeId: 'enemy-test-1',
    definitionId: 'enemy-red-basic',
    archetype: 'basic',
    color: 'red',
    currentHp: 100,
    maxHp: 100,
    x: 400,
    y: 300,
    state: 'moving',
    spawned: true,
    nextAttackAtMs: 0,
    renderContainerName: 'enemy-container-test',
    ...overrides,
  };
}

describe('createBeam targetOverride', () => {
  it('uses targetOverride enemy for lock-on beam target selection', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'heatline', tier: 1 }],
    });
    syncCombatSlotWorldPositions(runtime);

    // Base is at (360, 1160). Closer y to 1160 = frontmost.
    const frontEnemy = createTestEnemy({
      runtimeId: 'enemy-front',
      x: 360,
      y: 1100,
    });
    const backEnemy = createTestEnemy({
      runtimeId: 'enemy-back',
      x: 360,
      y: 300,
    });

    runtime.enemies = [frontEnemy, backEnemy];

    const pawn = getCombatPawnDefinitionById('heatline')!;

    createBeam(
      runtime,
      pawn,
      0,
      { damageMultiplier: 1, finisherConsumedNotes: 0, finisherDamageMultiplier: 1, nextSlotBuffBonusPercent: 0 },
      10,
      1000,
      100,
      'lock-on',
      null,
      null,
      null,
      'frontmost-enemy',
      backEnemy,
    );

    expect(runtime.beams).toHaveLength(1);
    expect(runtime.beams[0]!.targetEnemyRuntimeId).toBe('enemy-back');
  });

  it('uses selectFrontmostEnemy when targetOverride is not provided', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'heatline', tier: 1 }],
    });
    syncCombatSlotWorldPositions(runtime);

    const frontEnemy = createTestEnemy({
      runtimeId: 'enemy-front',
      x: 360,
      y: 1100,
    });
    const backEnemy = createTestEnemy({
      runtimeId: 'enemy-back',
      x: 360,
      y: 300,
    });

    runtime.enemies = [frontEnemy, backEnemy];

    const pawn = getCombatPawnDefinitionById('heatline')!;

    createBeam(
      runtime,
      pawn,
      0,
      { damageMultiplier: 1, finisherConsumedNotes: 0, finisherDamageMultiplier: 1, nextSlotBuffBonusPercent: 0 },
      10,
      1000,
      100,
      'lock-on',
      null,
      null,
      null,
      'frontmost-enemy',
    );

    expect(runtime.beams).toHaveLength(1);
    expect(runtime.beams[0]!.targetEnemyRuntimeId).toBe('enemy-front');
  });
});

describe('extra beam activation', () => {
  it('spawns two lock-on beams targeting different enemies with plus-one-extra-beam modifier', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'heatline', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-one-extra-beam' }],
    });
    syncCombatSlotWorldPositions(runtime);

    const enemy1 = createTestEnemy({
      runtimeId: 'enemy-1',
      x: 360,
      y: 1100,
    });
    const enemy2 = createTestEnemy({
      runtimeId: 'enemy-2',
      x: 360,
      y: 1000,
    });

    runtime.enemies = [enemy1, enemy2];

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    expect(runtime.beams).toHaveLength(2);
    const targetIds = runtime.beams.map((b) => b.targetEnemyRuntimeId);
    expect(targetIds).toContain('enemy-1');
    expect(targetIds).toContain('enemy-2');
  });

  it('creates only one beam when plus-one-extra-beam with only one enemy', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'heatline', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-one-extra-beam' }],
    });
    syncCombatSlotWorldPositions(runtime);

    runtime.enemies = [
      createTestEnemy({ runtimeId: 'enemy-only', x: 360, y: 1100 }),
    ];

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    expect(runtime.beams).toHaveLength(1);
  });

  it('spawns second sweeping beam with reversed sweep arc', () => {
    const runtime = createCombatRuntime(undefined, {
      slotPawns: [{ pawnId: 'frost-sweep', tier: 1 }],
      slotModifiers: [{ slotIndex: 0, modifierId: 'plus-one-extra-beam' }],
    });
    syncCombatSlotWorldPositions(runtime);

    runtime.enemies = [
      createTestEnemy({ runtimeId: 'enemy-1', x: 360, y: 1100 }),
    ];

    resolveCombatActivations(runtime, [
      { slotIndex: 0, crossingAngle: -45 },
    ]);

    expect(runtime.beams).toHaveLength(2);
    // First beam sweeps left-to-right (start < end)
    const first = runtime.beams[0]!;
    expect(first.sweepStartAngleRad).toBeLessThan(first.sweepEndAngleRad!);
    // Second beam sweeps right-to-left (start > end)
    const second = runtime.beams[1]!;
    expect(second.sweepStartAngleRad).toBeGreaterThan(second.sweepEndAngleRad!);
  });
});
