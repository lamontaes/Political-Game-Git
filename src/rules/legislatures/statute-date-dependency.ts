import { daysBetween } from "../offices/calendar";
import type { IsoDate } from "../../simulation/types";
import {
  addDays as advanceDays,
  makeIsoDate as validateDate,
} from "../elections/calendar";
function addDays(date: IsoDate, days: number): IsoDate {
  return advanceDays(date, days) as IsoDate;
}
function makeIsoDate(raw: string): IsoDate {
  return validateDate(raw) as IsoDate;
}
function yearOf(date: IsoDate) {
  return Number(date.slice(0, 4));
}
function isoDateFromParts(year: number, month: number, day: number): IsoDate {
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
}
export interface StatuteFacts {
  readonly rules: Readonly<Record<string, RuleRow>>;
  readonly sessionEnds: Readonly<Record<string, SessionEndRow>>;
}
export type StatuteEffectiveRule =
  | {
      readonly kind: "days-after-enactment";
      readonly days: number;
    }
  | {
      readonly kind: "next-date";
      readonly month: number;
      readonly day: number;
    }
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
      readonly notBefore?: {
        readonly month: number;
        readonly day: number;
      };
    }
  | {
      readonly kind: "next-year-date-by-passage";
      readonly cutoff: {
        readonly month: number;
        readonly day: number;
      };
      readonly early: {
        readonly month: number;
        readonly day: number;
      };
      readonly late: {
        readonly month: number;
        readonly day: number;
      };
    }
  | {
      readonly kind: "january-after-days";
      readonly days: number;
      readonly oddYearsNextJanuary: boolean;
    };

export type YearlyDay =
  | {
      readonly month: number;
      readonly day: number;
    }
  | {
      readonly month: number;
      readonly weekday: number;
      readonly nth: number;
      readonly plusDays?: number;
    };

interface SessionEndRow {
  readonly oddYear?: readonly SessionEndRule[];
  readonly evenYear?: readonly SessionEndRule[];
  readonly estimated?: string;
  readonly adjourned?: Readonly<Record<string, AdjournedYear>>;
}

export interface StatuteDateContext {
  readonly finalPassageAt?: () => IsoDate | null;
  readonly sessionEnds?: (year: number) => readonly IsoDate[] | null;
}

interface RuleRow {
  readonly rule: StatuteEffectiveRule;
  readonly estimated?: string;
}

export function statuteEffectiveRule(
  facts: StatuteFacts,
  jurisdictionKey: string,
): StatuteEffectiveRule | null {
  return Object.hasOwn(facts.rules, jurisdictionKey)
    ? facts.rules[jurisdictionKey]!.rule
    : null;
}

export function statuteEffectiveDateEstimated(
  facts: StatuteFacts,
  jurisdictionKey: string,
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
): boolean {
  if (statuteEffectiveRuleEstimate(facts, jurisdictionKey)) return true;
  const year = yearOf(enactedAt);
  return (
    statuteEffectiveRule(facts, jurisdictionKey)?.kind ===
      "days-after-session-end" &&
    !context.sessionEnds?.(year) &&
    stateSessionEndEstimate(facts, jurisdictionKey, year) !== null
  );
}

export function statuteEffectiveRuleEstimate(
  facts: StatuteFacts,
  jurisdictionKey: string,
): string | null {
  return Object.hasOwn(facts.rules, jurisdictionKey)
    ? (facts.rules[jurisdictionKey]!.estimated ?? null)
    : null;
}

export function stateSessionEnds(
  facts: StatuteFacts,
  jurisdictionKey: string,
  year: number,
): readonly IsoDate[] {
  if (!Object.hasOwn(facts.sessionEnds, jurisdictionKey)) return [];
  const row = facts.sessionEnds[jurisdictionKey]!;
  return knownSessionEnds(row, year) ?? medianSessionEnd(facts, year);
}

export function stateSessionEndEstimate(
  facts: StatuteFacts,
  jurisdictionKey: string,
  year: number,
): string | null {
  if (!Object.hasOwn(facts.sessionEnds, jurisdictionKey)) return null;
  const row = facts.sessionEnds[jurisdictionKey]!;
  return knownSessionEnds(row, year) ? null : (row.estimated ?? null);
}

function knownSessionEnds(row: SessionEndRow, year: number): IsoDate[] | null {
  const adjourned = row.adjourned?.[String(year)];
  if (adjourned) return adjourned.dates.map((date) => makeIsoDate(date)).sort();
  if (row.estimated) return null;
  return ((year % 2 ? row.oddYear : row.evenYear) ?? [])
    .map((rule) =>
      rule.kind === "on"
        ? dayInYear(year, rule.day)
        : addDays(dayInYear(year, rule.start), rule.lastDayAfterStart),
    )
    .sort();
}

function medianSessionEnd(
  facts: StatuteFacts,
  year: number,
): readonly IsoDate[] {
  const lastDays = Object.values(facts.sessionEnds)
    .map((row) => knownSessionEnds(row, year)?.at(-1))
    .filter((date): date is IsoDate => date !== undefined)
    .sort();
  const median = lastDays[Math.floor((lastDays.length - 1) / 2)];
  return median ? [median] : [];
}

export function stateStatuteOperativeAt(
  facts: StatuteFacts,
  jurisdictionKey: string,
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
): IsoDate | null {
  const rule = statuteEffectiveRule(facts, jurisdictionKey);
  if (!rule) return null;
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
      const thisYear = isoDateFromParts(year, rule.month, rule.day);
      return enactedAt < thisYear
        ? thisYear
        : addDays(enactedAt, rule.lateDays);
    }
    case "days-after-session-end": {
      const counted = (end: IsoDate): IsoDate => {
        const operative = addDays(addMonths(end, rule.months ?? 0), rule.days);
        return rule.notBefore
          ? latest(
              operative,
              isoDateFromParts(year, rule.notBefore.month, rule.notBefore.day),
            )
          : operative;
      };
      const sessionEnd = nearest(
        context.sessionEnds?.(year) ??
          stateSessionEnds(facts, jurisdictionKey, year),
        enactedAt,
      );
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
        passedAt <
        isoDateFromParts(passedYear, rule.cutoff.month, rule.cutoff.day)
          ? rule.early
          : rule.late;
      return latest(
        isoDateFromParts(passedYear + 1, date.month, date.day),
        enactedAt,
      );
    }
    case "january-after-days":
      return rule.oddYearsNextJanuary && year % 2 === 1
        ? nextYearlyDate(enactedAt, 1, 1)
        : nextYearlyDate(addDays(enactedAt, rule.days), 1, 1);
  }
}

function dayInYear(year: number, day: YearlyDay): IsoDate {
  if ("day" in day) return isoDateFromParts(year, day.month, day.day);
  let date: number;
  if (day.nth > 0) {
    const first = new Date(Date.UTC(year, day.month - 1, 1)).getUTCDay();
    date = 1 + ((day.weekday - first + 7) % 7) + (day.nth - 1) * 7;
  } else {
    const lastDate = new Date(Date.UTC(year, day.month, 0)).getUTCDate();
    const last = new Date(Date.UTC(year, day.month - 1, lastDate)).getUTCDay();
    date = lastDate - ((last - day.weekday + 7) % 7);
  }
  return addDays(isoDateFromParts(year, day.month, date), day.plusDays ?? 0);
}

function nearest(dates: readonly IsoDate[], to: IsoDate): IsoDate | null {
  let best: IsoDate | null = null;
  for (const date of dates)
    if (
      best === null ||
      Math.abs(daysBetween(date, to)) < Math.abs(daysBetween(best, to))
    )
      best = date;
  return best;
}

function addMonths(date: IsoDate, months: number): IsoDate {
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
  return isoDateFromParts(targetYear, targetMonth, Math.min(day, lastDay));
}

function latest(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

function nextYearlyDate(from: IsoDate, month: number, day: number): IsoDate {
  const thisYear = isoDateFromParts(yearOf(from), month, day);
  return thisYear > from
    ? thisYear
    : isoDateFromParts(yearOf(from) + 1, month, day);
}

export type SessionEndRule =
  | {
      readonly kind: "on";
      readonly day: YearlyDay;
    }
  | {
      readonly kind: "after-start";
      readonly start: YearlyDay;
      readonly lastDayAfterStart: number;
    };

interface AdjournedYear {
  readonly dates: readonly string[];
  readonly sourceUrl: string;
  readonly quote: string;
  readonly readAt: string;
}

// stopgapId: "SG-P14-legislatures-statute-session-fallback"
