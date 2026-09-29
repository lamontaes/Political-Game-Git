import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "./catalog";
import {
  CD_PLACE_RELATION_VINTAGE,
  congressionalLinesSetFor,
  congressionalRelationVintageFor,
  placeDistrictJoin,
  placeDistrictMembershipCatalog,
  placeRelationVintageFor,
  selectDatedSet,
} from "./place-membership";

/*
 * U.S. House lines for the 2026 elections sit in a dated set on top of the
 * Census 119th Congress baseline. The selection rule is tested on a fixture;
 * the compiled set is checked against the baseline and the identity catalog.
 */

const REDRAWN = ["01", "06", "12", "22", "37", "39", "47", "48", "49"];
const HELD_ON_BASELINE = ["29", "13", "21"];

describe("selecting a dated set", () => {
  const early = {
    name: "early",
    effectiveFrom: "2026-01-01",
    stateFips: ["01", "48"],
  };
  const late = {
    name: "late",
    effectiveFrom: "2028-01-01",
    stateFips: ["48"],
  };

  it("uses the baseline when no date is given", () => {
    expect(selectDatedSet([early], "48")).toBeNull();
    expect(selectDatedSet([early], "48", null)).toBeNull();
  });

  it("waits for the set's first day", () => {
    expect(selectDatedSet([early], "48", "2025-12-31")).toBeNull();
    expect(selectDatedSet([early], "48", "2026-01-01")).toBe(early);
  });

  it("leaves a state the set does not cover on the baseline", () => {
    expect(selectDatedSet([early], "29", "2026-06-01")).toBeNull();
  });

  it("takes the latest set that has started, whatever the list order", () => {
    expect(selectDatedSet([late, early], "48", "2027-06-01")).toBe(early);
    expect(selectDatedSet([late, early], "48", "2028-01-01")).toBe(late);
    expect(selectDatedSet([early, late], "01", "2030-01-01")).toBe(early);
  });
});

describe("the compiled 2026 U.S. House lines", () => {
  const membership = placeDistrictMembershipCatalog().congressional;
  const [set] = membership.dated;

  it("covers exactly the states the Census republished, and not Missouri", () => {
    expect(set).toBeDefined();
    expect([...(set?.stateFips ?? [])].sort()).toEqual(REDRAWN);
    expect(set?.effectiveFrom).toBe("2026-01-01");
  });

  it("answers for the same places the baseline answers for, in those states", () => {
    if (!set) throw new Error("no dated set");
    const baseline = new Set(
      [
        ...Object.keys(membership.wholePlace),
        ...Object.keys(membership.splitPlaceCandidates),
      ].filter((geoid) => REDRAWN.includes(geoid.slice(0, 2))),
    );
    const dated = new Set([
      ...Object.keys(set.wholePlace),
      ...Object.keys(set.splitPlaceCandidates),
    ]);
    expect(dated).toEqual(baseline);
    for (const geoid of Object.keys(set.wholePlace))
      expect(set.splitPlaceCandidates[geoid]).toBeUndefined();
  });

  it("names only districts the identity catalog holds, inside the place's state", () => {
    if (!set) throw new Error("no dated set");
    const known = new Set(
      districtIdentityCatalog()
        .filter(
          (identity) =>
            identity.chamber === "congressional" &&
            !identity.isUnassignedResidual,
        )
        .map((identity) => identity.geoid),
    );
    const named = [
      ...Object.entries(set.wholePlace).map(([place, district]) => [
        place,
        [district],
      ]),
      ...Object.entries(set.splitPlaceCandidates),
    ] as [string, string[]][];
    for (const [place, districts] of named) {
      expect(districts.length).toBeGreaterThan(0);
      for (const district of districts) {
        expect(known.has(district)).toBe(true);
        expect(district.slice(0, 2)).toBe(place.slice(0, 2));
      }
    }
  });

  it("does not touch the baseline tables", () => {
    expect(Object.keys(membership.wholePlace)).toHaveLength(
      membership.wholePlaceCount,
    );
    expect(Object.keys(membership.splitPlaceCandidates)).toHaveLength(
      membership.splitPlaceCount,
    );
  });
});

describe("the place join by game date", () => {
  const dated = placeDistrictMembershipCatalog().congressional.dated[0];

  it("changes a redrawn state's answer only once the lines are in force", () => {
    if (!dated) throw new Error("no dated set");
    const moved = Object.keys(dated.wholePlace).find((geoid) => {
      const before = placeDistrictJoin(geoid, "congressional", "2025-06-01");
      return (
        before.kind === "whole-place" &&
        before.districtGeoid !== dated.wholePlace[geoid]
      );
    });
    expect(moved).toBeDefined();
    const geoid = moved as string;
    expect(placeDistrictJoin(geoid, "congressional")).toEqual(
      placeDistrictJoin(geoid, "congressional", "2025-12-31"),
    );
    expect(placeDistrictJoin(geoid, "congressional", "2026-01-01")).toEqual({
      kind: "whole-place",
      districtGeoid: dated.wholePlace[geoid],
    });
    expect(placeRelationVintageFor("congressional", geoid, "2026-06-01")).toBe(
      dated.vintage,
    );
    expect(placeRelationVintageFor("congressional", geoid, "2025-06-01")).toBe(
      CD_PLACE_RELATION_VINTAGE,
    );
    expect(congressionalRelationVintageFor("21", "2026-06-01")).toBe(
      CD_PLACE_RELATION_VINTAGE,
    );
  });

  it("leaves states that did not redraw on the baseline at every date", () => {
    for (const fips of HELD_ON_BASELINE)
      expect(congressionalLinesSetFor(fips, "2026-06-01")).toBeNull();
    const [geoid] = Object.keys(
      placeDistrictMembershipCatalog().congressional.wholePlace,
    ).filter((place) => place.startsWith("21"));
    expect(
      placeDistrictJoin(geoid as string, "congressional", "2026-06-01"),
    ).toEqual(placeDistrictJoin(geoid as string, "congressional"));
  });

  it("does not change the state legislative join", () => {
    const [key] = Object.keys(
      placeDistrictMembershipCatalog().wholePlaceByKey,
    ).filter(
      (entry) => entry.startsWith("48") && entry.endsWith("state-lower"),
    );
    const place = (key as string).split(":")[0] as string;
    expect(placeDistrictJoin(place, "state-lower", "2026-06-01")).toEqual(
      placeDistrictJoin(place, "state-lower"),
    );
  });
});
