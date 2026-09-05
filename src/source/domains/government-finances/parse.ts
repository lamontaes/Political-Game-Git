/**
 * Reading a government-finances matrix.
 *
 * The shape is one tab-separated row per published fiscal amount, carrying the
 * government's Census identity, the reference year and fiscal-year-ending date,
 * the fiscal category and item, the units, the estimate basis, and the amount
 * with a status that says how (or whether) it is known.
 *
 * Tabs specifically, with a width check, for the same reason the qualifications
 * matrix insists on them: a delimiter that does not survive transport collapses
 * every column into one and a reader that tolerates it transcribes nonsense.
 * An empty amount cell is preserved as empty here and turned into the right
 * unresolved state by the normalizer, per the source's own status flag — the
 * parser never guesses a zero.
 */

import { SourceParseError, parseDelimited } from "../../core/index";
import type { DelimitedRow } from "../../core/index";

export const FINANCE_COLUMNS = [
  "census_gov_id",
  "state_fips",
  "state_usps",
  "gov_type_code",
  "gov_name",
  "fiscal_year",
  "fiscal_year_ending",
  "category",
  "item_code",
  "item_description",
  "units",
  "estimate_basis",
  "status",
  "amount",
  "provider_flag",
] as const;

export type FinanceColumn = (typeof FINANCE_COLUMNS)[number];

export interface FinanceTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

/** Parse a government-finances matrix, refusing anything that is not the shape. */
export function parseFinanceMatrix(bytes: Uint8Array): FinanceTable {
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: FINANCE_COLUMNS.length,
    trimFields: true,
  });

  const header = parsed.header ?? [];
  if (header.length !== FINANCE_COLUMNS.length) {
    throw new SourceParseError(
      `A government-finances matrix has ${FINANCE_COLUMNS.length} tab-separated columns; this one has ${header.length}. If it reads as one column, its tab characters did not survive transport.`,
    );
  }
  for (const [index, expected] of FINANCE_COLUMNS.entries()) {
    if (header[index] !== expected) {
      throw new SourceParseError(
        `Column ${index + 1} of the government-finances matrix is "${header[index]}"; the schema declares "${expected}".`,
      );
    }
  }
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The government-finances matrix produced ${parsed.defects.length} defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  return { rows: parsed.rows, header };
}

/** Read a named column out of a finance matrix row. */
export function financeField(row: DelimitedRow, column: FinanceColumn): string {
  return row.fields[FINANCE_COLUMNS.indexOf(column)] ?? "";
}
