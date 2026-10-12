import { addDays, makeIsoDate } from "../simulation/dates";
import {
  advancePlayerV1,
  resumePlayerV1,
  retirePlayerV1,
  earliestPlayerStopV1,
  type PlayerPacketV1,
  type PlayerMomentV1,
} from "../core2/player-v1";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";

// Spec interrupt line, shown on screen; the director owns the stop itself.
export const INTERRUPT_LINE = 0.5;
// Developer lookahead for "skip until needed", not simulation calibration.
const SKIP_LOOKAHEAD_DAYS = 365;

type ChoicePacket = Extract<PlayerPacketV1, { kind: "choice" }>;
const compareMoments = (a: PlayerMomentV1, b: PlayerMomentV1) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.minuteOfDay - b.minuteOfDay;

/** One answer the character gave for itself while the player skipped. */
export interface SelfChosenAnswer {
  pauseId: string;
  personId: string;
  at: PlayerMomentV1;
  offerId: string;
  actionId: string;
  targetId: string;
  why: "skipping" | "finishing-day-before-switch";
}

/**
 * The offer the character's own scoring picked when the core issued the
 * choice (`chooseAct`: traits, needs, relationships, money). The bench never
 * scores or ranks; it reads the core's selection.
 */
export function ownPick(packet: ChoicePacket) {
  const selected = packet.decision.selected;
  if (!selected) return undefined;
  return packet.offers.find(
    (offer) =>
      offer.actionId === selected.definition.id &&
      offer.targetId === selected.targetId,
  );
}

export class BenchPlayer {
  packet?: PlayerPacketV1;
  personId?: string;
  /** True once the core's player clock is bound to `personId`. */
  private clockBound = false;
  private destination?: { through: PlayerMomentV1; mode: string };
  readonly selfChosen: SelfChosenAnswer[] = [];
  constructor(
    readonly core: CoreState,
    readonly director: Director,
  ) {}

  /** Takes control of a living resident. Viewing someone never calls this. */
  select(id: string) {
    if (!this.core.people.get(id)?.alive)
      throw new Error("Select a living resident.");
    if (this.personId === id) return;
    if (this.clockBound) {
      this.finishDay();
      retirePlayerV1(this.core);
      this.clockBound = false;
      this.packet = undefined;
    }
    this.personId = id;
    this.director.watch(this.core, id);
  }

  /**
   * Before control moves, the current character lives out the rest of its
   * day on its own choices. A stop on the way is acknowledged (it was this
   * character's, and the player chose to leave); a held deadline can't be
   * waived, so the switch is refused until its owner releases it.
   */
  private finishDay() {
    let packet = this.packet!;
    for (let guard = 0; ; guard++) {
      if (guard > 10_000) throw new Error("The day did not finish.");
      if (packet.kind === "choice")
        packet = this.answerForSelf(packet, "finishing-day-before-switch");
      else if (packet.kind === "stop") {
        const pauseId = packet.pauseId;
        packet = resumePlayerV1(this.core, { kind: "stop", pauseId });
        if (packet.kind === "stop" && packet.pauseId === pauseId)
          throw new Error(
            "A held deadline is still open for this character; it must be settled before you switch.",
          );
      } else if (packet.at.minuteOfDay !== 0)
        packet = advancePlayerV1(this.core, {
          controlledPersonId: this.personId!,
          through: {
            date: addDays(makeIsoDate(packet.at.date), 1),
            minuteOfDay: 0,
          },
        });
      else break;
    }
    this.packet = packet;
  }

  // Stopgap SG-PLAY-skip-own-choice-attribution: the core's own pick is
  // resumed as a player answer, so its saved act reads "controlled:".
  private answerForSelf(packet: ChoicePacket, why: SelfChosenAnswer["why"]) {
    const offer = ownPick(packet);
    if (!offer)
      throw new Error("The core issued a choice without its own selection.");
    this.selfChosen.push({
      pauseId: packet.pauseId,
      personId: packet.controlledPersonId,
      at: packet.at,
      offerId: offer.offerId,
      actionId: offer.actionId,
      targetId: offer.targetId,
      why,
    });
    return resumePlayerV1(this.core, {
      kind: "choice",
      pauseId: packet.pauseId,
      offerId: offer.offerId,
    });
  }

  /** `lookaheadDays` shortens a skip's leg; the screen runs a long skip in legs. */
  advance(mode: string, date?: string, lookaheadDays?: number) {
    if (!this.personId) throw new Error("Choose a resident first.");
    if (!["day", "week", "calendar", "skip"].includes(mode))
      throw new Error("Unknown time control.");
    const pending = this.packet && this.packet.kind !== "complete";
    if (pending && !(mode === "skip" && this.packet!.kind === "choice"))
      throw new Error("Answer the open choice or stop first.");
    const at = this.packet?.at ?? {
      date: addDays(makeIsoDate(this.core.date), 1),
      minuteOfDay: 0,
    };
    const days =
      mode === "week"
        ? 7
        : mode === "skip"
          ? Math.min(lookaheadDays ?? SKIP_LOOKAHEAD_DAYS, SKIP_LOOKAHEAD_DAYS)
          : 1;
    const through: PlayerMomentV1 =
      mode === "calendar"
        ? { date: makeIsoDate(date ?? ""), minuteOfDay: 0 }
        : {
            date: addDays(makeIsoDate(at.date), days),
            minuteOfDay: at.minuteOfDay,
          };
    this.director.setMode(mode === "skip" ? "skipping" : "live");
    const earliest = earliestPlayerStopV1(this.core, {
      controlledPersonId: this.personId,
      through,
    });
    this.destination = { through, mode };
    const answeredBefore = this.selfChosen.length;
    this.run(this.packet?.kind === "choice" ? this.packet : undefined, at);
    return {
      packet: this.packet!,
      earliest,
      through,
      selfChosen: this.selfChosen.slice(answeredBefore),
    };
  }

  /**
   * Drives toward the current destination one civil day per core call, so a
   * paused clock's own target is never more than a day ahead: answering or
   * leaving a pause can't commit anyone to the rest of a week or a year.
   */
  private run(start: PlayerPacketV1 | undefined, from: PlayerMomentV1) {
    const { through, mode } = this.destination!;
    let packet = start;
    while (true) {
      if (!packet || packet.kind === "complete") {
        if (packet) from = packet.at;
        if (compareMoments(from, through) >= 0) break;
        const next = {
          date: addDays(makeIsoDate(from.date), 1),
          minuteOfDay: from.minuteOfDay,
        };
        packet = advancePlayerV1(this.core, {
          controlledPersonId: this.personId!,
          through: compareMoments(next, through) < 0 ? next : through,
        });
        this.clockBound = true;
        continue;
      }
      // While skipping, the character answers its own choices with the
      // core's selection; only a stop (a big moment, a fixed commitment or a
      // deadline) ends the skip, at that stop's own time.
      if (packet.kind === "choice" && mode === "skip") {
        packet = this.answerForSelf(packet, "skipping");
        continue;
      }
      // A shift ending needs nothing from the player; the skip carries on.
      if (
        packet.kind === "stop" &&
        mode === "skip" &&
        !packet.stop.modules.length &&
        packet.stop.work?.reasons.every((row) => row.boundary === "end")
      ) {
        packet = resumePlayerV1(this.core, {
          kind: "stop",
          pauseId: packet.pauseId,
        });
        continue;
      }
      break;
    }
    if (packet) this.packet = packet;
  }

  /** The player's answer, then onward to the same destination. */
  resume(input: Parameters<typeof resumePlayerV1>[1]) {
    const answeredBefore = this.selfChosen.length;
    const packet = resumePlayerV1(this.core, input);
    this.packet = packet;
    if (this.destination) this.run(packet, packet.at);
    return {
      packet: this.packet,
      selfChosen: this.selfChosen.slice(answeredBefore),
    };
  }

  trace(id: string) {
    const coreTrace = resolveSavedTraceV1(this.core, id);
    for (const book of this.director.ledger.people.values()) {
      const moment = book.momentsById.get(id);
      if (moment)
        return {
          ...coreTrace,
          recordKind: "director-moment",
          status: "saved-director-record",
          savedMoment: moment,
          causeTrace: resolveSavedTraceV1(this.core, moment.causeId),
          scoresStatus: "none-saved", // Channels are saved impact contributions, not choice scores.
        };
    }
    return coreTrace;
  }
}
