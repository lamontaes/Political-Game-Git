import type {
  AcsEstimateRecord,
  AcsUniverseId,
  AcsVintage,
  CommunityBaselineDataset,
  DerivedStatistic,
  GeographyId,
  SignificanceTestResult,
  VariableCategory,
} from "./types";
import { ACS_UNIVERSE_DEFINITIONS, ACS_VARIABLE_MAP } from "./variables";

export const CENSUS_Z_90 = 1.645;
export const CENSUS_Z_95 = 1.96;

/**
 * Retrieves a single baseline estimate record by geography and variable ID.
 */
export function getBaselineRecord(
  dataset: CommunityBaselineDataset,
  geographyId: GeographyId,
  variableId: string,
): AcsEstimateRecord | undefined {
  return dataset.records.find(
    (r) => r.geographyId === geographyId && r.variableId === variableId,
  );
}

/**
 * Requires a single baseline estimate record, throwing if not found.
 */
export function requireBaselineRecord(
  dataset: CommunityBaselineDataset,
  geographyId: GeographyId,
  variableId: string,
): AcsEstimateRecord {
  const record = getBaselineRecord(dataset, geographyId, variableId);
  if (!record) {
    throw new Error(
      `Baseline record not found for geography "${geographyId}" and variable "${variableId}" in dataset "${dataset.datasetId}".`,
    );
  }
  return record;
}

/**
 * Returns all records in the dataset for a specific geography ID.
 */
export function getBaselineRecordsForGeography(
  dataset: CommunityBaselineDataset,
  geographyId: GeographyId,
): AcsEstimateRecord[] {
  return dataset.records.filter((r) => r.geographyId === geographyId);
}

/**
 * Returns all records for a specific category within a geography.
 */
export function getBaselineRecordsForCategory(
  dataset: CommunityBaselineDataset,
  geographyId: GeographyId,
  category: VariableCategory,
): AcsEstimateRecord[] {
  return dataset.records.filter((r) => {
    if (r.geographyId !== geographyId) return false;
    const varDef = ACS_VARIABLE_MAP.get(r.variableId);
    return varDef?.category === category;
  });
}

/**
 * Returns all records for a specific universe within a geography.
 */
export function getBaselineRecordsForUniverse(
  dataset: CommunityBaselineDataset,
  geographyId: GeographyId,
  universeId: AcsUniverseId,
): AcsEstimateRecord[] {
  return dataset.records.filter(
    (r) => r.geographyId === geographyId && r.universeId === universeId,
  );
}

/**
 * Checks whether two universe IDs are compatible for arithmetic comparison.
 */
export function isUniverseCompatible(
  universeA: AcsUniverseId | string,
  universeB: AcsUniverseId | string,
): boolean {
  if (universeA === universeB) return true;

  const defA = ACS_UNIVERSE_DEFINITIONS[universeA as AcsUniverseId];
  const defB = ACS_UNIVERSE_DEFINITIONS[universeB as AcsUniverseId];

  if (!defA || !defB) return false;

  // Check parent-child hierarchy compatibility
  let current: AcsUniverseId | null | undefined = defA.parentUniverseId;
  while (current) {
    if (current === universeB) return true;
    current = ACS_UNIVERSE_DEFINITIONS[current]?.parentUniverseId;
  }

  current = defB.parentUniverseId;
  while (current) {
    if (current === universeA) return true;
    current = ACS_UNIVERSE_DEFINITIONS[current]?.parentUniverseId;
  }

  return false;
}

/**
 * Asserts universe compatibility before calculating ratios or comparisons.
 */
export function assertUniverseCompatible(
  variableA: string,
  universeA: AcsUniverseId,
  variableB: string,
  universeB: AcsUniverseId,
): void {
  if (!isUniverseCompatible(universeA, universeB)) {
    throw new Error(
      `Incompatible Census universes for operation between "${variableA}" (universe: ${universeA}) and "${variableB}" (universe: ${universeB}). Silent cross-universe operations are prohibited.`,
    );
  }
}

/**
 * Asserts vintage equality to prevent silent vintage mixing.
 */
export function assertVintageMatch(
  recordA: { vintage: AcsVintage; variableId: string },
  recordB: { vintage: AcsVintage; variableId: string },
): void {
  if (recordA.vintage !== recordB.vintage) {
    throw new Error(
      `Cannot compare variables across differing ACS vintages (${recordA.variableId}: ${recordA.vintage} vs ${recordB.variableId}: ${recordB.vintage}) without explicit longitudinal normalization.`,
    );
  }
}

/**
 * Computes a Census-standard proportion (percentage / share) with exact MOE propagation.
 * Uses the Census ACS proportion formula where numerator X is a subset of denominator Y:
 * MOE_P = sqrt(MOE_X^2 - (P^2 * MOE_Y^2)) / Y
 */
export function computeProportionStatistic(
  dataset: CommunityBaselineDataset,
  geographyId: GeographyId,
  numeratorVarId: string,
  denominatorVarId: string,
  statisticName?: string,
): DerivedStatistic {
  const numRec = requireBaselineRecord(dataset, geographyId, numeratorVarId);
  const denRec = requireBaselineRecord(dataset, geographyId, denominatorVarId);

  assertVintageMatch(numRec, denRec);
  assertUniverseCompatible(
    numeratorVarId,
    numRec.universeId,
    denominatorVarId,
    denRec.universeId,
  );

  if (numRec.estimate === null || denRec.estimate === null) {
    throw new Error(
      `Cannot compute proportion: estimate is suppressed for "${numeratorVarId}" or "${denominatorVarId}" in "${geographyId}".`,
    );
  }

  if (denRec.estimate <= 0) {
    throw new Error(
      `Cannot compute proportion: denominator estimate is <= 0 (${denRec.estimate}) for "${denominatorVarId}" in "${geographyId}".`,
    );
  }

  const p = numRec.estimate / denRec.estimate;
  let pMoe: number | null = null;

  if (numRec.marginOfError !== null && denRec.marginOfError !== null) {
    const numMoeSq = numRec.marginOfError * numRec.marginOfError;
    const denMoeSq = denRec.marginOfError * denRec.marginOfError;
    const radicand = numMoeSq - p * p * denMoeSq;

    if (radicand >= 0) {
      pMoe = Math.sqrt(radicand) / denRec.estimate;
    } else {
      // Census fallback to ratio formula when radicand is negative
      pMoe = Math.sqrt(numMoeSq + p * p * denMoeSq) / denRec.estimate;
    }
  }

  const ci90: [number, number] | null =
    pMoe !== null ? [Math.max(0, p - pMoe), Math.min(1, p + pMoe)] : null;

  const cv = pMoe !== null && p > 0 ? (pMoe / CENSUS_Z_90 / p) * 100 : null;

  return {
    name: statisticName || `${numeratorVarId}_share_of_${denominatorVarId}`,
    estimate: p,
    marginOfError: pMoe !== null ? Math.round(pMoe * 100000) / 100000 : null,
    confidenceInterval90: ci90
      ? [
          Math.round(ci90[0] * 100000) / 100000,
          Math.round(ci90[1] * 100000) / 100000,
        ]
      : null,
    coefficientOfVariation: cv !== null ? Math.round(cv * 100) / 100 : null,
    unit: "ratio",
    universeId: denRec.universeId,
    geographyId,
    vintage: dataset.vintage,
    method: "census_acs_proportion_formula",
    components: [
      {
        variableId: numeratorVarId,
        estimate: numRec.estimate,
        marginOfError: numRec.marginOfError,
      },
      {
        variableId: denominatorVarId,
        estimate: denRec.estimate,
        marginOfError: denRec.marginOfError,
      },
    ],
  };
}

/**
 * Computes difference and statistical significance between two baseline estimates
 * (either across two geographies for the same variable, or two variables within the same geography).
 */
export function testStatisticalSignificance(
  recordA: AcsEstimateRecord,
  recordB: AcsEstimateRecord,
  labelA: string = recordA.variableId,
  labelB: string = recordB.variableId,
): SignificanceTestResult {
  assertVintageMatch(recordA, recordB);
  assertUniverseCompatible(
    recordA.variableId,
    recordA.universeId,
    recordB.variableId,
    recordB.universeId,
  );

  if (recordA.estimate === null || recordB.estimate === null) {
    throw new Error(
      "Cannot test statistical significance on suppressed estimates.",
    );
  }

  if (recordA.marginOfError === null || recordB.marginOfError === null) {
    throw new Error(
      "Cannot test statistical significance when Margin of Error is undefined or controlled.",
    );
  }

  const diff = recordA.estimate - recordB.estimate;
  const diffMoe = Math.sqrt(
    recordA.marginOfError * recordA.marginOfError +
      recordB.marginOfError * recordB.marginOfError,
  );

  const seA = recordA.marginOfError / CENSUS_Z_90;
  const seB = recordB.marginOfError / CENSUS_Z_90;
  const seDiff = Math.sqrt(seA * seA + seB * seB);

  const zScore = seDiff > 0 ? diff / seDiff : 0;
  const absZ = Math.abs(zScore);

  const sig90 = absZ > CENSUS_Z_90;
  const sig95 = absZ > CENSUS_Z_95;

  let pLevel: "<0.05" | "<0.10" | "not_significant" = "not_significant";
  if (sig95) {
    pLevel = "<0.05";
  } else if (sig90) {
    pLevel = "<0.10";
  }

  return {
    statisticA: {
      label: labelA,
      estimate: recordA.estimate,
      marginOfError: recordA.marginOfError,
      geographyId: recordA.geographyId,
      vintage: recordA.vintage,
    },
    statisticB: {
      label: labelB,
      estimate: recordB.estimate,
      marginOfError: recordB.marginOfError,
      geographyId: recordB.geographyId,
      vintage: recordB.vintage,
    },
    difference: diff,
    differenceMoe: Math.round(diffMoe * 100) / 100,
    zScore: Math.round(zScore * 1000) / 1000,
    isStatisticallySignificant90: sig90,
    isStatisticallySignificant95: sig95,
    pLevel,
  };
}

/**
 * Computes the Coefficient of Variation (CV) for an estimate.
 * CV = (SE / Estimate) * 100% where SE = MOE / 1.645 (for ACS 90% confidence MOE).
 */
export function computeCoefficientOfVariation(
  estimate: number | null,
  marginOfError: number | null,
): number | null {
  if (estimate === null || marginOfError === null || estimate === 0) {
    return null;
  }
  const se = marginOfError / CENSUS_Z_90;
  const cv = (se / Math.abs(estimate)) * 100;
  return Math.round(cv * 100) / 100;
}
