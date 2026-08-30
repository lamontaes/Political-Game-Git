import { describe, it, expect } from "vitest";
import { compileEmpiricalCalibrationDataset } from "./compiler";

describe("Empirical Calibration Compiler", () => {
  it("compiles and normalizes the aggregate empirical datasets correctly", () => {
    const dataset = compileEmpiricalCalibrationDataset();

    expect(dataset.datasetId).toBe("unified-household-calibration-2023");
    expect(dataset.provenance.vintageYear).toBe(2023);
    expect(dataset.provenance.sourceHash).toBeDefined();

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
    expect(dataset.tables.incomeQuintiles[0]!.medianIncomeUsd).toBeLessThan(
      dataset.tables.incomeQuintiles[4]!.medianIncomeUsd,
    );
  });
});
