import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestPawn = {
  id: string;
  type: 'generator' | 'finisher';
  color: 'red' | 'green' | 'blue';
  outputNoteColor?: 'red' | 'green' | 'blue';
  ability: {
    primaryArchetype: 'projectile' | 'explosion' | 'beam' | 'zone';
  };
};

type TestModifier = {
  id: string;
  effectKind:
    | 'output-note-bonus'
    | 'color-output-note-bonus'
    | 'projectile-bonus'
    | 'aoe-radius-scale'
    | 'beam-count-bonus'
    | 'double-activation';
  effectParams: Record<string, unknown>;
};

const pawnFixtures = new Map<string, TestPawn>();
const modifierFixtures = new Map<string, TestModifier>();

vi.mock('@config/CombatContentConfig', () => ({
  getCombatPawnDefinitionById: (id: string) => pawnFixtures.get(id),
}));

vi.mock('@config/SlotModifierConfig', () => ({
  SLOT_MODIFIER_CONFIG: {
    getModifierById: (id: string) => modifierFixtures.get(id),
  },
}));

import { isPawnCompatibleWithModifier } from './ModifierCompatibility';

describe('isPawnCompatibleWithModifier', () => {
  beforeEach(() => {
    pawnFixtures.clear();
    modifierFixtures.clear();

    pawnFixtures.set('generator-red-projectile', {
      id: 'generator-red-projectile',
      type: 'generator',
      color: 'red',
      ability: { primaryArchetype: 'projectile' },
    });
    pawnFixtures.set('finisher-blue-beam', {
      id: 'finisher-blue-beam',
      type: 'finisher',
      color: 'red',
      outputNoteColor: 'blue',
      ability: { primaryArchetype: 'beam' },
    });
    pawnFixtures.set('generator-zone', {
      id: 'generator-zone',
      type: 'generator',
      color: 'green',
      ability: { primaryArchetype: 'zone' },
    });
    pawnFixtures.set('finisher-explosion', {
      id: 'finisher-explosion',
      type: 'finisher',
      color: 'blue',
      outputNoteColor: 'red',
      ability: { primaryArchetype: 'explosion' },
    });

    modifierFixtures.set('any-output', {
      id: 'any-output',
      effectKind: 'output-note-bonus',
      effectParams: { bonusNoteCount: 1 },
    });
    modifierFixtures.set('red-output', {
      id: 'red-output',
      effectKind: 'color-output-note-bonus',
      effectParams: { bonusNoteCount: 1, targetColor: 'red' },
    });
    modifierFixtures.set('projectile-only', {
      id: 'projectile-only',
      effectKind: 'projectile-bonus',
      effectParams: { projectileCountBonus: 1, volleyShotCountBonus: 1 },
    });
    modifierFixtures.set('aoe-only', {
      id: 'aoe-only',
      effectKind: 'aoe-radius-scale',
      effectParams: { radiusMultiplier: 1.5 },
    });
    modifierFixtures.set('beam-only', {
      id: 'beam-only',
      effectKind: 'beam-count-bonus',
      effectParams: { extraBeamCount: 1 },
    });
    modifierFixtures.set('double-act', {
      id: 'double-act',
      effectKind: 'double-activation',
      effectParams: { activationCount: 2 },
    });
  });

  it('accepts note-output modifiers for any generator or finisher', () => {
    expect(isPawnCompatibleWithModifier('generator-red-projectile', 'any-output')).toBe(true);
    expect(isPawnCompatibleWithModifier('finisher-blue-beam', 'any-output')).toBe(true);
  });

  it('matches color-output modifiers against the pawn emitted output color', () => {
    expect(isPawnCompatibleWithModifier('generator-red-projectile', 'red-output')).toBe(true);
    expect(isPawnCompatibleWithModifier('finisher-blue-beam', 'red-output')).toBe(false);
    expect(isPawnCompatibleWithModifier('finisher-explosion', 'red-output')).toBe(true);
  });

  it('accepts projectile-bonus only for projectile archetypes', () => {
    expect(isPawnCompatibleWithModifier('generator-red-projectile', 'projectile-only')).toBe(true);
    expect(isPawnCompatibleWithModifier('finisher-blue-beam', 'projectile-only')).toBe(false);
  });

  it('accepts aoe-radius-scale only for explosion and zone archetypes', () => {
    expect(isPawnCompatibleWithModifier('finisher-explosion', 'aoe-only')).toBe(true);
    expect(isPawnCompatibleWithModifier('generator-zone', 'aoe-only')).toBe(true);
    expect(isPawnCompatibleWithModifier('generator-red-projectile', 'aoe-only')).toBe(false);
  });

  it('accepts beam-count-bonus only for beam archetypes', () => {
    expect(isPawnCompatibleWithModifier('finisher-blue-beam', 'beam-only')).toBe(true);
    expect(isPawnCompatibleWithModifier('finisher-explosion', 'beam-only')).toBe(false);
  });

  it('accepts double-activation for any known pawn', () => {
    expect(isPawnCompatibleWithModifier('generator-red-projectile', 'double-act')).toBe(true);
    expect(isPawnCompatibleWithModifier('finisher-blue-beam', 'double-act')).toBe(true);
    expect(isPawnCompatibleWithModifier('generator-zone', 'double-act')).toBe(true);
  });

  it('returns false when the pawn or modifier is unknown', () => {
    expect(isPawnCompatibleWithModifier('missing-pawn', 'double-act')).toBe(false);
    expect(isPawnCompatibleWithModifier('generator-red-projectile', 'missing-modifier')).toBe(false);
  });
});
