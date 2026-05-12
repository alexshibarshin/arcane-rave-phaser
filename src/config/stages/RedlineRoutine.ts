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
  stageTags: ['Red', 'Single-Target', 'Attrition'],
  eliteEnemyId: 'iron-kick',
  bossEnemyId: 'redline-headliner',
  totalWaves: 10,
  initialCoins: 25,
  hpMultipliers: [1.0, 1.1, 1.25, 1.45, 1.7, 2.0, 2.4, 2.85, 3.35, 4.0],
  slotModifierCountWeights: { 0: 1, 1: 0, 2: 0, 3: 0 },
  waves: [
    // ── Wave 1: Red, Single-Target, Fast (4 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-1-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-basic': 4 },
        },
        {
          id: 'wave-1-redline-2',
          startTimeMs: 2600,
          spawnIntervalMs: 550,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-1-redline-3',
          startTimeMs: 5600,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-1-redline-4',
          startTimeMs: 8400,
          spawnIntervalMs: 650,
          enemies: { 'enemy-red-basic': 1, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 2: Green, Single-Target, Tanky (4 sub-waves, 10 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Single-Target', 'Tanky'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-2-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 850,
          enemies: { 'enemy-green-basic': 3 },
        },
        {
          id: 'wave-2-redline-2',
          startTimeMs: 3200,
          spawnIntervalMs: 750,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-fast': 1 },
        },
        {
          id: 'wave-2-redline-3',
          startTimeMs: 6900,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-2-redline-4',
          startTimeMs: 10500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-green-tank': 1, 'enemy-green-basic': 2 },
        },
      ],
    },

    // ── Wave 3: Red, Tanky, Single-Target (5 sub-waves, 12 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Tanky', 'Single-Target'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-3-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 800,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-3-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-3-redline-3',
          startTimeMs: 6200,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-3-redline-4',
          startTimeMs: 9800,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-3-redline-5',
          startTimeMs: 12800,
          spawnIntervalMs: 950,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 2 },
        },
      ],
    },

    // ── Wave 4: Blue, Mixed, Fast (5 sub-waves, 12 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-4-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-fast': 4 },
        },
        {
          id: 'wave-4-redline-2',
          startTimeMs: 2600,
          spawnIntervalMs: 900,
          enemies: { 'enemy-blue-basic': 2 },
        },
        {
          id: 'wave-4-redline-3',
          startTimeMs: 5600,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-red-basic': 1, 'enemy-blue-tank': 1 },
        },
        {
          id: 'wave-4-redline-4',
          startTimeMs: 9000,
          spawnIntervalMs: 550,
          enemies: { 'enemy-blue-fast': 2, 'enemy-blue-basic': 1 },
        },
        {
          id: 'wave-4-redline-5',
          startTimeMs: 12500,
          spawnIntervalMs: 650,
          enemies: { 'enemy-green-fast': 1, 'enemy-blue-fast': 1 },
        },
      ],
    },

    // ── Wave 5: Red, Elite (5 sub-waves, 13 enemies + Iron Kick) ──
    {
      kind: 'elite',
      tags: ['Red', 'Single-Target', 'Elite'],
      specialEnemyId: 'iron-kick',
      subWaves: [
        {
          id: 'wave-5-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 850,
          enemies: { 'enemy-red-basic': 3 },
        },
        {
          id: 'wave-5-redline-2',
          startTimeMs: 2600,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-5-redline-3',
          startTimeMs: 6200,
          spawnIntervalMs: 1000,
          enemies: { 'iron-kick': 1, 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-5-redline-4',
          startTimeMs: 9800,
          spawnIntervalMs: 700,
          enemies: { 'enemy-green-fast': 2 },
        },
        {
          id: 'wave-5-redline-5',
          startTimeMs: 12900,
          spawnIntervalMs: 600,
          enemies: { 'enemy-red-basic': 2, 'enemy-red-fast': 1 },
        },
      ],
    },

    // ── Wave 6: Green, Single-Target, Fast (4 sub-waves, 11 enemies) ──
    {
      kind: 'normal',
      tags: ['Green', 'Single-Target', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-6-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 600,
          enemies: { 'enemy-green-fast': 3 },
        },
        {
          id: 'wave-6-redline-2',
          startTimeMs: 2500,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 2 },
        },
        {
          id: 'wave-6-redline-3',
          startTimeMs: 6200,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-basic': 1, 'enemy-green-tank': 1 },
        },
        {
          id: 'wave-6-redline-4',
          startTimeMs: 9800,
          spawnIntervalMs: 550,
          enemies: { 'enemy-green-fast': 3, 'enemy-green-basic': 1 },
        },
      ],
    },

    // ── Wave 7: Red, Tanky, Single-Target (5 sub-waves, 14 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Tanky', 'Single-Target'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-7-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 850,
          enemies: { 'enemy-red-basic': 4 },
        },
        {
          id: 'wave-7-redline-2',
          startTimeMs: 3200,
          spawnIntervalMs: 1100,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-7-redline-3',
          startTimeMs: 6900,
          spawnIntervalMs: 650,
          enemies: { 'enemy-green-tank': 1, 'enemy-red-fast': 2 },
        },
        {
          id: 'wave-7-redline-4',
          startTimeMs: 10300,
          spawnIntervalMs: 950,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-7-redline-5',
          startTimeMs: 14000,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 2 },
        },
      ],
    },

    // ── Wave 8: Blue, Mixed, Fast (5 sub-waves, 15 enemies) ──
    {
      kind: 'normal',
      tags: ['Blue', 'Mixed', 'Fast'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-8-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 500,
          enemies: { 'enemy-blue-fast': 4, 'enemy-blue-basic': 1 },
        },
        {
          id: 'wave-8-redline-2',
          startTimeMs: 2800,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-blue-tank': 1 },
        },
        {
          id: 'wave-8-redline-3',
          startTimeMs: 6200,
          spawnIntervalMs: 450,
          enemies: { 'enemy-blue-fast': 3 },
        },
        {
          id: 'wave-8-redline-4',
          startTimeMs: 9800,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-fast': 2, 'enemy-blue-basic': 1 },
        },
        {
          id: 'wave-8-redline-5',
          startTimeMs: 13300,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-tank': 1, 'enemy-blue-fast': 2 },
        },
      ],
    },

    // ── Wave 9: Red, Tanky, Single-Target (6 sub-waves, 16 enemies) ──
    {
      kind: 'normal',
      tags: ['Red', 'Tanky', 'Single-Target'],
      specialEnemyId: null,
      subWaves: [
        {
          id: 'wave-9-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 850,
          enemies: { 'enemy-red-basic': 4 },
        },
        {
          id: 'wave-9-redline-2',
          startTimeMs: 2600,
          spawnIntervalMs: 1200,
          enemies: { 'enemy-red-tank': 1 },
        },
        {
          id: 'wave-9-redline-3',
          startTimeMs: 6000,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-9-redline-4',
          startTimeMs: 9200,
          spawnIntervalMs: 900,
          enemies: { 'enemy-green-basic': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-9-redline-5',
          startTimeMs: 12600,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-9-redline-6',
          startTimeMs: 16500,
          spawnIntervalMs: 550,
          enemies: { 'enemy-red-fast': 3 },
        },
      ],
    },

    // ── Wave 10: Red, Boss, Single-Target (6 sub-waves, 16 enemies + Redline Headliner) ──
    {
      kind: 'boss',
      tags: ['Red', 'Boss', 'Single-Target'],
      specialEnemyId: 'redline-headliner',
      subWaves: [
        {
          id: 'wave-10-redline-1',
          startTimeMs: 0,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-basic': 3, 'enemy-red-fast': 1 },
        },
        {
          id: 'wave-10-redline-2',
          startTimeMs: 3000,
          spawnIntervalMs: 1000,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-basic': 1 },
        },
        {
          id: 'wave-10-redline-3',
          startTimeMs: 6500,
          spawnIntervalMs: 1500,
          enemies: { 'redline-headliner': 1 },
        },
        {
          id: 'wave-10-redline-4',
          startTimeMs: 9500,
          spawnIntervalMs: 500,
          enemies: { 'enemy-red-fast': 3 },
        },
        {
          id: 'wave-10-redline-5',
          startTimeMs: 13000,
          spawnIntervalMs: 800,
          enemies: { 'enemy-green-basic': 1, 'enemy-red-basic': 2 },
        },
        {
          id: 'wave-10-redline-6',
          startTimeMs: 16800,
          spawnIntervalMs: 700,
          enemies: { 'enemy-red-tank': 1, 'enemy-red-fast': 2 },
        },
      ],
    },
  ],
} as const satisfies StageConfig;
