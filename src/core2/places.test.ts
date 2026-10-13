import { describe, expect, it } from "vitest";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { placeLocalities, placeStateKeys } from "./places";

describe("core2 place listing", () => {
  it("lists the 56 jurisdictions, same as the old listing", () => {
    const keys = placeStateKeys();
    expect(keys).toHaveLength(56);
    expect([...keys]).toEqual(
      lifePlaceStateIdentities()
        .map((identity) => identity.jurisdictionKey)
        .sort((a, b) => a.localeCompare(b)),
    );
  });

  it("matches the old locality list for all 56 places", () => {
    const total = lifePlaceCoverage().placeCount;
    for (const stateKey of placeStateKeys()) {
      const old = lifePlaceSearch("", total, {
        stateJurisdictionKey: stateKey,
        scope: "locality",
      })
        .map((place) => ({
          key: place.key,
          displayName: place.displayName,
          formalName: place.formalName,
          stateJurisdictionKey: place.stateJurisdictionKey,
        }))
        .sort((a, b) => a.key.localeCompare(b.key));
      const now = placeLocalities(stateKey);
      expect(now.length, stateKey).toBeGreaterThan(0);
      expect([...now], stateKey).toEqual(old);
    }
  });
});
