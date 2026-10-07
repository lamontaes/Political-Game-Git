import { spreadOf, type Spread } from "./sample-spread";
/**
 * Income tax withheld from one paycheck, federal and state.
 *
 * The method Claude CTO approved on September 28, 2026: annualize the
 * paycheck, subtract the standard deduction for the worker's filing status,
 * apply that status's 2026 brackets, and divide the year's tax back over the
 * pay periods. Under his 11:54 p.m. ruling that day, a part of a state's
 * schedule the research has not read is ESTIMATED FROM AVERAGE, never
 * UNKNOWN (see `stateIncomeTaxSchedule`).
 *
 * Two labeled game rules sit under that method:
 * - Filing status comes from the person's own records: a legal marriage files
 *   jointly; an unmarried parent living with their own child under 19 files as
 *   head of household; everyone else files single. Nobody fills out a W-4.
 * - Pay periods a year come from the length of the pay period that just paid:
 *   a day is one of 260 working days (the daily payroll count in IRS
 *   Publication 15-T), a week one of 52, two weeks one of 26, half a month one
 *   of 24, a month one of 12, anything else 365 over its length in days.
 */
import stateIncomeTax2026 from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import stateHouseholdIncome2023 from "../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import { daysBetween } from "./dates";
import { activePartnershipsAt, householdMembershipsAt } from "./life-queries";
import { childrenOf } from "./people-family";
import type { EntityId, ResourceTransferOutcome, World } from "./types";
import { censusRegionOf } from "./world-setup/census-regions";

export type FilingStatus =
  "single" | "married-filing-jointly" | "head-of-household";

/** One bracket: the rate, in basis points, on taxable income over `overMinor`. */
export interface IncomeTaxBracket {
  readonly overMinor: number;
  readonly rateBasisPoints: number;
}

export interface IncomeTaxSchedule {
  readonly standardDeductionMinor: number;
  readonly brackets: readonly IncomeTaxBracket[];
  readonly sourceUrl: string;
}

export const FEDERAL_INCOME_TAX_SOURCE =
  "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill";

/** Revenue Procedure 2025-32, whose Table 2 gives the head-of-household rates. */
export const FEDERAL_HEAD_OF_HOUSEHOLD_SOURCE =
  "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf";

const rates = [1000, 1200, 2200, 2400, 3200, 3500, 3700];
const schedule = (
  standardDeductionDollars: number,
  thresholdsDollars: readonly number[],
  sourceUrl: string = FEDERAL_INCOME_TAX_SOURCE,
): IncomeTaxSchedule => ({
  standardDeductionMinor: standardDeductionDollars * 100,
  brackets: rates.map((rateBasisPoints, index) => ({
    overMinor: index === 0 ? 0 : thresholdsDollars[index - 1]! * 100,
    rateBasisPoints,
  })),
  sourceUrl,
});

/**
 * Tax year 2026, Revenue Procedure 2025-32 as the IRS announced it. Single:
 * the 56-place intake (checked September 22, 2026). Married filing jointly:
 * the same IRS announcement as a search summary read on September 28, 2026.
 * Head of household: the standard deduction ($24,150) from the announcement
 * and the brackets from the Revenue Procedure's Table 2, read on September 29,
 * 2026.
 */
export const FEDERAL_INCOME_TAX_2026: Readonly<
  Record<FilingStatus, IncomeTaxSchedule | null>
> = {
  single: schedule(
    16_100,
    [12_400, 50_400, 105_700, 201_775, 256_225, 640_600],
  ),
  "married-filing-jointly": schedule(
    32_200,
    [24_800, 100_800, 211_400, 403_550, 512_450, 768_700],
  ),
  "head-of-household": schedule(
    24_150,
    [17_700, 67_450, 105_700, 201_750, 256_200, 640_600],
    FEDERAL_HEAD_OF_HOUSEHOLD_SOURCE,
  ),
};

interface StatePlace {
  readonly wageIncomeTax: string;
  readonly brackets: readonly {
    readonly ratePercent: number;
    readonly overSingle: number;
  }[];
  readonly standardDeductionSingle: number | null;
  readonly standardDeductionNote?: string;
}

const STATE_SOURCE = stateIncomeTax2026.source.url;
const STATE_PLACES = stateIncomeTax2026.places as Readonly<
  Record<string, StatePlace>
>;

export { spreadOf } from "./sample-spread";
export type { Spread } from "./sample-spread";

/**
 * The single filer's standard deduction, in dollars, across the states with
 * this kind of wage income tax whose deduction was read.
 */
export function stateDeductionSpread(shape: "flat" | "graduated"): Spread {
  return spreadOf(
    Object.values(STATE_PLACES).flatMap((place) =>
      place.wageIncomeTax === shape && place.standardDeductionSingle !== null
        ? [place.standardDeductionSingle]
        : [],
    ),
  );
}

/**
 * The existing similar-state estimator's shared ranking step. Closeness comes
 * from each consumer's sourced facts. Ties share a competition rank; the
 * stable key orders display only. Reciprocal weights are authored estimates.
 */
export function reciprocalRankedReferences<T>(
  rows: readonly T[],
  compareCloseness: (a: T, b: T) => number,
  stableKey: (row: T) => string,
): readonly (T & { readonly rank: number; readonly weight: number })[] {
  const candidates = [...rows].sort(
    (a, b) =>
      compareCloseness(a, b) || stableKey(a).localeCompare(stableKey(b)),
  );
  let rank = 1;
  return candidates.map((candidate, index) => {
    if (index > 0 && compareCloseness(candidate, candidates[index - 1]!) !== 0)
      rank = index + 1;
    return { ...candidate, rank, weight: 1 / rank };
  });
}

/** The same weighted mean used by the existing deduction estimator. */
export function weightedReferenceMean<T extends { readonly weight: number }>(
  references: readonly T[],
  value: (reference: T) => number,
): number {
  if (references.length === 0)
    throw new Error("No sourced references for the weighted estimate.");
  return (
    references.reduce((sum, row) => sum + value(row) * row.weight, 0) /
    references.reduce((sum, row) => sum + row.weight, 0)
  );
}

export interface StateDeductionReference {
  readonly stateKey: string;
  readonly deductionDollars: number;
  readonly sameTaxStructure: boolean;
  readonly sameRegion: boolean;
  readonly incomeDistanceDollars: number;
  readonly rank: number;
  readonly weight: number;
}

export interface StateDeductionEstimate {
  readonly mean: number;
  readonly references: readonly StateDeductionReference[];
}

const HOUSEHOLD_INCOMES: Readonly<Record<string, number>> =
  stateHouseholdIncome2023.medianHouseholdIncomeDollarsByState;
// Source packets are immutable; reuse the derived ranking across paychecks.
const DEDUCTION_ESTIMATES = new Map<string, StateDeductionEstimate>();

function householdIncomeDollars(stateKey: string): number {
  const income = HOUSEHOLD_INCOMES[stateKey];
  if (income === undefined)
    throw new Error(`No sourced household income for ${stateKey}.`);
  return income;
}

/**
 * Owner's September 30 similar-state fallback. All read deductions are ranked
 * by tax structure, then Census region, then household-income distance.
 * Reciprocal rank is an authored estimation rule, not an empirical coefficient.
 * Equal closeness shares a competition rank and weight; no seed chooses a level.
 */
export function stateDeductionEstimate(
  stateKey: string,
): StateDeductionEstimate {
  const cached = DEDUCTION_ESTIMATES.get(stateKey);
  if (cached) return cached;
  const target = STATE_PLACES[stateKey];
  if (!target || !["flat", "graduated"].includes(target.wageIncomeTax))
    throw new Error(`No state wage-tax structure for ${stateKey}.`);
  const targetIncome = householdIncomeDollars(stateKey);
  const targetRegion = censusRegionOf(stateKey.slice(3));
  const compareCloseness = (
    a: Omit<StateDeductionReference, "rank" | "weight">,
    b: Omit<StateDeductionReference, "rank" | "weight">,
  ): number =>
    Number(b.sameTaxStructure) - Number(a.sameTaxStructure) ||
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistanceDollars - b.incomeDistanceDollars;
  const candidates = Object.entries(STATE_PLACES).flatMap(([key, place]) =>
    place.standardDeductionSingle !== null &&
    ["flat", "graduated"].includes(place.wageIncomeTax)
      ? [
          {
            stateKey: key,
            deductionDollars: place.standardDeductionSingle,
            sameTaxStructure: place.wageIncomeTax === target.wageIncomeTax,
            sameRegion: censusRegionOf(key.slice(3)) === targetRegion,
            incomeDistanceDollars: Math.abs(
              householdIncomeDollars(key) - targetIncome,
            ),
          },
        ]
      : [],
  );
  if (candidates.length === 0)
    throw new Error("No read state deductions for the similar-state estimate.");
  const references = reciprocalRankedReferences(
    candidates,
    compareCloseness,
    (row) => row.stateKey,
  );
  const estimate = {
    mean: weightedReferenceMean(references, (ref) => ref.deductionDollars),
    references,
  };
  DEDUCTION_ESTIMATES.set(stateKey, estimate);
  return estimate;
}

/**
 * Most common state rules for a filing status whose schedule has not been
 * read, not yet counted state by state: a joint return doubles the single
 * brackets and deduction, and a head of household files on the single
 * schedule.
 */
export const STATE_FILING_STATUS_NOTE: Readonly<Record<FilingStatus, string>> =
  {
    single: "",
    "married-filing-jointly":
      "A joint return doubles the single brackets and deduction, the most common state rule (not yet counted state by state).",
    "head-of-household":
      "A head of household files on the single schedule, the most common state rule (not yet counted state by state).",
  };

export function stateScheduleForFilingStatus(
  single: IncomeTaxSchedule,
  status: FilingStatus,
): IncomeTaxSchedule {
  if (status !== "married-filing-jointly") return single;
  return {
    ...single,
    standardDeductionMinor: single.standardDeductionMinor * 2,
    brackets: single.brackets.map((bracket) => ({
      ...bracket,
      overMinor: bracket.overMinor * 2,
    })),
  };
}

/**
 * A state's 2026 schedule for this filing status, or the reason there is
 * none. Only single schedules have been read. Under Claude CTO's 11:54 p.m.
 * ruling of September 28, 2026, the parts not read are ESTIMATED FROM
 * AVERAGE rather than UNKNOWN, and the schedule says so:
 * - a state whose single filer has no standard deduction ("n.a." in the
 *   compilation; it uses personal exemptions or credits, not yet read) takes
 *   a weighted average of read deductions, ranked by matching tax structure,
 *   Census region, then household income, rounded to whole dollars (owner's
 *   September 30, 10:34 p.m. ruling);
 * - another filing status follows `STATE_FILING_STATUS_NOTE`.
 * A place outside the compilation (the territories) stays UNKNOWN: no state
 * is like a territory's own income tax.
 */
export function stateIncomeTaxSchedule(
  stateKey: string,
  status: FilingStatus,
  worldSeed: string,
):
  | {
      readonly kind: "schedule";
      readonly schedule: IncomeTaxSchedule;
      /** Set when any part of the schedule was estimated. */
      readonly estimatedFromAverage?: string;
    }
  | { readonly kind: "none" }
  | { readonly kind: "unknown"; readonly researchQuestionId: string } {
  // Preserve the existing caller signature; the estimate no longer uses a seed.
  void worldSeed;
  const place = STATE_PLACES[stateKey];
  if (!place)
    return {
      kind: "unknown",
      researchQuestionId: "state-wage-income-tax-withholding",
    };
  if (place.wageIncomeTax === "none") return { kind: "none" };
  const notes: string[] = [];
  let deductionDollars = place.standardDeductionSingle;
  if (deductionDollars === null) {
    const estimate = stateDeductionEstimate(stateKey);
    deductionDollars = Math.round(estimate.mean);
    notes.push(
      `ESTIMATED FROM AVERAGE: the state's personal exemptions or credits are not read, so its single filer takes a standard deduction of $${deductionDollars.toLocaleString("en-US")}, ` +
        `from a weighted average of the ${estimate.references.length} read deductions, ranked by matching tax structure, then Census region, then nearest median household income, rounded to whole dollars. ` +
        "Weights are reciprocal ranks (equal closeness gets equal weight), an authored estimation rule. " +
        "Sources: Tax Foundation, State Individual Income Tax Rates and Brackets, 2026; U.S. Census Bureau, CPS ASEC Table H-8, 2023 median household income in current dollars.",
    );
  }
  if (status !== "single")
    notes.push(
      `${notes.length === 0 ? "ESTIMATED FROM AVERAGE: the state's own brackets and deduction (Tax Foundation 2026). " : ""}${STATE_FILING_STATUS_NOTE[status]}`,
    );
  const single: IncomeTaxSchedule = {
    standardDeductionMinor: deductionDollars * 100,
    brackets: place.brackets.map((bracket) => ({
      overMinor: bracket.overSingle * 100,
      rateBasisPoints: Math.round(bracket.ratePercent * 100),
    })),
    sourceUrl: STATE_SOURCE,
  };
  return {
    kind: "schedule",
    schedule: stateScheduleForFilingStatus(single, status),
    ...(notes.length ? { estimatedFromAverage: notes.join(" ") } : {}),
  };
}

/** The filing status the game gives this person today (see the file note). */
export function filingStatusAt(world: World, personId: EntityId): FilingStatus {
  if (
    activePartnershipsAt(world, personId).some(
      (partnership) => partnership.kind === "legal:marriage",
    )
  )
    return "married-filing-jointly";
  const households = new Set(
    householdMembershipsAt(world, personId).map(
      (active) => active.membership.householdId,
    ),
  );
  const livesWithOwnChild = childrenOf(world, personId).some((childId) => {
    const child = world.people[childId];
    if (!child) return false;
    if (daysBetween(child.birthDate, world.currentDate) >= 19 * 365.25)
      return false;
    return householdMembershipsAt(world, childId).some((active) =>
      households.has(active.membership.householdId),
    );
  });
  return livesWithOwnChild ? "head-of-household" : "single";
}

/** Pay periods in a year for the period this pay covered (see the file note). */
export function payPeriodsPerYear(
  outcome: Pick<ResourceTransferOutcome, "periodStartsAt" | "periodEndsAt">,
): number {
  const days = daysBetween(outcome.periodStartsAt, outcome.periodEndsAt) + 1;
  if (days <= 1) return 260;
  if (days === 7) return 52;
  if (days === 14) return 26;
  if (days >= 15 && days <= 16) return 24;
  if (days >= 28 && days <= 31) return 12;
  return Math.max(1, Math.round(365 / days));
}

/** A year's tax on taxable income under brackets, to the cent, half up. */
export function annualTax(
  taxableMinor: number,
  brackets: readonly IncomeTaxBracket[],
): number {
  let tax = 0n;
  for (let index = 0; index < brackets.length; index += 1) {
    const bracket = brackets[index]!;
    const top = brackets[index + 1]?.overMinor ?? Number.POSITIVE_INFINITY;
    if (taxableMinor <= bracket.overMinor) break;
    const inBracket = Math.min(taxableMinor, top) - bracket.overMinor;
    tax += BigInt(inBracket) * BigInt(bracket.rateBasisPoints);
  }
  return Number((tax * 2n + 10_000n) / 20_000n);
}

/**
 * What one paycheck withholds under a schedule: the year's tax on the
 * annualized paycheck, over the pay periods, half up to the cent.
 */
export function withholdingForPaycheck(
  wagesMinor: number,
  periodsPerYear: number,
  schedule: IncomeTaxSchedule,
): { readonly taxableMinor: number; readonly withheldMinor: number } {
  const annualWages = wagesMinor * periodsPerYear;
  const taxableAnnual = Math.max(
    0,
    annualWages - schedule.standardDeductionMinor,
  );
  const yearTax = annualTax(taxableAnnual, schedule.brackets);
  return {
    taxableMinor: Math.round(taxableAnnual / periodsPerYear),
    withheldMinor: Math.round(yearTax / periodsPerYear),
  };
}
