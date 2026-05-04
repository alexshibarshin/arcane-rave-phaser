import Phaser from 'phaser';

export const COMBAT_NOTE_GLYPH_TEXTURE_KEY = 'combat-note-glyph';

export function ensureCombatNoteGlyphTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(COMBAT_NOTE_GLYPH_TEXTURE_KEY)) {
    return;
  }

  const graphics = scene.make.graphics();

  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.lineStyle(6, 0xffffff, 1);
  graphics.fillCircle(24, 50, 16);
  graphics.fillCircle(52, 40, 16);
  graphics.fillRect(36, 2, 10, 46);
  graphics.beginPath();
  graphics.moveTo(41, 2);
  graphics.lineTo(66, 10);
  graphics.lineTo(66, 24);
  graphics.lineTo(46, 18);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokeLineShape(new Phaser.Geom.Line(41, 2, 41, 56));
  graphics.strokeLineShape(new Phaser.Geom.Line(41, 2, 66, 10));
  graphics.strokeLineShape(new Phaser.Geom.Line(66, 10, 66, 24));

  graphics.generateTexture(COMBAT_NOTE_GLYPH_TEXTURE_KEY, 72, 72);
  graphics.destroy();
}
