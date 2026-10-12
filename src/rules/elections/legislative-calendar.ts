import { addDays, type IsoDate } from "./calendar";
import {
  generalElectionDay,
  isElectionYear,
  type ElectionTimingRule,
} from "./executive-calendar";
export interface LegislativeCalendarFacts {
  readonly reviewedCycles: readonly StateLegislativeSeatCycle[];
  readonly fieldClosesDaysBefore: number;
}
export const STATE_LEGISLATIVE_CALENDAR_PROFILE =
  "ocd-state-legislative-calendar-game-profile/v1";

const EVEN_YEARS: ElectionTimingRule = {
  cycleYears: 2,
  referenceYear: 2026,
  day: "first-tuesday-after-first-monday-in-november",
};

const ODD_YEAR_STATES: Readonly<Record<string, ElectionTimingRule>> = {
  NJ: {
    cycleYears: 2,
    referenceYear: 2025,
    day: "first-tuesday-after-first-monday-in-november",
  },
  VA: {
    cycleYears: 2,
    referenceYear: 2025,
    day: "first-tuesday-after-first-monday-in-november",
  },
  LA: {
    cycleYears: 4,
    referenceYear: 2027,
    day: "first-tuesday-after-first-monday-in-november",
  },
  MS: {
    cycleYears: 4,
    referenceYear: 2027,
    day: "first-tuesday-after-first-monday-in-november",
  },
};

export interface StateLegislativeSeatCycle {
  readonly stateUsps: string;
  readonly officeKey: string;
  readonly cohort: "all" | "even-ordinal" | "odd-ordinal";
  readonly election: ElectionTimingRule;
  readonly sourceStatus: "official-primary-reviewed-not-source-admitted";
  readonly sourceUrls: readonly string[];
  readonly sourceLocator: string;
}

function cohortIncludes(
  cohort: StateLegislativeSeatCycle["cohort"],
  ordinal: number,
): boolean {
  return (
    cohort === "all" ||
    (cohort === "even-ordinal" && ordinal % 2 === 0) ||
    (cohort === "odd-ordinal" && ordinal % 2 === 1)
  );
}

export function stateLegislativeSeatElectionRule(
  facts: LegislativeCalendarFacts,
  stateUsps: string,
  officeKey: string,
  ordinal: number | null,
): ElectionTimingRule {
  const reviewed = facts.reviewedCycles.filter(
    (row) =>
      row.stateUsps === stateUsps.toUpperCase() && row.officeKey === officeKey,
  );
  if (reviewed.length === 0) return stateLegislativeElectionRule(stateUsps);
  if (ordinal === null || !Number.isInteger(ordinal) || ordinal < 1) {
    const wholeChamber = reviewed.find((row) => row.cohort === "all");
    if (wholeChamber) return wholeChamber.election;
    throw new Error(
      "Choose a recorded district to date this legislative race.",
    );
  }
  const cohort = reviewed.find((row) => cohortIncludes(row.cohort, ordinal));
  if (!cohort) throw new Error("No regular election cycle covers this seat.");
  return cohort.election;
}

export function isStateLegislativeSeatDue(
  facts: LegislativeCalendarFacts,
  stateUsps: string,
  officeKey: string,
  ordinal: number,
  year: number,
): boolean {
  return isElectionYear(
    stateLegislativeSeatElectionRule(facts, stateUsps, officeKey, ordinal),
    year,
  );
}

export function stateLegislativeElectionRule(
  stateUsps: string,
): ElectionTimingRule {
  return ODD_YEAR_STATES[stateUsps.toUpperCase()] ?? EVEN_YEARS;
}

export interface StateLegislativeElection {
  readonly electionDate: IsoDate;
  readonly fieldClosesOn: IsoDate;
  readonly basis: typeof STATE_LEGISLATIVE_CALENDAR_PROFILE;
}

export function nextStateLegislativeElection(
  facts: LegislativeCalendarFacts,
  stateUsps: string,
  onDate: IsoDate,
  seat: {
    readonly officeKey: string;
    readonly ordinal: number | null;
  } | null = null,
): StateLegislativeElection {
  const rule = seat
    ? stateLegislativeSeatElectionRule(
        facts,
        stateUsps,
        seat.officeKey,
        seat.ordinal,
      )
    : stateLegislativeElectionRule(stateUsps);
  for (let year = Number(onDate.slice(0, 4)); ; year += 1) {
    if (!isElectionYear(rule, year)) continue;
    const electionDate = generalElectionDay(rule, year);
    const closes = addDays(electionDate, -facts.fieldClosesDaysBefore);
    if (onDate < closes)
      return {
        electionDate,
        fieldClosesOn: closes,
        basis: STATE_LEGISLATIVE_CALENDAR_PROFILE,
      };
  }
}

// stopgapId: "SG-P14-elections-legislative-calendar-default"
