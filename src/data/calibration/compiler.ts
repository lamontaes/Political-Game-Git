import type {
  EmpiricalCalibrationDataset,
  EmpiricalSourceProvenance,
  ProbabilityBucket,
  SyntheticCalibrationDataset,
} from "./types";
import { RECLASSIFIED_SYNTHETIC_CALIBRATION_DATASET } from "./synthetic-baselines";

export function validateEmpiricalProvenance(
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
  if (
    !provenance.sourceRawArtifactHash ||
    typeof provenance.sourceRawArtifactHash !== "string" ||
    provenance.sourceRawArtifactHash.length < 64
  ) {
    throw new Error(
      `[${label}] Missing or invalid sourceRawArtifactHash field. Empirical data requires full 64-character SHA-256 digest of raw source bytes.`,
    );
  }
  if (
    !Array.isArray(provenance.tableOrRowIdentifiers) ||
    provenance.tableOrRowIdentifiers.length === 0
  ) {
    throw new Error(
      `[${label}] Missing or invalid tableOrRowIdentifiers. Empirical data requires explicit table/row identifiers.`,
    );
  }
  if (
    !provenance.weightingAndUniverseRules ||
    typeof provenance.weightingAndUniverseRules !== "string"
  ) {
    throw new Error(
      `[${label}] Missing or invalid weightingAndUniverseRules. Empirical microdata requires explicit universe filter rules.`,
    );
  }
  if (
    !provenance.derivationFormulaCode ||
    typeof provenance.derivationFormulaCode !== "string"
  ) {
    throw new Error(
      `[${label}] Missing or invalid derivationFormulaCode. Empirical microdata requires documented derivation formula.`,
    );
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
 * Validates and normalizes empirical calibration datasets.
 * Throws explicit error if raw artifact bytes and row derivations are missing.
 */
export function compileEmpiricalCalibrationDataset(
  dataset: EmpiricalCalibrationDataset,
): EmpiricalCalibrationDataset {
  validateEmpiricalProvenance(dataset.provenance, dataset.datasetId);

  return {
    ...dataset,
    tables: {
      ...dataset.tables,
      householdCompositionDistribution: normalizeDistribution(
        dataset.tables.householdCompositionDistribution,
        "Household Composition",
      ),
      parentStructureDistribution: normalizeDistribution(
        dataset.tables.parentStructureDistribution,
        "Parent Structure",
      ),
      employmentStatusDistribution: normalizeDistribution(
        dataset.tables.employmentStatusDistribution,
        "Employment Status",
      ),
      housingTenureDistribution: normalizeDistribution(
        dataset.tables.housingTenureDistribution,
        "Housing Tenure",
      ),
      caregivingTypeDistribution: normalizeDistribution(
        dataset.tables.caregivingTypeDistribution,
        "Caregiving Type",
      ),
    },
  };
}

/**
 * Compiles and returns the validated reclassified synthetic calibration baseline dataset.
 */
export function compileSyntheticCalibrationBaseline(): SyntheticCalibrationDataset {
  const dataset = RECLASSIFIED_SYNTHETIC_CALIBRATION_DATASET;

  if (dataset.status !== "reclassified-synthetic") {
    throw new Error(
      "Synthetic calibration baseline must be explicitly marked reclassified-synthetic.",
    );
  }

  return {
    ...dataset,
    tables: {
      ...dataset.tables,
      householdCompositionDistribution: normalizeDistribution(
        dataset.tables.householdCompositionDistribution,
        "Household Composition",
      ),
      parentStructureDistribution: normalizeDistribution(
        dataset.tables.parentStructureDistribution,
        "Parent Structure",
      ),
      employmentStatusDistribution: normalizeDistribution(
        dataset.tables.employmentStatusDistribution,
        "Employment Status",
      ),
      housingTenureDistribution: normalizeDistribution(
        dataset.tables.housingTenureDistribution,
        "Housing Tenure",
      ),
      caregivingTypeDistribution: normalizeDistribution(
        dataset.tables.caregivingTypeDistribution,
        "Caregiving Type",
      ),
    },
  };
}
