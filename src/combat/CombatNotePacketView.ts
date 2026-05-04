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
  const floatPhase =
    ((elapsedMs % CombatVisualConfig.NOTE_PACKET.FLOAT_PERIOD_MS)
      / CombatVisualConfig.NOTE_PACKET.FLOAT_PERIOD_MS)
    * Math.PI
    * 2;

  return packet.visuals.map((id, index) => {
    const distanceFromCenter = Math.abs(index - centerIndex);
    const baseY =
      anchor.y
      - (centerIndex - distanceFromCenter) * CombatVisualConfig.NOTE_PACKET.STACK_RISE_Y;
    const floatAmplitude = Math.max(
      1,
      CombatVisualConfig.NOTE_PACKET.FLOAT_AMPLITUDE_Y
        - distanceFromCenter * CombatVisualConfig.NOTE_PACKET.FLOAT_OUTER_NOTE_FALLOFF_Y,
    );
    const instancePhase =
      floatPhase
      + CombatVisualConfig.NOTE_PACKET.FLOAT_PHASE_OFFSET_RAD
      + index * CombatVisualConfig.NOTE_PACKET.FLOAT_PHASE_STEP_RAD;
    const floatOffsetY = Math.round(Math.sin(instancePhase) * floatAmplitude);

    return {
      id,
      color: packet.color!,
      tint: CombatVisualConfig.NOTE_COLORS[packet.color!],
      x: anchor.x + (index - centerIndex) * CombatVisualConfig.NOTE_PACKET.SPACING_X,
      y: baseY + floatOffsetY,
      scale: CombatVisualConfig.NOTE_PACKET.GLYPH_SCALE,
    };
  });
}
