/** Standalone date rules for statutes whose enacted records supply no date. */
import { LAWS_PARAMETERS } from "./parameters";

export type DateValue = string;

export type YearlyDay =
  | { readonly month: number; readonly day: number }
  | {
      readonly month: number;
      readonly weekday: number;
      readonly nth: number;
      readonly plusDays?: number;
    };

export type StatuteEffectiveRule =
  | { readonly kind: "days-after-enactment"; readonly days: number }
  | { readonly kind: "next-date"; readonly month: number; readonly day: number }
  | {
      readonly kind: "next-of-dates";
      readonly dates: readonly {
        readonly month: number;
        readonly day: number;
      }[];
    }
  | {
      readonly kind: "date-in-year-else-days";
      readonly month: number;
      readonly day: number;
      readonly lateDays: number;
    }
  | {
      readonly kind: "days-after-session-end";
      readonly days: number;
      readonly months?: number;
      readonly notBefore?: { readonly month: number; readonly day: number };
    }
  | {
      readonly kind: "next-year-date-by-passage";
      readonly cutoff: { readonly month: number; readonly day: number };
      readonly early: { readonly month: number; readonly day: number };
      readonly late: { readonly month: number; readonly day: number };
    }
  | {
      readonly kind: "january-after-days";
      readonly days: number;
      readonly oddYearsNextJanuary: boolean;
    };

export interface StatuteDateContext {
  readonly sessionEnds?: (year: number) => readonly DateValue[];
  readonly finalPassageAt?: () => DateValue | null;
}

export type EffectiveDateBasis =
  "enacted-date" | "state-rule" | "estimated-state-rule" | "game-default";

export interface EnactmentDateFacts {
  readonly resolvedAt: DateValue;
  readonly finalPassageAt?: DateValue | null;
  readonly effectiveAt?: DateValue | null;
  readonly effectiveDateBasis?: "source-default" | "game-default";
  readonly gameProfile?: { readonly version?: string; readonly days: number };
  readonly stateKey?: string | null;
  readonly stateRule?: StatuteEffectiveRule | null;
  readonly estimatedStateRule?: boolean;
  readonly context?: StatuteDateContext;
}

export interface OperativeDate {
  readonly date: DateValue;
  readonly basis: EffectiveDateBasis;
}

export function stateStatuteOperativeAt(
  rule: StatuteEffectiveRule,
  enactedAt: DateValue,
  context: StatuteDateContext = {},
): DateValue | null {
  const year = yearOf(enactedAt);
  switch (rule.kind) {
    case "days-after-enactment":
      return addDays(enactedAt, rule.days);
    case "next-date":
      return nextYearlyDate(enactedAt, rule.month, rule.day);
    case "next-of-dates": {
      const candidates = rule.dates.map((date) =>
        nextYearlyDate(enactedAt, date.month, date.day),
      );
      return candidates.reduce((earliest, date) =>
        date < earliest ? date : earliest,
      );
    }
    case "date-in-year-else-days": {
      const thisYear = dateFromParts(year, rule.month, rule.day);
      return enactedAt < thisYear
        ? thisYear
        : addDays(enactedAt, rule.lateDays);
    }
    case "days-after-session-end": {
      // GAME ASSUMPTION retained: when the calendar rule would take effect on
      // or before enactment, count from enactment instead.
      const counted = (end: DateValue): DateValue => {
        const operative = addDays(addMonths(end, rule.months ?? 0), rule.days);
        return rule.notBefore
          ? latest(
              operative,
              dateFromParts(year, rule.notBefore.month, rule.notBefore.day),
            )
          : operative;
      };
      const sessionEnd = nearest(context.sessionEnds?.(year) ?? [], enactedAt);
      const operative = sessionEnd ? counted(sessionEnd) : null;
      return operative && operative > enactedAt
        ? operative
        : counted(enactedAt);
    }
    case "next-year-date-by-passage": {
      const passedAt = context.finalPassageAt?.();
      if (!passedAt) return null;
      const passedYear = yearOf(passedAt);
      const date =
        passedAt < dateFromParts(passedYear, rule.cutoff.month, rule.cutoff.day)
          ? rule.early
          : rule.late;
      return latest(
        dateFromParts(passedYear + 1, date.month, date.day),
        enactedAt,
      );
    }
    case "january-after-days":
      return rule.oddYearsNextJanuary && year % 2 === 1
        ? nextYearlyDate(enactedAt, 1, 1)
        : nextYearlyDate(addDays(enactedAt, rule.days), 1, 1);
  }
}

export function operativeDateForEnactment(
  facts: EnactmentDateFacts,
): OperativeDate | null {
  if (facts.effectiveAt) {
    return {
      date: facts.effectiveAt,
      basis:
        facts.effectiveDateBasis === "game-default"
          ? "game-default"
          : "enacted-date",
    };
  }
  if (facts.effectiveDateBasis === "source-default") return null;
  const profile = facts.gameProfile;
  if (
    profile &&
    (!profile.version ||
      !Number.isSafeInteger(profile.days) ||
      profile.days < 0)
  )
    throw new Error(
      "An enactment carries an invalid effective-date game profile.",
    );
  const stateRuleAt =
    !profile && facts.stateKey?.startsWith("US-") && facts.stateRule
      ? stateStatuteOperativeAt(
          facts.stateRule,
          facts.resolvedAt,
          facts.context ?? {
            finalPassageAt: () => facts.finalPassageAt ?? null,
          },
        )
      : null;
  if (stateRuleAt)
    return {
      date: stateRuleAt,
      basis: facts.estimatedStateRule ? "estimated-state-rule" : "state-rule",
    };
  return {
    date: addDays(
      facts.resolvedAt,
      profile?.days ?? LAWS_PARAMETERS.defaultEnactmentDays.value,
    ),
    basis: "game-default",
  };
}

export interface SessionEndRow {
  readonly adjourned?: Readonly<
    Record<string, { readonly dates: readonly string[] }>
  >;
  readonly estimated?: boolean;
  readonly oddYear?: readonly SessionEndRule[];
  readonly evenYear?: readonly SessionEndRule[];
}

export type SessionEndRule =
  | { readonly kind: "on"; readonly day: YearlyDay }
  | {
      readonly kind: "after-start";
      readonly start: YearlyDay;
      readonly lastDayAfterStart: number;
    };

/** Resolve observed adjournments or session limits in one place. */
export function knownSessionEnds(
  row: SessionEndRow,
  year: number,
): readonly DateValue[] | null {
  const adjourned = row.adjourned?.[String(year)];
  if (adjourned) return [...adjourned.dates].sort();
  if (row.estimated) return null;
  return ((year % 2 ? row.oddYear : row.evenYear) ?? [])
    .map((rule) =>
      rule.kind === "on"
        ? dayInYear(year, rule.day)
        : addDays(dayInYear(year, rule.start), rule.lastDayAfterStart),
    )
    .sort();
}

/** The lower median of each known place's last session day for the year. */
export function medianSessionEnd(
  rows: readonly SessionEndRow[],
  year: number,
): readonly DateValue[] {
  const lastDays = rows
    .map((row) => knownSessionEnds(row, year)?.at(-1))
    .filter((date): date is DateValue => date !== undefined)
    .sort();
  const median = lastDays[Math.floor((lastDays.length - 1) / 2)];
  return median ? [median] : [];
}

function dayInYear(year: number, day: YearlyDay): DateValue {
  if ("day" in day) return dateFromParts(year, day.month, day.day);
  let date: number;
  if (day.nth > 0) {
    const first = new Date(Date.UTC(year, day.month - 1, 1)).getUTCDay();
    date = 1 + ((day.weekday - first + 7) % 7) + (day.nth - 1) * 7;
  } else {
    const lastDate = new Date(Date.UTC(year, day.month, 0)).getUTCDate();
    const last = new Date(Date.UTC(year, day.month - 1, lastDate)).getUTCDay();
    date = lastDate - ((last - day.weekday + 7) % 7);
  }
  return addDays(dateFromParts(year, day.month, date), day.plusDays ?? 0);
}

function nearest(dates: readonly DateValue[], to: DateValue): DateValue | null {
  let best: DateValue | null = null;
  for (const date of dates)
    if (
      best === null ||
      Math.abs(daysBetween(date, to)) < Math.abs(daysBetween(best, to))
    )
      best = date;
  return best;
}

function addMonths(date: DateValue, months: number): DateValue {
  if (months === 0) return date;
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const index = month - 1 + months;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return dateFromParts(targetYear, targetMonth, Math.min(day, lastDay));
}

function nextYearlyDate(
  from: DateValue,
  month: number,
  day: number,
): DateValue {
  const thisYear = dateFromParts(yearOf(from), month, day);
  return thisYear > from
    ? thisYear
    : dateFromParts(yearOf(from) + 1, month, day);
}

function addDays(date: DateValue, days: number): DateValue {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function daysBetween(a: DateValue, b: DateValue): number {
  return Math.round(
    (new Date(`${b}T00:00:00.000Z`).getTime() -
      new Date(`${a}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

function yearOf(date: DateValue): number {
  return Number(date.slice(0, 4));
}

function dateFromParts(year: number, month: number, day: number): DateValue {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function latest(a: DateValue, b: DateValue): DateValue {
  return a > b ? a : b;
}
