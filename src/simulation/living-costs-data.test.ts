import { describe, expect, it } from "vitest";
import {
  LIVING_COSTS_SOURCE,
  REPRESENTATIVE_LIVING_COSTS,
  representativeMonthlyLivingCostsMinor,
} from "./living-costs-data";

describe("representative national nonhousing category conversion", () => {
  it("converts the selected $32,903 annual basket to $1,523.29 per adult-month", () => {
    expect(representativeMonthlyLivingCostsMinor()).toBe(152_329);
    expect(REPRESENTATIVE_LIVING_COSTS.sourceYear).toBe(2024);
    expect(LIVING_COSTS_SOURCE).toContain("average-2024.xlsx");
  });
  it("keeps miscellaneous distinct from a guessed residual or housing", () => {
    expect(REPRESENTATIVE_LIVING_COSTS.annualUsdPerConsumerUnit).toEqual({
      food: 10_169,
      transportation: 13_318,
      healthCare: 6_197,
      apparelAndServices: 2_001,
      miscellaneous: 1_218,
    });
  });
});
