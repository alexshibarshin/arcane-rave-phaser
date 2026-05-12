import type { StageConfig } from '@config/StageConfig';

/**
 * Blue Noise Rush — Stage 2
 *
 * Crowd/swarm-focused stage. High enemy density, fast tempo, no tank archetype.
 * Tests whether the build can handle screen density without leaking enemies.
 *
 * Dominant Color: Blue (~70% of enemies)
 * Archetypes Available: basic, fast, swarm (no tank)
 * Slot Modifiers: 1–2, simple pool only
 */

export const blueNoiseRushConfig = {
  id: 'blue-noise-rush',
  displayName: 'Blue Noise Rush',
  stageTags: ['Blue', 'Crowd', 'Burst'],
  eliteEnemyId: 'static-choir',
  bossEnemyId: 'blue-noise-monarch',
  totalWaves: 10,
  initialCoins: 25,
  hpMultipliers: [1.0, 1.15, 1.4, 1.7, 2.1, 2.55, 3.1, 3.65, 4.3, 5.0],
  slotModifierCountWeights: { 0: 0, 1: 7, 2: 3, 3: 0 },
  slotModifierWeightOverrides: {
    'plus-one-projectile': 12,
    'plus-fifty-aoe-radius': 12,
    'plus-one-output-note': 15,
    'plus-one-red-output-note': 10,
    'plus-one-green-output-note': 10,
    'plus-one-blue-output-note': 10,
    'double-activation': 0,
    'plus-two-output-notes': 0,
    'plus-one-extra-beam': 0,
  },
  waves: [
    // ── Wave 1: Blue, Crowd, Swarm (4 sub-waves, 14 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-1-bluerush-2',
          startTimeMs: 2200,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-1-bluerush-3',
          startTimeMs: 5200,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-swarm': 2 },
        },
        {
          id: 'wave-1-bluerush-4',
          startTimeMs: 7600,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 1 },
        },
      ],
    },

    // ── Wave 2: Red, Crowd, Fast (4 sub-waves, 14 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Crowd', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-2-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-red-swarm': 4, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-2-bluerush-2',
          startTimeMs: 2500,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-2-bluerush-3',
          startTimeMs: 5700,
          spawnIntervalMs: 800,
          enemies: { 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-2-bluerush-4',
          startTimeMs: 8600,
          spawnIntervalMs: 450,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 3: Blue, Crowd, Swarm (5 sub-waves, 18 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-3-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-3-bluerush-2',
          startTimeMs: 2100,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-3-bluerush-3',
          startTimeMs: 5200,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-3-bluerush-4',
          startTimeMs: 8300,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-3-bluerush-5',
          startTimeMs: 10800,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-basic': 1, 'enemy-blue-swarm': 2 },
        },
      ],
    },

    // ── Wave 4: Green, Crowd, Mixed (5 sub-waves, 18 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Crowd', 'Mixed'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-4-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-green-swarm': 4 },
        },
        {
          id: 'wave-4-bluerush-2',
          startTimeMs: 2200,
          spawnIntervalMs: 550,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-4-bluerush-3',
          startTimeMs: 5600,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-swarm': 2, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-4-bluerush-4',
          startTimeMs: 9000,
          spawnIntervalMs: 500,
          enemies: { 'enemy-green-swarm': 3, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-4-bluerush-5',
          startTimeMs: 12300,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-fast': 2 },
        },
      ],
    },

    // ── Wave 5: Blue, Elite, Crowd (5 sub-waves, 20 enemies + Static Choir) ──
    {
      kind: 'elite',
      tags: ['Blue', 'Elite', 'Crowd'],
      specialEnemyId: 'static-choir',
      subWaves: [
        {
          id: 'wave-5-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-5-bluerush-2',
          startTimeMs: 2200,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-5-bluerush-3',
          startTimeMs: 5600,
          spawnIntervalMs: 500,
          enemies: { 'static-choir': 1, 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-5-bluerush-4',
          startTimeMs: 9300,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-swarm': 2 },
        },
        {
          id: 'wave-5-bluerush-5',
          startTimeMs: 12300,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-blue-basic': 1 },
        },
      ],
    },

    // ── Wave 6: Red, Crowd, Swarm (4 sub-waves, 14 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-6-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-red-swarm': 4 },
        },
        {
          id: 'wave-6-bluerush-2',
          startTimeMs: 2200,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 2, 'enemy-red-swarm': 2 },
        },
        {
          id: 'wave-6-bluerush-3',
          startTimeMs: 5500,
          spawnIntervalMs: 850,
          enemies: { 'enemy-blue-swarm': 1, 'enemy-blue-fast': 1 },
        },
        {
          id: 'wave-6-bluerush-4',
          startTimeMs: 8300,
          spawnIntervalMs: 450,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 7: Blue, Crowd, Fast (5 sub-waves, 20 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-7-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 4 },
        },
        {
          id: 'wave-7-bluerush-2',
          startTimeMs: 2300,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-7-bluerush-3',
          startTimeMs: 5600,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-fast': 2, 'enemy-red-swarm': 1 },
        },
        {
          id: 'wave-7-bluerush-4',
          startTimeMs: 8600,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 3, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-7-bluerush-5',
          startTimeMs: 12000,
          spawnIntervalMs: 900,
          enemies: { 'enemy-blue-basic': 2, 'enemy-blue-swarm': 1 },
        },
      ],
    },

    // ── Wave 8: Green, Crowd, Mixed (5 sub-waves, 20 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Crowd', 'Mixed'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-8-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 450,
          enemies: { 'enemy-green-swarm': 4 },
        },
        {
          id: 'wave-8-bluerush-2',
          startTimeMs: 2300,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-8-bluerush-3',
          startTimeMs: 5900,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-swarm': 2, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-8-bluerush-4',
          startTimeMs: 9300,
          spawnIntervalMs: 500,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 3 },
        },
        {
          id: 'wave-8-bluerush-5',
          startTimeMs: 12700,
          spawnIntervalMs: 550,
          enemies: { 'enemy-green-fast': 2, 'enemy-green-swarm': 1 },
        },
      ],
    },

    // ── Wave 9: Blue, Swarm, Crowd (6 sub-waves, 26 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Swarm', 'Crowd'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-9-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 380,
          enemies: { 'enemy-blue-swarm': 6 },
        },
        {
          id: 'wave-9-bluerush-2',
          startTimeMs: 2200,
          spawnIntervalMs: 420,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-9-bluerush-3',
          startTimeMs: 5000,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-swarm': 3 },
        },
        {
          id: 'wave-9-bluerush-4',
          startTimeMs: 7600,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-9-bluerush-5',
          startTimeMs: 10400,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-basic': 1, 'enemy-blue-fast': 2, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-9-bluerush-6',
          startTimeMs: 13600,
          spawnIntervalMs: 380,
          enemies: { 'enemy-blue-swarm': 2 },
        },
      ],
    },

    // ── Wave 10: Blue, Boss, Crowd (6 sub-waves, 24 enemies + Blue Noise Monarch) ──
    {
      kind: 'boss',
      tags: ['Blue', 'Boss', 'Crowd'],
      specialEnemyId: 'blue-noise-monarch',
      subWaves: [
        {
          id: 'wave-10-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 400,
          enemies: { 'enemy-blue-swarm': 5, 'enemy-blue-fast': 1 },
        },
        {
          id: 'wave-10-bluerush-2',
          startTimeMs: 2300,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-basic': 2, 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-10-bluerush-3',
          startTimeMs: 5600,
          spawnIntervalMs: 650,
          enemies: { 'blue-noise-monarch': 1, 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-10-bluerush-4',
          startTimeMs: 9000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-10-bluerush-5',
          startTimeMs: 11500,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-swarm': 4, 'enemy-blue-fast': 2 },
        },
        {
          id: 'wave-10-bluerush-6',
          startTimeMs: 14900,
          spawnIntervalMs: 900,
          enemies: { 'enemy-blue-basic': 1 },
        },
      ],
    },
  ],
} as const satisfies StageConfig;
