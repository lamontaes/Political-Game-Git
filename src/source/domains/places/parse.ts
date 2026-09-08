/**
 * The 2025 Census Gazetteer places layout.
 *
 * Thirteen pipe-delimited columns — two more than the counties file, because
 * places carry LSAD and FUNCSTAT. The width is declared so a short or long row
 * is a named defect rather than a record whose coordinates came out of the
 * area columns.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";

export const GAZETTEER_PLACE_COLUMNS = [
  "USPS",
  "GEOID",
  "GEOIDFQ",
  "ANSICODE",
  "NAME",
  "LSAD",
  "FUNCSTAT",
  "ALAND",
  "AWATER",
  "ALAND_SQMI",
  "AWATER_SQMI",
  "INTPTLAT",
  "INTPTLONG",
] as const;

export function parseGazetteerPlaces(bytes: Uint8Array): DelimitedResult {
  return parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: true,
    expectedFieldCount: GAZETTEER_PLACE_COLUMNS.length,
    trimFields: true,
  });
}
