import Phaser from 'phaser';

export const COMBAT_NOTE_GLYPH_TEXTURE_KEY = 'combat-note-glyph';

export function ensureCombatNoteGlyphTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(COMBAT_NOTE_GLYPH_TEXTURE_KEY)) {
    return;
  }

  const graphics = scene.make.graphics();

  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.lineStyle(2, 0xffffff, 0.95);
  graphics.fillCircle(17, 46, 10);
  graphics.fillRect(22, 10, 5, 36);
  graphics.beginPath();
  graphics.moveTo(24, 10);
  graphics.lineTo(39, 14);
  graphics.lineTo(39, 22);
  graphics.lineTo(27, 19);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokeCircle(17, 46, 10);
  graphics.strokeLineShape(new Phaser.Geom.Line(24, 10, 24, 46));
  graphics.strokeLineShape(new Phaser.Geom.Line(24, 10, 39, 14));
  graphics.strokeLineShape(new Phaser.Geom.Line(39, 14, 39, 22));
  graphics.lineStyle(2, 0xffffff, 0.45);
  graphics.strokeLineShape(new Phaser.Geom.Line(14, 39, 22, 34));

  graphics.generateTexture(COMBAT_NOTE_GLYPH_TEXTURE_KEY, 48, 64);
  graphics.destroy();
}
