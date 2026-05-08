import { describe, expect, it } from 'vitest';
import { createEnemy, ENEMY_ARCHETYPE_TEMPLATES } from '@config/EnemyDefinitions';

describe('createEnemy', () => {
  it('produces objects with the id pattern enemy-{color}-{archetype} and correct field types', () => {
    const archetypeKey = Object.keys(ENEMY_ARCHETYPE_TEMPLATES)[0] as keyof typeof ENEMY_ARCHETYPE_TEMPLATES;
    const def = createEnemy(archetypeKey, 'red');

    expect(def.id).toBe(`enemy-red-${archetypeKey}`);
    expect(def.archetype).toBe(archetypeKey);
    expect(def.color).toBe('red');
    expect(def.visualKey).toBe(`enemy-${archetypeKey}-red`);

    expect(typeof def.maxHp).toBe('number');
    expect(typeof def.moveSpeedPxPerSec).toBe('number');
    expect(typeof def.attackRangePx).toBe('number');
    expect(typeof def.attackCooldownMs).toBe('number');
    expect(typeof def.attackDamage).toBe('number');
  });

  it('produces definitions with all positive stats', () => {
    for (const archetype of Object.keys(ENEMY_ARCHETYPE_TEMPLATES)) {
      const def = createEnemy(archetype as keyof typeof ENEMY_ARCHETYPE_TEMPLATES, 'red');
      expect(def.maxHp).toBeGreaterThan(0);
      expect(def.moveSpeedPxPerSec).toBeGreaterThan(0);
      expect(def.attackRangePx).toBeGreaterThan(0);
      expect(def.attackCooldownMs).toBeGreaterThan(0);
      expect(def.attackDamage).toBeGreaterThan(0);
    }
  });

  it('produces unique ids for different archetype-color combinations', () => {
    const ids = new Set<string>();
    const archetypes = Object.keys(ENEMY_ARCHETYPE_TEMPLATES) as (keyof typeof ENEMY_ARCHETYPE_TEMPLATES)[];
    for (const archetype of archetypes) {
      for (const color of ['red', 'green'] as const) {
        const def = createEnemy(archetype, color);
        expect(ids.has(def.id)).toBe(false);
        ids.add(def.id);
      }
    }
  });
});

describe('ENEMY_ARCHETYPE_TEMPLATES', () => {
  it('defines at least one archetype with all required stat fields', () => {
    const keys = Object.keys(ENEMY_ARCHETYPE_TEMPLATES);
    expect(keys.length).toBeGreaterThan(0);

    const requiredFields = ['hp', 'speed', 'range', 'cooldown', 'damage'];
    for (const key of keys) {
      const template = ENEMY_ARCHETYPE_TEMPLATES[key as keyof typeof ENEMY_ARCHETYPE_TEMPLATES];
      for (const field of requiredFields) {
        expect(template).toHaveProperty(field);
        expect(typeof (template as Record<string, unknown>)[field]).toBe('number');
        expect((template as Record<string, number>)[field]).toBeGreaterThan(0);
      }
    }
  });
});
