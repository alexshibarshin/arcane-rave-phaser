import { BootScene } from '@scenes/BootScene';
import { CombatScene } from '@scenes/combat/CombatScene';
import { HUDScene } from '@scenes/combat/HUDScene';
import { LobbyScene } from '@scenes/lobby/LobbyScene';
import { StageScene } from '@scenes/stage/StageScene';

export const appScenes = [BootScene, LobbyScene, StageScene, CombatScene, HUDScene];
