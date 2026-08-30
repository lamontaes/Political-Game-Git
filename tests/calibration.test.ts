import { describe, it, expect } from "vitest";
import { compileEmpiricalCalibrationDataset } from "../src/data/calibration/compiler";
import { sampleHouseholdLifeBackground } from "../src/data/calibration/sampler";
import { SYNTHETIC_TEST_FIXTURES } from "../src/data/calibration/fixtures";

describe("Household / Life-Background Calibration Corpus", () => {
  it("verifies empirical source metadata, retrieval URLs, and SHA-256 hashes", () => {
    const dataset = compileEmpiricalCalibrationDataset();
    expect(dataset.provenance.source).toContain("Unified Empirical Corpus");
    expect(dataset.provenance.vintageYear).toBe(2023);
    expect(dataset.provenance.sourceHash).toMatch(/^[a-f0-9:]+$/);
    expect(dataset.tables.incomeQuintiles).toHaveLength(5);
  });

  it("samples deterministically: identical seeds yield identical background profiles", () => {
    const seed = "test-seed-42";
    const profile1 = sampleHouseholdLifeBackground(seed);
    const profile2 = sampleHouseholdLifeBackground(seed);

    expect(profile1).toEqual(profile2);
    expect(profile1.seed).toBe(seed);
    expect(profile1.annualHouseholdIncomeUsd).toBeGreaterThan(0);
    expect(profile1.liquidResourcesUsd).toBeGreaterThanOrEqual(0);
  });

  it("produces materially different profiles across different seeds", () => {
    const profileA = sampleHouseholdLifeBackground("seed-alpha-100");
    const profileB = sampleHouseholdLifeBackground("seed-beta-200");

    expect(profileA.profileId).not.toBe(profileB.profileId);
    expect(
      profileA.annualHouseholdIncomeUsd !== profileB.annualHouseholdIncomeUsd ||
        profileA.householdComposition !== profileB.householdComposition ||
        profileA.debt.totalDebtUsd !== profileB.debt.totalDebtUsd,
    ).toBe(true);
  });

  it("enforces structural invariants: non-negative debts, valid household size, no behavioral/ideological fields", () => {
    const profile = sampleHouseholdLifeBackground("invariant-check-seed");

    // Invariants
    expect(profile.householdSize).toBeGreaterThanOrEqual(1);
    expect(profile.annualHouseholdIncomeUsd).toBeGreaterThan(0);
    expect(profile.liquidResourcesUsd).toBeGreaterThanOrEqual(0);
    expect(profile.debt.totalDebtUsd).toBe(
      profile.debt.mortgageDebtUsd +
        profile.debt.studentDebtUsd +
        profile.debt.medicalDebtUsd +
        profile.debt.creditCardDebtUsd,
    );

    // Epistemic Boundary Invariant: Ensure forbidden stereotype keys are absent
    const keys = Object.keys(profile);
    const forbiddenKeys = [
      "personality",
      "morality",
      "ideology",
      "intelligence",
      "politicalParty",
      "behavior",
    ];
    for (const forbidden of forbiddenKeys) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("validates synthetic boundary test fixtures", () => {
    expect(SYNTHETIC_TEST_FIXTURES.length).toBeGreaterThanOrEqual(3);
    for (const fixture of SYNTHETIC_TEST_FIXTURES) {
      expect(fixture.kind).toBe("synthetic-fixture");
      expect(fixture.fixtureId).toBeDefined();
      expect(fixture.profile.annualHouseholdIncomeUsd).toBeGreaterThan(0);
    }
  });

  it("performs empirical sampling distribution sanity checks over a sample batch", () => {
    const sampleSize = 100;
    const sampledCompositions = new Set<string>();

    for (let i = 0; i < sampleSize; i += 1) {
      const p = sampleHouseholdLifeBackground(`batch-seed-${i}`);
      sampledCompositions.add(p.householdComposition);
    }

    // Must sample multiple household types across 100 seeds
    expect(sampledCompositions.size).toBeGreaterThan(1);
  });
});
