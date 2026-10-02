import { readFileSync } from "node:fs";
import type {
  PlaceRelationRecord,
  PlaceDistrictPopulationRecord,
} from "../source/domains/place-county-relations/types";
import {
  prepareDistrictPopulationForState,
  districtPopulationPreparationStatus,
} from "./district-population-loader";
import { DISTRICT_POPULATION_LOADERS } from "./district-population-loaders.generated";
import { drawRandomPlace } from "../../tests/support/random-place";
import { districtIdentityCatalog } from "./catalog";
import { placeRelationVintageFor } from "./place-membership";
import { districtPopulationShares, districtsCrossingPlace } from "./query";
import { describe, expect, it, vi } from "vitest";
import * as districtQueries from "./query";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  assignSplitHomeDistricts,
  districtResidenceIntervals,
  recordedDistrictResidenceSince,
} from "../simulation/district-residence";
import { homeJurisdictionResidenceSince } from "../simulation/nationwide-world/residence-duration";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
const seed = "overflow8-a144-population-parts";
const catalog = districtIdentityCatalog();
const chamber = "state-lower" as const;
const acquiredParts = (
  JSON.parse(
    readFileSync(
      new URL(
        "../../data/source/place-county-relations/corpus.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PlaceRelationRecord[]
)
  .filter(
    (record): record is PlaceDistrictPopulationRecord =>
      "relationKind" in record,
  )
  .map((record) => ({
    placeGeoid: record.placeGeoid,
    chamber: record.chamber,
    boundaryVintage: record.boundaryVintage,
    districtGeoid: record.districtGeoid,
    partPopulationCount: record.partPopulationCount,
    placePopulationCount: record.placePopulationCount,
  }));
const acquiredByPlace = new Map<string, typeof acquiredParts>();
for (const part of acquiredParts) {
  const rows = acquiredByPlace.get(part.placeGeoid) ?? [];
  rows.push(part);
  acquiredByPlace.set(part.placeGeoid, rows);
}
const acquiredRows = acquiredParts.map(
  (row) =>
    [
      row.placeGeoid,
      row.chamber,
      row.boundaryVintage,
      row.districtGeoid,
      row.partPopulationCount,
      row.placePopulationCount,
    ] as const,
);
const unfilteredPlace = drawRandomPlace(seed);
const place = drawRandomPlace(
  seed,
  (candidate) =>
    candidate.sourceGeoid !== undefined &&
    districtsCrossingPlace(catalog, candidate.sourceGeoid, chamber).length >
      1 &&
    districtPopulationShares({
      catalog,
      placeGeoid: candidate.sourceGeoid!,
      chamber,
      asOf: "2026-01-05",
      parts: acquiredByPlace.get(candidate.sourceGeoid!) ?? [],
    }).some((row) => row.populationCount > 0),
);
await prepareDistrictPopulationForState(place.stateJurisdictionKey);
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
  it(`prepares only the requested state drawn from all 56: ${unfilteredPlace.displayName}, seed ${seed}`, async () => {
    const pending = prepareDistrictPopulationForState(
      unfilteredPlace.stateJurisdictionKey,
    );
    const stateFips = catalog.find(
      (identity) =>
        `US-${identity.stateUsps}` === unfilteredPlace.stateJurisdictionKey,
    )?.stateFips;
    const supported =
      stateFips !== undefined &&
      DISTRICT_POPULATION_LOADERS[stateFips] !== undefined;
    if (supported)
      expect(
        prepareDistrictPopulationForState(unfilteredPlace.stateJurisdictionKey),
      ).toBe(pending);
    expect(await pending).toBe(supported);
    if (unfilteredPlace.sourceGeoid)
      expect(
        districtPopulationPreparationStatus(unfilteredPlace.sourceGeoid),
      ).toBe(supported ? "loaded" : "unsupported");
    const other = acquiredParts.find(
      (row) =>
        row.placeGeoid.slice(0, 2) !== stateFips &&
        row.placeGeoid.slice(0, 2) !== placeGeoid.slice(0, 2),
    );
    expect(other).toBeDefined();
    expect(districtPopulationPreparationStatus(other!.placeGeoid)).toBe(
      "not-loaded",
    );
  });

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
    const subset = parts.slice(1);
    const subtotal = subset.reduce(
      (sum, row) => sum + row.partPopulationCount,
      0,
    );
    expect(
      read(subset.map((row) => ({ ...row, placePopulationCount: subtotal }))),
    ).toEqual([]);
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
  it("writes the acquired Census population home estimate through the existing writer and preserves it after reopening", () => {
    const { world, personId } = smallWorld({
      place: place.key,
      seed,
      household: true,
    });
    const before = serializeWorld(world);
    const next = assignSplitHomeDistricts(world, personId);
    const interval = districtResidenceIntervals(next).find(
      (row) => row.personId === personId && row.binding.chamber === chamber,
    );
    expect(interval).toBeDefined();
    expect(interval!.startedOn).toBe(world.currentDate);
    expect(
      recordedDistrictResidenceSince(
        next,
        personId,
        chamber,
        world.currentDate,
      ),
    ).toBe(
      homeJurisdictionResidenceSince(
        world,
        personId,
        world.people[personId]!.homeJurisdictionId,
        world.currentDate,
      ),
    );
    const acquired = districtPopulationShares({
      catalog,
      placeGeoid,
      chamber,
      asOf: world.currentDate,
    });
    expect(acquired.length).toBeGreaterThan(1);
    expect(acquired[0]!.populationCount).toBeGreaterThan(0);
    expect(interval!.binding.geoid).toBe(acquired[0]!.identity.geoid);
    expect(interval!.provenance.note).toContain(
      String(acquired[0]!.populationCount),
    );
    expect(interval!.provenance.note).toContain(
      "ESTIMATED FROM CENSUS POPULATION",
    );
    expect(interval!.provenance.sourceEventId).not.toBeNull();
    expect(serializeWorld(world)).toBe(before);
    const saved = serializeWorld(next);
    const reopened = deserializeWorld(saved);
    expect(serializeWorld(reopened)).toBe(saved);
    expect(assignSplitHomeDistricts(reopened, personId)).toBe(reopened);
  });
  it("does not choose a residence by identity when the largest parts tie", () => {
    const { world, personId } = smallWorld({
      place: place.key,
      seed,
      household: true,
    });
    const original = districtQueries.districtPopulationShares;
    const tied = read(
      parts.map((row) => ({
        ...row,
        partPopulationCount: 10,
        placePopulationCount: parts.length * 10,
      })),
    );
    expect(tied.length).toBeGreaterThan(1);
    const reader = vi
      .spyOn(districtQueries, "districtPopulationShares")
      .mockImplementation((input) =>
        input.chamber === chamber && input.placeGeoid === placeGeoid
          ? tied
          : original(input),
      );
    try {
      const next = assignSplitHomeDistricts(world, personId);
      expect(
        districtResidenceIntervals(next).filter(
          (interval) =>
            interval.personId === personId &&
            interval.binding.chamber === chamber,
        ),
      ).toEqual([]);
    } finally {
      reader.mockRestore();
    }
  });

  it("retains acquired zero-count parts with zero shares", () => {
    const rows = acquiredRows;
    const zeroParts = rows.filter((row) => row[4] === 0);
    expect(zeroParts.length).toBeGreaterThan(0);
    const zero = zeroParts.flatMap(([placeGeoid, chamber, , geoid]) =>
      districtPopulationShares({
        catalog,
        placeGeoid,
        chamber,
        asOf: "2026-01-05",
        parts: acquiredByPlace.get(placeGeoid) ?? [],
      }).filter(
        (row) => row.identity.geoid === geoid && row.populationCount === 0,
      ),
    );
    expect(zero.length).toBeGreaterThan(0);
    expect(zero.every((row) => row.populationShare === 0)).toBe(true);
  });

  it("refuses acquired older congressional rows where the current catalog uses newer lines", () => {
    const rows = acquiredRows;
    const older = rows.find(
      ([placeGeoid, chamber, vintage]) =>
        chamber === "congressional" &&
        placeRelationVintageFor(chamber, placeGeoid, "2026-11-03") !== vintage,
    );
    expect(older).toBeDefined();
    const [placeGeoid, chamber, boundaryVintage] = older!;
    const parts = rows
      .filter(
        (row) =>
          row[0] === placeGeoid &&
          row[1] === chamber &&
          row[2] === boundaryVintage,
      )
      .map(
        ([
          placeGeoid,
          chamber,
          boundaryVintage,
          districtGeoid,
          partPopulationCount,
          placePopulationCount,
        ]) => ({
          placeGeoid,
          chamber,
          boundaryVintage,
          districtGeoid,
          partPopulationCount,
          placePopulationCount,
        }),
      );
    expect(
      districtPopulationShares({
        catalog,
        placeGeoid,
        chamber,
        asOf: "2026-11-03",
        parts,
      }),
    ).toEqual([]);
  });
});
