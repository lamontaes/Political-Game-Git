/**
 * Read one of the two declared qualification-matrix transports.
 *
 * 31F carries twelve tab-separated columns. The recovered 31D source carries
 * fourteen, including its derivation chain and notes. Selection is by exact
 * header identity, never by guessed delimiters or field count alone.
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

/** Compatibility name used by the production compiler recovered from Claude. */
export const QUALIFICATION_COLUMNS_31D = RECOVERED_31D_QUALIFICATION_COLUMNS;

export type QualificationColumn =
  | (typeof QUALIFICATION_COLUMNS)[number]
  | (typeof RECOVERED_31D_QUALIFICATION_COLUMNS)[number];

export interface QualificationMatrixSchema {
  readonly schemaId: "31F-reconciled-12" | "31D-export-14";
  readonly columns: readonly QualificationColumn[];
}

export const QUALIFICATION_MATRIX_SCHEMAS: readonly QualificationMatrixSchema[] =
  [
    { schemaId: "31F-reconciled-12", columns: QUALIFICATION_COLUMNS },
    {
      schemaId: "31D-export-14",
      columns: RECOVERED_31D_QUALIFICATION_COLUMNS,
    },
  ];

export interface QualificationTable {
  readonly schema: QualificationMatrixSchema;
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

function schemaForHeader(
  header: readonly string[],
): QualificationMatrixSchema | undefined {
  return QUALIFICATION_MATRIX_SCHEMAS.find(
    (schema) =>
      schema.columns.length === header.length &&
      schema.columns.every((column, index) => header[index] === column),
  );
}

export function parseQualificationMatrix(
  bytes: Uint8Array,
): QualificationTable {
  const headerLine =
    Buffer.from(bytes)
      .toString("utf-8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/, 1)[0] ?? "";
  const headerFields = headerLine.split("\t").map((field) => field.trim());
  const schema = schemaForHeader(headerFields);
  if (!schema) {
    if (headerFields.length === 1) {
      throw new SourceParseError(
        "A qualifications matrix is tab-separated; its tab characters did not survive transport. Read the structured source bytes rather than a rendered document.",
      );
    }
    throw new SourceParseError(
      `A qualifications matrix must carry one of the declared exact headers; this one has ${headerFields.length} columns.`,
    );
  }

  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: schema.columns.length,
    trimFields: true,
  });
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The qualifications matrix produced ${parsed.defects.length} defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  const header = parsed.header ?? headerFields;
  if (!schema.columns.every((column, index) => header[index] === column)) {
    throw new SourceParseError(
      "The qualifications matrix header changed during parsing.",
    );
  }
  return { schema, rows: parsed.rows, header };
}

export function matrixField(
  row: DelimitedRow,
  column: QualificationColumn,
  schema: QualificationMatrixSchema,
): string {
  const index = schema.columns.indexOf(column);
  return index < 0 ? "" : (row.fields[index] ?? "");
}
