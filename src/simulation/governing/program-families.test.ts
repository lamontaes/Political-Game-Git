import { describe, expect, it } from "vitest";
import { programFamilyKeys } from "../legislation-program-families";
import { PROGRAM_FAMILIES, programFamilyTitle } from "./program-families";

/*
 * A governor's agenda and budget season draw from PROGRAM_FAMILIES. It used to
 * hand-pick three of the five drafting banks, so Zara Ward, Governor of
 * Colorado, was offered four program subjects in her first year and none was
 * transit, bridges, broadband or water. The two lists are now one.
 */
describe("the program subjects a governing office can act on", () => {
  it("are every drafting family the legislature has", () => {
    expect(PROGRAM_FAMILIES.map((family) => family.familyKey).sort()).toEqual(
      [...programFamilyKeys()].sort(),
    );
  });

  it("name infrastructure and resilience subjects rather than 'public work'", () => {
    for (const key of [
      "transit-access",
      "bridge-maintenance",
      "broadband-access",
      "water-service-lines",
      "disaster-recovery",
      "utility-resilience",
      "critical-infrastructure",
    ])
      expect(programFamilyTitle(key)).not.toBeNull();
  });
});
