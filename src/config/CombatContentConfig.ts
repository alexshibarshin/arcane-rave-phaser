import { CombatBalanceConfig } from '@config/CombatBalanceConfig';

const NOTE_COLORS = ['red', 'green', 'blue'] as const;
const PAWN_TYPES = ['generator', 'finisher'] as const;
const PRIMARY_ARCHETYPES = ['projectile', 'explosion', 'beam', 'zone'] as const;
const PROJECTILE_PATTERNS = ['single-shot', 'shotgun-spread', 'burst-volley'] as const;
const EXPLOSION_PATTERNS = ['targeted-burst', 'delayed-blast'] as const;
const BEAM_PATTERNS = ['lock-on-beam', 'sweeping-beam'] as const;
const ZONE_PATTERNS = ['placed-damage-zone'] as const;
const TARGETING_RULES = ['frontmost-enemy', 'random-enemy'] as const;
const SECONDARY_EFFECT_KINDS = [
  'slow-on-hit',
  'base-heal-from-damage',
  'burn-zone-on-detonation',
  'high-hp-bonus-damage',
  'next-slot-damage-buff',
  'bounce-on-hit',
  'split-on-hit',
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];
export type PawnType = (typeof PAWN_TYPES)[number];
export type CombatPawnPrimaryArchetype = (typeof PRIMARY_ARCHETYPES)[number];
export type CombatProjectilePattern = (typeof PROJECTILE_PATTERNS)[number];
export type CombatExplosionPattern = (typeof EXPLOSION_PATTERNS)[number];
export type CombatBeamPattern = (typeof BEAM_PATTERNS)[number];
export type CombatZonePattern = (typeof ZONE_PATTERNS)[number];
export type CombatTargetingRule = (typeof TARGETING_RULES)[number];
export type CombatSecondaryEffectKind = (typeof SECONDARY_EFFECT_KINDS)[number];

export interface CombatPawnArtDefinition {
  textureKey: string;
  frame: number;
  frameWidth: number;
  frameHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface CombatPawnTooltipDefinition {
  shortDescription: string;
}

export interface CombatGeneratorNoteRuleDefinition {
  family: 'generator';
  emittedNoteColor: NoteColor;
  emittedNoteCount: number;
}

export interface CombatFinisherNoteRuleDefinition {
  family: 'finisher';
  consumedNoteColor: NoteColor;
  outputNoteColor: NoteColor;
  emittedNoteCount: 1;
}

export type CombatPawnNoteRuleDefinition =
  | CombatGeneratorNoteRuleDefinition
  | CombatFinisherNoteRuleDefinition;

export interface CombatProjectileBaseSecondaryEffectDefinition {
  kind: CombatSecondaryEffectKind;
}

export interface CombatSlowSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'slow-on-hit';
  slowMultiplier: number;
  durationMs: number;
}

export interface CombatHealSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'base-heal-from-damage';
  healPercent: number;
}

export interface CombatBurnZoneSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'burn-zone-on-detonation';
  zoneRadius: number;
  zoneDurationMs: number;
  tickIntervalMs: number;
  damagePerTick: number;
}

export interface CombatHighHpSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'high-hp-bonus-damage';
  thresholdRatio: number;
  bonusDamagePercent: number;
}

export interface CombatNextSlotDamageBuffSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'next-slot-damage-buff';
  damageBonusPercent: number;
}

export interface CombatBounceSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'bounce-on-hit';
  maxBounces: 1;
}

export interface CombatSplitSecondaryEffectDefinition
  extends CombatProjectileBaseSecondaryEffectDefinition {
  kind: 'split-on-hit';
  childCount: number;
  splitConeAngleDeg: number;
  childLifetimeMs: number;
}

export type CombatPawnSecondaryEffectDefinition =
  | CombatSlowSecondaryEffectDefinition
  | CombatHealSecondaryEffectDefinition
  | CombatBurnZoneSecondaryEffectDefinition
  | CombatHighHpSecondaryEffectDefinition
  | CombatNextSlotDamageBuffSecondaryEffectDefinition
  | CombatBounceSecondaryEffectDefinition
  | CombatSplitSecondaryEffectDefinition;

export interface CombatProjectileAbilityDefinition {
  primaryArchetype: 'projectile';
  pattern: CombatProjectilePattern;
  targeting: 'frontmost-enemy';
  damage: number;
  projectileSpeed: number;
  projectileLifetimeMs: number;
  projectileCount?: number;
  coneAngleDeg?: number;
  volleyShotCount?: number;
  volleyIntervalMs?: number;
  secondaryEffect?: CombatPawnSecondaryEffectDefinition;
}

export interface CombatExplosionAbilityDefinition {
  primaryArchetype: 'explosion';
  pattern: CombatExplosionPattern;
  targeting: CombatTargetingRule;
  damage: number;
  radius: number;
  delayMs?: number;
  secondaryEffect?: CombatPawnSecondaryEffectDefinition;
}

export interface CombatBeamAbilityDefinition {
  primaryArchetype: 'beam';
  pattern: CombatBeamPattern;
  targeting: 'frontmost-enemy';
  damage: number;
  durationMs: number;
  tickIntervalMs?: number;
  sweepArcDeg?: number;
  sweepLengthPx?: number;
  sweepHitRadiusPx?: number;
  secondaryEffect?: CombatPawnSecondaryEffectDefinition;
}

export interface CombatZoneAbilityDefinition {
  primaryArchetype: 'zone';
  pattern: CombatZonePattern;
  targeting: CombatTargetingRule;
  damage: number;
  radius: number;
  durationMs: number;
  tickIntervalMs: number;
  secondaryEffect?: CombatPawnSecondaryEffectDefinition;
}

export type CombatPawnAbilityDefinition =
  | CombatProjectileAbilityDefinition
  | CombatExplosionAbilityDefinition
  | CombatBeamAbilityDefinition
  | CombatZoneAbilityDefinition;

interface CombatPawnDefinitionBase {
  id: string;
  displayName: string;
  type: PawnType;
  color: NoteColor;
  baseDamage: number;
  noteRule: CombatPawnNoteRuleDefinition;
  ability: CombatPawnAbilityDefinition;
  tooltip: CombatPawnTooltipDefinition;
  art: CombatPawnArtDefinition;
  isActiveInFirstPlayableDeck: boolean;
  visualFamilyKey: string;
  visualSilhouetteKey: string;
  pedestalStyleKey: string;
}

export interface CombatGeneratorPawnDefinition extends CombatPawnDefinitionBase {
  type: 'generator';
  noteRule: CombatGeneratorNoteRuleDefinition;
}

export interface CombatFinisherPawnDefinition extends CombatPawnDefinitionBase {
  type: 'finisher';
  noteRule: CombatFinisherNoteRuleDefinition;
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
  PRIMARY_ARCHETYPES: readonly CombatPawnPrimaryArchetype[];
  WEAKNESS_ADVANTAGE: Record<NoteColor, NoteColor>;
  PAWN_SPRITE_TEXTURE_KEY: string;
  PAWN_SPRITE_FRAME_WIDTH: number;
  PAWN_SPRITE_FRAME_HEIGHT: number;
  PAWN_DEFINITIONS: readonly CombatPawnDefinition[];
  ACTIVE_PAWN_DECK_IDS: readonly string[];
  ENEMY_DEFINITIONS: readonly CombatEnemyDefinition[];
  SLOT_PRESETS: readonly CombatSlotPresetDefinition[];
}

function createGeneratorPawnDefinition(input: {
  id: string;
  displayName: string;
  color: NoteColor;
  damage: number;
  artFrame: number;
  primaryArchetype: CombatPawnPrimaryArchetype;
  ability: CombatPawnAbilityDefinition;
  tooltip: string;
  isActiveInFirstPlayableDeck: boolean;
}): CombatGeneratorPawnDefinition {
  const artOffset = PAWN_ART_OFFSETS[input.id] ?? { offsetX: 0, offsetY: 0 };
  return {
    id: input.id,
    displayName: input.displayName,
    type: 'generator',
    color: input.color,
    baseDamage: input.damage,
    noteRule: {
      family: 'generator',
      emittedNoteColor: input.color,
      emittedNoteCount: 2,
    },
    ability: input.ability,
    tooltip: {
      shortDescription: input.tooltip,
    },
    art: {
      textureKey: PAWN_SPRITE_TEXTURE_KEY,
      frame: input.artFrame,
      frameWidth: PAWN_SPRITE_FRAME_WIDTH,
      frameHeight: PAWN_SPRITE_FRAME_HEIGHT,
      offsetX: artOffset.offsetX,
      offsetY: artOffset.offsetY,
    },
    isActiveInFirstPlayableDeck: input.isActiveInFirstPlayableDeck,
    visualFamilyKey: input.primaryArchetype,
    visualSilhouetteKey: input.id,
    pedestalStyleKey: `pedestal-${input.color}`,
  };
}

function createFinisherPawnDefinition(input: {
  id: string;
  displayName: string;
  color: NoteColor;
  outputNoteColor: NoteColor;
  damage: number;
  artFrame: number;
  primaryArchetype: CombatPawnPrimaryArchetype;
  ability: CombatPawnAbilityDefinition;
  tooltip: string;
  isActiveInFirstPlayableDeck: boolean;
}): CombatFinisherPawnDefinition {
  const artOffset = PAWN_ART_OFFSETS[input.id] ?? { offsetX: 0, offsetY: 0 };
  return {
    id: input.id,
    displayName: input.displayName,
    type: 'finisher',
    color: input.color,
    outputNoteColor: input.outputNoteColor,
    baseDamage: input.damage,
    noteRule: {
      family: 'finisher',
      consumedNoteColor: input.color,
      outputNoteColor: input.outputNoteColor,
      emittedNoteCount: 1,
    },
    ability: input.ability,
    tooltip: {
      shortDescription: input.tooltip,
    },
    art: {
      textureKey: PAWN_SPRITE_TEXTURE_KEY,
      frame: input.artFrame,
      frameWidth: PAWN_SPRITE_FRAME_WIDTH,
      frameHeight: PAWN_SPRITE_FRAME_HEIGHT,
      offsetX: artOffset.offsetX,
      offsetY: artOffset.offsetY,
    },
    isActiveInFirstPlayableDeck: input.isActiveInFirstPlayableDeck,
    visualFamilyKey: input.primaryArchetype,
    visualSilhouetteKey: input.id,
    pedestalStyleKey: `pedestal-${input.color}`,
  };
}

export const PAWN_SPRITE_TEXTURE_KEY = 'pawn-sprite-map';
export const PAWN_SPRITE_FRAME_WIDTH = 362;
export const PAWN_SPRITE_FRAME_HEIGHT = 362;
const PAWN_ART_OFFSETS: Record<string, { offsetX: number; offsetY: number }> = {
  'ruby-needle': { offsetX: 0, offsetY: 6 },
  'bass-bomb': { offsetX: 0, offsetY: 4 },
  'heatline': { offsetX: 0, offsetY: 6 },
  'meteor-drop': { offsetX: 0, offsetY: 8 },
  'moss-patch': { offsetX: 0, offsetY: 12 },
  'lifebloom-scatter': { offsetX: 0, offsetY: 10 },
  'thorn-fan': { offsetX: 0, offsetY: 8 },
  'pulse-garden': { offsetX: 0, offsetY: 10 },
  'frost-sweep': { offsetX: 0, offsetY: 14 },
  'prism-volley': { offsetX: 0, offsetY: 10 },
  'pressure-burst': { offsetX: 0, offsetY: 10 },
  'arc-bounce': { offsetX: 0, offsetY: 14 },
};

const combatContentConfig = {
  FEATURE_NAME: 'Pawn Overhaul',
  SLOT_COUNT: 8,
  NOTE_COLORS,
  PAWN_TYPES,
  PRIMARY_ARCHETYPES,
  WEAKNESS_ADVANTAGE: {
    red: 'red',
    green: 'green',
    blue: 'blue',
  } as const,
  PAWN_SPRITE_TEXTURE_KEY,
  PAWN_SPRITE_FRAME_WIDTH,
  PAWN_SPRITE_FRAME_HEIGHT,
  PAWN_DEFINITIONS: [
    createGeneratorPawnDefinition({
      id: 'ruby-needle',
      displayName: 'Ruby Needle',
      color: 'red',
      damage: 20,
      artFrame: 0,
      primaryArchetype: 'projectile',
      tooltip: 'Single precise shot for 20 damage.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'projectile',
        pattern: 'single-shot',
        targeting: 'frontmost-enemy',
        damage: 20,
        projectileSpeed: 860,
        projectileLifetimeMs: 3000,
      },
    }),
    createGeneratorPawnDefinition({
      id: 'bass-bomb',
      displayName: 'Bass Bomb',
      color: 'red',
      damage: 36,
      artFrame: 1,
      primaryArchetype: 'explosion',
      tooltip: 'Drops a 120-radius burst for 36 damage.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'explosion',
        pattern: 'targeted-burst',
        targeting: 'frontmost-enemy',
        damage: 36,
        radius: 120,
      },
    }),
    createFinisherPawnDefinition({
      id: 'heatline',
      displayName: 'Heatline',
      color: 'red',
      outputNoteColor: 'blue',
      damage: 16,
      artFrame: 2,
      primaryArchetype: 'beam',
      tooltip: 'Locks a beam for 3 sec., ticking 16 damage every 0.2 sec. If the target dies, it jumps to the next frontmost enemy.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'beam',
        pattern: 'lock-on-beam',
        targeting: 'frontmost-enemy',
        damage: 16,
        durationMs: 3000,
        tickIntervalMs: 200,
      },
    }),
    createFinisherPawnDefinition({
      id: 'meteor-drop',
      displayName: 'Meteor Drop',
      color: 'red',
      outputNoteColor: 'green',
      damage: 100,
      artFrame: 3,
      primaryArchetype: 'explosion',
      tooltip: 'After 0.5 sec., calls down a meteor: 100 damage in a 150 radius. Leaves a burning zone for 2 sec.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'explosion',
        pattern: 'delayed-blast',
        targeting: 'random-enemy',
        damage: 100,
        radius: 150,
        delayMs: 500,
        secondaryEffect: {
          kind: 'burn-zone-on-detonation',
          zoneRadius: 110,
          zoneDurationMs: 2000,
          tickIntervalMs: 500,
          damagePerTick: 18,
        },
      },
    }),
    createGeneratorPawnDefinition({
      id: 'moss-patch',
      displayName: 'Moss Patch',
      color: 'green',
      damage: 14,
      artFrame: 4,
      primaryArchetype: 'zone',
      tooltip: 'Creates a 130-radius zone for 2.5 sec., dealing 14 damage every 0.5 sec.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'zone',
        pattern: 'placed-damage-zone',
        targeting: 'frontmost-enemy',
        damage: 14,
        radius: 130,
        durationMs: 2500,
        tickIntervalMs: 500,
      },
    }),
    createGeneratorPawnDefinition({
      id: 'lifebloom-scatter',
      displayName: 'Lifebloom Scatter',
      color: 'green',
      damage: 20,
      artFrame: 5,
      primaryArchetype: 'projectile',
      tooltip: 'Burst of 3 projectiles for 20 damage each. Heals the base for 50% of damage dealt.',
      isActiveInFirstPlayableDeck: false,
      ability: {
        primaryArchetype: 'projectile',
        pattern: 'shotgun-spread',
        targeting: 'frontmost-enemy',
        damage: 20,
        projectileSpeed: 760,
        projectileLifetimeMs: 2000,
        projectileCount: 3,
        coneAngleDeg: 26,
        secondaryEffect: {
          kind: 'base-heal-from-damage',
          healPercent: 0.5,
        },
      },
    }),
    createFinisherPawnDefinition({
      id: 'thorn-fan',
      displayName: 'Thorn Fan',
      color: 'green',
      outputNoteColor: 'red',
      damage: 28,
      artFrame: 6,
      primaryArchetype: 'projectile',
      tooltip: 'Fan of 5 thorn shots for 28 damage each.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'projectile',
        pattern: 'shotgun-spread',
        targeting: 'frontmost-enemy',
        damage: 28,
        projectileSpeed: 820,
        projectileLifetimeMs: 720,
        projectileCount: 5,
        coneAngleDeg: 40,
      },
    }),
    createFinisherPawnDefinition({
      id: 'pulse-garden',
      displayName: 'Pulse Garden',
      color: 'green',
      outputNoteColor: 'blue',
      damage: 16,
      artFrame: 7,
      primaryArchetype: 'zone',
      tooltip: 'Creates a 140-radius pulse field for 2 sec. and buffs the next slot by 35% damage.',
      isActiveInFirstPlayableDeck: false,
      ability: {
        primaryArchetype: 'zone',
        pattern: 'placed-damage-zone',
        targeting: 'random-enemy',
        damage: 16,
        radius: 140,
        durationMs: 2000,
        tickIntervalMs: 500,
        secondaryEffect: {
          kind: 'next-slot-damage-buff',
          damageBonusPercent: 0.35,
        },
      },
    }),
    createGeneratorPawnDefinition({
      id: 'frost-sweep',
      displayName: 'Frost Sweep',
      color: 'blue',
      damage: 10,
      artFrame: 8,
      primaryArchetype: 'beam',
      tooltip: 'Sweeps a freezing beam for 3 sec. Targets take 10 damage and 45% slow for 1.5 sec.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'beam',
        pattern: 'sweeping-beam',
        targeting: 'frontmost-enemy',
        damage: 10,
        durationMs: 3000,
        sweepArcDeg: 72,
        sweepLengthPx: 520,
        sweepHitRadiusPx: 24,
        secondaryEffect: {
          kind: 'slow-on-hit',
          slowMultiplier: 0.55,
          durationMs: 1500,
        },
      },
    }),
    createGeneratorPawnDefinition({
      id: 'prism-volley',
      displayName: 'Prism Volley',
      color: 'blue',
      damage: 18,
      artFrame: 9,
      primaryArchetype: 'projectile',
      tooltip: 'Fires 3 timed shots for 18 damage. On hit, each shot splits into 2 child bolts.',
      isActiveInFirstPlayableDeck: false,
      ability: {
        primaryArchetype: 'projectile',
        pattern: 'burst-volley',
        targeting: 'frontmost-enemy',
        damage: 18,
        projectileSpeed: 760,
        projectileLifetimeMs: 800,
        volleyShotCount: 3,
        volleyIntervalMs: 180,
        secondaryEffect: {
          kind: 'split-on-hit',
          childCount: 2,
          splitConeAngleDeg: 34,
          childLifetimeMs: 420,
        },
      },
    }),
    createFinisherPawnDefinition({
      id: 'pressure-burst',
      displayName: 'Pressure Burst',
      color: 'blue',
      outputNoteColor: 'red',
      damage: 42,
      artFrame: 10,
      primaryArchetype: 'explosion',
      tooltip: 'Detonates a 130-radius burst for 42 damage. Deals 50% bonus to targets above 75% HP.',
      isActiveInFirstPlayableDeck: false,
      ability: {
        primaryArchetype: 'explosion',
        pattern: 'targeted-burst',
        targeting: 'frontmost-enemy',
        damage: 42,
        radius: 130,
        secondaryEffect: {
          kind: 'high-hp-bonus-damage',
          thresholdRatio: 0.75,
          bonusDamagePercent: 0.5,
        },
      },
    }),
    createFinisherPawnDefinition({
      id: 'arc-bounce',
      displayName: 'Arc Bounce',
      color: 'blue',
      outputNoteColor: 'green',
      damage: 24,
      artFrame: 11,
      primaryArchetype: 'projectile',
      tooltip: 'Burst of 3 timed shots for 24 damage each. Each shot can bounce once to a new enemy.',
      isActiveInFirstPlayableDeck: true,
      ability: {
        primaryArchetype: 'projectile',
        pattern: 'burst-volley',
        targeting: 'frontmost-enemy',
        damage: 24,
        projectileSpeed: 800,
        projectileLifetimeMs: 900,
        volleyShotCount: 3,
        volleyIntervalMs: 170,
        secondaryEffect: {
          kind: 'bounce-on-hit',
          maxBounces: 1,
        },
      },
    }),
  ] satisfies CombatPawnDefinition[],
  ACTIVE_PAWN_DECK_IDS: [
    'ruby-needle',
    'bass-bomb',
    'heatline',
    'moss-patch',
    'thorn-fan',
    'frost-sweep',
    'meteor-drop',
    'arc-bounce',
  ] satisfies string[],
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
    {
      id: 'enemy-red-tank',
      archetype: 'tank',
      color: 'red',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-tank-red',
    },
    {
      id: 'enemy-green-tank',
      archetype: 'tank',
      color: 'green',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-tank-green',
    },
    {
      id: 'enemy-blue-tank',
      archetype: 'tank',
      color: 'blue',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-tank-blue',
    },
    {
      id: 'enemy-red-fast',
      archetype: 'fast',
      color: 'red',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-fast-red',
    },
    {
      id: 'enemy-green-fast',
      archetype: 'fast',
      color: 'green',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-fast-green',
    },
    {
      id: 'enemy-blue-fast',
      archetype: 'fast',
      color: 'blue',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-fast-blue',
    },
    {
      id: 'enemy-red-ranged',
      archetype: 'ranged',
      color: 'red',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-ranged-red',
    },
    {
      id: 'enemy-green-ranged',
      archetype: 'ranged',
      color: 'green',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-ranged-green',
    },
    {
      id: 'enemy-blue-ranged',
      archetype: 'ranged',
      color: 'blue',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-ranged-blue',
    },
    {
      id: 'enemy-red-swarm',
      archetype: 'swarm',
      color: 'red',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-swarm-red',
    },
    {
      id: 'enemy-green-swarm',
      archetype: 'swarm',
      color: 'green',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-swarm-green',
    },
    {
      id: 'enemy-blue-swarm',
      archetype: 'swarm',
      color: 'blue',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-swarm-blue',
    },
    {
      id: 'enemy-red-boss',
      archetype: 'boss',
      color: 'red',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-boss-red',
    },
    {
      id: 'enemy-green-boss',
      archetype: 'boss',
      color: 'green',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-boss-green',
    },
    {
      id: 'enemy-blue-boss',
      archetype: 'boss',
      color: 'blue',
      maxHp: CombatBalanceConfig.ENEMY_MAX_HP,
      moveSpeedPxPerSec: CombatBalanceConfig.ENEMY_MOVE_SPEED_PX_PER_SEC,
      attackRangePx: CombatBalanceConfig.ENEMY_ATTACK_RANGE_PX,
      attackCooldownMs: CombatBalanceConfig.ENEMY_ATTACK_COOLDOWN_MS,
      attackDamage: CombatBalanceConfig.ENEMY_ATTACK_DAMAGE,
      visualKey: 'enemy-boss-blue',
    },
  ] satisfies CombatEnemyDefinition[],
  SLOT_PRESETS: [
    {
      id: 'preset-starter-1',
      slots: [
        'ruby-needle',
        'heatline',
        null,
        'bass-bomb',
        'moss-patch',
        null,
        'thorn-fan',
        'frost-sweep',
      ],
    },
  ] satisfies CombatSlotPresetDefinition[],
} as const satisfies CombatContentConfigShape;

export function getCombatPawnDefinitionById(id: string): CombatPawnDefinition | undefined {
  return combatContentConfig.PAWN_DEFINITIONS.find((pawn) => pawn.id === id);
}

export function getScaledPawnDamage(baseDamage: number, tier: number): number {
  const normalizedTier = Math.max(1, tier);
  const multiplierIndex = Math.min(
    normalizedTier - 1,
    CombatBalanceConfig.PAWN_TIER_DAMAGE_MULTIPLIER.length - 1,
  );
  const multiplier = CombatBalanceConfig.PAWN_TIER_DAMAGE_MULTIPLIER[multiplierIndex] ?? 1;
  return Math.round(baseDamage * multiplier);
}

export function getCombatActivePawnDeckIds(): readonly string[] {
  return combatContentConfig.ACTIVE_PAWN_DECK_IDS;
}

export function getCombatActivePawnDefinitions(): CombatPawnDefinition[] {
  const activeIds = new Set(combatContentConfig.ACTIVE_PAWN_DECK_IDS);
  return combatContentConfig.PAWN_DEFINITIONS.filter((pawn) => activeIds.has(pawn.id));
}

export function validateCombatContentConfig(config: CombatContentConfigShape): void {
  const noteColors = new Set(config.NOTE_COLORS);
  const pawnIds = new Set<string>();
  const activeDeckIds = new Set(config.ACTIVE_PAWN_DECK_IDS);

  if (config.ACTIVE_PAWN_DECK_IDS.length !== 8) {
    throw new Error('Active pawn deck must contain exactly 8 pawn ids.');
  }

  for (const pawn of config.PAWN_DEFINITIONS) {
    if (!noteColors.has(pawn.color)) {
      throw new Error(`Combat pawn "${pawn.id}" uses an unknown note color.`);
    }

    if (pawnIds.has(pawn.id)) {
      throw new Error(`Combat pawn "${pawn.id}" is defined more than once.`);
    }

    pawnIds.add(pawn.id);

    if (pawn.displayName.trim().length === 0) {
      throw new Error(`Combat pawn "${pawn.id}" must define a display name.`);
    }

    if (pawn.tooltip.shortDescription.trim().length === 0) {
      throw new Error(`Combat pawn "${pawn.id}" must define a tooltip description.`);
    }

    if (pawn.art.textureKey.trim().length === 0) {
      throw new Error(`Combat pawn "${pawn.id}" must define a sprite texture key.`);
    }

    if (pawn.type === 'finisher' && pawn.outputNoteColor === pawn.color) {
      throw new Error(
        `Combat finisher "${pawn.id}" must use an output note color different from its own color.`,
      );
    }

    if (pawn.type === 'finisher' && pawn.noteRule.outputNoteColor !== pawn.outputNoteColor) {
      throw new Error(`Combat finisher "${pawn.id}" output note color must stay in sync with note rules.`);
    }

    if (pawn.type === 'finisher' && pawn.noteRule.outputNoteColor === pawn.color) {
      throw new Error(
        `Combat finisher "${pawn.id}" note-rule output note color must differ from its own color.`,
      );
    }

    if (pawn.type === 'generator' && pawn.noteRule.family !== 'generator') {
      throw new Error(`Combat pawn "${pawn.id}" generator type must use generator note rules.`);
    }

    if (pawn.type === 'finisher' && pawn.noteRule.family !== 'finisher') {
      throw new Error(`Combat pawn "${pawn.id}" finisher type must use finisher note rules.`);
    }

    if ((pawn.ability.secondaryEffect ? 1 : 0) > 1) {
      throw new Error(`Combat pawn "${pawn.id}" defines more than one secondary effect.`);
    }

    if (activeDeckIds.has(pawn.id) !== pawn.isActiveInFirstPlayableDeck) {
      throw new Error(`Combat pawn "${pawn.id}" deck availability is out of sync with active deck ids.`);
    }
  }

  for (const activeDeckId of config.ACTIVE_PAWN_DECK_IDS) {
    if (!pawnIds.has(activeDeckId)) {
      throw new Error(`Active pawn deck references unknown pawn "${activeDeckId}".`);
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
