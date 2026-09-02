import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  compileCounties,
  parseCountyLine,
} from "../../scripts/counties-corpus/compile-counties";
import type { CountiesCorpus } from "../../scripts/counties-corpus/compile-counties";

describe("Counties Compiler", () => {
  const dataDir = resolve(__dirname, "../../data/counties");
  const inputFile = resolve(dataDir, "2025_Gaz_counties_national.txt");
  const outputFile = resolve(dataDir, "compiled-counties.json");

  beforeAll(() => {
    if (!existsSync(inputFile)) {
      console.warn(
        `Input file not found at ${inputFile}, tests may fail if no output file exists.`,
      );
    } else {
      compileCounties(inputFile, outputFile);
    }
  });

  let corpus: CountiesCorpus;

  beforeAll(() => {
    const data = readFileSync(outputFile, "utf-8");
    corpus = JSON.parse(data);
  });

  it("should have correct source SHA/provenance integrity", () => {
    expect(corpus.provenance).toBeDefined();
    expect(corpus.provenance.rawZipSha256).toBe(
      "4c90d0f805779923b5958ab13d0c1e9b99fe4932b786bfcf75dd739bb2dcb4ea",
    );
    expect(corpus.provenance.rawSha256).toBe(
      "1914f0d83243362de83b8ddd298c213b1768d63d62d19464743289abd8bb35b1",
    );
    expect(corpus.provenance.vintage).toBe("2025");
    expect(corpus.provenance.url).toBe(
      "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip",
    );
    expect(corpus.provenance.recordCount).toBe(3222);
  });

  it("should correctly format and extract stable deterministic county records", () => {
    expect(corpus.records.length).toBe(3222);
    const sample = corpus.records[0];
    expect(sample).toHaveProperty("stateCode");
    expect(sample).toHaveProperty("stateFips");
    expect(sample).toHaveProperty("countyFips");
    expect(sample).toHaveProperty("geoid");
    expect(sample).toHaveProperty("geoidfq");
    expect(sample).toHaveProperty("ansiCode");
    expect(sample).toHaveProperty("sourceName");
    expect(sample).toHaveProperty("displayName");
    expect(sample).toHaveProperty("landAreaSqm");
    expect(sample).toHaveProperty("waterAreaSqm");
    expect(sample).toHaveProperty("landAreaSqMi");
    expect(sample).toHaveProperty("waterAreaSqMi");
    expect(sample).toHaveProperty("latitude");
    expect(sample).toHaveProperty("longitude");
    expect(typeof sample.latitude).toBe("number");
    expect(typeof sample.longitude).toBe("number");
  });

  it("should have valid state/FIPS/GEOID identities across all records", () => {
    for (const record of corpus.records) {
      expect(record.stateCode.length).toBe(2);
      expect(record.geoid.length).toBe(5); // 2 state + 3 county
      expect(record.stateFips).toBe(record.geoid.substring(0, 2));
      expect(record.countyFips).toBe(record.geoid.substring(2, 5));
      expect(record.geoidfq).toBe(`0500000US${record.geoid}`);

      // Ensure coordinate bounds
      expect(record.latitude).toBeGreaterThanOrEqual(-90);
      expect(record.latitude).toBeLessThanOrEqual(90);
      expect(record.longitude).toBeGreaterThanOrEqual(-180);
      expect(record.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("should correctly separate source identity from display identity for independent cities", () => {
    // Maryland - Baltimore City vs Baltimore County
    const baltimoreCity = corpus.records.find(
      (r) => r.stateCode === "MD" && r.geoid === "24510",
    );
    expect(baltimoreCity).toBeDefined();
    expect(baltimoreCity?.sourceName).toBe("Baltimore city");
    expect(baltimoreCity?.displayName).toBe("Baltimore City");

    const baltimoreCounty = corpus.records.find(
      (r) => r.stateCode === "MD" && r.geoid === "24005",
    );
    expect(baltimoreCounty).toBeDefined();
    expect(baltimoreCounty?.sourceName).toBe("Baltimore County");
    expect(baltimoreCounty?.displayName).toBe("Baltimore");

    // Missouri - St. Louis City vs St. Louis County
    const stLouisCity = corpus.records.find(
      (r) => r.stateCode === "MO" && r.geoid === "29510",
    );
    expect(stLouisCity).toBeDefined();
    expect(stLouisCity?.sourceName).toBe("St. Louis city");
    expect(stLouisCity?.displayName).toBe("St. Louis City");

    const stLouisCounty = corpus.records.find(
      (r) => r.stateCode === "MO" && r.geoid === "29189",
    );
    expect(stLouisCounty).toBeDefined();
    expect(stLouisCounty?.sourceName).toBe("St. Louis County");
    expect(stLouisCounty?.displayName).toBe("St. Louis");

    // Virginia - Fairfax City vs Fairfax County
    const fairfaxCity = corpus.records.find(
      (r) => r.stateCode === "VA" && r.geoid === "51600",
    );
    expect(fairfaxCity).toBeDefined();
    expect(fairfaxCity?.sourceName).toBe("Fairfax city");
    expect(fairfaxCity?.displayName).toBe("Fairfax City");

    const fairfaxCounty = corpus.records.find(
      (r) => r.stateCode === "VA" && r.geoid === "51059",
    );
    expect(fairfaxCounty).toBeDefined();
    expect(fairfaxCounty?.sourceName).toBe("Fairfax County");
    expect(fairfaxCounty?.displayName).toBe("Fairfax");
  });

  it("should handle county-equivalents truthfully (parishes, boroughs, census areas, municipios)", () => {
    // Alaska - Municipality
    const anchorage = corpus.records.find(
      (r) => r.stateCode === "AK" && r.geoid === "02020",
    );
    expect(anchorage).toBeDefined();
    expect(anchorage?.sourceName).toBe("Anchorage Municipality");
    expect(anchorage?.displayName).toBe("Anchorage");

    // Alaska - Borough
    const fairbanks = corpus.records.find(
      (r) => r.stateCode === "AK" && r.geoid === "02090",
    );
    expect(fairbanks).toBeDefined();
    expect(fairbanks?.sourceName).toBe("Fairbanks North Star Borough");
    expect(fairbanks?.displayName).toBe("Fairbanks North Star");

    // Alaska - Census Area
    const chugach = corpus.records.find(
      (r) => r.stateCode === "AK" && r.geoid === "02063",
    );
    expect(chugach).toBeDefined();
    expect(chugach?.sourceName).toBe("Chugach Census Area");
    expect(chugach?.displayName).toBe("Chugach");

    // Louisiana - Parish
    const acadia = corpus.records.find(
      (r) => r.stateCode === "LA" && r.geoid === "22001",
    );
    expect(acadia).toBeDefined();
    expect(acadia?.sourceName).toBe("Acadia Parish");
    expect(acadia?.displayName).toBe("Acadia");

    // Puerto Rico - Municipio
    const adjuntas = corpus.records.find(
      (r) => r.stateCode === "PR" && r.geoid === "72001",
    );
    expect(adjuntas).toBeDefined();
    expect(adjuntas?.sourceName).toBe("Adjuntas Municipio");
    expect(adjuntas?.displayName).toBe("Adjuntas");
  });

  it("should maintain distinct GEOIDs for duplicate county names across states", () => {
    const washingtons = corpus.records.filter(
      (r) => r.displayName === "Washington",
    );
    expect(washingtons.length).toBeGreaterThan(20); // ~31 states have Washington County

    // Ensure all have distinct GEOIDs and stateCodes
    const geoids = new Set(washingtons.map((w) => w.geoid));
    expect(geoids.size).toBe(washingtons.length);
  });

  it("should support territory coverage (Puerto Rico 78 municipios present)", () => {
    const prCounties = corpus.records.filter((r) => r.stateCode === "PR");
    expect(prCounties.length).toBe(78);
  });

  it("should not inject arbitrary game mechanics or fabricated capability keys", () => {
    const allowedKeys = [
      "stateCode",
      "stateFips",
      "countyFips",
      "geoid",
      "geoidfq",
      "ansiCode",
      "sourceName",
      "displayName",
      "landAreaSqm",
      "waterAreaSqm",
      "landAreaSqMi",
      "waterAreaSqMi",
      "latitude",
      "longitude",
    ];
    for (const record of corpus.records) {
      for (const key of Object.keys(record)) {
        expect(allowedKeys).toContain(key);
      }
      expect(record).not.toHaveProperty("politicalRules");
      expect(record).not.toHaveProperty("governmentType");
      expect(record).not.toHaveProperty("electionRules");
      expect(record).not.toHaveProperty("officeEligibility");
      expect(record).not.toHaveProperty("population");
      expect(record).not.toHaveProperty("powers");
    }
  });

  it("should enforce strict 11-field pipe-delimited Census Gazetteer parsing", () => {
    // Valid 11-field line
    const validLine =
      "AL|01001|0500000US01001|00161526|Autauga County|1539631460|25677536|594.455|9.914|32.532237|-86.64644";
    const record = parseCountyLine(validLine);
    expect(record).not.toBeNull();
    expect(record?.stateCode).toBe("AL");
    expect(record?.geoid).toBe("01001");
    expect(record?.stateFips).toBe("01");
    expect(record?.countyFips).toBe("001");
    expect(record?.sourceName).toBe("Autauga County");
    expect(record?.displayName).toBe("Autauga");
    expect(record?.latitude).toBeCloseTo(32.532237);
    expect(record?.longitude).toBeCloseTo(-86.64644);

    // Invalid column count (10 fields instead of 11)
    const lineWith10Fields =
      "AL|01001|0500000US01001|00161526|Autauga County|1539631460|25677536|594.455|32.532237|-86.64644";
    expect(parseCountyLine(lineWith10Fields)).toBeNull();

    // Tab-delimited line instead of pipe-delimited
    const tabLine =
      "AL\t01001\t0500000US01001\t00161526\tAutauga County\t1539631460\t25677536\t594.455\t9.914\t32.532237\t-86.64644";
    expect(parseCountyLine(tabLine)).toBeNull();

    // Out-of-range latitude
    const invalidLatLine =
      "AL|01001|0500000US01001|00161526|Autauga County|1539631460|25677536|594.455|9.914|132.532237|-86.64644";
    expect(parseCountyLine(invalidLatLine)).toBeNull();

    // Out-of-range longitude
    const invalidLngLine =
      "AL|01001|0500000US01001|00161526|Autauga County|1539631460|25677536|594.455|9.914|32.532237|-286.64644";
    expect(parseCountyLine(invalidLngLine)).toBeNull();
  });

  it("should be completely disjoint from PR #61 place corpus paths", () => {
    // Ensure county corpus paths exist and do not overlap with places paths
    expect(existsSync(resolve(__dirname, "../../data/counties"))).toBe(true);
    expect(
      existsSync(resolve(__dirname, "../../scripts/counties-corpus")),
    ).toBe(true);
    expect(existsSync(resolve(__dirname, "../../tests/counties"))).toBe(true);

    // Verify counties directory does not contain places files
    expect(
      existsSync(
        resolve(__dirname, "../../data/counties/compiled-places.json"),
      ),
    ).toBe(false);
  });
});
