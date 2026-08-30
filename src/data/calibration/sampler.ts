import { SeededRng } from "../../simulation/rng";
import { compileEmpiricalCalibrationDataset } from "./compiler";
import type {
  CaregiverObligations,
  EconomicShockEvent,
  EconomicShockType,
  EmploymentStatus,
  HouseholdAssets,
  HouseholdCompositionCategory,
  HouseholdDebt,
  HouseholdLifeBackgroundProfile,
  HousingTenure,
  IncomeQuintileCalibration,
  IntergenerationalContext,
  ParentGuardianStructure,
  ParentalEducationLevel,
  ProbabilityBucket,
  WealthQuartile,
} from "./types";

function pickWeightedCategory<T extends string>(
  rng: SeededRng,
  buckets: readonly ProbabilityBucket<T>[],
): T {
  const roll = rng.next();
  let cumulative = 0;
  for (const bucket of buckets) {
    cumulative += bucket.probability;
    if (roll < cumulative) {
      return bucket.category;
    }
  }
  return buckets[buckets.length - 1]!.category;
}

function deriveHouseholdSize(
  rng: SeededRng,
  composition: HouseholdCompositionCategory,
): number {
  switch (composition) {
    case "single_adult":
      return 1;
    case "single_parent":
      return rng.integer(2, 5); // 1 parent + 1-3 children
    case "couple_no_children":
      return 2;
    case "couple_with_children":
      return rng.integer(3, 7); // 2 parents + 1-4 children
    case "multigenerational":
      return rng.integer(3, 8); // grandparents + adults + children
    case "cohousing_unrelated":
      return rng.integer(2, 5);
  }
}

function deriveParentStructure(
  rng: SeededRng,
  composition: HouseholdCompositionCategory,
  datasetParentDistribution: readonly ProbabilityBucket<ParentGuardianStructure>[],
): ParentGuardianStructure {
  if (composition === "single_adult" || composition === "cohousing_unrelated") {
    return "independent_adult";
  }
  if (composition === "single_parent") {
    return rng.next() < 0.85 ? "single_parent" : "relative_guardian";
  }
  if (composition === "couple_with_children") {
    return "dual_parent";
  }
  return pickWeightedCategory(rng, datasetParentDistribution);
}

/**
 * Deterministically samples a plausible household life-background profile from empirical aggregate distributions.
 *
 * Safety & Privacy Guarantee:
 * - Returns ONLY structural economic, asset, obligation, and household facts.
 * - Does NOT infer personality, morality, intelligence, ideology, or behavioral attributes.
 * - Fully non-respondent synthetic draw.
 */
export function sampleHouseholdLifeBackground(
  seed: string,
): HouseholdLifeBackgroundProfile {
  const dataset = compileEmpiricalCalibrationDataset();
  const rng = new SeededRng(`calibration:household:${seed}`);

  const composition = pickWeightedCategory(
    rng,
    dataset.tables.householdCompositionDistribution,
  );
  const size = deriveHouseholdSize(rng, composition);
  const parentStructure = deriveParentStructure(
    rng,
    composition,
    dataset.tables.parentStructureDistribution,
  );
  const employmentStatus: EmploymentStatus = pickWeightedCategory(
    rng,
    dataset.tables.employmentStatusDistribution,
  );

  // Sample Income Quintile
  const quintileIndex = rng.integer(
    0,
    dataset.tables.incomeQuintiles.length,
  );
  const quintileData: IncomeQuintileCalibration =
    dataset.tables.incomeQuintiles[quintileIndex]!;

  // Perturb income around quintile median (+/- 25%)
  const incomeNoise = 0.75 + rng.next() * 0.5;
  const annualHouseholdIncomeUsd = Math.round(
    quintileData.medianIncomeUsd * incomeNoise,
  );

  // Liquid savings perturbation
  const liquidNoise = 0.5 + rng.next() * 1.0;
  const liquidResourcesUsd = Math.round(
    quintileData.medianLiquidSavingsUsd * liquidNoise,
  );

  // Housing Tenure
  const rawTenure = pickWeightedCategory(
    rng,
    dataset.tables.housingTenureDistribution,
  );
  // Adjust tenure by quintile homeownership rate
  let housingTenure: HousingTenure = rawTenure;
  if (rng.next() < quintileData.homeownershipRate) {
    housingTenure = rng.next() < 0.7 ? "own_with_mortgage" : "own_outright";
  } else if (
    rawTenure === "own_with_mortgage" ||
    rawTenure === "own_outright"
  ) {
    housingTenure = "rent";
  }

  const estimatedHomeValueUsd =
    housingTenure === "own_with_mortgage" || housingTenure === "own_outright"
      ? Math.round(annualHouseholdIncomeUsd * (2.5 + rng.next() * 2.0))
      : 0;

  const vehicleCount =
    quintileIndex === 0
      ? rng.next() < 0.5
        ? 0
        : 1
      : rng.integer(1, Math.min(4, size + 1));

  const retirementSavingsUsd = Math.round(
    Math.max(
      0,
      annualHouseholdIncomeUsd * (quintileIndex * 0.4) * (0.5 + rng.next()),
    ),
  );

  const assets: HouseholdAssets = {
    homeOwnershipStatus: housingTenure,
    estimatedHomeValueUsd,
    vehicleCount,
    retirementSavingsUsd,
    otherAssetsUsd: Math.round(liquidResourcesUsd * 0.2),
  };

  // Debt structure
  const mortgageDebtUsd =
    housingTenure === "own_with_mortgage"
      ? Math.round(estimatedHomeValueUsd * (0.6 + rng.next() * 0.3))
      : 0;

  const studentDebtUsd =
    rng.next() < 0.35 ? Math.round(5000 + rng.next() * 45000) : 0;
  const medicalDebtUsd =
    rng.next() < 0.2 ? Math.round(1000 + rng.next() * 15000) : 0;
  const creditCardDebtUsd =
    rng.next() < 0.5 ? Math.round(500 + rng.next() * 12000) : 0;

  const debt: HouseholdDebt = {
    studentDebtUsd,
    medicalDebtUsd,
    creditCardDebtUsd,
    mortgageDebtUsd,
    totalDebtUsd:
      mortgageDebtUsd + studentDebtUsd + medicalDebtUsd + creditCardDebtUsd,
  };

  // Caregiving Obligations
  const recipientType = pickWeightedCategory(
    rng,
    dataset.tables.caregivingTypeDistribution,
  );
  const careHours =
    recipientType === "none"
      ? 0
      : recipientType === "both"
        ? rng.integer(20, 50)
        : rng.integer(5, 30);
  const financialCareSupport =
    recipientType !== "none" && rng.next() < 0.4
      ? Math.round(100 + rng.next() * 600)
      : 0;

  const caregiving: CaregiverObligations = {
    recipientType,
    averageHoursPerWeek: careHours,
    financialCareSupportMonthlyUsd: financialCareSupport,
  };

  // Economic Shocks
  const shockEvents: EconomicShockEvent[] = [];
  if (rng.next() < dataset.tables.shockFrequencyPerYear) {
    const shockType: EconomicShockType = rng.pick([
      "job_loss_or_income_drop",
      "medical_emergency_cost",
      "car_or_housing_repair",
      "family_care_event",
    ]);
    shockEvents.push({
      shockType,
      estimatedFinancialImpactUsd: Math.round(1000 + rng.next() * 8000),
      occurredMonthsAgo: rng.integer(1, 12),
    });
  }

  // Intergenerational Context
  const parentalEducationLevel: ParentalEducationLevel = rng.pick([
    "less_than_high_school",
    "high_school_diploma",
    "some_college_or_associates",
    "bachelors_degree",
    "graduate_or_professional_degree",
  ]);
  const parentalWealthQuartile: WealthQuartile = rng.pick([
    "q1_bottom",
    "q2_lower_middle",
    "q3_upper_middle",
    "q4_top",
  ]);
  const intergenerationalSupport =
    parentalWealthQuartile === "q4_top" && rng.next() < 0.5
      ? Math.round(200 + rng.next() * 1500)
      : 0;

  const intergenerational: IntergenerationalContext = {
    parentalEducationLevel,
    parentalWealthQuartile,
    directFinancialSupportReceivedMonthlyUsd: intergenerationalSupport,
  };

  return {
    profileId: `bg-profile-${seed}`,
    seed,
    householdComposition: composition,
    householdSize: size,
    parentGuardianStructure: parentStructure,
    employmentStatus,
    annualHouseholdIncomeUsd,
    liquidResourcesUsd,
    assets,
    debt,
    housingTenure,
    caregiving,
    recentEconomicShocks: shockEvents,
    intergenerational,
  };
}
