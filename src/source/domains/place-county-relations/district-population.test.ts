import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  corpusCanonicalDigest,
  isClean,
  type ArtifactLock,
} from "../../core/index";
import { sourceDomain, type PlaceRelationRecord } from "./index";
import { drawRandomPlace } from "../../../../tests/support/random-place";
import {
  normalizeDistrictPopulationParts,
  type DistrictPopulationBlock,
} from "./normalize";

// Authored source fixtures: the seeded place supplies a key, not a claim
// about its real blocks, residents, or legislative boundaries.
const place = drawRandomPlace(
  "district-population-source-fixture",
  (candidate) => /^\d{7}$/.test(candidate.key),
);
const placeGeoid = place.key;
const stateFips = placeGeoid.slice(0, 2);
const artifactId = "authored-district-population-fixture";
type Row = DistrictPopulationBlock;

function part(index: number, overrides: Partial<Row> = {}): Row {
  return {
    blockGeoid: `${stateFips}${String(index).padStart(13, "0")}`,
    placeGeoid,
    districtGeoid: `${stateFips}01`,
    chamber: "congressional",
    boundaryVintage: "2024",
    population: 10,
    ...overrides,
  };
}

describe("normalizeDistrictPopulationParts authored source fixtures", () => {
  it("replays the acquired source tables and preserves county and district population totals", () => {
    const readSourceJson = (name: string): unknown =>
      JSON.parse(
        readFileSync(
          new URL(
            `../../../../data/source/place-county-relations/${name}`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
    const lock = readSourceJson("artifact-lock.json") as ArtifactLock;
    const manifest = readSourceJson("corpus-manifest.json") as {
      canonicalSha256: string;
      recordCount: number;
    };
    const stored = readSourceJson("corpus.json") as PlaceRelationRecord[];
    const compiled = sourceDomain.compileProduction(lock);
    expect(isClean(sourceDomain.validateCorpus(compiled))).toBe(true);
    expect(stored.length).toBeGreaterThan(0);
    expect(compiled.records.length).toBe(manifest.recordCount);
    expect(corpusCanonicalDigest(compiled.records)).toBe(
      manifest.canonicalSha256,
    );
    expect(corpusCanonicalDigest(stored)).toBe(manifest.canonicalSha256);

    const countyTotals = new Map<string, number>();
    const districtTotals = new Map<
      string,
      { place: string; total: number; denominator: number }
    >();
    for (const record of compiled.records) {
      if ("countyGeoid" in record) {
        countyTotals.set(
          record.placeGeoid,
          (countyTotals.get(record.placeGeoid) ?? 0) +
            record.partPopulationCount,
        );
      } else {
        const key = `${record.placeGeoid}:${record.chamber}:${record.boundaryVintage}`;
        const previous = districtTotals.get(key);
        if (previous)
          expect(record.placePopulationCount).toBe(previous.denominator);
        districtTotals.set(key, {
          place: record.placeGeoid,
          total: (previous?.total ?? 0) + record.partPopulationCount,
          denominator: record.placePopulationCount,
        });
      }
    }
    expect(countyTotals.size).toBeGreaterThan(0);
    expect(districtTotals.size).toBeGreaterThan(0);
    for (const group of districtTotals.values()) {
      expect(group.total).toBe(group.denominator);
      expect(group.total).toBe(countyTotals.get(group.place));
    }
  }, 60_000);

  it("aggregates blocks and uses every district part in the place denominator", () => {
    const records = normalizeDistrictPopulationParts(
      [
        part(1, { population: 12 }),
        part(2, { population: 8 }),
        part(3, { districtGeoid: `${stateFips}02`, population: 30 }),
      ],
      artifactId,
    );
    expect(records).toHaveLength(2);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relationKind: "legislative-district",
          recordId: `district:2024:${placeGeoid}:congressional:${stateFips}01`,
          placeGeoid,
          stateFips,
          chamber: "congressional",
          districtGeoid: `${stateFips}01`,
          boundaryVintage: "2024",
          populationAsOf: "2020-04-01",
          partPopulationCount: 20,
          placePopulationCount: 50,
          evidence: expect.objectContaining({ artifactId }),
        }),
        expect.objectContaining({
          districtGeoid: `${stateFips}02`,
          partPopulationCount: 30,
          placePopulationCount: 50,
        }),
      ]),
    );
  });

  it("preserves a zero population district part and an all-zero denominator", () => {
    const records = normalizeDistrictPopulationParts(
      [
        part(1, { population: 0 }),
        part(2, { districtGeoid: `${stateFips}02`, population: 0 }),
      ],
      artifactId,
    );
    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(record.partPopulationCount).toBe(0);
      expect(record.placePopulationCount).toBe(0);
    }
  });

  it("keeps vintages and chambers separate, including reuse of a block", () => {
    const records = normalizeDistrictPopulationParts(
      [
        part(1, { population: 11 }),
        part(1, { boundaryVintage: "2026", population: 22 }),
        part(1, {
          chamber: "state-upper",
          districtGeoid: `${stateFips}001`,
          population: 33,
        }),
        part(1, {
          chamber: "state-lower",
          districtGeoid: `${stateFips}001`,
          population: 44,
        }),
      ],
      artifactId,
    );
    expect(records).toHaveLength(4);
    expect(new Set(records.map((record) => record.recordId)).size).toBe(4);
    for (const record of records) {
      expect(record.placePopulationCount).toBe(record.partPopulationCount);
    }
    expect(
      records
        .map((record) => record.placePopulationCount)
        .sort((a, b) => a - b),
    ).toEqual([11, 22, 33, 44]);
  });

  it("rejects duplicate blocks in the same chamber and vintage", () => {
    expect(() =>
      normalizeDistrictPopulationParts(
        [part(1), part(1, { districtGeoid: `${stateFips}02` })],
        artifactId,
      ),
    ).toThrow();
  });

  it("accepts alphabetic legislative codes and retains residual population in the denominator", () => {
    const records = normalizeDistrictPopulationParts(
      [
        part(1, {
          chamber: "state-upper",
          districtGeoid: `${stateFips}A01`,
          population: 9,
        }),
        part(2, {
          chamber: "state-upper",
          districtGeoid: `${stateFips}ZZZ`,
          population: 6,
        }),
      ],
      artifactId,
    );
    expect(records).toHaveLength(2);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          districtGeoid: `${stateFips}A01`,
          partPopulationCount: 9,
          placePopulationCount: 15,
        }),
        expect.objectContaining({
          districtGeoid: `${stateFips}ZZZ`,
          partPopulationCount: 6,
          placePopulationCount: 15,
        }),
      ]),
    );
  });

  it("excludes blocks outside any place from records and denominators", () => {
    const records = normalizeDistrictPopulationParts(
      [
        part(1, { population: 7 }),
        part(2, { placeGeoid: null, population: 100 }),
      ],
      artifactId,
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      placeGeoid,
      partPopulationCount: 7,
      placePopulationCount: 7,
    });
    expect(
      normalizeDistrictPopulationParts(
        [part(3, { placeGeoid: null })],
        artifactId,
      ),
    ).toEqual([]);
  });

  it("rejects district state mismatches", () => {
    const otherState = stateFips === "01" ? "02" : "01";
    expect(() =>
      normalizeDistrictPopulationParts(
        [part(1, { districtGeoid: `${otherState}01` })],
        artifactId,
      ),
    ).toThrow();
  });

  it.each([-1, 1.5, NaN, Infinity])(
    "rejects invalid population %s",
    (population) => {
      expect(() =>
        normalizeDistrictPopulationParts([part(1, { population })], artifactId),
      ).toThrow();
    },
  );
});
