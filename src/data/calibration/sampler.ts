import { SeededRng } from "../../simulation/rng";
import { compileSyntheticCalibrationBaseline } from "./compiler";
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
 * DEPRECATED SYNTHETIC FALLBACK SAMPLER
 * Deterministically samples a plausible household life-background profile from synthetic calibration baseline distributions.
 *
 * Capability Gated: This may ONLY be used as a synthetic test fixture fallback.
 * It must not be presented as a production-authorized empirical derivation.
 * Specifically, it does NOT fabricate precise liquid cash, debt, assets, home values, or exact biographical facts.
 * Financial values remain null (as an explicit unresolved placeholder) until a proper SIPP/Wealth compiler is integrated.
 */
export function sampleHouseholdLifeBackground(
  seed: string,
): HouseholdLifeBackgroundProfile {
  const dataset = compileSyntheticCalibrationBaseline();
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
  const quintileIndex = rng.integer(0, dataset.tables.incomeQuintiles.length);
  const quintileData: IncomeQuintileCalibration =
    dataset.tables.incomeQuintiles[quintileIndex]!;

  // Perturb income around quintile median (+/- 25%)
  const incomeNoise = 0.75 + rng.next() * 0.5;
  const annualHouseholdIncomeUsd = Math.round(
    quintileData.medianIncomeUsd * incomeNoise,
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

  // STOP FABRICATING: Liquid cash, precise debt, home value, and precise assets.
  // We leave these explicitly null to indicate unresolved status, preventing hallucination of wealth facts.
  // UNKNOWN is not literal zero.
  const liquidResourcesUsd = null;

  const estimatedHomeValueUsd = null;
  const vehicleCount = null;
  const retirementSavingsUsd = null;

  const assets: HouseholdAssets = {
    homeOwnershipStatus: housingTenure,
    estimatedHomeValueUsd,
    vehicleCount,
    retirementSavingsUsd,
    otherAssetsUsd: null,
  };

  const studentDebtUsd = null;
  const medicalDebtUsd = null;
  const creditCardDebtUsd = null;
  const mortgageDebtUsd = null;

  const debt: HouseholdDebt = {
    studentDebtUsd,
    medicalDebtUsd,
    creditCardDebtUsd,
    mortgageDebtUsd,
    totalDebtUsd: null,
  };

  // Caregiving Obligations (Synthetic plausible ranges allowed for test fixtures, but nullified for precise financials)
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
  const financialCareSupport = null; // Stop fabricating precise care cash support

  const caregiving: CaregiverObligations = {
    recipientType,
    averageHoursPerWeek: careHours,
    financialCareSupportMonthlyUsd: financialCareSupport,
  };

  // Economic Shocks (Keep frequency/type for test logic, null financial impact)
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
      estimatedFinancialImpactUsd: null, // Unresolved precise financial impact
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
  const intergenerationalSupport = null; // Unresolved precise financial support

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
