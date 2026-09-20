import { describe, expect, it } from "vitest";
import { requireLifePlace } from "../simulation/life-places";
import { openingRegionTypesForPlace } from "./opening-region-context";
import { selectOpeningRegionalPlate } from "./opening-regional-plate";
import { makeIsoDate } from "../simulation/dates";

describe("reviewed illustrative region associations", () => {
  it.each([
    { places: ["4622260", "4649600"], type: "great-plains-grassland" as const },
    {
      places: ["2160852", "2135362"],
      type: "appalachian-coal-region-town" as const,
    },
  ])(
    "reuses a $type candidate for two independently identified places",
    ({ places, type }) => {
      const candidate = {
        assetId: `illustrative-${type}`,
        coverage: { regionTypes: [type] },
        months: [5, 6, 7, 8, 9],
      };
      for (const key of places) {
        const place = requireLifePlace(key);
        const before = JSON.stringify(place);
        const regionTypes = openingRegionTypesForPlace(place);
        expect(regionTypes).toEqual([type]);
        const context = {
          jurisdictionId: place.context.jurisdiction.id,
          placeKey: place.key,
          sourceGeoid: place.sourceGeoid ?? null,
          stateJurisdictionKey: place.stateJurisdictionKey,
          regionTypes,
          asOf: makeIsoDate("2026-06-01"),
          presentationKey: `fixture:${key}`,
        };
        expect(selectOpeningRegionalPlate(context, [candidate])).toBe(
          candidate,
        );
        expect(
          selectOpeningRegionalPlate(
            { ...context, asOf: makeIsoDate("2026-01-01") },
            [candidate],
          ),
        ).toBeNull();
        expect(JSON.stringify(place)).toBe(before);
      }
    },
  );
  it("does not classify namesakes, neighboring states, missing identities or unreviewed places", () => {
    for (const key of ["3121765", "3751780", "4758120", "2611400", "1150000"]) {
      expect(openingRegionTypesForPlace(requireLifePlace(key))).toEqual([]);
    }
    const pikeville = requireLifePlace("2160852");
    expect(
      openingRegionTypesForPlace({ ...pikeville, scope: "state" }),
    ).toEqual([]);
    expect(
      openingRegionTypesForPlace({ ...pikeville, sourceGeoid: undefined }),
    ).toEqual([]);
    expect(
      openingRegionTypesForPlace({
        ...pikeville,
        stateJurisdictionKey: "US-SD",
      }),
    ).toEqual([]);
  });
});
