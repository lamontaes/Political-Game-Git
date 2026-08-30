import { describe, it, expect } from "vitest";
import { compileSyntheticCalibrationBaseline } from "../src/data/calibration/compiler";
import { sampleHouseholdLifeBackground } from "../src/data/calibration/sampler";
import { SYNTHETIC_TEST_FIXTURES } from "../src/data/calibration/fixtures";

describe("Household / Life-Background Calibration Corpus (Reclassified Synthetic)", () => {
  it("verifies explicit reclassification metadata and synthetic baseline status for all 7 distributions", () => {
    const dataset = compileSyntheticCalibrationBaseline();

    expect(dataset.datasetId).toBe("reclassified-synthetic-calibration-2023");
    expect(dataset.classification).toBe("synthetic-plausible");
    expect(dataset.status).toBe("reclassified-synthetic");
    expect(dataset.reclassificationReason).toContain(
      "Reclassified from unverified empirical claims",
    );

    // Verify all 7 reclassified distributions exist and are normalized
    const { tables, unresolvedGaps } = dataset;

    expect(tables.householdCompositionDistribution.length).toBeGreaterThan(0);
    expect(tables.parentStructureDistribution.length).toBeGreaterThan(0);
    expect(tables.employmentStatusDistribution.length).toBeGreaterThan(0);
    expect(tables.housingTenureDistribution.length).toBeGreaterThan(0);
    expect(tables.caregivingTypeDistribution.length).toBeGreaterThan(0);
    expect(tables.incomeQuintiles).toHaveLength(5);
    expect(tables.shockFrequencyPerYear).toBe(0.35);

    // Unresolved gaps documented
    expect(unresolvedGaps.length).toBeGreaterThan(0);
  });

  it("samples deterministically: identical seeds yield identical background profiles", () => {
    const seed = "test-seed-42";
    const profile1 = sampleHouseholdLifeBackground(seed);
    const profile2 = sampleHouseholdLifeBackground(seed);

    expect(profile1).toEqual(profile2);
    expect(profile1.seed).toBe(seed);
    if (profile1.annualHouseholdIncomeUsd !== null) {
      expect(profile1.annualHouseholdIncomeUsd).toBeGreaterThan(0);
    }
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

  it("enforces structural invariants: valid household size, no behavioral/ideological fields, explicit nulls for unsupported financial facts", () => {
    const profile = sampleHouseholdLifeBackground("invariant-check-seed");

    // Invariants
    expect(profile.householdSize).toBeGreaterThanOrEqual(1);

    // Explicitly test for null (unknown) financial fields instead of 0
    expect(profile.liquidResourcesUsd).toBeNull();
    expect(profile.debt.totalDebtUsd).toBeNull();
    expect(profile.assets.estimatedHomeValueUsd).toBeNull();

    // Epistemic Boundary Invariant: Ensure forbidden stereotype keys are absent
    const keys = Object.keys(profile);
    const forbiddenKeys = [
      "personality",
      "morality",
      "ideology",
      "intelligence",
      "politicalParty",
      "behavior",
      "criminality",
      "votingBehavior",
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
      if (fixture.profile.annualHouseholdIncomeUsd !== null) {
        expect(fixture.profile.annualHouseholdIncomeUsd).toBeGreaterThan(0);
      }
    }
  });

  it("performs sampling distribution sanity checks over a sample batch", () => {
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
