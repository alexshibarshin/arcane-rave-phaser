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
  drawSpecialEnemyGlow,
  getGlowColor,
  getGlowAlpha,
} from './presentation/EnemySilhouetteRenderer';
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
  glowGraphics: Phaser.GameObjects.Graphics | null;
  sortY: number;
  hpBarBg: Phaser.GameObjects.Graphics;
  hpBarFill: Phaser.GameObjects.Graphics;
  hpBarX: number;
  hpBarY: number;
  hpBarWidth: number;
  hpBarHeight: number;
  maxHp: number;
  animation: CombatAnimationState;
  idleGlowTween: Phaser.Tweens.Tween | null;
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
  const recycledViews: CombatEnemyView[] = [];
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
    const hpBarWidth = renderModel?.hpBar.width ?? CombatVisualConfig.ENEMY.HP_BAR_WIDTH;
    const hpBarHeight = renderModel?.hpBar.height ?? CombatVisualConfig.ENEMY.HP_BAR_HEIGHT;
    const hpBarOffsetY = renderModel?.hpBar.offsetY ?? CombatVisualConfig.ENEMY.HP_BAR_OFFSET_Y;
    const hpBarX = -hpBarWidth / 2;
    const hpBarY = hpBarOffsetY - hpBarHeight / 2;
    const bodyWidth = renderModel?.body.width ?? CombatVisualConfig.ENEMY.BODY_WIDTH;
    const bodyHeight = renderModel?.body.height ?? CombatVisualConfig.ENEMY.BODY_HEIGHT;

    const isSpecial = enemy.isSpecial === true;
    const specialArchetype = (enemy.archetype === 'elite' || enemy.archetype === 'boss')
      ? enemy.archetype as 'elite' | 'boss'
      : null;

    // Determine fill color: ordinary enemies use palette fill, special use note color
    const fillColor = isSpecial
      ? (renderModel?.body.color ?? CombatVisualConfig.NOTE_COLORS[enemy.color])
      : (CombatVisualConfig.ENEMY.FILL_COLORS[enemy.color] ?? CombatVisualConfig.NOTE_COLORS[enemy.color]);

    // Determine which body render function to use
    const bodyArchetype = isSpecial
      ? mapSpecialMotifToBodyArchetype(enemy.silhouetteMotif ?? '')
      : enemy.archetype;

    // Try to reuse a recycled view
    const recycled = recycledViews.pop();

    if (recycled) {
      const view = recycled;

      // Resolve body children: indices [0] body, [1] flashOverlay, [2] hpBarBg, [3] hpBarFill
      // (glowGraphics may be at index 0 if present, pushing body to [1] etc.)
      const body = view.container.getAt(0) as Phaser.GameObjects.Graphics;
      const flashOverlay = view.container.getAt(1) as Phaser.GameObjects.Graphics;

      body.clear();
      renderEnemyBody(body, bodyArchetype, bodyWidth, bodyHeight, fillColor);

      flashOverlay.clear();
      renderEnemyBody(flashOverlay, bodyArchetype, bodyWidth, bodyHeight, 0xffffff);
      flashOverlay.setAlpha(0);

      // Handle glow: stop old tween, remove old glow if exists, add new if needed
      if (view.idleGlowTween) {
        view.idleGlowTween.stop();
        view.idleGlowTween = null;
      }

      if (view.glowGraphics) {
        view.glowGraphics.clear();
        view.glowGraphics.setVisible(false);
      }

      let glowGraphics: Phaser.GameObjects.Graphics | null = view.glowGraphics;
      let idleGlowTween: Phaser.Tweens.Tween | null = null;

      if (isSpecial && specialArchetype) {
        const shapeRadius = bodyWidth / 2;
        const glowColor = getGlowColor(enemy.color, specialArchetype);
        const baseGlowAlpha = getGlowAlpha(specialArchetype);

        if (!glowGraphics) {
          glowGraphics = options.scene.add.graphics();
          view.container.addAt(glowGraphics, 0);
          view.glowGraphics = glowGraphics;
        }

        glowGraphics.setVisible(true);
        drawSpecialEnemyGlow(glowGraphics, 0, 0, shapeRadius, glowColor, baseGlowAlpha);

        idleGlowTween = options.scene.tweens.add({
          targets: glowGraphics,
          alpha: { from: baseGlowAlpha, to: baseGlowAlpha * 0.7 },
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      // Reset HP bar
      view.hpBarBg.clear();
      view.hpBarBg.fillStyle(0x201927, 1);
      view.hpBarBg.fillRoundedRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 6);

      view.hpBarFill.clear();
      view.hpBarFill.fillStyle(0xff0000, 1);
      view.hpBarFill.fillRoundedRect(
        hpBarX + 2,
        hpBarY + 2,
        hpBarWidth - 4,
        hpBarHeight - 4,
        4,
      );

      view.container.setPosition(enemy.x, enemy.y);
      view.container.setVisible(false);
      view.container.setScale(1);
      view.container.setAlpha(1);
      view.sortY = enemy.y;
      view.maxHp = enemy.maxHp;
      view.idleGlowTween = idleGlowTween;
      view.animation = createInitialAnimationState();

      enemyViews.set(enemy.runtimeId, view);
      return view;
    }

    // No recycled view — create new
    const container = options.scene.add.container(enemy.x, enemy.y);
    const body = options.scene.add.graphics();
    const flashOverlay = options.scene.add.graphics();
    const hpBarBg = options.scene.add.graphics();
    const hpBarFill = options.scene.add.graphics();

    container.name = renderModel?.container.name ?? enemy.renderContainerName;
    container.setDepth(getEnemyContainerDepth(enemy.y));

    let glowGraphics: Phaser.GameObjects.Graphics | null = null;
    let idleGlowTween: Phaser.Tweens.Tween | null = null;

    renderEnemyBody(body, bodyArchetype, bodyWidth, bodyHeight, fillColor);
    renderEnemyBody(flashOverlay, bodyArchetype, bodyWidth, bodyHeight, 0xffffff);

    if (isSpecial && specialArchetype) {
      const shapeRadius = bodyWidth / 2;
      const glowColor = getGlowColor(enemy.color, specialArchetype);
      const baseGlowAlpha = getGlowAlpha(specialArchetype);

      glowGraphics = options.scene.add.graphics();
      drawSpecialEnemyGlow(glowGraphics, 0, 0, shapeRadius, glowColor, baseGlowAlpha);

      idleGlowTween = options.scene.tweens.add({
        targets: glowGraphics,
        alpha: { from: baseGlowAlpha, to: baseGlowAlpha * 0.7 },
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    flashOverlay.setAlpha(0);

    hpBarBg.fillStyle(0x201927, 1);
    hpBarBg.fillRoundedRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 6);

    hpBarFill.fillStyle(0xff0000, 1);
    hpBarFill.fillRoundedRect(
      hpBarX + 2,
      hpBarY + 2,
      hpBarWidth - 4,
      hpBarHeight - 4,
      4,
    );

    const containerChildren: Phaser.GameObjects.GameObject[] = [body, flashOverlay, hpBarBg, hpBarFill];

    if (glowGraphics) {
      containerChildren.unshift(glowGraphics);
    }

    container.add(containerChildren);
    container.setVisible(false);
    options.enemyLayer.add(container);

    const view: CombatEnemyView = {
      container,
      flashOverlay,
      glowGraphics,
      sortY: enemy.y,
      hpBarBg,
      hpBarFill,
      hpBarX,
      hpBarY,
      hpBarWidth,
      hpBarHeight,
      maxHp: enemy.maxHp,
      animation: createInitialAnimationState(),
      idleGlowTween,
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
      view.container.setScale(transform.scale * scaleMultiplier);
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

      view.hpBarFill.clear();
      view.hpBarFill.fillStyle(0xff0000, 1);
      view.hpBarFill.fillRoundedRect(
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

      if (view.idleGlowTween) {
        view.idleGlowTween.stop();
        view.idleGlowTween = null;
      }

      view.container.setVisible(false);
      enemyViews.delete(enemyId);
      recycledViews.push(view);
    },
    clear() {
      for (const view of enemyViews.values()) {
        view.container.destroy();
      }

      for (const view of recycledViews) {
        view.container.destroy();
      }

      enemyViews.clear();
      recycledViews.length = 0;
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
    case 'elite':
      renderBossEnemy(graphics, bodyWidth, bodyHeight, color);
      break;
    default:
      renderBasicEnemy(graphics, bodyWidth, bodyHeight, color);
      break;
  }
}

/**
 * Map a special enemy's silhouette motif to the appropriate rich body
 * render archetype from EnemyRenderer.
 */
function mapSpecialMotifToBodyArchetype(motif: string): string {
  switch (motif) {
    case 'chevron-armor':
      return 'tank';
    case 'satellite-motes':
      return 'swarm';
    case 'motion-trails':
      return 'fast';
    case 'crown-ring':
    case 'ring-wave':
    case 'geometric-petals':
      return 'boss';
    default:
      return 'boss';
  }
}
