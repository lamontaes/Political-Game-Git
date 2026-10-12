/** Retained private pension carve and actuarial contribution math; the caller owns its output budget record. */
import {
  PENSION,
  BUDGET_PROGRAMS,
  PROTECTED_PROGRAMS,
  sum,
} from "./budget-policy";
import type { PensionRecord } from "../../simulation/public-budgets/store";
export function openingPension(
  spending: number,
  paidShare: number,
  fundedRatio: number,
  normalCostShare: number,
  liabilityToSpending: number,
): {
  pension: PensionRecord;
  required: number;
} {
  const liability = Math.round(spending * liabilityToSpending);
  const assets = Math.round(liability * fundedRatio);
  return {
    pension: { liability, assets, paidShare },
    required: actuarialContribution({ liability, assets }, normalCostShare),
  };
}
export function actuarialContribution(
  pension: Pick<PensionRecord, "liability" | "assets">,
  normalCostShare: number,
): number {
  return Math.round(
    pension.liability * normalCostShare +
      Math.max(0, pension.liability - pension.assets) * AMORTIZATION_FACTOR,
  );
}
export const AMORTIZATION_FACTOR =
  PENSION.assumedReturn /
  (1 - (1 + PENSION.assumedReturn) ** -PENSION.amortizationYears);
export function carvePension(spending: number[], contribution: number): void {
  const index = BUDGET_PROGRAMS.indexOf("pensionContribution");
  const cuttable = BUDGET_PROGRAMS.map((program, at) =>
    PROTECTED_PROGRAMS.has(program) || program === "localAid"
      ? 0
      : spending[at]!,
  );
  const base = sum(cuttable);
  if (base <= 0) return;
  const paid = Math.min(contribution, base);
  const scale = (base - paid) / base;
  for (let at = 0; at < spending.length; at += 1)
    if (cuttable[at]! > 0) spending[at] = Math.round(spending[at]! * scale);
  spending[index] = paid;
}
