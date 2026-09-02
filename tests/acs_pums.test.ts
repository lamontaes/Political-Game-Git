import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type {
  PumsAcquisitionManifest,
  QASliceArtifact,
} from "../src/acs_pums/types.js";
import { parsePumsDataDictionary } from "../src/acs_pums/dictionary.js";
import {
  parseHousingRecord,
  parsePersonRecord,
  compileHouseholdClusters,
  parseCsvHeaderAndRows,
} from "../src/acs_pums/compiler.js";

describe("ACS PUMS Acquisition and Compiler Suite", () => {
  it("loads and validates the ACS PUMS manifest provenance and hashes", () => {
    const manifestPath = path.resolve("data/acs_pums/pums_manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest: PumsAcquisitionManifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf8"),
    );
    expect(manifest.vintage).toBe("2023");
    expect(manifest.dataset_type).toBe("1-Year ACS PUMS");
    expect(manifest.deidentification_statement).toContain(
      "public-use and de-identified",
    );
    expect(manifest.unresolved_behavioral_research_statement).toContain(
      "UNRESOLVED",
    );
    expect(manifest.source_artifacts.length).toBeGreaterThanOrEqual(3);

    for (const artifact of manifest.source_artifacts) {
      expect(artifact.url).toContain("census.gov");
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(artifact.size_bytes).toBeGreaterThan(0);
    }
  });

  it("parses PUMS data dictionary and preserves missing/NA codes", () => {
    const dictPath = path.resolve(
      "data/acs_pums/PUMS_Data_Dictionary_2023.csv",
    );
    expect(fs.existsSync(dictPath)).toBe(true);

    const dictCsv = fs.readFileSync(dictPath, "utf8");
    const dict = parsePumsDataDictionary(dictCsv, "2023");

    expect(dict.vintage).toBe("2023");
    expect(dict.variables["SERIALNO"]).toBeDefined();
    expect(dict.variables["PWGTP"]).toBeDefined();
    expect(dict.variables["WGTP"]).toBeDefined();

    // Verify missing codes are marked
    const accessInet = dict.variables["ACCESSINET"];
    if (accessInet) {
      const naCode = accessInet.values.find(
        (v) => v.is_missing_or_not_applicable,
      );
      expect(naCode).toBeDefined();
      expect(naCode?.is_missing_or_not_applicable).toBe(true);
    }
  });

  it("verifies housing-person SERIALNO linkage and weight field preservation", () => {
    const sampleHousingCsv = `RT,SERIALNO,DIVISION,PUMA,REGION,STATE,ADJHSG,ADJINC,WGTP,NP
H,2023HU0000001,8,00300,4,56,1000000,1019518,42,2
H,2023HU0000002,8,00300,4,56,1000000,1019518,15,1`;

    const samplePersonCsv = `RT,SERIALNO,DIVISION,SPORDER,PUMA,REGION,STATE,ADJINC,PWGTP,AGEP,SEX,WAGP
P,2023HU0000001,8,1,00300,4,56,1019518,42,45,1,50000
P,2023HU0000001,8,2,00300,4,56,1019518,38,43,2,62000
P,2023HU0000002,8,1,00300,4,56,1019518,15,22,1,12000`;

    const { headers: hHeaders, rows: hRows } =
      parseCsvHeaderAndRows(sampleHousingCsv);
    const { headers: pHeaders, rows: pRows } =
      parseCsvHeaderAndRows(samplePersonCsv);

    const housingRecords = hRows.map((r) => parseHousingRecord(hHeaders, r));
    const personRecords = pRows.map((r) => parsePersonRecord(pHeaders, r));

    expect(housingRecords.length).toBe(2);
    expect(personRecords.length).toBe(3);

    const clusters = compileHouseholdClusters(housingRecords, personRecords);
    expect(clusters.length).toBe(2);

    const firstCluster = clusters.find(
      (c) => c.housing.SERIALNO === "2023HU0000001",
    );
    expect(firstCluster).toBeDefined();
    expect(firstCluster?.persons.length).toBe(2);
    expect(firstCluster?.housing.WGTP).toBe(42);
    expect(firstCluster?.persons[0].PWGTP).toBe(42);
    expect(firstCluster?.persons[0].SPORDER).toBe(1);
    expect(firstCluster?.persons[1].SPORDER).toBe(2);
  });

  it("rejects malformed CSV rows and invalid record types", () => {
    const malformedCsv = `RT,SERIALNO,WGTP
H,2023HU0000001,42,EXTRA_COL`;
    expect(() => parseCsvHeaderAndRows(malformedCsv)).toThrow(
      /Malformed CSV row/,
    );

    const invalidRtCsv = `RT,SERIALNO,WGTP
X,2023HU0000001,42`;
    const { headers, rows } = parseCsvHeaderAndRows(invalidRtCsv);
    expect(() => parseHousingRecord(headers, rows[0])).toThrow(
      /Invalid Housing Record RT/,
    );
  });

  it("validates the compiled QA slice artifact for Wyoming 2023", () => {
    const qaPath = path.resolve("data/acs_pums/qa_slice_wy_2023.json");
    expect(fs.existsSync(qaPath)).toBe(true);

    const qaSlice: QASliceArtifact = JSON.parse(
      fs.readFileSync(qaPath, "utf8"),
    );
    expect(qaSlice.vintage).toBe("2023");
    expect(qaSlice.households.length).toBe(50);
    expect(qaSlice.summary.total_housing_units).toBe(50);
    expect(qaSlice.summary.preserved_missing_codes_count).toBeGreaterThan(0);

    // Verify person-housing key linkage in QA slice
    for (const cluster of qaSlice.households) {
      expect(cluster.housing.RT).toBe("H");
      expect(cluster.housing.SERIALNO).toBeDefined();
      expect(typeof cluster.housing.WGTP).toBe("number");

      for (const person of cluster.persons) {
        expect(person.RT).toBe("P");
        expect(person.SERIALNO).toBe(cluster.housing.SERIALNO);
        expect(typeof person.PWGTP).toBe("number");
        expect(typeof person.SPORDER).toBe("number");
      }
    }
  });

  it("confirms that simulation runtime state is unchanged and no probabilities are invented", () => {
    // Structural isolation check: Ensure acs_pums directory does not touch simulation state
    const pumsDir = path.resolve("src/acs_pums");
    const files = fs.readdirSync(pumsDir);
    for (const file of files) {
      const content = fs.readFileSync(path.join(pumsDir, file), "utf8");
      expect(content).not.toContain("createWorld");
      expect(content).not.toContain("Probability");
    }
  });
});
