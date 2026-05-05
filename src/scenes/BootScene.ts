import Phaser from 'phaser';
import capibaraDjSpriteUrl from '../../art/capibara_dj_s.png';
import { EntityConfig } from '@config/EntitiesConfig';
import { CombatLayoutConfig } from '@config/CombatLayoutConfig';
import { SceneKeys } from '@config/GameConfig';
import { emit } from '@events/EventBus';

/**
 * Минимальная bootstrap-сцена.
 *
 * Держит единое место для preload/bootstrap логики и создаёт один placeholder
 * texture key, чтобы concrete-проекты могли быстро наследоваться от scaffold.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.BOOT });
  }

  preload(): void {
    if (!this.textures.exists(CombatLayoutConfig.BASE_SPRITE_TEXTURE_KEY)) {
      this.load.image(CombatLayoutConfig.BASE_SPRITE_TEXTURE_KEY, capibaraDjSpriteUrl);
    }
  }

  create(): void {
    if (!this.textures.exists(EntityConfig.PLACEHOLDER_TEXTURE_KEY)) {
      const graphics = this.make.graphics();
      graphics.clear();
      graphics.fillStyle(0xff00ff, 1);
      graphics.fillRect(0, 0, 2, 2);
      graphics.generateTexture(EntityConfig.PLACEHOLDER_TEXTURE_KEY, 2, 2);
      graphics.destroy();
    }

    emit('scene:ready', { key: this.scene.key });

    this.scene.start(SceneKeys.STAGE);
  }
}
