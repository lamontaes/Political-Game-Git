import { addDays, makeIsoDate, type IsoDate } from "./calendar";
import { nextTownElection, novemberGeneralElectionDay } from "./town-calendar";
import type { MunicipalElectionTiming } from "../../simulation/municipal-election-rules";
import type { ResolvedMunicipalElectionTiming } from "../../simulation/municipal-ballot-rules";
export interface LocalCalendarFacts {
  readonly timing: ResolvedMunicipalElectionTiming | null;
  readonly profile: {
    readonly filingLeadDays: number;
    readonly primaryLeadDays: number;
  };
}
type ElectionDayBasis =
  "state-law-unverified" | "local-choice-estimated" | "game-default";

export interface TownElectionDay {
  readonly electionDate: IsoDate;
  readonly cadenceYears: number;
  readonly timing: MunicipalElectionTiming | null;
  readonly basis: ElectionDayBasis;
}

interface SeasonRule {
  readonly month: number;
  readonly years: "every" | "even" | "odd" | "fourth";
}

const SEASONS: Partial<Record<MunicipalElectionTiming, SeasonRule>> = {
  "even-year-june-consolidated": { month: 6, years: "even" },
  "even-year-august-consolidated": { month: 8, years: "even" },
  "even-year-may-consolidated": { month: 5, years: "even" },
  "odd-year-autumn": { month: 11, years: "odd" },
  "odd-year-spring": { month: 4, years: "odd" },
  "spring-annual": { month: 4, years: "every" },
  "spring-even-year": { month: 4, years: "even" },
  "annual-spring-april": { month: 4, years: "every" },
  "annual-spring-may": { month: 5, years: "every" },
  "annual-autumn-october": { month: 10, years: "every" },
  "autumn-gubernatorial": { month: 11, years: "even" },
  "town-meeting-day-march": { month: 3, years: "every" },
  "town-meeting-day-spring": { month: 3, years: "every" },
  "quadrennial-summer-june": { month: 6, years: "fourth" },
  "quadrennial-late-summer-august": { month: 8, years: "fourth" },
};

const CADENCE: Record<SeasonRule["years"], number> = {
  every: 1,
  even: 2,
  odd: 2,
  fourth: 4,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function firstTuesday(year: number, month: number): IsoDate {
  if (month === 11) return novemberGeneralElectionDay(year);
  for (let day = 1; day <= 7; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCDay() === 2)
      return makeIsoDate(`${year}-${pad(month)}-${pad(day)}`);
  }
  throw new Error(`No Tuesday found in ${year}-${month}.`);
}

function yearFits(year: number, years: SeasonRule["years"]): boolean {
  if (years === "every") return true;
  if (years === "even") return year % 2 === 0;
  if (years === "odd") return year % 2 === 1;
  return year % 4 === 0;
}

export function nextTownElectionDay(
  facts: LocalCalendarFacts,
  onDate: IsoDate,
): TownElectionDay {
  const P = facts.profile;
  const lead = P.filingLeadDays + P.primaryLeadDays;
  const read = nextTownElection(
    facts.timing,
    addDays(onDate, P.primaryLeadDays),
    P.filingLeadDays,
  );
  if (read)
    return {
      electionDate: read.electionDate,
      cadenceYears: 2,
      timing: read.timing,
      basis: read.basis,
    };
  const timing = facts.timing;
  const season = timing ? SEASONS[timing.timing] : undefined;
  const rule = season ?? { month: 11, years: "odd" as const };
  const earliest = addDays(onDate, lead);
  for (let year = Number(onDate.slice(0, 4)); ; year += 1) {
    if (!yearFits(year, rule.years)) continue;
    const day = firstTuesday(year, rule.month);
    if (day >= earliest)
      return {
        electionDate: day,
        cadenceYears: CADENCE[rule.years],
        timing: timing?.timing ?? null,
        basis: "game-default",
      };
  }
}

// stopgapId: "SG-P14-elections-local-calendar-default"
