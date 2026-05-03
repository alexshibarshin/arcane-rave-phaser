import Phaser from 'phaser';
import { SceneKeys } from '@config/GameConfig';
import { emit } from '@events/EventBus';

/**
 * Overlay-сцена для UI и debug-слоя.
 *
 * По умолчанию не рендерит ничего, но задаёт отдельную сцену, которую concrete
 * проект может безопасно расширять под интерфейс, оверлеи и диагностические
 * панели.
 */
export class UIScene extends Phaser.Scene {
  constructor(key: string = SceneKeys.UI) {
    super({ key });
  }

  create(): void {
    emit('scene:ready', { key: this.scene.key });
    emit('ui:ready');
  }
}
