import { describe, expect, it } from "vitest";
import {
  cannabisRetailRevenue,
  type CannabisRetailMechanismInputs,
} from "./cannabis-retail-mechanism";

/** Authored arithmetic fixtures only; none are real-state empirical values. */
const fixture: CannabisRetailMechanismInputs = {
  adultResidents: 1000,
  buyerShare: 0.2,
  annualPretaxSpendingPerBuyer: 1000,
  legalMarketShare: 0.5,
  exciseRate: 0.1,
  stateSalesTaxRate: 0.05,
  salesTaxIncludesExcise: true,
  sources: {
    lawTerms: "AUTHORED arithmetic fixture, not law research",
    adultBuyerBase: "AUTHORED arithmetic fixture, not population research",
    spending: "AUTHORED arithmetic fixture, not spending research",
    legalMarketShare: "AUTHORED arithmetic fixture, not actual buyer records",
  },
};
describe("cannabis tax accounting (arithmetic, not state proof)", () => {
  it("uses the base and tax terms, including excise in the sales-tax base only where the law says", () => {
    const reading = cannabisRetailRevenue(fixture);
    expect(reading.annualPotentialPretaxSpending).toBe(200000);
    expect(reading.annualLegalPretaxSales).toBe(100000);
    expect(reading.annualStateExciseRevenue).toBe(10000);
    expect(reading.annualStateSalesTaxRevenue).toBe(5500);
    expect(reading.annualStateRevenue).toBe(15500);
    const withoutExcise = cannabisRetailRevenue({
      ...fixture,
      salesTaxIncludesExcise: false,
    });
    expect(withoutExcise.annualStateSalesTaxRevenue).toBe(5000);
    expect(
      cannabisRetailRevenue({ ...fixture, adultResidents: 2000 })
        .annualStateRevenue,
    ).toBe(reading.annualStateRevenue * 2);
  });
  it("uses the supplied recorded legal share without generating a curve or draw", () => {
    const reading = cannabisRetailRevenue(fixture);
    expect(
      cannabisRetailRevenue({ ...fixture, legalMarketShare: 0.25 })
        .annualStateRevenue,
    ).toBe(reading.annualStateRevenue / 2);
    expect(cannabisRetailRevenue(JSON.parse(JSON.stringify(fixture)))).toEqual(
      reading,
    );
  });
  it("does not clamp revenue to the old per-resident calibration range", () => {
    const high = cannabisRetailRevenue({
      ...fixture,
      annualPretaxSpendingPerBuyer: 10000,
    });
    expect(high.annualStateRevenue / fixture.adultResidents).toBeGreaterThan(
      62,
    );
    const low = cannabisRetailRevenue({ ...fixture, buyerShare: 0.001 });
    expect(low.annualStateRevenue / fixture.adultResidents).toBeLessThan(26.7);
  });
  it("does not invent a missing source or silently turn an unknown buyer share into zero", () => {
    expect(() =>
      cannabisRetailRevenue({
        ...fixture,
        sources: { ...fixture.sources, spending: "" },
      }),
    ).toThrow("Missing cannabis source: spending");
    expect(() =>
      cannabisRetailRevenue({ ...fixture, buyerShare: NaN }),
    ).toThrow("Invalid cannabis input: buyerShare");
  });
});
