import Phaser from 'phaser';
import { EventBus } from '@events/EventBus';
import { appScenes } from '@config/AppScenes';
import { GameConfig } from '@config/GameConfig';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GameConfig.VIEWPORT_WIDTH,
  height: GameConfig.VIEWPORT_HEIGHT,
  backgroundColor: GameConfig.BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: appScenes,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

const game = new Phaser.Game(config);

EventBus.on('game:ready', () => {
  // Scaffold runtime is ready.
});

export { game, EventBus };
