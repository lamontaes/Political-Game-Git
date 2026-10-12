import { addDays, type IsoDate } from "./calendar";
import {
  dateFromElectionRule,
  isElectionDateRule,
  type ElectionDateRule,
} from "./date-rules";
import type { NominationMethodChoice } from "../../simulation/enacted-rule-changes";
export type NominationOfficeFamily =
  "us-house" | "us-senate" | "governor" | "state-legislature";

export type NominationMethod = NominationMethodChoice | "nonpartisan-top-two";

export interface RunoffRule {
  readonly thresholdPercent: number;
  readonly outright: "more-than" | "at-least";
  readonly onRequest: boolean;
  readonly minimumCandidates: number | null;
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
      readonly dateBasis: DateBasis;
      readonly estimated: readonly EstimatedPart[];
      readonly runoff: RunoffRule | null;
      readonly advance: number;
      readonly filingDeadline: IsoDate;
      readonly filingBasis: "set-for-2026" | "estimated-from-average";
    }
  | {
      readonly known: false;
      readonly reason: string;
    };

export type DateBasis =
  "set-for-2026" | "standing-rule" | "enacted-law" | "estimated-from-average";

export type EstimatedPart = "method" | "primary-date" | "runoff";

interface DatesByOffice {
  readonly all?: string | null;
  readonly [office: string]: string | null | undefined;
}

export interface PlaceRow {
  readonly name: string;
  readonly method: NominationMethod | null;
  readonly methodByOffice?: Readonly<Record<string, NominationMethod>>;
  readonly voterAccess: string | null;
  readonly filing?: {
    readonly deadlines2026: DatesByOffice;
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
export interface NominationLawFacts {
  readonly methodLaw?: { readonly value: unknown; readonly source: string };
  readonly dateLaw?: { readonly value: unknown; readonly source: string };
}
export interface NominationFacts {
  readonly row: PlaceRow | null;
  readonly places: Readonly<Record<string, PlaceRow>>;
  readonly medianFilingGapDays: number;
}
/** KEEP closure. Facts are table rows and enacted values, never a World. */
export function nominationPlan(
  facts: NominationFacts,
  lawFacts: NominationLawFacts,
  query: {
    readonly stateUsps: string;
    readonly family: NominationOfficeFamily;
    readonly year: number;
    readonly onDate: IsoDate;
    readonly generalDay?: IsoDate;
  },
): NominationPlan {
  const PLACES = facts.places;
  const MEDIAN_FILING_GAP_DAYS = facts.medianFilingGapDays;
  const MOST_COMMON_DATE_RULE: ElectionDateRule = (() => {
    const counts = new Map<
      string,
      {
        rule: ElectionDateRule;
        count: number;
      }
    >();
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
  ): {
    filingDeadline: IsoDate;
    filingBasis: "set-for-2026" | "estimated-from-average";
  } {
    if (
      year === 2026 &&
      dateBasis === "set-for-2026" &&
      (family === "us-house" || family === "us-senate")
    ) {
      const set = row.filing && dateFor(row.filing.deadlines2026, family);
      if (set && set < primaryDate)
        return { filingDeadline: set as IsoDate, filingBasis: "set-for-2026" };
    }
    const gap = row.filing?.daysBeforePrimary ?? MEDIAN_FILING_GAP_DAYS;
    return {
      filingDeadline: addDays(primaryDate, -gap),
      filingBasis: "estimated-from-average",
    };
  }

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

  function generalElectionDay(year: number): IsoDate {
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
  ):
    | {
        date: IsoDate;
        basis: DateBasis;
      }
    | {
        reason: string;
      } {
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

  function build(
    queryFacts: NominationLawFacts,
    query: {
      readonly stateUsps: string;
      readonly family: NominationOfficeFamily;
      readonly year: number;
      readonly onDate: IsoDate;
      readonly generalDay?: IsoDate;
    },
  ): NominationPlan {
    const { stateUsps, family, year } = query;
    const row = facts.row;
    if (!row)
      return {
        known: false,
        reason: `No nomination rule has been read for ${stateUsps}.`,
      };
    const generalDay = query.generalDay ?? generalElectionDay(year);
    const law = <T>(
      field: "nomination.primary.dateRule" | "nomination.method",
      compiled: T,
    ) =>
      field === "nomination.method"
        ? (queryFacts.methodLaw ?? { value: compiled, source: "compiled" })
        : (queryFacts.dateLaw ?? { value: compiled, source: "compiled" });
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
      if ("reason" in compiled)
        return { known: false, reason: compiled.reason };
      primaryDate = compiled.date;
      dateBasis = compiled.basis;
      if (dateBasis === "estimated-from-average")
        estimated.push("primary-date");
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
      ...filingPlan(row, family, year, primaryDate, dateBasis),
    };
  }

  function runoffPlan(
    row: PlaceRow,
    family: NominationOfficeFamily,
    year: number,
    primaryDate: IsoDate,
    generalDay: IsoDate,
  ):
    | (RunoffRule & {
        readonly estimatedDate: boolean;
      })
    | null
    | "unknown" {
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
    if (!date && !shape.date) {
      const primary2026 = dateFor(row.primary.dates2026, family);
      const runoff2026 = dateFor(shape.dates2026, family);
      if (primary2026 && runoff2026) {
        const gap = Math.round(
          (Date.parse(runoff2026) - Date.parse(primary2026)) / 86400000,
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
  return build(lawFacts, query);
}
export function medianFilingGapDays(
  places: Readonly<
    Record<
      string,
      { readonly filing?: { readonly daysBeforePrimary?: number | null } }
    >
  >,
): number {
  const gaps = Object.values(places)
    .map((row) => row.filing?.daysBeforePrimary)
    .filter((gap): gap is number => typeof gap === "number")
    .sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  return gaps.length % 2
    ? gaps[middle]!
    : Math.round((gaps[middle - 1]! + gaps[middle]!) / 2);
}

// stopgapId: "SG-P14-elections-nomination-fallback"
