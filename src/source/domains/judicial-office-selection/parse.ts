/**
 * Reading a judicial-office matrix.
 *
 * One tab-separated row per office. A judicial office's constitution — the court
 * it sits on, how it is filled, how it is held, what it requires — is stated in
 * one place in a jurisdiction's law far more often than it is scattered, so one
 * row carrying one office (rather than one row per field, as the qualifications
 * matrix does) is the honest shape here.
 *
 * Tabs specifically, with a width check, for the same reason the qualifications
 * reader insists on them: a matrix whose delimiters are lost in transport reads
 * as a single column, and a compiler should refuse that loudly rather than
 * treat a whole row as one field.
 */

import { SourceParseError, parseDelimited } from "../../core/index";
import type { DelimitedRow } from "../../core/index";

export const JUDICIAL_COLUMNS = [
  "jurisdiction",
  "court_level",
  "office_title",
  "court_join_key",
  "tenure_kind",
  "retention_method",
  "initial_selection",
  "interim_vacancy",
  "term_length",
  "mandatory_retirement",
  "professional_qualification",
  "minimum_age",
  "residency",
  "bar_requirement",
  "authority_type",
  "exact_source",
  "legal_locator",
  "authority_url",
  "reference_date",
  "retrieval",
  "verification",
  "unresolved_fields",
] as const;

export type JudicialColumn = (typeof JUDICIAL_COLUMNS)[number];

export interface JudicialTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

/** Parse a judicial-office matrix, refusing anything that is not the shape. */
export function parseJudicialMatrix(bytes: Uint8Array): JudicialTable {
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: JUDICIAL_COLUMNS.length,
    trimFields: true,
  });

  const header = parsed.header ?? [];
  if (header.length !== JUDICIAL_COLUMNS.length) {
    throw new SourceParseError(
      `A judicial-office matrix has ${JUDICIAL_COLUMNS.length} tab-separated columns; this one has ${header.length}. If it reads as one column, its tab characters did not survive transport.`,
    );
  }
  for (const [index, expected] of JUDICIAL_COLUMNS.entries()) {
    if (header[index] !== expected) {
      throw new SourceParseError(
        `Column ${index + 1} of the judicial-office matrix is "${header[index]}"; the schema declares "${expected}".`,
      );
    }
  }
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The judicial-office matrix produced ${parsed.defects.length} defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  return { rows: parsed.rows, header };
}

/** Read a named column out of a matrix row. */
export function matrixField(row: DelimitedRow, column: JudicialColumn): string {
  return row.fields[JUDICIAL_COLUMNS.indexOf(column)] ?? "";
}
