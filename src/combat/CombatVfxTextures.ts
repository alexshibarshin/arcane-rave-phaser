import Phaser from 'phaser';
import { CombatVfxConfig } from '@config/CombatVfxConfig';

export const COMBAT_VFX_GLOW_TEXTURE_KEY = 'combat-vfx-glow';
export const COMBAT_VFX_RING_TEXTURE_KEY = 'combat-vfx-ring';
export const COMBAT_VFX_BEAM_TEXTURE_KEY = 'combat-vfx-beam';

export function ensureCombatVfxTextures(scene: Phaser.Scene): void {
  ensureGlowTexture(scene);
  ensureRingTexture(scene);
  ensureBeamTexture(scene);
}

function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(COMBAT_VFX_GLOW_TEXTURE_KEY)) {
    return;
  }

  const size = CombatVfxConfig.TEXTURES.GLOW_SIZE_PX;
  const radius = size / 2;
  const graphics = scene.make.graphics();

  graphics.clear();
  graphics.fillStyle(0xffffff, 0.06);
  graphics.fillCircle(radius, radius, radius);
  graphics.fillStyle(0xffffff, 0.16);
  graphics.fillCircle(radius, radius, radius * 0.68);
  graphics.fillStyle(0xffffff, 0.3);
  graphics.fillCircle(radius, radius, radius * 0.42);
  graphics.generateTexture(COMBAT_VFX_GLOW_TEXTURE_KEY, size, size);
  graphics.destroy();
}

function ensureRingTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(COMBAT_VFX_RING_TEXTURE_KEY)) {
    return;
  }

  const size = CombatVfxConfig.TEXTURES.RING_SIZE_PX;
  const radius = size / 2;
  const graphics = scene.make.graphics();

  graphics.clear();
  graphics.lineStyle(6, 0xffffff, 0.95);
  graphics.strokeCircle(radius, radius, radius - 8);
  graphics.lineStyle(2, 0xffffff, 0.35);
  graphics.strokeCircle(radius, radius, radius - 20);
  graphics.generateTexture(COMBAT_VFX_RING_TEXTURE_KEY, size, size);
  graphics.destroy();
}

function ensureBeamTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(COMBAT_VFX_BEAM_TEXTURE_KEY)) {
    return;
  }

  const width = CombatVfxConfig.TEXTURES.BEAM_WIDTH_PX;
  const height = CombatVfxConfig.TEXTURES.BEAM_HEIGHT_PX;
  const graphics = scene.make.graphics();

  graphics.clear();
  graphics.fillStyle(0xffffff, 0.25);
  graphics.fillRoundedRect(0, 0, width, height, height / 2);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillRoundedRect(0, height * 0.25, width, height * 0.5, height / 3);
  graphics.generateTexture(COMBAT_VFX_BEAM_TEXTURE_KEY, width, height);
  graphics.destroy();
}
