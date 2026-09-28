/**
 * Income tax withheld from one paycheck, federal and state.
 *
 * The method Claude CTO approved on September 28, 2026: annualize the
 * paycheck, subtract the standard deduction for the worker's filing status,
 * apply that status's 2026 brackets, and divide the year's tax back over the
 * pay periods. A schedule the research has not read is UNKNOWN, never zero and
 * never borrowed from another filing status or place.
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
import { daysBetween } from "./dates";
import { activePartnershipsAt, householdMembershipsAt } from "./life-queries";
import { childrenOf } from "./people-family";
import type { EntityId, ResourceTransferOutcome, World } from "./types";

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

const rates = [1000, 1200, 2200, 2400, 3200, 3500, 3700];
const schedule = (
  standardDeductionDollars: number,
  thresholdsDollars: readonly number[],
): IncomeTaxSchedule => ({
  standardDeductionMinor: standardDeductionDollars * 100,
  brackets: rates.map((rateBasisPoints, index) => ({
    overMinor: index === 0 ? 0 : thresholdsDollars[index - 1]! * 100,
    rateBasisPoints,
  })),
  sourceUrl: FEDERAL_INCOME_TAX_SOURCE,
});

/**
 * Tax year 2026, Revenue Procedure 2025-32 as the IRS announced it. Single:
 * the 56-place intake (checked September 22, 2026). Married filing jointly:
 * the same IRS announcement as a search summary read on September 28, 2026.
 * Head of household: only the standard deduction ($24,150) and the first
 * bracket's top ($17,700) have been read, so its schedule is UNKNOWN.
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
  "head-of-household": null,
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

/**
 * A state's 2026 schedule for this filing status, or the reason there is
 * none. Only single schedules have been read. A state whose single filer has
 * no standard deduction ("n.a." in the compilation) uses personal exemptions
 * or credits instead, which have not been read, so it is UNKNOWN too.
 */
export function stateIncomeTaxSchedule(
  stateKey: string,
  status: FilingStatus,
):
  | { readonly kind: "schedule"; readonly schedule: IncomeTaxSchedule }
  | { readonly kind: "none" }
  | { readonly kind: "unknown"; readonly researchQuestionId: string } {
  const place = STATE_PLACES[stateKey];
  if (!place)
    return {
      kind: "unknown",
      researchQuestionId: "state-wage-income-tax-withholding",
    };
  if (place.wageIncomeTax === "none") return { kind: "none" };
  if (status !== "single")
    return {
      kind: "unknown",
      researchQuestionId: "state-income-tax-filing-status-schedules-2026",
    };
  if (place.standardDeductionSingle === null)
    return {
      kind: "unknown",
      researchQuestionId: "state-personal-exemptions-and-credits-2026",
    };
  return {
    kind: "schedule",
    schedule: {
      standardDeductionMinor: place.standardDeductionSingle * 100,
      brackets: place.brackets.map((bracket) => ({
        overMinor: bracket.overSingle * 100,
        rateBasisPoints: Math.round(bracket.ratePercent * 100),
      })),
      sourceUrl: STATE_SOURCE,
    },
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
