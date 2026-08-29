import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDistrictGeoid,
  buildDistrictId,
  compilePoliticalGeographyCorpus,
  computeGeometryHash,
  findAdjacentDistricts,
  findDistrictById,
  findDistrictsByCounty,
  findDistrictsByPoint,
  findDistrictsByStateAndChamber,
  findHistoricalDistrictVintages,
  generatePoliticalGeographyManifest,
  normalizeStateIdentifier,
  parseDistrictId,
  STATE_MASTER_TABLE,
  validateGeometryCoordinates,
  validatePoliticalGeographyCorpus,
} from "../src/political_geography/index.js";
import type {
  DistrictGeometry,
  PoliticalGeographyCorpus,
  RawDistrictInput,
} from "../src/political_geography/index.js";

const corpusPath = join(
  __dirname,
  "../data/political_geography/corpus/normalized_political_geography.json",
);

function loadCompiledCorpus(): PoliticalGeographyCorpus {
  const data = readFileSync(corpusPath, "utf8");
  return JSON.parse(data) as PoliticalGeographyCorpus;
}

describe("Political Geography / District Boundary Source Compiler", () => {
  const corpus = loadCompiledCorpus();

  describe("1. Stable District Identifiers and State Normalization", () => {
    it("generates deterministic, stable compound district IDs", () => {
      const id1 = buildDistrictId("2026", "KY", "congressional", "6");
      const id2 = buildDistrictId("2026", "kentucky", "congressional", "06");
      const id3 = buildDistrictId("2026", "21", "congressional", "District 6");

      expect(id1).toBe("geo:district:2026:ky:congressional:6");
      expect(id2).toBe("geo:district:2026:ky:congressional:6");
      expect(id3).toBe("geo:district:2026:ky:congressional:6");
    });

    it("parses valid compound district IDs back into components", () => {
      const parsed = parseDistrictId("geo:district:2026:ky:congressional:6");
      expect(parsed).toEqual({
        vintage: "2026",
        statePostal: "KY",
        chamberType: "congressional",
        districtIdentifier: "6",
      });
    });

    it("handles At-Large and Non-Voting Delegate ID formatting", () => {
      const wyAtLarge = buildDistrictId("2026", "WY", "congressional", "al");
      expect(wyAtLarge).toBe("geo:district:2026:wy:congressional:al");

      const dcDelegate = buildDistrictId(
        "2026",
        "DC",
        "non_voting_delegate",
        "98",
      );
      expect(dcDelegate).toBe("geo:district:2026:dc:non_voting_delegate:98");
    });

    it("normalizes state FIPS, postal codes, and names across all 50 states + DC + PR", () => {
      expect(normalizeStateIdentifier("KY")).toEqual(STATE_MASTER_TABLE.KY);
      expect(normalizeStateIdentifier("21")).toEqual(STATE_MASTER_TABLE.KY);
      expect(normalizeStateIdentifier("kentucky")).toEqual(
        STATE_MASTER_TABLE.KY,
      );
      expect(normalizeStateIdentifier("us_ky")).toEqual(STATE_MASTER_TABLE.KY);

      expect(normalizeStateIdentifier("WY")).toEqual(STATE_MASTER_TABLE.WY);
      expect(normalizeStateIdentifier("56")).toEqual(STATE_MASTER_TABLE.WY);

      expect(normalizeStateIdentifier("NE")).toEqual(STATE_MASTER_TABLE.NE);
      expect(normalizeStateIdentifier("31")).toEqual(STATE_MASTER_TABLE.NE);

      expect(normalizeStateIdentifier("TX")).toEqual(STATE_MASTER_TABLE.TX);
      expect(normalizeStateIdentifier("48")).toEqual(STATE_MASTER_TABLE.TX);

      expect(normalizeStateIdentifier("DC")).toEqual(STATE_MASTER_TABLE.DC);
      expect(normalizeStateIdentifier("11")).toEqual(STATE_MASTER_TABLE.DC);

      expect(normalizeStateIdentifier("PR")).toEqual(STATE_MASTER_TABLE.PR);
      expect(normalizeStateIdentifier("72")).toEqual(STATE_MASTER_TABLE.PR);
    });

    it("builds standard Census GEOIDs for congressional and legislative chambers", () => {
      expect(buildDistrictGeoid("21", "congressional", "6")).toBe("2106");
      expect(buildDistrictGeoid("56", "congressional", "al")).toBe("5600");
      expect(buildDistrictGeoid("11", "non_voting_delegate", "98")).toBe(
        "1198",
      );
      expect(buildDistrictGeoid("21", "state_senate", "13")).toBe("21013");
      expect(buildDistrictGeoid("21", "state_house", "77")).toBe("21077");
      expect(buildDistrictGeoid("31", "unicameral", "46")).toBe("31046");
      expect(buildDistrictGeoid("11", "council_ward", "2")).toBe("11002");
    });
  });

  describe("2. Geometry Hashing and Coordinate Integrity", () => {
    it("computes deterministic SHA-256 hash that changes when coordinates are perturbed", () => {
      const geom1 = corpus.districts.find(
        (d) => d.districtId === "geo:district:2026:ky:congressional:6",
      )!.geometry;
      const hash1 = computeGeometryHash(geom1);

      // Same geometry produces identical hash
      const hash1Copy = computeGeometryHash(JSON.parse(JSON.stringify(geom1)));
      expect(hash1).toBe(hash1Copy);

      // Perturbed coordinate produces distinct hash
      const geomPerturbed = JSON.parse(JSON.stringify(geom1));
      geomPerturbed.coordinates[0][0][0] += 0.001;
      const hashPerturbed = computeGeometryHash(geomPerturbed);
      expect(hashPerturbed).not.toBe(hash1);
    });

    it("validates geometry coordinate bounds and closed linear rings", () => {
      for (const district of corpus.districts) {
        const validation = validateGeometryCoordinates(district.geometry);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it("rejects invalid unclosed rings and out-of-bound coordinates", () => {
      const unclosed: DistrictGeometry = {
        type: "Polygon",
        coordinates: [
          [
            [-84.5, 38.0],
            [-84.0, 38.0],
            [-84.0, 38.5],
            [-84.5, 38.5],
          ] as unknown as [number, number][], // Missing closing point
        ],
      };
      expect(validateGeometryCoordinates(unclosed).valid).toBe(false);

      const outOfBounds: DistrictGeometry = {
        type: "Polygon",
        coordinates: [
          [
            [-200.0, 38.0],
            [-84.0, 38.0],
            [-84.0, 38.5],
            [-200.0, 38.0],
          ],
        ],
      };
      expect(validateGeometryCoordinates(outOfBounds).valid).toBe(false);
    });
  });

  describe("3. Collision Avoidance and Disambiguation", () => {
    it("prevents collisions between same district numbers in different states, chambers, or vintages", () => {
      const kyCd6 = findDistrictById(
        corpus,
        "geo:district:2026:ky:congressional:6",
      );
      const kyHd6 = buildDistrictId("2026", "KY", "state_house", "6");
      const dcWard6 = findDistrictById(
        corpus,
        "geo:district:2026:dc:council_ward:6",
      );
      const ky2024Cd6 = findDistrictById(
        corpus,
        "geo:district:2024:ky:congressional:6",
      );

      expect(kyCd6).toBeDefined();
      expect(dcWard6).toBeDefined();
      expect(ky2024Cd6).toBeDefined();

      expect(kyCd6!.districtId).not.toBe(dcWard6!.districtId);
      expect(kyCd6!.districtId).not.toBe(ky2024Cd6!.districtId);
      expect(kyCd6!.districtId).not.toBe(kyHd6);

      expect(kyCd6!.geoid).toBe("2106");
      expect(dcWard6!.geoid).toBe("11006");
    });
  });

  describe("4. Multi-Vintage Coexistence and Version-Aware Redistricting", () => {
    it("allows 2024 and 2026 vintages to coexist concurrently in the same corpus", () => {
      const ky2024Cd6 = findDistrictById(
        corpus,
        "geo:district:2024:ky:congressional:6",
      );
      const ky2026Cd6 = findDistrictById(
        corpus,
        "geo:district:2026:ky:congressional:6",
      );

      expect(ky2024Cd6).toBeDefined();
      expect(ky2026Cd6).toBeDefined();

      expect(ky2024Cd6!.sourceVintage).toBe("2024");
      expect(ky2026Cd6!.sourceVintage).toBe("2026");

      // Distinct validity windows
      expect(ky2024Cd6!.effectiveDateInfo.validUntil).toBe("2025-12-31");
      expect(ky2024Cd6!.effectiveDateInfo.isCurrent).toBe(false);
      expect(ky2026Cd6!.effectiveDateInfo.validUntil).toBeNull();
      expect(ky2026Cd6!.effectiveDateInfo.isCurrent).toBe(true);

      // When boundaries are unchanged across vintages, geometry hash is identical
      // while validity windows and active status remain strictly separated
      expect(ky2024Cd6!.geometryHash).toBe(ky2026Cd6!.geometryHash);
      expect(ky2024Cd6!.districtId).not.toBe(ky2026Cd6!.districtId);
    });

    it("retrieves historical vintage lineage for a district", () => {
      const history = findHistoricalDistrictVintages(
        corpus,
        "KY",
        "congressional",
        "6",
      );
      expect(history).toHaveLength(2);
      expect(history[0].sourceVintage).toBe("2024");
      expect(history[1].sourceVintage).toBe("2026");
    });
  });

  describe("5. Spatial Derivations: Bounding Boxes, Centroids, and Adjacency", () => {
    it("derives accurate bounding boxes and centroids inside bounds", () => {
      for (const district of corpus.districts) {
        const [minLon, minLat, maxLon, maxLat] = district.derived.boundingBox;
        const [cLon, cLat] = district.derived.centroid;

        expect(minLon).toBeLessThanOrEqual(maxLon);
        expect(minLat).toBeLessThanOrEqual(maxLat);

        expect(cLon).toBeGreaterThanOrEqual(minLon);
        expect(cLon).toBeLessThanOrEqual(maxLon);
        expect(cLat).toBeGreaterThanOrEqual(minLat);
        expect(cLat).toBeLessThanOrEqual(maxLat);
      }
    });

    it("derives deterministic topological adjacency between neighboring districts", () => {
      // KY SD 13 (Lexington Central) and KY SD 27 (surrounding Bourbon/Fayette) share a boundary
      const sd13 = findDistrictById(
        corpus,
        "geo:district:2026:ky:state_senate:13",
      );
      const sd27 = findDistrictById(
        corpus,
        "geo:district:2026:ky:state_senate:27",
      );

      expect(sd13).toBeDefined();
      expect(sd27).toBeDefined();

      expect(sd13!.derived.adjacentDistrictIds).toContain(sd27!.districtId);
      expect(sd27!.derived.adjacentDistrictIds).toContain(sd13!.districtId);

      const adjacentToSd13 = findAdjacentDistricts(corpus, sd13!.districtId);
      expect(adjacentToSd13.map((d) => d.districtId)).toContain(
        sd27!.districtId,
      );
    });

    it("approximates realistic surface areas in square kilometers", () => {
      for (const district of corpus.districts) {
        expect(district.derived.areaSquareKmEstimated).toBeDefined();
        expect(district.derived.areaSquareKmEstimated!).toBeGreaterThan(0);
      }
    });
  });

  describe("6. Point-in-District Constituency Lookups", () => {
    it("resolves Lexington, KY coordinates to KY CD 6, SD 13, and HD 77", () => {
      const lexingtonCoord: [number, number] = [-84.5, 38.05];

      const matchedDistricts = findDistrictsByPoint(corpus, lexingtonCoord, {
        vintage: "2026",
      });
      const matchedIds = matchedDistricts.map((d) => d.districtId);

      expect(matchedIds).toContain("geo:district:2026:ky:congressional:6");
      expect(matchedIds).toContain("geo:district:2026:ky:state_senate:13");
      expect(matchedIds).toContain("geo:district:2026:ky:state_house:77");
    });

    it("resolves Austin, TX coordinates to TX CD 37, SD 14, and HD 49", () => {
      const austinCoord: [number, number] = [-97.74, 30.28];

      const matchedDistricts = findDistrictsByPoint(corpus, austinCoord, {
        vintage: "2026",
      });
      const matchedIds = matchedDistricts.map((d) => d.districtId);

      expect(matchedIds).toContain("geo:district:2026:tx:congressional:37");
      expect(matchedIds).toContain("geo:district:2026:tx:state_senate:14");
      expect(matchedIds).toContain("geo:district:2026:tx:state_house:49");
    });

    it("resolves Lincoln, NE coordinates to NE CD 1 and Unicameral LD 46", () => {
      const lincolnCoord: [number, number] = [-96.7, 40.82];

      const matchedDistricts = findDistrictsByPoint(corpus, lincolnCoord, {
        vintage: "2026",
      });
      const matchedIds = matchedDistricts.map((d) => d.districtId);

      expect(matchedIds).toContain("geo:district:2026:ne:congressional:1");
      expect(matchedIds).toContain("geo:district:2026:ne:unicameral:46");
    });

    it("resolves Cheyenne, WY coordinates to WY At-Large CD, SD 8, and HD 7", () => {
      const southCheyenneCoord: [number, number] = [-104.84, 41.11];
      const northCheyenneCoord: [number, number] = [-104.827, 41.173];

      const southDistricts = findDistrictsByPoint(corpus, southCheyenneCoord, {
        vintage: "2026",
      });
      const southIds = southDistricts.map((d) => d.districtId);
      expect(southIds).toContain("geo:district:2026:wy:congressional:al");
      expect(southIds).toContain("geo:district:2026:wy:state_senate:8");

      const northDistricts = findDistrictsByPoint(corpus, northCheyenneCoord, {
        vintage: "2026",
      });
      const northIds = northDistricts.map((d) => d.districtId);
      expect(northIds).toContain("geo:district:2026:wy:congressional:al");
      expect(northIds).toContain("geo:district:2026:wy:state_house:7");
    });

    it("resolves Washington, DC coordinates to DC Non-Voting Delegate and Council Ward 2", () => {
      const dcCoord: [number, number] = [-77.04, 38.9];

      const matchedDistricts = findDistrictsByPoint(corpus, dcCoord, {
        vintage: "2026",
      });
      const matchedIds = matchedDistricts.map((d) => d.districtId);

      expect(matchedIds).toContain(
        "geo:district:2026:dc:non_voting_delegate:98",
      );
      expect(matchedIds).toContain("geo:district:2026:dc:council_ward:2");
    });
  });

  describe("7. Hierarchy Links and County Queries", () => {
    it("finds all districts overlapping Fayette County, KY (FIPS 21067)", () => {
      const fayetteDistricts = findDistrictsByCounty(corpus, "21067", "2026");
      const ids = fayetteDistricts.map((d) => d.districtId);

      expect(ids).toContain("geo:district:2026:ky:congressional:6");
      expect(ids).toContain("geo:district:2026:ky:state_senate:13");
      expect(ids).toContain("geo:district:2026:ky:state_house:77");
    });

    it("finds all districts in a state and chamber", () => {
      const kySenate = findDistrictsByStateAndChamber(
        corpus,
        "KY",
        "state_senate",
        "2026",
      );
      expect(kySenate.length).toBeGreaterThan(0);
      expect(
        kySenate.every(
          (d) =>
            d.chamberType === "state_senate" && d.state.statePostal === "KY",
        ),
      ).toBe(true);
    });
  });

  describe("8. Full Corpus Integrity and Manifest Generation", () => {
    it("passes full validation suite with 0 errors", () => {
      const validation = validatePoliticalGeographyCorpus(corpus);
      expect(validation.valid).toBe(true);
      expect(
        validation.issues.filter((i) => i.severity === "error"),
      ).toHaveLength(0);
      expect(validation.totalDistricts).toBe(24);
      expect(validation.stats.uniqueGeometryHashes).toBe(22);
    });

    it("generates a comprehensive coverage manifest", () => {
      const manifest = generatePoliticalGeographyManifest(corpus);
      expect(manifest.schemaVersion).toBe("1.0.0");
      expect(manifest.supportedVintages).toEqual(["2024", "2026"]);
      expect(manifest.totalDistrictsAcrossAllVintages).toBe(24);
      expect(manifest.vintages["2026"].stateCoverage["KY"]).toBeDefined();
      expect(manifest.vintages["2026"].stateCoverage["WY"]).toBeDefined();
      expect(manifest.vintages["2026"].stateCoverage["NE"]).toBeDefined();
      expect(manifest.vintages["2026"].stateCoverage["TX"]).toBeDefined();
      expect(manifest.vintages["2026"].stateCoverage["DC"]).toBeDefined();
    });

    it("compiles deterministically and identically on repeated execution", () => {
      const rawFixtures = JSON.parse(
        readFileSync(
          join(
            __dirname,
            "../data/political_geography/fixtures/raw_tiger_2026/ky_fixtures.json",
          ),
          "utf8",
        ),
      ) as RawDistrictInput[];
      const first = compilePoliticalGeographyCorpus(rawFixtures, {
        fixedCompilationTimestamp: "2026-08-28T00:00:00.000Z",
      });
      const second = compilePoliticalGeographyCorpus(rawFixtures, {
        fixedCompilationTimestamp: "2026-08-28T00:00:00.000Z",
      });

      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });
  });
});
