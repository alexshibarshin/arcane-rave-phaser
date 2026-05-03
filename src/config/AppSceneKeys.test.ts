import { describe, expect, it } from 'vitest';
import { appSceneKeys } from '@config/AppSceneKeys';
import { SceneKeys } from '@config/GameConfig';

describe('appSceneKeys', () => {
  it('uses combat scenes as the production entrypoint order', () => {
    expect(appSceneKeys).toEqual([
      SceneKeys.BOOT,
      SceneKeys.COMBAT,
      SceneKeys.HUD,
    ]);
    expect(appSceneKeys).not.toContain(SceneKeys.GAME);
    expect(appSceneKeys).not.toContain(SceneKeys.UI);
  });
});
