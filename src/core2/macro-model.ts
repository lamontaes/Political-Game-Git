/** The national month as pure math: last month's figures, the rate in force and the town's own totals. */
import history from "./data/macro/history.json" with { type: "json" };
import { worldOffsetUnit } from "./world-draw";

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
  /** The output gap's change over the month, points: the momentum the investment accelerator carries into the next month. */
  outputGapChangePct: number;
  /** The real policy rate as spending has felt it: the policy rate less inflation, smoothed over the transmission lag. */
  realRateLagPct: number;
  /** Energy's price against its trend, percent: demand pulls it up, the capacity built in answer pushes it down. */
  energyGapPct: number;
  /** Energy capacity beyond what trend demand needs, percent: built when the price is high, with a lag of years. */
  energyCapacityPct: number;
  /** The unemployment rate the economy has come to treat as normal, percent: it drifts toward the rate people have lived at (hysteresis), so it has no fixed resting point. */
  naturalUnemploymentPct: number;
  /** The real interest rate the economy has come to treat as neutral, percent: it follows the real long-term rate people have lived with (the 10-year yield less inflation), so it has no fixed resting point. */
  neutralRealRatePct: number;
  /** The inflation rate people expect, percent: it follows the inflation they have experienced, so inflation has no fixed anchor. */
  expectedInflationPct: number;
  /** This world's business cycle: the years from one peak to the next its accelerator swings through. */
  cyclePeriodYears: number;
  /** This world's capacity ceiling: how far the gap swings before capacity and credit limits turn the boom back, gap points. */
  cycleCapacityPct: number;
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
  // Past FHFA's published rate (its MIRS Transition Index, two months behind its release): the 10-year plus its measured spread.
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

/**
 * The published opening month (the last complete month before the start) and
 * the months before it, as the agencies printed them. Calibration only: the
 * bands, the checks and each world's draw read it; play reads `historyMonths`.
 */
export function publishedMonths(
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
  let lagged: number | undefined;
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
    const inflation = (price / yearEarlier - p("one")) * p("macroHundred");
    lagged = smoothedRealRate(lagged, policy - inflation, p);
    const before = months.at(-p("one"));
    const natural = drift(
      before?.naturalUnemploymentPct,
      before?.unemploymentPct,
      p("macroNaturalUnemploymentPct"),
      p("macroNaturalHysteresisMonths"),
    );
    const expected = drift(
      before?.expectedInflationPct,
      before?.inflationPct,
      p("macroInflationAnchorPct"),
      p("macroInflationExpectationMonths"),
    );
    const neutral = drift(
      before?.neutralRealRatePct,
      before ? before.treasury10Pct - before.inflationPct : undefined,
      p("macroNeutralRealRatePct"),
      p("macroNeutralRateMonths"),
    );
    const gapNow =
      -p("macroOkunOutputPerUnemploymentPoint") * (unemployment - natural);
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
      outputGapPct: gapNow,
      naturalUnemploymentPct: natural,
      neutralRealRatePct: neutral,
      expectedInflationPct: expected,
      policyRatePct: policy,
      primeRatePct: policy + p("macroPrimeSpreadPct"),
      treasury10Pct: field(byMonth, month, "treasury10Pct", p),
      mortgage30Pct: mortgageAt(byMonth, month, p),
      outputGapChangePct: smoothedChange(months.at(-p("one")), gapNow, p),
      realRateLagPct: lagged,
      energyGapPct: p("macroEnergyDemandPull") * gapNow,
      energyCapacityPct: p("zero"),
      cyclePeriodYears: p("macroCyclePeriodYears"),
      cycleCapacityPct: p("macroCycleCapacityPct"),
    });
  }
  return months;
}

/**
 * A belief that follows experience: one month of the way from what it was
 * toward what was lived, over `months`. With nothing before it, it starts at
 * `opening` (the long-run figure the history begins from, not a place it
 * returns to).
 */
function drift(
  belief: number | undefined,
  lived: number | undefined,
  opening: number,
  months: number,
): number {
  if (belief === undefined || lived === undefined) return opening;
  return belief + (lived - belief) / months;
}

/** The gap's momentum as spending has felt it: the month's change averaged over the last few months, so one noisy print does not set the swing. */
function smoothedChange(
  before: { outputGapPct: number; outputGapChangePct: number } | undefined,
  gapNow: number,
  p: MacroParameter,
): number {
  if (!before) return p("zero");
  return (
    before.outputGapChangePct +
    (gapNow - before.outputGapPct - before.outputGapChangePct) /
      p("macroMomentumMonths")
  );
}

/** The real rate spending has felt: an exponential average over the transmission lag, starting from the first month's own rate. */
function smoothedRealRate(
  before: number | undefined,
  real: number,
  p: MacroParameter,
): number {
  return before === undefined
    ? real
    : before + (real - before) / p("macroRateTransmissionMonths");
}

/** How far one world's past ran from the published series, drawn once from its seed at Start. */
export interface MacroWorldOffsets {
  unemploymentPoints: number;
  inflationPoints: number;
  jobsGrowthPoints: number;
  wageGrowthPoints: number;
  outputGrowthPoints: number;
  policyRatePoints: number;
  longRatePoints: number;
  priceLevelShare: number;
  jobsLevelShare: number;
  wageLevelShare: number;
  outputLevelShare: number;
  cyclePeriodYears: number;
  cycleCapacityPct: number;
}

export function macroWorldOffsets(
  seed: string,
  p: MacroParameter,
): MacroWorldOffsets {
  // The one world draw (world-draw.ts), times this table's spread row.
  const at = (key: string, spread: string) =>
    worldOffsetUnit(seed, `macro-world:${key}`) * p(spread);
  return {
    unemploymentPoints: at(
      "unemployment",
      "macroWorldUnemploymentSpreadPoints",
    ),
    inflationPoints: at("inflation", "macroWorldInflationSpreadPoints"),
    jobsGrowthPoints: at("jobs-growth", "macroWorldJobsGrowthSpreadPoints"),
    wageGrowthPoints: at("wage-growth", "macroWorldWageGrowthSpreadPoints"),
    outputGrowthPoints: at(
      "output-growth",
      "macroWorldOutputGrowthSpreadPoints",
    ),
    policyRatePoints: at("policy-rate", "macroWorldPolicyRateSpreadPoints"),
    longRatePoints: at("long-rate", "macroWorldLongRateSpreadPoints"),
    priceLevelShare: at("price-level", "macroWorldLevelSpreadShare"),
    jobsLevelShare: at("jobs-level", "macroWorldLevelSpreadShare"),
    wageLevelShare: at("wage-level", "macroWorldLevelSpreadShare"),
    outputLevelShare: at("output-level", "macroWorldLevelSpreadShare"),
    cyclePeriodYears:
      p("macroCyclePeriodYears") +
      at("cycle-period", "macroWorldCyclePeriodSpreadYears"),
    cycleCapacityPct:
      p("macroCycleCapacityPct") *
      (p("one") + at("cycle-capacity", "macroWorldCycleCapacitySpreadShare")),
  };
}

/**
 * This world's opening month and the months before it: the published series
 * moved by the world's own offsets (owner, Oct 27: "realistic, not real";
 * the published figures calibrate the spread and are never copied). A growth
 * offset compounds from the opening month back, so every month's 12-month
 * change carries it; a rate offset moves every month alike.
 */
export function historyMonths(
  startedAt: string,
  seed: string,
  p: MacroParameter,
): MacroMonth[] {
  const published = publishedMonths(startedAt, p);
  const opening = published.at(-p("one"))!.month;
  const o = macroWorldOffsets(seed, p);
  const months = p("macroMonthsPerYear"),
    hundred = p("macroHundred"),
    one = p("one");
  const monthsFrom = (month: string) => {
    const [y, m] = month.split("-").map(Number) as [number, number];
    const [oy, om] = opening.split("-").map(Number) as [number, number];
    return (y - oy) * months + (m - om);
  };
  const grown = (month: string, level: number, growthPoints: number) =>
    (one + level) *
    (one + growthPoints / hundred) ** (monthsFrom(month) / months);
  const floor = p("macroPolicyLowerBoundPct");
  let lagged: number | undefined;
  let before: { outputGapPct: number; outputGapChangePct: number } | undefined;
  return published.map((row) => {
    const unemploymentPct = Math.max(
      p("macroWorldUnemploymentLowestPct"),
      row.unemploymentPct + o.unemploymentPoints,
    );
    const policyRatePct = Math.max(
      floor,
      row.policyRatePct + o.policyRatePoints,
    );
    const inflationPct =
      ((one + row.inflationPct / hundred) *
        (one + o.inflationPoints / hundred) -
        one) *
      hundred;
    lagged = smoothedRealRate(lagged, policyRatePct - inflationPct, p);
    const outputGapPct =
      -p("macroOkunOutputPerUnemploymentPoint") *
      (unemploymentPct - row.naturalUnemploymentPct);
    const outputGapChangePct = smoothedChange(before, outputGapPct, p);
    before = { outputGapPct, outputGapChangePct };
    return {
      ...row,
      outputGapChangePct,
      energyGapPct: p("macroEnergyDemandPull") * outputGapPct,
      realRateLagPct: lagged,
      cyclePeriodYears: o.cyclePeriodYears,
      cycleCapacityPct: o.cycleCapacityPct,
      unemploymentPct,
      priceIndex:
        row.priceIndex * grown(row.month, o.priceLevelShare, o.inflationPoints),
      // The 12-month change of the moved price index, exactly.
      inflationPct:
        ((one + row.inflationPct / hundred) *
          (one + o.inflationPoints / hundred) -
          one) *
        hundred,
      payrollJobsThousands:
        row.payrollJobsThousands *
        grown(row.month, o.jobsLevelShare, o.jobsGrowthPoints),
      hourlyEarnings:
        row.hourlyEarnings *
        grown(row.month, o.wageLevelShare, o.wageGrowthPoints),
      realOutput:
        row.realOutput *
        grown(row.month, o.outputLevelShare, o.outputGrowthPoints),
      outputGapPct,
      policyRatePct,
      primeRatePct: policyRatePct + p("macroPrimeSpreadPct"),
      treasury10Pct: Math.max(floor, row.treasury10Pct + o.longRatePoints),
      mortgage30Pct: row.mortgage30Pct + o.longRatePoints,
    };
  });
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
          previous.expectedInflationPct);
  // The business cycle: an investment accelerator held by a capacity ceiling
  // (Kaldor 1940; Hicks 1950; van der Pol). Spending that is growing pulls
  // more investment (momentum feeds on itself while the gap is inside the
  // ceiling), the swing's own size pushes it back (capacity, credit and
  // inventories run out, more steeply the further out it is), and the real
  // rate spending has felt leans against it. Nothing is scheduled: the
  // swing's length comes from the world's accelerator, its depth from the
  // ceiling, and the rate and the town's income move both.
  const omega = (2 * Math.PI) / (previous.cyclePeriodYears * months);
  const capacity = previous.cycleCapacityPct;
  const realRateLagPct = smoothedRealRate(previous.realRateLagPct, realRate, p);
  const gapChange =
    previous.outputGapChangePct +
    p("macroAcceleratorPerMonth") *
      (p("one") - (previous.outputGapPct / capacity) ** p("two")) *
      previous.outputGapChangePct -
    omega * omega * previous.outputGapPct -
    omega *
      p("macroRealRateEffectOnGap") *
      (realRateLagPct - previous.neutralRealRatePct) +
    town / months;
  const outputGapPct = previous.outputGapPct + gapChange;
  const naturalUnemploymentPct = drift(
    previous.naturalUnemploymentPct,
    previous.unemploymentPct,
    previous.naturalUnemploymentPct,
    p("macroNaturalHysteresisMonths"),
  );
  const unemploymentPct =
    naturalUnemploymentPct -
    outputGapPct / p("macroOkunOutputPerUnemploymentPoint");
  // Energy: demand (last month's gap) pulls its price up against capacity;
  // capacity is built when the price is high and takes years to arrive, so
  // the price swings on its own and moves inflation and the gap with it.
  const energyGapPct =
    p("macroEnergyDemandPull") * previous.outputGapPct -
    p("macroEnergyCapacityPush") * previous.energyCapacityPct;
  const energyCapacityPct =
    previous.energyCapacityPct +
    previous.energyGapPct / p("macroEnergyBuildMonths");
  const anchor = drift(
    previous.expectedInflationPct,
    previous.inflationPct,
    previous.expectedInflationPct,
    p("macroInflationExpectationMonths"),
  );
  const inflationPct =
    anchor +
    p("macroInflationPersistence") * (previous.inflationPct - anchor) +
    p("macroPhillipsSlope") * previous.outputGapPct +
    p("macroEnergyPassThrough") * (energyGapPct - previous.energyGapPct);
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
    outputGapChangePct: gapChange,
    energyGapPct,
    energyCapacityPct,
    realRateLagPct,
    naturalUnemploymentPct,
    neutralRealRatePct: drift(
      previous.neutralRealRatePct,
      previous.treasury10Pct - previous.inflationPct,
      previous.neutralRealRatePct,
      p("macroNeutralRateMonths"),
    ),
    expectedInflationPct: anchor,
    cyclePeriodYears: previous.cyclePeriodYears,
    cycleCapacityPct: previous.cycleCapacityPct,
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
