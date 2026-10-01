import { describe, expect, it } from "vitest";

import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "./life-places";
import { stateKeyForJurisdictionRecord } from "./state-jurisdiction-id";

/**
 * The leaf reads a home state without the place list. Across all 56 places
 * it must agree with the place list's own answer, for the state's record and
 * for a city's.
 */
describe("household-pay: home state without the place list, all 56 places", () => {
  it("names every state's own record and a city's in it as the place list does", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    let cities = 0;
    for (const place of places) {
      const state = stateJurisdictionForKey(place.jurisdictionKey)!;
      expect(stateKeyForJurisdictionRecord(state), place.usps).toBe(
        stateKeyForJurisdiction(state) ?? place.jurisdictionKey,
      );
      // The poverty guideline is keyed by the state's name.
      expect(state.name, place.usps).toBe(place.name);
      const locality = searchLifePlaces("", 1, {
        stateJurisdictionKey: place.jurisdictionKey,
        scope: "locality",
      })[0];
      if (!locality) continue;
      cities += 1;
      const lifePlace = lifePlaceByKey(locality.key)!;
      expect(
        stateKeyForJurisdictionRecord(lifePlace.context.jurisdiction),
        `${place.usps} ${locality.key}`,
      ).toBe(lifePlace.stateJurisdictionKey);
    }
    expect(cities).toBeGreaterThan(40);
  });
});
