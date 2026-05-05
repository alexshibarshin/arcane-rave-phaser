import Phaser from 'phaser';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { CombatRuntime, CombatEnemyState } from './CombatRuntime';
import { getCombatBaseHpBarFillMetrics } from './CombatBaseHpBar';
import {
  advanceAnimationState,
  expireAnimationTimers,
  computeAnimationTransform,
  type CombatAnimationState,
} from '@scenes/combat/CombatAnimationTransforms';
import { computeDeathKnockbackOffset, type CombatPoint } from '@scenes/combat/CombatDeathKnockback';
import type { CombatRenderModel } from './CombatRenderModel';
import {
  renderBasicEnemy,
  renderTankEnemy,
  renderFastEnemy,
  renderRangedEnemy,
  renderSwarmEnemy,
  renderBossEnemy,
} from './EnemyRenderer';

export interface CombatEnemyView {
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

export interface SyncCombatEnemyViewOptions {
  deltaMs: number;
  elapsedMs: number;
  needlePoint: CombatPoint;
}

export interface CombatEnemyViewRegistry {
  ensureEnemyView(enemy: CombatRuntime['enemies'][number]): CombatEnemyView;
  syncEnemyView(
    enemy: CombatRuntime['enemies'][number],
    options: SyncCombatEnemyViewOptions,
  ): CombatEnemyView;
  markEnemyHit(enemyId: string, atMs: number, currentHp: number, maxHp: number): void;
  getEnemyView(enemyId: string): CombatEnemyView | null;
  getEnemyAnchor(enemyId: string): CombatPoint | null;
  listEnemyViews(): Iterable<CombatEnemyView>;
  removeEnemyView(enemyId: string): void;
  clear(): void;
}

interface CreateCombatEnemyViewRegistryOptions {
  scene: Phaser.Scene;
  enemyLayer: Phaser.GameObjects.Layer;
  renderModel: CombatRenderModel;
}

export function createCombatEnemyViewRegistry(
  options: CreateCombatEnemyViewRegistryOptions,
): CombatEnemyViewRegistry {
  const enemyViews = new Map<string, CombatEnemyView>();
  const renderModelsByRuntimeId = new Map(
    options.renderModel.enemies.map((enemy) => [enemy.runtimeId, enemy]),
  );

  const ensureEnemyView = (
    enemy: CombatRuntime['enemies'][number],
  ): CombatEnemyView => {
    const existing = enemyViews.get(enemy.runtimeId);

    if (existing) {
      return existing;
    }

    const renderModel = renderModelsByRuntimeId.get(enemy.runtimeId);
    const container = options.scene.add.container(enemy.x, enemy.y);
    const body = options.scene.add.graphics();
    const flashOverlay = options.scene.add.graphics();
    const hpBar = options.scene.add.graphics();
    const hpBarWidth = renderModel?.hpBar.width ?? CombatVisualConfig.ENEMY.HP_BAR_WIDTH;
    const hpBarHeight = renderModel?.hpBar.height ?? CombatVisualConfig.ENEMY.HP_BAR_HEIGHT;
    const hpBarOffsetY = renderModel?.hpBar.offsetY ?? CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y;
    const hpBarX = -hpBarWidth / 2;
    const hpBarY = hpBarOffsetY - hpBarHeight / 2;
    const bodyWidth = renderModel?.body.width ?? CombatVisualConfig.ENEMY.BODY_WIDTH;
    const bodyHeight = renderModel?.body.height ?? CombatVisualConfig.ENEMY.BODY_HEIGHT;
    const bodyColor = renderModel?.body.color ?? CombatVisualConfig.NOTE_COLORS[enemy.color];

    container.name = renderModel?.container.name ?? enemy.renderContainerName;
    container.setDepth(getEnemyContainerDepth(enemy.y));

    renderEnemyBody(body, enemy.archetype, bodyWidth, bodyHeight, bodyColor);
    renderEnemyBody(flashOverlay, enemy.archetype, bodyWidth, bodyHeight, 0xffffff);
    flashOverlay.setAlpha(0);

    hpBar.fillStyle(0x201927, 1);
    hpBar.fillRoundedRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 6);
    hpBar.fillStyle(0xff0000, 1);
    hpBar.fillRoundedRect(
      hpBarX + 2,
      hpBarY + 2,
      hpBarWidth - 4,
      hpBarHeight - 4,
      4,
    );

    container.add([body, flashOverlay, hpBar]);
    container.setVisible(false);
    options.enemyLayer.add(container);

    const view: CombatEnemyView = {
      container,
      flashOverlay,
      sortY: enemy.y,
      hpBar,
      hpBarX,
      hpBarY,
      hpBarWidth,
      hpBarHeight,
      maxHp: enemy.maxHp,
      animation: createInitialAnimationState(),
    };

    enemyViews.set(enemy.runtimeId, view);
    return view;
  };

  return {
    ensureEnemyView,
    syncEnemyView(enemy, syncOptions) {
      const view = ensureEnemyView(enemy);
      const anim = view.animation;
      const runtimeState = enemy.state as CombatEnemyState;

      view.sortY = enemy.y;
      view.maxHp = enemy.maxHp;
      view.container.setPosition(enemy.x, enemy.y);
      view.container.setDepth(getEnemyContainerDepth(view.sortY));
      view.container.setScale(1);
      view.container.setAlpha(1);
      view.flashOverlay.setAlpha(0);

      if (!enemy.spawned) {
        view.container.setVisible(false);
        return view;
      }

      if (runtimeState === 'attacking' && anim.lastState !== 'attacking' && anim.attackFlashAt === 0) {
        anim.attackFlashAt = syncOptions.elapsedMs;
      }

      if (runtimeState === 'dead' && anim.lastState !== 'dead') {
        anim.deathStartX = enemy.x;
        anim.deathStartY = enemy.y;
        const knockback = computeDeathKnockbackOffset(syncOptions.needlePoint, {
          x: enemy.x,
          y: enemy.y,
        });
        anim.deathKnockbackX = knockback.x;
        anim.deathKnockbackY = knockback.y;
        anim.deathDurationMs = enemy.archetype === 'boss'
          ? CombatVisualConfig.ANIMATION.DEATH_BOSS_DURATION_MS
          : CombatVisualConfig.ANIMATION.DEATH_DURATION_MS;
      }

      const updatedAnim = expireAnimationTimers(
        advanceAnimationState(anim, runtimeState, syncOptions.deltaMs),
        syncOptions.elapsedMs,
      );
      Object.assign(anim, updatedAnim);

      view.container.setVisible(runtimeState !== 'dead' || anim.deathProgress < 1);

      const scaleMultiplier = enemy.archetype === 'boss'
        ? CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS.boss
        : CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS[
          enemy.archetype as keyof typeof CombatVisualConfig.ENEMY.SCALE_MULTIPLIERS
        ] ?? 1;

      const transform = computeAnimationTransform({
        anim,
        enemyState: enemy.state,
        elapsed: syncOptions.elapsedMs,
        deltaMs: syncOptions.deltaMs,
        scaleMultiplier,
      });

      const baseX = runtimeState === 'dead' ? anim.deathStartX : enemy.x;
      const baseY = runtimeState === 'dead' ? anim.deathStartY : enemy.y;
      view.container.setPosition(baseX + transform.xShift, baseY + transform.yShift);
      view.container.setScale(transform.scale);
      view.container.setAlpha(transform.alpha);

      if (transform.tint !== null) {
        view.flashOverlay.setAlpha(0.95);
      }

      return view;
    },
    markEnemyHit(enemyId, atMs, currentHp, maxHp) {
      const view = enemyViews.get(enemyId);

      if (!view) {
        return;
      }

      view.animation.hitFlashAt = atMs;

      const innerPadding = 2;
      const innerWidth = view.hpBarWidth - innerPadding * 2;
      const innerHeight = view.hpBarHeight - innerPadding * 2;
      const metrics = getCombatBaseHpBarFillMetrics(currentHp, maxHp, innerWidth);

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
    },
    getEnemyView(enemyId) {
      return enemyViews.get(enemyId) ?? null;
    },
    getEnemyAnchor(enemyId) {
      const view = enemyViews.get(enemyId);

      if (!view) {
        return null;
      }

      return {
        x: view.container.x,
        y: view.container.y - 4,
      };
    },
    listEnemyViews() {
      return enemyViews.values();
    },
    removeEnemyView(enemyId) {
      const view = enemyViews.get(enemyId);

      if (!view) {
        return;
      }

      view.container.destroy();
      enemyViews.delete(enemyId);
    },
    clear() {
      for (const view of enemyViews.values()) {
        view.container.destroy();
      }

      enemyViews.clear();
    },
  };
}

function createInitialAnimationState(): CombatAnimationState {
  return {
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
  };
}

function getEnemyContainerDepth(sortY: number): number {
  return CombatLayoutConfig.DEPTH.PAWNS + sortY / 1000;
}

function renderEnemyBody(
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
