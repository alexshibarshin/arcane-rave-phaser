import Phaser from 'phaser';
import { EntityConfig } from '@config/EntitiesConfig';
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

    this.scene.start(SceneKeys.GAME);
  }
}
