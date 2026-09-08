/**
 * Reading a public-employment matrix.
 *
 * One tab-separated row per government function, carrying the government's
 * Census identity, the reference year and date, the function code and label, the
 * estimate basis, the two unit strings, and the five measures. Each measure cell
 * is a small vocabulary rather than a bare number, so that a blank, a
 * suppression flag and an inapplicable line stay distinct from a reported value
 * — see `readMeasure` in the normalizer.
 *
 * Tabs specifically, with a width check, for the reason every matrix in this
 * substrate insists on them: a delimiter that does not survive transport
 * collapses the columns and a tolerant reader transcribes nonsense.
 */

import { SourceParseError, parseDelimited } from "../../core/index";
import type { DelimitedRow } from "../../core/index";

export const EMPLOYMENT_COLUMNS = [
  "census_gov_id",
  "state_fips",
  "state_usps",
  "gov_type_code",
  "gov_name",
  "reference_year",
  "reference_date",
  "function_code",
  "function_label",
  "estimate_basis",
  "employment_units",
  "payroll_units",
  "ft_employees",
  "pt_employees",
  "fte_employment",
  "ft_payroll",
  "pt_payroll",
] as const;

export type EmploymentColumn = (typeof EMPLOYMENT_COLUMNS)[number];

export interface EmploymentTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

/** Parse a public-employment matrix, refusing anything that is not the shape. */
export function parseEmploymentMatrix(bytes: Uint8Array): EmploymentTable {
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: EMPLOYMENT_COLUMNS.length,
    trimFields: true,
  });

  const header = parsed.header ?? [];
  if (header.length !== EMPLOYMENT_COLUMNS.length) {
    throw new SourceParseError(
      `A public-employment matrix has ${EMPLOYMENT_COLUMNS.length} tab-separated columns; this one has ${header.length}. If it reads as one column, its tab characters did not survive transport.`,
    );
  }
  for (const [index, expected] of EMPLOYMENT_COLUMNS.entries()) {
    if (header[index] !== expected) {
      throw new SourceParseError(
        `Column ${index + 1} of the public-employment matrix is "${header[index]}"; the schema declares "${expected}".`,
      );
    }
  }
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The public-employment matrix produced ${parsed.defects.length} defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  return { rows: parsed.rows, header };
}

/** Read a named column out of an employment matrix row. */
export function employmentField(
  row: DelimitedRow,
  column: EmploymentColumn,
): string {
  return row.fields[EMPLOYMENT_COLUMNS.indexOf(column)] ?? "";
}
