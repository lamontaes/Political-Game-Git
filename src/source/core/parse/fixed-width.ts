/**
 * Fixed-width column reading.
 *
 * Column spans are declared as data so a layout change is a data change rather
 * than a code change, trailing-space handling is declared per field because
 * some publishers pad significant values, and a short line is a defect rather
 * than a silent truncation.
 */

import { hasUtf8ByteOrderMark } from "./delimited";
import type { ParseDefect, ParseResult } from "./errors";

export interface FixedWidthField {
  readonly name: string;
  /** 0-indexed, half-open: [start, end). */
  readonly span: readonly [number, number];
  /** Whether trailing spaces carry meaning for this field. */
  readonly trailingSpaces: "significant" | "trimmed";
}

export interface FixedWidthOptions {
  readonly fields: readonly FixedWidthField[];
  readonly skipLeadingLines?: number;
}

export interface FixedWidthRow {
  readonly line: number;
  readonly values: Readonly<Record<string, string>>;
}

const BOM = "\uFEFF";

/** Read fixed-width lines into named fields. */
export function parseFixedWidth(
  bytes: Uint8Array,
  options: FixedWidthOptions,
): ParseResult<FixedWidthRow> {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const hadByteOrderMark = hasUtf8ByteOrderMark(bytes);
  if (text.startsWith(BOM)) text = text.slice(BOM.length);

  const requiredWidth = options.fields.reduce(
    (widest, field) => Math.max(widest, field.span[1]),
    0,
  );

  const rows: FixedWidthRow[] = [];
  const defects: ParseDefect[] = [];
  const lines = text.split(/\r?\n/);
  const skip = options.skipLeadingLines ?? 0;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] as string;
    const lineNumber = index + 1;
    if (index < skip) continue;
    if (raw === "") continue;

    if (raw.length < requiredWidth) {
      defects.push({
        kind: "line-too-short",
        line: lineNumber,
        message: `Line ${lineNumber} is ${raw.length} characters; the declared layout needs ${requiredWidth}.`,
      });
      continue;
    }

    const values: Record<string, string> = {};
    for (const field of options.fields) {
      const cell = raw.slice(field.span[0], field.span[1]);
      values[field.name] =
        field.trailingSpaces === "trimmed"
          ? cell.trim()
          : cell.replace(/^\s+/, "");
    }
    rows.push({ line: lineNumber, values });
  }

  return { rows, defects, hadByteOrderMark };
}
