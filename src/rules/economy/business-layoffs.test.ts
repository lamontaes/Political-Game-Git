import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { townBusinessKindBooks } from "../../simulation/living-world/town-business-books";
import { townBusinessLaysOff } from "../../simulation/living-world/town-business-books";
import type { TownBusinessBooks } from "../../simulation/living-world/town-finance-types";
import { businessLaysOffFromFacts } from "./business-layoffs";

const places = lifePlaceStateIdentities();
const salesCostShare = townBusinessKindBooks("retail").salesCostShare;

describe("business layoff rule", () => {
  it.each(places)(
    "matches legacy layoff decision in $jurisdictionKey",
    (place) => {
      const index = places.indexOf(place);
      const facts = {
        kind: "retail",
        annualRevenue: 55_000 + index * 1_750,
        capacity: 92_000 + index * 1_200,
        annualOtherCosts: 28_000 + index * 450,
        margin: 0.08,
        lastQuarterPay: 5_000 + index * 125,
      } as TownBusinessBooks;
      const selectedFacts = {
        annualRevenue: facts.annualRevenue,
        capacity: facts.capacity,
        annualOtherCosts: facts.annualOtherCosts,
        margin: facts.margin,
        kindCostShare: salesCostShare,
        lastQuarterPay: facts.lastQuarterPay,
      };
      const staff = 2 + (index % 8);
      expect(businessLaysOffFromFacts(selectedFacts, staff)).toBe(
        townBusinessLaysOff(facts, staff),
      );
    },
  );

  it("preserves legacy behavior for absent books, missing pay, and a sole worker", () => {
    expect(businessLaysOffFromFacts(null, 4)).toBe(false);
    expect(
      businessLaysOffFromFacts(
        {
          annualRevenue: 0,
          capacity: 0,
          annualOtherCosts: 0,
          margin: 0,
          kindCostShare: 0,
        },
        4,
      ),
    ).toBe(false);
    expect(
      businessLaysOffFromFacts(
        {
          annualRevenue: 0,
          capacity: 0,
          annualOtherCosts: 0,
          margin: 0,
          kindCostShare: 0,
          lastQuarterPay: 1_000,
        },
        1,
      ),
    ).toBe(false);
  });
});
