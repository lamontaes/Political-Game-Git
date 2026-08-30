import { describe, it, expect } from "vitest";
import {
  compileEmpiricalCalibrationDataset,
  compileSyntheticCalibrationBaseline,
} from "./compiler";

describe("Calibration Compiler & Boundary Rules", () => {
  it("compiles and normalizes the reclassified synthetic baseline dataset cleanly", () => {
    const dataset = compileSyntheticCalibrationBaseline();

    expect(dataset.datasetId).toBe("reclassified-synthetic-calibration-2023");
    expect(dataset.classification).toBe("synthetic-plausible");
    expect(dataset.status).toBe("reclassified-synthetic");
    expect(dataset.unresolvedGaps.length).toBeGreaterThan(0);

    // Verify probabilities sum to 1
    const compSum = dataset.tables.householdCompositionDistribution.reduce(
      (acc, b) => acc + b.probability,
      0,
    );
    expect(compSum).toBeCloseTo(1.0, 5);

    const tenureSum = dataset.tables.housingTenureDistribution.reduce(
      (acc, b) => acc + b.probability,
      0,
    );
    expect(tenureSum).toBeCloseTo(1.0, 5);

    expect(dataset.tables.incomeQuintiles).toHaveLength(5);
  });

  it("rejects unverified empirical claims lacking raw artifact byte hashes and row derivations", () => {
    const unverifiedEmpiricalData = {
      datasetId: "fake-empirical",
      provenance: {
        source: "Unverified Census Claim",
        vintageYear: 2023,
        retrievedAt: "2024-01-01T00:00:00Z",
        retrievalUrl: "https://example.gov",
        sourceRawArtifactHash: "short-hash", // Fails minimum length / hash requirement
        tableOrRowIdentifiers: [],
        weightingAndUniverseRules: "",
        derivationFormulaCode: "",
      },
      tables: {
        householdCompositionDistribution: [
          { category: "single_adult" as const, probability: 1.0 },
        ],
        parentStructureDistribution: [
          { category: "single_parent" as const, probability: 1.0 },
        ],
        employmentStatusDistribution: [
          { category: "full_time" as const, probability: 1.0 },
        ],
        housingTenureDistribution: [
          { category: "rent" as const, probability: 1.0 },
        ],
        caregivingTypeDistribution: [
          { category: "none" as const, probability: 1.0 },
        ],
        incomeQuintiles: [],
        shockFrequencyPerYear: 0.1,
      },
    };

    expect(() =>
      compileEmpiricalCalibrationDataset(unverifiedEmpiricalData),
    ).toThrow(/sourceRawArtifactHash/);
  });
});
