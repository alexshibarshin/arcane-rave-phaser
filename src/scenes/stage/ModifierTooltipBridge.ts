import type Phaser from 'phaser';
import type { ModifierIconView } from './ModifierIconRenderer';

export interface ModifierTooltipState {
  modifierId: string;
  slotIndex: number;
}

type ModifierInspectionScene = Phaser.Scene & {
  modifierTooltipHoldTimer?: Phaser.Time.TimerEvent;
  tooltipLockedByDrag?: boolean;
};

export function bindModifierInspection(
  scene: Phaser.Scene,
  iconView: ModifierIconView,
  tooltipState: ModifierTooltipState,
  onShow: (state: ModifierTooltipState) => void,
  onHide: () => void,
): void {
  const inspectionScene = scene as ModifierInspectionScene;

  iconView.container.on('pointerdown', () => {
    inspectionScene.modifierTooltipHoldTimer?.remove(false);
    inspectionScene.modifierTooltipHoldTimer = scene.time.delayedCall(150, () => {
      onShow(tooltipState);
    });
  });

  iconView.container.on('pointerout', () => {
    inspectionScene.modifierTooltipHoldTimer?.remove(false);
    inspectionScene.modifierTooltipHoldTimer = undefined;

    if (!inspectionScene.tooltipLockedByDrag) {
      onHide();
    }
  });
}
