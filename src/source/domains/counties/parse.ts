/**
 * The 2025 Census Gazetteer counties layout.
 *
 * Pipe-delimited with padded cells and a declared 11-column width. Parsing goes
 * through the core delimited parser rather than `line.split("|")`, so a row of
 * the wrong width is a named defect instead of a silently shifted record.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";

export const GAZETTEER_COUNTY_COLUMNS = [
  "USPS",
  "GEOID",
  "GEOIDFQ",
  "ANSICODE",
  "NAME",
  "ALAND",
  "AWATER",
  "ALAND_SQMI",
  "AWATER_SQMI",
  "INTPTLAT",
  "INTPTLONG",
] as const;

export function parseGazetteerCounties(bytes: Uint8Array): DelimitedResult {
  return parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: true,
    expectedFieldCount: GAZETTEER_COUNTY_COLUMNS.length,
    trimFields: true,
  });
}
