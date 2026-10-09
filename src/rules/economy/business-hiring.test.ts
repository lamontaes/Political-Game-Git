import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { townBusinessHasRoomToHire } from "../../simulation/living-world/town-business-books";
import { townBusinessKindBooks } from "../../simulation/living-world/town-business-books";
import type { TownBusinessBooks } from "../../simulation/living-world/town-finance-types";
import { businessHasRoomToHireFromFacts } from "./business-hiring";

const places = lifePlaceStateIdentities();
const salesCostShare = townBusinessKindBooks("retail").salesCostShare;

describe("business hire affordability rule", () => {
  it.each(places)(
    "matches legacy hire decision in $jurisdictionKey",
    (_place, index) => {
      const lastQuarterPay = 4_000 + index * 50;
      const facts = {
        kind: "retail",
        annualRevenue: 100_000 + index * 2_000,
        capacity: 120_000 + index * 1_000,
        annualOtherCosts: 35_000 + index * 500,
        margin: 0.08,
        lastQuarterPay,
      } as TownBusinessBooks;
      const selectedFacts = {
        annualRevenue: facts.annualRevenue,
        capacity: facts.capacity,
        annualOtherCosts: facts.annualOtherCosts,
        margin: facts.margin,
        kindCostShare: salesCostShare,
        lastQuarterPay: facts.lastQuarterPay,
      };
      const staff = 5 + (index % 8);
      const townAveragePay = 38_000 + index * 100;
      expect(
        businessHasRoomToHireFromFacts(selectedFacts, staff, townAveragePay),
      ).toBe(townBusinessHasRoomToHire(facts, staff, townAveragePay));
    },
  );

  it("preserves legacy behavior for absent books, missing pay, and no staff", () => {
    expect(businessHasRoomToHireFromFacts(null, 4)).toBe(true);
    expect(
      businessHasRoomToHireFromFacts(
        {
          annualRevenue: 0,
          capacity: 0,
          annualOtherCosts: 0,
          margin: 0,
          kindCostShare: 0,
        },
        4,
      ),
    ).toBe(true);
    expect(
      businessHasRoomToHireFromFacts(
        {
          annualRevenue: 0,
          capacity: 0,
          annualOtherCosts: 0,
          margin: 0,
          kindCostShare: 0,
          lastQuarterPay: 1_000,
        },
        0,
      ),
    ).toBe(true);
  });
});
