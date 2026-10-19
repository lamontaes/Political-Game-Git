import { describe, expect, it } from "vitest";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { placeLocalities, placeStateKeys } from "./places";

describe("core2 place listing", () => {
  it("lists the 56 jurisdictions, the same as the state identities", () => {
    const keys = placeStateKeys();
    expect(keys).toHaveLength(56);
    expect([...keys]).toEqual(
      corePlaceStateIdentities()
        .map((identity) => identity.jurisdictionKey)
        .sort((a, b) => a.localeCompare(b)),
    );
  });

  it("matches the place search for all 56 places", () => {
    const total = Number.MAX_SAFE_INTEGER;
    for (const stateKey of placeStateKeys()) {
      const old = searchCorePlaces("", total, {
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
