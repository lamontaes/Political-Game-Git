/**
 * Employment matrix rows into employment records.
 *
 * Every one of the five measures passes through `readMeasure`, which is where
 * the missing-is-not-zero rule lives. A cell's small vocabulary decides its
 * state:
 *
 *   - a number (including "0")   -> KNOWN, and "0" is a genuine reported zero;
 *   - an empty cell              -> UNKNOWN, a measure the product did not carry;
 *   - "S"                        -> SUPPRESSED, a figure the Bureau withheld;
 *   - "NA"                       -> NOT_APPLICABLE, a measure meaningless here.
 *
 * There is no path from an empty cell to a number. A part-time count nobody
 * collected stays UNKNOWN, so the aggregate that adds full-time to part-time is
 * INCOMPLETE and says which government's part-time count is missing, rather than
 * reading the gap as a zero and reporting a confident wrong total.
 */

import {
  SourceValidationError,
  known,
  notApplicable,
  suppressed,
  unknown,
} from "../../core/index";
import type { Evidence, ParseDefect, Sourced } from "../../core/index";
import { employmentField } from "./parse";
import type { EmploymentColumn } from "./parse";
import type { DelimitedRow, SourceLocator } from "../../core/index";
import type { EstimateBasis, EmploymentRecord } from "./types";

const ESTIMATE_BASES: readonly EstimateBasis[] = [
  "CENSUS_UNIVERSE",
  "SAMPLE_ESTIMATE",
];

export interface EmploymentNormalizeResult {
  readonly records: readonly EmploymentRecord[];
  readonly defects: readonly ParseDefect[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn one measure cell into a sourced value.
 *
 * The reference date is what a KNOWN value is placed at, so a measure with a
 * number but no reference date cannot be KNOWN — it becomes UNKNOWN rather than
 * being dated from a build.
 */
export function readMeasure(
  raw: string,
  referenceDate: string,
  measure: string,
  artifactId: string,
  line: number,
): Sourced<number> {
  const locator: SourceLocator = {
    kind: "delimited-row",
    artifactId,
    line,
    column: measure,
  };
  const evidence: Evidence = { artifactId, locator };
  const trimmed = raw.trim();

  if (trimmed === "") {
    return unknown(
      `The product carries no ${measure} for this function and reference period.`,
      [evidence],
    );
  }
  if (trimmed === "S") {
    return suppressed([evidence], `The Bureau withheld ${measure} (flag "S").`);
  }
  if (trimmed === "NA") {
    return notApplicable(
      [evidence],
      `${measure} does not apply to this function.`,
    );
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return unknown(
      `The source supplies "${raw}" for ${measure}, which is neither a number nor a known flag.`,
      [evidence],
    );
  }
  if (!ISO_DATE.test(referenceDate)) {
    return unknown(
      `The source supplies ${measure} "${trimmed}" but no reference date, so it cannot be placed in time.`,
      [evidence],
    );
  }
  return known(Number(trimmed), [evidence], "FINAL", referenceDate);
}

export function normalizeEmployment(
  rows: readonly DelimitedRow[],
  artifactId: string,
): EmploymentNormalizeResult {
  const records: EmploymentRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const censusGovId = employmentField(row, "census_gov_id");
    const stateFips = employmentField(row, "state_fips");
    const stateUsps = employmentField(row, "state_usps").toUpperCase();
    const govTypeCode = employmentField(row, "gov_type_code");
    const govName = employmentField(row, "gov_name");
    const referenceYearRaw = employmentField(row, "reference_year");
    const referenceDate = employmentField(row, "reference_date");
    const functionCode = employmentField(row, "function_code");
    const functionLabel = employmentField(row, "function_label");
    const estimateBasisRaw = employmentField(
      row,
      "estimate_basis",
    ).toUpperCase();
    const employmentUnits = employmentField(row, "employment_units");
    const payrollUnits = employmentField(row, "payroll_units");

    if (censusGovId.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: an employment record with no Census government identifier cannot be joined to the registry.`,
      });
      continue;
    }
    const referenceYear = Number(referenceYearRaw);
    if (!/^\d{4}$/.test(referenceYearRaw) || !Number.isInteger(referenceYear)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${referenceYearRaw}" is not a four-digit reference year.`,
      });
      continue;
    }
    if (functionCode.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: an employment record must carry the source function code.`,
      });
      continue;
    }
    const estimateBasis = ESTIMATE_BASES.find(
      (entry) => entry === estimateBasisRaw,
    );
    if (!estimateBasis) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${estimateBasisRaw}" is not a known estimate basis; the sample/universe distinction must be explicit.`,
      });
      continue;
    }
    if (employmentUnits.trim() === "" || payrollUnits.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: employment and payroll units must both be stated.`,
      });
      continue;
    }

    const identityLocator: SourceLocator = {
      kind: "delimited-row",
      artifactId,
      line: row.line,
      column: "function_code",
    };
    const evidence: Evidence = {
      artifactId,
      locator: identityLocator,
      providerNativeId: censusGovId,
    };

    const measure = (name: string, column: EmploymentColumn): Sourced<number> =>
      readMeasure(
        employmentField(row, column),
        referenceDate,
        name,
        artifactId,
        row.line,
      );

    records.push({
      recordId: `${censusGovId}:${functionCode}:${referenceYear}`,
      censusGovId,
      stateFips,
      stateUsps,
      govTypeCode,
      govName,
      referenceYear,
      referenceDate,
      functionCode,
      functionLabel,
      estimateBasis,
      employmentUnits,
      payrollUnits,
      fullTimeEmployees: measure("full-time employees", "ft_employees"),
      partTimeEmployees: measure("part-time employees", "pt_employees"),
      fullTimeEquivalent: measure(
        "full-time-equivalent employment",
        "fte_employment",
      ),
      fullTimePayroll: measure("full-time payroll", "ft_payroll"),
      partTimePayroll: measure("part-time payroll", "pt_payroll"),
      evidence,
    });
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      throw new SourceValidationError(
        `The employment matrix yields "${record.recordId}" twice; one government cannot report one function for one year twice.`,
      );
    }
    seen.add(record.recordId);
  }

  return { records, defects };
}
