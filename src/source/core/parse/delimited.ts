/**
 * RFC 4180-class delimited parsing.
 *
 * Handles what `line.split(",")` cannot: quoted fields, delimiters and newlines
 * inside quotes, doubled quotes escaping a literal quote, trailing empty cells
 * that must stay distinguishable from absent ones, a BOM that is stripped and
 * recorded rather than silently prefixed onto the first header, and CRLF as
 * well as LF.
 *
 * An empty field and an absent field are different things and stay different.
 * Which `Sourced` state an empty cell means is the normalizer's decision, per
 * the provider's documentation — never the parser's.
 */

import type { ParseDefect, ParseResult } from "./errors";

export interface DelimitedOptions {
  readonly delimiter: string;
  /** Declared width. A row of another width is a defect, not a shifted row. */
  readonly expectedFieldCount?: number;
  /** Treat the first row as a header and return it separately. */
  readonly hasHeaderRow?: boolean;
  /** Some publishers ship pipe-delimited files with padded fields. */
  readonly trimFields?: boolean;
}

export interface DelimitedRow {
  /** 1-indexed line of the row's first character. */
  readonly line: number;
  readonly fields: readonly string[];
}

export interface DelimitedResult extends ParseResult<DelimitedRow> {
  readonly header: readonly string[] | null;
}

const BOM = "﻿";

/** Decode bytes as UTF-8, reporting a BOM and any replacement characters. */
function decode(bytes: Uint8Array): { text: string; hadBom: boolean } {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.startsWith(BOM)) {
    return { text: text.slice(BOM.length), hadBom: true };
  }
  return { text, hadBom: false };
}

/**
 * Parse delimited bytes into rows.
 *
 * The scanner is character-by-character because that is the only way quoted
 * newlines can work; a line-splitting pre-pass would already have destroyed
 * them.
 */
export function parseDelimited(
  bytes: Uint8Array,
  options: DelimitedOptions,
): DelimitedResult {
  const { delimiter } = options;
  if (delimiter.length !== 1) {
    throw new Error(`Delimiter must be one character; got "${delimiter}".`);
  }

  const { text, hadBom } = decode(bytes);
  const rows: DelimitedRow[] = [];
  const defects: ParseDefect[] = [];

  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;
  let sawAnyCharacterInRow = false;

  const pushField = (): void => {
    fields.push(options.trimFields ? field.trim() : field);
    field = "";
  };

  const pushRow = (): void => {
    pushField();
    // A blank line is not a one-empty-field row; publishers end files with one.
    if (fields.length === 1 && fields[0] === "" && !sawAnyCharacterInRow) {
      fields = [];
      return;
    }
    rows.push({ line: rowStartLine, fields });
    fields = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          // A doubled quote is one literal quote and does not end the field.
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field === "") {
      inQuotes = true;
      sawAnyCharacterInRow = true;
      continue;
    }
    if (char === delimiter) {
      pushField();
      sawAnyCharacterInRow = true;
      continue;
    }
    if (char === "\r") {
      // Swallow CR only when it is part of a CRLF terminator.
      if (text[index + 1] === "\n") continue;
    }
    if (char === "\n") {
      pushRow();
      line += 1;
      rowStartLine = line;
      sawAnyCharacterInRow = false;
      continue;
    }
    field += char;
    sawAnyCharacterInRow = true;
  }

  if (inQuotes) {
    defects.push({
      kind: "unterminated-quote",
      line: rowStartLine,
      message: `Row beginning at line ${rowStartLine} opens a quoted field that never closes.`,
    });
  }
  if (field !== "" || fields.length > 0 || sawAnyCharacterInRow) {
    pushRow();
  }

  let header: readonly string[] | null = null;
  let dataRows = rows;
  if (options.hasHeaderRow && rows.length > 0) {
    header = (rows[0] as DelimitedRow).fields;
    dataRows = rows.slice(1);
  }

  const expected =
    options.expectedFieldCount ?? (header ? header.length : undefined);
  const kept: DelimitedRow[] = [];
  if (expected === undefined) {
    kept.push(...dataRows);
  } else {
    for (const row of dataRows) {
      if (row.fields.length === expected) {
        kept.push(row);
      } else {
        defects.push({
          kind: row.fields.length > expected ? "row-too-wide" : "row-too-narrow",
          line: row.line,
          message: `Line ${row.line} has ${row.fields.length} fields; the declared width is ${expected}.`,
        });
      }
    }
  }

  if (text.includes("�")) {
    defects.push({
      kind: "non-utf8-byte",
      line: 0,
      message:
        "The artifact contains bytes that are not valid UTF-8; they decoded to replacement characters.",
    });
  }

  return { rows: kept, defects, hadByteOrderMark: hadBom, header };
}
