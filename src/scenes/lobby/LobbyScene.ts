import Phaser from 'phaser';
import { SceneKeys } from '../../config/GameConfig';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.LOBBY });
  }

  create(data?: { showResult?: boolean; stageId?: string }): void {
    // Stub: immediately starts Stage 1 so the loop is functional
    // Full UI in tasks 14–15
    this.scene.start(SceneKeys.STAGE, { stageId: 'redline-routine' });
  }
}
