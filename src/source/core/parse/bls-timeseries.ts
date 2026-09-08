/**
 * The BLS time-series flat-file dialect.
 *
 * These files are not CSV. They are tab-separated with padded columns, and
 * footnote columns are legitimately empty — #73 reached for `.split(",")` on
 * one and read whole rows as a single field. Fields are trimmed because the
 * padding is layout, and empty fields are preserved because in this dialect an
 * empty footnote code means "no footnote", which is a fact.
 */

import { hasUtf8ByteOrderMark } from "./delimited";
import type { ParseDefect, ParseResult } from "./errors";

export interface BlsRow {
  readonly line: number;
  readonly values: Readonly<Record<string, string>>;
}

export interface BlsResult extends ParseResult<BlsRow> {
  readonly header: readonly string[];
}

const BOM = "\uFEFF";

/**
 * Parse a BLS flat file into header-named rows.
 *
 * The BLS series files use tab separation, but the data files pad the final
 * footnote column so that a row can legitimately end with whitespace and no
 * value. Splitting on tab preserves that; trimming each cell removes the
 * padding without removing the column.
 */
export function parseBlsTimeSeries(bytes: Uint8Array): BlsResult {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const hadByteOrderMark = hasUtf8ByteOrderMark(bytes);
  if (text.startsWith(BOM)) text = text.slice(BOM.length);

  const lines = text.split(/\r?\n/);
  const defects: ParseDefect[] = [];

  const headerLine = lines[0];
  if (headerLine === undefined || headerLine.trim() === "") {
    return { rows: [], defects, hadByteOrderMark, header: [] };
  }
  const header = headerLine.split("\t").map((cell) => cell.trim());

  const rows: BlsRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const raw = lines[index] as string;
    const lineNumber = index + 1;
    if (raw.trim() === "") continue;

    const cells = raw.split("\t").map((cell) => cell.trim());
    if (cells.length !== header.length) {
      defects.push({
        kind: cells.length > header.length ? "row-too-wide" : "row-too-narrow",
        line: lineNumber,
        message: `Line ${lineNumber} has ${cells.length} columns; the header declares ${header.length}.`,
      });
      continue;
    }

    const values: Record<string, string> = {};
    for (let column = 0; column < header.length; column += 1) {
      values[header[column] as string] = cells[column] as string;
    }
    rows.push({ line: lineNumber, values });
  }

  return { rows, defects, hadByteOrderMark, header };
}
