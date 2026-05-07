import { SceneKeys } from '@config/GameConfig';
import { StageFlowConfig } from '@config/StageFlowConfig';
import { getCombatWaveDefinition } from '@config/CombatWaveConfig';
import type { EventMap } from '@events/EventBus';
import {
  canStageStartWave,
  getStageCombatLoadout,
  getStageCombatLoadoutSlots,
  getStageCombatLoadoutTiers,
  getStageSlotModifiers,
  requestStageWaveStart,
  resolveStageCombatOutcome,
  type StageCombatOutcome,
  type StageRuntime,
} from '@stage/StageRuntime';
import type { CombatLoadoutSlot } from '@combat/CombatRuntime';
import type { SlotModifierAssignment } from './StageSlotModifiers';
import { createStageWavePreview } from '@stage/StageWavePreview';

export interface StageFlowCoordinationState {
  isTransitioning: boolean;
  pendingCombatLaunch: boolean;
  pendingBuildIntro: boolean;
  pendingCombatResolution: {
    outcome: StageCombatOutcome;
    chronoRemaining: number;
  } | null;
}

export type StageFlowIntent =
  | { type: 'stage:initialized' }
  | { type: 'stage:start-wave-requested' }
  | { type: 'stage:combat-ended'; outcome: StageCombatOutcome; chronoRemaining: number }
  | { type: 'stage:combat-return-finished' };

export type StageFlowCommand =
  | {
      type: 'stage:publish-snapshot';
      payload: EventMap['stage:snapshot-updated'];
    }
  | {
      type: 'stage:publish-phase-changed';
      payload: EventMap['stage:phase-changed'];
    }
  | {
      type: 'stage:play-build-phase-intro';
      payload: { fromCombat: boolean };
    }
  | {
      type: 'stage:play-combat-phase-return';
      payload: { outcome: StageCombatOutcome };
    }
  | {
      type: 'stage:play-combat-phase-outro';
    }
  | {
      type: 'stage:launch-combat-phase';
      payload: {
        waveIndex: number;
        totalWaves: number;
        stageManaged: true;
        allowRestart: false;
        chronoCurrent: number;
        chronoMax: number;
        slotPawns: CombatLoadoutSlot[];
        slotPawnIds: Array<string | null>;
        slotPawnTiers: Array<number | null>;
        slotModifiers: SlotModifierAssignment[];
      };
    }
  | {
      type: 'stage:stop-combat-phase-scenes';
      payload: {
        sceneKeys: readonly [typeof SceneKeys.HUD, typeof SceneKeys.COMBAT];
      };
    }
  | {
      type: 'stage:refresh-build-phase';
    };

export function createStageFlowCoordinationState(): StageFlowCoordinationState {
  return {
    isTransitioning: false,
    pendingCombatLaunch: false,
    pendingBuildIntro: false,
    pendingCombatResolution: null,
  };
}

export function dispatchStageFlowIntent(
  runtime: StageRuntime,
  coordination: StageFlowCoordinationState,
  intent: StageFlowIntent,
): StageFlowCommand[] {
  switch (intent.type) {
    case 'stage:initialized':
      coordination.pendingBuildIntro = true;
      coordination.pendingCombatLaunch = false;
      coordination.isTransitioning = false;
      coordination.pendingCombatResolution = null;
      return [
        createSnapshotCommand(runtime),
        {
          type: 'stage:play-build-phase-intro',
          payload: { fromCombat: false },
        },
      ];

    case 'stage:start-wave-requested':
      if (coordination.isTransitioning || !requestStageWaveStart(runtime)) {
        return [];
      }

      coordination.isTransitioning = true;
      coordination.pendingCombatLaunch = true;
      coordination.pendingBuildIntro = false;
      coordination.pendingCombatResolution = null;

      return [
        {
          type: 'stage:publish-phase-changed',
          payload: { phase: runtime.phase },
        },
        createSnapshotCommand(runtime),
        {
          type: 'stage:play-combat-phase-outro',
        },
        createLaunchCombatCommand(runtime),
      ];

    case 'stage:combat-ended': {
      if (runtime.phase !== 'combat') {
        return [];
      }

      if (intent.outcome === 'victory') {
        coordination.isTransitioning = true;
        coordination.pendingCombatLaunch = false;
        coordination.pendingBuildIntro = false;
        coordination.pendingCombatResolution = {
          outcome: intent.outcome,
          chronoRemaining: intent.chronoRemaining,
        };

        return [{
          type: 'stage:play-combat-phase-return',
          payload: { outcome: intent.outcome },
        }];
      }

      return resolveCombatReturn(runtime, coordination, {
        outcome: intent.outcome,
        chronoRemaining: intent.chronoRemaining,
      });
    }

    case 'stage:combat-return-finished': {
      if (runtime.phase !== 'combat' || coordination.pendingCombatResolution === null) {
        return [];
      }

      const resolution = coordination.pendingCombatResolution;
      coordination.pendingCombatResolution = null;

      return resolveCombatReturn(runtime, coordination, resolution);
    }
  }
}

function resolveCombatReturn(
  runtime: StageRuntime,
  coordination: StageFlowCoordinationState,
  resolution: {
    outcome: StageCombatOutcome;
    chronoRemaining: number;
  },
): StageFlowCommand[] {
  const previousPhase = runtime.phase;
  resolveStageCombatOutcome(runtime, {
    outcome: resolution.outcome,
    rewardCoins: StageFlowConfig.WAVE_CLEAR_REWARD_COINS,
    chronoRemaining: resolution.chronoRemaining,
  });

  coordination.isTransitioning = false;
  coordination.pendingCombatLaunch = false;
  coordination.pendingBuildIntro = true;
  coordination.pendingCombatResolution = null;

  const commands: StageFlowCommand[] = [
    {
      type: 'stage:stop-combat-phase-scenes',
      payload: {
        sceneKeys: [SceneKeys.HUD, SceneKeys.COMBAT],
      },
    },
  ];

  if (runtime.phase !== previousPhase) {
    commands.push({
      type: 'stage:publish-phase-changed',
      payload: { phase: runtime.phase },
    });
  }

  commands.push(
    {
      type: 'stage:refresh-build-phase',
    },
    createSnapshotCommand(runtime),
    {
      type: 'stage:play-build-phase-intro',
      payload: { fromCombat: true },
    },
  );

  return commands;
}

function createSnapshotCommand(runtime: StageRuntime): Extract<
  StageFlowCommand,
  { type: 'stage:publish-snapshot' }
> {
  return {
    type: 'stage:publish-snapshot',
    payload: createStageSnapshotPayload(runtime),
  };
}

function createLaunchCombatCommand(runtime: StageRuntime): Extract<
  StageFlowCommand,
  { type: 'stage:launch-combat-phase' }
> {
  return {
    type: 'stage:launch-combat-phase',
    payload: {
      waveIndex: runtime.currentWaveIndex,
      totalWaves: runtime.totalWaves,
      stageManaged: true,
      allowRestart: false,
      chronoCurrent: runtime.chrono.current,
      chronoMax: runtime.chrono.max,
      slotPawns: getStageCombatLoadoutSlots(runtime),
      slotPawnIds: getStageCombatLoadout(runtime),
      slotPawnTiers: getStageCombatLoadoutTiers(runtime),
      slotModifiers: getStageSlotModifiers(runtime),
    },
  };
}

function createStageSnapshotPayload(
  runtime: StageRuntime,
): EventMap['stage:snapshot-updated'] {
  const canStartWave = canStageStartWave(runtime);
  const currentWave = Math.min(runtime.currentWaveIndex + 1, Math.max(1, runtime.totalWaves));
  const wave = canStartWave ? getCombatWaveDefinition(runtime.currentWaveIndex) : null;
  const preview = wave
    ? createStageWavePreview(wave, currentWave, runtime.totalWaves)
    : {
        bodyLines: [getTerminalBody(runtime)],
        archetypeSummary: '',
      };

  return {
    phase: runtime.phase,
    coins: runtime.coins,
    currentWave,
    totalWaves: runtime.totalWaves,
    canStartWave,
    previewTitle: preview.bodyLines[0] ?? '',
    previewBody: preview.bodyLines.slice(1).join('\n'),
  };
}

function getTerminalBody(runtime: StageRuntime): string {
  if (runtime.totalWaves === 0) {
    return 'No authored waves are available for this stage.';
  }

  if (runtime.phase === 'stage_complete') {
    return `Cleared ${runtime.totalWaves}/${runtime.totalWaves} waves.\nFinal coins ${runtime.coins}`;
  }

  if (runtime.phase === 'stage_failed') {
    return `Failed on wave ${runtime.currentWaveIndex + 1}/${runtime.totalWaves}.\nFinal coins ${runtime.coins}`;
  }

  return '';
}
