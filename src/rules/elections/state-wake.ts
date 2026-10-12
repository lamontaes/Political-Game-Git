import { addDays, makeIsoDate, type IsoDate } from "./calendar";
import {
  stateLegislativeElectionRule,
  isStateLegislativeSeatDue,
  type LegislativeCalendarFacts,
} from "./legislative-calendar";
import { generalElectionDay, isElectionYear } from "./executive-calendar";
import { fieldIntakeDay } from "./intake-and-calendars";
import { stateCandidateIntakeDay } from "./candidate-intake";
import { stateWakeEventPackKeys } from "./state-filling";
import type { CandidacyPack } from "../../simulation/candidacy-packs";
import type { HistoricalEvent } from "../../simulation/types";
import type { NominationPlan } from "../../simulation/nominations/nomination-rules";
export interface StateLegislatureWake {
  readonly packId: string;
  readonly electionDay: IsoDate;
  readonly stage: "intake" | "nomination" | "ballot" | "election" | "term";
  readonly dueAt: IsoDate;
}
export interface StateWakeFacts {
  readonly pack: CandidacyPack | null;
  readonly seated: boolean;
  readonly currentDate: IsoDate;
  readonly calendar: LegislativeCalendarFacts;
  readonly seats: readonly {
    readonly officeKey: string;
    readonly ordinal: number;
  }[];
  readonly events: readonly HistoricalEvent[];
  readonly planFor: (year: number) => NominationPlan;
  readonly ballotSetDays: number;
  readonly intakeProfile: Parameters<typeof stateCandidateIntakeDay>[2];
}
const stateSlateKey = (seatKey: string, year: number) =>
  `state-legislature-candidates/v1:slate:${seatKey}:${year}`;
const resultsKey = (packId: string, electionDay: IsoDate) =>
  `state-legislature-turnover/v1:${packId}:results:${electionDay}`;
const tagValue = (event: HistoricalEvent, prefix: string) =>
  event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
  null;
export function stateLegislatureWakePlan(
  facts: StateWakeFacts,
  packId: string,
  throughYear: number,
  includeCurrentDate = false,
): readonly StateLegislatureWake[] {
  const pack = facts.pack;
  if (!pack || !facts.seated) return [];
  const usps = pack.jurisdictionKey.replace(/^US-/, "");
  const rule = stateLegislativeElectionRule(usps);
  const seats = facts.seats;
  const filedEvents = facts.events.filter((event) =>
    stateWakeEventPackKeys(event).includes(packId),
  );
  const wakes = new Map<string, StateLegislatureWake>();
  const add = (
    electionDay: IsoDate,
    stage: StateLegislatureWake["stage"],
    dueAt: IsoDate,
  ) => {
    if (
      dueAt > facts.currentDate ||
      (includeCurrentDate && dueAt === facts.currentDate)
    )
      wakes.set(`${electionDay}|${stage}|${dueAt}`, {
        packId,
        electionDay,
        stage,
        dueAt,
      });
  };
  for (
    let year = Number(facts.currentDate.slice(0, 4)) - 4;
    year <= throughYear;
    year++
  ) {
    if (!isElectionYear(rule, year)) continue;
    const electionDay = generalElectionDay(rule, year);
    const plan = facts.planFor(year);
    seats.forEach((seat, index) => {
      if (
        isStateLegislativeSeatDue(
          facts.calendar,
          usps,
          seat.officeKey,
          seat.ordinal,
          year,
        )
      )
        add(
          electionDay,
          "intake",
          fieldIntakeDay(
            stateCandidateIntakeDay(year, index, facts.intakeProfile),
            plan,
            year,
          ),
        );
    });
    if (plan.known && plan.primaryDate < electionDay)
      add(electionDay, "nomination", plan.primaryDate);
    for (const event of filedEvents) {
      const seatKey = tagValue(event, "seat:");
      if (
        !seatKey?.startsWith(`${packId}|`) ||
        ![
          stateSlateKey(seatKey, year),
          `${stateSlateKey(seatKey, year)}:primary`,
          `${stateSlateKey(seatKey, year)}:runoff`,
        ].includes(event.stableKey)
      )
        continue;
      for (const prefix of ["primary-date:", "runoff-date:"]) {
        const date = tagValue(event, prefix);
        if (date) add(electionDay, "nomination", makeIsoDate(date));
      }
    }
    add(electionDay, "ballot", addDays(electionDay, -facts.ballotSetDays));
    add(electionDay, "election", electionDay);
    const results = facts.events.find(
      (event) => event.stableKey === resultsKey(packId, electionDay),
    );
    for (const tag of results?.tags ?? [])
      if (tag.startsWith("term-start:"))
        add(electionDay, "term", makeIsoDate(tag.slice("term-start:".length)));
  }
  return [...wakes.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
