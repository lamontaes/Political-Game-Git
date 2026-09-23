import { describe, expect, it } from "vitest";

import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "./life-places";
import { legislatureForState } from "./legislature-game-profile";
import { TERRITORY_PLACE_ROWS } from "./territory-places";

const TERRITORIES = [
  ["GU", "Guam", "Dededo"],
  ["VI", "U.S. Virgin Islands", "Charlotte Amalie"],
  ["AS", "American Samoa", "Pago Pago"],
  ["MP", "Northern Mariana Islands", "Garapan"],
] as const;

describe("a life can start in each of the four other territories", () => {
  it("offers all 56 jurisdictions: 50 states, D.C. and five territories", () => {
    const codes = lifePlaceStateIdentities().map((state) => state.usps);
    expect(codes).toHaveLength(56);
    for (const usps of ["PR", "GU", "VI", "AS", "MP", "DC"]) {
      expect(codes).toContain(usps);
    }
  });

  it.each(TERRITORIES)(
    "%s lists its own towns, under its own name, as placeholders",
    (usps, name, town) => {
      const listed = searchLifePlaces("", 100, {
        stateJurisdictionKey: `US-${usps}`,
        scope: "locality",
      });
      expect(listed.length).toBeGreaterThan(0);
      for (const place of listed) {
        expect(place.stateJurisdictionKey).toBe(`US-${usps}`);
        expect(place.withinName).toBe(name);
        expect(place.displayName.endsWith(`, ${name}`)).toBe(true);
        // A placeholder, never dressed as a Census record, and carrying no
        // local capability of its own.
        expect(place.context.jurisdiction.kind).toBe("territory-place");
        expect(place.context.jurisdiction.provenance.status).toBe(
          "placeholder",
        );
        expect(place.sourceGeoid).toBeUndefined();
        expect(place.capabilities).toEqual({
          legislativeScenarioKey: null,
          candidacyPackId: null,
        });
      }
      const found = searchLifePlaces(town, 5, {
        stateJurisdictionKey: `US-${usps}`,
      });
      expect(found[0]?.displayName).toBe(`${town}, ${name}`);
      // Found again by key and by jurisdiction, as a saved life needs.
      expect(lifePlaceByKey(found[0]!.key)).toEqual(found[0]);
      expect(
        lifePlaceByJurisdictionId(found[0]!.context.jurisdiction.id),
      ).toEqual(found[0]);
    },
  );

  it.each(TERRITORIES)(
    "%s is never handed a legislature drawn from the states",
    (usps) => {
      expect(legislatureForState(`US-${usps}`)).toBeNull();
    },
  );

  it("finds a village by its plain spelling as well as its own", () => {
    expect(searchLifePlaces("Hagatna", 5)[0]?.displayName).toBe(
      "Hagåtña, Guam",
    );
    expect(searchLifePlaces("Hagåtña", 5)[0]?.displayName).toBe(
      "Hagåtña, Guam",
    );
  });

  it("keys every row in its own namespace, uniquely", () => {
    const keys = TERRITORY_PLACE_ROWS.map((row) => row[0]);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys)
      expect(key).toMatch(/^territory:[A-Z]{2}:[a-z0-9-]+$/);
  });
});
