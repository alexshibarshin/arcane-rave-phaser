import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';
import type { CombatVfxSnapshot } from '@combat/CombatVfxSystem';

export class CombatSlotVfxRenderer {
  sync(viewGraph: CombatSceneViewGraph, recordRotationRad: number, vfxSnapshot: CombatVfxSnapshot): void {
    const slotActivations = new Map(
      vfxSnapshot.slotActivations.map((activation) => [activation.slotIndex, activation]),
    );

    for (const [slotIndex, slotView] of viewGraph.record.slotViews.entries()) {
      slotView.uprightContainer.setRotation(-recordRotationRad);
      const activation = slotActivations.get(slotIndex);

      if (!activation) {
        slotView.sectorPulse.setAlpha(0);
        slotView.zonePulse.setAlpha(0);
        slotView.pawnGlow.setAlpha(0);
        slotView.uprightContainer.setScale(1);
        slotView.rotatingContent.setScale(1);
        continue;
      }

      const alpha =
        CombatBalanceConfig.SLOT_ACTIVATION_MAX_ALPHA * (0.35 + activation.sectorAlpha * 0.65);

      slotView.sectorPulse.setAlpha(alpha);
      slotView.zonePulse.setAlpha(alpha * 0.85 * activation.ruleZoneAlpha);
      slotView.pawnGlow.setAlpha(activation.pawnGlowAlpha * 0.85);
      slotView.uprightContainer.setScale(activation.scale);
      slotView.rotatingContent.setScale(
        1 + activation.sectorAlpha * CombatVfxConfig.SLOT.ROTATING_SCALE_BOOST,
      );
    }
  }

  destroy(): void {
    // No owned resources — viewGraph owns the Phaser objects.
  }
}
