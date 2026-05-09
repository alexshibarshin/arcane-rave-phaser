import Phaser from 'phaser';

/** Color-tinted tag specs */
const COLOR_PRESETS: Record<string, { bg: string; border: string; text: string }> = {
  Red: {
    bg: 'rgba(224,60,60,0.25)',
    border: 'rgba(224,60,60,0.6)',
    text: '#FF6B6B',
  },
  Green: {
    bg: 'rgba(60,200,80,0.25)',
    border: 'rgba(60,200,80,0.6)',
    text: '#6BFF8B',
  },
  Blue: {
    bg: 'rgba(60,100,220,0.25)',
    border: 'rgba(60,100,220,0.6)',
    text: '#6B9BFF',
  },
};

const NEUTRAL_COLORS = {
  bg: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.15)',
  text: '#C0C8D0',
};

const PILL_HEIGHT = 28;
const PILL_RADIUS = 20;
const PADDING_H = 12;
const FONT_SIZE = '14px';
const FONT_FAMILY = 'Arial, sans-serif';

/**
 * Create a pill/chip tag for displaying in lobby detail panel and wave preview.
 * Color-tinted tags (Red, Green, Blue) get respective colors; everything else is neutral.
 */
export function createPillTag(
  scene: Phaser.Scene,
  tag: string,
): Phaser.GameObjects.Container {
  const displayText = tag.toUpperCase();
  const colors = COLOR_PRESETS[tag] ?? NEUTRAL_COLORS;

  // Measure text to determine width
  const tempText = scene.add.text(0, 0, displayText, {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
  });
  const textWidth = tempText.width;
  tempText.destroy();

  const pillWidth = Math.max(textWidth + PADDING_H * 2, 48);

  // Background
  const bg = scene.add.graphics();
  const bgColorNum = cssColorToNumber(colors.bg);
  bg.fillStyle(bgColorNum, 1);
  bg.fillRoundedRect(0, 0, pillWidth, PILL_HEIGHT, PILL_RADIUS);

  // Border
  const borderColorNum = cssColorToNumber(colors.border);
  bg.lineStyle(1, borderColorNum, 1);
  bg.strokeRoundedRect(0, 0, pillWidth, PILL_HEIGHT, PILL_RADIUS);

  // Text
  const text = scene.add.text(pillWidth / 2, PILL_HEIGHT / 2, displayText, {
    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE,
    color: colors.text,
  });
  text.setOrigin(0.5, 0.5);

  const container = scene.add.container(0, 0, [bg, text]);
  container.setSize(pillWidth, PILL_HEIGHT);

  return container;
}

/** Parse simple rgba(r,g,b,a) string to Phaser color number (ignoring alpha in the conversion
 *  since fillStyle already handles alpha separately) */
function cssColorToNumber(css: string): number {
  // Handle rgba format
  const rgbaMatch = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10);
    const g = parseInt(rgbaMatch[2]!, 10);
    const b = parseInt(rgbaMatch[3]!, 10);
    return (r << 16) | (g << 8) | b;
  }
  // Hex fallback
  if (css.startsWith('#')) {
    return parseInt(css.slice(1), 16);
  }
  return 0xffffff;
}
