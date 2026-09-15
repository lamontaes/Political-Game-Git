import { describe, expect, it } from "vitest";

import {
  PLACE_COUNTY_RELATIONS_META,
  countyGovernmentUnitsForPlace,
} from "./government-units";

describe("county governments for a Census place", () => {
  it("gives a one-county town its county government with the whole land share", () => {
    // Alamo town, Nevada.
    expect(countyGovernmentUnitsForPlace("3200500")).toEqual([
      {
        unit: expect.objectContaining({
          id: "gus2025:108905",
          unitType: "county",
          countyGeoid: "32017",
        }),
        landAreaShare: 1,
      },
    ]);
  });

  it("keeps a four-county city explicit, largest share first, summing to one", () => {
    const okc = countyGovernmentUnitsForPlace("4055000");
    expect(okc.map((share) => share.unit.countyGeoid)).toEqual([
      "40109",
      "40017",
      "40027",
      "40125",
    ]);
    expect(okc.every((share) => share.unit.unitType === "county")).toBe(true);
    expect(
      okc.reduce((sum, share) => sum + share.landAreaShare, 0),
    ).toBeCloseTo(1, 12);
    expect(okc[0]!.landAreaShare).toBeCloseTo(0.58298, 5);
  });

  it("returns nothing where the county area has no county government or the place is unknown", () => {
    // Charlottesville city, Virginia: an independent city is its own county
    // equivalent, with no county government in the 2025 listing.
    expect(countyGovernmentUnitsForPlace("5114968")).toEqual([]);
    expect(countyGovernmentUnitsForPlace("9999999")).toEqual([]);
  });

  it("states its 2020 geography rather than presenting it as current", () => {
    expect(PLACE_COUNTY_RELATIONS_META.geographyAsOf).toBe("2020-04-01");
    expect(PLACE_COUNTY_RELATIONS_META.multiCountyPlaceCount).toBeGreaterThan(
      0,
    );
  });
});
