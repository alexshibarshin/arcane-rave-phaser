import { CombatBalanceConfig } from '@config/CombatBalanceConfig';
import { CombatVfxConfig } from '@config/CombatVfxConfig';
import { CombatVisualConfig } from '@config/CombatVisualConfig';
import type { NoteColor } from './CombatRuntime';

export interface CombatVfxAnchor {
  x: number;
  y: number;
}

export interface CombatVfxSlotAnchor extends CombatVfxAnchor {
  hasPawn: boolean;
}

export interface CombatVfxAnchorResolver {
  getSlotAnchor(slotIndex: number): CombatVfxSlotAnchor | null;
  getEnemyAnchor(enemyId: string): CombatVfxAnchor | null;
  getNotePacketAnchor(): CombatVfxAnchor;
  getBaseAnchor(): CombatVfxAnchor;
}

export type CombatVfxEvent =
  | {
    event: 'combat:slot-activated';
    payload: { slotIndex: number };
  }
  | {
    event: 'combat:enemy-hit';
    payload: {
      enemyId: string;
      slotIndex: number;
      attackerColor: NoteColor;
      damage: number;
      currentHp: number;
      maxHp: number;
      wasWeaknessHit: boolean;
    };
  }
  | {
    event: 'combat:generator-notes-emitted';
    payload: {
      slotIndex: number;
      pawnId: string;
      color: NoteColor;
      count: number;
    };
  }
  | {
    event: 'combat:finisher-consumed-notes';
    payload: {
      slotIndex: number;
      pawnId: string;
      color: NoteColor;
      consumedNotes: number;
      multiplier: number;
    };
  }
  | {
    event: 'combat:finisher-output-note-emitted';
    payload: {
      slotIndex: number;
      pawnId: string;
      color: NoteColor;
      count: 1;
    };
  }
  | {
    event: 'combat:note-packet-color-broke';
    payload: {
      previousColor: NoteColor;
      nextColor: NoteColor;
    };
  }
  | {
    event: 'combat:base-damaged';
    payload: {
      current: number;
      max: number;
    };
  }
  | {
    event: 'combat:ended';
    payload: {
      outcome: 'victory' | 'defeat';
    };
  };

interface CombatVfxSlotChannel {
  slotIndex: number;
  hasPawn: boolean;
  elapsedMs: number;
  durationMs: number;
}

interface CombatVfxTimedBeamHit {
  id: string;
  color: NoteColor;
  from: CombatVfxAnchor;
  to: CombatVfxAnchor;
  weakness: boolean;
  elapsedMs: number;
  durationMs: number;
}

interface CombatVfxTimedEnemyHitFlash {
  id: string;
  enemyId: string;
  color: NoteColor;
  anchor: CombatVfxAnchor;
  weakness: boolean;
  elapsedMs: number;
  durationMs: number;
}

interface CombatVfxTimedNoteFlight {
  id: string;
  color: NoteColor;
  from: CombatVfxAnchor;
  to: CombatVfxAnchor;
  direction: 'slot-to-packet' | 'packet-to-slot';
  elapsedMs: number;
  delayMs: number;
  durationMs: number;
}

interface CombatVfxTimedPacketBreakBurst {
  id: string;
  previousColor: NoteColor;
  nextColor: NoteColor;
  anchor: CombatVfxAnchor;
  elapsedMs: number;
  durationMs: number;
}

interface CombatVfxTimedBaseHitFlash {
  id: string;
  anchor: CombatVfxAnchor;
  elapsedMs: number;
  durationMs: number;
}

interface CombatVfxResultEmphasisState {
  outcome: 'victory' | 'defeat';
  elapsedMs: number;
  durationMs: number;
}

export interface CombatVfxSlotActivationSnapshot {
  slotIndex: number;
  hasPawn: boolean;
  sectorAlpha: number;
  ruleZoneAlpha: number;
  pawnGlowAlpha: number;
  scale: number;
}

export interface CombatVfxSnapshot {
  slotActivations: CombatVfxSlotActivationSnapshot[];
  beamHits: Array<{
    id: string;
    color: NoteColor;
    from: CombatVfxAnchor;
    to: CombatVfxAnchor;
    weakness: boolean;
    alpha: number;
    thickness: number;
  }>;
  enemyHitFlashes: Array<{
    id: string;
    enemyId: string;
    color: NoteColor;
    x: number;
    y: number;
    weakness: boolean;
    alpha: number;
    scale: number;
  }>;
  noteFlights: Array<{
    id: string;
    color: NoteColor;
    from: CombatVfxAnchor;
    to: CombatVfxAnchor;
    x: number;
    y: number;
    alpha: number;
    scale: number;
    direction: 'slot-to-packet' | 'packet-to-slot';
    progress: number;
  }>;
  packetBreakBursts: Array<{
    id: string;
    previousColor: NoteColor;
    nextColor: NoteColor;
    x: number;
    y: number;
    alpha: number;
    scale: number;
  }>;
  baseHitFlashes: Array<{
    id: string;
    x: number;
    y: number;
    alpha: number;
    scale: number;
  }>;
  resultEmphasis: null | {
    outcome: 'victory' | 'defeat';
    alpha: number;
    scale: number;
  };
}

export class CombatVfxSystem {
  private readonly slotChannels = new Map<number, CombatVfxSlotChannel>();
  private readonly beamHits: CombatVfxTimedBeamHit[] = [];
  private readonly enemyHitFlashes: CombatVfxTimedEnemyHitFlash[] = [];
  private readonly noteFlights: CombatVfxTimedNoteFlight[] = [];
  private readonly finisherOutputReadyAtMsBySlot = new Map<number, number>();
  private readonly packetBreakBursts: CombatVfxTimedPacketBreakBurst[] = [];
  private readonly baseHitFlashes: CombatVfxTimedBaseHitFlash[] = [];
  private resultEmphasis: CombatVfxResultEmphasisState | null = null;
  private nextBeamId = 1;
  private nextEnemyHitFlashId = 1;
  private nextNoteFlightId = 1;
  private nextPacketBreakBurstId = 1;
  private nextBaseHitFlashId = 1;

  constructor(private readonly anchors: CombatVfxAnchorResolver) {}

  handleEvent(event: CombatVfxEvent): void {
    switch (event.event) {
      case 'combat:slot-activated':
        this.handleSlotActivated(event.payload.slotIndex);
        return;
      case 'combat:enemy-hit':
        this.handleEnemyHit(event.payload);
        return;
      case 'combat:generator-notes-emitted':
        this.handleGeneratorNotesEmitted(event.payload);
        return;
      case 'combat:finisher-consumed-notes':
        this.handleFinisherConsumedNotes(event.payload);
        return;
      case 'combat:finisher-output-note-emitted':
        this.handleFinisherOutputNoteEmitted(event.payload);
        return;
      case 'combat:note-packet-color-broke':
        this.handleNotePacketColorBroke(event.payload);
        return;
      case 'combat:base-damaged':
        this.handleBaseDamaged();
        return;
      case 'combat:ended':
        this.handleCombatEnded(event.payload.outcome);
        return;
    }
  }

  update(deltaMs: number): void {
    for (const [slotIndex, channel] of this.slotChannels.entries()) {
      channel.elapsedMs = Math.min(channel.durationMs, channel.elapsedMs + deltaMs);

      if (channel.elapsedMs >= channel.durationMs) {
        this.slotChannels.delete(slotIndex);
      }
    }

    this.updateTimedEffects(this.beamHits, deltaMs);
    this.updateTimedEffects(this.enemyHitFlashes, deltaMs);
    this.updateDelayedTimedEffects(this.noteFlights, deltaMs);
    this.updateTimedEffects(this.packetBreakBursts, deltaMs);
    this.updateTimedEffects(this.baseHitFlashes, deltaMs);

    if (this.resultEmphasis) {
      this.resultEmphasis.elapsedMs = Math.min(
        this.resultEmphasis.durationMs,
        this.resultEmphasis.elapsedMs + deltaMs,
      );

      if (this.resultEmphasis.elapsedMs >= this.resultEmphasis.durationMs) {
        this.resultEmphasis = null;
      }
    }
  }

  getSnapshot(): CombatVfxSnapshot {
    return {
      slotActivations: [...this.slotChannels.values()].map((channel) => {
        const progress = 1 - channel.elapsedMs / channel.durationMs;

        return {
          slotIndex: channel.slotIndex,
          hasPawn: channel.hasPawn,
          sectorAlpha: progress,
          ruleZoneAlpha: progress,
          pawnGlowAlpha: channel.hasPawn ? progress : 0,
          scale: 1 + progress * CombatVfxConfig.SLOT.UPRIGHT_SCALE_BOOST,
        };
      }),
      beamHits: this.beamHits.map((beam) => {
        const progress = 1 - beam.elapsedMs / beam.durationMs;

        return {
          id: beam.id,
          color: beam.color,
          from: beam.from,
          to: beam.to,
          weakness: beam.weakness,
          alpha: progress,
          thickness: beam.weakness
            ? CombatVfxConfig.BEAM.WEAKNESS_THICKNESS
            : CombatVfxConfig.BEAM.NORMAL_THICKNESS,
        };
      }),
      enemyHitFlashes: this.enemyHitFlashes.map((flash) => {
        const progress = 1 - flash.elapsedMs / flash.durationMs;

        return {
          id: flash.id,
          enemyId: flash.enemyId,
          color: flash.color,
          x: flash.anchor.x,
          y: flash.anchor.y,
          weakness: flash.weakness,
          alpha: progress,
          scale:
            1
            + (1 - progress)
            * (
              flash.weakness
                ? CombatVfxConfig.ENEMY_HIT.WEAKNESS_SCALE_BOOST
                : CombatVfxConfig.ENEMY_HIT.NORMAL_SCALE_BOOST
            ),
        };
      }),
      noteFlights: this.noteFlights
        .filter((flight) => flight.delayMs === 0 || flight.elapsedMs > flight.delayMs)
        .map((flight) => {
          const activeElapsedMs = Math.max(0, flight.elapsedMs - flight.delayMs);
          const progress = Math.min(1, activeElapsedMs / flight.durationMs);
          const x = PhaserMath.lerp(flight.from.x, flight.to.x, progress);
          const baseY = PhaserMath.lerp(flight.from.y, flight.to.y, progress);
          const y =
            baseY - Math.sin(progress * Math.PI) * CombatVfxConfig.NOTE_FLIGHT.ARC_HEIGHT_PX;

          return {
            id: flight.id,
            color: flight.color,
            from: flight.from,
            to: flight.to,
            x,
            y,
            alpha: 1 - progress * CombatVfxConfig.NOTE_FLIGHT.END_ALPHA_FALLOFF,
            scale:
              CombatVfxConfig.NOTE_FLIGHT.BASE_SCALE
              + Math.sin(progress * Math.PI) * CombatVfxConfig.NOTE_FLIGHT.PEAK_SCALE_BOOST,
            direction: flight.direction,
            progress,
          };
        }),
      packetBreakBursts: this.packetBreakBursts.map((burst) => {
        const progress = 1 - burst.elapsedMs / burst.durationMs;

        return {
          id: burst.id,
          previousColor: burst.previousColor,
          nextColor: burst.nextColor,
          x: burst.anchor.x,
          y: burst.anchor.y,
          alpha: progress,
          scale:
            CombatVfxConfig.PACKET_BREAK.BASE_SCALE
            + (1 - progress) * CombatVfxConfig.PACKET_BREAK.SCALE_BOOST,
        };
      }),
      baseHitFlashes: this.baseHitFlashes.map((flash) => {
        const progress = 1 - flash.elapsedMs / flash.durationMs;

        return {
          id: flash.id,
          x: flash.anchor.x,
          y: flash.anchor.y,
          alpha: progress,
          scale: 1 + (1 - progress) * CombatVfxConfig.BASE_HIT.SCALE_BOOST,
        };
      }),
      resultEmphasis:
        this.resultEmphasis === null
          ? null
          : {
            outcome: this.resultEmphasis.outcome,
            alpha: 1 - this.resultEmphasis.elapsedMs / this.resultEmphasis.durationMs,
            scale:
              1
              + (this.resultEmphasis.elapsedMs / this.resultEmphasis.durationMs)
              * CombatVfxConfig.RESULT.SCALE_BOOST,
          },
    };
  }

  private handleSlotActivated(slotIndex: number): void {
    const slotAnchor = this.anchors.getSlotAnchor(slotIndex);

    if (!slotAnchor) {
      return;
    }

    this.slotChannels.set(slotIndex, {
      slotIndex,
      hasPawn: slotAnchor.hasPawn,
      elapsedMs: 0,
      durationMs: CombatBalanceConfig.SLOT_ACTIVATION_PULSE_DURATION_MS,
    });
  }

  private handleEnemyHit(payload: Extract<CombatVfxEvent, { event: 'combat:enemy-hit' }>['payload']): void {
    const slotAnchor = this.anchors.getSlotAnchor(payload.slotIndex);
    const enemyAnchor = this.anchors.getEnemyAnchor(payload.enemyId);

    if (!slotAnchor || !enemyAnchor) {
      return;
    }

    this.beamHits.push({
      id: `beam-hit:${this.nextBeamId}`,
      color: payload.attackerColor,
      from: { x: slotAnchor.x, y: slotAnchor.y },
      to: enemyAnchor,
      weakness: payload.wasWeaknessHit,
      elapsedMs: 0,
      durationMs: CombatVfxConfig.BEAM.DURATION_MS,
    });
    this.nextBeamId += 1;

    this.enemyHitFlashes.push({
      id: `enemy-hit-flash:${this.nextEnemyHitFlashId}`,
      enemyId: payload.enemyId,
      color: payload.attackerColor,
      anchor: enemyAnchor,
      weakness: payload.wasWeaknessHit,
      elapsedMs: 0,
      durationMs: CombatVfxConfig.ENEMY_HIT.DURATION_MS,
    });
    this.nextEnemyHitFlashId += 1;
  }

  private handleGeneratorNotesEmitted(
    payload: Extract<CombatVfxEvent, { event: 'combat:generator-notes-emitted' }>['payload'],
  ): void {
    const slotAnchor = this.anchors.getSlotAnchor(payload.slotIndex);
    const packetAnchor = this.anchors.getNotePacketAnchor();

    if (!slotAnchor) {
      return;
    }

    for (let index = 0; index < payload.count; index += 1) {
      const packetNoteAnchor = getPacketGlyphAnchor(packetAnchor, index, payload.count);
      this.noteFlights.push({
        id: `note-flight:${this.nextNoteFlightId}`,
        color: payload.color,
        from: { x: slotAnchor.x, y: slotAnchor.y },
        to: packetNoteAnchor,
        direction: 'slot-to-packet',
        elapsedMs: 0,
        delayMs: 0,
        durationMs: CombatVfxConfig.NOTE_FLIGHT.DURATION_MS,
      });
      this.nextNoteFlightId += 1;
    }
  }

  private handleFinisherConsumedNotes(
    payload: Extract<CombatVfxEvent, { event: 'combat:finisher-consumed-notes' }>['payload'],
  ): void {
    const slotAnchor = this.anchors.getSlotAnchor(payload.slotIndex);
    const packetAnchor = this.anchors.getNotePacketAnchor();

    if (!slotAnchor) {
      return;
    }

    let latestArrivalMs = 0;

    for (let index = 0; index < payload.consumedNotes; index += 1) {
      const delayMs = index * CombatVfxConfig.FINISHER.INPUT_STAGGER_MS;
      latestArrivalMs = delayMs + CombatVfxConfig.NOTE_FLIGHT.DURATION_MS;
      const packetNoteAnchor = getPacketGlyphAnchor(packetAnchor, index, payload.consumedNotes);
      this.noteFlights.push({
        id: `note-flight:${this.nextNoteFlightId}`,
        color: payload.color,
        from: packetNoteAnchor,
        to: { x: slotAnchor.x, y: slotAnchor.y },
        direction: 'packet-to-slot',
        elapsedMs: 0,
        delayMs,
        durationMs: CombatVfxConfig.NOTE_FLIGHT.DURATION_MS,
      });
      this.nextNoteFlightId += 1;
    }

    this.finisherOutputReadyAtMsBySlot.set(
      payload.slotIndex,
      latestArrivalMs + CombatVfxConfig.FINISHER.OUTPUT_DELAY_MS,
    );
  }

  private handleFinisherOutputNoteEmitted(
    payload: Extract<CombatVfxEvent, { event: 'combat:finisher-output-note-emitted' }>['payload'],
  ): void {
    const slotAnchor = this.anchors.getSlotAnchor(payload.slotIndex);
    const packetAnchor = this.anchors.getNotePacketAnchor();

    if (!slotAnchor) {
      return;
    }

    const delayMs = this.finisherOutputReadyAtMsBySlot.get(payload.slotIndex) ?? 0;
    this.finisherOutputReadyAtMsBySlot.delete(payload.slotIndex);

    for (let index = 0; index < payload.count; index += 1) {
      const packetNoteAnchor = getPacketGlyphAnchor(packetAnchor, index, payload.count);
      this.noteFlights.push({
        id: `note-flight:${this.nextNoteFlightId}`,
        color: payload.color,
        from: { x: slotAnchor.x, y: slotAnchor.y },
        to: packetNoteAnchor,
        direction: 'slot-to-packet',
        elapsedMs: 0,
        delayMs,
        durationMs: CombatVfxConfig.NOTE_FLIGHT.DURATION_MS,
      });
      this.nextNoteFlightId += 1;
    }
  }

  private handleNotePacketColorBroke(
    payload: Extract<CombatVfxEvent, { event: 'combat:note-packet-color-broke' }>['payload'],
  ): void {
    this.packetBreakBursts.push({
      id: `packet-break:${this.nextPacketBreakBurstId}`,
      previousColor: payload.previousColor,
      nextColor: payload.nextColor,
      anchor: this.anchors.getNotePacketAnchor(),
      elapsedMs: 0,
      durationMs: CombatVfxConfig.PACKET_BREAK.DURATION_MS,
    });
    this.nextPacketBreakBurstId += 1;
  }

  private handleBaseDamaged(): void {
    this.baseHitFlashes.push({
      id: `base-hit:${this.nextBaseHitFlashId}`,
      anchor: this.anchors.getBaseAnchor(),
      elapsedMs: 0,
      durationMs: CombatVfxConfig.BASE_HIT.DURATION_MS,
    });
    this.nextBaseHitFlashId += 1;
  }

  private handleCombatEnded(outcome: 'victory' | 'defeat'): void {
    this.resultEmphasis = {
      outcome,
      elapsedMs: 0,
      durationMs: CombatVfxConfig.RESULT.DURATION_MS,
    };
  }

  private updateTimedEffects<T extends { elapsedMs: number; durationMs: number }>(
    effects: T[],
    deltaMs: number,
  ): void {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index]!;

      effect.elapsedMs = Math.min(effect.durationMs, effect.elapsedMs + deltaMs);

      if (effect.elapsedMs >= effect.durationMs) {
        effects.splice(index, 1);
      }
    }
  }

  private updateDelayedTimedEffects<T extends { elapsedMs: number; delayMs: number; durationMs: number }>(
    effects: T[],
    deltaMs: number,
  ): void {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index]!;

      effect.elapsedMs = Math.min(effect.delayMs + effect.durationMs, effect.elapsedMs + deltaMs);

      if (effect.elapsedMs >= effect.delayMs + effect.durationMs) {
        effects.splice(index, 1);
      }
    }
  }
}

const PhaserMath = {
  lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  },
};

function getPacketGlyphAnchor(
  anchor: CombatVfxAnchor,
  index: number,
  count: number,
): CombatVfxAnchor {
  const centerIndex = (count - 1) / 2;
  const distanceFromCenter = Math.abs(index - centerIndex);

  return {
    x: anchor.x + (index - centerIndex) * CombatVisualConfig.NOTE_PACKET.SPACING_X,
    y:
      anchor.y
      - (centerIndex - distanceFromCenter) * CombatVisualConfig.NOTE_PACKET.STACK_RISE_Y,
  };
}
