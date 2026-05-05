import { describe, expect, it } from 'vitest';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatWaveConfig } from '@config/CombatWaveConfig';
import { GameConfig } from '@config/GameConfig';
import { createCombatEnemyRuntimes } from './CombatEnemyRuntimeFactory';
import { createCombatRenderModel } from './CombatRenderModel';

describe('CombatRenderModel', () => {
  it('binds structural anchors and depths to shared combat layout config', () => {
    const model = createCombatRenderModel();

    expect(model.background).toEqual({
      depth: CombatLayoutConfig.DEPTH.BACKGROUND,
      width: GameConfig.VIEWPORT_WIDTH,
      height: GameConfig.VIEWPORT_HEIGHT,
    });
    expect(model.enemyLane.depth).toBe(CombatLayoutConfig.DEPTH.ENEMY_LANE_DECORATIONS);
    expect(model.enemyLane.top).toBe(CombatLayoutConfig.ENEMY_ZONE_TOP);
    expect(model.enemyLane.bottom).toBe(CombatLayoutConfig.ENEMY_ZONE_BOTTOM);
    expect(model.record.base.depth).toBe(CombatLayoutConfig.DEPTH.RECORD_BASE);
    expect(model.record.slots).toHaveLength(CombatContentConfig.SLOT_COUNT);
    expect(model.base.depth).toBe(CombatLayoutConfig.DEPTH.BASE);
    expect(model.baseHpBar.depth).toBe(CombatLayoutConfig.DEPTH.BASE);
    expect(model.notePacketAnchor.depth).toBe(CombatLayoutConfig.DEPTH.NOTE_PACKET);
    expect(model.hud.depth).toBe(CombatLayoutConfig.DEPTH.HUD);
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
        expect(slot.presentation.rotating.emptyLabel?.text).toBe(CombatVisualConfig.EMPTY_SLOT_LABEL);
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

      if (pawnDefinition?.type === 'generator') {
        expect(slot.pawn?.tierStars).toBe(1);
        expect(slot.presentation.rotating.ruleLabel?.segments).toHaveLength(3);
      } else {
        expect(slot.pawn?.tierStars).toBe(2);
        expect(slot.presentation.rotating.ruleLabel?.segments).toHaveLength(7);
      }
    }
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
      expect(enemy.container.depth).toBe(CombatLayoutConfig.DEPTH.PAWNS);
      expect(enemy.container.sortY).toBe(enemy.container.y);
      expect(enemy.body.variantKey).toBe(definition.visualKey);
      expect(enemy.body.color).toBe(CombatVisualConfig.NOTE_COLORS[definition.color]);
      const expectedScaleMultiplier =
        CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS[
          definition.archetype as keyof typeof CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS
        ] ?? 1;
      expect(enemy.body.width).toBe(
        CombatVisualConfig.ENEMY.BASE_BODY_WIDTH * expectedScaleMultiplier,
      );
      expect(enemy.body.height).toBe(
        CombatVisualConfig.ENEMY.BASE_BODY_HEIGHT * expectedScaleMultiplier,
      );
    }
  });

  it('applies per-archetype size multipliers so enemy silhouettes do not share one uniform bounding box', () => {
    const model = createCombatRenderModel();
    const byDefinitionId = new Map(model.enemies.map((enemy) => [enemy.definitionId, enemy]));

    expect(byDefinitionId.get('enemy-red-swarm')?.body.width).toBeLessThan(
      byDefinitionId.get('enemy-red-basic')?.body.width ?? Number.POSITIVE_INFINITY,
    );
    expect(byDefinitionId.get('enemy-red-fast')?.body.width).toBeLessThan(
      byDefinitionId.get('enemy-red-basic')?.body.width ?? Number.POSITIVE_INFINITY,
    );
    expect(byDefinitionId.get('enemy-red-tank')?.body.width).toBeGreaterThan(
      byDefinitionId.get('enemy-red-basic')?.body.width ?? 0,
    );
    expect(byDefinitionId.get('enemy-red-boss')?.body.width).toBeGreaterThan(
      byDefinitionId.get('enemy-red-tank')?.body.width ?? 0,
    );
  });
});
