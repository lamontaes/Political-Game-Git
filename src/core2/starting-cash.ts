/** Opening cash: what a family at a given income keeps in its accounts (SCF 2022). */
import { worldLevel } from "./world-draw";
import scf from "../../data/research/money/scf-transaction-accounts-2022.json" with { type: "json" };

/**
 * The money a family at this income keeps in checking, savings and money
 * market accounts, as the Survey of Consumer Finances 2022 measured it: the
 * median held by families that hold such accounts, for each income group
 * (`data/research/money/scf-transaction-accounts-2022.json`). Between two
 * groups' median incomes the balance's share of income is read along a line
 * in the logarithm of income; outside them it takes the nearest group's share.
 * A share, not a dollar amount, so the 2022 table reads the same at 2026 pay.
 * This is the published calibration; play reads `medianTransactionBalance`.
 */
export function publishedTransactionBalance(annualPay: number): number {
  const points = scf.groups.map((group) => ({
    logIncome: Math.log(group.medianFamilyIncome),
    share: group.medianTransactionAccounts / group.medianFamilyIncome,
  }));
  const first = points[0]!;
  const last = points.at(-1)!;
  if (annualPay <= 0) return 0;
  const logPay = Math.log(annualPay);
  let share: number;
  if (logPay <= first.logIncome) share = first.share;
  else if (logPay >= last.logIncome) share = last.share;
  else {
    const upper = points.findIndex((point) => point.logIncome >= logPay);
    const low = points[upper - 1]!;
    const high = points[upper]!;
    const along = (logPay - low.logIncome) / (high.logIncome - low.logIncome);
    share = low.share + along * (high.share - low.share);
  }
  return annualPay * share;
}

/**
 * What a family at this income keeps in its accounts in this world: the
 * published median, scaled by one balance level drawn per world from its seed
 * (realistic, not real; owner, Oct 27). Every opening cash reads this.
 */
export function medianTransactionBalance(
  annualPay: number,
  seed: string,
): number {
  return worldLevel(
    publishedTransactionBalance(annualPay),
    seed,
    "world-cash-level",
    "worldCashSpreadShare",
  );
}
