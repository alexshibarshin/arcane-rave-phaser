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
  stageTags: ['Green', 'Mixed', 'Fast'],
  eliteEnemyId: 'backstage-blur',
  bossEnemyId: 'verdant-encore',
  totalWaves: 10,
  initialCoins: 25,
  hpMultipliers: [1.0, 1.2, 1.5, 1.9, 2.4, 2.95, 3.6, 4.35, 5.2, 6.5],
  slotModifierCountWeights: { 0: 0, 1: 0, 2: 0, 3: 1 },
  waves: [
    // ── Wave 1: Green, Mixed, Fast (3 sub-waves, 7 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-1-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-1-greenroom-3',
          startTimeMs: 5500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 3 },
        },
      ],
    },

    // ── Wave 2: Red, Single-Target, Tanky (4 sub-waves, 8 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Single-Target', 'Tanky'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-2-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-2-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-2-greenroom-3',
          startTimeMs: 6500,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2 },
        },
        {
          id: 'wave-2-greenroom-4',
          startTimeMs: 9500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-red-fast': 2 },
        },
      ],
    },

    // ── Wave 3: Blue, Crowd, Swarm (3 sub-waves, 9 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-3-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-3-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-blue-fast': 2 },
        },
        {
          id: 'wave-3-greenroom-3',
          startTimeMs: 5500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-green-basic': 1 },
        },
      ],
    },

    // ── Wave 4: Green, Mixed, Fast (4 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-4-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 2, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-4-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-4-greenroom-3',
          startTimeMs: 5500,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-4-greenroom-4',
          startTimeMs: 9000,
          spawnIntervalMs: 750,
          enemies: { 'enemy-red-fast': 2, 'enemy-green-fast': 1 },
        },
      ],
    },

    // ── Wave 5: Green, Elite, Mixed (4 sub-waves, 11 enemies + Backstage Blur) ──
    {
      kind: 'elite',
      tags: ['Green', 'Elite', 'Mixed'],
      specialEnemyId: 'backstage-blur',
      subWaves: [
        {
          id: 'wave-5-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-5-greenroom-2',
          startTimeMs: 3500,
          spawnIntervalMs: 1000,
          enemies: { 'backstage-blur': 1, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-5-greenroom-3',
          startTimeMs: 7500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-5-greenroom-4',
          startTimeMs: 11000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
      ],
    },

    // ── Wave 6: Red, Mixed, Crowd (3 sub-waves, 8 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Mixed', 'Crowd'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-6-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-swarm': 3 },
        },
        {
          id: 'wave-6-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-6-greenroom-3',
          startTimeMs: 6000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-green-basic': 2 },
        },
      ],
    },

    // ── Wave 7: Green, Single-Target, Fast (5 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-7-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-fast': 3 },
        },
        {
          id: 'wave-7-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-7-greenroom-3',
          startTimeMs: 5500,
          spawnIntervalMs: 750,
          enemies: { 'enemy-red-fast': 2, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-7-greenroom-4',
          startTimeMs: 9000,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2 },
        },
        {
          id: 'wave-7-greenroom-5',
          startTimeMs: 11500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 1 },
        },
      ],
    },

    // ── Wave 8: Blue, Crowd, Mixed (5 sub-waves, 16 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Mixed'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-8-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-8-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-blue-basic': 2 },
        },
        {
          id: 'wave-8-greenroom-3',
          startTimeMs: 5500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-blue-fast': 1 },
        },
        {
          id: 'wave-8-greenroom-4',
          startTimeMs: 9000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-basic': 2, 'enemy-blue-basic': 1 },
        },
        {
          id: 'wave-8-greenroom-5',
          startTimeMs: 12000,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 3 },
        },
      ],
    },

    // ── Wave 9: Green, Mixed, Tanky (5 sub-waves, 15 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Mixed', 'Tanky'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-9-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-9-greenroom-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-9-greenroom-3',
          startTimeMs: 5500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-9-greenroom-4',
          startTimeMs: 9000,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-9-greenroom-5',
          startTimeMs: 12500,
          spawnIntervalMs: 750,
          enemies: { 'enemy-blue-fast': 2, 'enemy-green-basic': 1 },
        },
      ],
    },

    // ── Wave 10: Green, Boss, Mixed (6 sub-waves, 16 enemies + Verdant Encore) ──
    {
      kind: 'boss',
      tags: ['Green', 'Boss', 'Mixed'],
      specialEnemyId: 'verdant-encore',
      subWaves: [
        {
          id: 'wave-10-greenroom-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-10-greenroom-2',
          startTimeMs: 3500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-10-greenroom-3',
          startTimeMs: 6500,
          spawnIntervalMs: 1500,
          enemies: { 'verdant-encore': 1 },
        },
        {
          id: 'wave-10-greenroom-4',
          startTimeMs: 9500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-10-greenroom-5',
          startTimeMs: 13000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-fast': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-10-greenroom-6',
          startTimeMs: 16000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-basic': 1 },
        },
      ],
    },
  ],
} as const satisfies StageConfig;
