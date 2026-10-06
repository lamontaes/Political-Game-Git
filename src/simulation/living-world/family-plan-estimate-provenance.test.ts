import { describe, expect, it } from "vitest";

import { FAMILY_PLAN_ESTIMATE, FAMILY_PLAN_WEIGHTS } from "./town-family-plans";

describe("family-plan weights say where they come from", () => {
  it("is marked estimated from the average, with the birth-interval source", () => {
    expect(FAMILY_PLAN_ESTIMATE.provenance).toBe("estimated-from-average");
    expect(FAMILY_PLAN_ESTIMATE.estimated).toBe(true);
    expect(FAMILY_PLAN_ESTIMATE.estimatedFrom).toMatch(/NCHS/);
    expect(FAMILY_PLAN_WEIGHTS.timingPeakYears).toBe(2.5);
  });
});
