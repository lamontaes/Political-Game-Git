/**
 * Public-employment corpus validation.
 *
 * The checks enforce the task's critical data rules against the compiled
 * records: a government identity joinable by code rather than name, units on
 * both the employee and payroll measures, the sample/universe distinction kept
 * explicit, the reference year preserved on every known measure, and no
 * collapse of staffing into an invented "efficiency", "competence" or capacity
 * score.
 *
 * `totalEmployment` is exported alongside the validator because it is the honest
 * way to add full-time and part-time counts: it returns an `Aggregate`, which is
 * COMPLETE only when both components are KNOWN and INCOMPLETE — naming the gap —
 * otherwise. No caller gets a bare summed number when a component is missing.
 */

import { isUnresolved, sumSourced } from "../../core/index";
import type {
  Aggregate,
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { EmploymentRecord } from "./types";

/** Tokens that mark an invented productivity metric rather than a source measure. */
export const REJECTED_SCORE_TOKENS: readonly string[] = [
  "score",
  "efficiency",
  "competence",
  "productivity index",
  "capacity index",
];

/** A Census government identifier is a 14-digit code, never a name. */
const GOV_ID_PATTERN = /^\d{14}$/;

/**
 * Full-time plus part-time employees, as an aggregate that refuses to lie.
 *
 * COMPLETE only when both counts are KNOWN. If either is missing, the result is
 * INCOMPLETE and names which component is absent, rather than reading it as a
 * zero. This is the 13B `(ft ?? 0) + (pt ?? 0)` defect, made unrepresentable.
 */
export function totalEmployment(record: EmploymentRecord): Aggregate<number> {
  return sumSourced([
    {
      member: { memberId: `${record.recordId}#ft`, label: "full-time" },
      value: record.fullTimeEmployees,
    },
    {
      member: { memberId: `${record.recordId}#pt`, label: "part-time" },
      value: record.partTimeEmployees,
    },
  ]);
}

export function validateEmploymentCorpus(
  compiled: CompiledCorpus<EmploymentRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  for (const record of records) {
    if (!GOV_ID_PATTERN.test(record.censusGovId)) {
      findings.push({
        severity: "error",
        code: "public-employment/malformed-gov-id",
        message: `${record.recordId} carries government id "${record.censusGovId}", which is not a 14-digit Census identifier. Records must be joinable by code, not by name.`,
        recordId: record.recordId,
      });
    }
    if (record.employmentUnits.trim() === "") {
      findings.push({
        severity: "error",
        code: "public-employment/no-employment-units",
        message: `${record.recordId} states no employment units.`,
        recordId: record.recordId,
      });
    }
    if (record.payrollUnits.trim() === "") {
      findings.push({
        severity: "error",
        code: "public-employment/no-payroll-units",
        message: `${record.recordId} states no payroll units.`,
        recordId: record.recordId,
      });
    }

    const haystack =
      `${record.functionCode} ${record.functionLabel}`.toLowerCase();
    for (const token of REJECTED_SCORE_TOKENS) {
      if (haystack.includes(token)) {
        findings.push({
          severity: "error",
          code: "public-employment/invented-score",
          message: `${record.recordId} names "${token}". The source publishes staffing and payroll, not a composite ${token}; inventing agency efficiency is forbidden.`,
          recordId: record.recordId,
        });
      }
    }

    const measures: readonly [string, Sourced<number>][] = [
      ["fullTimeEmployees", record.fullTimeEmployees],
      ["partTimeEmployees", record.partTimeEmployees],
      ["fullTimeEquivalent", record.fullTimeEquivalent],
      ["fullTimePayroll", record.fullTimePayroll],
      ["partTimePayroll", record.partTimePayroll],
    ];
    for (const [name, sourced] of measures) {
      if (sourced.state === "KNOWN") {
        if (!Number.isFinite(sourced.value)) {
          findings.push({
            severity: "error",
            code: "public-employment/non-finite-measure",
            message: `${record.recordId} holds a non-finite ${name}.`,
            recordId: record.recordId,
          });
        }
        if (sourced.value < 0) {
          findings.push({
            severity: "error",
            code: "public-employment/negative-measure",
            message: `${record.recordId} holds a negative ${name} (${sourced.value}); staffing and payroll are not negative.`,
            recordId: record.recordId,
          });
        }
        const asOfYear = Number(sourced.asOf.slice(0, 4));
        if (asOfYear !== record.referenceYear) {
          findings.push({
            severity: "error",
            code: "public-employment/year-mismatch",
            message: `${record.recordId} reports reference year ${record.referenceYear} but ${name} is dated ${sourced.asOf}. Reference years must not drift or silently combine.`,
            recordId: record.recordId,
          });
        }
      }
    }
  }

  /*
   * A corpus in which no measure anywhere is unresolved is suspicious: ASPEP
   * suppresses figures for small governments and omits measures that do not
   * apply to a function, so complete knownness across a large corpus may mean a
   * missing cell was turned into a number.
   */
  const anyUnresolved = records.some(
    (record) =>
      isUnresolved(record.fullTimeEmployees) ||
      isUnresolved(record.partTimeEmployees) ||
      isUnresolved(record.fullTimeEquivalent) ||
      isUnresolved(record.fullTimePayroll) ||
      isUnresolved(record.partTimePayroll),
  );
  if (records.length >= 20 && !anyUnresolved) {
    findings.push({
      severity: "warning",
      code: "public-employment/no-missingness",
      message:
        "Every measure in the corpus resolved to KNOWN. ASPEP withholds and omits measures for many governments and functions, so a corpus with no unresolved value may have turned a missing cell into a number.",
    });
  }

  return {
    domain: "public-employment",
    checked: records.length,
    findings,
  };
}
