import Phaser from 'phaser';
import { getEnemyDefinitionById } from '@config/CombatContentConfig';

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

/** Archetype-to-color mapping for placeholder visual shape */
const ENEMY_COLOR_CSS: Record<string, string> = {
  red: '#FF4040',
  green: '#40E040',
  blue: '#4080FF',
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

  // Placeholder visual shape (colored circle/hexagon based on archetype)
  const shapeColor = cssColorToNumber(ENEMY_COLOR_CSS[enemyColor] ?? '#FF4040');
  const shapeRadius = variant === 'lobby' ? 62 : 36;
  bg.fillStyle(shapeColor, 0.3);
  bg.fillCircle(centerX, visualCenterY, shapeRadius);
  bg.lineStyle(2, shapeColor, 0.6);
  bg.strokeCircle(centerX, visualCenterY, shapeRadius);

  // Glow ring
  bg.fillStyle(shapeColor, 0.08);
  bg.fillCircle(centerX, visualCenterY, shapeRadius * 1.35);

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

  const container = scene.add.container(0, 0, [bg, nameText, roleText]);
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

function cssColorToNumber(css: string): number {
  if (css.startsWith('#')) {
    return parseInt(css.slice(1), 16);
  }
  const rgbaMatch = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10);
    const g = parseInt(rgbaMatch[2]!, 10);
    const b = parseInt(rgbaMatch[3]!, 10);
    return (r << 16) | (g << 8) | b;
  }
  return 0xffffff;
}
