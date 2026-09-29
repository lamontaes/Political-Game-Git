import { describe, expect, it } from "vitest";

import {
  householdMixForJurisdiction,
  HOUSEHOLD_SHAPE_ORDER,
} from "./household-mix";
import { lifePlaceByKey } from "./life-places";

const RENO = "3260600";

describe("what kinds of households a town has", () => {
  it("reads a town's own counts, and they sum to one", () => {
    const reno = lifePlaceByKey(RENO)!;
    const mix = householdMixForJurisdiction(reno.context.jurisdiction.id);
    expect(mix.basis).toBe("place");
    expect(mix.shares.map(([shape]) => shape)).toEqual(HOUSEHOLD_SHAPE_ORDER);
    expect(mix.shares.reduce((sum, [, share]) => sum + share, 0)).toBeCloseTo(
      1,
    );
    // Two towns are not the same town: the mix is not one number for all.
    const houma = lifePlaceByKey("2236255")!;
    expect(
      householdMixForJurisdiction(houma.context.jurisdiction.id).shares,
    ).not.toEqual(mix.shares);
  });

  it("falls back to the nation when there is no place, and says so", () => {
    const mix = householdMixForJurisdiction(null);
    expect(mix.basis).toBe("national");
    const alone = mix.shares.find(([shape]) => shape === "alone")![1];
    // 37,140,836 of 129,227,496 households live alone nationally.
    expect(alone).toBeCloseTo(37_140_836 / 129_227_496, 6);
  });
});
