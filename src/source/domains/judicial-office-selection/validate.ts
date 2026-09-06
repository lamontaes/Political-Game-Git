/** Domain-specific integrity and audit-oracle checks for the 92L corpus. */

import type {
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { ATOMIC_SELECTION_MECHANISMS } from "./types";
import type {
  AtomicSelectionPath,
  JudicialOfficeSelectionRecord,
} from "./types";

export const EXPECTED_JUDICIAL_JURISDICTIONS = 51;
export const EXPECTED_JUDICIAL_SLOTS = 156;
export const EXPECTED_ACTIVE_JUDICIAL_OFFICES = 148;

export const NO_INTERMEDIATE_APPELLATE = [
  "us-de",
  "us-me",
  "us-mt",
  "us-nh",
  "us-ri",
  "us-sd",
  "us-vt",
  "us-wy",
] as const;

const NO_VALUE_STATES = new Set([
  "CONFLICTING",
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
  "SUPPRESSED",
  "UNKNOWN",
]);

function add(
  findings: ValidationFinding[],
  code: string,
  message: string,
  recordId?: string,
): void {
  findings.push({ severity: "error", code, message, recordId });
}

function present<T>(value: Sourced<T>): T | null {
  return value.state === "KNOWN" ? value.value : null;
}

function validatePaths(
  record: JudicialOfficeSelectionRecord,
  paths: readonly AtomicSelectionPath[],
  label: string,
  findings: ValidationFinding[],
): void {
  const pathIds = new Set<string>();
  for (const selectionPath of paths) {
    if (!selectionPath.pathId.trim() || pathIds.has(selectionPath.pathId)) {
      add(
        findings,
        "judicial/invalid-path-id",
        `${record.recordId} ${label} has an empty or duplicate path id.`,
        record.recordId,
      );
    }
    pathIds.add(selectionPath.pathId);
    for (const [index, stage] of selectionPath.stages.entries()) {
      if (stage.order !== index + 1) {
        add(
          findings,
          "judicial/noncontiguous-stage-order",
          `${record.recordId} ${label}/${selectionPath.pathId} stage ${stage.order} is not in contiguous one-based order.`,
          record.recordId,
        );
      }
      if (!ATOMIC_SELECTION_MECHANISMS.includes(stage.mechanism)) {
        add(
          findings,
          "judicial/unknown-atomic-mechanism",
          `${record.recordId} uses unknown mechanism ${stage.mechanism}.`,
          record.recordId,
        );
      }
    }
  }
}

function walkSourceStates(
  value: unknown,
  recordId: string,
  findings: ValidationFinding[],
  path = "record",
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkSourceStates(item, recordId, findings, `${path}[${index}]`),
    );
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const object = value as Record<string, unknown>;
  if (typeof object.state === "string" && NO_VALUE_STATES.has(object.state)) {
    if (Object.prototype.hasOwnProperty.call(object, "value")) {
      add(
        findings,
        "judicial/absent-state-carries-value",
        `${recordId} ${path} is ${object.state} but still has a value key.`,
        recordId,
      );
    }
  }
  for (const [key, child] of Object.entries(object)) {
    walkSourceStates(child, recordId, findings, `${path}.${key}`);
  }
}

function keySweep(
  value: unknown,
  recordId: string,
  findings: ValidationFinding[],
): void {
  if (Array.isArray(value)) {
    value.forEach((child) => keySweep(child, recordId, findings));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      /ideolog|predicted.?ruling|quality.?score|suitability.?score|liberal.?score|conservative.?score/i.test(
        key,
      )
    ) {
      add(
        findings,
        "judicial/forbidden-concept-field",
        `${recordId} contains forbidden field ${key}.`,
        recordId,
      );
    }
    keySweep(child, recordId, findings);
  }
}

export function validateJudicialOfficeSelectionCorpus(
  compiled: CompiledCorpus<JudicialOfficeSelectionRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const jurisdictions = new Set(records.map((record) => record.jurisdictionId));
  const active = records.filter(
    (record) => present(record.officeExists) === true,
  );
  const inactive = records.filter(
    (record) => present(record.officeExists) === false,
  );

  if (records.length !== EXPECTED_JUDICIAL_SLOTS) {
    add(
      findings,
      "judicial/unexpected-slot-count",
      `Expected ${EXPECTED_JUDICIAL_SLOTS} researched office-family slots; found ${records.length}.`,
    );
  }
  if (active.length !== EXPECTED_ACTIVE_JUDICIAL_OFFICES) {
    add(
      findings,
      "judicial/unexpected-active-count",
      `Expected ${EXPECTED_ACTIVE_JUDICIAL_OFFICES} active office families; found ${active.length}.`,
    );
  }
  if (jurisdictions.size !== EXPECTED_JUDICIAL_JURISDICTIONS) {
    add(
      findings,
      "judicial/unexpected-jurisdiction-count",
      `Expected ${EXPECTED_JUDICIAL_JURISDICTIONS} jurisdictions; found ${jurisdictions.size}.`,
    );
  }
  if (inactive.length !== NO_INTERMEDIATE_APPELLATE.length) {
    add(
      findings,
      "judicial/unexpected-inactive-count",
      `Expected ${NO_INTERMEDIATE_APPELLATE.length} explicit non-applicable slots; found ${inactive.length}.`,
    );
  }

  const expectedInactiveIds = new Set(
    NO_INTERMEDIATE_APPELLATE.map(
      (jurisdictionId) => `${jurisdictionId}:intermediate_appellate`,
    ),
  );
  const seen = new Set<string>();

  for (const record of records) {
    if (seen.has(record.recordId)) {
      add(
        findings,
        "judicial/duplicate-record",
        `Duplicate record id ${record.recordId}.`,
        record.recordId,
      );
    }
    seen.add(record.recordId);
    if (record.recordId !== `${record.jurisdictionId}:${record.officeFamily}`) {
      add(
        findings,
        "judicial/unstable-record-id",
        `${record.recordId} does not match its jurisdiction and office family.`,
        record.recordId,
      );
    }
    if (
      record.evidence.artifactId !==
        "92l-national-judicial-selection-tenure-completion" ||
      record.evidence.providerNativeId !== "1zHRVfLrHcQuZnmSwpSKIavwuUEH_vIhs"
    ) {
      add(
        findings,
        "judicial/unbound-research-evidence",
        `${record.recordId} is not bound to the locked 92L Drive packet.`,
        record.recordId,
      );
    }
    if (
      record.researchProvenance.primaryAuthorityStatus !==
      "CITATIONS_REPORTED_NOT_RETRIEVED"
    ) {
      add(
        findings,
        "judicial/claims-primary-retrieval",
        `${record.recordId} must not promote reported citations into retrieved first-party artifacts.`,
        record.recordId,
      );
    }
    if (
      !record.reportedAuthority.constitutionalAuthority.trim() &&
      !record.reportedAuthority.statutoryAuthority.trim()
    ) {
      add(
        findings,
        "judicial/no-reported-authority",
        `${record.recordId} reports no constitutional or statutory authority.`,
        record.recordId,
      );
    }
    if (
      record.reportedAuthority.researchRetrievalDate !== compiled.corpus.asOf
    ) {
      add(
        findings,
        "judicial/retrieval-date-drift",
        `${record.recordId} reports research date ${record.reportedAuthority.researchRetrievalDate}, not corpus date ${compiled.corpus.asOf}.`,
        record.recordId,
      );
    }

    walkSourceStates(record, record.recordId, findings);
    keySweep(record, record.recordId, findings);

    const exists = present(record.officeExists);
    if (exists === false) {
      if (!expectedInactiveIds.has(record.recordId)) {
        add(
          findings,
          "judicial/unexpected-non-applicable-office",
          `${record.recordId} is inactive but is not one of 92L's eight absent intermediate courts.`,
          record.recordId,
        );
      }
      for (const [label, value] of [
        ["courtName", record.courtName],
        ["geography", record.geography],
        ["initialSelection", record.initialSelection],
        ["interimVacancy", record.interimVacancy],
        ["tenure", record.tenure],
        ["renewal", record.renewal],
        ["mandatoryRetirement", record.mandatoryRetirement],
      ] as const) {
        if (value.state !== "NOT_APPLICABLE") {
          add(
            findings,
            "judicial/inactive-field-not-applicable",
            `${record.recordId} ${label} must remain NOT_APPLICABLE.`,
            record.recordId,
          );
        }
      }
      continue;
    }
    if (exists !== true) {
      add(
        findings,
        "judicial/unresolved-office-existence",
        `${record.recordId} does not establish whether its office exists.`,
        record.recordId,
      );
      continue;
    }
    if (record.initialSelection.state === "KNOWN") {
      if (record.initialSelection.value.paths.length === 0) {
        add(
          findings,
          "judicial/empty-initial-pipeline",
          `${record.recordId} has no initial selection path.`,
          record.recordId,
        );
      }
      validatePaths(
        record,
        record.initialSelection.value.paths,
        "initial selection",
        findings,
      );
      if (record.initialSelection.value.reportedWorkflowStages.length === 0) {
        add(
          findings,
          "judicial/empty-reported-workflow",
          `${record.recordId} lost the ordered 92L workflow stages.`,
          record.recordId,
        );
      }
    }
    if (record.interimVacancy.state === "KNOWN") {
      const path: AtomicSelectionPath = {
        pathId: "vacancy",
        applicability: record.interimVacancy.value.nextElectionTiming,
        stages: record.interimVacancy.value.stages,
      };
      validatePaths(record, [path], "interim vacancy", findings);
    }
    if (record.renewal.state === "KNOWN") {
      validatePaths(record, record.renewal.value.paths, "renewal", findings);
    }
    if (
      record.tenure.state === "KNOWN" &&
      record.tenure.value.kind === "GOOD_BEHAVIOR" &&
      record.tenure.value.termLengthYears.state !== "NOT_APPLICABLE"
    ) {
      add(
        findings,
        "judicial/good-behavior-fixed-term",
        `${record.recordId} gives good-behavior tenure a fixed term.`,
        record.recordId,
      );
    }
    if (
      record.tenure.state === "KNOWN" &&
      record.tenure.value.kind === "GOOD_BEHAVIOR" &&
      record.renewal.state !== "NOT_APPLICABLE"
    ) {
      add(
        findings,
        "judicial/good-behavior-renewal",
        `${record.recordId} gives a good-behavior office a renewal pipeline.`,
        record.recordId,
      );
    }
  }

  for (const expected of expectedInactiveIds) {
    if (!inactive.some((record) => record.recordId === expected)) {
      add(
        findings,
        "judicial/missing-non-applicable-office",
        `${expected} must remain an explicit non-applicable slot.`,
        expected,
      );
    }
  }

  return {
    domain: "judicial-office-selection",
    checked: records.length,
    findings,
  };
}
