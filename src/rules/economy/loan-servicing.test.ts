import { describe, expect, it } from "vitest";
import {
  monthlyInterestMinor,
  revolvingMinimumPaymentMinor,
} from "../../simulation/public-benefit-formulas";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { loanMonthAmountsFromFacts } from "./loan-servicing";

describe("standalone monthly loan servicing amounts", () => {
  it.each(lifePlaceStateIdentities())(
    "matches legacy loan amounts for $jurisdictionKey",
    (place) => {
      const usps = place.usps;
      const openingBalanceMinor = 1_000_000 + usps.charCodeAt(0) * 10_000;
      const annualRateBasisPoints = 900 + usps.charCodeAt(1) * 10;
      const interest = monthlyInterestMinor(
        openingBalanceMinor,
        annualRateBasisPoints,
      );
      const principalShareBasisPoints = 2500;
      const minimumPaymentFloorMinor = 5000;
      const revolving = loanMonthAmountsFromFacts({
        openingBalanceMinor,
        annualRateBasisPoints,
        repayment: {
          kind: "revolving",
          principalShareBasisPoints,
          minimumPaymentFloorMinor,
        },
      });
      const legacyScheduled = revolvingMinimumPaymentMinor(
        openingBalanceMinor,
        annualRateBasisPoints,
        principalShareBasisPoints,
        minimumPaymentFloorMinor,
      );
      expect(revolving).toEqual({
        interestMinor: interest,
        amountOwedMinor: openingBalanceMinor + interest,
        scheduledPaymentMinor: legacyScheduled,
        amountDueMinor: legacyScheduled,
      });

      const installmentPaymentMinor = 7500;
      const installment = loanMonthAmountsFromFacts({
        openingBalanceMinor,
        annualRateBasisPoints,
        repayment: {
          kind: "installment",
          scheduledPaymentMinor: installmentPaymentMinor,
        },
      });
      expect(installment).toEqual({
        interestMinor: interest,
        amountOwedMinor: openingBalanceMinor + interest,
        scheduledPaymentMinor: installmentPaymentMinor,
        amountDueMinor: Math.min(
          openingBalanceMinor + interest,
          installmentPaymentMinor,
        ),
      });
    },
  );
});
