import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  renderPlaceCountyModule,
  renderDistrictPopulationModules,
} from "../../../../scripts/source/export-place-county-relations";
import { PLACE_COUNTY_RELATIONS_ROWS } from "../../../simulation/place-county-relations.generated";
import {
  corpusCanonicalDigest,
  isClean,
  type ArtifactLock,
} from "../../core/index";
import {
  sourceDomain,
  type PlaceRelationRecord,
  type PlaceCountyPartRecord,
  type PlaceDistrictPopulationRecord,
} from "./index";
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
  it("regenerates one source line per acquired row without changing county or district records", () => {
    const records = JSON.parse(
      readFileSync(
        new URL(
          "../../../../data/source/place-county-relations/corpus.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PlaceRelationRecord[];
    const counties = records
      .filter(
        (record): record is PlaceCountyPartRecord =>
          !("relationKind" in record),
      )
      .map((record) => [
        record.placeGeoid,
        record.countyGeoid,
        record.partLandAreaSquareMeters,
        record.partPopulationCount,
      ]);
    const districts = records
      .filter(
        (record): record is PlaceDistrictPopulationRecord =>
          "relationKind" in record,
      )
      .map((record) => [
        record.placeGeoid,
        record.chamber,
        record.boundaryVintage,
        record.districtGeoid,
        record.partPopulationCount,
        record.placePopulationCount,
      ]);
    expect(JSON.parse(PLACE_COUNTY_RELATIONS_ROWS)).toEqual(counties);
    const modules = renderDistrictPopulationModules();
    const shardRows = [...modules]
      .filter(([path]) => path.endsWith(".json"))
      .flatMap(([path, text]) => {
        expect(text).toBe(
          readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8"),
        );
        const rows = JSON.parse(text) as unknown[][];
        expect(
          text.split("\n").filter((line) => line.startsWith('["')).length,
        ).toBe(rows.length);
        return rows;
      });
    expect(
      shardRows.map((row) => JSON.stringify(row.slice(0, 6))).sort(),
    ).toEqual(districts.map((row) => JSON.stringify(row)).sort());
    const groups = new Map<string, unknown[][]>();
    for (const row of shardRows) {
      const key = `${row[0]}:${row[1]}:${row[2]}`;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    let actualTieCount = 0;
    for (const rows of groups.values()) {
      const max = Math.max(...rows.map((row) => row[4] as number));
      const tied = rows.filter((row) => row[4] === max);
      if (tied.length < 2) continue;
      actualTieCount += 1;
      expect(
        tied.every(
          (row) =>
            typeof row[6] === "number" &&
            Number.isSafeInteger(row[6]) &&
            (row[6] as number) >= 0,
        ),
      ).toBe(true);
      const largestArea = Math.max(...tied.map((row) => row[6] as number));
      expect(tied.filter((row) => row[6] === largestArea)).toHaveLength(1);
    }
    expect(actualTieCount).toBeGreaterThan(0);
    const loaderPath = "src/districts/district-population-loaders.generated.ts";
    expect(modules.get(loaderPath)).toBe(
      readFileSync(
        new URL(`../../../../${loaderPath}`, import.meta.url),
        "utf8",
      ),
    );
    const rendered = renderPlaceCountyModule();
    expect(rendered).toBe(
      readFileSync(
        new URL(
          "../../../simulation/place-county-relations.generated.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(
      rendered.split("\n").filter((line) => line.startsWith('["')).length,
    ).toBe(counties.length);
  });

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
