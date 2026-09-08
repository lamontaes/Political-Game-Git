/**
 * Reading a fiscal authority matrix.
 *
 * One tab-separated row per fact, carrying exact control vocabularies, an
 * explicit value kind, positive legal-artifact identity, and — only for a
 * no-enabling-authority conclusion — structured searched scope. The shape is
 * the qualifications matrix's, and for the same reason: 92N states most of its
 * facts inside prose sentences, and extracting a citation from a sentence is
 * inference rather than transcription.
 *
 * Tabs specifically, and a width check, because a matrix that loses its tab
 * characters in transport reads as a single column and every field after the
 * first silently becomes empty.
 */

import { SourceParseError, parseDelimited } from "../../core/index";
import type { DelimitedRow } from "../../core/index";

export const FISCAL_MATRIX_COLUMNS = [
  "state",
  "level",
  "record_kind",
  "subject",
  "status",
  "value",
  "value_kind",
  "authority_type",
  "authority_artifact_kind",
  "authority_artifact_id",
  "authority_lineage",
  "legal_locator",
  "effective_date",
  "direct_derived",
  "review_required",
  "authority_url",
  "paraphrase",
  "searched_scope",
] as const;

export type FiscalMatrixColumn = (typeof FISCAL_MATRIX_COLUMNS)[number];

export interface FiscalMatrixTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

/** Parse a fiscal authority matrix, refusing anything that is not the shape. */
export function parseFiscalMatrix(bytes: Uint8Array): FiscalMatrixTable {
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: FISCAL_MATRIX_COLUMNS.length,
    // Control columns are exact vocabularies. Preserving their bytes is what
    // lets the normalizer reject whitespace smuggling rather than erase it.
    trimFields: false,
  });

  const header = parsed.header ?? [];
  if (header.length !== FISCAL_MATRIX_COLUMNS.length) {
    throw new SourceParseError(
      `A fiscal authority matrix has ${FISCAL_MATRIX_COLUMNS.length} tab-separated columns; this one has ${header.length}. If it reads as one column, its tab characters did not survive transport.`,
    );
  }
  for (const [index, expected] of FISCAL_MATRIX_COLUMNS.entries()) {
    if (header[index] !== expected) {
      throw new SourceParseError(
        `Column ${index + 1} of the fiscal authority matrix is "${header[index]}"; the schema declares "${expected}".`,
      );
    }
  }
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The fiscal authority matrix produced ${parsed.defects.length} defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  return { rows: parsed.rows, header };
}

/** Read a named column out of a matrix row. */
export function fiscalMatrixField(
  row: DelimitedRow,
  column: FiscalMatrixColumn,
): string {
  return row.fields[FISCAL_MATRIX_COLUMNS.indexOf(column)] ?? "";
}
