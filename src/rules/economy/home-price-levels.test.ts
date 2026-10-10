import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { homePriceLevels as legacyHomePriceLevels } from "../../simulation/living-world/housing-market";
import type { MacroMonthRecord } from "../../simulation/macro-economy/types";
import { homePriceLevelsFromFacts } from "./home-price-levels";

const places = lifePlaceStateIdentities();

describe("home price level rule", () => {
  it.each(places)(
    "matches legacy levels for $jurisdictionKey",
    (_place, placeIndex) => {
      const months = Array.from({ length: 24 }, (_, index) => ({
        recordedAt: `2025-${String(index + 1).padStart(2, "0")}-01`,
        growthPct: 1.2 + placeIndex * 0.01 + (index % 5) * 0.1,
        inflationPct: 2.1 + (index % 3) * 0.1,
        policyRate: {
          lowerPct: 3 + placeIndex * 0.001 + Math.floor(index / 12) * 0.2,
          upperPct: 3.25 + placeIndex * 0.001 + Math.floor(index / 12) * 0.2,
        },
      }));
      const townEffect = (month: (typeof months)[number]) =>
        month.recordedAt.endsWith("01") ? -0.001 : 0;
      expect(homePriceLevelsFromFacts(months, townEffect)).toEqual(
        legacyHomePriceLevels(
          months as unknown as readonly MacroMonthRecord[],
          townEffect,
        ),
      );
    },
  );

  it("returns no levels for no macro months", () => {
    expect(homePriceLevelsFromFacts([])).toEqual([]);
  });
});
