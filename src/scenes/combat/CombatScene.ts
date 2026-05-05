import Phaser from 'phaser';
import { emit, off, on } from '@events/EventBus';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { SceneKeys } from '@config/GameConfig';
import {
  ensureCombatNoteGlyphTexture,
  COMBAT_NOTE_GLYPH_TEXTURE_KEY,
} from '@combat/CombatNoteGlyph';
import { createCombatNotePacketViewModel } from '@combat/CombatNotePacketView';
import { bindCombatVfxEvents } from '@combat/CombatVfxEventBridge';
import { GameScene } from '@scenes/GameScene';
import { restartCombatScenes } from '@combat/CombatSceneLifecycle';
import {
  createCombatRuntime,
  type CombatEnemyState,
  type CombatRuntime,
} from '@combat/CombatRuntime';
import { createCombatRenderModel } from '@combat/CombatRenderModel';
import { getCombatPresentationDelta } from '@combat/CombatSceneLifecycle';
import { getCombatBaseHpBarFillMetrics } from '@combat/CombatBaseHpBar';
import { CombatVfxSystem, type CombatVfxAnchor, type CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import {
  COMBAT_VFX_BEAM_TEXTURE_KEY,
  COMBAT_VFX_GLOW_TEXTURE_KEY,
  COMBAT_VFX_RING_TEXTURE_KEY,
  ensureCombatVfxTextures,
} from '@combat/CombatVfxTextures';
import { publishCombatStateTransition } from '@combat/CombatHudEvents';
import {
  renderBasicEnemy,
  renderTankEnemy,
  renderFastEnemy,
  renderRangedEnemy,
  renderSwarmEnemy,
  renderBossEnemy,
} from '@combat/EnemyRenderer';
import { setCombatState } from '@combat/CombatRuntime';
import {
  advanceAnimationState,
  expireAnimationTimers,
  computeAnimationTransform,
  type CombatAnimationState,
} from '@scenes/combat/CombatAnimationTransforms';
import { computeDeathKnockbackOffset } from '@scenes/combat/CombatDeathKnockback';

import { CombatStateSystem } from '@systems/CombatStateSystem';
import { CombatDebugInputSystem } from '@systems/CombatDebugInputSystem';
import type { InputSystem } from '@systems/InputSystem';
import type { SimulationSystem } from '@systems/SimulationSystem';

interface CombatSlotView {
  sectorPulse: Phaser.GameObjects.Graphics;
  zonePulse: Phaser.GameObjects.Graphics;
  pawnGlow: Phaser.GameObjects.Image;
  uprightContainer: Phaser.GameObjects.Container;
  rotatingContent: Phaser.GameObjects.Container;
}

interface CombatEnemyView {
  container: Phaser.GameObjects.Container;
  flashOverlay: Phaser.GameObjects.Graphics;
  sortY: number;
  hpBar: Phaser.GameObjects.Graphics;
  hpBarX: number;
  hpBarY: number;
  hpBarWidth: number;
  hpBarHeight: number;
  maxHp: number;
  animation: CombatAnimationState;
}

interface CombatBaseHpBarView {
  fill: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CombatNotePacketView {
  anchorX: number;
  anchorY: number;
  depth: number;
  glyphs: Map<string, Phaser.GameObjects.Image>;
}

export class CombatScene extends GameScene {
  private runtime?: CombatRuntime;
  private combatVfx?: CombatVfxSystem;
  private detachCombatVfxEvents?: () => void;
  private needleTipX = 0;
  private needleTipY = 0;
  private recordContainer?: Phaser.GameObjects.Container;
  private baseHpBarView?: CombatBaseHpBarView;
  private notePacketView?: CombatNotePacketView;
  private baseVfxAnchor?: CombatVfxAnchor;
  private resultEmphasisWash?: Phaser.GameObjects.Rectangle;
  private notePacketElapsedMs = 0;
  private readonly slotViews = new Map<number, CombatSlotView>();
  private readonly enemyViews = new Map<string, CombatEnemyView>();
  private readonly beamViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly beamPool: Phaser.GameObjects.Image[] = [];
  private readonly noteFlightViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly noteFlightPool: Phaser.GameObjects.Image[] = [];
  private readonly enemyHitViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly enemyHitPool: Phaser.GameObjects.Image[] = [];
  private readonly packetBreakViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly packetBreakPool: Phaser.GameObjects.Image[] = [];
  private readonly baseHitViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly baseHitPool: Phaser.GameObjects.Image[] = [];
  private readonly handleRestartRequested = (): void => {
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

    publishCombatStateTransition(previousState, 'paused');
  };
  private readonly handleResumeRequested = (): void => {
    const runtime = this.runtime;

    if (!runtime || runtime.state !== 'paused') {
      return;
    }

    if (!setCombatState(runtime, 'running')) {
      return;
    }

    publishCombatStateTransition('paused', 'running');
  };

  constructor() {
    super(SceneKeys.COMBAT);
  }

  create(): void {
    super.create();
    emit('combat:scene-ready', {
      key: this.scene.key,
      state: this.runtime!.state,
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.syncCombatPresentation(delta);
  }

  protected createSceneContent(): void {
    this.runtime = createCombatRuntime();
    this.renderStaticCombatLayout();
    on('combat:pause-requested', this.handlePauseRequested);
    on('combat:restart-requested', this.handleRestartRequested);
    on('combat:resume-requested', this.handleResumeRequested);
    on('combat:enemy-hit', this.handleEnemyHit);
    this.combatVfx = new CombatVfxSystem({
      getSlotAnchor: (slotIndex) => this.getSlotVfxAnchor(slotIndex),
      getEnemyAnchor: (enemyId) => this.getEnemyVfxAnchor(enemyId),
      getNotePacketAnchor: () => this.getNotePacketVfxAnchor(),
      getBaseAnchor: () => this.getBaseVfxAnchor(),
    });
    this.detachCombatVfxEvents = bindCombatVfxEvents(this.combatVfx);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off('combat:pause-requested', this.handlePauseRequested);
      off('combat:restart-requested', this.handleRestartRequested);
      off('combat:resume-requested', this.handleResumeRequested);
      off('combat:enemy-hit', this.handleEnemyHit);
      this.detachCombatVfxEvents?.();
      this.detachCombatVfxEvents = undefined;
      this.combatVfx = undefined;
      this.slotViews.clear();
      this.enemyViews.clear();
      this.clearPooledImageMaps(this.noteFlightViews, this.noteFlightPool);
      this.clearPooledImageMaps(this.beamViews, this.beamPool);
      this.clearPooledImageMaps(this.enemyHitViews, this.enemyHitPool);
      this.clearPooledImageMaps(this.packetBreakViews, this.packetBreakPool);
      this.clearPooledImageMaps(this.baseHitViews, this.baseHitPool);
      this.notePacketView?.glyphs.forEach((glyph) => glyph.destroy());
      this.notePacketView?.glyphs.clear();
      this.resultEmphasisWash?.destroy();
      this.resultEmphasisWash = undefined;
      this.notePacketView = undefined;
      this.notePacketElapsedMs = 0;
      this.baseHpBarView = undefined;
      this.baseVfxAnchor = undefined;
      this.recordContainer = undefined;
    });
  }

  protected createInputSystems(): InputSystem[] {
    return [new CombatDebugInputSystem(this, () => this.runtime)];
  }

  protected createSimulationSystems(): SimulationSystem[] {
    return [new CombatStateSystem(this, () => this.runtime)];
  }

  protected getOverlaySceneKey(): string | null {
    return SceneKeys.HUD;
  }

  private renderStaticCombatLayout(): void {
    const model = createCombatRenderModel();
    this.needleTipX = model.needle.tipX;
    this.needleTipY = model.needle.tipY;

    ensureCombatNoteGlyphTexture(this);
    ensureCombatVfxTextures(this);
    this.renderBackground(model);
    this.renderEnemyLane(model);
    this.renderEnemyUnits(model);
    this.renderRecord(model);
    this.renderTimeControlBackplates(model);
    this.renderBase(model);
    this.renderNeedle(model);
    this.renderBaseHpBar(model);
    this.renderNotePacketAnchor(model);
  }

  private renderBackground(model: ReturnType<typeof createCombatRenderModel>): void {
    const graphics = this.add.graphics();

    graphics.setDepth(model.background.depth);
    graphics.fillGradientStyle(0x07111d, 0x07111d, 0x120c24, 0x120c24, 1);
    graphics.fillRect(0, 0, model.background.width, model.background.height);

    graphics.lineStyle(2, 0x17304a, 0.45);
    graphics.strokeRect(20, model.enemyLane.top, model.background.width - 40, model.enemyLane.bottom - model.enemyLane.top);
  }

  private renderEnemyLane(model: ReturnType<typeof createCombatRenderModel>): void {
    const graphics = this.add.graphics();
    const width = model.enemyLane.right - model.enemyLane.left;
    const height = model.enemyLane.bottom - model.enemyLane.top;

    graphics.setDepth(model.enemyLane.depth);
    graphics.fillStyle(0x11263a, 0.45);
    graphics.fillRoundedRect(model.enemyLane.left, model.enemyLane.top, width, height, 24);
    graphics.lineStyle(2, 0x56d6ff, 0.3);
    graphics.strokeRoundedRect(model.enemyLane.left, model.enemyLane.top, width, height, 24);

    const label = this.add.text(
      model.record.base.centerX,
      model.enemyLane.top + 28,
      'ENEMY LANE',
      {
        color: '#7bdfff',
        fontFamily: 'monospace',
        fontSize: '20px',
      },
    );

    label.setOrigin(0.5, 0.5);
    label.setDepth(model.enemyLane.depth);
  }

  private renderEnemyUnits(model: ReturnType<typeof createCombatRenderModel>): void {
    for (const enemy of model.enemies) {
      const container = this.add.container(enemy.container.x, enemy.container.y);
      const body = this.add.graphics();
      const flashOverlay = this.add.graphics();
      const hpBar = this.add.graphics();
      const hitFlashAnchor = this.add.container(
        enemy.attachments.hitFlash.x,
        enemy.attachments.hitFlash.y,
      );
      const hpBarX = -enemy.hpBar.width / 2;
      const hpBarY = enemy.hpBar.offsetY - enemy.hpBar.height / 2;

      container.name = enemy.container.name;
      container.setDepth(this.getEnemyContainerDepth(enemy.container.sortY));

      const archetype = enemy.body.family;
      this.renderEnemyBody(body, archetype, enemy.body.width, enemy.body.height, enemy.body.color);
      this.renderEnemyBody(flashOverlay, archetype, enemy.body.width, enemy.body.height, 0xffffff);
      flashOverlay.setAlpha(0);

      hpBar.fillStyle(0x201927, 1);
      hpBar.fillRoundedRect(hpBarX, hpBarY, enemy.hpBar.width, enemy.hpBar.height, 6);
      hpBar.fillStyle(0xff0000, 1);
      hpBar.fillRoundedRect(
        hpBarX + 2,
        hpBarY + 2,
        enemy.hpBar.width - 4,
        enemy.hpBar.height - 4,
        4,
      );

      hitFlashAnchor.name = `${enemy.container.name}-hit-flash-anchor`;
      hitFlashAnchor.setVisible(false);

      container.add([body, flashOverlay, hitFlashAnchor, hpBar]);
      container.setVisible(false);
      const runtimeEnemy = this.runtime!.enemies.find((e) => e.runtimeId === enemy.runtimeId);
      const maxHp = runtimeEnemy?.maxHp ?? 1;
      this.enemyViews.set(enemy.runtimeId, {
        container,
        flashOverlay,
        sortY: enemy.container.sortY,
        hpBar,
        hpBarX: -enemy.hpBar.width / 2,
        hpBarY: enemy.hpBar.offsetY - enemy.hpBar.height / 2,
        hpBarWidth: enemy.hpBar.width,
        hpBarHeight: enemy.hpBar.height,
        maxHp,
        animation: {
          idlePulsePhase: 0,
          moveHopPhase: 0,
          attackFlashAt: 0,
          hitFlashAt: 0,
          deathProgress: 0,
          deathStartX: 0,
          deathStartY: 0,
          deathKnockbackX: 0,
          deathKnockbackY: 0,
          deathDurationMs: CombatVisualConfig.ANIMATION.DEATH_DURATION_MS,
          lastState: null,
        },
      });
    }
  }

  private renderEnemyBody(
    graphics: Phaser.GameObjects.Graphics,
    archetype: string,
    bodyWidth: number,
    bodyHeight: number,
    color: number,
  ): void {
    switch (archetype) {
      case 'basic':
        renderBasicEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
      case 'tank':
        renderTankEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
      case 'fast':
        renderFastEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
      case 'ranged':
        renderRangedEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
      case 'swarm':
        renderSwarmEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
      case 'boss':
        renderBossEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
      default:
        renderBasicEnemy(graphics, bodyWidth, bodyHeight, color);
        break;
    }
  }

  private renderRecord(model: ReturnType<typeof createCombatRenderModel>): void {
    const recordContainer = this.add.container(
      model.record.base.centerX,
      model.record.base.centerY,
    );
    const base = this.add.graphics();

    recordContainer.setDepth(model.record.base.depth);
    base.fillStyle(0x16111f, 1);
    base.fillCircle(0, 0, model.record.base.radius);
    base.lineStyle(10, 0x2a1f39, 1);
    base.strokeCircle(0, 0, model.record.base.radius - 4);
    base.fillStyle(0x0b0f17, 1);
    base.fillCircle(0, 0, 92);
    recordContainer.add(base);

    for (const slot of model.record.slots) {
      const graphics = this.add.graphics();
      const sectorPulse = this.add.graphics();
      const zonePulse = this.add.graphics();
      const rotatingInnerAnchor = this.add.container(slot.innerAnchor.x, slot.innerAnchor.y);
      const uprightContainer = this.add.container(slot.outerAnchor.x, slot.outerAnchor.y);
      const pawnGlow = this.add.image(0, 0, COMBAT_VFX_GLOW_TEXTURE_KEY);

      rotatingInnerAnchor.setRotation(
        Phaser.Math.DegToRad(slot.innerLabelRotationDeg),
      );
      pawnGlow.setTint(slot.presentation.accentColor);
      pawnGlow.setBlendMode(Phaser.BlendModes.ADD);
      pawnGlow.setAlpha(0);
      pawnGlow.setScale(
        slot.pawn === null
          ? CombatVfxConfig.SLOT.EMPTY_GLOW_SCALE
          : CombatVfxConfig.SLOT.PAWN_GLOW_SCALE,
      );
      uprightContainer.add(pawnGlow);

      graphics.fillStyle(slot.index === 0 ? 0x2f365f : 0x22263a, 0.3);
      this.fillSector(
        graphics,
        0,
        0,
        slot.outerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );

      graphics.fillStyle(0x0b1320, 0.55);
      this.fillSector(
        graphics,
        0,
        0,
        slot.innerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );

      graphics.lineStyle(2, slot.index === 0 ? 0xffd166 : 0x81a4c5, 0.9);
      this.strokeSector(
        graphics,
        0,
        0,
        slot.outerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );

      sectorPulse.fillStyle(0xc8fbff, 0.4);
      this.fillSector(
        sectorPulse,
        0,
        0,
        slot.outerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );
      sectorPulse.lineStyle(4, 0xf9ff8f, 0.95);
      this.strokeSector(
        sectorPulse,
        0,
        0,
        slot.outerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );
      sectorPulse.setAlpha(0);

      zonePulse.fillStyle(0x9be7ff, 0.5);
      this.fillSector(
        zonePulse,
        0,
        0,
        slot.innerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );
      zonePulse.setAlpha(0);

      this.renderSlotInnerRotatingPresentation(slot, rotatingInnerAnchor);
      this.renderSlotUprightPresentation(slot, uprightContainer);

      recordContainer.add([
        graphics,
        sectorPulse,
        zonePulse,
        rotatingInnerAnchor,
        uprightContainer,
      ]);
      this.slotViews.set(slot.index, {
        sectorPulse,
        zonePulse,
        pawnGlow,
        uprightContainer,
        rotatingContent: rotatingInnerAnchor,
      });
    }

    this.recordContainer = recordContainer;
  }

  private renderTimeControlBackplates(model: ReturnType<typeof createCombatRenderModel>): void {
    for (const backplate of model.timeControls) {
      const graphics = this.add.graphics();

      graphics.setDepth(backplate.depth);
      graphics.fillStyle(0x121826, 0.75);
      graphics.fillRoundedRect(
        backplate.x - backplate.width / 2,
        backplate.y - backplate.height / 2,
        backplate.width,
        backplate.height,
        16,
      );
      graphics.lineStyle(2, 0x54708f, 0.6);
      graphics.strokeRoundedRect(
        backplate.x - backplate.width / 2,
        backplate.y - backplate.height / 2,
        backplate.width,
        backplate.height,
        16,
      );
    }
  }

  private renderBase(model: ReturnType<typeof createCombatRenderModel>): void {
    const graphics = this.add.graphics();
    const x = model.base.x - model.base.width / 2;
    const y = model.base.y - model.base.height / 2;

    graphics.setDepth(model.base.depth);
    graphics.fillStyle(0x31203a, 1);
    graphics.fillRoundedRect(x, y, model.base.width, model.base.height, 28);
    graphics.fillStyle(0x5de2e7, 0.18);
    graphics.fillRoundedRect(x + 18, y + 18, model.base.width - 36, 56, 18);
    graphics.fillStyle(0xf4b942, 1);
    graphics.fillCircle(model.base.x, model.base.y - 24, 22);
    graphics.lineStyle(3, 0xffde7a, 0.8);
    graphics.strokeCircle(model.base.x, model.base.y - 24, 34);

    const label = this.add.text(model.base.x, model.base.y + 42, 'BASE', {
      color: '#f7f1ff',
      fontFamily: 'monospace',
      fontSize: '20px',
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(model.base.depth);

    this.baseVfxAnchor = {
      x: model.base.x,
      y: model.base.y - 24,
    };
  }

  private renderNeedle(model: ReturnType<typeof createCombatRenderModel>): void {
    const graphics = this.add.graphics();

    graphics.setDepth(model.needle.depth);
    graphics.lineStyle(8, 0xb2f7ff, 0.95);
    graphics.beginPath();
    graphics.moveTo(model.needle.baseX, model.needle.baseY);
    graphics.lineTo(model.needle.tipX, model.needle.tipY + 28);
    graphics.strokePath();

    graphics.fillStyle(0xffd166, 1);
    graphics.fillTriangle(
      model.needle.tipX,
      model.needle.tipY,
      model.needle.tipX - 12,
      model.needle.tipY + 28,
      model.needle.tipX + 12,
      model.needle.tipY + 28,
    );
  }

  private renderBaseHpBar(model: ReturnType<typeof createCombatRenderModel>): void {
    const x = model.baseHpBar.x - model.baseHpBar.width / 2;
    const y = model.baseHpBar.y - model.baseHpBar.height / 2;
    const frame = this.add.graphics();
    const fill = this.add.graphics();

    frame.setDepth(model.baseHpBar.depth);
    frame.fillStyle(0x201927, 1);
    frame.fillRoundedRect(x, y, model.baseHpBar.width, model.baseHpBar.height, 10);
    fill.setDepth(model.baseHpBar.depth);

    const label = this.add.text(model.baseHpBar.x, model.baseHpBar.y + 26, 'BASE HP 100/100', {
      color: '#bde7c7',
      fontFamily: 'monospace',
      fontSize: '16px',
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(model.baseHpBar.depth);

    this.baseHpBarView = {
      fill,
      label,
      x,
      y,
      width: model.baseHpBar.width,
      height: model.baseHpBar.height,
    };
    this.syncBaseHpBarPresentation();
  }

  private renderNotePacketAnchor(model: ReturnType<typeof createCombatRenderModel>): void {
    const graphics = this.add.graphics();

    graphics.setDepth(model.notePacketAnchor.depth);
    graphics.lineStyle(3, 0xff89c6, 0.9);
    graphics.strokeCircle(model.notePacketAnchor.x, model.notePacketAnchor.y, 36);
    graphics.lineStyle(2, 0xff89c6, 0.4);
    graphics.strokeCircle(model.notePacketAnchor.x, model.notePacketAnchor.y, 54);
    this.notePacketView = {
      anchorX: model.notePacketAnchor.x,
      anchorY: model.notePacketAnchor.y,
      depth: model.notePacketAnchor.depth,
      glyphs: new Map(),
    };
  }

  private fillSector(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number,
  ): void {
    graphics.beginPath();
    graphics.moveTo(centerX, centerY);
    graphics.slice(
      centerX,
      centerY,
      radius,
      Phaser.Math.DegToRad(startAngleDeg),
      Phaser.Math.DegToRad(endAngleDeg),
      false,
    );
    graphics.closePath();
    graphics.fillPath();
  }

  private strokeSector(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number,
  ): void {
    graphics.beginPath();
    graphics.moveTo(centerX, centerY);
    graphics.slice(
      centerX,
      centerY,
      radius,
      Phaser.Math.DegToRad(startAngleDeg),
      Phaser.Math.DegToRad(endAngleDeg),
      false,
    );
    graphics.closePath();
    graphics.strokePath();
  }

  private getPolarOffset(angleDeg: number, radius: number): { x: number; y: number } {
    const radians = Phaser.Math.DegToRad(angleDeg);

    return {
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius,
    };
  }

  private syncCombatPresentation(delta: number): void {
    if (!this.runtime || !this.recordContainer || !this.combatVfx) {
      return;
    }

    const presentationDelta = getCombatPresentationDelta(this.runtime.state, delta);

    this.notePacketElapsedMs += presentationDelta;
    this.combatVfx.update(presentationDelta);
    const vfxSnapshot = this.combatVfx.getSnapshot();
    const recordRotation = Phaser.Math.DegToRad(this.runtime.record.currentAngle);

    this.recordContainer.setRotation(recordRotation);
    this.syncEnemyPresentation(presentationDelta);
    this.syncBaseHpBarPresentation();
    this.syncNotePacketPresentation(vfxSnapshot);
    this.syncSlotVfxPresentation(recordRotation, vfxSnapshot);
    this.syncBeamPresentation(vfxSnapshot);
    this.syncNoteFlightPresentation(vfxSnapshot);
    this.syncEnemyHitPresentation(vfxSnapshot);
    this.syncPacketBreakPresentation(vfxSnapshot);
    this.syncBaseHitPresentation(vfxSnapshot);
    this.syncResultEmphasisPresentation(vfxSnapshot);
  }

  private syncSlotVfxPresentation(recordRotation: number, vfxSnapshot: CombatVfxSnapshot): void {
    const slotActivations = new Map(
      vfxSnapshot.slotActivations.map((activation) => [activation.slotIndex, activation]),
    );

    for (const [slotIndex, slotView] of this.slotViews.entries()) {
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

  private syncEnemyPresentation(deltaMs: number): void {
    if (!this.runtime) {
      return;
    }

    const elapsed = this.runtime.combatElapsedMs;

    for (const enemy of this.runtime.enemies) {
      const enemyView = this.enemyViews.get(enemy.runtimeId);

      if (!enemyView) {
        continue;
      }

      const anim = enemyView.animation;
      enemyView.sortY = enemy.y;
      enemyView.container.setPosition(enemy.x, enemy.y);
      enemyView.container.setDepth(this.getEnemyContainerDepth(enemyView.sortY));
      enemyView.container.setScale(1);
      enemyView.container.setAlpha(1);
      enemyView.flashOverlay.setAlpha(0);

      if (!enemy.spawned) {
        enemyView.container.setVisible(false);
        continue;
      }

      const runtimeState = enemy.state as CombatEnemyState;

      if (runtimeState === 'attacking' && anim.lastState !== 'attacking' && anim.attackFlashAt === 0) {
        anim.attackFlashAt = elapsed;
      }

      if (runtimeState === 'dead' && anim.lastState !== 'dead') {
        anim.deathStartX = enemy.x;
        anim.deathStartY = enemy.y;
        const knockback = computeDeathKnockbackOffset(
          { x: this.needleTipX, y: this.needleTipY },
          { x: enemy.x, y: enemy.y },
        );
        anim.deathKnockbackX = knockback.x;
        anim.deathKnockbackY = knockback.y;
        anim.deathDurationMs = enemy.archetype === 'boss'
          ? CombatVisualConfig.ANIMATION.DEATH_BOSS_DURATION_MS
          : CombatVisualConfig.ANIMATION.DEATH_DURATION_MS;
      }

      const updatedAnim = expireAnimationTimers(
        advanceAnimationState(anim, runtimeState, deltaMs),
        elapsed,
      );
      Object.assign(anim, updatedAnim);

      enemyView.container.setVisible(runtimeState !== 'dead' || anim.deathProgress < 1);

      const scaleMultiplier = enemy.archetype === 'boss'
        ? CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS.boss
        : CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS[enemy.archetype as keyof typeof CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS] ?? 1;

      const transform = computeAnimationTransform({
        anim,
        enemyState: enemy.state,
        elapsed,
        deltaMs,
        scaleMultiplier,
      });

      const container = enemyView.container;
      // Freeze death presentation at the point of death so runtime movement cannot drift the fade-out.
      const baseX = runtimeState === 'dead' ? anim.deathStartX : enemy.x;
      const baseY = runtimeState === 'dead' ? anim.deathStartY : enemy.y;
      container.setPosition(baseX + transform.xShift, baseY + transform.yShift);
      container.setScale(transform.scale);
      container.setAlpha(transform.alpha);
      if (transform.tint !== null) {
        enemyView.flashOverlay.setAlpha(0.95);
      }
    }
  }

  private handleEnemyHit = (payload: {
    enemyId: string;
    currentHp: number;
    maxHp: number;
  }): void => {
    const view = this.enemyViews.get(payload.enemyId);
    if (!view) {
      return;
    }

    view.animation.hitFlashAt = this.runtime!.combatElapsedMs;

    const innerPadding = 2;
    const innerWidth = view.hpBarWidth - innerPadding * 2;
    const innerHeight = view.hpBarHeight - innerPadding * 2;
    const metrics = getCombatBaseHpBarFillMetrics(
      payload.currentHp,
      payload.maxHp,
      innerWidth,
    );

    view.hpBar.clear();
    view.hpBar.fillStyle(0x201927, 1);
    view.hpBar.fillRoundedRect(
      view.hpBarX,
      view.hpBarY,
      view.hpBarWidth,
      view.hpBarHeight,
      6,
    );
    view.hpBar.fillStyle(0xff0000, 1);
    view.hpBar.fillRoundedRect(
      view.hpBarX + innerPadding,
      view.hpBarY + innerPadding,
      metrics.width,
      innerHeight,
      4,
    );
  };

  private syncBaseHpBarPresentation(): void {
    if (!this.runtime || !this.baseHpBarView) {
      return;
    }

    const innerPadding = 3;
    const innerWidth = this.baseHpBarView.width - innerPadding * 2;
    const innerHeight = this.baseHpBarView.height - innerPadding * 2;
    const metrics = getCombatBaseHpBarFillMetrics(
      this.runtime.baseHp,
      CombatBalanceConfig.BASE_HP,
      innerWidth,
    );

    this.baseHpBarView.fill.clear();
    this.baseHpBarView.fill.fillStyle(0x58f29b, 1);
    this.baseHpBarView.fill.fillRoundedRect(
      this.baseHpBarView.x + innerPadding,
      this.baseHpBarView.y + innerPadding,
      metrics.width,
      innerHeight,
      8,
    );
    this.baseHpBarView.label.setText(
      `BASE HP ${this.runtime.baseHp}/${CombatBalanceConfig.BASE_HP}`,
    );
  }

  private syncNotePacketPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    if (!this.runtime || !this.notePacketView) {
      return;
    }

    const instances = createCombatNotePacketViewModel(
      this.runtime.notePacket,
      {
        x: this.notePacketView.anchorX,
        y: this.notePacketView.anchorY,
      },
      this.notePacketElapsedMs,
    );
    const activeIds = new Set(instances.map((instance) => instance.id));
    const packetIntakeActive = vfxSnapshot.noteFlights.some(
      (flight) => flight.direction === 'packet-to-slot',
    );

    for (const [id, glyph] of this.notePacketView.glyphs.entries()) {
      if (activeIds.has(id)) {
        continue;
      }

      glyph.destroy();
      this.notePacketView.glyphs.delete(id);
    }

    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index]!;
      let glyph = this.notePacketView.glyphs.get(instance.id);

      if (!glyph) {
        glyph = this.add.image(instance.x, instance.y, COMBAT_NOTE_GLYPH_TEXTURE_KEY);
        glyph.setOrigin(0.5, 0.5);
        this.notePacketView.glyphs.set(instance.id, glyph);
      }

      glyph.setDepth(this.notePacketView.depth + index * 0.01);
      glyph.setPosition(instance.x, instance.y);
      glyph.setTint(instance.tint);
      glyph.setAlpha(packetIntakeActive ? 0.15 : 1);
      glyph.setScale(instance.scale);
    }
  }

  private syncBeamPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    const activeIds = new Set(vfxSnapshot.beamHits.map((beam) => beam.id));

    this.reclaimImageViews(this.beamViews, this.beamPool, activeIds);

    for (const beam of vfxSnapshot.beamHits) {
      let beamView = this.beamViews.get(beam.id);

      if (!beamView) {
        beamView = this.acquirePooledImage(this.beamPool, COMBAT_VFX_BEAM_TEXTURE_KEY);
        beamView.setBlendMode(Phaser.BlendModes.ADD);
        this.beamViews.set(beam.id, beamView);
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

  private syncNoteFlightPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    const activeIds = new Set(vfxSnapshot.noteFlights.map((flight) => flight.id));

    this.reclaimImageViews(this.noteFlightViews, this.noteFlightPool, activeIds);

    for (const flight of vfxSnapshot.noteFlights) {
      let flightView = this.noteFlightViews.get(flight.id);

      if (!flightView) {
        flightView = this.acquirePooledImage(this.noteFlightPool, COMBAT_NOTE_GLYPH_TEXTURE_KEY);
        flightView.setBlendMode(Phaser.BlendModes.ADD);
        this.noteFlightViews.set(flight.id, flightView);
      }

      flightView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.1);
      flightView.setPosition(flight.x, flight.y);
      flightView.setTint(CombatVisualConfig.NOTE_COLORS[flight.color]);
      flightView.setAlpha(flight.alpha);
      flightView.setScale(flight.scale);
      flightView.setVisible(true);
    }
  }

  private syncEnemyHitPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    const activeIds = new Set(vfxSnapshot.enemyHitFlashes.map((flash) => flash.id));

    this.reclaimImageViews(this.enemyHitViews, this.enemyHitPool, activeIds);

    for (const flash of vfxSnapshot.enemyHitFlashes) {
      let flashView = this.enemyHitViews.get(flash.id);

      if (!flashView) {
        flashView = this.acquirePooledImage(this.enemyHitPool, COMBAT_VFX_RING_TEXTURE_KEY);
        flashView.setBlendMode(Phaser.BlendModes.ADD);
        this.enemyHitViews.set(flash.id, flashView);
      }

      flashView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.2);
      flashView.setPosition(flash.x, flash.y);
      flashView.setTint(CombatVisualConfig.NOTE_COLORS[flash.color]);
      flashView.setAlpha(flash.alpha);
      flashView.setScale(flash.scale);
      flashView.setVisible(true);
    }
  }

  private syncPacketBreakPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    const activeIds = new Set(vfxSnapshot.packetBreakBursts.map((burst) => burst.id));

    this.reclaimImageViews(this.packetBreakViews, this.packetBreakPool, activeIds);

    for (const burst of vfxSnapshot.packetBreakBursts) {
      let burstView = this.packetBreakViews.get(burst.id);

      if (!burstView) {
        burstView = this.acquirePooledImage(this.packetBreakPool, COMBAT_VFX_RING_TEXTURE_KEY);
        burstView.setBlendMode(Phaser.BlendModes.ADD);
        this.packetBreakViews.set(burst.id, burstView);
      }

      burstView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.3);
      burstView.setPosition(burst.x, burst.y);
      burstView.setTint(CombatVisualConfig.NOTE_COLORS[burst.nextColor]);
      burstView.setAlpha(burst.alpha);
      burstView.setScale(burst.scale);
      burstView.setVisible(true);
    }
  }

  private syncBaseHitPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    const activeIds = new Set(vfxSnapshot.baseHitFlashes.map((flash) => flash.id));

    this.reclaimImageViews(this.baseHitViews, this.baseHitPool, activeIds);

    for (const flash of vfxSnapshot.baseHitFlashes) {
      let flashView = this.baseHitViews.get(flash.id);

      if (!flashView) {
        flashView = this.acquirePooledImage(this.baseHitPool, COMBAT_VFX_GLOW_TEXTURE_KEY);
        flashView.setBlendMode(Phaser.BlendModes.ADD);
        this.baseHitViews.set(flash.id, flashView);
      }

      flashView.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.4);
      flashView.setPosition(flash.x, flash.y);
      flashView.setTint(0xff8f7a);
      flashView.setAlpha(flash.alpha * 0.8);
      flashView.setScale(flash.scale * 1.3);
      flashView.setVisible(true);
    }
  }

  private syncResultEmphasisPresentation(vfxSnapshot: CombatVfxSnapshot): void {
    const emphasis = vfxSnapshot.resultEmphasis;

    if (!emphasis) {
      this.resultEmphasisWash?.setVisible(false);
      return;
    }

    if (!this.resultEmphasisWash) {
      this.resultEmphasisWash = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0xffffff,
        0,
      );
      this.resultEmphasisWash.setDepth(CombatLayoutConfig.DEPTH.VFX + 0.5);
    }

    this.resultEmphasisWash.setVisible(true);
    this.resultEmphasisWash.setFillStyle(
      emphasis.outcome === 'victory'
        ? CombatVfxConfig.RESULT.VICTORY_TINT
        : CombatVfxConfig.RESULT.DEFEAT_TINT,
      emphasis.alpha * 0.16,
    );
    this.resultEmphasisWash.setScale(emphasis.scale);
  }

  private getSlotVfxAnchor(slotIndex: number): { x: number; y: number; hasPawn: boolean } | null {
    const slotView = this.slotViews.get(slotIndex);
    const slotRuntime = this.runtime?.slots[slotIndex];

    if (!slotView || !slotRuntime) {
      return null;
    }

    const matrix = slotView.uprightContainer.getWorldTransformMatrix();
    const point = matrix.transformPoint(0, 0);

    return {
      x: point.x,
      y: point.y,
      hasPawn: slotRuntime.pawnId !== null,
    };
  }

  private getEnemyVfxAnchor(enemyId: string): CombatVfxAnchor | null {
    const enemyView = this.enemyViews.get(enemyId);

    if (!enemyView) {
      return null;
    }

    return {
      x: enemyView.container.x,
      y: enemyView.container.y - 4,
    };
  }

  private getNotePacketVfxAnchor(): CombatVfxAnchor {
    return {
      x: this.notePacketView?.anchorX ?? CombatLayoutConfig.NOTE_PACKET_ANCHOR_X,
      y: this.notePacketView?.anchorY ?? CombatLayoutConfig.NOTE_PACKET_ANCHOR_Y,
    };
  }

  private getBaseVfxAnchor(): CombatVfxAnchor {
    return this.baseVfxAnchor ?? {
      x: CombatLayoutConfig.BASE_X,
      y: CombatLayoutConfig.BASE_Y,
    };
  }

  private acquirePooledImage(
    pool: Phaser.GameObjects.Image[],
    textureKey: string,
  ): Phaser.GameObjects.Image {
    const image = pool.pop() ?? this.add.image(0, 0, textureKey);

    image.setTexture(textureKey);
    image.setOrigin(0.5, 0.5);
    image.setVisible(true);
    return image;
  }

  private reclaimImageViews(
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

  private clearPooledImageMaps(
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

  private getEnemyContainerDepth(sortY: number): number {
    return CombatLayoutConfig.DEPTH.PAWNS + sortY / 1000;
  }

  private renderSlotInnerRotatingPresentation(
    slot: ReturnType<typeof createCombatRenderModel>['record']['slots'][number],
    container: Phaser.GameObjects.Container,
  ): void {
    const ruleLabel = slot.presentation.rotating.ruleLabel;
    const emptyLabel = slot.presentation.rotating.emptyLabel;
    const fontSizePx =
      ruleLabel === null
        ? CombatVisualConfig.EMPTY_LABEL_FONT_SIZE_PX
        : CombatVisualConfig.RULE_LABEL_FONT_SIZE_PX;

    if (ruleLabel) {
      const glyphs = ruleLabel.segments.map((segment) => {
        const glyph = this.add.text(0, 0, segment.text, {
          color: `#${segment.color.toString(16).padStart(6, '0')}`,
          fontFamily: 'monospace',
          fontSize: `${fontSizePx}px`,
          fontStyle: segment.isNoteGlyph ? 'bold' : 'normal',
        });

        glyph.setOrigin(0, 0.5);
        return glyph;
      });
      const totalWidth = glyphs.reduce((width, glyph) => width + glyph.width, 0);
      let offsetX = -totalWidth / 2;

      for (const glyph of glyphs) {
        glyph.setPosition(offsetX, 0);
        offsetX += glyph.width;
        container.add(glyph);
      }

      return;
    }

    const text = this.add.text(0, 0, emptyLabel?.text ?? '', {
      color: `#${(emptyLabel?.color ?? 0xffffff).toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
      fontSize: `${fontSizePx}px`,
      align: 'center',
    });

    text.setOrigin(0.5, 0.5);
    container.add(text);
  }

  private renderSlotUprightPresentation(
    slot: ReturnType<typeof createCombatRenderModel>['record']['slots'][number],
    container: Phaser.GameObjects.Container,
  ): void {
    const pedestal = slot.presentation.upright.pedestal;
    const construct = slot.presentation.upright.construct;
    const tierStars = slot.presentation.upright.tierStars;

    if (pedestal) {
      const pedestalGraphic = this.add.graphics();

      pedestalGraphic.fillStyle(pedestal.color, 0.16);
      pedestalGraphic.fillRoundedRect(
        -CombatVisualConfig.SLOT.PEDESTAL_WIDTH / 2,
        26,
        CombatVisualConfig.SLOT.PEDESTAL_WIDTH,
        CombatVisualConfig.SLOT.PEDESTAL_HEIGHT,
        14,
      );
      pedestalGraphic.lineStyle(2, pedestal.color, 0.95);
      pedestalGraphic.strokeRoundedRect(
        -CombatVisualConfig.SLOT.PEDESTAL_WIDTH / 2,
        26,
        CombatVisualConfig.SLOT.PEDESTAL_WIDTH,
        CombatVisualConfig.SLOT.PEDESTAL_HEIGHT,
        14,
      );
      pedestalGraphic.lineStyle(2, 0xe4f6ff, 0.35);
      pedestalGraphic.strokeLineShape(new Phaser.Geom.Line(-28, 18, 28, 18));
      container.add(pedestalGraphic);
    }

    if (!construct) {
      const emptyDock = this.add.graphics();

      emptyDock.lineStyle(2, 0x4c6580, 0.6);
      emptyDock.strokeCircle(0, 0, CombatVisualConfig.SLOT.CONSTRUCT_RADIUS - 6);
      emptyDock.lineStyle(2, 0x4c6580, 0.25);
      emptyDock.strokeCircle(0, 0, CombatVisualConfig.SLOT.CONSTRUCT_RADIUS + 10);
      container.add(emptyDock);

      return;
    }

    const graphics = this.add.graphics();

    graphics.lineStyle(3, construct.color, 0.95);
    graphics.fillStyle(construct.color, 0.14);

    if (construct.family === 'generator') {
      graphics.beginPath();
      graphics.moveTo(0, -36);
      graphics.lineTo(34, 0);
      graphics.lineTo(0, 36);
      graphics.lineTo(-34, 0);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.lineStyle(2, 0xe8fbff, 0.75);
      graphics.strokeLineShape(
        new Phaser.Geom.Line(-22, 0, 22, 0),
      );
      graphics.strokeLineShape(
        new Phaser.Geom.Line(0, -22, 0, 22),
      );
    } else {
      graphics.beginPath();
      graphics.moveTo(0, -42);
      graphics.lineTo(30, 28);
      graphics.lineTo(0, 12);
      graphics.lineTo(-30, 28);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.lineStyle(2, 0xe8fbff, 0.7);
      graphics.strokeLineShape(
        new Phaser.Geom.Line(0, -32, 0, 16),
      );
    }

    container.add(graphics);

    if (tierStars) {
      const stars = this.add.text(
        0,
        CombatVisualConfig.SLOT.STAR_OFFSET_Y,
        '★'.repeat(tierStars.count),
        {
          color: `#${tierStars.color.toString(16).padStart(6, '0')}`,
          fontFamily: 'monospace',
          fontSize: `${CombatVisualConfig.TIER_STAR_FONT_SIZE_PX}px`,
        },
      );

      stars.setOrigin(0.5, 0.5);
      container.add(stars);
    }
  }
}
