import {
  reciprocalRankedReferences,
  weightedReferenceMean,
} from "./income-tax-withholding";
import premiumRows from "../../data/research/money/state-paid-leave-premiums-2026.json" with { type: "json" };
import benefitRows from "../../data/research/money/state-paid-leave-benefits-2026.json" with { type: "json" };
import householdIncome from "../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import { censusRegionOf } from "./world-setup/census-regions";

type EstimateKind = "employee-premium" | "low-wage-benefit";
interface Reference {
  readonly stateKey: string;
  readonly percent: number;
  readonly sameRegion: boolean;
  readonly incomeDistanceDollars: number;
  readonly rank: number;
  readonly weight: number;
}
interface Estimate {
  readonly percent: number;
  readonly references: readonly Reference[];
  readonly method: string;
}
const INCOMES: Readonly<Record<string, number>> =
  householdIncome.medianHouseholdIncomeDollarsByState;
const SOURCES = {
  "employee-premium": Object.entries(premiumRows.places).flatMap(
    ([stateKey, row]) =>
      row.status === "read" && row.employeePercent !== null
        ? [{ stateKey, percent: row.employeePercent }]
        : [],
  ),
  "low-wage-benefit": Object.entries(benefitRows.places).flatMap(
    ([stateKey, row]) =>
      row.status === "read" && row.lowWageReplacementPercent !== null
        ? [{ stateKey, percent: row.lowWageReplacementPercent }]
        : [],
  ),
} satisfies Record<
  EstimateKind,
  readonly { stateKey: string; percent: number }[]
>;
const CACHE = new Map<string, Estimate>();

/** Existing same-program facts; #1369 weights are authored, not empirical rates. */
export function rankedPaidLeaveEstimate(
  stateKey: string,
  kind: EstimateKind,
): Estimate {
  const cacheKey = `${kind}:${stateKey}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;
  const income = INCOMES[stateKey];
  const region =
    income === undefined ? null : censusRegionOf(stateKey.slice(3));
  const compare = (
    a: Omit<Reference, "rank" | "weight">,
    b: Omit<Reference, "rank" | "weight">,
  ) =>
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistanceDollars - b.incomeDistanceDollars;
  const candidates = SOURCES[kind]
    .filter(
      (row) => income === undefined || INCOMES[row.stateKey] !== undefined,
    )
    .map((row) => ({
      ...row,
      sameRegion:
        income !== undefined &&
        censusRegionOf(row.stateKey.slice(3)) === region,
      incomeDistanceDollars:
        income === undefined ? 0 : Math.abs(INCOMES[row.stateKey]! - income),
    }));
  if (candidates.length === 0)
    throw new Error("No sourced paid-leave rates to estimate from.");
  const references = reciprocalRankedReferences(
    candidates,
    compare,
    (row) => row.stateKey,
  );
  const estimate = {
    percent: weightedReferenceMean(references, (row) => row.percent),
    references,
    method:
      income === undefined
        ? "same-program plain mean because target household income is unread"
        : "same-program Census region and household-income distance; authored reciprocal-rank weights",
  };
  CACHE.set(cacheKey, estimate);
  return estimate;
}
