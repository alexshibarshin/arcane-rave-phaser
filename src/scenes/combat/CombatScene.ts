import Phaser from 'phaser';
import { emit } from '@events/EventBus';
import { SceneKeys } from '@config/GameConfig';
import { GameScene } from '@scenes/GameScene';
import { createCombatRuntime, type CombatRuntime } from '@combat/CombatRuntime';
import { createCombatRenderModel } from '@combat/CombatRenderModel';
import { publishCombatHudSnapshot } from '@combat/CombatHudEvents';
import { CombatStateSystem } from '@systems/CombatStateSystem';
import { CombatDebugInputSystem } from '@systems/CombatDebugInputSystem';
import type { InputSystem } from '@systems/InputSystem';
import type { SimulationSystem } from '@systems/SimulationSystem';

export class CombatScene extends GameScene {
  private runtime?: CombatRuntime;

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

  protected createSceneContent(): void {
    this.runtime = createCombatRuntime();
    this.renderStaticCombatLayout();
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
    const base = this.add.graphics();

    base.setDepth(model.record.base.depth);
    base.fillStyle(0x16111f, 1);
    base.fillCircle(
      model.record.base.centerX,
      model.record.base.centerY,
      model.record.base.radius,
    );
    base.lineStyle(10, 0x2a1f39, 1);
    base.strokeCircle(
      model.record.base.centerX,
      model.record.base.centerY,
      model.record.base.radius - 4,
    );
    base.fillStyle(0x0b0f17, 1);
    base.fillCircle(model.record.base.centerX, model.record.base.centerY, 92);

    for (const slot of model.record.slots) {
      const graphics = this.add.graphics();

      graphics.setDepth(slot.depth);
      graphics.fillStyle(slot.index === 0 ? 0x2f365f : 0x22263a, 0.3);
      this.fillSector(
        graphics,
        model.record.base.centerX,
        model.record.base.centerY,
        slot.outerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );

      graphics.fillStyle(0x0b1320, 0.55);
      this.fillSector(
        graphics,
        model.record.base.centerX,
        model.record.base.centerY,
        slot.innerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );

      graphics.lineStyle(2, slot.index === 0 ? 0xffd166 : 0x81a4c5, 0.9);
      this.strokeSector(
        graphics,
        model.record.base.centerX,
        model.record.base.centerY,
        slot.outerRadius,
        slot.startAngleDeg,
        slot.endAngleDeg,
      );

      const labelPosition = this.getPolarOffset(
        slot.centerAngleDeg,
        (slot.innerRadius + slot.outerRadius) / 2,
      );
      const zonePosition = this.getPolarOffset(slot.centerAngleDeg, slot.innerRadius * 0.62);

      const slotLabel = this.add.text(
        model.record.base.centerX + labelPosition.x,
        model.record.base.centerY + labelPosition.y,
        `S${slot.index}`,
        {
          color: slot.index === 0 ? '#ffd166' : '#dbe6ff',
          fontFamily: 'monospace',
          fontSize: '24px',
        },
      );
      slotLabel.setOrigin(0.5, 0.5);
      slotLabel.setDepth(slot.depth);

      const zoneLabel = this.add.text(
        model.record.base.centerX + zonePosition.x,
        model.record.base.centerY + zonePosition.y,
        'EMPTY',
        {
          color: '#86a8c4',
          fontFamily: 'monospace',
          fontSize: '14px',
        },
      );
      zoneLabel.setOrigin(0.5, 0.5);
      zoneLabel.setDepth(slot.depth);
    }
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
}
