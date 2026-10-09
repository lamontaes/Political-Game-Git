import { describe, expect, it } from "vitest";
import {
  amortizedMonthlyPaymentMinor as legacyAmortizedPayment,
  povertyLineMinor as legacyPovertyLine,
} from "../../simulation/public-benefit-formulas";
import { STATES } from "../../simulation/state-reference";
import {
  amortizedMonthlyPaymentMinor,
  povertyLineMinor,
} from "./public-benefits";

describe("standalone public benefit threshold rules", () => {
  it.each(Object.keys(STATES))(
    "matches legacy thresholds for US-%s",
    (usps) => {
      const size = 1 + (usps.charCodeAt(0) % 8);
      const firstPersonMinor = 1_500_000 + usps.charCodeAt(1) * 10_000;
      const addedPersonMinor = Math.floor(firstPersonMinor * 0.35);
      const annualLine = povertyLineMinor(
        size,
        firstPersonMinor,
        addedPersonMinor,
      );
      const legacyLine = legacyPovertyLine(
        size,
        firstPersonMinor,
        addedPersonMinor,
      );
      expect(annualLine).toBe(legacyLine);
      const principalMinor = 15_000_000 + usps.charCodeAt(1) * 1_000;
      const annualRateBasisPoints = 0 + usps.charCodeAt(0) * 10;
      const termMonths = 120 + (usps.charCodeAt(1) % 240);
      expect(
        amortizedMonthlyPaymentMinor(
          principalMinor,
          annualRateBasisPoints,
          termMonths,
        ),
      ).toBe(
        legacyAmortizedPayment(
          principalMinor,
          annualRateBasisPoints,
          termMonths,
        ),
      );
    },
  );
});
