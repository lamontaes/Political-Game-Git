import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { districtIdentityCatalog } from "./catalog";
import { placeRelationVintageFor } from "./place-membership";
import { districtPopulationShares, districtsCrossingPlace } from "./query";

const seed = "overflow8-a144-population-parts";
const catalog = districtIdentityCatalog();
const chamber = "state-lower" as const;
const place = drawRandomPlace(
  seed,
  (candidate) =>
    districtsCrossingPlace(catalog, candidate.sourceGeoid, chamber).length > 1,
);
const placeGeoid = place.sourceGeoid!;
const crossing = districtsCrossingPlace(catalog, placeGeoid, chamber);
const boundaryVintage = placeRelationVintageFor(chamber, placeGeoid);
// Controlled counts on real district identities exercise the reader contract;
// these are not represented as measured Census populations.
const parts = crossing.map((identity, index) => ({
  placeGeoid,
  chamber,
  districtGeoid: identity.geoid,
  boundaryVintage,
  partPopulationCount: index === 0 ? 90 : index === 1 ? 10 : 0,
  placePopulationCount: 100,
}));
const read = (rows: Parameters<typeof districtPopulationShares>[0]["parts"]) =>
  districtPopulationShares({
    catalog,
    parts: rows,
    placeGeoid,
    chamber,
  });

describe(`district population parts in ${place.displayName}, seed ${seed}`, () => {
  it("uses population totals and retains zero-count district parts", () => {
    const result = read(parts);
    expect(result).toHaveLength(crossing.length);
    expect(result.map((row) => row.populationCount)).toEqual(
      parts.map((row) => row.partPopulationCount),
    );
    expect(result[0]!.populationShare).toBe(0.9);
    expect(result[1]!.populationShare).toBe(0.1);
    const withZeroPart = read(
      parts.map((row, index) => ({
        ...row,
        partPopulationCount: index === 0 ? 100 : 0,
      })),
    );
    expect(withZeroPart[1]!.populationShare).toBe(0);
    expect(withZeroPart).toHaveLength(crossing.length);
    expect(result.slice(2).every((row) => row.populationShare === 0)).toBe(
      true,
    );
    expect(result.reduce((sum, row) => sum + row.populationShare, 0)).toBe(1);
    expect(JSON.stringify(parts)).toBe(
      JSON.stringify(
        crossing.map((identity, index) => ({
          placeGeoid,
          chamber,
          districtGeoid: identity.geoid,
          boundaryVintage,
          partPopulationCount: index === 0 ? 90 : index === 1 ? 10 : 0,
          placePopulationCount: 100,
        })),
      ),
    );
  });

  it("orders equal population parts by district identity regardless of row order", () => {
    const equal = parts.map((row) => ({
      ...row,
      partPopulationCount: 10,
      placePopulationCount: parts.length * 10,
    }));
    expect(read([...equal].reverse()).map((row) => row.identity.geoid)).toEqual(
      crossing.map((row) => row.geoid).sort(),
    );
  });

  it("keeps every share zero when the place has no residents", () => {
    const result = read(
      parts.map((row) => ({
        ...row,
        partPopulationCount: 0,
        placePopulationCount: 0,
      })),
    );
    expect(result).toHaveLength(crossing.length);
    expect(result.every((row) => row.populationShare === 0)).toBe(true);
  });

  it("refuses mismatched totals, duplicates, invalid counts and missing identities", () => {
    expect(read(parts.slice(1))).toEqual([]);
    expect(read([...parts, parts[0]!])).toEqual([]);
    expect(
      read(
        parts.map((row, index) =>
          index === 0 ? { ...row, partPopulationCount: -1 } : row,
        ),
      ),
    ).toEqual([]);
    expect(
      read(
        parts.map((row, index) =>
          index === 0 ? { ...row, districtGeoid: "missing-identity" } : row,
        ),
      ),
    ).toEqual([]);
  });

  it("does not borrow rows from another place, chamber or boundary vintage", () => {
    expect(
      read(parts.map((row) => ({ ...row, placeGeoid: "missing-place" }))),
    ).toEqual([]);
    expect(
      read(parts.map((row) => ({ ...row, chamber: "state-upper" as const }))),
    ).toEqual([]);
    expect(
      read(
        parts.map((row) => ({ ...row, boundaryVintage: "obsolete-boundary" })),
      ),
    ).toEqual([]);
    expect(read([])).toEqual([]);
  });
});
