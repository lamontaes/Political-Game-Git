import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { homePurchasePriceFromFacts } from "./home-purchase";

const places = lifePlaceStateIdentities();

describe("standalone home purchase price rule", () => {
  it.each(places)("matches legacy arithmetic for $jurisdictionKey", (place) => {
    const usps = place.usps;
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
        expectedPriceMinor - Math.round(expectedPriceMinor * downPaymentShare),
    });
  });

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
