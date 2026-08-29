import { computeSha256 } from "./sha256";
import type { CommunityBaselineDataset } from "./types";
import { ACS_VARIABLE_MAP } from "./variables";
import { parseGeographyId } from "./geography";

export interface IntegrityError {
  rule: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface DatasetValidationReport {
  valid: boolean;
  datasetId: string;
  recordCount: number;
  geographyCount: number;
  errors: IntegrityError[];
}

export function validateCommunityBaselineDataset(
  dataset: CommunityBaselineDataset,
): DatasetValidationReport {
  const errors: IntegrityError[] = [];

  if (dataset.schemaVersion !== "community-baselines:v1") {
    errors.push({
      rule: "SCHEMA_VERSION",
      message: `Invalid schema version "${dataset.schemaVersion}". Expected "community-baselines:v1".`,
    });
  }

  if (!dataset.vintage || dataset.vintage < 2009 || dataset.vintage > 2026) {
    errors.push({
      rule: "VINTAGE_BOUNDS",
      message: `Invalid ACS vintage "${dataset.vintage}". Expected 2009-2026.`,
    });
  }

  // Validate geographies
  const declaredGeoIds = new Set<string>();
  for (const geo of dataset.geographies) {
    try {
      const parsed = parseGeographyId(geo.id);
      if (parsed.level !== geo.level) {
        errors.push({
          rule: "GEOGRAPHY_LEVEL_MISMATCH",
          message: `Geography "${geo.id}" has level "${geo.level}" in metadata but parsed as "${parsed.level}".`,
        });
      }
      declaredGeoIds.add(geo.id);
    } catch (err: unknown) {
      errors.push({
        rule: "GEOGRAPHY_PARSE_ERROR",
        message: `Failed to parse geography ID "${geo.id}": ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Validate records
  const seenKeys = new Set<string>();
  for (let i = 0; i < dataset.records.length; i++) {
    const r = dataset.records[i];
    if (!r) continue;
    const key = `${r.geographyId}::${r.variableId}`;

    if (seenKeys.has(key)) {
      errors.push({
        rule: "DUPLICATE_RECORD",
        message: `Duplicate record for geography "${r.geographyId}" and variable "${r.variableId}".`,
      });
    }
    seenKeys.add(key);

    if (!declaredGeoIds.has(r.geographyId)) {
      errors.push({
        rule: "UNDECLARED_GEOGRAPHY",
        message: `Record ${i} uses undeclared geography "${r.geographyId}".`,
      });
    }

    if (r.vintage !== dataset.vintage) {
      errors.push({
        rule: "VINTAGE_MISMATCH",
        message: `Record ${i} (${r.variableId}) vintage ${r.vintage} does not match dataset vintage ${dataset.vintage}.`,
      });
    }

    // Estimate & MOE Pairing check
    if (r.estimate === null) {
      if (!r.suppressionReason) {
        errors.push({
          rule: "SUPPRESSION_REASON_REQUIRED",
          message: `Record ${i} (${r.variableId}) has null estimate but missing suppressionReason.`,
        });
      }
    } else {
      if (typeof r.estimate !== "number" || !Number.isFinite(r.estimate)) {
        errors.push({
          rule: "INVALID_ESTIMATE_NUMBER",
          message: `Record ${i} (${r.variableId}) estimate is not a finite number: ${r.estimate}`,
        });
      }
    }

    if (r.marginOfError === null) {
      if (!r.moeAnnotation) {
        errors.push({
          rule: "MOE_ANNOTATION_REQUIRED",
          message: `Record ${i} (${r.variableId}) has null marginOfError but missing moeAnnotation.`,
        });
      }
    } else {
      if (
        typeof r.marginOfError !== "number" ||
        !Number.isFinite(r.marginOfError) ||
        r.marginOfError < 0
      ) {
        errors.push({
          rule: "INVALID_MOE_NUMBER",
          message: `Record ${i} (${r.variableId}) MOE must be a non-negative finite number: ${r.marginOfError}`,
        });
      }
    }

    // Variable Registry match check
    const varDef = ACS_VARIABLE_MAP.get(r.variableId);
    if (varDef) {
      if (r.universeId !== varDef.universeId) {
        errors.push({
          rule: "UNIVERSE_MISMATCH",
          message: `Record ${i} (${r.variableId}) has universe "${r.universeId}" but registry specifies "${varDef.universeId}".`,
        });
      }
    }
  }

  // Verify sha256 checksum if present
  if (dataset.sha256) {
    const clone: Omit<CommunityBaselineDataset, "sha256"> = {
      schemaVersion: dataset.schemaVersion,
      datasetId: dataset.datasetId,
      vintage: dataset.vintage,
      geographies: dataset.geographies,
      records: dataset.records,
      metadata: dataset.metadata,
    };
    const serialized = JSON.stringify(clone, null, 2);
    const expectedHash = computeSha256(serialized);
    if (expectedHash !== dataset.sha256) {
      errors.push({
        rule: "SHA256_MISMATCH",
        message: `Dataset SHA256 mismatch. Recorded: "${dataset.sha256}", Computed: "${expectedHash}".`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    datasetId: dataset.datasetId,
    recordCount: dataset.records.length,
    geographyCount: dataset.geographies.length,
    errors,
  };
}

export function assertCommunityBaselineIntegrity(
  dataset: CommunityBaselineDataset,
): void {
  const report = validateCommunityBaselineDataset(dataset);
  if (!report.valid) {
    const errorDetails = report.errors
      .map((e) => `[${e.rule}] ${e.message}`)
      .join("\n");
    throw new Error(
      `Community Baseline Dataset integrity validation failed for "${dataset.datasetId}":\n${errorDetails}`,
    );
  }
}
