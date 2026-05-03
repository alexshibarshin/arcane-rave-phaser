import { CombatBalanceConfig } from '@config/CombatBalanceConfig';

const NOTE_COLORS = ['red', 'green', 'blue'] as const;
const PAWN_TYPES = ['generator', 'finisher'] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];
export type PawnType = (typeof PAWN_TYPES)[number];

interface CombatPawnDefinitionBase {
  id: string;
  type: PawnType;
  color: NoteColor;
  baseDamage: number;
  visualFamilyKey: string;
  visualSilhouetteKey: string;
  pedestalStyleKey: string;
}

export interface CombatGeneratorPawnDefinition extends CombatPawnDefinitionBase {
  type: 'generator';
}

export interface CombatFinisherPawnDefinition extends CombatPawnDefinitionBase {
  type: 'finisher';
  outputNoteColor: NoteColor;
}

export type CombatPawnDefinition =
  | CombatGeneratorPawnDefinition
  | CombatFinisherPawnDefinition;

export interface CombatEnemyDefinition {
  id: string;
  archetype: string;
  color: NoteColor;
  maxHp: number;
  moveSpeedPxPerSec: number;
  attackRangePx: number;
  attackCooldownMs: number;
  attackDamage: number;
  visualKey: string;
}

export interface CombatSlotPresetDefinition {
  id: string;
  slots: Array<string | null>;
}

export interface CombatContentConfigShape {
  FEATURE_NAME: string;
  SLOT_COUNT: number;
  NOTE_COLORS: readonly NoteColor[];
  PAWN_TYPES: readonly PawnType[];
  PAWN_DEFINITIONS: readonly CombatPawnDefinition[];
  ENEMY_DEFINITIONS: readonly CombatEnemyDefinition[];
  SLOT_PRESETS: readonly CombatSlotPresetDefinition[];
}

const combatContentConfig = {
  FEATURE_NAME: 'Combat Sandbox',
  SLOT_COUNT: 8,
  NOTE_COLORS,
  PAWN_TYPES,
  PAWN_DEFINITIONS: [
    {
      id: 'pawn-red-generator',
      type: 'generator',
      color: 'red',
      baseDamage: CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
      visualFamilyKey: 'generator',
      visualSilhouetteKey: 'generator-red',
      pedestalStyleKey: 'pedestal-red',
    },
    {
      id: 'pawn-green-generator',
      type: 'generator',
      color: 'green',
      baseDamage: CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
      visualFamilyKey: 'generator',
      visualSilhouetteKey: 'generator-green',
      pedestalStyleKey: 'pedestal-green',
    },
    {
      id: 'pawn-blue-generator',
      type: 'generator',
      color: 'blue',
      baseDamage: CombatBalanceConfig.GENERATOR_BASE_DAMAGE,
      visualFamilyKey: 'generator',
      visualSilhouetteKey: 'generator-blue',
      pedestalStyleKey: 'pedestal-blue',
    },
    {
      id: 'pawn-red-finisher',
      type: 'finisher',
      color: 'red',
      baseDamage: CombatBalanceConfig.FINISHER_BASE_DAMAGE,
      outputNoteColor: 'green',
      visualFamilyKey: 'finisher',
      visualSilhouetteKey: 'finisher-red',
      pedestalStyleKey: 'pedestal-red',
    },
    {
      id: 'pawn-green-finisher',
      type: 'finisher',
      color: 'green',
      baseDamage: CombatBalanceConfig.FINISHER_BASE_DAMAGE,
      outputNoteColor: 'blue',
      visualFamilyKey: 'finisher',
      visualSilhouetteKey: 'finisher-green',
      pedestalStyleKey: 'pedestal-green',
    },
    {
      id: 'pawn-blue-finisher',
      type: 'finisher',
      color: 'blue',
      baseDamage: CombatBalanceConfig.FINISHER_BASE_DAMAGE,
      outputNoteColor: 'red',
      visualFamilyKey: 'finisher',
      visualSilhouetteKey: 'finisher-blue',
      pedestalStyleKey: 'pedestal-blue',
    },
  ] satisfies CombatPawnDefinition[],
  ENEMY_DEFINITIONS: [
    {
      id: 'enemy-red-basic',
      archetype: 'basic',
      color: 'red',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-basic-red',
    },
    {
      id: 'enemy-green-basic',
      archetype: 'basic',
      color: 'green',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-basic-green',
    },
    {
      id: 'enemy-blue-basic',
      archetype: 'basic',
      color: 'blue',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-basic-blue',
    },
  ] satisfies CombatEnemyDefinition[],
  SLOT_PRESETS: [
    {
      id: 'preset-starter-1',
      slots: [
        'pawn-red-generator',
        'pawn-green-finisher',
        null,
        'pawn-blue-generator',
        'pawn-red-finisher',
        null,
        'pawn-green-generator',
        'pawn-blue-finisher',
      ],
    },
  ] satisfies CombatSlotPresetDefinition[],
} as const satisfies CombatContentConfigShape;

export function validateCombatContentConfig(config: CombatContentConfigShape): void {
  const noteColors = new Set(config.NOTE_COLORS);
  const pawnIds = new Set<string>();

  for (const pawn of config.PAWN_DEFINITIONS) {
    if (!noteColors.has(pawn.color)) {
      throw new Error(`Combat pawn "${pawn.id}" uses an unknown note color.`);
    }

    if (pawnIds.has(pawn.id)) {
      throw new Error(`Combat pawn "${pawn.id}" is defined more than once.`);
    }

    pawnIds.add(pawn.id);

    if (pawn.type === 'finisher' && pawn.outputNoteColor === pawn.color) {
      throw new Error(
        `Combat finisher "${pawn.id}" must use an output note color different from its own color.`,
      );
    }
  }

  for (const enemy of config.ENEMY_DEFINITIONS) {
    if (!noteColors.has(enemy.color)) {
      throw new Error(`Combat enemy "${enemy.id}" uses an unknown note color.`);
    }
  }

  for (const preset of config.SLOT_PRESETS) {
    if (preset.slots.length !== config.SLOT_COUNT) {
      throw new Error(
        `Combat slot preset "${preset.id}" must contain exactly ${config.SLOT_COUNT} slots.`,
      );
    }

    for (const pawnId of preset.slots) {
      if (pawnId !== null && !pawnIds.has(pawnId)) {
        throw new Error(
          `Combat slot preset "${preset.id}" references unknown pawn "${pawnId}".`,
        );
      }
    }
  }
}

validateCombatContentConfig(combatContentConfig);

export const CombatContentConfig = combatContentConfig;
