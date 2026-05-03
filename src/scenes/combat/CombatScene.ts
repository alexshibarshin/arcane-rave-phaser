import Phaser from 'phaser';
import { emit } from '@events/EventBus';
import { off, on } from '@events/EventBus';
import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import { SceneKeys } from '@config/GameConfig';
import { GameScene } from '@scenes/GameScene';
import { createCombatRuntime, type CombatRuntime } from '@combat/CombatRuntime';
import { createCombatRenderModel } from '@combat/CombatRenderModel';
import { publishCombatHudSnapshot } from '@combat/CombatHudEvents';
import { CombatStateSystem } from '@systems/CombatStateSystem';
import { CombatDebugInputSystem } from '@systems/CombatDebugInputSystem';
import type { InputSystem } from '@systems/InputSystem';
import type { SimulationSystem } from '@systems/SimulationSystem';

interface CombatSlotView {
  pulseRemainingMs: number;
  sectorPulse: Phaser.GameObjects.Graphics;
  zonePulse: Phaser.GameObjects.Graphics;
  uprightContainer: Phaser.GameObjects.Container;
  rotatingContent: Phaser.GameObjects.Container;
}

export class CombatScene extends GameScene {
  private runtime?: CombatRuntime;
  private recordContainer?: Phaser.GameObjects.Container;
  private readonly slotViews = new Map<number, CombatSlotView>();

  private readonly handleSlotActivated = ({ slotIndex }: { slotIndex: number }): void => {
    const slotView = this.slotViews.get(slotIndex);

    if (!slotView) {
      return;
    }

    slotView.pulseRemainingMs = CombatBalanceConfig.SLOT_ACTIVATION_PULSE_DURATION_MS;
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
    publishCombatHudSnapshot(this.runtime!);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.syncCombatPresentation(delta);
  }

  protected createSceneContent(): void {
    this.runtime = createCombatRuntime();
    this.renderStaticCombatLayout();
    on('combat:slot-activated', this.handleSlotActivated);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off('combat:slot-activated', this.handleSlotActivated);
      this.slotViews.clear();
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

    this.renderBackground(model);
    this.renderEnemyLane(model);
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

      rotatingInnerAnchor.setRotation(
        Phaser.Math.DegToRad(slot.innerLabelRotationDeg),
      );

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
        pulseRemainingMs: 0,
        sectorPulse,
        zonePulse,
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
    const graphics = this.add.graphics();
    const x = model.baseHpBar.x - model.baseHpBar.width / 2;
    const y = model.baseHpBar.y - model.baseHpBar.height / 2;

    graphics.setDepth(model.baseHpBar.depth);
    graphics.fillStyle(0x201927, 1);
    graphics.fillRoundedRect(x, y, model.baseHpBar.width, model.baseHpBar.height, 10);
    graphics.fillStyle(0x58f29b, 1);
    graphics.fillRoundedRect(x + 3, y + 3, model.baseHpBar.width - 6, model.baseHpBar.height - 6, 8);

    const label = this.add.text(model.baseHpBar.x, model.baseHpBar.y + 26, 'BASE HP 100/100', {
      color: '#bde7c7',
      fontFamily: 'monospace',
      fontSize: '16px',
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(model.baseHpBar.depth);
  }

  private renderNotePacketAnchor(model: ReturnType<typeof createCombatRenderModel>): void {
    const graphics = this.add.graphics();

    graphics.setDepth(model.notePacketAnchor.depth);
    graphics.lineStyle(3, 0xff89c6, 0.9);
    graphics.strokeCircle(model.notePacketAnchor.x, model.notePacketAnchor.y, 36);
    graphics.lineStyle(2, 0xff89c6, 0.4);
    graphics.strokeCircle(model.notePacketAnchor.x, model.notePacketAnchor.y, 54);

    const label = this.add.text(
      model.notePacketAnchor.x,
      model.notePacketAnchor.y,
      'PACKET',
      {
        color: '#ffd0ec',
        fontFamily: 'monospace',
        fontSize: '16px',
      },
    );
    label.setOrigin(0.5, 0.5);
    label.setDepth(model.notePacketAnchor.depth);
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
    if (!this.runtime || !this.recordContainer) {
      return;
    }

    const recordRotation = Phaser.Math.DegToRad(this.runtime.record.currentAngle);

    this.recordContainer.setRotation(recordRotation);

    for (const slotView of this.slotViews.values()) {
      slotView.uprightContainer.setRotation(-recordRotation);

      if (slotView.pulseRemainingMs <= 0) {
        slotView.sectorPulse.setAlpha(0);
        slotView.zonePulse.setAlpha(0);
        slotView.uprightContainer.setScale(1);
        slotView.rotatingContent.setScale(1);
        continue;
      }

      slotView.pulseRemainingMs = Math.max(0, slotView.pulseRemainingMs - delta);

      const progress =
        slotView.pulseRemainingMs / CombatBalanceConfig.SLOT_ACTIVATION_PULSE_DURATION_MS;
      const alpha = CombatBalanceConfig.SLOT_ACTIVATION_MAX_ALPHA * (0.35 + progress * 0.65);

      slotView.sectorPulse.setAlpha(alpha);
      slotView.zonePulse.setAlpha(alpha * 0.85);
      slotView.uprightContainer.setScale(1 + progress * 0.08);
      slotView.rotatingContent.setScale(1 + progress * 0.05);
    }
  }

  private renderSlotInnerRotatingPresentation(
    slot: ReturnType<typeof createCombatRenderModel>['record']['slots'][number],
    container: Phaser.GameObjects.Container,
  ): void {
    const accentColor = slot.presentation.accentColor;

    const ruleLabel = slot.presentation.rotating.ruleLabel;
    const emptyLabel = slot.presentation.rotating.emptyLabel;
    const labelText = ruleLabel?.text ?? emptyLabel?.text ?? '';
    const labelColor = ruleLabel?.color ?? emptyLabel?.color ?? accentColor;
    const fontSizePx =
      ruleLabel === null
        ? CombatVisualConfig.EMPTY_LABEL_FONT_SIZE_PX
        : CombatVisualConfig.RULE_LABEL_FONT_SIZE_PX;
    const text = this.add.text(0, 0, labelText, {
      color: `#${labelColor.toString(16).padStart(6, '0')}`,
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
