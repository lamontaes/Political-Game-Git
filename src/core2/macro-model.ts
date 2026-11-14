/** The national month as the game reads it: the past from the published series, each month since from the sum of the states (country-model.ts). */
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
  /** The unemployment rate the economy has come to treat as normal, percent: it drifts toward the rate people have lived at (hysteresis), so it has no fixed resting point. */
  naturalUnemploymentPct: number;
  /** The real interest rate the economy has come to treat as neutral, percent: it follows the real long-term rate people have lived with (the 10-year yield less inflation), so it has no fixed resting point. */
  neutralRealRatePct: number;
  /** The inflation rate people expect, percent: it follows the inflation they have experienced, so inflation has no fixed anchor. */
  expectedInflationPct: number;
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
const BY_MONTH = new Map(ROWS.map((row) => [row.month, row]));
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

/** The opening month: the last complete month before the start, or the last one published. */
function openingMonth(startedAt: string, p: MacroParameter): string {
  const last = ROWS.at(-p("one"))!.month;
  const opening = shiftMonth(monthKey(startedAt), -p("one"), p);
  return opening > last ? last : opening;
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
  const opening = openingMonth(startedAt, p);
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
  };
}

/** The figures a world's offsets move, as a published month or a world's month carries them. */
type MovedFigures = Partial<
  Record<
    | "unemploymentPct"
    | "priceIndex"
    | "payrollJobsThousands"
    | "hourlyEarnings"
    | "realOutput"
    | "policyRatePct"
    | "treasury10Pct"
    | "mortgage30Pct",
    number
  >
>;

/**
 * One published month moved by this world's offsets (owner, Oct 27:
 * "realistic, not real"; Nov 13: "it's simulated... things need to be
 * simulated in order to make your modern day make sense"). The published
 * figures set the base and the shape only. A rate offset moves every month
 * alike; a growth offset compounds from the opening month back, so every
 * month's 12-month change carries it, however far back the month is. The one
 * rule for the months play opens from (`historyMonths`) and the months the
 * history before them records (`worldPublishedMonth`), so the two agree on
 * every month both hold and nothing jumps on day one. Only the figures the
 * row has are moved.
 */
function moveByWorld<Row extends MovedFigures & { month: string }>(
  row: Row,
  opening: string,
  o: MacroWorldOffsets,
  p: MacroParameter,
): Row {
  const months = p("macroMonthsPerYear"),
    hundred = p("macroHundred"),
    one = p("one");
  const [y, m] = row.month.split("-").map(Number) as [number, number];
  const [oy, om] = opening.split("-").map(Number) as [number, number];
  const monthsFrom = (y - oy) * months + (m - om);
  const grown = (level: number, growthPoints: number) =>
    (one + level) * (one + growthPoints / hundred) ** (monthsFrom / months);
  const floor = p("macroPolicyLowerBoundPct");
  const moved: MovedFigures = {};
  if (row.unemploymentPct !== undefined)
    moved.unemploymentPct = Math.max(
      p("macroWorldUnemploymentLowestPct"),
      row.unemploymentPct + o.unemploymentPoints,
    );
  if (row.priceIndex !== undefined)
    moved.priceIndex =
      row.priceIndex * grown(o.priceLevelShare, o.inflationPoints);
  if (row.payrollJobsThousands !== undefined)
    moved.payrollJobsThousands =
      row.payrollJobsThousands * grown(o.jobsLevelShare, o.jobsGrowthPoints);
  if (row.hourlyEarnings !== undefined)
    moved.hourlyEarnings =
      row.hourlyEarnings * grown(o.wageLevelShare, o.wageGrowthPoints);
  if (row.realOutput !== undefined)
    moved.realOutput =
      row.realOutput * grown(o.outputLevelShare, o.outputGrowthPoints);
  if (row.policyRatePct !== undefined)
    moved.policyRatePct = Math.max(
      floor,
      row.policyRatePct + o.policyRatePoints,
    );
  if (row.treasury10Pct !== undefined)
    moved.treasury10Pct = Math.max(floor, row.treasury10Pct + o.longRatePoints);
  if (row.mortgage30Pct !== undefined)
    moved.mortgage30Pct = row.mortgage30Pct + o.longRatePoints;
  return { ...row, ...moved };
}

/**
 * This world's opening month and the months before it: the published series
 * moved by the world's own offsets (`moveByWorld`; the published figures
 * calibrate the spread and are never copied).
 */
export function historyMonths(
  startedAt: string,
  seed: string,
  p: MacroParameter,
): MacroMonth[] {
  const published = publishedMonths(startedAt, p);
  const opening = published.at(-p("one"))!.month;
  const o = macroWorldOffsets(seed, p);
  const hundred = p("macroHundred"),
    one = p("one");
  return published.map((row) => {
    const moved = moveByWorld(row, opening, o, p);
    return {
      ...moved,
      // The 12-month change of the moved price index, exactly.
      inflationPct:
        ((one + row.inflationPct / hundred) *
          (one + o.inflationPoints / hundred) -
          one) *
        hundred,
      outputGapPct:
        -p("macroOkunOutputPerUnemploymentPoint") *
        (moved.unemploymentPct - row.naturalUnemploymentPct),
      primeRatePct: moved.policyRatePct + p("macroPrimeSpreadPct"),
    };
  });
}

/**
 * A past month in this world, as the history before the start records it:
 * the agencies' month (BLS, Fed H.15, FHFA) moved by the world's offsets, by
 * the same rule as the months play opens from. Undefined for a month nothing
 * was published for.
 */
export function worldPublishedMonth(
  month: string,
  startedAt: string,
  seed: string,
  p: MacroParameter,
): Readonly<HistoryRow> | undefined {
  const row = BY_MONTH.get(month);
  if (!row) return undefined;
  return moveByWorld(
    row,
    openingMonth(startedAt, p),
    macroWorldOffsets(seed, p),
    p,
  );
}

/** What the sum of the states came to in a month, as the national row needs it (country-model.ts). */
export interface NationFigures {
  unemploymentPct: number;
  priceIndex: number;
  jobs: number;
  hourlyPay: number;
  realOutput: number;
  /** Sales asked of firms against what their staff makes at normal hours, less one. */
  busy: number;
}

/**
 * The national month, from the sum of the states. Nothing here moves the
 * economy: the levels are the opening month's figures times how far the
 * states' sums have moved since, the 12-month price change is read from the
 * rows themselves, and the rates a bank quotes follow the central bank's.
 * What people have come to treat as normal (the unemployment rate, the real
 * rate, the price rises they expect) follows what they have lived.
 */
export function countryMacroMonth(
  previous: Readonly<MacroMonth>,
  opening: Readonly<{ row: MacroMonth; nation: NationFigures }>,
  nation: Readonly<NationFigures>,
  yearEarlier: Readonly<MacroMonth> | undefined,
  policyRatePct: number,
  p: MacroParameter,
): MacroMonth {
  const hundred = p("macroHundred"),
    one = p("one");
  const month = shiftMonth(previous.month, one, p);
  const since = (now: number, then: number) => (then > 0 ? now / then : one);
  const priceIndex =
    opening.row.priceIndex *
    since(nation.priceIndex, opening.nation.priceIndex);
  return {
    id: `macro-month:${month}`,
    month,
    kind: "simulated",
    unemploymentPct: nation.unemploymentPct,
    priceIndex,
    inflationPct: yearEarlier
      ? (priceIndex / yearEarlier.priceIndex - one) * hundred
      : previous.inflationPct,
    payrollJobsThousands:
      opening.row.payrollJobsThousands *
      since(nation.jobs, opening.nation.jobs),
    hourlyEarnings:
      opening.row.hourlyEarnings *
      since(nation.hourlyPay, opening.nation.hourlyPay),
    realOutput:
      opening.row.realOutput *
      since(nation.realOutput, opening.nation.realOutput),
    // perception: nobody observes the gap; it is read as the opening month's reading plus how busy firms' staff have become since
    outputGapPct: opening.row.outputGapPct + nation.busy * hundred,
    naturalUnemploymentPct: drift(
      previous.naturalUnemploymentPct,
      previous.unemploymentPct,
      previous.naturalUnemploymentPct,
      p("macroNaturalHysteresisMonths"),
    ),
    neutralRealRatePct: drift(
      previous.neutralRealRatePct,
      previous.treasury10Pct - previous.inflationPct,
      previous.neutralRealRatePct,
      p("macroNeutralRateMonths"),
    ),
    expectedInflationPct: drift(
      previous.expectedInflationPct,
      previous.inflationPct,
      previous.expectedInflationPct,
      p("macroInflationExpectationMonths"),
    ),
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

/** The 30-year fixed mortgage rate in a past month (FHFA MIRS; after 2019 the 10-year plus its spread). */
export function historicalMortgageRate(
  month: string,
  p: MacroParameter,
): number {
  const first = ROWS[0]!.month;
  return mortgageAt(BY_MONTH, month < first ? first : month, p);
}
