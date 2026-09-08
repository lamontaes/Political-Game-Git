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

import {
  calendarYearOf,
  findFabricatedScore,
  isCensusGovernmentId,
  isUnresolved,
  sumSourced,
} from "../../core/index";
import type {
  Aggregate,
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { EmploymentRecord } from "./types";

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
    if (!isCensusGovernmentId(record.censusGovId)) {
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

    const fabricated = findFabricatedScore(
      `${record.functionCode} ${record.functionLabel}`,
    );
    if (fabricated) {
      findings.push({
        severity: "error",
        code: "public-employment/invented-score",
        message: `${record.recordId} ${fabricated.reason} The Bureau publishes staffing and payroll; inventing agency efficiency from them is forbidden.`,
        recordId: record.recordId,
      });
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
        /*
         * ASPEP's reference period is the pay period including March 12 of the
         * survey year, so an employment measure is dated inside the reference
         * year itself. This is deliberately NOT the finance domain's rule: a
         * finance record's fiscal-year-ending date may fall in the previous
         * calendar year, because a fiscal year is a government's own accounting
         * period and a March-12 pay period is a fixed date the Bureau chose.
         * The two timings must not be conflated in either direction.
         */
        if (calendarYearOf(sourced.asOf) !== record.referenceYear) {
          findings.push({
            severity: "error",
            code: "public-employment/year-mismatch",
            message: `${record.recordId} reports reference year ${record.referenceYear} but ${name} is dated ${sourced.asOf}. ASPEP's reference period falls inside the survey year, so reference years must not drift or silently combine.`,
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
