import { comingOfAgeOn } from "../director/coming-of-age";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  advancePlayerV1,
  resumePlayerV1,
  retirePlayerV1,
  earliestPlayerStopV1,
  type PlayerPacketV1,
  type PlayerMomentV1,
} from "../core2/player-v1";
import { parameter } from "../core2/parameters";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";
import { onBallotOn } from "./election-night";
import {
  leavePollingPlace,
  markBallot,
  stagedPollingVisit,
  type PollingVisit,
} from "../director/polling-place";

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
  /** The character whose coming-of-age day has stopped an advance. */
  private comingOfAgeShownFor?: string;
  private destination?: { through: PlayerMomentV1; mode: string };
  readonly selfChosen: SelfChosenAnswer[] = [];
  /**
   * The polls, when the next day is an election the character may vote in:
   * the day stops here, before the count that opens election day.
   */
  pollingPlace?: PollingVisit;
  /**
   * Election morning for a candidate with no polling visit (they live
   * outside the town the count reads): the day stops for the canvass all
   * the same, once.
   */
  candidateMorning?: string;
  private readonly candidateMornings = new Set<string>();
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
    this.candidateMorning = undefined;
    const pending = this.packet && this.packet.kind !== "complete";
    if (pending && this.packet!.kind !== "choice")
      throw new Error("Answer the open choice or stop first.");
    const at = this.packet?.at ?? {
      date: addDays(makeIsoDate(this.core.date), 1),
      minuteOfDay: 0,
    };
    // Days start in the morning: Day lands on the
    // next morning, Week on the same morning seven days on, a calendar jump
    // on that day's morning; none lands on midnight.
    const start = this.dayStartMinute();
    // A jump goes to a later day, or to today while its morning is still ahead
    // (the opening night's "now" is the start of tomorrow, before its morning).
    if (
      mode === "calendar" &&
      !(
        date &&
        (date > at.date || (date === at.date && at.minuteOfDay < start))
      )
    )
      throw new Error(
        "A calendar jump can't go backward: pick a day after today.",
      );
    const through: PlayerMomentV1 =
      mode === "calendar"
        ? { date: makeIsoDate(date ?? ""), minuteOfDay: start }
        : mode === "week"
          ? { date: addDays(makeIsoDate(at.date), 7), minuteOfDay: start }
          : {
              date: addDays(
                makeIsoDate(at.date),
                at.minuteOfDay >= start ? 1 : 0,
              ),
              minuteOfDay: start,
            };
    return this.driveTo(through, mode);
  }

  /** The minute the controlled person's day starts, read from the core's parameters. */
  dayStartMinute() {
    // stopgapId: SG-PLAY-day-start-minute
    return parameter("playerDayStartMinute", this.core.data.parameters);
  }

  /**
   * An act that takes hours spends them on the clock the packet reports
   * (a canvass of 3 hours moves the clock 3 hours). A clock already held by
   * an open stop or choice stays where it is until that is answered.
   */
  spend(hours: number) {
    if (!this.personId) throw new Error("Choose a resident first.");
    if (!(hours > 0) || !Number.isFinite(hours)) return undefined;
    if (this.pollingPlace) return undefined;
    if (this.packet && this.packet.kind !== "complete") return undefined;
    const at = this.packet?.at ?? {
      date: addDays(makeIsoDate(this.core.date), 1),
      minuteOfDay: 0,
    };
    const per = parameter("minutesPerHour", this.core.data.parameters),
      day = parameter("hoursPerDay", this.core.data.parameters) * per,
      total = at.minuteOfDay + Math.round(hours * per);
    const through: PlayerMomentV1 = {
      date: addDays(makeIsoDate(at.date), Math.floor(total / day)),
      minuteOfDay: total % day,
    };
    return this.driveTo(through, "day");
  }

  private driveTo(through: PlayerMomentV1, mode: string) {
    const at = this.packet?.at ?? {
      date: addDays(makeIsoDate(this.core.date), 1),
      minuteOfDay: 0,
    };
    // A calendar jump lives like a skip: only what needs the player stops it.
    this.director.setMode(mode === "calendar" ? "skipping" : "live");
    const earliest = earliestPlayerStopV1(this.core, {
      controlledPersonId: this.personId!,
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
    const { through } = this.destination!;
    // Coming of voting age is golden-path step one: an advance that reaches
    // that day stops on it, so the player sees the day it happens.
    // The first advance of a new life starts on the day after the clock shows,
    // so a birthday on the first day is reached from inside the run.
    const began = from.date;
    const person = this.core.people.get(this.personId!);
    const comesOfAge = person ? comingOfAgeOn(person.birthDate) : undefined;
    let packet = start;
    while (true) {
      if (!packet || packet.kind === "complete") {
        if (packet) from = packet.at;
        // The birthday is met in its morning, like any day's first scene
        // (owner, Oct 27: nothing at midnight): the day is lived to its start.
        if (
          comesOfAge === from.date &&
          from.minuteOfDay < this.dayStartMinute() &&
          compareMoments(from, through) < 0 &&
          this.comingOfAgeShownFor !== this.personId
        ) {
          packet = advancePlayerV1(this.core, {
            controlledPersonId: this.personId!,
            through: {
              date: from.date,
              minuteOfDay: Math.min(
                this.dayStartMinute(),
                from.date === through.date
                  ? through.minuteOfDay
                  : this.dayStartMinute(),
              ),
            },
          });
          // This can be the run's first call into the core, which binds its
          // clock to this character.
          this.clockBound = true;
          continue;
        }
        if (packet && this.comesOfAgeStop(comesOfAge, began, from.date)) break;
        if (compareMoments(from, through) >= 0) break;
        // One civil day at most, and never past a midnight: the polls are
        // checked at each midnight before the core enters the next day.
        const next = {
          date: addDays(makeIsoDate(from.date), 1),
          minuteOfDay: 0,
        };
        // Election day is a scene (owner, Oct 14 and 26, 2026): the director
        // stages the polls at the eve's close for a voter the count counts,
        // so election morning, with the choice to go vote, comes before the
        // core enters it. The clock's midnight is the start of the core's
        // next day.
        const polls = stagedPollingVisit(
          this.core,
          this.director.ledger,
          this.personId!,
          addDays(makeIsoDate(this.core.date), 1),
        );
        if (polls) {
          this.pollingPlace = polls;
          break;
        }
        const tomorrow = addDays(makeIsoDate(this.core.date), 1);
        if (
          !this.candidateMornings.has(tomorrow) &&
          // A visit kept for the day (voted, or stayed home) was its morning.
          !this.director.ledger.pollingVisits.has(
            `${this.personId}:${tomorrow}`,
          ) &&
          onBallotOn(this.core, this.personId!, tomorrow)
        ) {
          this.candidateMornings.add(tomorrow);
          this.candidateMorning = tomorrow;
          break;
        }
        packet = advancePlayerV1(this.core, {
          controlledPersonId: this.personId!,
          through: compareMoments(next, through) < 0 ? next : through,
        });
        this.clockBound = true;
        continue;
      }
      if (
        packet.at.minuteOfDay >= this.dayStartMinute() &&
        this.comesOfAgeStop(comesOfAge, began, packet.at.date)
      )
        break;
      // Day never opens a choice list (owner, Oct 14, 2026): the character
      // answers its own choices with the core's selection, and only a stop
      // (a director scene, a fixed commitment or a deadline) ends the advance.
      if (packet.kind === "choice") {
        packet = this.answerForSelf(packet, "advancing");
        continue;
      }
      break;
    }
    if (packet) this.packet = packet;
  }

  /**
   * True once, on the first moment of the day the character comes of voting
   * age, unless the character began that advance already past it.
   */
  private comesOfAgeStop(
    comesOfAge: string | undefined,
    began: string,
    reached: string,
  ) {
    if (!comesOfAge || this.comingOfAgeShownFor === this.personId) return false;
    if (began > comesOfAge || reached < comesOfAge) return false;
    this.comingOfAgeShownFor = this.personId;
    return true;
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
