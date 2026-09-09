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

/** The original 31D artifact's exact, recovered 14-column transport. */
export const RECOVERED_31D_QUALIFICATION_COLUMNS = [
  "state",
  "office_family",
  "fact_field",
  "status",
  "value",
  "authority_url",
  "authority_type",
  "legal_locator",
  "paraphrase",
  "effective_date",
  "direct_derived",
  "derivation_chain",
  "review_required",
  "notes",
] as const;

export type QualificationColumn =
  | (typeof QUALIFICATION_COLUMNS)[number]
  | (typeof RECOVERED_31D_QUALIFICATION_COLUMNS)[number];

export interface QualificationTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
  readonly schema: "31F-compiler-ready" | "31D-recovered";
}

/** Parse a qualifications matrix, refusing anything that is not the shape. */
export function parseQualificationMatrix(
  bytes: Uint8Array,
): QualificationTable {
  const headerLine =
    Buffer.from(bytes)
      .toString("utf-8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/, 1)[0] ?? "";
  const transportedHeader = headerLine
    .split("\t")
    .map((field) => field.trim());
  const columns =
    transportedHeader.length === QUALIFICATION_COLUMNS.length
      ? QUALIFICATION_COLUMNS
      : transportedHeader.length === RECOVERED_31D_QUALIFICATION_COLUMNS.length
        ? RECOVERED_31D_QUALIFICATION_COLUMNS
        : null;
  if (columns === null) {
    throw new SourceParseError(
      `A qualifications matrix has either ${QUALIFICATION_COLUMNS.length} (31F) or ${RECOVERED_31D_QUALIFICATION_COLUMNS.length} (recovered 31D) tab-separated columns; this one has ${transportedHeader.length}. If it reads as one column, its tab characters did not survive transport — see 31F finding 31F-01.`,
    );
  }
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: columns.length,
    trimFields: true,
  });

  const header = parsed.header ?? [];
  for (const [index, expected] of columns.entries()) {
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

  return {
    rows: parsed.rows,
    header,
    schema:
      columns === QUALIFICATION_COLUMNS
        ? "31F-compiler-ready"
        : "31D-recovered",
  };
}

/** Read a named column out of a matrix row. */
export function matrixField(
  row: DelimitedRow,
  column: QualificationColumn,
  header: readonly string[] = QUALIFICATION_COLUMNS,
): string {
  return row.fields[header.indexOf(column)] ?? "";
}
