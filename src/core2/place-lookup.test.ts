import { describe, expect, it } from "vitest";
import authoredPlaces from "../../data/research/authored-life-places.json" with { type: "json" };
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
  seatOfGovernmentPlace,
} from "../simulation/life-places";
import countyData from "./data/places/place-lookup.json" with { type: "json" };
import localityData from "./data/places/localities.json" with { type: "json" };
import territoryData from "./data/places/territory-places.json" with { type: "json" };
import {
  corePlaceByJurisdictionId,
  corePlaceByKey,
  corePlaceStateIdentities,
  coreSeatOfGovernmentPlace,
} from "./place-lookup";
import { realLocalities } from "./places";

const json = (value: unknown) => JSON.stringify(value);

describe("core place lookup matches the old provider", () => {
  const keys = [
    ...authoredPlaces.map((row) => row.key),
    ...countyData.packs.map((pack) => `state:${pack.jurisdictionKey}`),
    ...localityData.rows.map((row) => row[0]!),
    ...countyData.counties.rows.map((row) => `county:${row[0]}`),
    ...territoryData.rows.map((row) => row[0]!),
    "no-such-place",
    "county:99999",
  ];

  it("returns the same place for every key", () => {
    let compared = 0;
    for (const key of keys) {
      const expected = lifePlaceByKey(key);
      const actual = corePlaceByKey(key);
      if (json(actual) !== json(expected))
        expect(json(actual), key).toBe(json(expected));
      compared += 1;
    }
    expect(compared).toBe(keys.length);
    console.log(`place-lookup parity: ${compared} keys compared, all equal`);
  });

  it("returns the same place for every jurisdiction id", () => {
    let compared = 0;
    for (const key of keys) {
      const place = lifePlaceByKey(key);
      if (!place) continue;
      const id = place.context.jurisdiction.id;
      const expected = lifePlaceByJurisdictionId(id);
      if (json(corePlaceByJurisdictionId(id)) !== json(expected))
        expect(json(corePlaceByJurisdictionId(id)), key).toBe(json(expected));
      compared += 1;
    }
    console.log(`place-lookup parity: ${compared} jurisdiction ids, all equal`);
    expect(compared).toBeGreaterThan(30000);
  });

  it("returns the same state identities and seats of government", () => {
    const identities = lifePlaceStateIdentities();
    expect(json(corePlaceStateIdentities())).toBe(json(identities));
    for (const identity of identities) {
      const expected = seatOfGovernmentPlace(identity.jurisdictionKey);
      expect(json(coreSeatOfGovernmentPlace(identity.jurisdictionKey))).toBe(
        json(expected),
      );
    }
    expect(json(coreSeatOfGovernmentPlace("US-FEDERAL"))).toBe(
      json(seatOfGovernmentPlace("US-FEDERAL")),
    );
    console.log(`place-lookup parity: ${identities.length} states + seats`);
  });

  it("lists every locality in the old search corpus's order", () => {
    const old = corePlaceStateIdentities().flatMap((state) =>
      lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      }),
    );
    expect(JSON.stringify(realLocalities())).toBe(JSON.stringify(old));
  }, 300_000);
});
