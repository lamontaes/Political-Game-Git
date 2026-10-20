/** The national month as pure math: last month's figures, the rate in force and the town's own totals. */
import history from "./data/macro/history.json" with { type: "json" };

export type MacroParameter = (key: string) => number;

export interface MacroMonth {
  id: string;
  month: string;
  kind: "history" | "simulated";
  unemploymentPct: number;
  priceIndex: number;
  inflationPct: number;
  payrollJobsThousands: number;
  hourlyEarnings: number;
  realOutput: number;
  outputGapPct: number;
  policyRatePct: number;
  primeRatePct: number;
  treasury10Pct: number;
  mortgage30Pct: number;
  /** The town's own paid-income growth that entered this month, annual percent; absent when no comparable paid-income history exists. */
  townIncomeGrowthPct?: number;
  /** The nation's payroll-income growth the town was assumed to share, annual percent. */
  townGrowthEstimatePct?: number;
  /** The weight on the town's own paid-income growth in what the national step heard: 0 with no comparable months, 1 at twelve. */
  townGrowthOwnWeight?: number;
  /** The town's own paid-income growth over its comparable months, annual percent; absent until it has any. */
  townGrowthOwnPct?: number;
}

interface HistoryRow {
  month: string;
  unemploymentPct?: number;
  priceIndex?: number;
  payrollJobsThousands?: number;
  hourlyEarnings?: number;
  policyRatePct?: number;
  treasury10Pct?: number;
  mortgage30Pct?: number;
}

const ROWS = history.monthly as readonly HistoryRow[];
const QUARTERS = new Map(
  history.quarterlyRealOutput.map((row) => [row.quarter, row.realOutput]),
);
export const MACRO_BANDS = history.bands;
export const MACRO_HISTORY_SOURCE = history.source;

export function monthKey(date: string): string {
  return date.slice(0, "YYYY-MM".length);
}

export function shiftMonth(month: string, by: number, p: MacroParameter) {
  const [year, part] = month.split("-").map(Number) as [number, number];
  const index = year * p("macroMonthsPerYear") + part - p("one") + by;
  const y = Math.floor(index / p("macroMonthsPerYear"));
  const m = index - y * p("macroMonthsPerYear") + p("one");
  return `${y}-${String(m).padStart("MM".length, "0")}`;
}

export function quarterOf(month: string, p: MacroParameter): string {
  const [year, part] = month.split("-").map(Number) as [number, number];
  const quarter = Math.ceil(part / p("macroMonthsPerQuarter"));
  return `${year}-Q${quarter}`;
}

function field(
  rows: ReadonlyMap<string, HistoryRow>,
  month: string,
  key: Exclude<keyof HistoryRow, "month">,
  p: MacroParameter,
): number {
  // A month the agency did not publish keeps the last published figure.
  for (let at = month; at >= ROWS[0]!.month;) {
    const value = rows.get(at)?.[key];
    if (value !== undefined) return value;
    at = shiftMonth(at, -p("one"), p);
  }
  throw new Error(`No published ${key} at or before ${month}.`);
}

function mortgageAt(
  rows: ReadonlyMap<string, HistoryRow>,
  month: string,
  p: MacroParameter,
): number {
  const published = rows.get(month)?.mortgage30Pct;
  if (published !== undefined) return published;
  // Past the published survey (Freddie Mac PMMS through its latest month): the 10-year plus its measured spread.
  return (
    field(rows, month, "treasury10Pct", p) +
    p("macroMortgageSpreadOverTreasuryPct")
  );
}

function realOutputAt(month: string, p: MacroParameter): number {
  for (let at = month; ; at = shiftMonth(at, -p("macroMonthsPerQuarter"), p)) {
    const value = QUARTERS.get(quarterOf(at, p));
    if (value !== undefined) return value;
    if (at < ROWS[0]!.month)
      throw new Error("No published real output before this month.");
  }
}

/** The opening month (the last complete month before the start) and the twelve before it, from agency figures. */
export function historyMonths(
  startedAt: string,
  p: MacroParameter,
): MacroMonth[] {
  const byMonth = new Map(ROWS.map((row) => [row.month, row]));
  const last = ROWS.at(-p("one"))!.month;
  let opening = shiftMonth(monthKey(startedAt), -p("one"), p);
  if (opening > last) opening = last;
  const months: MacroMonth[] = [];
  // The coarse years before the start (M1-14): every real month since the latest full-data year, and at least the year before the opening.
  const [openingYear, openingPart] = opening.split("-").map(Number) as [
    number,
    number,
  ];
  const sinceCoarse =
    (openingYear - p("macroHistoryFirstYear")) * p("macroMonthsPerYear") +
    openingPart;
  for (
    let back = Math.max(p("macroHistoryMonths"), sinceCoarse) - p("one");
    back >= p("zero");
    back--
  ) {
    const month = shiftMonth(opening, -back, p);
    const price = field(byMonth, month, "priceIndex", p);
    const yearEarlier = field(
      byMonth,
      shiftMonth(month, -p("macroMonthsPerYear"), p),
      "priceIndex",
      p,
    );
    const unemployment = field(byMonth, month, "unemploymentPct", p);
    const policy = field(byMonth, month, "policyRatePct", p);
    months.push({
      id: `macro-month:${month}`,
      month,
      kind: "history",
      unemploymentPct: unemployment,
      priceIndex: price,
      inflationPct: (price / yearEarlier - p("one")) * p("macroHundred"),
      payrollJobsThousands: field(byMonth, month, "payrollJobsThousands", p),
      hourlyEarnings: field(byMonth, month, "hourlyEarnings", p),
      realOutput: realOutputAt(month, p),
      outputGapPct:
        -p("macroOkunOutputPerUnemploymentPoint") *
        (unemployment - p("macroNaturalUnemploymentPct")),
      policyRatePct: policy,
      primeRatePct: policy + p("macroPrimeSpreadPct"),
      treasury10Pct: field(byMonth, month, "treasury10Pct", p),
      mortgage30Pct: mortgageAt(byMonth, month, p),
    });
  }
  return months;
}

/**
 * One month forward. Output's distance from its trend fades and answers the
 * real policy rate against neutral; unemployment follows output (Okun);
 * inflation fades toward its anchor and leans on last month's gap; jobs,
 * pay and long rates follow the regressions recorded in the parameter table.
 */
export function stepMacroMonth(
  previous: Readonly<MacroMonth>,
  policyRatePct: number,
  townIncomeGrowthPct: number | undefined,
  townResidents: number,
  p: MacroParameter,
): MacroMonth {
  const months = p("macroMonthsPerYear"),
    hundred = p("macroHundred"),
    one = p("one");
  const month = shiftMonth(previous.month, one, p);
  const realRate = previous.policyRatePct - previous.inflationPct;
  // One town is its share of the nation: its own income growth over the trend.
  // Public budgets reach the national step only here, as the wages, benefits
  // and business receipts actually paid in town (no implicit
  // multiplier; the federal-dollar report checks the response against
  // macroFederalOutlayResponseBand).
  const town =
    townIncomeGrowthPct === undefined
      ? p("zero")
      : townResidents *
        p("macroTownWeightPerPerson") *
        (townIncomeGrowthPct -
          p("macroTrendGrowthPct") -
          p("macroInflationAnchorPct"));
  const outputGapPct =
    p("macroOutputGapPersistence") * previous.outputGapPct -
    p("macroRealRateEffectOnGap") * (realRate - p("macroNeutralRealRatePct")) +
    town / months;
  const unemploymentPct =
    p("macroNaturalUnemploymentPct") -
    outputGapPct / p("macroOkunOutputPerUnemploymentPoint");
  const anchor = p("macroInflationAnchorPct");
  const inflationPct =
    anchor +
    p("macroInflationPersistence") * (previous.inflationPct - anchor) +
    p("macroPhillipsSlope") * previous.outputGapPct;
  const wageGrowthPct =
    p("macroWageGrowthIntercept") +
    p("macroWageGrowthPerInflation") * previous.inflationPct +
    p("macroWageGrowthPerUnemployment") * previous.unemploymentPct;
  return {
    id: `macro-month:${month}`,
    month,
    kind: "simulated",
    unemploymentPct,
    priceIndex:
      previous.priceIndex * (one + inflationPct / hundred) ** (one / months),
    inflationPct,
    payrollJobsThousands:
      previous.payrollJobsThousands *
      Math.exp(
        (p("macroJobsTrendMonthlyPct") -
          p("macroJobsPerUnemploymentPoint") *
            (unemploymentPct - previous.unemploymentPct)) /
          hundred,
      ),
    hourlyEarnings:
      previous.hourlyEarnings *
      (one + wageGrowthPct / hundred) ** (one / months),
    realOutput:
      previous.realOutput *
      (one + p("macroTrendGrowthPct") / hundred) ** (one / months) *
      ((one + outputGapPct / hundred) /
        (one + previous.outputGapPct / hundred)),
    outputGapPct,
    policyRatePct,
    primeRatePct: policyRatePct + p("macroPrimeSpreadPct"),
    treasury10Pct:
      p("macroTreasuryIntercept") +
      p("macroTreasuryPersistence") * previous.treasury10Pct +
      p("macroTreasuryPerPolicy") * policyRatePct,
    mortgage30Pct:
      p("macroMortgageIntercept") +
      p("macroMortgagePersistence") * previous.mortgage30Pct +
      p("macroMortgagePerPolicy") * policyRatePct,
    ...(townIncomeGrowthPct === undefined ? {} : { townIncomeGrowthPct }),
  };
}

export interface BandResult {
  measure: string;
  at: string;
  value: number;
  low: number;
  high: number;
  inside: boolean;
  /** True when the 12-month base is a real month before the world started. */
  baseIsHistory: boolean;
}

/** Each simulated month's 12-month changes and each simulated quarter's growth against the 1990-2026 bands. */
export function checkBands(
  months: readonly MacroMonth[],
  p: MacroParameter,
): BandResult[] {
  const byMonth = new Map(months.map((row) => [row.month, row]));
  const out: BandResult[] = [];
  const bands = MACRO_BANDS;
  const hundred = p("macroHundred"),
    one = p("one");
  const push = (
    measure: string,
    at: string,
    value: number,
    [low, high]: readonly number[],
    baseIsHistory: boolean,
  ) =>
    out.push({
      measure,
      at,
      value,
      low: low!,
      high: high!,
      inside: value >= low! && value <= high!,
      baseIsHistory,
    });
  for (const row of months) {
    if (row.kind !== "simulated") continue;
    const base = byMonth.get(
      shiftMonth(row.month, -p("macroMonthsPerYear"), p),
    );
    if (!base) continue;
    const fromHistory = base.kind === "history";
    push(
      "unemployment",
      row.month,
      row.unemploymentPct - base.unemploymentPct,
      bands.unemployment12MonthChangePoints,
      fromHistory,
    );
    push(
      "prices",
      row.month,
      (row.priceIndex / base.priceIndex - one) * hundred,
      bands.prices12MonthChangePct,
      fromHistory,
    );
    push(
      "payrollJobs",
      row.month,
      (row.payrollJobsThousands / base.payrollJobsThousands - one) * hundred,
      bands.payrollJobs12MonthChangePct,
      fromHistory,
    );
  }
  // Quarterly output: the mean of each complete simulated quarter against the one before.
  const quarters = new Map<string, MacroMonth[]>();
  for (const row of months) {
    const rows = quarters.get(quarterOf(row.month, p)) ?? [];
    rows.push(row);
    quarters.set(quarterOf(row.month, p), rows);
  }
  const complete = [...quarters].filter(
    ([, rows]) => rows.length === p("macroMonthsPerQuarter"),
  );
  for (let i = 1; i < complete.length; i++) {
    const [quarter, rows] = complete[i]!,
      [, before] = complete[i - 1]!;
    if (!rows.some((row) => row.kind === "simulated")) continue;
    const mean = (list: readonly MacroMonth[]) =>
      list.reduce((sum, row) => sum + row.realOutput, p("zero")) / list.length;
    push(
      "output",
      quarter,
      ((mean(rows) / mean(before)) ** p("macroQuartersPerYear") - one) *
        hundred,
      bands.outputAnnualizedQuarterlyGrowthPct,
      before.some((row) => row.kind === "history"),
    );
  }
  return out;
}

const BY_MONTH = new Map(ROWS.map((row) => [row.month, row]));

/** The 30-year fixed mortgage rate in a past month (FHFA MIRS; after 2019 the 10-year plus its spread). */
export function historicalMortgageRate(
  month: string,
  p: MacroParameter,
): number {
  const first = ROWS[0]!.month;
  return mortgageAt(BY_MONTH, month < first ? first : month, p);
}

/** A past month's published national figures, as recorded (BLS, Fed H.15, FHFA). */
export function publishedMonth(
  month: string,
): Readonly<HistoryRow> | undefined {
  return BY_MONTH.get(month);
}
