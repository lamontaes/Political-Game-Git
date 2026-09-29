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

/** The dated sets merged into one, for checks that ignore start dates. */
function mergedDatedSet() {
  const sets = placeDistrictMembershipCatalog().congressional.dated;
  return {
    stateFips: sets.flatMap((entry) => [...entry.stateFips]),
    wholePlace: Object.assign(
      {},
      ...sets.map((entry) => entry.wholePlace),
    ) as Record<string, string>,
    splitPlaceCandidates: Object.assign(
      {},
      ...sets.map((entry) => entry.splitPlaceCandidates),
    ) as Record<string, readonly string[]>,
  };
}

describe("the compiled 2026 U.S. House lines", () => {
  const membership = placeDistrictMembershipCatalog().congressional;
  const set = mergedDatedSet();

  it("covers exactly the states the Census republished, and not Missouri", () => {
    expect([...set.stateFips].sort()).toEqual(REDRAWN);
  });

  it("starts each state on the day its own plan took effect", () => {
    const start = Object.fromEntries(
      membership.dated.flatMap((entry) =>
        entry.stateFips.map((fips) => [fips, entry.effectiveFrom]),
      ),
    );
    expect(start).toEqual({
      "48": "2025-08-29",
      "37": "2025-10-22",
      "39": "2025-10-31",
      "06": "2025-11-04",
      "49": "2025-11-10",
      "12": "2026-05-04",
      "47": "2026-05-07",
      "22": "2026-05-29",
      "01": "2026-06-02",
    });
  });

  it("answers for the same places the baseline answers for, in those states", () => {
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
  const sets = placeDistrictMembershipCatalog().congressional.dated;
  const setFor = (fips: string) => {
    const found = sets.find((entry) => entry.stateFips.includes(fips));
    if (!found) throw new Error(`no dated set for ${fips}`);
    return found;
  };
  const dayBefore = (day: string) => {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  };
  /** A whole place in the state whose district differs between the two lines. */
  const movedPlace = (fips: string) => {
    const dated = setFor(fips);
    const geoid = Object.keys(dated.wholePlace).find((place) => {
      const before = placeDistrictJoin(
        place,
        "congressional",
        dayBefore(dated.effectiveFrom),
      );
      return (
        before.kind === "whole-place" &&
        before.districtGeoid !== dated.wholePlace[place]
      );
    });
    if (!geoid) throw new Error(`no moved place in ${fips}`);
    return { geoid, dated };
  };

  it("changes each redrawn state's answer on the day its lines take effect", () => {
    for (const fips of REDRAWN) {
      const { geoid, dated } = movedPlace(fips);
      expect(placeDistrictJoin(geoid, "congressional")).toEqual(
        placeDistrictJoin(
          geoid,
          "congressional",
          dayBefore(dated.effectiveFrom),
        ),
      );
      expect(
        placeDistrictJoin(geoid, "congressional", dated.effectiveFrom),
      ).toEqual({
        kind: "whole-place",
        districtGeoid: dated.wholePlace[geoid],
      });
      expect(
        placeRelationVintageFor("congressional", geoid, dated.effectiveFrom),
      ).toBe(dated.vintage);
      expect(
        placeRelationVintageFor(
          "congressional",
          geoid,
          dayBefore(dated.effectiveFrom),
        ),
      ).toBe(CD_PLACE_RELATION_VINTAGE);
    }
    expect(congressionalRelationVintageFor("21", "2026-06-01")).toBe(
      CD_PLACE_RELATION_VINTAGE,
    );
  });

  it("keeps Florida, Tennessee, Louisiana and Alabama on the old lines through the spring of 2026", () => {
    const spring = "2026-04-30";
    for (const fips of ["12", "47", "22", "01"])
      expect(congressionalLinesSetFor(fips, spring)).toBeNull();
    for (const fips of ["48", "37", "39", "06", "49"])
      expect(congressionalLinesSetFor(fips, spring)).not.toBeNull();
    // Alabama is the last to start, on June 2, 2026.
    expect(congressionalLinesSetFor("01", "2026-06-01")).toBeNull();
    expect(congressionalLinesSetFor("01", "2026-06-02")).not.toBeNull();
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
