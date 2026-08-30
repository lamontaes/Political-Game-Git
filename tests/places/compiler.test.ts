import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { compilePlaces } from "../../scripts/places/compile-places";
import type { PlacesCorpus } from "../../scripts/places/compile-places";

describe("Places Compiler", () => {
  const dataDir = resolve(__dirname, "../../data/places");
  const inputFile = resolve(dataDir, "2025_Gaz_place_national.txt");
  const outputFile = resolve(dataDir, "compiled-places.json");

  beforeAll(() => {
    // We ensure the compile happens before tests check it
    if (!existsSync(inputFile)) {
      console.warn(
        `Input file not found at ${inputFile}, tests may fail if no output file exists.`,
      );
    } else {
      compilePlaces(inputFile, outputFile);
    }
  });

  let corpus: PlacesCorpus;

  beforeAll(() => {
    const data = readFileSync(outputFile, "utf-8");
    corpus = JSON.parse(data);
  });

  it("should have correct source SHA/provenance integrity", () => {
    expect(corpus.provenance).toBeDefined();
    expect(corpus.provenance.rawSha256).toBe(
      "15f4977a010cc42308f4d5ddc5e19f26ef63fc035f20745333a14b78aa08d3fa",
    );
    expect(corpus.provenance.vintage).toBe("2025");
    expect(corpus.provenance.url).toBe(
      "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip",
    );
  });

  it("should correctly format and extract stable deterministic place records", () => {
    expect(corpus.records.length).toBeGreaterThan(10000);
    const sample = corpus.records[0];
    expect(sample).toHaveProperty("stateCode");
    expect(sample).toHaveProperty("placeCode");
    expect(sample).toHaveProperty("geoid");
    expect(sample).toHaveProperty("sourceName");
    expect(sample).toHaveProperty("displayName");
    expect(sample).toHaveProperty("latitude");
    expect(sample).toHaveProperty("longitude");
    expect(typeof sample.latitude).toBe("number");
    expect(typeof sample.longitude).toBe("number");
  });

  it("should have valid state/place/GEOID identities", () => {
    for (const record of corpus.records) {
      expect(record.stateCode.length).toBe(2);
      expect(record.geoid.length).toBe(7); // 2 state + 5 place
      // Ensure no fabricated political capabilities
      expect(record).not.toHaveProperty("politicalRules");
      expect(record).not.toHaveProperty("governmentType");
    }
  });

  it("should correctly separate source identity from display identity for Lexington, Kentucky", () => {
    const lexington = corpus.records.find(
      (r) => r.stateCode === "KY" && r.sourceName.includes("Lexington-Fayette"),
    );
    expect(lexington).toBeDefined();
    expect(lexington?.sourceName).toBe("Lexington-Fayette urban county");
    expect(lexington?.displayName).toBe("Lexington");
  });

  it("should cleanly parse Boston, Massachusetts", () => {
    const boston = corpus.records.find(
      (r) => r.stateCode === "MA" && r.sourceName === "Boston city",
    );
    expect(boston).toBeDefined();
    expect(boston?.displayName).toBe("Boston");
    expect(boston?.geoid).toBe("2507000");
  });

  it("should cleanly parse Philadelphia, Pennsylvania", () => {
    const philly = corpus.records.find(
      (r) => r.stateCode === "PA" && r.sourceName === "Philadelphia city",
    );
    expect(philly).toBeDefined();
    expect(philly?.displayName).toBe("Philadelphia");
    expect(philly?.geoid).toBe("4260000");
  });

  it("should cleanly parse Atlanta, Georgia", () => {
    const atlanta = corpus.records.find(
      (r) => r.stateCode === "GA" && r.sourceName === "Atlanta city",
    );
    expect(atlanta).toBeDefined();
    expect(atlanta?.displayName).toBe("Atlanta");
    expect(atlanta?.geoid).toBe("1304000");
  });

  it("should handle duplicate-name/collision cases appropriately", () => {
    // E.g., multiple places named "Springfield"
    const springfields = corpus.records.filter(
      (r) => r.displayName === "Springfield",
    );
    expect(springfields.length).toBeGreaterThan(10); // Many states have a Springfield

    // Ensure they have distinct GEOIDs and states
    const geoids = new Set(springfields.map((s) => s.geoid));
    expect(geoids.size).toBe(springfields.length); // All should be unique
  });

  it("should not inject arbitrary game mechanics or fabricated capabilities", () => {
    const recordKeys = Object.keys(corpus.records[0]);
    const allowedKeys = [
      "stateCode",
      "placeCode",
      "geoid",
      "sourceName",
      "displayName",
      "latitude",
      "longitude",
    ];
    for (const key of recordKeys) {
      expect(allowedKeys).toContain(key);
    }
  });
});
