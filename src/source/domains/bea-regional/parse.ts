/**
 * Reading BEA regional tables.
 *
 * Two things about these files need saying. First, BEA pads a space before each
 * quoted field, which a strict RFC 4180 reader records as part of the value; the
 * delimited parser has a named option for that and this domain sets it.
 * Second, every table ends with a handful of one-column footnote lines. They
 * are the Bureau's own notes, not malformed rows, so they are separated out and
 * counted rather than reported as defects — while a row of any *other* unexpected
 * width still is one.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedRow, ParseDefect } from "../../core/index";

export interface BeaTable {
  readonly header: readonly string[];
  readonly rows: readonly DelimitedRow[];
  readonly footnoteLines: readonly string[];
  readonly defects: readonly ParseDefect[];
  /** The year columns, in published order. */
  readonly years: readonly string[];
}

const NON_YEAR_COLUMNS = 8;

export function parseBeaTable(
  bytes: Uint8Array,
  encoding: "utf-8" | "latin1",
): BeaTable {
  // No declared width is passed, because these tables legitimately end with
  // one-column footnote lines and a width check would report each of them as a
  // malformed row and drop it. The header is taken here and the partition below
  // decides what each row is.
  const parsed = parseDelimited(bytes, {
    delimiter: ",",
    trimFields: true,
    allowWhitespaceBeforeQuote: true,
    encoding,
  });
  const header = parsed.rows[0]?.fields ?? [];

  const rows: DelimitedRow[] = [];
  const footnoteLines: string[] = [];
  const defects: ParseDefect[] = [...parsed.defects];

  for (const row of parsed.rows.slice(1)) {
    if (row.fields.length === header.length) {
      rows.push(row);
    } else if (row.fields.length === 1) {
      footnoteLines.push(row.fields[0] as string);
    } else {
      defects.push({
        kind:
          row.fields.length > header.length ? "row-too-wide" : "row-too-narrow",
        line: row.line,
        message: `Line ${row.line} has ${row.fields.length} columns; the table declares ${header.length} and its footnotes are single-column.`,
      });
    }
  }

  return {
    header,
    rows,
    footnoteLines,
    defects,
    years: header.slice(NON_YEAR_COLUMNS),
  };
}

/** Line-code descriptions from the Bureau's own table definition XML. */
export function parseBeaTableDefinition(
  bytes: Uint8Array,
): ReadonlyMap<string, string> {
  const xml = Buffer.from(bytes).toString("utf-8");
  const descriptions = new Map<string, string>();
  for (const match of xml.matchAll(/<LINE>([\s\S]*?)<\/LINE>/g)) {
    const body = match[1] ?? "";
    const code = /<Code>([\s\S]*?)<\/Code>/.exec(body)?.[1]?.trim();
    const description = /<Description>([\s\S]*?)<\/Description>/
      .exec(body)?.[1]
      ?.trim();
    if (code && description) descriptions.set(code, description);
  }
  return descriptions;
}
