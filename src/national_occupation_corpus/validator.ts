import type {
  NationalOccupationCorpusManifest,
  NormalizedOccupationRecord,
  WagePercentiles,
} from "./types.js";
import { validateGeographicScope } from "./geography.js";

export interface ValidationIssue {
  readonly recordId?: string;
  readonly message: string;
  readonly severity: "error" | "warning";
}

export interface CorpusValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly recordCount: number;
}

const SOC_CODE_REGEX = /^\d{2}-\d{4}$/;
const ONET_SOC_CODE_REGEX = /^\d{2}-\d{4}\.\d{2}$/;

export function validateWagePercentileMonotonicity(
  percentiles: WagePercentiles,
  label: "hourly" | "annual",
  recordId: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const entries = [
    { p: "pct10", val: percentiles.pct10 },
    { p: "pct25", val: percentiles.pct25 },
    { p: "pct50", val: percentiles.pct50 },
    { p: "pct75", val: percentiles.pct75 },
    { p: "pct90", val: percentiles.pct90 },
  ].filter((item): item is { p: string; val: number } => item.val !== null);

  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i]!;
    const next = entries[i + 1]!;
    if (current.val > next.val) {
      issues.push({
        recordId,
        severity: "error",
        message: `${label} wage percentile non-monotonic: ${current.p} (${current.val}) > ${next.p} (${next.val})`,
      });
    }
  }

  return issues;
}

export function validateRecord(
  record: NormalizedOccupationRecord,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!SOC_CODE_REGEX.test(record.soc.socCode)) {
    issues.push({
      recordId: record.id,
      severity: "error",
      message: `Invalid SOC code format: '${record.soc.socCode}'. Must match XX-XXXX.`,
    });
  }

  if (
    record.onetCrosswalk &&
    !ONET_SOC_CODE_REGEX.test(record.onetCrosswalk.onetSocCode)
  ) {
    issues.push({
      recordId: record.id,
      severity: "error",
      message: `Invalid O*NET-SOC code format: '${record.onetCrosswalk.onetSocCode}'. Must match XX-XXXX.XX.`,
    });
  }

  try {
    validateGeographicScope(record.geography);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    issues.push({
      recordId: record.id,
      severity: "error",
      message: `Invalid geographic scope: ${errorMsg}`,
    });
  }

  if (
    record.employment.totalEmployment !== null &&
    record.employment.totalEmployment < 0
  ) {
    issues.push({
      recordId: record.id,
      severity: "error",
      message: `Total employment cannot be negative: ${record.employment.totalEmployment}`,
    });
  }

  issues.push(
    ...validateWagePercentileMonotonicity(
      record.wages.percentiles,
      "hourly",
      record.id,
    ),
  );
  issues.push(
    ...validateWagePercentileMonotonicity(
      record.wages.annualPercentiles,
      "annual",
      record.id,
    ),
  );

  if (!record.provenance.datasetName || !record.provenance.vintage) {
    issues.push({
      recordId: record.id,
      severity: "error",
      message: "Record provenance missing required datasetName or vintage.",
    });
  }

  if (record.metadata && record.metadata.attribution.license !== "CC BY 4.0") {
    issues.push({
      recordId: record.id,
      severity: "error",
      message: `O*NET metadata must use CC BY 4.0 license attribution. Found: ${record.metadata.attribution.license}`,
    });
  }

  return issues;
}

export class CorpusValidator {
  public validateCorpus(
    records: readonly NormalizedOccupationRecord[],
    manifest?: NationalOccupationCorpusManifest,
  ): CorpusValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const seenIds = new Set<string>();

    for (const record of records) {
      if (seenIds.has(record.id)) {
        errors.push({
          recordId: record.id,
          severity: "error",
          message: `Duplicate record ID found in corpus: ${record.id}`,
        });
      }
      seenIds.add(record.id);

      const recordIssues = validateRecord(record);
      for (const issue of recordIssues) {
        if (issue.severity === "error") {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }

    if (manifest && manifest.recordCount !== records.length) {
      errors.push({
        severity: "error",
        message: `Manifest record count (${manifest.recordCount}) does not match actual record count (${records.length}).`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recordCount: records.length,
    };
  }
}
