/**
 * Local Economy Corpus Validator
 *
 * Enforces strict integrity rules across compiled packages:
 * - FIPS geography correctness
 * - NAICS code taxonomy validity
 * - Units & price basis safety (no mixing nominal and real dollars)
 * - Temporal truthfulness (no synthetic monthly data from annual records)
 * - QCEW confidentiality & suppression survival (suppressed cells must have null value)
 * - Checksum and manifest integrity
 */

import crypto from "node:crypto";
import { validateFips } from "./geography.js";
import { validateNaicsCode } from "./naics.js";
import type { NormalizedEconomyCorpusPackage } from "./types.js";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  observationId?: string;
  geoFips?: string;
}

export interface CorpusValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  totalObservationsChecked: number;
  totalJurisdictionsChecked: number;
}

export function validateCorpusPackage(
  pkg: NormalizedEconomyCorpusPackage,
): CorpusValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const observationIds = new Set<string>();

  // 1. Validate Checksum & Manifest
  const recomputedManifestSha = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        manifestVersion: pkg.manifest.manifestVersion,
        generatedAt: pkg.manifest.generatedAt,
        compilerVersion: pkg.manifest.compilerVersion,
        totalJurisdictions: pkg.manifest.totalJurisdictions,
        totalObservations: pkg.manifest.totalObservations,
        totalSeries: pkg.manifest.totalSeries,
        vintages: pkg.manifest.vintages,
        jurisdictions: pkg.manifest.jurisdictions,
        providers: pkg.manifest.providers,
      }),
    )
    .digest("hex");

  if (pkg.manifest.sha256 !== recomputedManifestSha) {
    errors.push({
      severity: "error",
      code: "MANIFEST_CHECKSUM_MISMATCH",
      message: `Manifest SHA-256 mismatch: recorded '${pkg.manifest.sha256}', computed '${recomputedManifestSha}'`,
    });
  }

  const recomputedPackageChecksum = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        manifest: pkg.manifest,
        observations: pkg.observations,
        series: pkg.series,
      }),
    )
    .digest("hex");

  if (pkg.buildMetadata.checksum !== recomputedPackageChecksum) {
    errors.push({
      severity: "error",
      code: "PACKAGE_CHECKSUM_MISMATCH",
      message: `Package checksum mismatch: recorded '${pkg.buildMetadata.checksum}', computed '${recomputedPackageChecksum}'`,
    });
  }

  // 2. Validate Observations
  for (const obs of pkg.observations) {
    // Unique ID check
    if (observationIds.has(obs.observationId)) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_OBSERVATION_ID",
        message: `Duplicate observationId: '${obs.observationId}'`,
        observationId: obs.observationId,
        geoFips: obs.geoFips,
      });
    }
    observationIds.add(obs.observationId);

    // Geography validation
    const fipsVal = validateFips(obs.geoFips);
    if (!fipsVal.valid) {
      errors.push({
        severity: "error",
        code: "INVALID_GEOGRAPHY_FIPS",
        message: fipsVal.reason || `Invalid FIPS '${obs.geoFips}'`,
        observationId: obs.observationId,
        geoFips: obs.geoFips,
      });
    }

    // NAICS validation
    if (obs.naicsCode) {
      const naicsVal = validateNaicsCode(obs.naicsCode);
      if (!naicsVal.valid) {
        errors.push({
          severity: "error",
          code: "INVALID_NAICS_CODE",
          message: naicsVal.reason || `Invalid NAICS code '${obs.naicsCode}'`,
          observationId: obs.observationId,
          geoFips: obs.geoFips,
        });
      }
    }

    // Unit & Price Basis validation
    if (!obs.unit || !obs.unit.kind) {
      errors.push({
        severity: "error",
        code: "MISSING_VALUE_UNIT",
        message: "Observation is missing value unit metadata",
        observationId: obs.observationId,
      });
    } else if (obs.unit.kind === "currency") {
      if (
        !obs.unit.priceBasis ||
        !["nominal", "real"].includes(obs.unit.priceBasis)
      ) {
        errors.push({
          severity: "error",
          code: "INVALID_PRICE_BASIS",
          message: `Currency unit has invalid priceBasis: '${obs.unit.priceBasis}'`,
          observationId: obs.observationId,
        });
      }
      if (
        obs.unit.priceBasis === "real" &&
        (!obs.unit.referenceYear || obs.unit.referenceYear <= 1900)
      ) {
        errors.push({
          severity: "error",
          code: "MISSING_REAL_REFERENCE_YEAR",
          message: `Real chained dollar unit missing valid referenceYear`,
          observationId: obs.observationId,
        });
      }
    }

    // Suppression Invariants
    if (obs.isSuppressed) {
      if (obs.value !== null) {
        errors.push({
          severity: "error",
          code: "SUPPRESSED_CELL_HAS_NON_NULL_VALUE",
          message: `Observation is marked suppressed but has non-null numeric value (${obs.value})`,
          observationId: obs.observationId,
        });
      }
      if (obs.suppressionStatus === "disclosable") {
        errors.push({
          severity: "error",
          code: "CONTRADICTORY_SUPPRESSION_STATUS",
          message: `Observation is marked isSuppressed=true but suppressionStatus is 'disclosable'`,
          observationId: obs.observationId,
        });
      }
    } else {
      if (obs.value === null) {
        errors.push({
          severity: "error",
          code: "UNSUPPRESSED_CELL_HAS_NULL_VALUE",
          message: `Observation is marked unsuppressed but has null value`,
          observationId: obs.observationId,
        });
      }
      if (obs.suppressionStatus !== "disclosable") {
        errors.push({
          severity: "error",
          code: "CONTRADICTORY_SUPPRESSION_STATUS",
          message: `Observation is marked isSuppressed=false but suppressionStatus is '${obs.suppressionStatus}'`,
          observationId: obs.observationId,
        });
      }
    }

    // Period & Cadence validation
    if (obs.periodStartDate > obs.periodEndDate) {
      errors.push({
        severity: "error",
        code: "INVALID_PERIOD_DATES",
        message: `Period start date (${obs.periodStartDate}) is after end date (${obs.periodEndDate})`,
        observationId: obs.observationId,
      });
    }

    if (
      obs.frequency === "annual" &&
      (obs.month !== null || obs.quarter !== null)
    ) {
      errors.push({
        severity: "error",
        code: "INVALID_ANNUAL_CADENCE",
        message: `Annual observation cannot have non-null month or quarter`,
        observationId: obs.observationId,
      });
    }

    // Invariant: No synthetic monthly data from BEA
    if (
      obs.provenance.provider === "bea_regional" &&
      obs.frequency === "monthly"
    ) {
      errors.push({
        severity: "error",
        code: "FORBIDDEN_SYNTHETIC_MONTHLY_DATA",
        message: `BEA Regional datasets do not contain genuine monthly county data; monthly observations are forbidden`,
        observationId: obs.observationId,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalObservationsChecked: pkg.observations.length,
    totalJurisdictionsChecked: Object.keys(pkg.manifest.jurisdictions).length,
  };
}
