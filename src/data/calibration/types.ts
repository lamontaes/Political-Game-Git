/**
 * Household & Life-Background Calibration Schema Types.
 *
 * This module defines schemas and data contracts for:
 * 1. Authoritative empirical aggregate source metadata and calibration tables.
 * 2. Generated simulation household life-background profiles.
 * 3. Synthetic test fixtures.
 *
 * Strict Privacy & Epistemic Boundaries:
 * - Demographics and economic circumstances must NEVER be used to infer
 *   personality, intelligence, political ideology, morality, or behavior.
 * - Simulated profiles are non-respondent synthetic draws from aggregate marginals/joint distributions.
 */

export interface EmpiricalSourceProvenance {
  readonly source: string;
  readonly vintageYear: number;
  readonly retrievedAt: string;
  readonly retrievalUrl: string;
  readonly sourceHash: string;
  readonly transformationNotes: string;
}

export type HouseholdCompositionCategory =
  | "single_adult"
  | "single_parent"
  | "couple_no_children"
  | "couple_with_children"
  | "multigenerational"
  | "cohousing_unrelated";

export type ParentGuardianStructure =
  "single_parent" | "dual_parent" | "relative_guardian" | "independent_adult";

export type EmploymentStatus =
  | "full_time"
  | "part_time"
  | "unemployed"
  | "self_employed_gig"
  | "out_of_labor_force";

export type HousingTenure =
  "rent" | "own_with_mortgage" | "own_outright" | "informal_shared";

export type CareRecipientType =
  "none" | "child" | "elderly_or_disabled" | "both";

export interface HouseholdAssets {
  readonly homeOwnershipStatus: HousingTenure;
  readonly estimatedHomeValueUsd: number;
  readonly vehicleCount: number;
  readonly retirementSavingsUsd: number;
  readonly otherAssetsUsd: number;
}

export interface HouseholdDebt {
  readonly studentDebtUsd: number;
  readonly medicalDebtUsd: number;
  readonly creditCardDebtUsd: number;
  readonly mortgageDebtUsd: number;
  readonly totalDebtUsd: number;
}

export interface CaregiverObligations {
  readonly recipientType: CareRecipientType;
  readonly averageHoursPerWeek: number;
  readonly financialCareSupportMonthlyUsd: number;
}

export type EconomicShockType =
  | "job_loss_or_income_drop"
  | "medical_emergency_cost"
  | "car_or_housing_repair"
  | "family_care_event";

export interface EconomicShockEvent {
  readonly shockType: EconomicShockType;
  readonly estimatedFinancialImpactUsd: number;
  readonly occurredMonthsAgo: number;
}

export type ParentalEducationLevel =
  | "less_than_high_school"
  | "high_school_diploma"
  | "some_college_or_associates"
  | "bachelors_degree"
  | "graduate_or_professional_degree";

export type WealthQuartile =
  "q1_bottom" | "q2_lower_middle" | "q3_upper_middle" | "q4_top";

export interface IntergenerationalContext {
  readonly parentalEducationLevel: ParentalEducationLevel;
  readonly parentalWealthQuartile: WealthQuartile;
  readonly directFinancialSupportReceivedMonthlyUsd: number;
}

/**
 * Plausible, source-grounded background profile for a household / individual life context.
 * Strict boundary: Contains ONLY structural economic, physical, obligation, and household context.
 * NO personality, ideology, intelligence, morality, or behavioral traits.
 */
export interface HouseholdLifeBackgroundProfile {
  readonly profileId: string;
  readonly seed: string;
  readonly householdComposition: HouseholdCompositionCategory;
  readonly householdSize: number;
  readonly parentGuardianStructure: ParentGuardianStructure;
  readonly employmentStatus: EmploymentStatus;
  readonly annualHouseholdIncomeUsd: number;
  readonly liquidResourcesUsd: number;
  readonly assets: HouseholdAssets;
  readonly debt: HouseholdDebt;
  readonly housingTenure: HousingTenure;
  readonly caregiving: CaregiverObligations;
  readonly recentEconomicShocks: readonly EconomicShockEvent[];
  readonly intergenerational: IntergenerationalContext;
}

/**
 * Empirical aggregate distribution table element.
 */
export interface ProbabilityBucket<T extends string> {
  readonly category: T;
  readonly probability: number;
}

export interface IncomeQuintileCalibration {
  readonly quintile: "q1" | "q2" | "q3" | "q4" | "q5";
  readonly medianIncomeUsd: number;
  readonly medianLiquidSavingsUsd: number;
  readonly medianTotalDebtUsd: number;
  readonly homeownershipRate: number;
}

export interface EmpiricalCalibrationTables {
  readonly householdCompositionDistribution: readonly ProbabilityBucket<HouseholdCompositionCategory>[];
  readonly parentStructureDistribution: readonly ProbabilityBucket<ParentGuardianStructure>[];
  readonly employmentStatusDistribution: readonly ProbabilityBucket<EmploymentStatus>[];
  readonly housingTenureDistribution: readonly ProbabilityBucket<HousingTenure>[];
  readonly caregivingTypeDistribution: readonly ProbabilityBucket<CareRecipientType>[];
  readonly incomeQuintiles: readonly IncomeQuintileCalibration[];
  readonly shockFrequencyPerYear: number;
}

/**
 * Fully documented empirical calibration dataset.
 */
export interface EmpiricalCalibrationDataset {
  readonly datasetId: string;
  readonly provenance: EmpiricalSourceProvenance;
  readonly tables: EmpiricalCalibrationTables;
}

/**
 * Synthetic test fixture marker interface.
 */
export interface SyntheticTestFixture {
  readonly kind: "synthetic-fixture";
  readonly fixtureId: string;
  readonly label: string;
  readonly description: string;
  readonly profile: HouseholdLifeBackgroundProfile;
}
