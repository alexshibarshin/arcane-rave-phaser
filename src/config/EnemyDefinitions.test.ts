import { describe, expect, it } from 'vitest';
import { createEnemy, ENEMY_ARCHETYPE_TEMPLATES } from '@config/EnemyDefinitions';
import type { CombatEnemyDefinition } from '@config/CombatContentConfig';
import { CombatContentConfig } from '@config/CombatContentConfig';

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

describe('CombatEnemyDefinition special fields', () => {
  it('accepts optional displayName, silhouetteMotif, and isSpecial fields', () => {
    const specialEnemy: CombatEnemyDefinition = {
      id: 'test-elite',
      archetype: 'elite',
      color: 'red',
      maxHp: 700,
      moveSpeedPxPerSec: 22,
      attackRangePx: 370,
      attackCooldownMs: 2400,
      attackDamage: 5,
      visualKey: 'enemy-elite-test',
      displayName: 'Test Elite',
      silhouetteMotif: 'chevron-armor',
      isSpecial: true,
    };

    expect(specialEnemy.displayName).toBe('Test Elite');
    expect(specialEnemy.silhouetteMotif).toBe('chevron-armor');
    expect(specialEnemy.isSpecial).toBe(true);
  });

  it('allows omitting optional fields for backward compatibility', () => {
    const ordinaryEnemy: CombatEnemyDefinition = {
      id: 'test-ordinary',
      archetype: 'basic',
      color: 'green',
      maxHp: 100,
      moveSpeedPxPerSec: 40,
      attackRangePx: 370,
      attackCooldownMs: 1500,
      attackDamage: 2,
      visualKey: 'enemy-basic-green',
    };

    expect(ordinaryEnemy.id).toBe('test-ordinary');
    expect(ordinaryEnemy.displayName).toBeUndefined();
    expect(ordinaryEnemy.silhouetteMotif).toBeUndefined();
    expect(ordinaryEnemy.isSpecial).toBeUndefined();
  });
});

describe('Special enemy definitions', () => {
  it('enemies with isSpecial flag have non-empty displayName and silhouetteMotif', () => {
    const specialEnemies = CombatContentConfig.ENEMY_DEFINITIONS.filter((e) => e.isSpecial);
    expect(specialEnemies.length).toBeGreaterThan(0);
    for (const def of specialEnemies) {
      expect(typeof def.displayName).toBe('string');
      expect(def.displayName!.trim().length).toBeGreaterThan(0);
      expect(typeof def.silhouetteMotif).toBe('string');
      expect(def.silhouetteMotif!.trim().length).toBeGreaterThan(0);
    }
  });

  it('special enemies use only elite or boss archetype', () => {
    const specialEnemyArchetypes = CombatContentConfig.ENEMY_DEFINITIONS
      .filter((e) => e.isSpecial)
      .map((e) => e.archetype);
    expect(specialEnemyArchetypes.length).toBeGreaterThan(0);
    for (const arch of specialEnemyArchetypes) {
      expect(['elite', 'boss']).toContain(arch);
    }
  });

  it('all enemy definitions have positive numeric combat stats', () => {
    const statKeys = [
      'maxHp',
      'moveSpeedPxPerSec',
      'attackRangePx',
      'attackCooldownMs',
      'attackDamage',
    ] as const;

    expect(CombatContentConfig.ENEMY_DEFINITIONS.length).toBeGreaterThan(0);
    for (const def of CombatContentConfig.ENEMY_DEFINITIONS) {
      for (const key of statKeys) {
        expect(typeof def[key]).toBe('number');
        expect(def[key]).toBeGreaterThan(0);
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
