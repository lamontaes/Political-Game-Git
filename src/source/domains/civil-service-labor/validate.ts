import type {
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  civilServiceLaborSource,
  ACTIVE_EDICT_SOURCES,
  FEDERAL_SECTION_ARTIFACTS,
} from "./acquisition";
import { JURISDICTIONS } from "./profiles";
import { recordEvidence } from "./types";
import type { CivilServiceLaborRecord } from "./types";

export const FORBIDDEN_FIELDS = [
  "grievanceSteps",
  "grievanceDeadline",
  "arbitratorSelection",
  "hearingScript",
  "remedyCalculator",
  "score",
  "rank",
] as const;

function sourcedValues(
  record: CivilServiceLaborRecord,
): readonly Sourced<unknown>[] {
  return [
    record.civilService.classificationDistinction,
    record.civilService.appointmentProtection,
    record.civilService.removalProtection,
    record.civilService.appealBody,
    record.civilService.localCivilServiceMandate,
    record.laborBargaining.bargainingCoverage,
    record.laborBargaining.bargainingScope,
    record.laborBargaining.managementRights,
    record.laborBargaining.impasseRule,
    record.laborBargaining.strikeRestriction,
  ];
}

export function validateCivilServiceLaborCorpus(
  compiled: CompiledCorpus<CivilServiceLaborRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const expected = new Set(JURISDICTIONS.map(({ key }) => key));
  const seen = new Set<string>();
  const sourceJurisdictions = new Map(
    ACTIVE_EDICT_SOURCES.map((source) => [
      source.artifactId,
      source.jurisdictionKey,
    ]),
  );
  for (const artifactId of Object.values(FEDERAL_SECTION_ARTIFACTS)) {
    sourceJurisdictions.set(artifactId, "US-FEDERAL");
  }

  for (const record of compiled.records) {
    if (
      !expected.has(record.jurisdictionKey) ||
      seen.has(record.jurisdictionKey)
    ) {
      findings.push({
        severity: "error",
        code: "civil-service-labor/jurisdiction-envelope",
        message: `${record.jurisdictionKey} is missing, duplicated, or outside the federal-plus-fifty-state universe.`,
        recordId: record.recordId,
      });
    }
    seen.add(record.jurisdictionKey);
    if (
      record.civilService.jurisdictionKey !== record.jurisdictionKey ||
      record.laborBargaining.jurisdictionKey !== record.jurisdictionKey
    ) {
      findings.push({
        severity: "error",
        code: "civil-service-labor/profile-identity-mismatch",
        message: `${record.recordId} has a nested profile assigned to another jurisdiction.`,
        recordId: record.recordId,
      });
    }
    for (const value of sourcedValues(record)) {
      if (value.state === "UNKNOWN" && "value" in value) {
        findings.push({
          severity: "error",
          code: "civil-service-labor/unknown-has-value",
          message: `${record.recordId} gives an UNKNOWN field a value.`,
          recordId: record.recordId,
        });
      }
    }
    for (const evidence of recordEvidence(record)) {
      const source = civilServiceLaborSource(evidence.artifactId);
      if (!source) {
        findings.push({
          severity: "error",
          code: "civil-service-labor/undeclared-evidence",
          message: `${record.recordId} cites undeclared artifact ${evidence.artifactId}.`,
          recordId: record.recordId,
        });
      } else if (
        sourceJurisdictions.get(evidence.artifactId) !== record.jurisdictionKey
      ) {
        findings.push({
          severity: "error",
          code: "civil-service-labor/cross-jurisdiction-evidence",
          message: `${record.recordId} cites ${evidence.artifactId}, which belongs to another jurisdiction.`,
          recordId: record.recordId,
        });
      }
    }
    const serialized = JSON.stringify(record);
    for (const field of FORBIDDEN_FIELDS) {
      if (serialized.includes(`"${field}"`)) {
        findings.push({
          severity: "error",
          code: "civil-service-labor/forbidden-simulator-field",
          message: `${record.recordId} carries forbidden field ${field}.`,
          recordId: record.recordId,
        });
      }
    }
  }
  if (seen.size !== expected.size) {
    findings.push({
      severity: "error",
      code: "civil-service-labor/incomplete-universe",
      message: `Expected ${expected.size} jurisdiction records; found ${seen.size}.`,
    });
  }
  return {
    domain: "civil-service-labor",
    checked: compiled.records.length,
    findings,
  };
}
