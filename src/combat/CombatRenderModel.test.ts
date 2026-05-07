import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import { createCombatRenderModel } from './CombatRenderModel';

describe('CombatRenderModel', () => {
  it('produces a structurally consistent layered presentation model', () => {
    const model = createCombatRenderModel();

    expect(model.background.width).toBeGreaterThan(0);
    expect(model.background.height).toBeGreaterThan(0);
    expect(model.enemyLane.top).toBeLessThan(model.enemyLane.bottom);
    expect(model.record.slots).toHaveLength(CombatContentConfig.SLOT_COUNT);
    expect(model.record.base.radius).toBeGreaterThan(0);
    expect(model.base.width).toBeGreaterThan(0);
    expect(model.base.height).toBeGreaterThan(0);
    expect(model.baseHpBar.width).toBeGreaterThan(0);
    expect(model.baseHpBar.y).toBeGreaterThan(model.base.y);
    expect(model.notePacketAnchor.y).toBeLessThan(model.base.y);
    expect(model.background.depth).toBeLessThan(model.enemyLane.depth);
    expect(model.enemyLane.depth).toBeLessThan(model.record.base.depth);
    expect(model.record.base.depth).toBeLessThan(model.base.depth);
    expect(model.base.depth).toBeLessThan(model.notePacketAnchor.depth);
    expect(model.notePacketAnchor.depth).toBeLessThan(model.hud.depth);
  });

  it('maps the active slot preset into occupied and empty slot presentation states', () => {
    const model = createCombatRenderModel();
    const activeWave = CombatWaveConfig.WAVES[0];
    const activePreset = CombatContentConfig.SLOT_PRESETS.find(
      (preset) => preset.id === activeWave?.slotPresetId,
    );

    expect(activePreset).toBeDefined();

    for (const slot of model.record.slots) {
      const pawnId = activePreset?.slots[slot.index] ?? null;

      if (pawnId === null) {
        expect(slot.pawn).toBeNull();
        expect(slot.presentation.rotating.ruleLabel).toBeNull();
        expect(typeof slot.presentation.rotating.emptyLabel?.text).toBe('string');
        expect(slot.presentation.rotating.emptyLabel!.text.length).toBeGreaterThan(0);
        expect(slot.presentation.upright.construct).toBeNull();
        continue;
      }

      const pawnDefinition = CombatContentConfig.PAWN_DEFINITIONS.find((pawn) => pawn.id === pawnId);

      expect(pawnDefinition).toBeDefined();
      expect(slot.pawn?.id).toBe(pawnDefinition?.id);
      expect(slot.pawn?.color).toBe(pawnDefinition?.color);
      expect(slot.pawn?.constructFamily).toBe(pawnDefinition?.visualFamilyKey);
      expect(slot.presentation.rotating.emptyLabel).toBeNull();
      expect(slot.presentation.upright.construct?.silhouetteKey).toBe(
        pawnDefinition?.visualSilhouetteKey,
      );
      expect(slot.presentation.upright.pedestal?.styleKey).toBe(pawnDefinition?.pedestalStyleKey);

      expect(slot.pawn?.tierStars).toBeGreaterThan(0);
      expect(slot.presentation.upright.tierStars?.count).toBe(slot.pawn?.tierStars);

      expect(slot.presentation.rotating.ruleLabel?.segments.length).toBeGreaterThan(0);
    }
  });

  it('prefers stage-provided slot loadout over the authored wave preset', () => {
    const model = createCombatRenderModel({
      slotPawnIds: [
        'moss-patch',
        null,
        'heatline',
        null,
        null,
        null,
        null,
        null,
      ],
    });

    expect(model.record.slots[0]?.pawn?.id).toBe('moss-patch');
    expect(model.record.slots[2]?.pawn?.id).toBe('heatline');
    expect(model.record.slots[1]?.pawn).toBeNull();
  });

  it('renders stage-provided pawn tiers instead of hardcoded type-based stars', () => {
    const model = createCombatRenderModel({
      slotPawns: [
        { pawnId: 'moss-patch', tier: 3 },
        { pawnId: 'heatline', tier: 2 },
        ...Array.from({ length: 6 }, () => ({ pawnId: null, tier: null })),
      ],
    });

    expect(model.record.slots[0]?.pawn?.tierStars).toBe(3);
    expect(model.record.slots[0]?.presentation.upright.tierStars?.count).toBe(3);
    expect(model.record.slots[1]?.pawn?.tierStars).toBe(2);
    expect(model.record.slots[1]?.presentation.upright.tierStars?.count).toBe(2);
  });

  it('keeps derived slot label rotations normalized to the upright viewing range', () => {
    const model = createCombatRenderModel();

    for (const slot of model.record.slots) {
      expect(slot.innerLabelRotationDeg).toBeGreaterThanOrEqual(0);
      expect(slot.innerLabelRotationDeg).toBeLessThan(360);
    }
  });

  it('creates one enemy render unit per enemy runtime with matching identity and y-sort', () => {
    const activeWave = CombatWaveConfig.WAVES[0];
    const runtimes = createCombatEnemyRuntimes(activeWave!);
    const definitionsById = new Map(
      CombatContentConfig.ENEMY_DEFINITIONS.map((definition) => [definition.id, definition]),
    );
    const model = createCombatRenderModel();

    expect(model.enemies).toHaveLength(runtimes.length);

    for (const [index, enemy] of model.enemies.entries()) {
      const runtime = runtimes[index];
      const definition = definitionsById.get(enemy.definitionId);

      expect(runtime).toBeDefined();
      expect(definition).toBeDefined();

      if (!runtime || !definition) {
        continue;
      }

      expect(enemy.runtimeId).toBe(runtime?.runtimeId);
      expect(enemy.container.name).toBe(runtime.renderContainerName);
      expect(enemy.container.depth).toBeGreaterThan(model.record.base.depth);
      expect(enemy.container.sortY).toBe(enemy.container.y);
      expect(enemy.body.variantKey).toBe(definition.visualKey);
      expect(typeof enemy.body.color).toBe('number');
      expect(enemy.body.width).toBeGreaterThan(0);
      expect(enemy.body.height).toBeGreaterThan(0);
    }
  });

  it('applies per-archetype size multipliers so enemy silhouettes do not share one uniform bounding box', () => {
    const model = createCombatRenderModel({ waveIndex: 2 });

    const uniqueWidths = new Set(model.enemies.map((enemy) => enemy.body.width));
    expect(uniqueWidths.size).toBeGreaterThan(1);
  });
});
