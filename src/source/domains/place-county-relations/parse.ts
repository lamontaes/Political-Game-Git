/**
 * The committed summary-level-155 slice, read through the core delimited
 * parser: 97 pipe-delimited fields, no header. The encoding is declared per
 * state because the publisher's files do not all match their documentation
 * (see `LATIN1_GEOHEADER_STATES`).
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";
import { GEO_FIELD_COUNT } from "./acquisition";

export function parsePlaceCountyParts(
  bytes: Uint8Array,
  encoding: "utf-8" | "latin1" = "utf-8",
): DelimitedResult {
  return parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: false,
    expectedFieldCount: GEO_FIELD_COUNT,
    trimFields: false,
    encoding,
  });
}
