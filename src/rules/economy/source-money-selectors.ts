/** Retained KEEP source/helper closure; unchanged native public-owner proof is bounded. */
import type { IsoDate } from "../../simulation/types";
import type scf from "../../../data/research/money/scf-transaction-accounts-2022.json";
import type debtResearch from "../../../data/research/money/debt-and-credit-2026.json";
export interface TransactionAccountFacts {
  readonly groups: typeof scf.groups;
}
export interface StudentRateFacts {
  readonly research: typeof debtResearch;
}
// stopgapId: "economy.starting-cash-source-interpolation"
export function medianTransactionBalance(
  facts: TransactionAccountFacts,
  annualPay: number,
): number {
  const points = facts.groups.map((group) => ({
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
// stopgapId: "economy.student-rate-nearest-award"
export function studentLoanRateFor(
  facts: StudentRateFacts,
  asOf: IsoDate,
): {
  readonly annualRateBasisPoints: number;
  readonly awardYear: string;
  readonly source: string;
  readonly publishedWindow: boolean;
  readonly estimated: boolean;
} {
  const STUDENT_LOAN_RATE_ROW = facts.research.rates.federalStudentLoans2026_27;

  const start = STUDENT_LOAN_RATE_ROW.firstDisbursedBetween[0]!;
  const end = STUDENT_LOAN_RATE_ROW.firstDisbursedBetween[1]!;
  const rate = STUDENT_LOAN_RATE_ROW.undergraduateDirect.value;
  const publishedWindow = asOf >= start && asOf <= end;
  return {
    annualRateBasisPoints: Math.round(rate * 100),
    awardYear: "2026-27",
    source: facts.research.sources.find(
      (source) => source.key === "fsa-rates-2026-27",
    )!.url,
    publishedWindow,
    estimated: true,
  };
}
