import type {
  CareRecipientType,
  EmploymentStatus,
  HouseholdCompositionCategory,
  HousingTenure,
  IncomeQuintileCalibration,
  ParentGuardianStructure,
  ProbabilityBucket,
  SyntheticCalibrationDataset,
} from "./types";

/**
 * Synthetic Calibration Baselines.
 *
 * RECLASSIFICATION NOTICE:
 * All distributions herein were previously labeled empirical, but because they represent
 * hand-authored plausible approximations rather than directly reproducible extractions from
 * raw Census/SIPP/SCF microdata/table artifacts, they are explicitly reclassified as SYNTHETIC.
 *
 * Rule: NO value may be claimed as empirical without raw artifact SHA-256 byte hashes, row/table derivations,
 * and exact retrieval timestamps.
 */
export const RECLASSIFIED_SYNTHETIC_CALIBRATION_DATASET: SyntheticCalibrationDataset =
  {
    datasetId: "reclassified-synthetic-calibration-2023",
    classification: "synthetic-plausible",
    status: "reclassified-synthetic",
    reclassificationReason:
      "Reclassified from unverified empirical claims per prompt corrective rule (Option B). Represented as plausible synthetic baseline distributions.",
    tables: {
      householdCompositionDistribution: [
        { category: "single_adult", probability: 0.28 },
        { category: "single_parent", probability: 0.08 },
        { category: "couple_no_children", probability: 0.3 },
        { category: "couple_with_children", probability: 0.2 },
        { category: "multigenerational", probability: 0.1 },
        { category: "cohousing_unrelated", probability: 0.04 },
      ] as readonly ProbabilityBucket<HouseholdCompositionCategory>[],

      parentStructureDistribution: [
        { category: "single_parent", probability: 0.23 },
        { category: "dual_parent", probability: 0.7 },
        { category: "relative_guardian", probability: 0.07 },
        { category: "independent_adult", probability: 0.0 },
      ] as readonly ProbabilityBucket<ParentGuardianStructure>[],

      employmentStatusDistribution: [
        { category: "full_time", probability: 0.62 },
        { category: "part_time", probability: 0.14 },
        { category: "unemployed", probability: 0.04 },
        { category: "self_employed_gig", probability: 0.08 },
        { category: "out_of_labor_force", probability: 0.12 },
      ] as readonly ProbabilityBucket<EmploymentStatus>[],

      housingTenureDistribution: [
        { category: "rent", probability: 0.35 },
        { category: "own_with_mortgage", probability: 0.42 },
        { category: "own_outright", probability: 0.2 },
        { category: "informal_shared", probability: 0.03 },
      ] as readonly ProbabilityBucket<HousingTenure>[],

      caregivingTypeDistribution: [
        { category: "none", probability: 0.65 },
        { category: "child", probability: 0.22 },
        { category: "elderly_or_disabled", probability: 0.1 },
        { category: "both", probability: 0.03 },
      ] as readonly ProbabilityBucket<CareRecipientType>[],

      incomeQuintiles: [
        {
          quintile: "q1",
          medianIncomeUsd: 21000,
          medianLiquidSavingsUsd: 1200,
          medianTotalDebtUsd: 8500,
          homeownershipRate: 0.32,
        },
        {
          quintile: "q2",
          medianIncomeUsd: 42000,
          medianLiquidSavingsUsd: 4500,
          medianTotalDebtUsd: 28000,
          homeownershipRate: 0.51,
        },
        {
          quintile: "q3",
          medianIncomeUsd: 70000,
          medianLiquidSavingsUsd: 9800,
          medianTotalDebtUsd: 65000,
          homeownershipRate: 0.68,
        },
        {
          quintile: "q4",
          medianIncomeUsd: 115000,
          medianLiquidSavingsUsd: 26000,
          medianTotalDebtUsd: 135000,
          homeownershipRate: 0.81,
        },
        {
          quintile: "q5",
          medianIncomeUsd: 250000,
          medianLiquidSavingsUsd: 110000,
          medianTotalDebtUsd: 220000,
          homeownershipRate: 0.91,
        },
      ] as readonly IncomeQuintileCalibration[],

      shockFrequencyPerYear: 0.35,
    },
    unresolvedGaps: [
      "SIPP 2022 raw microdata cross-tabulation for joint household composition x caregiving",
      "SCF 2022 microdata exact net worth percentile breakdowns by age cohort",
      "Census CPS 2023 exact state-level informal co-housing tenure frequencies",
    ],
  };
