import type { StageConfig } from '@config/StageConfig';

/**
 * Greenroom Collapse — Stage 3
 *
 * The hardest playable stage. Alternates between single-target and crowd pressure,
 * uses all four archetypes, and demands an adaptable build. Full system stress test.
 *
 * Dominant Color: Green (~70% of enemies)
 * Archetypes Available: basic, fast, tank, swarm (all four)
 * Slot Modifiers: 3, full pool
 */

export const greenroomCollapseConfig = {
  id: 'greenroom-collapse',
  displayName: 'Greenroom Collapse',
  stageTags: ['Green', 'Adaptive', 'Mixed'],
  eliteEnemyId: 'backstage-blur',
  bossEnemyId: 'verdant-encore',
  totalWaves: 10,
  initialCoins: 25,
  hpMultipliers: [1.0, 1.2, 1.5, 1.9, 2.4, 2.95, 3.6, 4.35, 5.2, 6.5],
  slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 },
  waves: [
    // ── Wave 1: Green, Mixed, Fast (4 sub-waves, 10 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 650,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-1-greenroom-2',
          startTimeMs: 2800,
          spawnIntervalMs: 1400,
          enemies: { 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-1-greenroom-3',
          startTimeMs: 6200,
          spawnIntervalMs: 450,
          enemies: { 'enemy-green-fast': 3 },
        },
        {
          id: 'wave-1-greenroom-4',
          startTimeMs: 9200,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2 },
        },
      ],
    },

    // ── Wave 2: Red, Single-Target, Tanky (5 sub-waves, 12 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Single-Target', 'Tanky'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-2-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 850,
          enemies: { 'enemy-red-basic': 3 },
        },
        {
          id: 'wave-2-greenroom-2',
          startTimeMs: 2800,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-2-greenroom-3',
          startTimeMs: 6500,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-2-greenroom-4',
          startTimeMs: 9000,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-2-greenroom-5',
          startTimeMs: 12600,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 2 },
        },
      ],
    },

    // ── Wave 3: Blue, Crowd, Swarm (4 sub-waves, 14 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-3-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-3-greenroom-2',
          startTimeMs: 2400,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-3-greenroom-3',
          startTimeMs: 6200,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-3-greenroom-4',
          startTimeMs: 8800,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-blue-basic': 2 },
        },
      ],
    },

    // ── Wave 4: Green, Mixed, Fast (5 sub-waves, 15 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-4-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-fast': 3, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-4-greenroom-2',
          startTimeMs: 2600,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-4-greenroom-3',
          startTimeMs: 5900,
          spawnIntervalMs: 500,
          enemies: { 'enemy-green-swarm': 3, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-4-greenroom-4',
          startTimeMs: 9200,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-fast': 2 },
        },
        {
          id: 'wave-4-greenroom-5',
          startTimeMs: 11800,
          spawnIntervalMs: 650,
          enemies: { 'enemy-green-fast': 2, 'enemy-green-basic': 2 },
        },
      ],
    },

    // ── Wave 5: Green, Elite, Mixed (5 sub-waves, 16 enemies + Backstage Blur) ──
    {
      kind: 'elite',
      tags: ['Green', 'Elite', 'Mixed'],
      specialEnemyId: 'backstage-blur',
      subWaves: [
        {
          id: 'wave-5-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-5-greenroom-2',
          startTimeMs: 2800,
          spawnIntervalMs: 500,
          enemies: { 'backstage-blur': 1, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-5-greenroom-3',
          startTimeMs: 5900,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-5-greenroom-4',
          startTimeMs: 8400,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-basic': 2 },
        },
        {
          id: 'wave-5-greenroom-5',
          startTimeMs: 12200,
          spawnIntervalMs: 550,
          enemies: { 'enemy-green-swarm': 2, 'enemy-green-fast': 2 },
        },
      ],
    },

    // ── Wave 6: Red, Mixed, Crowd (4 sub-waves, 14 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Mixed', 'Crowd'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-6-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-red-swarm': 4 },
        },
        {
          id: 'wave-6-greenroom-2',
          startTimeMs: 2400,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-6-greenroom-3',
          startTimeMs: 6000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-basic': 1, 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-6-greenroom-4',
          startTimeMs: 9500,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-fast': 2 },
        },
      ],
    },

    // ── Wave 7: Green, Single-Target, Fast (5 sub-waves, 16 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-7-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-green-fast': 4 },
        },
        {
          id: 'wave-7-greenroom-2',
          startTimeMs: 2300,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-7-greenroom-3',
          startTimeMs: 5600,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-fast': 2, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-7-greenroom-4',
          startTimeMs: 9000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-basic': 3 },
        },
        {
          id: 'wave-7-greenroom-5',
          startTimeMs: 12600,
          spawnIntervalMs: 650,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 3 },
        },
      ],
    },

    // ── Wave 8: Blue, Crowd, Mixed (6 sub-waves, 20 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Mixed'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-8-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-8-greenroom-2',
          startTimeMs: 2200,
          spawnIntervalMs: 800,
          enemies: { 'enemy-blue-basic': 2 },
        },
        {
          id: 'wave-8-greenroom-3',
          startTimeMs: 5000,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 3, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-8-greenroom-4',
          startTimeMs: 8300,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 1, 'enemy-green-swarm': 1 },
        },
        {
          id: 'wave-8-greenroom-5',
          startTimeMs: 10800,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-8-greenroom-6',
          startTimeMs: 13300,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-fast': 2 },
        },
      ],
    },

    // ── Wave 9: Green, Mixed, Tanky (6 sub-waves, 22 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Mixed', 'Tanky'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-9-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-basic': 3, 'enemy-green-swarm': 3 },
        },
        {
          id: 'wave-9-greenroom-2',
          startTimeMs: 2600,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-9-greenroom-3',
          startTimeMs: 5600,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-9-greenroom-4',
          startTimeMs: 8600,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 3 },
        },
        {
          id: 'wave-9-greenroom-5',
          startTimeMs: 11800,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-fast': 2 },
        },
        {
          id: 'wave-9-greenroom-6',
          startTimeMs: 14700,
          spawnIntervalMs: 550,
          enemies: { 'enemy-green-basic': 3, 'enemy-green-swarm': 2 },
        },
      ],
    },

    // ── Wave 10: Green, Boss, Mixed (7 sub-waves, 24 enemies + Verdant Encore) ──
    {
      kind: 'boss',
      tags: ['Green', 'Boss', 'Mixed'],
      specialEnemyId: 'verdant-encore',
      subWaves: [
        {
          id: 'wave-10-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-basic': 3, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-10-greenroom-2',
          startTimeMs: 2500,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-10-greenroom-3',
          startTimeMs: 5600,
          spawnIntervalMs: 650,
          enemies: { 'verdant-encore': 1, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-10-greenroom-4',
          startTimeMs: 8800,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-10-greenroom-5',
          startTimeMs: 11900,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 1 },
        },
        {
          id: 'wave-10-greenroom-6',
          startTimeMs: 14500,
          spawnIntervalMs: 500,
          enemies: { 'enemy-green-fast': 3, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-10-greenroom-7',
          startTimeMs: 17500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-basic': 1 },
        },
      ],
    },
  ],
} as const satisfies StageConfig;
