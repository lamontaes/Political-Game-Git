import { addDays, makeIsoDate } from "../simulation/dates";
import {
  advancePlayerV1,
  resumePlayerV1,
  retirePlayerV1,
  earliestPlayerStopV1,
  type PlayerPacketV1,
  type PlayerMomentV1,
} from "../core2/player-v1";
import { registerModuleStopV1 } from "../core2/player-stops-v1";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import type { CoreState, CoreModule } from "../core2/types";
import type { Director } from "../director/ledger";

// Spec interrupt line; an inspection/stop criterion, never an actor outcome.
export const INTERRUPT_LINE = 0.5;
export function directorStops(director: Director): CoreModule {
  const seen = new Map<string, number>();
  return {
    id: "m0-director-stop-adapter",
    onAfterDay(api) {
      for (const book of director.ledger.people.values()) {
        const from = seen.get(book.personId) ?? book.moments.length;
        seen.set(book.personId, book.moments.length);
        for (const moment of book.moments.slice(from)) {
          if (moment.past || moment.impact < INTERRUPT_LINE) continue;
          registerModuleStopV1(api.state, {
            moduleId: "m0-director-stop-adapter",
            recordId: moment.id,
            controlledPersonId: book.personId,
            at: {
              date: addDays(makeIsoDate(api.state.date), 1),
              minuteOfDay: 0,
            },
            kind: "interrupt",
            reasonKey: moment.label,
            source: api.state.people.get(book.personId)!.source,
            hold: false,
          });
        }
      }
    },
    // Watching opens historical moments; they must never interrupt played time.
    onDay() {
      for (const book of director.ledger.people.values())
        if (!seen.has(book.personId))
          seen.set(book.personId, book.moments.length);
    },
  };
}

export class BenchPlayer {
  packet?: PlayerPacketV1;
  personId?: string;
  constructor(
    readonly core: CoreState,
    readonly director: Director,
  ) {}
  select(id: string) {
    if (!this.core.people.get(id)?.alive)
      throw new Error("Select a living resident.");
    if (this.personId && this.personId !== id) {
      retirePlayerV1(this.core); // Refuses an unfinished day or unanswered choice.
      this.packet = undefined;
    }
    this.personId = id;
    this.director.watch(this.core, id);
  }
  advance(mode: string, date?: string) {
    if (!this.personId) throw new Error("Choose a resident first.");
    const at = this.packet?.at ?? {
      date: addDays(makeIsoDate(this.core.date), 1),
      minuteOfDay: 0,
    };
    const days = mode === "week" ? 7 : mode === "skip" ? 365 : 1;
    const through: PlayerMomentV1 =
      mode === "calendar"
        ? { date: makeIsoDate(date ?? ""), minuteOfDay: 0 }
        : {
            date: addDays(makeIsoDate(at.date), days),
            minuteOfDay: at.minuteOfDay,
          };
    if (!["day", "week", "calendar", "skip"].includes(mode))
      throw new Error("Unknown time control.");
    this.director.setMode(mode === "skip" ? "skipping" : "live");
    let earliest = earliestPlayerStopV1(this.core, {
      controlledPersonId: this.personId,
      through,
    });
    // Probe one civil day at a time: acknowledging a skip must not silently
    // commit the client to hundreds of future days of answers.
    let requestedThrough =
      mode === "skip"
        ? {
            date: addDays(makeIsoDate(at.date), 1),
            minuteOfDay: at.minuteOfDay,
          }
        : through;
    this.packet = advancePlayerV1(this.core, {
      controlledPersonId: this.personId,
      through: requestedThrough,
    });
    while (
      mode === "skip" &&
      this.packet.kind === "complete" &&
      this.packet.at.date < through.date
    ) {
      requestedThrough = {
        date: addDays(makeIsoDate(this.packet.at.date), 1),
        minuteOfDay: this.packet.at.minuteOfDay,
      };
      earliest = earliestPlayerStopV1(this.core, {
        controlledPersonId: this.personId,
        through,
      });
      this.packet = advancePlayerV1(this.core, {
        controlledPersonId: this.personId,
        through: requestedThrough,
      });
    }
    return {
      packet: this.packet,
      earliest,
      through: requestedThrough,
      lookahead: mode === "skip" ? through : undefined,
    };
  }
  resume(input: Parameters<typeof resumePlayerV1>[1]) {
    this.packet = resumePlayerV1(this.core, input);
    return { packet: this.packet };
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
