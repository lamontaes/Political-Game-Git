import { ECONOMY_RULE_PARAMETERS as parameters } from "./parameters";

export type LoanRepaymentFacts =
  | {
      readonly kind: "installment";
      readonly scheduledPaymentMinor: number;
    }
  | {
      readonly kind: "revolving";
      readonly principalShareBasisPoints: number;
      readonly minimumPaymentFloorMinor: number;
    };

export interface LoanMonthFacts {
  readonly openingBalanceMinor: number;
  readonly annualRateBasisPoints: number;
  readonly repayment: LoanRepaymentFacts;
}

export interface LoanMonthAmounts {
  readonly interestMinor: number;
  readonly amountOwedMinor: number;
  readonly scheduledPaymentMinor: number;
  readonly amountDueMinor: number;
}

/** Calculate one month's loan amounts after balance, rate, and terms are read. */
export function loanMonthAmountsFromFacts(
  facts: LoanMonthFacts,
): LoanMonthAmounts | null {
  if (
    !Number.isSafeInteger(facts.openingBalanceMinor) ||
    facts.openingBalanceMinor < 0 ||
    !Number.isFinite(facts.annualRateBasisPoints) ||
    facts.annualRateBasisPoints < 0
  )
    return null;
  const balance = facts.openingBalanceMinor;
  const interest =
    balance <= 0
      ? 0
      : Math.round(
          (balance * facts.annualRateBasisPoints) /
            parameters.basisPointsPerWholeRate.value /
            parameters.monthsPerYear.value,
        );
  const owed = balance + interest;
  let scheduled: number;
  if (facts.repayment.kind === "installment") {
    if (
      !Number.isSafeInteger(facts.repayment.scheduledPaymentMinor) ||
      facts.repayment.scheduledPaymentMinor < 0
    )
      return null;
    scheduled = facts.repayment.scheduledPaymentMinor;
  } else {
    const { principalShareBasisPoints, minimumPaymentFloorMinor } =
      facts.repayment;
    if (
      !Number.isFinite(principalShareBasisPoints) ||
      principalShareBasisPoints < 0 ||
      !Number.isSafeInteger(minimumPaymentFloorMinor) ||
      minimumPaymentFloorMinor < 0
    )
      return null;
    const principalShare = Math.ceil(
      (balance * principalShareBasisPoints) /
        parameters.basisPointsPerWholeRate.value,
    );
    scheduled = Math.min(
      owed,
      Math.max(minimumPaymentFloorMinor, principalShare + interest),
    );
  }
  return {
    interestMinor: interest,
    amountOwedMinor: owed,
    scheduledPaymentMinor: scheduled,
    amountDueMinor: Math.min(owed, scheduled),
  };
}
