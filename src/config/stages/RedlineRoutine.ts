import type { StageConfig } from '@config/StageConfig';

/**
 * Redline Routine — Stage 1
 *
 * Onboarding stage. Teaches basic build rhythm, color matchup,
 * and reading basic/fast/tank pressure. Finishes with a single-target boss exam.
 *
 * Dominant Color: Red (~70% of enemies)
 * Archetypes Available: basic, fast, tank (no swarm)
 * Slot Modifiers: Always 0
 */

export const redlineRoutineConfig = {
  id: 'redline-routine',
  displayName: 'Redline Routine',
  stageTags: ['Red', 'Single-Target', 'Tanky'],
  eliteEnemyId: 'iron-kick',
  bossEnemyId: 'redline-headliner',
  totalWaves: 10,
  initialCoins: 25,
  hpMultipliers: [1.0, 1.1, 1.3, 1.5, 1.75, 2.05, 2.4, 2.8, 3.2, 3.7],
  slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 },
  waveDefinitions: [],
  waves: [
    // ── Wave 1: Red, Single-Target, Fast (3 sub-waves, 7 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 3 },
        },
        {
          id: 'wave-1-redline-2',
          startTimeMs: 3500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-1-redline-3',
          startTimeMs: 6000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-fast': 2 },
        },
      ],
    },

    // ── Wave 2: Green, Single-Target, Tanky (3 sub-waves, 6 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Single-Target', 'Tanky'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-2-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-2-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-2-redline-3',
          startTimeMs: 5500,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-green-tank': 1 },
        },
      ],
    },

    // ── Wave 3: Red, Tanky, Single-Target (4 sub-waves, 8 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Tanky', 'Single-Target'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-3-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-3-redline-2',
          startTimeMs: 3500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-3-redline-3',
          startTimeMs: 6500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-red-fast': 2 },
        },
        {
          id: 'wave-3-redline-4',
          startTimeMs: 9000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-tank': 1 },
        },
      ],
    },

    // ── Wave 4: Blue, Mixed, Fast (4 sub-waves, 9 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-4-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-fast': 3 },
        },
        {
          id: 'wave-4-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 900,
          enemies: { 'enemy-blue-basic': 2 },
        },
        {
          id: 'wave-4-redline-3',
          startTimeMs: 5500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-basic': 1, 'enemy-blue-tank': 1 },
        },
        {
          id: 'wave-4-redline-4',
          startTimeMs: 8500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-blue-fast': 1, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 5: Red, Elite (4 sub-waves, 9 enemies + Iron Kick) ──
    {
      kind: 'elite',
      tags: ['Red', 'Single-Target', 'Elite'],
      specialEnemyId: 'iron-kick',
      subWaves: [
        {
          id: 'wave-5-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-5-redline-2',
          startTimeMs: 3500,
          spawnIntervalMs: 1200,
          enemies: { 'iron-kick': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-5-redline-3',
          startTimeMs: 7000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-5-redline-4',
          startTimeMs: 9500,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 2 },
        },
      ],
    },

    // ── Wave 6: Green, Single-Target, Fast (3 sub-waves, 7 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-6-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 2, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-6-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-6-redline-3',
          startTimeMs: 5500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 2 },
        },
      ],
    },

    // ── Wave 7: Red, Tanky, Single-Target (5 sub-waves, 9 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Tanky', 'Single-Target'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-7-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-7-redline-2',
          startTimeMs: 2500,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-7-redline-3',
          startTimeMs: 5500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-7-redline-4',
          startTimeMs: 9000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-red-fast': 2 },
        },
        {
          id: 'wave-7-redline-5',
          startTimeMs: 11500,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-tank': 1 },
        },
      ],
    },

    // ── Wave 8: Blue, Mixed, Fast (5 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-8-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-basic': 1 },
        },
        {
          id: 'wave-8-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-8-redline-3',
          startTimeMs: 5000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-blue-basic': 2, 'enemy-blue-fast': 1 },
        },
        {
          id: 'wave-8-redline-4',
          startTimeMs: 8000,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-8-redline-5',
          startTimeMs: 10500,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-blue-tank': 1, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 9: Red, Tanky, Single-Target (5 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Tanky', 'Single-Target'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-9-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-9-redline-2',
          startTimeMs: 2500,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-9-redline-3',
          startTimeMs: 5500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-basic': 2, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-9-redline-4',
          startTimeMs: 9000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-9-redline-5',
          startTimeMs: 12500,
          spawnIntervalMs: 800,
          enemies: { 'enemy-red-fast': 2 },
        },
      ],
    },

    // ── Wave 10: Red, Boss, Single-Target (5 sub-waves, 10 enemies + Redline Headliner) ──
    {
      kind: 'boss',
      tags: ['Red', 'Boss', 'Single-Target'],
      specialEnemyId: 'redline-headliner',
      subWaves: [
        {
          id: 'wave-10-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 900,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-10-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-10-redline-3',
          startTimeMs: 6000,
          spawnIntervalMs: 1500,
          enemies: { 'redline-headliner': 1 },
        },
        {
          id: 'wave-10-redline-4',
          startTimeMs: 9000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-red-fast': 2, 'enemy-green-basic': 1 },
        },
        {
          id: 'wave-10-redline-5',
          startTimeMs: 12000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 1 },
        },
      ],
    },
  ],
} as const satisfies StageConfig;
