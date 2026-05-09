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
  stageTags: ['Blue', 'Crowd', 'Swarm'],
  eliteEnemyId: 'static-choir',
  bossEnemyId: 'blue-noise-monarch',
  totalWaves: 10,
  initialCoins: 0,
  hpMultipliers: [1.0, 1.15, 1.35, 1.6, 1.9, 2.2, 2.55, 3.0, 3.45, 4.0],
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
  waveDefinitions: [],
  waves: [
    // ── Wave 1: Blue, Crowd, Swarm (3 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-1-bluerush-2',
          startTimeMs: 3500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-red-swarm': 3 },
        },
        {
          id: 'wave-1-bluerush-3',
          startTimeMs: 6500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-blue-fast': 1 },
        },
      ],
    },

    // ── Wave 2: Red, Crowd, Fast (3 sub-waves, 10 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Crowd', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-2-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-2-bluerush-2',
          startTimeMs: 3500,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-2-bluerush-3',
          startTimeMs: 6000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-fast': 2, 'enemy-red-swarm': 2 },
        },
      ],
    },

    // ── Wave 3: Blue, Crowd, Swarm (4 sub-waves, 15 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-3-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-3-bluerush-2',
          startTimeMs: 3000,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-blue-basic': 1 },
        },
        {
          id: 'wave-3-bluerush-3',
          startTimeMs: 6000,
          spawnIntervalMs: 650,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-3-bluerush-4',
          startTimeMs: 9000,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-swarm': 3 },
        },
      ],
    },

    // ── Wave 4: Green, Crowd, Mixed (4 sub-waves, 15 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Crowd', 'Mixed'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-4-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-swarm': 3 },
        },
        {
          id: 'wave-4-bluerush-2',
          startTimeMs: 3000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-4-bluerush-3',
          startTimeMs: 6000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-swarm': 2, 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-4-bluerush-4',
          startTimeMs: 9500,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
      ],
    },

    // ── Wave 5: Blue, Elite, Crowd (4 sub-waves, 16 enemies + Static Choir) ──
    {
      kind: 'elite',
      tags: ['Blue', 'Elite', 'Crowd'],
      specialEnemyId: 'static-choir',
      subWaves: [
        {
          id: 'wave-5-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 4, 'enemy-blue-fast': 1 },
        },
        {
          id: 'wave-5-bluerush-2',
          startTimeMs: 3500,
          spawnIntervalMs: 700,
          enemies: { 'static-choir': 1, 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-5-bluerush-3',
          startTimeMs: 7500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-red-swarm': 3 },
        },
        {
          id: 'wave-5-bluerush-4',
          startTimeMs: 10500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 3, 'enemy-blue-basic': 1 },
        },
      ],
    },

    // ── Wave 6: Red, Crowd, Swarm (3 sub-waves, 9 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Crowd', 'Swarm'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-6-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-swarm': 3 },
        },
        {
          id: 'wave-6-bluerush-2',
          startTimeMs: 3000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-swarm': 2 },
        },
        {
          id: 'wave-6-bluerush-3',
          startTimeMs: 5500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-swarm': 3, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 7: Blue, Crowd, Fast (4 sub-waves, 15 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Crowd', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-7-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-fast': 3 },
        },
        {
          id: 'wave-7-bluerush-2',
          startTimeMs: 3000,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-7-bluerush-3',
          startTimeMs: 6500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-fast': 2, 'enemy-red-swarm': 2 },
        },
        {
          id: 'wave-7-bluerush-4',
          startTimeMs: 9500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 2 },
        },
      ],
    },

    // ── Wave 8: Green, Crowd, Mixed (5 sub-waves, 16 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Crowd', 'Mixed'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-8-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-swarm': 3 },
        },
        {
          id: 'wave-8-bluerush-2',
          startTimeMs: 3000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-8-bluerush-3',
          startTimeMs: 6500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-8-bluerush-4',
          startTimeMs: 9500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-8-bluerush-5',
          startTimeMs: 12500,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-swarm': 2, 'enemy-green-basic': 1 },
        },
      ],
    },

    // ── Wave 9: Blue, Swarm, Crowd (5 sub-waves, 23 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Swarm', 'Crowd'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-9-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-swarm': 5 },
        },
        {
          id: 'wave-9-bluerush-2',
          startTimeMs: 3500,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-9-bluerush-3',
          startTimeMs: 7500,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-swarm': 4 },
        },
        {
          id: 'wave-9-bluerush-4',
          startTimeMs: 10500,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-basic': 1, 'enemy-blue-swarm': 4 },
        },
        {
          id: 'wave-9-bluerush-5',
          startTimeMs: 14000,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-swarm': 4 },
        },
      ],
    },

    // ── Wave 10: Blue, Boss, Crowd (5 sub-waves, 19 enemies + Blue Noise Monarch) ──
    {
      kind: 'boss',
      tags: ['Blue', 'Boss', 'Crowd'],
      specialEnemyId: 'blue-noise-monarch',
      subWaves: [
        {
          id: 'wave-10-bluerush-1',
          startTimeMs: 0,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 4, 'enemy-blue-fast': 1 },
        },
        {
          id: 'wave-10-bluerush-2',
          startTimeMs: 3500,
          spawnIntervalMs: 600,
          enemies: { 'enemy-blue-basic': 2, 'enemy-blue-swarm': 3 },
        },
        {
          id: 'wave-10-bluerush-3',
          startTimeMs: 7000,
          spawnIntervalMs: 1500,
          enemies: { 'blue-noise-monarch': 1 },
        },
        {
          id: 'wave-10-bluerush-4',
          startTimeMs: 10000,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-swarm': 4, 'enemy-green-swarm': 2 },
        },
        {
          id: 'wave-10-bluerush-5',
          startTimeMs: 13500,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-basic': 1 },
        },
      ],
    },
  ],
} as const satisfies StageConfig;
