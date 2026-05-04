import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { CombatNotePacketRuntime } from './CombatRuntime';

interface CombatNotePacketAnchor {
  x: number;
  y: number;
}

export interface CombatNotePacketViewInstance {
  id: string;
  color: NonNullable<CombatNotePacketRuntime['color']>;
  tint: number;
  x: number;
  y: number;
  scale: number;
}

export function createCombatNotePacketViewModel(
  packet: CombatNotePacketRuntime,
  anchor: CombatNotePacketAnchor,
  elapsedMs: number,
): CombatNotePacketViewInstance[] {
  if (packet.color === null || packet.count <= 0) {
    return [];
  }

  const centerIndex = (packet.count - 1) / 2;
  const bouncePhase =
    (elapsedMs % CombatVisualConfig.NOTE_PACKET.BOUNCE_PERIOD_MS)
    / CombatVisualConfig.NOTE_PACKET.BOUNCE_PERIOD_MS;
  const bounceOffsetY =
    (1 - Math.cos(bouncePhase * Math.PI * 2))
    * CombatVisualConfig.NOTE_PACKET.BOUNCE_AMPLITUDE_Y;

  return packet.visuals.map((id, index) => {
    const distanceFromCenter = Math.abs(index - centerIndex);
    const bounceWeight =
      centerIndex === 0 ? 1 : Math.max(0, 1 - distanceFromCenter / centerIndex);

    return {
      id,
      color: packet.color!,
      tint: CombatVisualConfig.NOTE_COLORS[packet.color!],
      x: anchor.x + (index - centerIndex) * CombatVisualConfig.NOTE_PACKET.SPACING_X,
      y:
        anchor.y
        - (centerIndex - distanceFromCenter)
          * CombatVisualConfig.NOTE_PACKET.STACK_RISE_Y
        + bounceOffsetY * bounceWeight,
      scale: CombatVisualConfig.NOTE_PACKET.GLYPH_SCALE,
    };
  });
}
