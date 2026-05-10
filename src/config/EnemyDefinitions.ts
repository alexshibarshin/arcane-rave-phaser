import type { CombatEnemyDefinition, NoteColor } from '@config/CombatContentConfig';

export const ENEMY_ARCHETYPE_TEMPLATES = {
  basic: { hp: 100, speed: 40, range: 370, cooldown: 1500, damage: 2 },
  fast:  { hp: 65,  speed: 62, range: 370, cooldown: 1100, damage: 2 },
  tank:  { hp: 260, speed: 28, range: 370, cooldown: 2200, damage: 4 },
  swarm: { hp: 40,  speed: 50, range: 370, cooldown: 1800, damage: 1 },
} as const;

export type EnemyArchetype = keyof typeof ENEMY_ARCHETYPE_TEMPLATES;

export function createEnemy(
  archetype: EnemyArchetype,
  color: NoteColor,
): CombatEnemyDefinition {
  const template = ENEMY_ARCHETYPE_TEMPLATES[archetype];

  return {
    id: `enemy-${color}-${archetype}`,
    archetype,
    color,
    maxHp: template.hp,
    moveSpeedPxPerSec: template.speed,
    attackRangePx: template.range,
    attackCooldownMs: template.cooldown,
    attackDamage: template.damage,
    visualKey: `enemy-${archetype}-${color}`,
  };
}

export interface SpecialEnemyConfig {
  id: string;
  displayName: string;
  archetype: 'elite' | 'boss';
  color: NoteColor;
  maxHp: number;
  moveSpeedPxPerSec: number;
  attackRangePx: number;
  attackCooldownMs: number;
  attackDamage: number;
  visualKey: string;
  silhouetteMotif: string;
}

export function createSpecialEnemy(config: SpecialEnemyConfig): CombatEnemyDefinition {
  return {
    id: config.id,
    archetype: config.archetype,
    color: config.color,
    maxHp: config.maxHp,
    moveSpeedPxPerSec: config.moveSpeedPxPerSec,
    attackRangePx: config.attackRangePx,
    attackCooldownMs: config.attackCooldownMs,
    attackDamage: config.attackDamage,
    visualKey: config.visualKey,
    displayName: config.displayName,
    silhouetteMotif: config.silhouetteMotif,
    isSpecial: true,
  };
}

export const IRON_KICK = createSpecialEnemy({
  id: 'iron-kick',
  displayName: 'Iron Kick',
  archetype: 'elite',
  color: 'red',
  maxHp: 700,
  moveSpeedPxPerSec: 22,
  attackRangePx: 370,
  attackCooldownMs: 2400,
  attackDamage: 5,
  visualKey: 'enemy-elite-iron-kick',
  silhouetteMotif: 'chevron-armor',
});

export const STATIC_CHOIR = createSpecialEnemy({
  id: 'static-choir',
  displayName: 'Static Choir',
  archetype: 'elite',
  color: 'blue',
  maxHp: 120,
  moveSpeedPxPerSec: 40,
  attackRangePx: 370,
  attackCooldownMs: 1600,
  attackDamage: 5,
  visualKey: 'enemy-elite-static-choir',
  silhouetteMotif: 'satellite-motes',
});

export const BACKSTAGE_BLUR = createSpecialEnemy({
  id: 'backstage-blur',
  displayName: 'Backstage Blur',
  archetype: 'elite',
  color: 'green',
  maxHp: 200,
  moveSpeedPxPerSec: 56,
  attackRangePx: 370,
  attackCooldownMs: 1000,
  attackDamage: 5,
  visualKey: 'enemy-elite-backstage-blur',
  silhouetteMotif: 'motion-trails',
});

export const REDLINE_HEADLINER = createSpecialEnemy({
  id: 'redline-headliner',
  displayName: 'Redline Headliner',
  archetype: 'boss',
  color: 'red',
  maxHp: 1400,
  moveSpeedPxPerSec: 24,
  attackRangePx: 370,
  attackCooldownMs: 2000,
  attackDamage: 8,
  visualKey: 'enemy-boss-redline-headliner',
  silhouetteMotif: 'crown-ring',
});

export const BLUE_NOISE_MONARCH = createSpecialEnemy({
  id: 'blue-noise-monarch',
  displayName: 'Blue Noise Monarch',
  archetype: 'boss',
  color: 'blue',
  maxHp: 220,
  moveSpeedPxPerSec: 44,
  attackRangePx: 370,
  attackCooldownMs: 1600,
  attackDamage: 8,
  visualKey: 'enemy-boss-blue-noise-monarch',
  silhouetteMotif: 'ring-wave',
});

export const VERDANT_ENCORE = createSpecialEnemy({
  id: 'verdant-encore',
  displayName: 'Verdant Encore',
  archetype: 'boss',
  color: 'green',
  maxHp: 380,
  moveSpeedPxPerSec: 54,
  attackRangePx: 370,
  attackCooldownMs: 950,
  attackDamage: 8,
  visualKey: 'enemy-boss-verdant-encore',
  silhouetteMotif: 'geometric-petals',
});

export const ALL_SPECIAL_ENEMIES: CombatEnemyDefinition[] = [
  IRON_KICK,
  STATIC_CHOIR,
  BACKSTAGE_BLUR,
  REDLINE_HEADLINER,
  BLUE_NOISE_MONARCH,
  VERDANT_ENCORE,
];
