import { describe, expect, it } from "vitest";
import {
  BEA_ECONOMY_ADAPTER_NOTE,
  BeaRegionalEconomyCorpus,
  compileBeaCorpusFromArtifacts,
  compileBeaRawArtifact,
  validateBeaCorpus,
  validateBeaObservations,
} from "../src/bea_regional_economy/index.js";
import type {
  BeaCorpusManifest,
  BeaRegionalObservation,
  RawBeaArtifactInput,
} from "../src/bea_regional_economy/index.js";
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "data/bea_regional_economy");

const MOCK_ARTIFACT_A: RawBeaArtifactInput = {
  artifactId: "bea_test_sainc1",
  tableId: "SAINC1",
  sourceUrlOrApiTable: "https://apps.bea.gov/api/data/sainc1",
  retrievalDateIso: "2026-09-02T12:00:00.000Z",
  description: "Test SAINC1 state income data",
  defaultIndicatorCategory: "personal_income",
  rows: [
    {
      GeoFips: "48000",
      GeoName: "Texas",
      TableName: "SAINC1",
      LineCode: "10",
      LineDescription: "Personal income (thousands of dollars)",
      TimePeriod: "2022",
      DataValue: "1800000000",
      CL_UNIT: "Thousands of Dollars",
      UNIT_MULT: "3",
    },
    {
      GeoFips: "48000",
      GeoName: "Texas",
      TableName: "SAINC1",
      LineCode: "30",
      LineDescription: "Per capita personal income (dollars)",
      TimePeriod: "2022",
      DataValue: "60000",
      CL_UNIT: "Dollars",
      UNIT_MULT: "0",
    },
  ],
};

const MOCK_ARTIFACT_SUPPRESSED: RawBeaArtifactInput = {
  artifactId: "bea_test_suppressed",
  tableId: "CAGDP2",
  sourceUrlOrApiTable: "https://apps.bea.gov/api/data/cagdp2",
  retrievalDateIso: "2026-09-02T12:00:00.000Z",
  description: "Test CAGDP2 county suppressed data",
  defaultIndicatorCategory: "gdp_nominal",
  rows: [
    {
      GeoFips: "48453",
      GeoName: "Travis, TX",
      TableName: "CAGDP2",
      LineCode: "99",
      LineDescription: "Confidential industry GDP",
      TimePeriod: "2022",
      DataValue: "(D)",
      CL_UNIT: "Thousands of Dollars",
      UNIT_MULT: "3",
    },
  ],
};

describe("BEA Regional Economy Corpus Sidecar", () => {
  describe("Compiler & Artifact Transformation", () => {
    it("correctly parses raw API rows and computes unit metadata & GEOID keys", () => {
      const { observations, provenance } =
        compileBeaRawArtifact(MOCK_ARTIFACT_A);

      expect(observations).toHaveLength(2);
      expect(provenance.artifactId).toBe("bea_test_sainc1");
      expect(provenance.recordCount).toBe(2);
      expect(provenance.sha256Hex).toHaveLength(64);

      const [obsIncome] = observations;
      expect(obsIncome).toMatchObject({
        geoid: "48000",
        geoName: "Texas",
        geoLevel: "state",
        year: 2022,
        indicatorCategory: "personal_income",
        value: 1800000000,
        isSuppressedOrMissing: false,
        unit: {
          unitName: "Thousands of Dollars",
          scaleFactor: 1000,
          valuationKind: "nominal",
          currencyCode: "USD",
        },
      });
    });

    it("honestly preserves suppressed and missing values as explicit nulls", () => {
      const { observations } = compileBeaRawArtifact(MOCK_ARTIFACT_SUPPRESSED);
      expect(observations).toHaveLength(1);
      const [obs] = observations;

      expect(obs.value).toBeNull();
      expect(obs.isSuppressedOrMissing).toBe(true);
    });

    it("compiles multi-artifact corpus with deterministic sorting and manifest generation", () => {
      const compiled = compileBeaCorpusFromArtifacts([
        { artifact: MOCK_ARTIFACT_A },
        { artifact: MOCK_ARTIFACT_SUPPRESSED },
      ]);

      expect(compiled.observations.length).toBe(3);
      expect(compiled.manifest.totalObservations).toBe(3);
      expect(compiled.manifest.coverageByGeoLevel.state).toBe(2);
      expect(compiled.manifest.coverageByGeoLevel.county).toBe(1);
      expect(compiled.manifest.checksumSha256Hex).toHaveLength(64);
    });
  });

  describe("Validation & Safeguards", () => {
    it("validates valid observations cleanly", () => {
      const { observations, manifest } = compileBeaCorpusFromArtifacts([
        { artifact: MOCK_ARTIFACT_A },
      ]);

      const result = validateBeaCorpus(observations, manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects mismatched valuationKind for an indicator category", () => {
      const { observations } = compileBeaRawArtifact(MOCK_ARTIFACT_A);
      // Mutate valuationKind to real_chained for personal_income (which expects nominal)
      observations[0]!.unit.valuationKind = "real_chained";

      const validation = validateBeaObservations(observations);
      expect(validation.valid).toBe(false);
      expect(validation.errors.join("\n")).toContain(
        "mismatched valuationKind",
      );
    });

    it("rejects a suppressed observation if non-null value is provided", () => {
      const { observations } = compileBeaRawArtifact(MOCK_ARTIFACT_SUPPRESSED);
      // Falsify state: isSuppressedOrMissing is true but value is non-null
      observations[0]!.value = 12345;

      const validation = validateBeaObservations(observations);
      expect(validation.valid).toBe(false);
      expect(validation.errors.join("\n")).toContain(
        "marked as suppressed/missing but contains non-null value",
      );
    });
  });

  describe("Corpus Query Interface & Economy Adapter Note", () => {
    it("queries observations by GEOID, year, and category deterministically", () => {
      const { observations } = compileBeaCorpusFromArtifacts([
        { artifact: MOCK_ARTIFACT_A },
        { artifact: MOCK_ARTIFACT_SUPPRESSED },
      ]);

      const corpus = new BeaRegionalEconomyCorpus(observations);

      const incomeObs = corpus.getObservation("48000", 2022, "personal_income");
      expect(incomeObs).toBeDefined();
      expect(incomeObs?.value).toBe(1800000000);

      const stateObsList = corpus.getObservationsByLevel("state");
      expect(stateObsList).toHaveLength(2);

      const geoObsList = corpus.getObservationsForGeo("48453");
      expect(geoObsList).toHaveLength(1);
      expect(geoObsList[0]?.value).toBeNull();
    });

    it("provides the canonical BEA economy adapter note for future simulation engines", () => {
      expect(BEA_ECONOMY_ADAPTER_NOTE.adapterInterfaceVersion).toBe("1.0.0");
      expect(BEA_ECONOMY_ADAPTER_NOTE.gameplayModifierPolicy).toContain(
        "strictly prohibits embedding political scores",
      );
      expect(BEA_ECONOMY_ADAPTER_NOTE.valuationSeparationPolicy).toContain(
        "Nominal, real-chained, and index series must remain explicitly typed",
      );
    });
  });

  describe("Disk Artifact Integrity Check", () => {
    it("verifies compiled JSON files on disk match manifest validation rules", () => {
      const compiledPath = path.join(DATA_DIR, "compiled-bea-regional.json");
      const manifestPath = path.join(DATA_DIR, "manifest.json");

      expect(fs.existsSync(compiledPath)).toBe(true);
      expect(fs.existsSync(manifestPath)).toBe(true);

      const observations: BeaRegionalObservation[] = JSON.parse(
        fs.readFileSync(compiledPath, "utf-8"),
      );
      const manifest: BeaCorpusManifest = JSON.parse(
        fs.readFileSync(manifestPath, "utf-8"),
      );

      const result = validateBeaCorpus(observations, manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(observations.length).toBeGreaterThan(0);
    });
  });
});
