import { describe, expect, it } from "vitest";
import { requireLifePlace } from "../simulation/life-places";
import { openingRegionTypesForPlace } from "./opening-region-context";
import { selectOpeningRegionalPlate } from "./opening-regional-plate";
import { makeIsoDate } from "../simulation/dates";
import {
  OPENING_REGION_GEOGRAPHY_AS_OF,
  openingRegionTypesForCountyParts,
} from "./opening-region-profiles";

const ANCHOR_ROWS = [
  ["4845000", "southern-high-plains"],
  ["4007300", "southern-high-plains"],
  ["4802104", "trans-pecos-desert-mountain"],
  ["4850256", "southern-pine-hardwood"],
  ["4819972", "cross-timbers-oak-prairie"],
  ["4071350", "cross-timbers-oak-prairie"],
  ["2719142", "northwoods-lake-forest"],
  ["2738564", "upper-midwest-tallgrass-prairie"],
  ["5070450", "green-mountain-forest"],
  ["5010675", "champlain-lake-lowland"],
] as const;

describe("reviewed illustrative region associations", () => {
  it.each(ANCHOR_ROWS)(
    "selects only the declared regional illustration for %s",
    (key, type) => {
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
        presentationKey: `wave2:${key}`,
      };
      const candidates = [...new Set(ANCHOR_ROWS.map((row) => row[1]))].map(
        (regionType) => ({
          assetId: `fixture-${regionType}`,
          coverage: { regionTypes: [regionType] },
          months: [6],
        }),
      );
      expect(selectOpeningRegionalPlate(context, candidates)?.assetId).toBe(
        `fixture-${type}`,
      );
      expect(
        selectOpeningRegionalPlate(
          JSON.parse(JSON.stringify(context)),
          [...candidates].reverse(),
        )?.assetId,
      ).toBe(`fixture-${type}`);
      expect(
        selectOpeningRegionalPlate(
          { ...context, asOf: makeIsoDate("2026-01-01") },
          candidates,
        ),
      ).toBeNull();
      expect(
        openingRegionTypesForPlace({
          ...place,
          displayName: "Unreviewed place",
        }),
      ).toEqual([]);
      expect(
        openingRegionTypesForPlace({ ...place, stateJurisdictionKey: "US-AK" }),
      ).toEqual([]);
      expect(JSON.stringify(place)).toBe(before);
    },
  );
  it("does not extend the new exact anchors to nearby or same-state places", () => {
    for (const key of [
      "4803000",
      "4879000",
      "4009100",
      "4036300",
      "2724992",
      "2771032",
      "5044275",
      "5048850",
    ]) {
      expect(openingRegionTypesForPlace(requireLifePlace(key))).toEqual([]);
    }
  });
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
  it.each([
    ["0670098", "northern-california-oak-woodland"],
    ["0672646", "northern-california-oak-woodland"],
    ["0622804", "southern-california-inland-bungalow"],
    ["0656000", "southern-california-inland-bungalow"],
    ["2015900", "great-plains-grassland"],
    ["2068650", "great-plains-grassland"],
    ["3109760", "great-plains-grassland"],
    ["3149950", "great-plains-grassland"],
  ])(
    "uses reviewed regional profiles for %s without changing its identity",
    (key, type) => {
      const place = requireLifePlace(key);
      const before = JSON.stringify(place);
      expect(openingRegionTypesForPlace(place)).toEqual([type]);
      expect(JSON.stringify(place)).toBe(before);
      expect(OPENING_REGION_GEOGRAPHY_AS_OF).toBe("2020-04-01");
    },
  );

  it("requires all county parts and keeps unspecified inland, desert and coast places unclassified", () => {
    expect(
      openingRegionTypesForCountyParts("fixture", "US-KS", ["20017", "20015"]),
    ).toEqual([]);
    expect(
      openingRegionTypesForCountyParts("fixture", "US-CA", ["06097", "06041"]),
    ).toEqual([]);
    expect(openingRegionTypesForCountyParts("fixture", "US-NE", [])).toEqual(
      [],
    );
    expect(
      openingRegionTypesForCountyParts("unknown-place", "US-CA", ["06073"]),
    ).toEqual([]);
    expect(
      openingRegionTypesForCountyParts("0622804", "US-CA", ["06073", "06065"]),
    ).toEqual([]);
    for (const key of ["0666000", "0644000", "0655254", "2079000", "3137000"]) {
      expect(openingRegionTypesForPlace(requireLifePlace(key))).toEqual([]);
    }
  });

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
