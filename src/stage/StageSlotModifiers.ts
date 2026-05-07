import type { StageConfig } from '@config/StageConfig';
import type { SlotModifierDefinition } from '@config/SlotModifierConfig';

export interface SlotModifierAssignment {
  slotIndex: number;
  modifierId: string;
}

function weightedRandomSelect<T>(
  items: T[],
  getWeight: (item: T) => number,
  rng: () => number,
): T {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  if (totalWeight <= 0) {
    throw new Error('weightedRandomSelect: totalWeight must be positive');
  }
  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= getWeight(item);
    if (roll < 0) {
      return item;
    }
  }
  return items[items.length - 1]!;
}

export function generateStageSlotModifiers(
  rng: () => number,
  stageConfig: StageConfig,
  modifierPool: SlotModifierDefinition[],
): SlotModifierAssignment[] {
  const countWeights = [
    { count: 0, weight: stageConfig.slotModifierCountWeights[0] },
    { count: 1, weight: stageConfig.slotModifierCountWeights[1] },
    { count: 2, weight: stageConfig.slotModifierCountWeights[2] },
    { count: 3, weight: stageConfig.slotModifierCountWeights[3] },
  ];

  const count = weightedRandomSelect(countWeights, (c) => c.weight, rng).count;

  if (count === 0) {
    return [];
  }

  const assignments: SlotModifierAssignment[] = [];
  const usedSlots = new Set<number>();
  let hasPremium = false;

  for (let i = 0; i < count; i++) {
    let slotIndex: number;
    do {
      slotIndex = Math.floor(rng() * 8);
    } while (usedSlots.has(slotIndex));
    usedSlots.add(slotIndex);

    const eligible = modifierPool.filter((m) => {
      const effectiveWeight =
        stageConfig.slotModifierWeightOverrides?.[m.id] ?? m.defaultWeight;
      if (effectiveWeight <= 0) return false;
      if (hasPremium && m.rarity === 'premium') return false;
      return true;
    });

    if (eligible.length === 0) {
      throw new Error('No eligible modifiers for slot');
    }

    const modifier = weightedRandomSelect(eligible, (m) => {
      return stageConfig.slotModifierWeightOverrides?.[m.id] ?? m.defaultWeight;
    }, rng);

    if (modifier.rarity === 'premium') {
      hasPremium = true;
    }

    assignments.push({ slotIndex, modifierId: modifier.id });
  }

  return assignments;
}
