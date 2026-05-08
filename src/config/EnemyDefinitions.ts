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
