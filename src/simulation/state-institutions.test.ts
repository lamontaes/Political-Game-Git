import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  compilePublicSchools,
  pointInRings,
  type PublicSchoolInput,
  type SchoolGeocode,
} from "../../scripts/source/local-institutions";
import {
  expandStateSchools,
  SCHOOL_COLUMNS,
  type StateInstitutionsFile,
} from "./local-institutions-data";

const DIR = resolve(process.cwd(), "data/research/places/local-institutions");
const manifest = JSON.parse(
  readFileSync(resolve(DIR, "manifest.json"), "utf8"),
) as {
  statesWithNoSchools: string[];
  priorDirectoryStates: string[];
  report: {
    perState: Record<
      string,
      { source: number; kept: number; dropped: Record<string, number> }
    >;
    dropped: Record<string, number>;
    unplaced: string[];
    matchMethods: Record<string, number>;
  };
  files: Record<string, { bytes: number; sha256: string }>;
};

const ALL_56 = [
  ..."AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR GU VI AS MP".split(
    " ",
  ),
];

const square = (x0: number, y0: number, x1: number, y1: number) =>
  new Float64Array([x0, y0, x1, y0, x1, y1, x0, y1, x0, y0]);

describe("point in a place outline", () => {
  it("is inside a ring, outside it, and not inside a hole", () => {
    const outer = square(0, 0, 10, 10);
    const hole = square(4, 4, 6, 6);
    expect(pointInRings(2, 2, [outer])).toBe(true);
    expect(pointInRings(12, 2, [outer])).toBe(false);
    expect(pointInRings(5, 5, [outer, hole])).toBe(false);
    expect(pointInRings(2, 2, [outer, hole])).toBe(true);
  });
});

describe("matching public schools to places", () => {
  const places = [
    { geoid: "0100100", name: "Springfield", state: "AA" },
    { geoid: "0100200", name: "Springfield", state: "AA" },
    { geoid: "0100300", name: "Rivertown", state: "AA" },
    { geoid: "0200100", name: "Rivertown", state: "BB" },
  ];
  const shapes = [
    { geoid: "0100100", state: "AA", rings: [square(0, 0, 1, 1)] },
    { geoid: "0100200", state: "AA", rings: [square(1, 0, 2, 1)] },
    { geoid: "0100300", state: "AA", rings: [square(3, 0, 4, 1)] },
  ];
  const school = (
    id: string,
    city: string,
    over: Partial<PublicSchoolInput> = {},
  ): PublicSchoolInput => ({
    id,
    name: `School ${id}`,
    status: "Open",
    level: "Elementary",
    lowestGrade: "KG",
    highestGrade: "05",
    city,
    state: "AA",
    zip: "",
    ...over,
  });
  const geocode = (lon: number, lat: number): SchoolGeocode => ({
    lon,
    lat,
    countyGeoid: "01001",
    state: "AA",
  });
  const run = (
    schools: PublicSchoolInput[],
    geocodes: Record<string, SchoolGeocode>,
    membership: Record<string, number> = {},
  ) =>
    compilePublicSchools({
      places,
      shapes,
      schools,
      geocodes: new Map(Object.entries(geocodes)),
      membership: new Map(Object.entries(membership)),
    });

  it("takes a place code first, then a unique city name, then the outline, then the county", () => {
    const result = run(
      [
        school("a", "Rivertown"),
        school("b", "Springfield"),
        school("c", "Nowhere"),
        school("d", "Nowhere"),
        school("e", "Springfield", { placeGeoid: "0100300" }),
      ],
      {
        a: geocode(3.5, 0.5),
        b: geocode(1.5, 0.5),
        c: geocode(0.5, 0.5),
        d: geocode(9, 9),
        e: geocode(0.5, 0.5),
      },
    );
    const byId = (id: string) =>
      [...Object.values(result.places), ...Object.values(result.counties)]
        .flat()
        .find((row) => row.sourceId === id)!;
    expect(byId("a")).toMatchObject({
      geoid: "0100300",
      matchMethod: "city-name",
    });
    // Two Springfields: the outline the school stands in decides.
    expect(byId("b")).toMatchObject({
      geoid: "0100200",
      matchMethod: "point-in-boundary",
    });
    expect(byId("c")).toMatchObject({
      geoid: "0100100",
      matchMethod: "point-in-boundary",
    });
    expect(byId("d")).toMatchObject({
      geoid: "01001",
      geoidKind: "county",
      matchMethod: "county",
    });
    expect(byId("e")).toMatchObject({
      geoid: "0100300",
      matchMethod: "place-code",
    });
  });

  it("drops only schools that are not operating, and says why", () => {
    const result = run(
      [
        school("open", "Rivertown"),
        school("closed", "Rivertown", { status: "Closed" }),
        school("future", "Rivertown", { status: "Future" }),
        school("lost", "Nowhere"),
      ],
      { open: geocode(3.5, 0.5), closed: geocode(3.5, 0.5) },
    );
    expect(result.dropped).toEqual({
      "not operating: Closed": 1,
      "not operating: Future": 1,
      "no place, no county": 1,
    });
    expect(result.unplaced).toEqual(["lost"]);
    expect(result.perState.AA).toMatchObject({ source: 4, kept: 1 });
  });

  it("sets aside a name match when the place lies in another county than the school", () => {
    const result = compilePublicSchools({
      places,
      shapes,
      schools: [school("far", "Rivertown")],
      geocodes: new Map([["far", geocode(9, 9)]]),
      membership: new Map(),
      consistency: {
        countiesOfPlace: (geoid) => (geoid === "0100300" ? ["01099"] : []),
        isKnownCounty: (county) => county === "01001",
      },
    });
    expect(result.countyContradictions).toBe(1);
    expect(result.counties["01001"]![0]).toMatchObject({
      sourceId: "far",
      matchMethod: "county",
    });
  });

  it("keeps a name match when the county is one the place crosswalk does not know", () => {
    const result = compilePublicSchools({
      places,
      shapes,
      schools: [school("old", "Rivertown")],
      geocodes: new Map([["old", geocode(9, 9)]]),
      membership: new Map(),
      consistency: {
        countiesOfPlace: () => ["01099"],
        isKnownCounty: () => false,
      },
    });
    expect(result.countyContradictions).toBe(0);
    expect(result.places["0100300"]![0]).toMatchObject({ sourceId: "old" });
  });

  it("ignores a geocode whose county is in another state", () => {
    const result = run([school("x", "Nowhere")], {
      x: { lon: 0.5, lat: 0.5, countyGeoid: "02001", state: "BB" },
    });
    expect(result.ignoredGeocodes).toBe(1);
    expect(result.unplaced).toEqual(["x"]);
  });

  it("reports enrollment from the membership, else the median of the same state and level", () => {
    const result = run(
      [
        school("p", "Rivertown"),
        school("q", "Rivertown"),
        school("r", "Rivertown"),
        school("s", "Rivertown"),
      ],
      {
        p: geocode(3.5, 0.5),
        q: geocode(3.5, 0.5),
        r: geocode(3.5, 0.5),
        s: geocode(3.5, 0.5),
      },
      { p: 100, q: 300, r: 200 },
    );
    const rows = result.places["0100300"]!;
    expect(
      rows.map((row) => [row.sourceId, row.enrollment, row.enrollmentBasis]),
    ).toEqual([
      ["p", 100, "reported"],
      ["q", 300, "reported"],
      ["r", 200, "reported"],
      ["s", 200, "estimated"],
    ]);
  });
});

describe("the committed state files", () => {
  const files = readdirSync(DIR).filter(
    (name) => name.endsWith(".json") && name !== "manifest.json",
  );
  const load = (usps: string) =>
    JSON.parse(
      readFileSync(resolve(DIR, `${usps}.json`), "utf8"),
    ) as StateInstitutionsFile;

  it("has a file with public schools for every one of the 56 places", () => {
    expect(files.map((name) => name.replace(".json", "")).sort()).toEqual(
      [...ALL_56].sort(),
    );
    expect(manifest.statesWithNoSchools).toEqual([]);
    for (const usps of ALL_56) {
      const rows = expandStateSchools(load(usps));
      expect(rows.length, usps).toBeGreaterThan(0);
    }
  });

  it("matches the manifest per state, and every source school is kept or dropped with a reason", () => {
    for (const usps of ALL_56) {
      const tally = manifest.report.perState[usps]!;
      const dropped = Object.values(tally.dropped).reduce((a, b) => a + b, 0);
      expect(tally.kept + dropped, usps).toBe(tally.source);
      expect(expandStateSchools(load(usps)).length, usps).toBe(tally.kept);
      expect(manifest.files[usps]!.bytes, usps).toBe(
        readFileSync(resolve(DIR, `${usps}.json`)).length,
      );
    }
    const dropReasons = Object.keys(manifest.report.dropped);
    expect(dropReasons.sort()).toEqual([
      "no place, no county",
      "not operating: Closed",
      "not operating: Future",
      "not operating: Inactive",
    ]);
  });

  it("stores each school once, under a place or county of its own state", () => {
    const seen = new Set<string>();
    for (const usps of ALL_56) {
      const file = load(usps);
      expect(file.schools.columns).toEqual(SCHOOL_COLUMNS);
      for (const row of expandStateSchools(file)) {
        expect(seen.has(row.sourceId), row.sourceId).toBe(false);
        seen.add(row.sourceId);
        expect(row.geoid).toMatch(
          row.geoidKind === "place" ? /^(\d{7}|territory:.+)$/ : /^\d{5}$/,
        );
        expect(["Open", "New", "Added", "Reopened"]).toContain(
          row.status === "Changed Boundary/Agency" ? "Open" : row.status,
        );
        expect(Number.isInteger(row.enrollment)).toBe(true);
        expect(row.enrollment).toBeGreaterThanOrEqual(0);
      }
    }
    expect(seen.size).toBe(
      Object.values(manifest.report.perState).reduce((s, t) => s + t.kept, 0),
    );
  });

  it("counts every CCD 2024-25 school per state before matching", () => {
    const zip = resolve(process.cwd(), "data/source/education/raw");
    expect(existsSync(zip)).toBe(true);
    // The Alaska and Rhode Island rows come from the 2023-24 directory; the rest
    // are the preliminary 2024-25 directory's own rows.
    const direct = Object.entries(manifest.report.perState)
      .filter(([usps]) => !manifest.priorDirectoryStates.includes(usps))
      .reduce((s, [, t]) => s + t.source, 0);
    expect(direct).toBe(101_333);
  });
});
