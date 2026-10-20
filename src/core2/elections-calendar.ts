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
import { governmentUnit } from "./reference/government-units";
import { addDays, makeIsoDate } from "./kernel/dates";
import { resolveMunicipalElectionTiming } from "./gov-rules/municipal-ballot-rules";
import type { MunicipalElectionTiming } from "./gov-rules/municipal-election-rules";
import { nextCountyElection } from "./gov-rules/county-election-calendar";
import {
  FILING_LEAD_DAYS,
  FILING_LEAD_SOURCE,
  novemberGeneralElectionDay,
} from "./gov-rules/town-election-calendar";
import type { OfficeInput } from "./offices-local";
import filingDeadlineData from "./data/elections/filing-deadlines.json" with { type: "json" };
import municipalCycleData from "./data/elections/municipal-cycles.json" with { type: "json" };
import termStartData from "./data/elections/term-starts.json" with { type: "json" };
import specialLawData from "./data/elections/special-election-law.json" with { type: "json" };
import electionParameters from "./data/elections/parameters.json" with { type: "json" };

/** A number from `data/elections/parameters.json`. */
export function electionsParameter(key: string): number {
  const row = (
    electionParameters as { parameters: Record<string, { value: number }> }
  ).parameters[key];
  if (!row) throw new Error(`Unknown elections parameter: ${key}`);
  return row.value;
}

export type OfficeFamily =
  | "statewideExecutive"
  | "stateLegislative"
  | "usHouse"
  | "countyOffice"
  | "municipalOffice";

export function officeFamily(office: OfficeInput): OfficeFamily {
  if (office.kind.startsWith("us-house")) return "usHouse";
  if (office.kind.startsWith("legislature-")) return "stateLegislative";
  if (office.level === "federal" || office.level === "state")
    return "statewideExecutive";
  if (office.level === "county") return "countyOffice";
  return "municipalOffice";
}

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

/** The timings that run on a multi-year cycle; the state's own cycle years are data. */
type CycleTiming = "quadrennial-summer-june" | "quadrennial-late-summer-august";

interface CycleRow {
  readonly timing: string;
  readonly anchorYear: number;
  readonly periodYears: number;
  readonly day:
    | {
        readonly kind: "nth-weekday";
        month: number;
        weekday: number;
        nth: number;
      }
    | { readonly kind: "tuesday-after-first-monday"; month: number };
  readonly citation: string;
}
const cycles = (
  municipalCycleData as unknown as { states: Record<string, CycleRow> }
).states;

/** The state's cycle years and election day for a cycle timing, from data. */
function cycleTiming(stateKey: string, timing: string) {
  const row = cycles[stateKey];
  if (!row || row.timing !== timing) return null;
  return {
    inYear: (y: number) =>
      (((y - row.anchorYear) % row.periodYears) + row.periodYears) %
        row.periodYears ===
      0,
    date: (y: number) =>
      row.day.kind === "nth-weekday"
        ? nthWeekday(y, row.day.month, row.day.weekday, row.day.nth)
        : addDays(makeIsoDate(nthWeekday(y, row.day.month, 1, 1)), 1),
    read: true,
    citation: row.citation,
  };
}

/**
 * Each municipal timing rule as a date in a year, and whether that year holds
 * one. The month and weekday are the rule's own words; the day within the
 * month is the first Tuesday where the rule doesn't name one (estimated).
 */
const MUNICIPAL_DATES: Readonly<
  Record<
    Exclude<MunicipalElectionTiming, CycleTiming>,
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
};

type FilingRuleRow = {
  readonly rule: {
    readonly kind: string;
    readonly days?: number;
    readonly month?: number;
    readonly day?: number;
    readonly weekday?: number;
    readonly nth?: number;
    readonly plusDays?: number;
    /** The rule falls this many calendar years before the election's year (a December filing for a February election). */
    readonly yearsBefore?: number;
  };
  readonly ruleText?: string | null;
  readonly citation: string;
  readonly tag: string;
};
const filingRules = (
  filingDeadlineData as unknown as { places: Record<string, FilingRuleRow> }
).places;

/**
 * The state's municipal filing deadline for a town election, from its rule in
 * `data/elections/filing-deadlines.json`; null where the rule is unread or
 * lands outside the year before the election.
 */
export function municipalFilingDeadline(
  stateKey: string,
  electionDate: string,
): { date: string; estimated: boolean; source: string } | null {
  const row = filingRules[stateKey];
  if (!row) return null;
  const { rule } = row;
  const year = Number(electionDate.slice(0, 4)) - (rule.yearsBefore ?? 0);
  let date: string | null = null;
  if (rule.kind === "days-before-election")
    date = addDays(makeIsoDate(electionDate), -(rule.days ?? 0));
  else if (rule.kind === "weekday-of-month")
    date = addDays(
      makeIsoDate(nthWeekday(year, rule.month!, rule.weekday!, rule.nth!)),
      rule.plusDays ?? 0,
    );
  else if (rule.kind === "fixed-date")
    date = makeIsoDate(
      `${year}-${String(rule.month).padStart(2, "0")}-${String(rule.day).padStart(2, "0")}`,
    );
  else if (rule.kind === "weekday-before-election") {
    const back =
      (new Date(`${electionDate}T00:00:00Z`).getUTCDay() - rule.weekday! + 7) %
        7 || 7;
    date = addDays(makeIsoDate(electionDate), -(back + 7 * (rule.nth! - 1)));
  }
  if (!date || date >= electionDate) return null;
  if (date < addDays(makeIsoDate(electionDate), -366)) return null;
  return {
    date,
    estimated: row.tag !== "SOURCED",
    source: `${row.citation}${row.ruleText ? ` (${row.ruleText})` : ""}`,
  };
}

function municipal(
  stateKey: string,
  placeGeoid: string,
  fromYear: number,
  onDate: string,
): ElectionDates | null {
  const found = resolveMunicipalElectionTiming(stateKey.slice(3), placeGeoid);
  if (!found) return null;
  const timing =
    cycleTiming(stateKey, found.timing) ??
    MUNICIPAL_DATES[
      found.timing as Exclude<MunicipalElectionTiming, CycleTiming>
    ];
  if (!timing) return null;
  for (let year = fromYear; year < fromYear + 9; year += 1) {
    if (!timing.inYear(year)) continue;
    const electionDate = timing.date(year);
    const own = municipalFilingDeadline(stateKey, electionDate);
    const filingDeadline =
      own?.date ?? addDays(makeIsoDate(electionDate), -FILING_LEAD_DAYS);
    if (filingDeadline < onDate) continue;
    return {
      electionDate,
      primaryDate: null,
      filingOpens: null,
      filingDeadline,
      // The tag follows the dates: read only where the election day and the
      // deadline are both read from the state's law as sourced.
      basis: timing.read && own && !own.estimated ? "read" : "estimated",
      sources: [
        `State municipal election law: ${found.timing} (${found.basis})`,
        own ? own.source : FILING_LEAD_SOURCE,
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
  const from = Math.max(year, Number(onDate.slice(0, 4)));
  if (office.level === "federal" || office.level === "state")
    return stateAndFederal(office, stateKey, from);
  if (office.level === "county") {
    const unit = governmentUnit(office.jurisdiction);
    const read = unit ? nextCountyElection(unit, makeIsoDate(onDate)) : null;
    if (read?.status === "read") {
      // A county race on the state's general election day is nominated in
      // the state's primary where the state's nomination data holds one for
      // every office, unless the county's own calendar names its primary.
      const state =
        read.dates.primaryDate === null
          ? stateAndFederal(
              office,
              stateKey,
              Number(read.dates.electionDate.slice(0, 4)),
            )
          : null;
      const statePrimary =
        state?.primaryDate &&
        state.electionDate === read.dates.electionDate &&
        state.primaryDate > onDate
          ? state
          : null;
      const primaryDate =
        read.dates.primaryDate ?? statePrimary?.primaryDate ?? null;
      return {
        electionDate: read.dates.electionDate,
        primaryDate,
        filingOpens: read.dates.qualifyingOpens,
        filingDeadline:
          read.dates.qualifyingCloses ??
          statePrimary?.filingDeadline ??
          addDays(
            makeIsoDate(primaryDate ?? read.dates.electionDate),
            -FILING_LEAD_DAYS,
          ),
        basis: read.dates.estimated ? "estimated" : "read",
        sources: [
          ...read.dates.sourceUrls,
          ...(statePrimary ? statePrimary.sources : []),
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
  // A town's calendar reads the year asked and keeps today as today (a
  // spring election's filing can close in the winter before its year); the
  // state and county calendars look ahead from the start of the year asked.
  const town =
    office.level !== "federal" &&
    office.level !== "state" &&
    office.level !== "county";
  const from = town || onDate > `${year}-01-01` ? onDate : `${year}-01-01`;
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

interface TermStartRule {
  readonly month: number;
  readonly nth: number;
  readonly weekday: number;
  readonly offsetDays: number;
}
interface TermStartRow {
  readonly monthDay?: string;
  readonly rule?: TermStartRule;
}
interface TermStartTable {
  default: TermStartRow & { monthDay: string };
  states: Record<string, Record<string, TermStartRow>>;
}

function termStartRow(office: OfficeInput): TermStartRow | undefined {
  const stateKey = office.jurisdiction.startsWith("US-")
    ? office.jurisdiction.slice(0, 5)
    : "";
  return (termStartData as unknown as TermStartTable).states[stateKey]?.[
    officeFamily(office)
  ];
}

/**
 * A term start moved whole years from another start, set back on the state's
 * own clause day for its year (the office's weekday rule where it is read),
 * else left as it was.
 */
export function termStartInYear(office: OfficeInput, shifted: string): string {
  const rule = office.termStarts ? undefined : termStartRow(office)?.rule;
  if (!rule) return shifted;
  return addDays(
    makeIsoDate(
      nthWeekday(
        Number(shifted.slice(0, 4)),
        rule.month,
        rule.weekday,
        rule.nth,
      ),
    ),
    rule.offsetDays,
  );
}

/** The first start a state's weekday rule gives after the election day. */
function ruleStartAfter(rule: TermStartRule, electionDate: string): string {
  const year = Number(electionDate.slice(0, 4));
  for (const y of [year, year + 1]) {
    const start = addDays(
      makeIsoDate(nthWeekday(y, rule.month, rule.weekday, rule.nth)),
      rule.offsetDays,
    );
    if (start > electionDate) return start;
  }
  throw new Error(`No term start after ${electionDate}.`);
}
/**
 * The start day of a term where the office carries none: the state's row for
 * the office's family in `data/elections/term-starts.json`, else the data's
 * default (an estimate: SG-GOV-term-end-estimate).
 */
function termStartDefault(office: OfficeInput): string {
  return (
    termStartRow(office)?.monthDay ??
    (termStartData as unknown as TermStartTable).default.monthDay
  );
}

/**
 * The day a term won at `electionDate` starts: the county's own calendar
 * where it is read, else the office's recorded start day (January 1 where
 * none is read) after the election.
 */
export function termStartAfter(
  office: OfficeInput,
  electionDate: string,
): string {
  if (office.level === "county") {
    const unit = governmentUnit(office.jurisdiction);
    const year = electionDate.slice(0, 4);
    const read = unit
      ? nextCountyElection(unit, makeIsoDate(`${year}-01-01`))
      : null;
    if (
      read?.status === "read" &&
      read.dates.electionDate.startsWith(`${year}-`) &&
      read.dates.termStarts > electionDate
    )
      return read.dates.termStarts;
  }
  const rule = office.termStarts ? undefined : termStartRow(office)?.rule;
  if (rule) return ruleStartAfter(rule, electionDate);
  const starts = office.termStarts ?? termStartDefault(office);
  const year = Number(electionDate.slice(0, 4));
  const same = `${year}-${starts}`;
  return same > electionDate ? same : `${year + 1}-${starts}`;
}

/** When a term won at `electionDate` ends: the start of the term elected a full term on. */
export function termEndAfter(
  office: OfficeInput,
  electionDate: string,
): string | null {
  if (!office.termYears) return null;
  const year = Number(electionDate.slice(0, 4)) + office.termYears;
  return termStartAfter(office, `${year}${electionDate.slice(4)}`);
}

interface SpecialLawRow {
  readonly kind:
    | "days-after-vacancy"
    | "next-general"
    | "next-uniform-date"
    | "governor-sets-date";
  readonly days?: number;
  /** next-uniform-date: days from the vacancy to the governor's order (an estimate where the law sets none). */
  readonly orderLagDays?: number;
  /** next-uniform-date: the election falls on the first uniform date on or after this many days after the order. */
  readonly minDaysAfterOrder?: number;
  /** next-uniform-date: the state's uniform dates, a weekday of a month or the November general election day. */
  readonly uniformDates?: readonly (
    | { readonly general: true }
    | {
        readonly month: number;
        readonly weekday: number;
        readonly nth: number;
      }
  )[];
  readonly tag: string;
  readonly citation: string;
}
const specialLaw = (
  specialLawData as unknown as {
    states: Record<string, Record<string, SpecialLawRow>>;
  }
).states;

/**
 * The date of the special election for a vacancy, by the state's law for the
 * office's family (`data/elections/special-election-law.json`): a number of
 * days after the vacancy, or the next general election. Where the state's law
 * is not read, the estimate in `data/elections/parameters.json` stands in
 * (SG-GOV-special-election-timing) and `basis` says "estimated".
 */
export function specialElectionDate(input: {
  readonly office: OfficeInput;
  readonly stateKey: string;
  readonly vacancyDate: string;
}): { electionDate: string; basis: "read" | "estimated"; source: string } {
  const { office, stateKey, vacancyDate } = input;
  const row = specialLaw[stateKey]?.[officeFamily(office)];
  if (row?.kind === "next-general") {
    const year = Number(vacancyDate.slice(0, 4));
    const thisYear = novemberGeneralElectionDay(year);
    return {
      electionDate:
        thisYear > vacancyDate
          ? thisYear
          : novemberGeneralElectionDay(year + 1),
      basis: row.tag === "SOURCED" ? "read" : "estimated",
      source: row.citation,
    };
  }
  if (row?.kind === "next-uniform-date") {
    const earliest = addDays(
      makeIsoDate(vacancyDate),
      (row.orderLagDays ?? 0) + (row.minDaysAfterOrder ?? 0),
    );
    const year = Number(earliest.slice(0, 4));
    const dates = [year, year + 1]
      .flatMap((y) =>
        (row.uniformDates ?? []).map((rule) =>
          "general" in rule
            ? novemberGeneralElectionDay(y)
            : nthWeekday(y, rule.month, rule.weekday, rule.nth),
        ),
      )
      .sort();
    const electionDate = dates.find((d) => d >= earliest);
    if (electionDate)
      return {
        electionDate,
        basis: row.tag === "SOURCED" ? "read" : "estimated",
        source: row.citation,
      };
  }
  if (row?.kind === "governor-sets-date")
    // The law leaves the day to the governor: no fixed rule to read, so the
    // estimate dates it, and the source says the law was read.
    return {
      electionDate: addDays(
        makeIsoDate(vacancyDate),
        electionsParameter("specialElectionDaysEstimate"),
      ),
      basis: "estimated",
      source: row.citation,
    };
  if (row?.kind === "days-after-vacancy")
    return {
      electionDate: addDays(makeIsoDate(vacancyDate), row.days ?? 0),
      basis: row.tag === "SOURCED" ? "read" : "estimated",
      source: row.citation,
    };
  return {
    electionDate: addDays(
      makeIsoDate(vacancyDate),
      electionsParameter("specialElectionDaysEstimate"),
    ),
    basis: "estimated",
    source:
      "ESTIMATED: days from a vacancy to the special election where the state's law is not read (data/elections/parameters.json specialElectionDaysEstimate)",
  };
}
