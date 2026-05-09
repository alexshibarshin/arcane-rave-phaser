import Phaser from 'phaser';
import { getEnemyDefinitionById } from '@config/CombatContentConfig';
import {
  renderBasicEnemy,
  renderTankEnemy,
  renderFastEnemy,
  renderRangedEnemy,
  renderSwarmEnemy,
  renderBossEnemy,
} from '@combat/EnemyRenderer';

/** Layout dimensions per variant */
const VARIANT_LAYOUT = {
  lobby: {
    cardWidth: 280,
    cardHeight: 260,
    visualHeight: 200,
    nameFontSize: '20px',
    roleFontSize: '14px',
    cornerRadius: 8,
  },
  'wave-preview': {
    cardWidth: 140,
    cardHeight: 160,
    visualHeight: 110,
    nameFontSize: '16px',
    roleFontSize: '12px',
    cornerRadius: 6,
  },
} as const;

const BG_COLOR = 0x161a22;
const BORDER_COLOR = 0x252d3a;
const FONT_FAMILY = 'Arial, sans-serif';
const NAME_COLOR = '#EAEAEA';
const ROLE_COLOR = 'rgba(255,255,255,0.45)';

/** CombatVisualConfig-style color mapping for enemy rendering. */
const NOTE_COLORS: Record<string, number> = {
  red: 0xe03c3c,
  green: 0x3cc850,
  blue: 0x3c64dc,
};



/**
 * Create a special enemy card for the lobby detail panel or wave preview.
 * Renders a placeholder geometric shape + name + role label.
 */
export function createSpecialEnemyCard(
  scene: Phaser.Scene,
  enemyId: string,
  variant: 'lobby' | 'wave-preview',
): Phaser.GameObjects.Container {
  const layout = VARIANT_LAYOUT[variant];
  const enemyDef = getEnemyDefinitionById(enemyId);
  const displayName = enemyDef?.displayName ?? enemyId;
  const archetype = enemyDef?.archetype ?? 'elite';
  const enemyColor = enemyDef?.color ?? 'red';
  const roleLabel =
    archetype === 'boss' ? 'Boss' : archetype === 'elite' ? 'Elite ' + capitalize(guessRole(displayName)) : '';

  const centerX = layout.cardWidth / 2;
  const visualCenterY = layout.visualHeight / 2;
  const nameY = layout.visualHeight + 8;
  const roleY = nameY + 24;

  // Background
  const bg = scene.add.graphics();
  bg.fillStyle(BG_COLOR, 1);
  bg.fillRoundedRect(0, 0, layout.cardWidth, layout.cardHeight, layout.cornerRadius);

  // Border
  bg.lineStyle(1, BORDER_COLOR, 1);
  bg.strokeRoundedRect(0, 0, layout.cardWidth, layout.cardHeight, layout.cornerRadius);

  // Enemy silhouette using real combat visuals (from EnemyRenderer).
  // All draw calls target origin (0,0); the Graphics object is then
  // positioned at the card center so everything aligns.
  const enemyGfx = scene.add.graphics();
  const bodyColor = NOTE_COLORS[enemyColor] ?? 0xe03c3c;
  const bodyScale = variant === 'lobby' ? 3.2 : 1.6;
  const bodyW = 31 * bodyScale;
  const bodyH = 36 * bodyScale;

  // Position graphics at card center, draw the enemy silhouette
  enemyGfx.setPosition(centerX, visualCenterY);
  renderEnemyByArchetype(enemyGfx, archetype, bodyW, bodyH, bodyColor);

  // Enemy name
  const nameText = scene.add.text(centerX, nameY, displayName, {
    fontFamily: FONT_FAMILY,
    fontSize: layout.nameFontSize,
    color: NAME_COLOR,
  });
  nameText.setOrigin(0.5, 0);

  // Role label
  const roleText = scene.add.text(centerX, roleY, roleLabel, {
    fontFamily: FONT_FAMILY,
    fontSize: layout.roleFontSize,
    color: ROLE_COLOR,
  });
  roleText.setOrigin(0.5, 0);

  const container = scene.add.container(0, 0, [bg, enemyGfx, nameText, roleText]);
  container.setSize(layout.cardWidth, layout.cardHeight);

  return container;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function guessRole(displayName: string): string {
  // Simple heuristic: last word is the role label
  const parts = displayName.split(' ');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    if (['Kick', 'Choir', 'Blur', 'Headliner', 'Monarch', 'Encore'].includes(last)) {
      return last;
    }
  }
  return 'Tank';
}

/** Map known archetypes to the matching render function from EnemyRenderer. */
function renderEnemyByArchetype(
  g: Phaser.GameObjects.Graphics,
  archetype: string,
  bodyWidth: number,
  bodyHeight: number,
  color: number,
): void {
  switch (archetype) {
    case 'basic':
      renderBasicEnemy(g, bodyWidth, bodyHeight, color);
      break;
    case 'tank':
      renderTankEnemy(g, bodyWidth, bodyHeight, color);
      break;
    case 'fast':
      renderFastEnemy(g, bodyWidth, bodyHeight, color);
      break;
    case 'ranged':
      renderRangedEnemy(g, bodyWidth, bodyHeight, color);
      break;
    case 'swarm':
      renderSwarmEnemy(g, bodyWidth, bodyHeight, color);
      break;
    case 'boss':
      renderBossEnemy(g, bodyWidth, bodyHeight, color);
      break;
    default:
      // Fall back to basic for elites with non-standard archetype names
      renderBasicEnemy(g, bodyWidth, bodyHeight, color);
      break;
  }
}


