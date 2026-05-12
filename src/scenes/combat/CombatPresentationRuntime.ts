import Phaser from 'phaser';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatRuntimeEvent } from '@combat/CombatRuntimeEvents';
import {
  CombatVfxSystem,
  type CombatVfxSnapshot,
} from '@combat/CombatVfxSystem';
import { getCombatPresentationDelta } from '@combat/CombatSceneLifecycle';
import type { CombatSceneViewGraph } from './CombatSceneViewGraph';
import { CombatSlotVfxRenderer } from './presentation/CombatSlotVfxRenderer';
import { CombatEnemyPresenter } from './presentation/CombatEnemyPresenter';
import { CombatBasePresenter } from './presentation/CombatBasePresenter';
import { CombatBaseHpBarPresenter } from './presentation/CombatBaseHpBarPresenter';
import { CombatNotePacketPresenter } from './presentation/CombatNotePacketPresenter';
import { CombatBeamRenderer } from './presentation/CombatBeamRenderer';
import { CombatProjectileRenderer } from './presentation/CombatProjectileRenderer';
import { CombatZoneRenderer } from './presentation/CombatZoneRenderer';
import { CombatPendingExplosionRenderer } from './presentation/CombatPendingExplosionRenderer';
import { CombatNoteFlightRenderer } from './presentation/CombatNoteFlightRenderer';
import { CombatEnemyHitFlashRenderer } from './presentation/CombatEnemyHitFlashRenderer';
import { CombatPacketBreakRenderer } from './presentation/CombatPacketBreakRenderer';
import { CombatBaseHitFlashRenderer } from './presentation/CombatBaseHitFlashRenderer';
import { CombatDamageNumberRenderer } from './presentation/CombatDamageNumberRenderer';
import { CombatResultEmphasisRenderer } from './presentation/CombatResultEmphasisRenderer';

export type CombatPresentationEvent =
  | CombatRuntimeEvent
  | { event: 'combat:ended'; payload: { outcome: 'victory' | 'defeat' } };

export interface CombatPresentationRuntime {
  sync(runtime: CombatRuntime, deltaMs: number): void;
  handleEvent(event: CombatPresentationEvent): void;
  destroy(): void;
}

interface CreateCombatPresentationRuntimeOptions {
  scene: Phaser.Scene;
  viewGraph: CombatSceneViewGraph;
}

export function createCombatPresentationRuntime(
  options: CreateCombatPresentationRuntimeOptions,
): CombatPresentationRuntime {
  const combatVfx = new CombatVfxSystem({
    getSlotAnchor: (slotIndex) => options.viewGraph.anchors.getSlotAnchor(slotIndex),
    getEnemyAnchor: (enemyId) => options.viewGraph.anchors.getEnemyAnchor(enemyId),
    getNotePacketAnchor: () => options.viewGraph.anchors.getNotePacketAnchor(),
    getBaseAnchor: () => options.viewGraph.anchors.getBaseAnchor(),
  });

  const slotVfx = new CombatSlotVfxRenderer();
  const enemyPresenter = new CombatEnemyPresenter();
  const basePresenter = new CombatBasePresenter();
  const baseHpBarPresenter = new CombatBaseHpBarPresenter();
  const notePacketPresenter = new CombatNotePacketPresenter();
  const beamRenderer = new CombatBeamRenderer();
  const projectileRenderer = new CombatProjectileRenderer();
  const zoneRenderer = new CombatZoneRenderer();
  const explosionRenderer = new CombatPendingExplosionRenderer();
  const noteFlightRenderer = new CombatNoteFlightRenderer();
  const enemyHitRenderer = new CombatEnemyHitFlashRenderer();
  const packetBreakRenderer = new CombatPacketBreakRenderer();
  const baseHitRenderer = new CombatBaseHitFlashRenderer();
  const damageNumberRenderer = new CombatDamageNumberRenderer();
  const resultEmphasisRenderer = new CombatResultEmphasisRenderer();

  let notePacketElapsedMs = 0;
  let lastCombatElapsedMs = 0;
  let enemyHitEventsThisFrame = 0;
  let noteEventsThisFrame = 0;

  return {
    sync(runtime, deltaMs) {
      const presentationDelta = getCombatPresentationDelta(runtime.state, deltaMs);
      lastCombatElapsedMs = runtime.combatElapsedMs;
      enemyHitEventsThisFrame = 0;
      noteEventsThisFrame = 0;

      notePacketElapsedMs += presentationDelta;
      combatVfx.update(presentationDelta);

      const vfxSnapshot = combatVfx.getSnapshot();
      const recordRotation = Phaser.Math.DegToRad(runtime.record.currentAngle);

      options.viewGraph.record.container.setRotation(recordRotation);

      // Scene-graph presenters
      slotVfx.sync(options.viewGraph, recordRotation, vfxSnapshot);
      enemyPresenter.sync(options.viewGraph, runtime, presentationDelta);
      basePresenter.sync(options.viewGraph, runtime);
      baseHpBarPresenter.sync(options.viewGraph, runtime);
      notePacketPresenter.sync(
        options.scene,
        options.viewGraph,
        runtime,
        notePacketElapsedMs,
        vfxSnapshot,
      );

      // Entity renderers
      projectileRenderer.sync(options.scene, options.viewGraph, runtime);
      beamRenderer.sync(options.scene, options.viewGraph, runtime);
      zoneRenderer.sync(options.scene, options.viewGraph, runtime);
      explosionRenderer.sync(options.scene, options.viewGraph, runtime);

      // VfxSnapshot-driven renderers
      noteFlightRenderer.sync(options.scene, options.viewGraph, vfxSnapshot);
      enemyHitRenderer.sync(options.scene, options.viewGraph, vfxSnapshot);
      packetBreakRenderer.sync(options.scene, options.viewGraph, vfxSnapshot);
      baseHitRenderer.sync(options.scene, options.viewGraph, vfxSnapshot);

      // Damage numbers + result emphasis
      damageNumberRenderer.sync(runtime);
      resultEmphasisRenderer.sync(options.scene, options.viewGraph, vfxSnapshot);

      // Dead enemy cleanup
      enemyPresenter.syncDeadRemoval(options.viewGraph, runtime);
    },

    handleEvent(event) {
      const isEnemyHitEvent = event.event === 'combat:enemy-hit';
      const isNoteEvent =
        event.event === 'combat:generator-notes-emitted'
        || event.event === 'combat:finisher-consumed-notes'
        || event.event === 'combat:finisher-output-note-emitted';
      const allowEnemyHitPresentation =
        !isEnemyHitEvent
        || enemyHitEventsThisFrame < CombatVfxConfig.FRAME_BUDGET.MAX_ENEMY_HIT_EVENTS;
      const allowNotePresentation =
        !isNoteEvent
        || noteEventsThisFrame < CombatVfxConfig.FRAME_BUDGET.MAX_NOTE_EVENTS;

      // Route to VFX system (produces snapshot consumed in next sync)
      if (allowEnemyHitPresentation && allowNotePresentation) {
        switch (event.event) {
          case 'combat:slot-activated':
          case 'combat:enemy-hit':
          case 'combat:generator-notes-emitted':
          case 'combat:finisher-consumed-notes':
          case 'combat:finisher-output-note-emitted':
          case 'combat:note-packet-color-broke':
          case 'combat:base-damaged':
          case 'combat:ended':
            combatVfx.handleEvent(event);
            break;
          default:
            break;
        }
      }

      // Damage numbers spawn from certain events
      if (allowEnemyHitPresentation || !isEnemyHitEvent) {
        damageNumberRenderer.handleEvent(options.viewGraph, event, lastCombatElapsedMs);
      }

      if (isEnemyHitEvent) {
        enemyHitEventsThisFrame += 1;
      }

      if (isNoteEvent) {
        noteEventsThisFrame += 1;
      }
    },

    destroy() {
      slotVfx.destroy();
      enemyPresenter.destroy();
      basePresenter.destroy();
      baseHpBarPresenter.destroy();
      notePacketPresenter.destroyGlyphs(options.viewGraph);
      notePacketPresenter.destroy();
      beamRenderer.destroy();
      projectileRenderer.destroy();
      zoneRenderer.destroy();
      explosionRenderer.destroy();
      noteFlightRenderer.destroy();
      enemyHitRenderer.destroy();
      packetBreakRenderer.destroy();
      baseHitRenderer.destroy();
      damageNumberRenderer.destroy();
      resultEmphasisRenderer.destroy();
    },
  };
}

