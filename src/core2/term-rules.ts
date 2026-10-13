/**
 * The term and election rules for each office kind in each of the 56 states
 * and territories (`data/elections/term-rules.json`, compiled by
 * `scripts/research/compile-term-rules.ts` from the research files it names):
 * term length, stagger, which years hold the regular election and on what
 * day, the primary, the filing deadline, and the day the winner takes office.
 * Each field carries its tag (SOURCED or ESTIMATED) and citation. No place is
 * named here; every place fact is a row.
 */
import rules from "./data/elections/term-rules.json" with { type: "json" };
import { governmentUnit } from "../simulation/government-units";
import type { OfficeInput } from "./offices-local";

export type TermRuleKind =
  | "president"
  | "us-senate"
  | "us-house"
  | "governor"
  | "statewide-executive"
  | "state-upper"
  | "state-lower"
  | "county-board"
  | "county-executive"
  | "county-row"
  | "council"
  | "mayor"
  | "township-board";

/** A day of the year a rule names. Weekdays are 0 Sunday to 6 Saturday. */
export type DayRule =
  | { readonly kind: "fixed"; readonly month: number; readonly day: number }
  | {
      readonly kind: "nth-weekday";
      readonly month: number;
      readonly weekday: number;
      /** 1 the first, -1 the last. */
      readonly nth: number;
      readonly offsetDays?: number;
    }
  | {
      readonly kind: "weekday-after";
      readonly month: number;
      readonly weekday: number;
      readonly anchorWeekday: number;
      readonly anchorNth: number;
      /** The second such weekday after the anchor, and so on. */
      readonly ordinal?: number;
    }
  | {
      readonly kind: "weekday-after-date";
      readonly month: number;
      readonly day: number;
      readonly weekday: number;
    }
  | { readonly kind: "days-after-election"; readonly days: number }
  | { readonly kind: "days-before-general"; readonly days: number };

interface Tagged {
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly citation: string;
  readonly spread?: unknown;
}

export interface TermRuleRow {
  readonly id: string;
  readonly state: string;
  readonly kind: TermRuleKind;
  readonly applies: boolean;
  readonly citation?: string;
  readonly tag?: "SOURCED" | "ESTIMATED";
  readonly termYears?: Tagged & { readonly value: number };
  readonly stagger?: Tagged & { readonly kind: string };
  readonly cycle?: Tagged &
    (
      | {
          readonly kind: "every";
          readonly years: number;
          readonly residue: number;
        }
      | { readonly kind: "office-record" }
      | {
          readonly kind: "county-calendar";
          readonly cycleYears: number;
          readonly residues: readonly number[];
        }
      | { readonly kind: "municipal"; readonly timing: string }
    );
  readonly electionDay?: Tagged & { readonly kind: string };
  readonly primary?: Tagged &
    (
      | {
          readonly kind: "rule";
          readonly rule: DayRule;
          readonly readDates2026: Readonly<Record<string, string>> | null;
        }
      | {
          readonly kind: "read-dates-only";
          readonly readDates2026: Readonly<Record<string, string>> | null;
        }
      | { readonly kind: "none" }
    );
  readonly filing?: Tagged &
    (
      | {
          readonly kind: "days-before-primary";
          readonly days: number;
          readonly readDeadlines2026: Readonly<Record<string, string>> | null;
        }
      | { readonly kind: "lead-days-before-primary" }
      | { readonly kind: "lead-days-before-election" }
    );
  readonly takeOffice?: Tagged & {
    readonly rule: DayRule;
    readonly yearAfterElection: boolean;
  };
}

const byId = new Map(
  (rules as unknown as { rows: TermRuleRow[] }).rows.map((row) => [
    row.id,
    row,
  ]),
);

/** Which rule kind an office's seats follow. */
export function termRuleKind(office: OfficeInput): TermRuleKind | null {
  const { level, kind } = office;
  if (level === "federal") {
    if (kind === "president" || kind === "vice-president") return "president";
    if (kind === "us-senate") return "us-senate";
    if (kind.startsWith("us-house")) return "us-house";
    return null;
  }
  if (level === "state") {
    if (kind === "governor" || kind === "mayor") return "governor";
    if (kind === "legislature-lower") return "state-lower";
    if (kind.startsWith("legislature-")) return "state-upper";
    return "statewide-executive";
  }
  if (level === "county") {
    if (kind === "county-board") return "county-board";
    if (kind === "county-executive") return "county-executive";
    return "county-row";
  }
  if (level === "township") return "township-board";
  return kind === "mayor" ? "mayor" : "council";
}

/** The state or territory whose law dates an office: its own, or the town's for a federal office. */
export function officeStateKey(
  office: OfficeInput,
  townStateKey?: string,
): string | null {
  if (office.jurisdiction.startsWith("US-")) return office.jurisdiction;
  if (office.jurisdiction === "US") return townStateKey ?? null;
  const unit = governmentUnit(office.jurisdiction);
  return unit ? `US-${unit.stateUsps}` : (townStateKey ?? null);
}

/**
 * The rule row for an office in a state, or null where none applies. A
 * federal office's rule is the same in every state; a territory's town reads
 * it from the federal rows of any state that has the office.
 */
export function termRuleFor(
  stateKey: string | null,
  office: OfficeInput,
): TermRuleRow | null {
  const kind = termRuleKind(office);
  if (!kind) return null;
  const own = stateKey ? byId.get(`${stateKey}:${kind}`) : undefined;
  if (own?.applies) return own;
  if (office.level === "federal") {
    const federal = byId.get(`US-DC:${kind}`) ?? byId.get(`US-VA:${kind}`);
    return federal?.applies ? federal : null;
  }
  return null;
}

const iso = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): string {
  if (nth > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    return iso(year, month, 1 + ((weekday - first + 7) % 7) + 7 * (nth - 1));
  }
  const last = new Date(Date.UTC(year, month, 0));
  const back = (last.getUTCDay() - weekday + 7) % 7;
  return iso(year, month, last.getUTCDate() - back + 7 * (nth + 1));
}

function firstWeekdayAfter(date: string, weekday: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const ahead = (weekday - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + ahead);
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The date a day rule names in a year. A "days after election" rule counts
 * from `electionDate`.
 */
export function dayInYear(
  rule: DayRule,
  year: number,
  electionDate?: string,
): string {
  switch (rule.kind) {
    case "fixed":
      return iso(year, rule.month, rule.day);
    case "nth-weekday":
      return addDays(
        nthWeekday(year, rule.month, rule.weekday, rule.nth),
        rule.offsetDays ?? 0,
      );
    case "weekday-after":
      return addDays(
        firstWeekdayAfter(
          nthWeekday(year, rule.month, rule.anchorWeekday, rule.anchorNth),
          rule.weekday,
        ),
        7 * ((rule.ordinal ?? 1) - 1),
      );
    case "weekday-after-date":
      return firstWeekdayAfter(iso(year, rule.month, rule.day), rule.weekday);
    case "days-after-election":
      return addDays(electionDate ?? iso(year, 11, 1), rule.days);
    case "days-before-general":
      // Days before the Tuesday after the first Monday in November.
      return addDays(
        firstWeekdayAfter(nthWeekday(year, 11, 1, 1), 2),
        -rule.days,
      );
  }
}

/** The day the winner of a regular election on `electionDate` takes office, by the row's rule. */
export function takeOfficeDate(row: TermRuleRow, electionDate: string): string {
  const take = row.takeOffice!;
  const year =
    Number(electionDate.slice(0, 4)) + (take.yearAfterElection ? 1 : 0);
  const date = dayInYear(take.rule, year, electionDate);
  // A rule that falls before the count is done means the next year's day.
  return date > electionDate
    ? date
    : dayInYear(take.rule, year + 1, electionDate);
}

/**
 * Whether the row's calendar holds the office's regular election in `year`.
 * Null where the row leaves it to another calendar (a county's or town's own,
 * read by their readers).
 */
export function cycleHolds(
  row: TermRuleRow,
  office: OfficeInput,
  year: number,
): boolean | null {
  const cycle = row.cycle;
  if (!cycle) return null;
  if (cycle.kind === "every") return year % cycle.years === cycle.residue;
  if (cycle.kind === "office-record") {
    if (office.nextElectionYear === undefined || !office.termYears) return null;
    return (
      (((year - office.nextElectionYear) % office.termYears) +
        office.termYears) %
        office.termYears ===
      0
    );
  }
  return null;
}

/** The primary in a year by the row, the year's read date first. */
export function primaryIn(
  row: TermRuleRow,
  year: number,
  nominationKey: string,
): string | null {
  const primary = row.primary;
  if (!primary || primary.kind === "none") return null;
  const read =
    year === 2026
      ? (primary.readDates2026?.[nominationKey] ??
        primary.readDates2026?.all ??
        null)
      : null;
  if (read) return read;
  return primary.kind === "rule" ? dayInYear(primary.rule, year) : null;
}

/** The filing deadline in a year by the row, or null where it sets none. */
export function filingDeadlineIn(
  row: TermRuleRow,
  year: number,
  nominationKey: string,
  primaryDate: string | null,
): string | null {
  const filing = row.filing;
  if (!filing || filing.kind !== "days-before-primary") return null;
  const read =
    year === 2026
      ? (filing.readDeadlines2026?.[nominationKey] ??
        filing.readDeadlines2026?.all ??
        null)
      : null;
  if (read) return read;
  return primaryDate ? addDays(primaryDate, -filing.days) : null;
}
