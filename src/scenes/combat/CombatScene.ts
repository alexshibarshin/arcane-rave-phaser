import Phaser from 'phaser';
import { emit, off, on } from '@events/EventBus';
import { CombatContentConfig } from '@config/CombatContentConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { StagePresentationConfig } from '@config/StagePresentationConfig';
import { SceneKeys } from '@config/GameConfig';
import { GameScene } from '@scenes/GameScene';
import { restartCombatScenes } from '@combat/CombatSceneLifecycle';
import {
  createCombatRuntime,
  setCombatTimeControlMode,
  type CombatLoadoutSlot,
  type CombatRuntime,
} from '@combat/CombatRuntime';
import { publishCombatStateTransition } from '@combat/CombatHudEvents';
import { setCombatState } from '@combat/CombatRuntime';
import type { CombatRuntimeEvent } from '@combat/CombatRuntimeEvents';
import { CombatStateSystem } from '@systems/CombatStateSystem';
import { CombatDebugInputSystem } from '@systems/CombatDebugInputSystem';
import { SynergyVisualSystem } from '@systems/SynergyVisualSystem';
import type { InputSystem } from '@systems/InputSystem';
import type { SimulationSystem } from '@systems/SimulationSystem';
import type { SlotModifierAssignment } from '@stage/StageSlotModifiers';
import { createCombatSceneViewGraph, type CombatSceneViewGraph } from './CombatSceneViewGraph';
import { resolveCombatSceneSlotPawnIds } from './resolveCombatSceneSlotPawnIds';
import {
  createCombatPresentationRuntime,
  type CombatPresentationRuntime,
} from './CombatPresentationRuntime';

interface CombatSceneInitData {
  waveIndex?: number;
  totalWaves?: number;
  stageManaged?: boolean;
  allowRestart?: boolean;
  chronoCurrent?: number;
  chronoMax?: number;
  slotPawns?: CombatLoadoutSlot[];
  slotPawnIds?: Array<string | null>;
  slotPawnTiers?: Array<number | null>;
  slotModifiers?: SlotModifierAssignment[];
}

export class CombatScene extends GameScene {
  private runtime?: CombatRuntime;
  private waveIndex = 0;
  private totalWaves = 1;
  private stageManaged = false;
  private allowRestart = true;
  private chronoCurrent?: number;
  private chronoMax?: number;
  private slotPawns?: CombatLoadoutSlot[];
  private slotPawnIds?: Array<string | null>;
  private slotPawnTiers?: Array<number | null>;
  private slotModifiers?: SlotModifierAssignment[];
  private synergySystem?: SynergyVisualSystem;
  private viewGraph?: CombatSceneViewGraph;
  private presentationRuntime?: CombatPresentationRuntime;

  private readonly handleRestartRequested = (): void => {
    if (!this.allowRestart) {
      return;
    }

    restartCombatScenes(this.scene, SceneKeys.HUD);
    emit('combat:restarted');
  };

  private readonly handlePauseRequested = (): void => {
    const runtime = this.runtime;

    if (!runtime || (runtime.state !== 'preview' && runtime.state !== 'running')) {
      return;
    }

    const previousState = runtime.state;

    if (!setCombatState(runtime, 'paused')) {
      return;
    }

    publishCombatStateTransition(previousState, 'paused', runtime);
  };

  private readonly handleResumeRequested = (): void => {
    const runtime = this.runtime;

    if (!runtime || runtime.state !== 'paused') {
      return;
    }

    if (!setCombatState(runtime, 'running')) {
      return;
    }

    publishCombatStateTransition('paused', 'running', runtime);
  };

  private readonly handleTimeControlRequested = (
    payload: { mode: 'idle' | 'rewind' | 'fast-forward' },
  ): void => {
    if (!this.runtime) {
      return;
    }

    setCombatTimeControlMode(this.runtime, payload.mode);
  };

  private readonly handleSlotActivated = (payload: { slotIndex: number }): void => {
    this.synergySystem?.onSlotActivated(payload.slotIndex);
    this.presentationRuntime?.handleEvent({
      event: 'combat:slot-activated',
      payload,
    });
  };

  private readonly handleEnemyHit = (
    payload: Extract<CombatRuntimeEvent, { event: 'combat:enemy-hit' }>['payload'],
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:enemy-hit',
      payload,
    });
  };

  private readonly handleGeneratorNotesEmitted = (
    payload: Extract<CombatRuntimeEvent, { event: 'combat:generator-notes-emitted' }>['payload'],
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:generator-notes-emitted',
      payload,
    });
  };

  private readonly handleFinisherConsumedNotes = (
    payload: Extract<CombatRuntimeEvent, { event: 'combat:finisher-consumed-notes' }>['payload'],
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:finisher-consumed-notes',
      payload,
    });
  };

  private readonly handleFinisherOutputNoteEmitted = (
    payload: Extract<CombatRuntimeEvent, { event: 'combat:finisher-output-note-emitted' }>['payload'],
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:finisher-output-note-emitted',
      payload,
    });
  };

  private readonly handleNotePacketColorBroke = (
    payload: Extract<CombatRuntimeEvent, { event: 'combat:note-packet-color-broke' }>['payload'],
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:note-packet-color-broke',
      payload,
    });
  };

  private readonly handleBaseDamaged = (
    payload: Extract<CombatRuntimeEvent, { event: 'combat:base-damaged' }>['payload'],
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:base-damaged',
      payload,
    });
  };

  private readonly handleCombatEnded = (
    payload: { outcome: 'victory' | 'defeat'; chronoCurrent: number; chronoMax: number },
  ): void => {
    this.presentationRuntime?.handleEvent({
      event: 'combat:ended',
      payload: { outcome: payload.outcome },
    });
  };

  constructor() {
    super(SceneKeys.COMBAT);
  }

  init(data: CombatSceneInitData = {}): void {
    this.waveIndex = data.waveIndex ?? 0;
    this.totalWaves = data.totalWaves ?? 1;
    this.stageManaged = data.stageManaged ?? false;
    this.allowRestart = data.allowRestart ?? true;
    this.chronoCurrent = data.chronoCurrent;
    this.chronoMax = data.chronoMax;
    this.slotPawns = data.slotPawns ? data.slotPawns.map((slot) => ({ ...slot })) : undefined;
    this.slotPawnIds = data.slotPawnIds ? [...data.slotPawnIds] : undefined;
    this.slotPawnTiers = data.slotPawnTiers ? [...data.slotPawnTiers] : undefined;
    this.slotModifiers = data.slotModifiers ? data.slotModifiers.map((assignment) => ({ ...assignment })) : undefined;
  }

  create(): void {
    super.create();
    this.playStageManagedIntro();
    emit('combat:scene-ready', {
      key: this.scene.key,
      state: this.runtime!.state,
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.synergySystem?.update(time, delta);

    if (!this.runtime || !this.presentationRuntime) {
      return;
    }

    this.presentationRuntime.sync(this.runtime, delta);
    this.synergySystem?.setRecordRotation(this.runtime.record.currentAngle);
  }

  protected createSceneContent(): void {
    this.runtime = createCombatRuntime(Math.random, {
      waveIndex: this.waveIndex,
      totalWaves: this.totalWaves,
      chronoCurrent: this.chronoCurrent,
      chronoMax: this.chronoMax,
      slotPawns: this.slotPawns,
      slotPawnIds: this.slotPawnIds,
      slotPawnTiers: this.slotPawnTiers,
      slotModifiers: this.slotModifiers,
    });
    this.slotPawnIds = resolveCombatSceneSlotPawnIds(
      this.slotPawnIds ?? this.slotPawns?.map((slot) => slot.pawnId ?? null),
      this.runtime,
    );

    this.viewGraph = createCombatSceneViewGraph({
      scene: this,
      waveIndex: this.waveIndex,
      slotPawns: this.runtime.slots.map((slot) => ({
        pawnId: slot.pawnId,
        tier: slot.pawnTier,
      })),
      slotPawnIds: this.slotPawnIds,
    });
    this.presentationRuntime = createCombatPresentationRuntime({
      scene: this,
      viewGraph: this.viewGraph,
    });
    this.createSynergySystem();

    on('combat:slot-activated', this.handleSlotActivated);
    on('combat:pause-requested', this.handlePauseRequested);
    on('combat:restart-requested', this.handleRestartRequested);
    on('combat:resume-requested', this.handleResumeRequested);
    on('combat:time-control-requested', this.handleTimeControlRequested);
    on('combat:enemy-hit', this.handleEnemyHit);
    on('combat:generator-notes-emitted', this.handleGeneratorNotesEmitted);
    on('combat:finisher-consumed-notes', this.handleFinisherConsumedNotes);
    on('combat:finisher-output-note-emitted', this.handleFinisherOutputNoteEmitted);
    on('combat:note-packet-color-broke', this.handleNotePacketColorBroke);
    on('combat:base-damaged', this.handleBaseDamaged);
    on('combat:ended', this.handleCombatEnded);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardownCombatScene, this);
  }

  protected createInputSystems(): InputSystem[] {
    return [new CombatDebugInputSystem(this, () => this.runtime, this.allowRestart)];
  }

  protected createSimulationSystems(): SimulationSystem[] {
    return [new CombatStateSystem(this, () => this.runtime)];
  }

  protected getOverlaySceneKey(): string | null {
    return SceneKeys.HUD;
  }

  protected getOverlaySceneData(): Record<string, unknown> | undefined {
    return {
      allowRestart: this.allowRestart,
    };
  }

  private createSynergySystem(): void {
    if (!this.viewGraph?.record.container || !this.slotPawnIds) {
      return;
    }

    this.synergySystem = new SynergyVisualSystem({
      scene: this,
      pawnDefinitions: CombatContentConfig.PAWN_DEFINITIONS,
      slotCount: CombatContentConfig.SLOT_COUNT,
      recordCenterX: this.viewGraph.record.container.x,
      recordCenterY: this.viewGraph.record.container.y,
      recordRadius: CombatLayoutConfig.RECORD_RADIUS,
      depth: CombatLayoutConfig.DEPTH.RECORD_DETAILS,
    });
    this.synergySystem.create();
    this.synergySystem.updateBuildState(this.slotPawnIds);
  }

  private playStageManagedIntro(): void {
    if (!this.stageManaged) {
      return;
    }

    this.cameras.main.setZoom(StagePresentationConfig.COMBAT_CAMERA_START_ZOOM);
    this.cameras.main.setScroll(0, StagePresentationConfig.COMBAT_CAMERA_START_SCROLL_Y);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      scrollY: 0,
      duration: StagePresentationConfig.COMBAT_CAMERA_TWEEN_MS,
      ease: 'Sine.easeInOut',
    });
  }

  private teardownCombatScene(): void {
    off('combat:slot-activated', this.handleSlotActivated);
    off('combat:pause-requested', this.handlePauseRequested);
    off('combat:restart-requested', this.handleRestartRequested);
    off('combat:resume-requested', this.handleResumeRequested);
    off('combat:time-control-requested', this.handleTimeControlRequested);
    off('combat:enemy-hit', this.handleEnemyHit);
    off('combat:generator-notes-emitted', this.handleGeneratorNotesEmitted);
    off('combat:finisher-consumed-notes', this.handleFinisherConsumedNotes);
    off('combat:finisher-output-note-emitted', this.handleFinisherOutputNoteEmitted);
    off('combat:note-packet-color-broke', this.handleNotePacketColorBroke);
    off('combat:base-damaged', this.handleBaseDamaged);
    off('combat:ended', this.handleCombatEnded);
    this.synergySystem?.destroy();
    this.synergySystem = undefined;
    this.presentationRuntime?.destroy();
    this.presentationRuntime = undefined;
    this.viewGraph?.destroy();
    this.viewGraph = undefined;
    this.runtime = undefined;
    this.waveIndex = 0;
    this.totalWaves = 1;
    this.stageManaged = false;
    this.allowRestart = true;
    this.slotPawnIds = undefined;
    this.slotPawns = undefined;
    this.slotPawnTiers = undefined;
  }
}
