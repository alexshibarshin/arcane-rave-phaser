import { getCombatPawnDefinitionById, type NoteColor } from '@config/CombatContentConfig';
import { SLOT_MODIFIER_CONFIG } from '@config/SlotModifierConfig';
import type {
  AoeRadiusScaleParams,
  BeamCountBonusParams,
  ColorOutputNoteBonusParams,
  OutputNoteBonusParams,
  ProjectileBonusParams,
} from '@config/SlotModifierConfig';
import type { CombatRuntime } from './CombatRuntime';

export interface SlotModifierMutations {
  bonusNotes: number;
  colorFilter: NoteColor | null;
  projectileCountBonus: number;
  volleyShotCountBonus: number;
  radiusMultiplier: number;
  extraBeamCount: number;
  doubleActivation: boolean;
}

const DEFAULT_SLOT_MODIFIER_MUTATIONS: SlotModifierMutations = {
  bonusNotes: 0,
  colorFilter: null,
  projectileCountBonus: 0,
  volleyShotCountBonus: 0,
  radiusMultiplier: 1,
  extraBeamCount: 0,
  doubleActivation: false,
};

export function resolveSlotModifierMutations(
  runtime: CombatRuntime,
  slotIndex: number,
): SlotModifierMutations {
  const assignment = runtime.slotModifiers[slotIndex];

  if (!assignment) {
    return DEFAULT_SLOT_MODIFIER_MUTATIONS;
  }

  const modifier = SLOT_MODIFIER_CONFIG.getModifierById(assignment.modifierId);
  const pawnId = runtime.slots[slotIndex]?.pawnId;

  if (!modifier || !pawnId) {
    return DEFAULT_SLOT_MODIFIER_MUTATIONS;
  }

  const pawn = getCombatPawnDefinitionById(pawnId);

  if (!pawn) {
    return DEFAULT_SLOT_MODIFIER_MUTATIONS;
  }

  switch (modifier.effectKind) {
    case 'output-note-bonus': {
      const params = modifier.effectParams as OutputNoteBonusParams;

      return {
        ...DEFAULT_SLOT_MODIFIER_MUTATIONS,
        bonusNotes: params.bonusNoteCount,
      };
    }
    case 'color-output-note-bonus': {
      const params = modifier.effectParams as ColorOutputNoteBonusParams;
      const outputColor = pawn.type === 'generator'
        ? pawn.color
        : pawn.outputNoteColor;

      return {
        ...DEFAULT_SLOT_MODIFIER_MUTATIONS,
        bonusNotes: outputColor === params.targetColor
          ? params.bonusNoteCount
          : 0,
        colorFilter: params.targetColor,
      };
    }
    case 'projectile-bonus': {
      const params = modifier.effectParams as ProjectileBonusParams;

      if (pawn.ability.primaryArchetype !== 'projectile') {
        return DEFAULT_SLOT_MODIFIER_MUTATIONS;
      }

      return {
        ...DEFAULT_SLOT_MODIFIER_MUTATIONS,
        projectileCountBonus: params.projectileCountBonus,
        volleyShotCountBonus: params.volleyShotCountBonus,
      };
    }
    case 'aoe-radius-scale': {
      const params = modifier.effectParams as AoeRadiusScaleParams;

      if (pawn.ability.primaryArchetype !== 'explosion' && pawn.ability.primaryArchetype !== 'zone') {
        return DEFAULT_SLOT_MODIFIER_MUTATIONS;
      }

      return {
        ...DEFAULT_SLOT_MODIFIER_MUTATIONS,
        radiusMultiplier: params.radiusMultiplier,
      };
    }
    case 'beam-count-bonus': {
      const params = modifier.effectParams as BeamCountBonusParams;

      if (pawn.ability.primaryArchetype !== 'beam') {
        return DEFAULT_SLOT_MODIFIER_MUTATIONS;
      }

      return {
        ...DEFAULT_SLOT_MODIFIER_MUTATIONS,
        extraBeamCount: params.extraBeamCount,
      };
    }
    case 'double-activation':
      return {
        ...DEFAULT_SLOT_MODIFIER_MUTATIONS,
        doubleActivation: true,
      };
    default:
      return DEFAULT_SLOT_MODIFIER_MUTATIONS;
  }
}
