import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { homePurchasePriceFromFacts } from "./home-purchase";

describe("standalone home purchase price rule", () => {
  it.each(Object.keys(STATES))(
    "matches legacy arithmetic for US-%s",
    (usps) => {
      const openingPriceDollars = 185_000 + usps.charCodeAt(0) * 100;
      const housingFactor = 0.7 + (usps.charCodeAt(1) % 10) / 10;
      const downPaymentShare = 0.1;
      const expectedPriceMinor = Math.max(
        100_000,
        Math.round((openingPriceDollars * 100 * housingFactor) / 100_000) *
          100_000,
      );
      const terms = homePurchasePriceFromFacts({
        openingPriceDollars,
        housingFactor,
        downPaymentShare,
      });
      expect(terms).toEqual({
        priceMinor: expectedPriceMinor,
        downPaymentMinor: Math.round(expectedPriceMinor * downPaymentShare),
        mortgagePrincipalMinor:
          expectedPriceMinor -
          Math.round(expectedPriceMinor * downPaymentShare),
      });
    },
  );

  it("rejects invalid selected facts", () => {
    expect(
      homePurchasePriceFromFacts({
        openingPriceDollars: 100_000,
        housingFactor: 1,
        downPaymentShare: 1.1,
      }),
    ).toBeNull();
  });
});
