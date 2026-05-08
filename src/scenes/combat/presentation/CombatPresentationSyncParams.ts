import Phaser from 'phaser';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

export interface CombatPresentationSyncParams {
  scene: Phaser.Scene;
  viewGraph: CombatSceneViewGraph;
  runtime: CombatRuntime;
  vfxSnapshot: CombatVfxSnapshot;
  deltaMs: number;
  notePacketElapsedMs: number;
  recordRotationRad: number;
}
