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
import { resolveMunicipalElectionTiming } from "./gov-rules/municipal-ballot-rules";
import type { MunicipalElectionTiming } from "./gov-rules/municipal-election-rules";
import { nextCountyElection } from "./gov-rules/county-election-calendar";
import {
  FILING_LEAD_DAYS,
  FILING_LEAD_SOURCE,
  novemberGeneralElectionDay,
} from "./gov-rules/town-election-calendar";
import type { OfficeInput } from "./offices-local";
import {
  cycleHolds,
  filingDeadlineIn,
  officeStateKey,
  primaryIn,
  takeOfficeDate,
  termRuleFor,
} from "./term-rules";

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
  // The term rule row for the office in this state dates the primary and
  // the filing deadline (data/elections/term-rules.json).
  const row = termRuleFor(stateKey, office);
  if (row?.primary && row.filing) {
    const primaryDate = primaryIn(row, year, key);
    const deadline = filingDeadlineIn(row, year, key, primaryDate);
    return {
      electionDate,
      primaryDate,
      filingOpens: null,
      filingDeadline:
        deadline ??
        addDays(makeIsoDate(primaryDate ?? electionDate), -FILING_LEAD_DAYS),
      basis:
        row.primary.tag === "SOURCED" && row.filing.tag === "SOURCED"
          ? "read"
          : "estimated",
      sources: [
        row.electionDay?.citation,
        row.primary.citation,
        row.filing.citation,
        deadline ? null : FILING_LEAD_SOURCE,
      ].filter((s): s is string => Boolean(s)),
    };
  }
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

/** The office's next election from `onDate`, its calendar read from `year` on. */
function nextFrom(
  office: OfficeInput,
  stateKey: string,
  placeGeoid: string,
  year: number,
  onDate: string,
): ElectionDates | null {
  let from = Math.max(year, Number(onDate.slice(0, 4)));
  if (office.level === "federal" || office.level === "state") {
    // The first year from `from` the office's term rule holds its election
    // (an odd-year state, a four-year chamber, a two-year governor).
    const row = termRuleFor(stateKey, office);
    if (row)
      for (let tries = 0; tries < 8; tries += 1) {
        if (cycleHolds(row, office, from) !== false) break;
        from += 1;
      }
    return stateAndFederal(office, stateKey, from);
  }
  if (office.level === "county") {
    const unit = governmentUnit(office.jurisdiction);
    const read = unit ? nextCountyElection(unit, makeIsoDate(onDate)) : null;
    if (read?.status === "read") {
      // A partisan county office's primary and filing deadline follow the
      // state's party nomination rule where the county calendar names none.
      const row = termRuleFor(stateKey, office);
      const year = Number(read.dates.electionDate.slice(0, 4));
      const primaryDate =
        read.dates.primaryDate ?? (row ? primaryIn(row, year, "all") : null);
      const deadline =
        read.dates.qualifyingCloses ??
        (row && !read.dates.primaryDate
          ? filingDeadlineIn(row, year, "all", primaryDate)
          : null);
      return {
        electionDate: read.dates.electionDate,
        primaryDate:
          primaryDate && primaryDate < read.dates.electionDate
            ? primaryDate
            : null,
        filingOpens: read.dates.qualifyingOpens,
        filingDeadline:
          deadline ??
          addDays(primaryDate ?? read.dates.electionDate, -FILING_LEAD_DAYS),
        basis: read.dates.estimated ? "estimated" : "read",
        sources: [
          ...read.dates.sourceUrls,
          ...(row?.primary && !read.dates.primaryDate
            ? [row.primary.citation]
            : []),
        ],
      };
    }
    return stateAndFederal(office, stateKey, from);
  }
  return municipal(stateKey, placeGeoid, from, onDate);
}

/**
 * The office's regular election in one year, after `onDate`, or null where
 * its calendar holds none that year (a county or town that votes only in odd
 * or even years).
 */
export function electionInYear(input: {
  readonly office: OfficeInput;
  readonly stateKey: string;
  readonly placeGeoid: string;
  readonly year: number;
  readonly onDate: string;
}): ElectionDates | null {
  const { office, stateKey, placeGeoid, year, onDate } = input;
  if (office.level === "federal" || office.level === "state") {
    const row = termRuleFor(stateKey, office);
    if (row && cycleHolds(row, office, year) === false) return null;
  }
  const from = onDate > `${year}-01-01` ? onDate : `${year}-01-01`;
  const found = nextFrom(office, stateKey, placeGeoid, year, from);
  return found &&
    found.electionDate > onDate &&
    found.electionDate.startsWith(`${year}-`)
    ? found
    : null;
}

/**
 * The next regular election for one office's seat, on or after `onDate` with
 * its filing still open where possible. A seat whose term ends is on the last
 * election its office's calendar holds before that end, so the winner is
 * chosen before the term runs out; with none left, the calendar's next one.
 */
export function nextElectionForSeat(input: {
  readonly office: OfficeInput;
  readonly stateKey: string;
  readonly placeGeoid: string;
  readonly termEnd: string | null;
  readonly onDate: string;
}): ElectionDates | null {
  const { office, stateKey, placeGeoid, termEnd, onDate } = input;
  const today = Number(onDate.slice(0, 4));
  if (!termEnd) return nextFrom(office, stateKey, placeGeoid, today, onDate);
  const endYear = Number(termEnd.slice(0, 4));
  for (let year = endYear; year >= today; year -= 1) {
    const found = electionInYear({
      office,
      stateKey,
      placeGeoid,
      year,
      onDate,
    });
    if (found && found.electionDate < termEnd) return found;
  }
  return nextFrom(office, stateKey, placeGeoid, endYear - 1, onDate);
}

/**
 * The election a seat filled at the opening is next on: the seats of a body
 * take turns across the years within one term that the office's calendar
 * holds an election in (an odd-year county staggers over its odd years), so
 * a term never ends without an election before it. Estimated until each
 * seat's own cycle is read (SG-GOV-term-end-estimate).
 */
export function staggeredSeatElection(input: {
  readonly office: OfficeInput;
  readonly stateKey: string;
  readonly placeGeoid: string;
  readonly onDate: string;
  readonly index: number;
}): ElectionDates | null {
  const { office, stateKey, placeGeoid, onDate, index } = input;
  if (!office.termYears) return null;
  const today = Number(onDate.slice(0, 4));
  const held: ElectionDates[] = [];
  for (let year = today; year <= today + office.termYears; year += 1) {
    if (
      held.length &&
      year >= Number(held[0]!.electionDate.slice(0, 4)) + office.termYears
    )
      break;
    const found = electionInYear({
      office,
      stateKey,
      placeGeoid,
      year,
      onDate,
    });
    if (found) held.push(found);
  }
  return held.length ? held[index % held.length]! : null;
}

/**
 * The day a term won at `electionDate` starts: a county's own published
 * calendar where one is read (the locality's record), else the take-office
 * rule for the office kind in its state (`data/elections/term-rules.json`),
 * else the office's recorded start day (January 1 where none is read).
 */
export function termStartAfter(
  office: OfficeInput,
  electionDate: string,
  townStateKey?: string,
): string {
  if (office.level === "county") {
    const unit = governmentUnit(office.jurisdiction);
    const year = electionDate.slice(0, 4);
    const read = unit
      ? nextCountyElection(unit, makeIsoDate(`${year}-01-01`))
      : null;
    if (
      read?.status === "read" &&
      !read.dates.estimated &&
      read.dates.electionDate.startsWith(`${year}-`) &&
      read.dates.termStarts > electionDate
    )
      return read.dates.termStarts;
  }
  const row = termRuleFor(officeStateKey(office, townStateKey), office);
  if (row?.takeOffice) return takeOfficeDate(row, electionDate);
  const starts = office.termStarts ?? "01-01";
  const year = Number(electionDate.slice(0, 4));
  const same = `${year}-${starts}`;
  return same > electionDate ? same : `${year + 1}-${starts}`;
}

/** When a term won at `electionDate` ends: the start of the term elected a full term on. */
export function termEndAfter(
  office: OfficeInput,
  electionDate: string,
  townStateKey?: string,
): string | null {
  if (!office.termYears) return null;
  const year = Number(electionDate.slice(0, 4)) + office.termYears;
  return termStartAfter(
    office,
    `${year}${electionDate.slice(4)}`,
    townStateKey,
  );
}
