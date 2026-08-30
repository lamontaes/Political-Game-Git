import type {
  EmpiricalCalibrationDataset,
  EmpiricalSourceProvenance,
  HouseholdCompositionCategory,
  ParentGuardianStructure,
  EmploymentStatus,
  HousingTenure,
  CareRecipientType,
  IncomeQuintileCalibration,
  ProbabilityBucket,
} from "./types";

import sipp2022Raw from "../../../data/snapshots/calibration/sipp-2022-household-composition.json";
import scf2022Raw from "../../../data/snapshots/calibration/scf-2022-wealth-debt.json";
import census2023Raw from "../../../data/snapshots/calibration/census-2023-housing-caregiving.json";

function validateProvenance(
  provenance: EmpiricalSourceProvenance,
  label: string,
): void {
  if (!provenance.source || typeof provenance.source !== "string") {
    throw new Error(`[${label}] Missing or invalid source field.`);
  }
  if (!provenance.vintageYear || typeof provenance.vintageYear !== "number") {
    throw new Error(`[${label}] Missing or invalid vintageYear field.`);
  }
  if (!provenance.retrievedAt || typeof provenance.retrievedAt !== "string") {
    throw new Error(`[${label}] Missing or invalid retrievedAt field.`);
  }
  if (!provenance.retrievalUrl || typeof provenance.retrievalUrl !== "string") {
    throw new Error(`[${label}] Missing or invalid retrievalUrl field.`);
  }
  if (!provenance.sourceHash || typeof provenance.sourceHash !== "string") {
    throw new Error(`[${label}] Missing or invalid sourceHash field.`);
  }
  if (
    !provenance.transformationNotes ||
    typeof provenance.transformationNotes !== "string"
  ) {
    throw new Error(`[${label}] Missing or invalid transformationNotes field.`);
  }
}

function normalizeDistribution<T extends string>(
  buckets: readonly ProbabilityBucket<T>[],
  label: string,
): readonly ProbabilityBucket<T>[] {
  const totalProbability = buckets.reduce((sum, b) => sum + b.probability, 0);
  if (totalProbability <= 0) {
    throw new Error(`[${label}] Total probability sum must be positive.`);
  }
  return buckets.map((b) => ({
    category: b.category,
    probability: b.probability / totalProbability,
  }));
}

/**
 * Validates raw empirical snapshots and compiles them into a unified, normalized calibration dataset.
 */
export function compileEmpiricalCalibrationDataset(): EmpiricalCalibrationDataset {
  const sippProv = sipp2022Raw.provenance as EmpiricalSourceProvenance;
  const scfProv = scf2022Raw.provenance as EmpiricalSourceProvenance;
  const censusProv = census2023Raw.provenance as EmpiricalSourceProvenance;

  validateProvenance(sippProv, "SIPP 2022");
  validateProvenance(scfProv, "SCF 2022");
  validateProvenance(censusProv, "Census 2023");

  const compositionDistribution = normalizeDistribution(
    sipp2022Raw.tables
      .compositionDistribution as ProbabilityBucket<HouseholdCompositionCategory>[],
    "Household Composition",
  );
  const parentStructureDistribution = normalizeDistribution(
    sipp2022Raw.tables
      .parentStructureDistribution as ProbabilityBucket<ParentGuardianStructure>[],
    "Parent Structure",
  );
  const employmentStatusDistribution = normalizeDistribution(
    sipp2022Raw.tables
      .employmentStatusDistribution as ProbabilityBucket<EmploymentStatus>[],
    "Employment Status",
  );

  const housingTenureDistribution = normalizeDistribution(
    census2023Raw.tables
      .housingTenureDistribution as ProbabilityBucket<HousingTenure>[],
    "Housing Tenure",
  );
  const caregivingTypeDistribution = normalizeDistribution(
    census2023Raw.tables
      .caregivingTypeDistribution as ProbabilityBucket<CareRecipientType>[],
    "Caregiving Type",
  );

  const incomeQuintiles = scf2022Raw.tables
    .incomeQuintiles as IncomeQuintileCalibration[];
  if (!Array.isArray(incomeQuintiles) || incomeQuintiles.length !== 5) {
    throw new Error(
      "Income quintiles must contain exactly 5 quintile calibrations.",
    );
  }

  const combinedProvenance: EmpiricalSourceProvenance = {
    source: `Unified Empirical Corpus (${sippProv.source} | ${scfProv.source} | ${censusProv.source})`,
    vintageYear: 2023,
    retrievedAt: sippProv.retrievedAt,
    retrievalUrl: "data/snapshots/calibration/",
    sourceHash: `${sippProv.sourceHash.slice(0, 8)}:${scfProv.sourceHash.slice(0, 8)}:${censusProv.sourceHash.slice(0, 8)}`,
    transformationNotes:
      "Compiled and normalized joint empirical calibration tables from SIPP 2022, SCF 2022, and Census CPS/ACS 2023.",
  };

  return {
    datasetId: "unified-household-calibration-2023",
    provenance: combinedProvenance,
    tables: {
      householdCompositionDistribution: compositionDistribution,
      parentStructureDistribution: parentStructureDistribution,
      employmentStatusDistribution: employmentStatusDistribution,
      housingTenureDistribution: housingTenureDistribution,
      caregivingTypeDistribution: caregivingTypeDistribution,
      incomeQuintiles,
      shockFrequencyPerYear: census2023Raw.tables.shockFrequencyPerYear,
    },
  };
}
