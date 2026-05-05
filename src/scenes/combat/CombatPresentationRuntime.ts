import Phaser from 'phaser';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import {
  COMBAT_NOTE_GLYPH_TEXTURE_KEY,
} from '@combat/CombatNoteGlyph';
import { createCombatNotePacketViewModel } from '@combat/CombatNotePacketView';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatRuntimeEvent } from '@combat/CombatRuntimeEvents';
import { getCombatBaseHpBarFillMetrics } from '@combat/CombatBaseHpBar';
import { CombatDamageNumber } from '@combat/CombatDamageNumber';
import {
  COMBAT_VFX_BEAM_TEXTURE_KEY,
  COMBAT_VFX_GLOW_TEXTURE_KEY,
  COMBAT_VFX_RING_TEXTURE_KEY,
} from '@combat/CombatVfxTextures';
import {
  CombatVfxSystem,
  type CombatVfxAnchor,
  type CombatVfxSnapshot,
} from '@combat/CombatVfxSystem';
import { getCombatPresentationDelta } from '@combat/CombatSceneLifecycle';
import type { CombatSceneViewGraph } from './CombatSceneViewGraph';

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
  let notePacketElapsedMs = 0;
  let lastCombatElapsedMs = 0;
  let resultEmphasisWash: Phaser.GameObjects.Rectangle | undefined;
  const beamViews = new Map<string, Phaser.GameObjects.Image>();
  const beamPool: Phaser.GameObjects.Image[] = [];
  const noteFlightViews = new Map<string, Phaser.GameObjects.Image>();
  const noteFlightPool: Phaser.GameObjects.Image[] = [];
  const enemyHitViews = new Map<string, Phaser.GameObjects.Image>();
  const enemyHitPool: Phaser.GameObjects.Image[] = [];
  const packetBreakViews = new Map<string, Phaser.GameObjects.Image>();
  const packetBreakPool: Phaser.GameObjects.Image[] = [];
  const baseHitViews = new Map<string, Phaser.GameObjects.Image>();
  const baseHitPool: Phaser.GameObjects.Image[] = [];
  const damageNumbers: CombatDamageNumber[] = [];

  return {
    sync(runtime, deltaMs) {
      const presentationDelta = getCombatPresentationDelta(runtime.state, deltaMs);
      lastCombatElapsedMs = runtime.combatElapsedMs;

      notePacketElapsedMs += presentationDelta;
      combatVfx.update(presentationDelta);

      const vfxSnapshot = combatVfx.getSnapshot();
      const recordRotation = Phaser.Math.DegToRad(runtime.record.currentAngle);

      options.viewGraph.record.container.setRotation(recordRotation);
      syncSlotVfxPresentation(options.viewGraph, recordRotation, vfxSnapshot);
      syncEnemyPresentation(options.viewGraph, runtime, presentationDelta);
      syncBasePresentation(options.viewGraph, runtime);
      syncBaseHpBarPresentation(options.viewGraph, runtime);
      syncNotePacketPresentation(options.scene, options.viewGraph, runtime, notePacketElapsedMs, vfxSnapshot);
      syncBeamPresentation(options.scene, options.viewGraph, beamViews, beamPool, vfxSnapshot);
      syncNoteFlightPresentation(options.scene, options.viewGraph, noteFlightViews, noteFlightPool, vfxSnapshot);
      syncEnemyHitPresentation(options.scene, options.viewGraph, enemyHitViews, enemyHitPool, vfxSnapshot);
      syncPacketBreakPresentation(options.scene, options.viewGraph, packetBreakViews, packetBreakPool, vfxSnapshot);
      syncBaseHitPresentation(options.scene, options.viewGraph, baseHitViews, baseHitPool, vfxSnapshot);
      syncDamageNumberPresentation(runtime, damageNumbers);
      resultEmphasisWash = syncResultEmphasisPresentation(
        options.scene,
        resultEmphasisWash,
        options.viewGraph,
        vfxSnapshot,
      );

      for (const enemy of runtime.enemies) {
        if (enemy.state === 'dead') {
          const enemyView = options.viewGraph.enemies.getEnemyView(enemy.runtimeId);

          if (enemyView && enemyView.animation.deathProgress >= 1) {
            options.viewGraph.enemies.removeEnemyView(enemy.runtimeId);
          }
        }
      }
    },
    handleEvent(event) {
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

      if (event.event === 'combat:enemy-hit') {
        const enemyView = options.viewGraph.enemies.getEnemyView(event.payload.enemyId);
        const y = enemyView?.container.y ?? 0;
        const x = enemyView?.container.x ?? 0;
        const config = CombatVisualConfig.DAMAGE_NUMBER;

        options.viewGraph.enemies.markEnemyHit(
          event.payload.enemyId,
          lastCombatElapsedMs,
          event.payload.currentHp,
          event.payload.maxHp,
        );

        damageNumbers.push(new CombatDamageNumber(
          options.scene,
          x,
          y + CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y + config.ENEMY_OFFSET_Y,
          event.payload.damage,
          lastCombatElapsedMs,
          {
            fontSizePx: config.FONT_SIZE_PX,
            floatDurationMs: config.FLOAT_DURATION_MS,
            floatDistanceY: config.FLOAT_DISTANCE_Y,
          },
        ));
        options.viewGraph.effects.damageNumberLayer.add(damageNumbers[damageNumbers.length - 1]!.text);
      }

      if (event.event === 'combat:base-damaged') {
        const config = CombatVisualConfig.DAMAGE_NUMBER;
        const damage = Math.max(0, event.payload.max - event.payload.current);
        const hpBar = options.viewGraph.base.hpBar;

        damageNumbers.push(new CombatDamageNumber(
          options.scene,
          hpBar.x + config.BASE_OFFSET_X,
          hpBar.y + config.BASE_OFFSET_Y,
          damage,
          lastCombatElapsedMs,
          {
            fontSizePx: config.FONT_SIZE_PX,
            floatDurationMs: config.FLOAT_DURATION_MS,
            floatDistanceY: config.FLOAT_DISTANCE_Y,
          },
        ));
        options.viewGraph.effects.damageNumberLayer.add(damageNumbers[damageNumbers.length - 1]!.text);
      }
    },
    destroy() {
      clearPooledImageMaps(beamViews, beamPool);
      clearPooledImageMaps(noteFlightViews, noteFlightPool);
      clearPooledImageMaps(enemyHitViews, enemyHitPool);
      clearPooledImageMaps(packetBreakViews, packetBreakPool);
      clearPooledImageMaps(baseHitViews, baseHitPool);
      damageNumbers.forEach((damageNumber) => damageNumber.destroy());
      damageNumbers.length = 0;
      resultEmphasisWash?.destroy();
      resultEmphasisWash = undefined;
      options.viewGraph.notePacket.view.glyphs.forEach((glyph) => glyph.destroy());
      options.viewGraph.notePacket.view.glyphs.clear();
    },
  };
}

function syncSlotVfxPresentation(
  viewGraph: CombatSceneViewGraph,
  recordRotation: number,
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const slotActivations = new Map(
    vfxSnapshot.slotActivations.map((activation) => [activation.slotIndex, activation]),
  );

  for (const [slotIndex, slotView] of viewGraph.record.slotViews.entries()) {
    slotView.uprightContainer.setRotation(-recordRotation);
    const activation = slotActivations.get(slotIndex);

    if (!activation) {
      slotView.sectorPulse.setAlpha(0);
      slotView.zonePulse.setAlpha(0);
      slotView.pawnGlow.setAlpha(0);
      slotView.uprightContainer.setScale(1);
      slotView.rotatingContent.setScale(1);
      continue;
    }

    const alpha =
      CombatBalanceConfig.SLOT_ACTIVATION_MAX_ALPHA * (0.35 + activation.sectorAlpha * 0.65);

    slotView.sectorPulse.setAlpha(alpha);
    slotView.zonePulse.setAlpha(alpha * 0.85 * activation.ruleZoneAlpha);
    slotView.pawnGlow.setAlpha(activation.pawnGlowAlpha * 0.85);
    slotView.uprightContainer.setScale(activation.scale);
    slotView.rotatingContent.setScale(
      1 + activation.sectorAlpha * CombatVfxConfig.SLOT.ROTATING_SCALE_BOOST,
    );
  }
}

function syncEnemyPresentation(
  viewGraph: CombatSceneViewGraph,
  runtime: CombatRuntime,
  deltaMs: number,
): void {
  const elapsedMs = runtime.combatElapsedMs;

  for (const enemy of runtime.enemies) {
    const existingView = viewGraph.enemies.getEnemyView(enemy.runtimeId);

    // Once a dead enemy finishes its death presentation and its view is removed,
    // do not materialize a fresh shell from the still-present runtime entry.
    if (enemy.state === 'dead' && existingView === null) {
      continue;
    }

    viewGraph.enemies.syncEnemyView(enemy, {
      deltaMs,
      elapsedMs,
      needlePoint: {
        x: viewGraph.needle.tipX,
        y: viewGraph.needle.tipY,
      },
    });
  }
}

function syncBasePresentation(
  viewGraph: CombatSceneViewGraph,
  runtime: CombatRuntime,
): void {
  const base = viewGraph.base;
  const sprite = base.root;
  const elapsedMs = runtime.combatElapsedMs;
  const activeMode = runtime.time.activeMode;
  const intensity = runtime.time.activeIntensity;

  const idleBobY = Math.sin(elapsedMs * 0.0021) * 4;
  const idleScale = 1 + Math.sin(elapsedMs * 0.0016 + 0.35) * 0.012;
  const idleAngle = Math.sin(elapsedMs * 0.0011) * 1.2;

  let activeShiftX = 0;
  let activeBobY = 0;
  let activeScaleX = 1;
  let activeScaleY = 1;
  let activeAngle = 0;

  if (activeMode === 'fast-forward') {
    const pulse = elapsedMs * 0.0105;

    activeShiftX = Math.sin(pulse * 0.75) * 2.5 * intensity;
    activeBobY = Math.sin(pulse) * 10 * intensity;
    activeScaleX = 1 + Math.sin(pulse + 0.5) * 0.03 * intensity;
    activeScaleY = 1 + Math.cos(pulse * 1.35) * 0.038 * intensity;
    activeAngle = Math.sin(pulse * 0.9) * 3.2 * intensity;
    sprite.setTint(0xffe6b3);
  } else if (activeMode === 'rewind') {
    const pulse = elapsedMs * 0.0082;

    activeShiftX = Math.sin(pulse * 1.35) * 5.5 * intensity;
    activeBobY = Math.cos(pulse * 0.9) * 5 * intensity;
    activeScaleX = 1 + Math.sin(pulse * 1.2) * 0.018 * intensity;
    activeScaleY = 1 + Math.cos(pulse * 1.8) * 0.024 * intensity;
    activeAngle = -2.2 * intensity + Math.sin(pulse) * 2.4 * intensity;
    sprite.setTint(0xbfe7ff);
  } else {
    sprite.clearTint();
  }

  sprite.setPosition(
    base.restX + activeShiftX,
    base.restY + idleBobY + activeBobY,
  );
  sprite.setScale(idleScale * activeScaleX, idleScale * activeScaleY);
  sprite.setAngle(idleAngle + activeAngle);
}

function syncBaseHpBarPresentation(
  viewGraph: CombatSceneViewGraph,
  runtime: CombatRuntime,
): void {
  const hpBar = viewGraph.base.hpBar;
  const innerPadding = 3;
  const innerWidth = hpBar.width - innerPadding * 2;
  const innerHeight = hpBar.height - innerPadding * 2;
  const metrics = getCombatBaseHpBarFillMetrics(runtime.baseHp, CombatBalanceConfig.BASE_HP, innerWidth);

  hpBar.fill.clear();
  hpBar.fill.fillStyle(0x58f29b, 1);
  hpBar.fill.fillRoundedRect(
    hpBar.x + innerPadding,
    hpBar.y + innerPadding,
    metrics.width,
    innerHeight,
    8,
  );
  hpBar.label.setText(`BASE HP ${runtime.baseHp}/${CombatBalanceConfig.BASE_HP}`);
}

function syncDamageNumberPresentation(
  runtime: CombatRuntime,
  damageNumbers: CombatDamageNumber[],
): void {
  const elapsed = runtime.combatElapsedMs;

  for (let index = damageNumbers.length - 1; index >= 0; index -= 1) {
    const damageNumber = damageNumbers[index]!;
    const ageMs = elapsed - damageNumber.startTime;

    damageNumber.update(ageMs);

    if (!damageNumber.isComplete(ageMs)) {
      continue;
    }

    damageNumber.destroy();
    damageNumbers.splice(index, 1);
  }
}

function syncNotePacketPresentation(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  runtime: CombatRuntime,
  notePacketElapsedMs: number,
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const notePacketView = viewGraph.notePacket.view;
  const instances = createCombatNotePacketViewModel(
    runtime.notePacket,
    {
      x: notePacketView.anchorX,
      y: notePacketView.anchorY,
    },
    notePacketElapsedMs,
  );
  const activeIds = new Set(instances.map((instance) => instance.id));
  const packetIntakeActive = vfxSnapshot.noteFlights.some(
    (flight) => flight.direction === 'packet-to-slot',
  );

  for (const [id, glyph] of notePacketView.glyphs.entries()) {
    if (activeIds.has(id)) {
      continue;
    }

    glyph.destroy();
    notePacketView.glyphs.delete(id);
  }

  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index]!;
    let glyph = notePacketView.glyphs.get(instance.id);

    if (!glyph) {
      glyph = scene.add.image(instance.x, instance.y, COMBAT_NOTE_GLYPH_TEXTURE_KEY);
      glyph.setOrigin(0.5, 0.5);
      notePacketView.glyphs.set(instance.id, glyph);
    }

    glyph.setDepth(notePacketView.depth + index * 0.01);
    glyph.setPosition(instance.x, instance.y);
    glyph.setTint(instance.tint);
    glyph.setAlpha(packetIntakeActive ? 0.15 : 1);
    glyph.setScale(instance.scale);
  }
}

function syncBeamPresentation(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  beamViews: Map<string, Phaser.GameObjects.Image>,
  beamPool: Phaser.GameObjects.Image[],
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const activeIds = new Set(vfxSnapshot.beamHits.map((beam) => beam.id));

  reclaimImageViews(beamViews, beamPool, activeIds);

  for (const beam of vfxSnapshot.beamHits) {
    let beamView = beamViews.get(beam.id);

    if (!beamView) {
      beamView = acquirePooledImage(scene, viewGraph, beamPool, COMBAT_VFX_BEAM_TEXTURE_KEY);
      beamView.setBlendMode(Phaser.BlendModes.ADD);
      beamViews.set(beam.id, beamView);
    }

    const deltaX = beam.to.x - beam.from.x;
    const deltaY = beam.to.y - beam.from.y;
    const length = Math.hypot(deltaX, deltaY);

    beamView.setDepth(CombatLayoutConfig.DEPTH.VFX);
    beamView.setTint(CombatVisualConfig.NOTE_COLORS[beam.color]);
    beamView.setAlpha(beam.alpha);
    beamView.setPosition((beam.from.x + beam.to.x) / 2, (beam.from.y + beam.to.y) / 2);
    beamView.setRotation(Math.atan2(deltaY, deltaX));
    beamView.setScale(
      length / CombatVfxConfig.TEXTURES.BEAM_WIDTH_PX,
      beam.thickness / CombatVfxConfig.TEXTURES.BEAM_HEIGHT_PX,
    );
    beamView.setVisible(true);
  }
}

function syncNoteFlightPresentation(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  noteFlightViews: Map<string, Phaser.GameObjects.Image>,
  noteFlightPool: Phaser.GameObjects.Image[],
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const activeIds = new Set(vfxSnapshot.noteFlights.map((flight) => flight.id));

  reclaimImageViews(noteFlightViews, noteFlightPool, activeIds);

  for (const flight of vfxSnapshot.noteFlights) {
    let flightView = noteFlightViews.get(flight.id);

    if (!flightView) {
      flightView = acquirePooledImage(scene, viewGraph, noteFlightPool, COMBAT_NOTE_GLYPH_TEXTURE_KEY);
      flightView.setBlendMode(Phaser.BlendModes.ADD);
      noteFlightViews.set(flight.id, flightView);
    }

    flightView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.1);
    flightView.setPosition(flight.x, flight.y);
    flightView.setTint(CombatVisualConfig.NOTE_COLORS[flight.color]);
    flightView.setAlpha(flight.alpha);
    flightView.setScale(flight.scale);
    flightView.setVisible(true);
  }
}

function syncEnemyHitPresentation(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  enemyHitViews: Map<string, Phaser.GameObjects.Image>,
  enemyHitPool: Phaser.GameObjects.Image[],
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const activeIds = new Set(vfxSnapshot.enemyHitFlashes.map((flash) => flash.id));

  reclaimImageViews(enemyHitViews, enemyHitPool, activeIds);

  for (const flash of vfxSnapshot.enemyHitFlashes) {
    let flashView = enemyHitViews.get(flash.id);

    if (!flashView) {
      flashView = acquirePooledImage(scene, viewGraph, enemyHitPool, COMBAT_VFX_RING_TEXTURE_KEY);
      flashView.setBlendMode(Phaser.BlendModes.ADD);
      enemyHitViews.set(flash.id, flashView);
    }

    flashView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.2);
    flashView.setPosition(flash.x, flash.y);
    flashView.setTint(CombatVisualConfig.NOTE_COLORS[flash.color]);
    flashView.setAlpha(flash.alpha);
    flashView.setScale(flash.scale);
    flashView.setVisible(true);
  }
}

function syncPacketBreakPresentation(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  packetBreakViews: Map<string, Phaser.GameObjects.Image>,
  packetBreakPool: Phaser.GameObjects.Image[],
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const activeIds = new Set(vfxSnapshot.packetBreakBursts.map((burst) => burst.id));

  reclaimImageViews(packetBreakViews, packetBreakPool, activeIds);

  for (const burst of vfxSnapshot.packetBreakBursts) {
    let burstView = packetBreakViews.get(burst.id);

    if (!burstView) {
      burstView = acquirePooledImage(scene, viewGraph, packetBreakPool, COMBAT_VFX_RING_TEXTURE_KEY);
      burstView.setBlendMode(Phaser.BlendModes.ADD);
      packetBreakViews.set(burst.id, burstView);
    }

    burstView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.3);
    burstView.setPosition(burst.x, burst.y);
    burstView.setTint(CombatVisualConfig.NOTE_COLORS[burst.nextColor]);
    burstView.setAlpha(burst.alpha);
    burstView.setScale(burst.scale);
    burstView.setVisible(true);
  }
}

function syncBaseHitPresentation(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  baseHitViews: Map<string, Phaser.GameObjects.Image>,
  baseHitPool: Phaser.GameObjects.Image[],
  vfxSnapshot: CombatVfxSnapshot,
): void {
  const activeIds = new Set(vfxSnapshot.baseHitFlashes.map((flash) => flash.id));

  reclaimImageViews(baseHitViews, baseHitPool, activeIds);

  for (const flash of vfxSnapshot.baseHitFlashes) {
    let flashView = baseHitViews.get(flash.id);

    if (!flashView) {
      flashView = acquirePooledImage(scene, viewGraph, baseHitPool, COMBAT_VFX_GLOW_TEXTURE_KEY);
      flashView.setBlendMode(Phaser.BlendModes.ADD);
      baseHitViews.set(flash.id, flashView);
    }

    flashView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.4);
    flashView.setPosition(flash.x, flash.y);
    flashView.setTint(0xff8f7a);
    flashView.setAlpha(flash.alpha * 0.8);
    flashView.setScale(flash.scale * 1.3);
    flashView.setVisible(true);
  }
}

function syncResultEmphasisPresentation(
  scene: Phaser.Scene,
  resultEmphasisWash: Phaser.GameObjects.Rectangle | undefined,
  viewGraph: CombatSceneViewGraph,
  vfxSnapshot: CombatVfxSnapshot,
): Phaser.GameObjects.Rectangle | undefined {
  const emphasis = vfxSnapshot.resultEmphasis;

  if (!emphasis) {
    resultEmphasisWash?.setVisible(false);
    return resultEmphasisWash;
  }

  if (!resultEmphasisWash) {
    resultEmphasisWash = scene.add.rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      0xffffff,
      0,
    );
    resultEmphasisWash.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.5);
    viewGraph.effects.transientLayer.add(resultEmphasisWash);
  }

  resultEmphasisWash.setVisible(true);
  resultEmphasisWash.setFillStyle(
    emphasis.outcome === 'victory'
      ? CombatVfxConfig.RESULT.VICTORY_TINT
      : CombatVfxConfig.RESULT.DEFEAT_TINT,
    emphasis.alpha * 0.16,
  );
  resultEmphasisWash.setScale(emphasis.scale);

  return resultEmphasisWash;
}

function acquirePooledImage(
  scene: Phaser.Scene,
  viewGraph: CombatSceneViewGraph,
  pool: Phaser.GameObjects.Image[],
  textureKey: string,
): Phaser.GameObjects.Image {
  const image = pool.pop() ?? scene.add.image(0, 0, textureKey);

  image.setTexture(textureKey);
  image.setOrigin(0.5, 0.5);
  image.setVisible(true);
  viewGraph.effects.transientLayer.add(image);
  return image;
}

function reclaimImageViews(
  activeViews: Map<string, Phaser.GameObjects.Image>,
  pool: Phaser.GameObjects.Image[],
  activeIds: Set<string>,
): void {
  for (const [id, view] of activeViews.entries()) {
    if (activeIds.has(id)) {
      continue;
    }

    view.setVisible(false);
    activeViews.delete(id);
    pool.push(view);
  }
}

function clearPooledImageMaps(
  activeViews: Map<string, Phaser.GameObjects.Image>,
  pool: Phaser.GameObjects.Image[],
): void {
  for (const view of activeViews.values()) {
    view.destroy();
  }

  for (const view of pool) {
    view.destroy();
  }

  activeViews.clear();
  pool.length = 0;
}
