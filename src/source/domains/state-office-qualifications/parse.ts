/**
 * Reading a qualifications matrix.
 *
 * The shape is 31F's: one tab-separated row per fact, with its own status,
 * value, authority, locator, effective date, derivation flag and review flag.
 * That is the only shape this compiler accepts, and the reason is 31F's own
 * central finding — three of the five research batches state a fact's citation
 * inside a sentence, and extracting it would mean pattern-matching legal
 * citations out of prose, which is inference rather than transcription.
 *
 * Tabs specifically, and a width check, because 31F finding 31F-01 is that the
 * richest batch of the five lost its tab characters in transport and nobody
 * noticed until a compiler tried to read it.
 */

import { SourceParseError, parseDelimited } from "../../core/index";
import type { DelimitedRow } from "../../core/index";

export const QUALIFICATION_COLUMNS = [
  "state",
  "office_family",
  "fact_field",
  "status",
  "value",
  "authority_type",
  "legal_locator",
  "effective_date",
  "direct_derived",
  "review_required",
  "authority_url",
  "paraphrase",
] as const;

export type QualificationColumn = (typeof QUALIFICATION_COLUMNS)[number];

export interface QualificationTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

/** Parse a qualifications matrix, refusing anything that is not the shape. */
export function parseQualificationMatrix(bytes: Uint8Array): QualificationTable {
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: QUALIFICATION_COLUMNS.length,
    trimFields: true,
  });

  const header = parsed.header ?? [];
  if (header.length !== QUALIFICATION_COLUMNS.length) {
    throw new SourceParseError(
      `A qualifications matrix has ${QUALIFICATION_COLUMNS.length} tab-separated columns; this one has ${header.length}. If it reads as one column, its tab characters did not survive transport — see 31F finding 31F-01.`,
    );
  }
  for (const [index, expected] of QUALIFICATION_COLUMNS.entries()) {
    if (header[index] !== expected) {
      throw new SourceParseError(
        `Column ${index + 1} of the qualifications matrix is "${header[index]}"; the schema declares "${expected}".`,
      );
    }
  }
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The qualifications matrix produced ${parsed.defects.length} defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  return { rows: parsed.rows, header };
}

/** Read a named column out of a matrix row. */
export function matrixField(row: DelimitedRow, column: QualificationColumn): string {
  return row.fields[QUALIFICATION_COLUMNS.indexOf(column)] ?? "";
}
