import { getCombatPawnDefinitionById } from '@config/CombatContentConfig';
import {
  SLOT_MODIFIER_CONFIG,
  type ColorOutputNoteBonusParams,
} from '@config/SlotModifierConfig';

export function isPawnCompatibleWithModifier(pawnId: string, modifierId: string): boolean {
  const pawn = getCombatPawnDefinitionById(pawnId);
  const modifier = SLOT_MODIFIER_CONFIG.getModifierById(modifierId);

  if (!pawn || !modifier) {
    return false;
  }

  switch (modifier.effectKind) {
    case 'output-note-bonus':
      return pawn.type === 'generator' || pawn.type === 'finisher';
    case 'color-output-note-bonus': {
      const params = modifier.effectParams as ColorOutputNoteBonusParams;
      const outputColor = pawn.type === 'generator'
        ? pawn.color
        : pawn.outputNoteColor;
      return outputColor === params.targetColor;
    }
    case 'projectile-bonus':
      return pawn.ability.primaryArchetype === 'projectile';
    case 'aoe-radius-scale':
      return pawn.ability.primaryArchetype === 'explosion'
        || pawn.ability.primaryArchetype === 'zone';
    case 'beam-count-bonus':
      return pawn.ability.primaryArchetype === 'beam';
    case 'double-activation':
      return true;
    default:
      return false;
  }
}
