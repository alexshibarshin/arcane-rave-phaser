import Phaser from 'phaser';
import {
  getCombatPawnDefinitionById,
  getScaledPawnDamage,
  type CombatPawnDefinition,
} from '@config/CombatContentConfig';

export function findPawnDefinition(id: string): CombatPawnDefinition | undefined {
  return getCombatPawnDefinitionById(id);
}

export function getPawnAccentColor(color: CombatPawnDefinition['color']): number {
  switch (color) {
    case 'red':
      return 0xff7a96;
    case 'green':
      return 0x7ef2a1;
    case 'blue':
      return 0x63d7ff;
  }
}

export function formatPawnTitle(pawn: CombatPawnDefinition): string {
  return pawn.displayName;
}

export function createPawnSprite(
  scene: Phaser.Scene,
  pawn: CombatPawnDefinition,
  size: number,
): Phaser.GameObjects.Image {
  const sprite = scene.add.image(pawn.art.offsetX, pawn.art.offsetY, pawn.art.textureKey, pawn.art.frame);
  sprite.setOrigin(0.5, 0.5);
  sprite.setDisplaySize(size, size);
  return sprite;
}

export function createRuleLabelContainer(
  scene: Phaser.Scene,
  pawn: CombatPawnDefinition,
  accentColor: number,
): Phaser.GameObjects.Container {
  const white = '#f5f7ff';
  const accentHex = `#${accentColor.toString(16).padStart(6, '0')}`;

  let glyphs: Array<{ text: string; color: string; fontSize: number }>;

  if (pawn.type === 'generator') {
    glyphs = [
      { text: '+', color: white, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
    ];
  } else {
    const outputHex = pawn.outputNoteColor
      ? `#${getPawnAccentColor(pawn.outputNoteColor).toString(16).padStart(6, '0')}`
      : accentHex;
    glyphs = [
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '♪', color: accentHex, fontSize: 20 },
      { text: '>', color: white, fontSize: 20 },
      { text: '♪', color: outputHex, fontSize: 20 },
    ];
  }

  const textObjects = glyphs.map((glyph) => {
    const text = scene.add.text(0, 0, glyph.text, {
      color: glyph.color,
      fontFamily: 'monospace',
      fontSize: `${glyph.fontSize}px`,
      fontStyle: glyph.text === '>' ? 'normal' : 'bold',
    });
    text.setOrigin(0.5, 0.5);
    return text;
  });

  const totalWidth = textObjects.reduce((width, text) => width + text.width, 0);
  let offsetX = -totalWidth / 2;

  for (const text of textObjects) {
    text.x = offsetX;
    offsetX += text.width;
  }

  return scene.add.container(0, 0, textObjects);
}

export function getPawnTooltipDescription(
  pawn: CombatPawnDefinition,
  tier: number,
): string {
  const damage = getScaledPawnDamage(pawn.ability.damage, tier);

  const template = pawn.tooltip.shortDescription?.trim();
  if (template) {
    return template.replace(/{damage}/g, String(damage));
  }

  const secondary = pawn.ability.secondaryEffect;

  switch (pawn.ability.primaryArchetype) {
    case 'projectile':
      if (pawn.ability.pattern === 'single-shot') {
        return `Single precise shot for ${damage} damage.`;
      }
      if (pawn.ability.pattern === 'shotgun-spread') {
        const healSuffix = secondary?.kind === 'base-heal-from-damage'
          ? ` Heals the base for ${Math.round(secondary.healPercent * 100)}% of damage dealt.`
          : '';
        return `Burst of ${pawn.ability.projectileCount ?? 1} projectiles for ${damage} damage each.${healSuffix}`;
      }
      if (secondary?.kind === 'bounce-on-hit') {
        return `Burst of ${pawn.ability.volleyShotCount ?? 1} shots for ${damage} damage. Each shot can bounce once.`;
      }
      if (secondary?.kind === 'split-on-hit') {
        return `Burst of ${pawn.ability.volleyShotCount ?? 1} shots for ${damage} damage. On hit, each shot splits into ${secondary.childCount}.`;
      }
      return `Burst volley of ${pawn.ability.volleyShotCount ?? 1} shots for ${damage} damage.`;
    case 'explosion':
      if (pawn.ability.pattern === 'delayed-blast') {
        const burnSuffix = secondary?.kind === 'burn-zone-on-detonation'
          ? ` Leaves a burning zone for ${formatSeconds(secondary.zoneDurationMs)}.`
          : '';
        return `After ${formatSeconds(pawn.ability.delayMs ?? 0)}, detonates for ${damage} damage in a ${pawn.ability.radius} radius.${burnSuffix}`;
      }
      if (secondary?.kind === 'high-hp-bonus-damage') {
        return `Targeted burst for ${damage} damage in a ${pawn.ability.radius} radius. Deals +${Math.round(secondary.bonusDamagePercent * 100)}% to high-HP targets.`;
      }
      return `Targeted burst for ${damage} damage in a ${pawn.ability.radius} radius.`;
    case 'beam':
      if (pawn.ability.pattern === 'lock-on-beam') {
        return `Locks a beam for ${formatSeconds(pawn.ability.durationMs)}, ticking ${damage} damage every ${formatSeconds(pawn.ability.tickIntervalMs ?? 0)}. If the target dies, the beam jumps to the next frontmost enemy.`;
      }
      if (secondary?.kind === 'slow-on-hit') {
        return `Deploys a static emitter that sweeps a beam upward for ${formatSeconds(pawn.ability.durationMs)}. New crossings take ${damage} damage and ${Math.round((1 - secondary.slowMultiplier) * 100)}% slow for ${formatSeconds(secondary.durationMs)}.`;
      }
      return `Deploys a static emitter that sweeps a beam upward for ${formatSeconds(pawn.ability.durationMs)} dealing ${damage} damage on crossings.`;
    case 'zone':
      if (secondary?.kind === 'next-slot-damage-buff') {
        return `Creates a ${pawn.ability.radius}-radius field for ${formatSeconds(pawn.ability.durationMs)}. Buffs the next slot by ${Math.round(secondary.damageBonusPercent * 100)}% damage.`;
      }
      return `Creates a ${pawn.ability.radius}-radius zone for ${formatSeconds(pawn.ability.durationMs)}, dealing ${damage} damage every ${formatSeconds(pawn.ability.tickIntervalMs)}.`;
  }
}

function formatSeconds(durationMs: number): string {
  const seconds = durationMs / 1000;
  return Number.isInteger(seconds) ? `${seconds} sec.` : `${seconds.toFixed(1)} sec.`;
}
