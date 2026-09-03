/**
 * FEC corpus validation.
 *
 * The counts are the line counts of the Commission's own files, and the vectors
 * are real registrations. The prohibited-term sweep is doing real work in this
 * domain: campaign finance is exactly where a substrate is tempted to grow a
 * "strength", "viability" or "lean" field that no filing establishes.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  OFFICIAL_FEC_CANDIDATE_VECTORS,
  OFFICIAL_FEC_COMMITTEE_VECTORS,
  isCandidateId,
  isCommitteeId,
} from "./identity";
import type { FecRecord } from "./types";

export const EXPECTED_CANDIDATE_COUNT = 9798;
export const EXPECTED_COMMITTEE_COUNT = 20938;
export const EXPECTED_LINKAGE_COUNT = 8619;

const PROHIBITED_FIELD_TERMS = [
  "ideolog",
  "viability",
  "strength",
  "raised",
  "receipts",
  "disbursement",
  "cashOnHand",
  "won",
  "lost",
  "result",
  "margin",
  "lean",
  "favorab",
  "polling",
];

export function validateFecCorpus(
  compiled: CompiledCorpus<FecRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  const candidates = records.filter((r) => r.recordKind === "candidate");
  const committees = records.filter((r) => r.recordKind === "committee");
  const linkages = records.filter((r) => r.recordKind === "linkage");

  if (production) {
    const expected: [string, number, number][] = [
      ["candidate", candidates.length, EXPECTED_CANDIDATE_COUNT],
      ["committee", committees.length, EXPECTED_COMMITTEE_COUNT],
      ["linkage", linkages.length, EXPECTED_LINKAGE_COUNT],
    ];
    for (const [kind, actual, want] of expected) {
      if (actual !== want) {
        findings.push({
          severity: "error",
          code: "fec/universe-count",
          message: `The FEC's 2024 ${kind} file publishes ${want} rows; this corpus holds ${actual}.`,
        });
      }
    }
    if (!compiled.corpus.coverage.isCompleteUniverse) {
      findings.push({
        severity: "error",
        code: "fec/coverage",
        message:
          "This corpus compiles every row of all three bulk files, so it must not be labelled a bounded sample.",
      });
    }
  }

  const candidateIds = new Set(candidates.map((r) => r.candidateId));
  const committeeIds = new Set(committees.map((r) => r.committeeId));

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (
        PROHIBITED_FIELD_TERMS.some((term) =>
          key.toLowerCase().includes(term.toLowerCase()),
        )
      ) {
        findings.push({
          severity: "error",
          code: "fec/registration-is-not-outcome",
          message: `Field "${key}" asserts something an FEC registration does not establish. A filing is evidence that somebody filed.`,
          recordId: record.recordId,
        });
      }
    }
    if (
      record.recordKind === "candidate" &&
      !isCandidateId(record.candidateId)
    ) {
      findings.push({
        severity: "error",
        code: "fec/candidate-id-grammar",
        message: `Candidate id "${record.candidateId}" does not match the published grammar.`,
        recordId: record.recordId,
      });
    }
    if (
      record.recordKind === "committee" &&
      !isCommitteeId(record.committeeId)
    ) {
      findings.push({
        severity: "error",
        code: "fec/committee-id-grammar",
        message: `Committee id "${record.committeeId}" does not match the published grammar.`,
        recordId: record.recordId,
      });
    }
  }

  /*
   * The three bulk files are not closed over one another.
   *
   * The linkage file spans more than one cycle, so it names candidates and
   * committees the 2024 masters do not carry. #68's audit reported perfect
   * referential integrity, but it was measuring a 152-row sample that had been
   * selected to be internally consistent — which is what a sample selected for
   * consistency will always show. Over the complete published universe the
   * dangling references are real, and recording them is the point: a substrate
   * that dropped them would be tidying the publisher's data and calling the
   * result the publisher's data.
   */
  const danglingCandidates = linkages.filter(
    (record) =>
      record.recordKind === "linkage" && !candidateIds.has(record.candidateId),
  ).length;
  const danglingCommittees = linkages.filter(
    (record) =>
      record.recordKind === "linkage" && !committeeIds.has(record.committeeId),
  ).length;
  if (danglingCandidates > 0 || danglingCommittees > 0) {
    findings.push({
      severity: "warning",
      code: "fec/linkage-not-closed-over-masters",
      message: `${danglingCandidates} of ${linkages.length} linkage rows name a candidate absent from the 2024 candidate master, and ${danglingCommittees} name an absent committee. The FEC's linkage file spans cycles the master files do not; these rows are preserved as published.`,
    });
  }

  if (production) {
    const candidateById = new Map(candidates.map((r) => [r.candidateId, r]));
    for (const vector of OFFICIAL_FEC_CANDIDATE_VECTORS) {
      const record = candidateById.get(vector.candidateId);
      if (!record) {
        findings.push({
          severity: "error",
          code: "fec/oracle-missing-candidate",
          message: `Official vector ${vector.candidateId} is absent. ${vector.note}`,
          recordId: vector.candidateId,
        });
        continue;
      }
      if (record.officeDistrict !== vector.officeDistrict) {
        findings.push({
          severity: "error",
          code: "fec/oracle-district",
          message: `Official vector ${vector.candidateId} is published in district ${vector.officeDistrict}; this corpus says ${String(record.officeDistrict)}.`,
          recordId: vector.candidateId,
        });
      }
      if (
        record.officeStateCode !== vector.officeStateCode ||
        record.officeCode !== vector.officeCode
      ) {
        findings.push({
          severity: "error",
          code: "fec/oracle-office",
          message: `Official vector ${vector.candidateId} seeks office ${vector.officeCode} in ${vector.officeStateCode}; this corpus says ${String(record.officeCode)} in ${String(record.officeStateCode)}.`,
          recordId: vector.candidateId,
        });
      }
    }

    const committeeById = new Map(committees.map((r) => [r.committeeId, r]));
    for (const vector of OFFICIAL_FEC_COMMITTEE_VECTORS) {
      const record = committeeById.get(vector.committeeId);
      if (!record) {
        findings.push({
          severity: "error",
          code: "fec/oracle-missing-committee",
          message: `Official vector ${vector.committeeId} is absent. ${vector.note}`,
          recordId: vector.committeeId,
        });
        continue;
      }
      if (record.committeeName !== vector.committeeName) {
        findings.push({
          severity: "error",
          code: "fec/oracle-committee-name",
          message: `Official vector ${vector.committeeId} is registered as "${vector.committeeName}"; this corpus says "${record.committeeName}".`,
          recordId: vector.committeeId,
        });
      }
    }
  }

  return { domain: "fec", checked: records.length, findings };
}
