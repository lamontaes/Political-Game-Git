import { addDays, makeIsoDate } from "../core2/kernel/dates";
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
import {
  leavePollingPlace,
  markBallot,
  pollingVisitDue,
  type PollingVisit,
} from "../director/polling-place";

// Spec interrupt line, shown on screen; the director owns the stop itself.
export const INTERRUPT_LINE = 0.5;

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
  why: "advancing" | "finishing-day-before-switch";
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
  /**
   * The polls, when the next day is an election the character may vote in:
   * the day stops here, before the count that opens election day.
   */
  pollingPlace?: PollingVisit;
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
      // A character who has died has no day left to live out.
      if (this.core.people.get(this.personId!)?.alive) this.finishDay();
      retirePlayerV1(this.core);
      this.clockBound = false;
      this.packet = undefined;
    }
    this.personId = id;
    this.director.watch(this.core, id);
    // Their household too: a talk at home opens on the biggest recorded
    // event of either person, which the director reads from its ledger
    // (owner, Oct 14, 2026, night).
    const person = this.core.people.get(id)!;
    for (const memberId of this.core.households.get(person.householdId)
      ?.memberIds ?? [])
      if (memberId !== id && this.core.people.get(memberId)?.alive)
        this.director.watch(this.core, memberId);
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

  /**
   * Dev mode takes the clock: the character lives out the rest of its day on
   * its own choices and the core's player clock is retired. The character
   * stays selected; the next play-screen advance binds the clock again.
   */
  release() {
    if (!this.clockBound) return;
    this.finishDay();
    retirePlayerV1(this.core);
    this.clockBound = false;
    this.packet = undefined;
    this.destination = undefined;
  }

  /** The character makes the core's own pick, saved as its own decision. */
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
      kind: "own-choice",
      pauseId: packet.pauseId,
    });
  }

  /** Day, Week, or a calendar jump to a later day. */
  advance(mode: string, date?: string) {
    if (!this.personId) throw new Error("Choose a resident first.");
    if (!["day", "week", "calendar"].includes(mode))
      throw new Error("Unknown time control.");
    if (this.pollingPlace)
      throw new Error("Vote or leave the polling place first.");
    const pending = this.packet && this.packet.kind !== "complete";
    if (pending && this.packet!.kind !== "choice")
      throw new Error("Answer the open choice or stop first.");
    const at = this.packet?.at ?? {
      date: addDays(makeIsoDate(this.core.date), 1),
      minuteOfDay: 0,
    };
    if (mode === "calendar" && !(date && date > at.date))
      throw new Error(
        "A calendar jump can't go backward: pick a day after today.",
      );
    const days = mode === "week" ? 7 : 1;
    const through: PlayerMomentV1 =
      mode === "calendar"
        ? { date: makeIsoDate(date ?? ""), minuteOfDay: 0 }
        : {
            date: addDays(makeIsoDate(at.date), days),
            minuteOfDay: at.minuteOfDay,
          };
    // A calendar jump lives like a skip: only what needs the player stops it.
    this.director.setMode(mode === "calendar" ? "skipping" : "live");
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
    const skipping = mode === "calendar";
    let packet = start;
    while (true) {
      if (!packet || packet.kind === "complete") {
        if (packet) from = packet.at;
        if (compareMoments(from, through) >= 0) break;
        const next = {
          date: addDays(makeIsoDate(from.date), 1),
          minuteOfDay: from.minuteOfDay,
        };
        // Election day is a scene (owner, Oct 14, 2026): the count opens the
        // day, so the character's day stops at the polls before the core
        // enters it. The clock's midnight is the start of the core's next day.
        const polls = pollingVisitDue(
          this.core,
          this.director.ledger,
          this.personId!,
          addDays(makeIsoDate(this.core.date), 1),
        );
        if (polls) {
          this.pollingPlace = polls;
          break;
        }
        packet = advancePlayerV1(this.core, {
          controlledPersonId: this.personId!,
          through: compareMoments(next, through) < 0 ? next : through,
        });
        this.clockBound = true;
        continue;
      }
      // Day never opens a choice list (owner, Oct 14, 2026): the character
      // answers its own choices with the core's selection, and only a stop
      // (a director scene, a fixed commitment or a deadline) ends the advance.
      if (packet.kind === "choice") {
        packet = this.answerForSelf(packet, "advancing");
        continue;
      }
      // A routine shift the character attends on its own never stops a
      // skip (owner, Oct 12): the character answers the shift's choice itself.
      if (
        packet.kind === "stop" &&
        skipping &&
        !packet.stop.modules.length &&
        packet.stop.work
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

  /** The character marks one race at the polls: a candidate, or null to leave it blank. */
  markBallot(contestId: string, candidateId: string | null) {
    const visit = this.pollingPlace;
    if (!visit) throw new Error("The polls aren't open for this character.");
    const record = markBallot(
      this.core,
      this.director.ledger,
      visit,
      contestId,
      candidateId,
    );
    this.pollingPlace =
      record.status === "voted" ? undefined : { ...visit, record };
    return record;
  }

  /** The character leaves the polls; the races left unmarked are their own to decide. */
  leavePolls() {
    const visit = this.pollingPlace;
    if (!visit) throw new Error("The polls aren't open for this character.");
    this.pollingPlace = undefined;
    return leavePollingPlace(this.director.ledger, visit);
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
