import { STAGE_CONFIGS, type StageConfig } from '@config/StageConfig';
import { getEnemyDefinitionById } from '@config/CombatContentConfig';

export function getStageConfig(stageId: string): StageConfig | undefined {
  return STAGE_CONFIGS.find((s) => s.id === stageId);
}

export function getAllStageConfigs(): StageConfig[] {
  return [...STAGE_CONFIGS];
}

/**
 * Validate all StageConfig invariants at import time.
 * Throws on the first violation — no partial validation.
 */
function validateStageConfigs(configs: readonly StageConfig[]): void {
  for (const config of configs) {
    // hpMultipliers length === totalWaves
    if (config.hpMultipliers) {
      if (config.hpMultipliers.length !== config.totalWaves) {
        throw new Error(
          `Stage "${config.id}": hpMultipliers length (${config.hpMultipliers.length}) != totalWaves (${config.totalWaves})`,
        );
      }
      // Monotonically non-decreasing
      for (let i = 1; i < config.hpMultipliers.length; i++) {
        if (config.hpMultipliers[i]! < config.hpMultipliers[i - 1]!) {
          throw new Error(
            `Stage "${config.id}": hpMultipliers not monotonically non-decreasing at index ${i}`,
          );
        }
      }
    }

    // totalWaves === waves.length
    if (config.waves) {
      if (config.waves.length !== config.totalWaves) {
        throw new Error(
          `Stage "${config.id}": waves.length (${config.waves.length}) != totalWaves (${config.totalWaves})`,
        );
      }

      // Elite at wave 5 (0-based index 4)
      if (config.waves.length >= 5) {
        const eliteWave = config.waves[4]!;
        if (eliteWave.kind !== 'elite') {
          throw new Error(
            `Stage "${config.id}": wave 5 should be elite, got "${eliteWave.kind}"`,
          );
        }
        if (config.eliteEnemyId && eliteWave.specialEnemyId !== config.eliteEnemyId) {
          throw new Error(
            `Stage "${config.id}": wave 5 specialEnemyId "${eliteWave.specialEnemyId}" != stage eliteEnemyId "${config.eliteEnemyId}"`,
          );
        }
      }

      // Boss at wave 10 (0-based index 9)
      if (config.waves.length >= 10) {
        const bossWave = config.waves[9]!;
        if (bossWave.kind !== 'boss') {
          throw new Error(
            `Stage "${config.id}": wave 10 should be boss, got "${bossWave.kind}"`,
          );
        }
        if (config.bossEnemyId && bossWave.specialEnemyId !== config.bossEnemyId) {
          throw new Error(
            `Stage "${config.id}": wave 10 specialEnemyId "${bossWave.specialEnemyId}" != stage bossEnemyId "${config.bossEnemyId}"`,
          );
        }
      }
    }

    // slotModifierCountWeights values are non-negative
    for (const [key, value] of Object.entries(config.slotModifierCountWeights)) {
      if (value < 0) {
        throw new Error(
          `Stage "${config.id}": slotModifierCountWeights[${key}] is negative (${value})`,
        );
      }
    }

    // stageTags count between 2 and 4
    if (config.stageTags) {
      if (config.stageTags.length < 2 || config.stageTags.length > 4) {
        throw new Error(
          `Stage "${config.id}": stageTags count (${config.stageTags.length}) out of range [2,4]`,
        );
      }
    }

    // specialEnemyId references resolve to existing enemy definitions
    if (config.eliteEnemyId) {
      const eliteDef = getEnemyDefinitionById(config.eliteEnemyId);
      if (!eliteDef) {
        throw new Error(
          `Stage "${config.id}": eliteEnemyId "${config.eliteEnemyId}" not found in CombatContentConfig`,
        );
      }
    }
    if (config.bossEnemyId) {
      const bossDef = getEnemyDefinitionById(config.bossEnemyId);
      if (!bossDef) {
        throw new Error(
          `Stage "${config.id}": bossEnemyId "${config.bossEnemyId}" not found in CombatContentConfig`,
        );
      }
    }
  }
}

// Run validation at module load time
validateStageConfigs(STAGE_CONFIGS);
