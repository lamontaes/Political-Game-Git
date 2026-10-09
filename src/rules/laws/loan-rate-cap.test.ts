import { describe, expect, it } from "vitest";
import { cappedAnnualRateBasisPoints as legacyRateCap } from "../../simulation/public-benefit-formulas";
import { STATES } from "../../simulation/state-reference";
import { loanRateFromCapFacts } from "./loan-rate-cap";

describe("standalone consumer-loan rate cap", () => {
  it.each(Object.keys(STATES))(
    "matches the legacy cap rule for US-%s",
    (usps) => {
      const marketRate = 600 + usps.charCodeAt(0) * 10;
      const cap = 1200 + usps.charCodeAt(1) * 5;
      expect(
        loanRateFromCapFacts({
          marketRateBasisPoints: marketRate,
          capBasisPoints: cap,
        }),
      ).toBe(legacyRateCap(marketRate, cap));
      expect(
        loanRateFromCapFacts({
          marketRateBasisPoints: marketRate,
          capBasisPoints: null,
        }),
      ).toBe(legacyRateCap(marketRate, null));
    },
  );
});
