/**
 * What comes out of a paycheck, by the law in force where the worker lives.
 *
 * The percentage method, the way an employer's payroll does it (IRS
 * Publication 15-T): the period's pay is annualized by the number of pay
 * periods in a year, the year's tax is worked out on that from each level's
 * schedule (single filer, standard deduction), and one period's share is
 * withheld. Social Security and Medicare come off at their statutory rates,
 * Social Security only up to the wage base. A territory's own income tax
 * stands in place of the federal one (`laws-in-force.ts` sets the federal
 * level aside); payroll taxes still apply there. Pure: the caller passes the
 * law in force.
 */
import type { LawInForceAnswer } from "./laws-in-force";
import type { LawRowInput } from "./laws-starting";

export interface WithholdingLine {
  readonly level: "federal" | "state" | "county" | "city";
  readonly jurisdiction: string;
  readonly tax: "income" | "social-security" | "medicare";
  readonly minor: number;
  readonly lawId: string;
  /** The law row read is a carried-back or otherwise estimated figure. */
  readonly estimate: boolean;
  /** For a flat local rate: the base the law row names, as it was applied. */
  readonly base?: "wages" | "AGI" | "taxable income";
  /** The measure that enacted the row read, when an act (not a starting row) did. */
  readonly enactedBy?: string;
  /** The tax is worked out on a schedule with more than one rate. */
  readonly graduated?: boolean;
}

interface Schedule {
  readonly standardDeduction?: number | null;
  readonly brackets: readonly {
    readonly over: number;
    readonly rate: number;
  }[];
}

/** The highest rate on a schedule, in percent. */
function topRate(schedule: Schedule): number {
  return Math.max(0, ...schedule.brackets.map((b) => b.rate));
}

/**
 * The schedule the law row's own rate puts in force. A row's value is its top
 * rate; a schedule whose top rate differs from it (the rate was changed
 * without a new table) is scaled to it, the way a bill scales a table.
 */
function scheduleOf(row: LawRowInput): Schedule | null {
  const schedule = single(row);
  if (!schedule || typeof row.value !== "number" || row.value <= 0)
    return schedule;
  const top = topRate(schedule);
  if (top <= 0 || Math.abs(top - row.value) < 1e-9) return schedule;
  const scale = row.value / top;
  return {
    ...schedule,
    brackets: schedule.brackets.map((b) => ({ ...b, rate: b.rate * scale })),
  };
}

/** Tax on a year's income from one graduated schedule, in dollars. */
export function scheduleTax(schedule: Schedule, annualDollars: number): number {
  const taxable = Math.max(
    0,
    annualDollars - (schedule.standardDeduction ?? 0),
  );
  const brackets = [...schedule.brackets].sort((a, b) => a.over - b.over);
  let tax = 0;
  for (const [index, bracket] of brackets.entries()) {
    const top = brackets[index + 1]?.over ?? Infinity;
    if (taxable <= bracket.over) break;
    tax += ((Math.min(taxable, top) - bracket.over) * bracket.rate) / 100;
  }
  return tax;
}

/**
 * The deduction a local tax on "taxable income" takes off first: the state's
 * standard deduction where its schedule carries one, else the federal one
 * (the usual starting point for a local base). Dollars a year.
 */
function localStandardDeduction(answer: LawInForceAnswer): number {
  for (const wanted of ["state", "federal"] as const) {
    const level = answer.levels.find((l) => l.level === wanted);
    if (!level?.row || level.setAside) continue;
    const deduction = single(level.row)?.standardDeduction;
    if (typeof deduction === "number" && deduction > 0) return deduction;
  }
  return 0;
}

function single(row: LawRowInput): Schedule | null {
  const schedules = row.terms?.schedules as
    Record<string, Schedule> | undefined;
  return schedules?.single ?? null;
}

/**
 * Withholding on one paycheck: `paidMinor` for a period of `periodDays`, with
 * `yearToDateMinor` already paid this year (for the Social Security wage base).
 */
export function withholdingFor(input: {
  readonly paidMinor: number;
  readonly periodDays: number;
  readonly yearToDateMinor: number;
  readonly incomeTax: LawInForceAnswer;
  readonly socialSecurity: LawInForceAnswer;
  readonly medicare: LawInForceAnswer;
}): readonly WithholdingLine[] {
  const lines: WithholdingLine[] = [];
  const periods = 365 / Math.max(1, input.periodDays);
  const annual = (input.paidMinor / 100) * periods;
  for (const level of input.incomeTax.levels) {
    const row = level.row;
    if (!row || level.setAside || row.value === null) continue;
    const schedule = scheduleOf(row);
    // A flat rate: a starting row's "percent-flat", or an enacted act's
    // "percent" with no bracket schedule (audit 3: city tax collected $0).
    const flat = row.unit === "percent-flat" || row.unit === "percent";
    // The base the row names (audit 14): wages and AGI are the paycheck's own
    // pay (this model has no pre-tax adjustments); "taxable income" is pay
    // after the standard deduction.
    const named = String(row.terms?.base ?? "").toLowerCase();
    const base: WithholdingLine["base"] | undefined = flat
      ? named === "taxable income"
        ? "taxable income"
        : named === "agi"
          ? "AGI"
          : "wages"
      : undefined;
    const taxed =
      base === "taxable income"
        ? Math.max(0, annual - localStandardDeduction(input.incomeTax))
        : annual;
    const yearly = schedule
      ? scheduleTax(schedule, annual)
      : flat
        ? (taxed * row.value) / 100
        : 0;
    const minor = Math.round((yearly / periods) * 100);
    if (minor > 0)
      lines.push({
        level: level.level,
        jurisdiction: level.jurisdiction,
        tax: "income",
        minor,
        lawId: row.id,
        estimate: row.estimate === true,
        ...(base && !schedule ? { base } : {}),
        ...(typeof row.terms?.enactedBy === "string"
          ? { enactedBy: row.terms.enactedBy }
          : {}),
        ...(schedule && new Set(schedule.brackets.map((b) => b.rate)).size > 1
          ? { graduated: true }
          : {}),
      });
  }
  const ss = input.socialSecurity.governing;
  if (ss?.value) {
    const base = Math.round(Number(ss.terms?.wageBase ?? Infinity) * 100);
    const taxable = Math.max(
      0,
      Math.min(input.paidMinor, base - input.yearToDateMinor),
    );
    const minor = Math.round((taxable * ss.value) / 100);
    if (minor > 0)
      lines.push({
        level: "federal",
        jurisdiction: "US",
        tax: "social-security",
        minor,
        lawId: ss.id,
        estimate: ss.estimate === true,
      });
  }
  const medicare = input.medicare.governing;
  if (medicare?.value) {
    const over = Math.round(
      Number(medicare.terms?.additionalOver ?? Infinity) * 100,
    );
    const extra = Math.max(
      0,
      input.yearToDateMinor +
        input.paidMinor -
        Math.max(over, input.yearToDateMinor),
    );
    const minor = Math.round(
      (input.paidMinor * medicare.value) / 100 +
        (extra * Number(medicare.terms?.additionalRate ?? 0)) / 100,
    );
    if (minor > 0)
      lines.push({
        level: "federal",
        jurisdiction: "US",
        tax: "medicare",
        minor,
        lawId: medicare.id,
        estimate: medicare.estimate === true,
      });
  }
  return lines;
}
