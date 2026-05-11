import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { getCombatBaseHpBarFillMetrics } from '@combat/CombatBaseHpBar';
import type { CombatRuntime } from '@combat/CombatRuntime';
import type { CombatSceneViewGraph } from '../CombatSceneViewGraph';

/**
 * Thin adapter — updates fill rect and label text.
 * Interface is nearly as complex as implementation.
 */
export class CombatBaseHpBarPresenter {
  sync(viewGraph: CombatSceneViewGraph, runtime: CombatRuntime): void {
    const hpBar = viewGraph.base.hpBar;
    const innerPadding = 3;
    const innerWidth = hpBar.width - innerPadding * 2;
    const innerHeight = hpBar.height - innerPadding * 2;
    const metrics = getCombatBaseHpBarFillMetrics(runtime.baseHp, CombatBalanceConfig.BASE_HP, innerWidth);

    hpBar.fill.clear();
    hpBar.fill.fillStyle(0x58f29b, 1);
    hpBar.fill.fillRoundedRect(
      hpBar.x + innerPadding,
      hpBar.y + innerPadding,
      metrics.width,
      innerHeight,
      8,
    );
    hpBar.label.setText(`${runtime.baseHp}/${CombatBalanceConfig.BASE_HP}`);
  }

  destroy(): void {
    // No owned resources.
  }
}
