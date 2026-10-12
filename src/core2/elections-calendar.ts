/**
 * When each office is next on the ballot, and when its filing closes.
 *
 * - Federal and state offices: the general election is the Tuesday after the
 *   first Monday in November of the seat's election year; the primary and the
 *   filing deadline come from `data/research/elections/party-nomination-rules-2026.json`
 *   (2026 dates as each state set them; other years from the state's standing
 *   rule).
 * - County offices: the county calendar (`county-election-calendar.ts`, from
 *   each state's county election law).
 * - City and town offices: the state's municipal election timing
 *   (`municipal-ballot-rules.ts`), turned into a date by `MUNICIPAL_DATES`.
 *
 * A seat's election year is the year before its term ends (terms start in the
 * new year, or January 20 for the presidency).
 */
import nomination from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { governmentUnit } from "../simulation/government-units";
import { addDays, makeIsoDate } from "../simulation/dates";
import { resolveMunicipalElectionTiming } from "../simulation/municipal-ballot-rules";
import type { MunicipalElectionTiming } from "../simulation/municipal-election-rules";
import { nextCountyElection } from "../simulation/nationwide-world/county-election-calendar";
import {
  FILING_LEAD_DAYS,
  FILING_LEAD_SOURCE,
  novemberGeneralElectionDay,
} from "../simulation/nationwide-world/town-election-calendar";
import type { OfficeInput } from "./offices-local";

export interface ElectionDates {
  readonly electionDate: string;
  readonly primaryDate: string | null;
  readonly filingOpens: string | null;
  readonly filingDeadline: string;
  /** "read" where each date comes from a law or official calendar; "estimated" otherwise. */
  readonly basis: "read" | "estimated";
  readonly sources: readonly string[];
}

interface DateRule {
  readonly kind: "nth-weekday" | "weekday-after" | "days-before-general";
  readonly days?: number;
  readonly month: number;
  readonly weekday: number;
  readonly nth?: number;
  readonly anchorWeekday?: number;
  readonly anchorNth?: number;
}
interface NominationPlace {
  readonly primary?: {
    readonly rule?: DateRule | null;
    readonly dates2026?: Readonly<Record<string, string>>;
    readonly cite?: string | null;
  };
  readonly filing?: {
    readonly deadlines2026?: Readonly<Record<string, string>>;
    readonly daysBeforePrimary?: number | null;
    readonly cite?: string;
  };
  readonly source?: string;
}
const places = (
  nomination as unknown as { places: Record<string, NominationPlace> }
).places;

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): string {
  if (nth > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const day = 1 + ((weekday - first + 7) % 7) + 7 * (nth - 1);
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  }
  const last = new Date(Date.UTC(year, month, 0));
  const back = (last.getUTCDay() - weekday + 7) % 7;
  const day = last.getUTCDate() - back + 7 * (nth + 1);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function ruleDate(rule: DateRule, year: number): string {
  if (rule.kind === "days-before-general")
    return addDays(novemberGeneralElectionDay(year), -(rule.days ?? 0));
  if (rule.kind === "nth-weekday")
    return nthWeekday(year, rule.month, rule.weekday, rule.nth ?? 1);
  const anchor = nthWeekday(
    year,
    rule.month,
    rule.anchorWeekday ?? 1,
    rule.anchorNth ?? 1,
  );
  return nthWeekday(year, rule.month, rule.weekday, 1) > anchor
    ? nthWeekday(year, rule.month, rule.weekday, 1)
    : nthWeekday(year, rule.month, rule.weekday, 2);
}

/** Which kind of seat the 2026 dates table names an office by. */
function nominationKey(office: OfficeInput): string {
  if (office.kind === "us-senate") return "us-senate";
  if (office.kind.startsWith("us-house")) return "us-house";
  if (office.kind === "governor") return "governor";
  return "all";
}

function stateAndFederal(
  office: OfficeInput,
  stateKey: string,
  year: number,
): ElectionDates {
  const place = places[stateKey] ?? {};
  const electionDate = novemberGeneralElectionDay(year);
  const key = nominationKey(office);
  const read2026 = (table?: Readonly<Record<string, string>>) =>
    year === 2026 ? (table?.[key] ?? table?.all ?? null) : null;
  const primaryDate =
    read2026(place.primary?.dates2026) ??
    (place.primary?.rule ? ruleDate(place.primary.rule, year) : null);
  const deadline =
    read2026(place.filing?.deadlines2026) ??
    (primaryDate && place.filing?.daysBeforePrimary
      ? addDays(makeIsoDate(primaryDate), -place.filing.daysBeforePrimary)
      : null);
  return {
    electionDate,
    primaryDate,
    filingOpens: null,
    filingDeadline:
      deadline ??
      addDays(makeIsoDate(primaryDate ?? electionDate), -FILING_LEAD_DAYS),
    basis:
      deadline && (primaryDate || !place.primary?.rule) ? "read" : "estimated",
    sources: [
      place.source,
      place.primary?.cite,
      place.filing?.cite,
      deadline ? null : FILING_LEAD_SOURCE,
    ].filter((s): s is string => Boolean(s)),
  };
}

/**
 * Each municipal timing rule as a date in a year, and whether that year holds
 * one. The month and weekday are the rule's own words; the day within the
 * month is the first Tuesday where the rule doesn't name one (estimated).
 */
const MUNICIPAL_DATES: Readonly<
  Record<
    MunicipalElectionTiming,
    {
      readonly inYear: (year: number) => boolean;
      readonly date: (year: number) => string;
      readonly read: boolean;
    }
  >
> = {
  "even-year-november-consolidated": {
    inYear: (y) => y % 2 === 0,
    date: novemberGeneralElectionDay,
    read: true,
  },
  "odd-year-november-consolidated": {
    inYear: (y) => y % 2 === 1,
    date: novemberGeneralElectionDay,
    read: true,
  },
  "odd-year-autumn": {
    inYear: (y) => y % 2 === 1,
    date: novemberGeneralElectionDay,
    read: false,
  },
  "autumn-gubernatorial": {
    inYear: (y) => y % 2 === 0,
    date: novemberGeneralElectionDay,
    read: false,
  },
  "even-year-june-consolidated": {
    inYear: (y) => y % 2 === 0,
    date: (y) =>
      ruleDate(
        {
          kind: "weekday-after",
          month: 6,
          weekday: 2,
          anchorWeekday: 1,
          anchorNth: 1,
        },
        y,
      ),
    read: false,
  },
  "even-year-august-consolidated": {
    inYear: (y) => y % 2 === 0,
    date: (y) => nthWeekday(y, 8, 2, 1),
    read: false,
  },
  "even-year-may-consolidated": {
    inYear: (y) => y % 2 === 0,
    date: (y) =>
      ruleDate(
        {
          kind: "weekday-after",
          month: 5,
          weekday: 2,
          anchorWeekday: 1,
          anchorNth: 1,
        },
        y,
      ),
    read: false,
  },
  "odd-year-spring": {
    inYear: (y) => y % 2 === 1,
    date: (y) => nthWeekday(y, 4, 2, 1),
    read: false,
  },
  "spring-annual": {
    inYear: () => true,
    date: (y) => nthWeekday(y, 4, 2, 1),
    read: false,
  },
  "spring-even-year": {
    inYear: (y) => y % 2 === 0,
    date: (y) => nthWeekday(y, 4, 2, 1),
    read: false,
  },
  "annual-spring-april": {
    inYear: () => true,
    date: (y) => nthWeekday(y, 4, 2, 1),
    read: false,
  },
  "annual-spring-may": {
    inYear: () => true,
    date: (y) => nthWeekday(y, 5, 2, 1),
    read: false,
  },
  "annual-autumn-october": {
    inYear: () => true,
    date: (y) => nthWeekday(y, 10, 2, 1),
    read: false,
  },
  "town-meeting-day-march": {
    inYear: () => true,
    date: (y) => nthWeekday(y, 3, 2, 1),
    read: true,
  },
  "town-meeting-day-spring": {
    inYear: () => true,
    date: (y) => nthWeekday(y, 3, 2, 1),
    read: false,
  },
  "quadrennial-summer-june": {
    inYear: (y) => y % 4 === 0,
    date: (y) => nthWeekday(y, 6, 2, 1),
    read: false,
  },
  "quadrennial-late-summer-august": {
    inYear: (y) => y % 4 === 0,
    date: (y) => nthWeekday(y, 8, 2, 4),
    read: false,
  },
};

function municipal(
  stateKey: string,
  placeGeoid: string,
  fromYear: number,
  onDate: string,
): ElectionDates | null {
  const found = resolveMunicipalElectionTiming(stateKey.slice(3), placeGeoid);
  if (!found) return null;
  const timing = MUNICIPAL_DATES[found.timing];
  for (let year = fromYear; year < fromYear + 5; year += 1) {
    if (!timing.inYear(year)) continue;
    const electionDate = timing.date(year);
    const filingDeadline = addDays(
      makeIsoDate(electionDate),
      -FILING_LEAD_DAYS,
    );
    if (filingDeadline < onDate) continue;
    return {
      electionDate,
      primaryDate: null,
      filingOpens: null,
      filingDeadline,
      basis: "estimated",
      sources: [
        `State municipal election law: ${found.timing} (${found.basis})`,
        FILING_LEAD_SOURCE,
      ],
    };
  }
  return null;
}

/**
 * The next regular election for one office's seat, on or after `onDate` with
 * its filing still open where possible: from the year before the seat's term
 * ends, or the first year the office's own calendar holds an election.
 */
export function nextElectionForSeat(input: {
  readonly office: OfficeInput;
  readonly stateKey: string;
  readonly placeGeoid: string;
  readonly termEnd: string | null;
  readonly onDate: string;
}): ElectionDates | null {
  const { office, stateKey, placeGeoid, termEnd, onDate } = input;
  const year = termEnd
    ? Number(termEnd.slice(0, 4)) - 1
    : Number(onDate.slice(0, 4));
  if (office.level === "federal" || office.level === "state")
    return stateAndFederal(
      office,
      stateKey,
      Math.max(year, Number(onDate.slice(0, 4))),
    );
  if (office.level === "county") {
    const unit = governmentUnit(office.jurisdiction);
    const read = unit ? nextCountyElection(unit, makeIsoDate(onDate)) : null;
    if (read?.status === "read")
      return {
        electionDate: read.dates.electionDate,
        primaryDate: read.dates.primaryDate,
        filingOpens: read.dates.qualifyingOpens,
        filingDeadline:
          read.dates.qualifyingCloses ??
          addDays(
            read.dates.primaryDate ?? read.dates.electionDate,
            -FILING_LEAD_DAYS,
          ),
        basis: read.dates.estimated ? "estimated" : "read",
        sources: read.dates.sourceUrls,
      };
    return stateAndFederal(
      office,
      stateKey,
      Math.max(year, Number(onDate.slice(0, 4))),
    );
  }
  return municipal(
    stateKey,
    placeGeoid,
    Math.max(year, Number(onDate.slice(0, 4))),
    onDate,
  );
}
