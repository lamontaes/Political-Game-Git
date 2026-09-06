/**
 * FEC bulk file reading.
 *
 * The bulk files are pipe-delimited and carry no header row; the column names
 * come from the Commission's separately published header CSV, so the schema is
 * evidence rather than an assumption. A row whose width disagrees with the
 * header is a named defect: the alternative is every field after the mismatch
 * silently holding its neighbour's value.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";

/** Read the column names out of an FEC header file. */
export function parseFecHeader(bytes: Uint8Array): readonly string[] {
  const parsed = parseDelimited(bytes, { delimiter: ",", trimFields: true });
  const first = parsed.rows[0];
  if (!first) throw new Error("The FEC header file is empty.");
  return first.fields;
}

/** Read a pipe-delimited FEC bulk file at the header's declared width. */
export function parseFecBulk(
  bytes: Uint8Array,
  columns: readonly string[],
): DelimitedResult {
  return parseDelimited(bytes, {
    delimiter: "|",
    expectedFieldCount: columns.length,
    trimFields: true,
  });
}
