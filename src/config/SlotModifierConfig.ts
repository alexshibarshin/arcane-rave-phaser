import { CombatContentConfig, type NoteColor } from '@config/CombatContentConfig';

export type SlotModifierRarity = 'common' | 'premium';

export type SlotModifierEffectKind =
  | 'output-note-bonus'
  | 'color-output-note-bonus'
  | 'projectile-bonus'
  | 'aoe-radius-scale'
  | 'beam-count-bonus'
  | 'double-activation';

export interface OutputNoteBonusParams {
  bonusNoteCount: number;
}

export interface ColorOutputNoteBonusParams {
  bonusNoteCount: number;
  targetColor: NoteColor;
}

export interface ProjectileBonusParams {
  projectileCountBonus: number;
  volleyShotCountBonus: number;
}

export interface AoeRadiusScaleParams {
  radiusMultiplier: number;
}

export interface BeamCountBonusParams {
  extraBeamCount: number;
}

export interface DoubleActivationParams {
  activationCount: number;
}

export type SlotModifierEffectParams =
  | OutputNoteBonusParams
  | ColorOutputNoteBonusParams
  | ProjectileBonusParams
  | AoeRadiusScaleParams
  | BeamCountBonusParams
  | DoubleActivationParams;

export interface SlotModifierDefinition {
  id: string;
  rarity: SlotModifierRarity;
  defaultWeight: number;
  displayName: string;
  shortDescription: string;
  iconKey: string;
  effectKind: SlotModifierEffectKind;
  effectParams: SlotModifierEffectParams;
}

const modifiers: SlotModifierDefinition[] = [
  {
    id: 'plus-one-output-note',
    rarity: 'common',
    defaultWeight: 10,
    displayName: '+1 Note',
    shortDescription: 'This slot produces one extra output note.',
    iconKey: 'mod-plus-one-output-note',
    effectKind: 'output-note-bonus',
    effectParams: { bonusNoteCount: 1 },
  },
  {
    id: 'plus-one-red-output-note',
    rarity: 'common',
    defaultWeight: 10,
    displayName: '+1 Red Note',
    shortDescription: 'This slot produces one extra red output note.',
    iconKey: 'mod-plus-one-red-output-note',
    effectKind: 'color-output-note-bonus',
    effectParams: { bonusNoteCount: 1, targetColor: 'red' },
  },
  {
    id: 'plus-one-green-output-note',
    rarity: 'common',
    defaultWeight: 10,
    displayName: '+1 Green Note',
    shortDescription: 'This slot produces one extra green output note.',
    iconKey: 'mod-plus-one-green-output-note',
    effectKind: 'color-output-note-bonus',
    effectParams: { bonusNoteCount: 1, targetColor: 'green' },
  },
  {
    id: 'plus-one-blue-output-note',
    rarity: 'common',
    defaultWeight: 10,
    displayName: '+1 Blue Note',
    shortDescription: 'This slot produces one extra blue output note.',
    iconKey: 'mod-plus-one-blue-output-note',
    effectKind: 'color-output-note-bonus',
    effectParams: { bonusNoteCount: 1, targetColor: 'blue' },
  },
  {
    id: 'plus-one-projectile',
    rarity: 'common',
    defaultWeight: 6,
    displayName: '+1 Projectile',
    shortDescription: 'Adds one extra projectile and one extra volley shot.',
    iconKey: 'mod-plus-one-projectile',
    effectKind: 'projectile-bonus',
    effectParams: { projectileCountBonus: 1, volleyShotCountBonus: 1 },
  },
  {
    id: 'plus-fifty-aoe-radius',
    rarity: 'common',
    defaultWeight: 6,
    displayName: '+50% AoE',
    shortDescription: 'Increases AoE radius by 50% for explosion and zone pawns.',
    iconKey: 'mod-plus-fifty-aoe-radius',
    effectKind: 'aoe-radius-scale',
    effectParams: { radiusMultiplier: 1.5 },
  },
  {
    id: 'plus-one-extra-beam',
    rarity: 'common',
    defaultWeight: 6,
    displayName: '+1 Beam',
    shortDescription: 'Adds one extra beam to beam pawns.',
    iconKey: 'mod-plus-one-extra-beam',
    effectKind: 'beam-count-bonus',
    effectParams: { extraBeamCount: 1 },
  },
  {
    id: 'plus-two-output-notes',
    rarity: 'premium',
    defaultWeight: 2,
    displayName: '+2 Notes',
    shortDescription: 'This slot produces two extra output notes.',
    iconKey: 'mod-plus-two-output-notes',
    effectKind: 'output-note-bonus',
    effectParams: { bonusNoteCount: 2 },
  },
  {
    id: 'double-activation',
    rarity: 'premium',
    defaultWeight: 2,
    displayName: 'Double Act',
    shortDescription: 'This slot activates twice per cycle.',
    iconKey: 'mod-double-activation',
    effectKind: 'double-activation',
    effectParams: { activationCount: 2 },
  },
];

export const PREMIUM_MODIFIER_IDS: readonly string[] = modifiers
  .filter((m) => m.rarity === 'premium')
  .map((m) => m.id);

export function getModifierById(id: string): SlotModifierDefinition | undefined {
  return modifiers.find((m) => m.id === id);
}

export function validateSlotModifierConfig(
  config: SlotModifierDefinition[],
  noteColors: readonly NoteColor[],
): void {
  const ids = new Set<string>();
  const noteColorSet = new Set(noteColors);

  for (const mod of config) {
    if (ids.has(mod.id)) {
      throw new Error(`Slot modifier "${mod.id}" has a duplicate ID.`);
    }
    ids.add(mod.id);

    if (mod.rarity !== 'common' && mod.rarity !== 'premium') {
      throw new Error(`Slot modifier "${mod.id}" has an invalid rarity "${mod.rarity}".`);
    }

    if (mod.defaultWeight < 0) {
      throw new Error(`Slot modifier "${mod.id}" has a negative defaultWeight.`);
    }

    switch (mod.effectKind) {
      case 'output-note-bonus': {
        const params = mod.effectParams as OutputNoteBonusParams;
        if (typeof params.bonusNoteCount !== 'number') {
          throw new Error(
            `Slot modifier "${mod.id}" is missing required param bonusNoteCount.`,
          );
        }
        break;
      }
      case 'color-output-note-bonus': {
        const params = mod.effectParams as ColorOutputNoteBonusParams;
        if (typeof params.bonusNoteCount !== 'number') {
          throw new Error(
            `Slot modifier "${mod.id}" is missing required param bonusNoteCount.`,
          );
        }
        if (!noteColorSet.has(params.targetColor)) {
          throw new Error(
            `Slot modifier "${mod.id}" has an invalid targetColor "${params.targetColor}".`,
          );
        }
        break;
      }
      case 'projectile-bonus': {
        const params = mod.effectParams as ProjectileBonusParams;
        if (
          typeof params.projectileCountBonus !== 'number' ||
          typeof params.volleyShotCountBonus !== 'number'
        ) {
          throw new Error(
            `Slot modifier "${mod.id}" is missing required projectile-bonus params.`,
          );
        }
        break;
      }
      case 'aoe-radius-scale': {
        const params = mod.effectParams as AoeRadiusScaleParams;
        if (typeof params.radiusMultiplier !== 'number') {
          throw new Error(
            `Slot modifier "${mod.id}" is missing required param radiusMultiplier.`,
          );
        }
        break;
      }
      case 'beam-count-bonus': {
        const params = mod.effectParams as BeamCountBonusParams;
        if (typeof params.extraBeamCount !== 'number') {
          throw new Error(
            `Slot modifier "${mod.id}" is missing required param extraBeamCount.`,
          );
        }
        break;
      }
      case 'double-activation': {
        const params = mod.effectParams as DoubleActivationParams;
        if (typeof params.activationCount !== 'number') {
          throw new Error(
            `Slot modifier "${mod.id}" is missing required param activationCount.`,
          );
        }
        break;
      }
      default:
        throw new Error(
          `Slot modifier "${mod.id}" has an unknown effectKind "${(mod as { effectKind: string }).effectKind}".`,
        );
    }
  }
}

validateSlotModifierConfig(modifiers, CombatContentConfig.NOTE_COLORS);

export const SLOT_MODIFIER_CONFIG = {
  modifiers,
  getModifierById,
} as const;
