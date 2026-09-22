import { describe, expect, it } from "vitest";

import {
  PEOPLE_TRAIT_SETTLING_PROFILE_A,
  peopleTraitPack,
} from "./people-trait-pack";

describe("how long a changed trait takes to settle", () => {
  it("runs ChatGPT's trial profile B, with profile A kept for the comparison", () => {
    const settling = Object.fromEntries(
      peopleTraitPack().traits.map((trait) => [
        trait.key,
        trait.movability.settlesOver,
      ]),
    );
    expect(settling).toEqual({
      sociability: 3,
      deliberation: 5,
      reliability: 2,
      conflict: 3,
      risk: 3,
    });
    // Only the settling period moves; the order between the five holds, and
    // every trait still settles faster than it did under A.
    for (const [key, years] of Object.entries(settling))
      expect(years).toBeLessThan(PEOPLE_TRAIT_SETTLING_PROFILE_A[key]!);
    expect(settling.reliability).toBeLessThan(settling.deliberation!);
  });
});
