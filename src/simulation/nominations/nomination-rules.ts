import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  electionLawOfficeKey,
  ruleValueInWorld,
  type NominationMethodChoice,
} from "../enacted-rule-changes";
import { addDays } from "../dates";
import type { IsoDate, World } from "../types";
import {
  dateFromElectionRule,
  isElectionDateRule,
  type ElectionDateRule,
} from "./date-rules";
import { MEDIAN_FILING_GAP_DAYS } from "./filing-gap";

/**
 * How each place's parties choose their general-election candidates, as the
 * law in force has it for one office in one year.
 *
 * The starting law is `data/research/elections/party-nomination-rules-2026.json`,
 * Research 9's 2026 table: every state's method (a party primary, or an
 * all-party primary that sends the top two or four on), its standing date
 * rule, the date actually set for 2026 (a one-year law such as Virginia's or
 * Massachusetts' wins in 2026), and its runoff rule. A law enacted in play
 * replaces the date rule or the method through the
 * rule-change reader (office key `us-xx-election-law`), so a legislature can
 * move its primary and the nomination stage follows.
 *
 * Which law applies is fixed when the year's filing opens: the consumer
 * passes that day as `onDate`. A law in force by then governs that year's
 * nominations; one that takes effect later governs the next.
 *
 * Nothing unread shows as unknown (CTO addendum, 9/28/2026 10:32 p.m.: "No
 * value shows UNKNOWN"). A rule that has not been read starts from the
 * closest real rule, marked ESTIMATED FROM AVERAGE, and the plan names every
 * part so estimated in `estimated`:
 * - a year or office the place's own read rule does not cover (Ohio and
 *   Maryland in a presidential year, Mississippi's legislature, an odd year
 *   under an even-years rule) uses the place's own standing rule;
 * - a place with no standing rule but a 2026 date (Louisiana, Guam, the
 *   Virgin Islands) keeps that date's pattern: the same weekday of the same
 *   week of the same month;
 * - a place with neither (Puerto Rico, American Samoa, the Northern Mariana
 *   Islands) uses the date rule most places share, counted from the table;
 * - an unread method is a party primary, the method most places use;
 * - an unread runoff rule is no runoff, the rule most places have.
 * Reading the place's own law replaces the estimate in the table.
 *
 * The one plan that is not held is a primary set for the general election
 * day itself (Louisiana's 2026 House seats): the consumer keeps its
 * general-election-only path for that seat and says so.
 */

export type NominationOfficeFamily =
  "us-house" | "us-senate" | "governor" | "state-legislature";

/** Every method the starting law uses, including one only a legislature uses. */
export type NominationMethod = NominationMethodChoice | "nonpartisan-top-two";

export interface RunoffRule {
  /** The share, in percent, that wins outright. */
  readonly thresholdPercent: number;
  /** Whether reaching the threshold exactly wins ("at-least") or not. */
  readonly outright: "more-than" | "at-least";
  /** A runoff happens only if the runner-up asks for one (North Carolina). */
  readonly onRequest: boolean;
  /** A runoff needs at least this many candidates in the primary (South Dakota). */
  readonly minimumCandidates: number | null;
  /** The runoff date, or null when its rule is unread. */
  readonly date: IsoDate | null;
}

export type NominationPlan =
  | {
      readonly known: true;
      readonly stateUsps: string;
      readonly family: NominationOfficeFamily;
      readonly year: number;
      readonly method: NominationMethod;
      readonly primaryDate: IsoDate;
      /** Where the date came from. */
      readonly dateBasis: DateBasis;
      /** The parts of the plan that are ESTIMATED FROM AVERAGE, not read. */
      readonly estimated: readonly EstimatedPart[];
      readonly runoff: RunoffRule | null;
      /** How many go on to the general election from an all-party primary. */
      readonly advance: number;
      /** The last day a candidate can file for this primary. */
      readonly filingDeadline: IsoDate;
      /**
       * "set-for-2026" when the sourced 2026 table gives this office's date;
       * otherwise ESTIMATED FROM AVERAGE: the place's own 2026 gap before
       * its primary (each statute's wording is unread), or the median gap
       * where the place has none.
       */
      readonly filingBasis: "set-for-2026" | "estimated-from-average";
    }
  | { readonly known: false; readonly reason: string };

export type DateBasis =
  "set-for-2026" | "standing-rule" | "enacted-law" | "estimated-from-average";

export type EstimatedPart = "method" | "primary-date" | "runoff";

interface DatesByOffice {
  readonly all?: string | null;
  readonly [office: string]: string | null | undefined;
}

interface PlaceRow {
  readonly name: string;
  readonly method: NominationMethod | null;
  readonly methodByOffice?: Readonly<Record<string, NominationMethod>>;
  readonly voterAccess: string | null;
  readonly filing?: {
    readonly deadlines2026: DatesByOffice;
    readonly incumbentDeadlines2026?: DatesByOffice;
    readonly daysBeforePrimary: number | null;
  };
  readonly primary: {
    readonly rule: ElectionDateRule | null;
    readonly evenYearsOnly: boolean;
    readonly presidentialYearRule?: ElectionDateRule | null;
    readonly ruleOffices?: readonly string[];
    readonly dates2026: DatesByOffice;
  };
  readonly runoff:
    | null
    | "unknown"
    | {
        readonly thresholdPercent: number;
        readonly outright: "more-than" | "at-least";
        readonly onRequest: boolean;
        readonly minimumCandidates: number | null;
        readonly offices: readonly string[] | null;
        readonly date: ElectionDateRule | null;
        readonly dates2026: DatesByOffice;
      };
}

const PLACES = (
  nominationRules as unknown as {
    readonly places: Readonly<Record<string, PlaceRow>>;
  }
).places;

/**
 * ESTIMATED FROM AVERAGE: the standing primary date rule most places in the
 * table share (counted when the table loads; in the 2026 table, the Tuesday
 * after the first Monday in June, six places). Used only for a place with no
 * read rule and no 2026 date.
 */
const MOST_COMMON_DATE_RULE: ElectionDateRule = (() => {
  const counts = new Map<string, { rule: ElectionDateRule; count: number }>();
  for (const row of Object.values(PLACES)) {
    const rule = row.primary.rule;
    if (!rule) continue;
    const key = JSON.stringify(rule, Object.keys(rule).sort());
    const held = counts.get(key);
    counts.set(key, { rule, count: (held?.count ?? 0) + 1 });
  }
  return [...counts.entries()].sort(
    ([aKey, a], [bKey, b]) => b.count - a.count || aKey.localeCompare(bKey),
  )[0]![1].rule;
})();

/**
 * ESTIMATED FROM AVERAGE: the method most places in the table use (a party
 * primary). Used only where a place's method has not been read.
 */
const MOST_COMMON_METHOD: NominationMethod = (() => {
  const counts = new Map<NominationMethod, number>();
  for (const row of Object.values(PLACES))
    if (row.method) counts.set(row.method, (counts.get(row.method) ?? 0) + 1);
  return [...counts.entries()].sort(
    ([aKey, a], [bKey, b]) => b - a || aKey.localeCompare(bKey),
  )[0]![0];
})();

function filingPlan(
  row: PlaceRow,
  family: NominationOfficeFamily,
  year: number,
  primaryDate: IsoDate,
  dateBasis: DateBasis,
  incumbent = false,
): {
  filingDeadline: IsoDate;
  filingBasis: "set-for-2026" | "estimated-from-average";
} {
  // Non-federal dates count as read only when that exact office family is
  // present; the Congress-wide fallback never supplies a sourced state date.
  if (
    year === 2026 &&
    dateBasis === "set-for-2026" &&
    (family === "us-house" ||
      family === "us-senate" ||
      row.filing?.deadlines2026[family] !== undefined)
  ) {
    const set =
      row.filing &&
      ((incumbent ? row.filing.incumbentDeadlines2026?.[family] : null) ??
        (family === "us-house" || family === "us-senate"
          ? dateFor(row.filing.deadlines2026, family)
          : row.filing.deadlines2026[family]));
    if (set && set < primaryDate)
      return { filingDeadline: set as IsoDate, filingBasis: "set-for-2026" };
  }
  // Future estimates keep this office's own filing-to-primary interval.
  // A congressional interval cannot stand in for a read legislative date.
  const ownDeadline = row.filing?.deadlines2026[family];
  const ownPrimary = dateFor(row.primary.dates2026, family);
  const ownGap =
    ownDeadline && ownPrimary
      ? Math.round(
          (Date.parse(ownPrimary) - Date.parse(ownDeadline)) / 86_400_000,
        )
      : null;
  const gap =
    ownGap !== null && ownGap > 0
      ? ownGap
      : family === "us-house" || family === "us-senate"
        ? (row.filing?.daysBeforePrimary ?? MEDIAN_FILING_GAP_DAYS)
        : MEDIAN_FILING_GAP_DAYS;
  return {
    filingDeadline: addDays(primaryDate, -gap),
    filingBasis: "estimated-from-average",
  };
}

/**
 * A date rule that keeps a known date's pattern: the same weekday in the same
 * week of the same month (May 16, 2026, the third Saturday in May, becomes
 * "the third Saturday in May").
 */
function patternOf(date: string): ElectionDateRule {
  const day = new Date(`${date}T00:00:00Z`);
  return {
    kind: "nth-weekday",
    month: day.getUTCMonth() + 1,
    weekday: day.getUTCDay(),
    nth: Math.floor((day.getUTCDate() - 1) / 7) + 1,
  };
}

function anyDate(dates: DatesByOffice): string | null {
  return (
    dates.all ??
    Object.values(dates).find((date): date is string => !!date) ??
    null
  );
}

/** The researched row for a place, or null when the table has none. */
export function nominationRuleRow(stateUsps: string): PlaceRow | null {
  return PLACES[`US-${stateUsps}`] ?? null;
}

/** The November general election day: the Tuesday after the first Monday. */
export function generalElectionDay(year: number): IsoDate {
  return dateFromElectionRule(
    {
      kind: "weekday-after",
      month: 11,
      anchorWeekday: 1,
      anchorNth: 1,
      weekday: 2,
    },
    year,
  )!;
}

function dateFor(
  dates: DatesByOffice,
  family: NominationOfficeFamily,
): string | null {
  return dates[family] ?? dates.all ?? null;
}

function presidentialYear(year: number): boolean {
  return year % 4 === 0;
}

function compiledPrimaryDate(
  row: PlaceRow,
  family: NominationOfficeFamily,
  year: number,
  generalDay: IsoDate,
): { date: IsoDate; basis: DateBasis } | { reason: string } {
  if (year === 2026) {
    const set = dateFor(row.primary.dates2026, family);
    if (set) return { date: set as IsoDate, basis: "set-for-2026" };
  }
  const primary = row.primary;
  const own =
    presidentialYear(year) && primary.presidentialYearRule !== undefined
      ? primary.presidentialYearRule
      : primary.rule;
  const covered =
    !(primary.ruleOffices && !primary.ruleOffices.includes(family)) &&
    !(primary.evenYearsOnly && year % 2 !== 0);
  const read = own !== null && covered;
  const known2026 = anyDate(primary.dates2026);
  const rule: ElectionDateRule =
    own ??
    primary.rule ??
    (known2026 ? patternOf(known2026) : MOST_COMMON_DATE_RULE);
  const date = dateFromElectionRule(rule, year, { generalDay });
  return date
    ? { date, basis: read ? "standing-rule" : "estimated-from-average" }
    : { reason: `${row.name}'s primary rule gives no date in ${year}.` };
}

/**
 * The nomination plan for one office in one year, under the law in force on
 * `onDate` (the day the field files).
 */
export function nominationPlan(
  world: World | null,
  query: {
    readonly stateUsps: string;
    readonly family: NominationOfficeFamily;
    readonly year: number;
    readonly onDate: IsoDate;
    readonly generalDay?: IsoDate;
    readonly incumbent?: boolean;
  },
): NominationPlan {
  const { stateUsps, family, year } = query;
  const row = nominationRuleRow(stateUsps);
  if (!row)
    return {
      known: false,
      reason: `No nomination rule has been read for ${stateUsps}.`,
    };
  if (
    year === 2026 &&
    family === "state-legislature" &&
    row.filing?.deadlines2026[family] === null
  )
    return {
      known: false,
      reason: `${row.name} has no regular state legislative election in 2026.`,
    };
  const generalDay = query.generalDay ?? generalElectionDay(year);
  const officeKey = electionLawOfficeKey(stateUsps);
  const law = <T>(
    field: "nomination.primary.dateRule" | "nomination.method",
    compiled: T,
  ) =>
    world
      ? ruleValueInWorld(
          world,
          { jurisdiction: stateUsps, officeKey, field, onDate: query.onDate },
          compiled,
        )
      : { value: compiled, source: "compiled" as const };

  const methodLaw = law(
    "nomination.method",
    row.methodByOffice?.[family] ?? row.method,
  );
  const estimated: EstimatedPart[] = [];
  let method = methodLaw.value as NominationMethod | null;
  if (!method) {
    method = MOST_COMMON_METHOD;
    estimated.push("method");
  }

  const dateLaw = law("nomination.primary.dateRule", null);
  let primaryDate: IsoDate;
  let dateBasis: DateBasis;
  if (dateLaw.source === "enacted" && isElectionDateRule(dateLaw.value)) {
    const date = dateFromElectionRule(dateLaw.value, year, { generalDay });
    if (!date)
      return {
        known: false,
        reason: `${row.name}'s enacted primary rule gives no date in ${year}.`,
      };
    primaryDate = date;
    dateBasis = "enacted-law";
  } else {
    const compiled = compiledPrimaryDate(row, family, year, generalDay);
    if ("reason" in compiled) return { known: false, reason: compiled.reason };
    primaryDate = compiled.date;
    dateBasis = compiled.basis;
    if (dateBasis === "estimated-from-average") estimated.push("primary-date");
  }
  if (primaryDate >= generalDay)
    return {
      known: false,
      reason: `${row.name}'s ${year} primary for this office falls on or after the general election, which the game does not model yet.`,
    };

  let runoff = runoffPlan(row, family, year, primaryDate, generalDay);
  if (runoff === "unknown") {
    runoff = null;
    estimated.push("runoff");
  } else if (runoff?.estimatedDate) estimated.push("runoff");
  return {
    known: true,
    stateUsps,
    family,
    year,
    method,
    primaryDate,
    dateBasis,
    estimated,
    runoff: runoff && {
      thresholdPercent: runoff.thresholdPercent,
      outright: runoff.outright,
      onRequest: runoff.onRequest,
      minimumCandidates: runoff.minimumCandidates,
      date: runoff.date,
    },
    advance: method === "top-four" ? 4 : 2,
    ...filingPlan(row, family, year, primaryDate, dateBasis, query.incumbent),
  };
}

function runoffPlan(
  row: PlaceRow,
  family: NominationOfficeFamily,
  year: number,
  primaryDate: IsoDate,
  generalDay: IsoDate,
): (RunoffRule & { readonly estimatedDate: boolean }) | null | "unknown" {
  const compiled = row.runoff;
  const shape =
    compiled !== null &&
    compiled !== "unknown" &&
    (!compiled.offices || compiled.offices.includes(family))
      ? compiled
      : null;
  if (compiled === "unknown") return "unknown";
  if (!shape) return null;
  const threshold = shape.thresholdPercent;
  let date: IsoDate | null = null;
  if (year === 2026) {
    const set = dateFor(shape.dates2026, family);
    if (set) date = set as IsoDate;
  }
  if (!date && shape.date)
    date = dateFromElectionRule(shape.date, year, {
      generalDay,
      primaryDay: primaryDate,
    });
  let estimatedDate = false;
  // ESTIMATED FROM AVERAGE: a runoff whose rule is unread but whose 2026
  // dates are known keeps the 2026 gap after the primary (Louisiana: six
  // weeks, May 16 to June 27).
  if (!date && !shape.date) {
    const primary2026 = dateFor(row.primary.dates2026, family);
    const runoff2026 = dateFor(shape.dates2026, family);
    if (primary2026 && runoff2026) {
      const gap = Math.round(
        (Date.parse(runoff2026) - Date.parse(primary2026)) / 86_400_000,
      );
      if (gap > 0 && gap <= 120) {
        date = dateFromElectionRule(
          { kind: "days-after-primary", days: gap },
          year,
          { primaryDay: primaryDate },
        );
        estimatedDate = year !== 2026;
      }
    }
  }
  if (date && date >= generalDay) date = null;
  return {
    thresholdPercent: threshold,
    outright: shape.outright,
    onRequest: shape.onRequest,
    minimumCandidates: shape.minimumCandidates,
    date,
    estimatedDate,
  };
}
