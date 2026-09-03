/**
 * The three 2025 Gazetteer district layouts.
 *
 * They are not the same shape: the congressional file has nine columns and no
 * NAME, while the two state legislative files have ten and do. Declaring each
 * width separately is what keeps a missing NAME from shifting every area value
 * one column left.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";

export const GAZETTEER_CD_COLUMNS = [
  "USPS",
  "GEOID",
  "GEOIDFQ",
  "ALAND",
  "AWATER",
  "ALAND_SQMI",
  "AWATER_SQMI",
  "INTPTLAT",
  "INTPTLONG",
] as const;

export const GAZETTEER_SLD_COLUMNS = [
  "USPS",
  "GEOID",
  "GEOIDFQ",
  "NAME",
  "ALAND",
  "AWATER",
  "ALAND_SQMI",
  "AWATER_SQMI",
  "INTPTLAT",
  "INTPTLONG",
] as const;

export function parseGazetteerCongressional(
  bytes: Uint8Array,
): DelimitedResult {
  return parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: true,
    expectedFieldCount: GAZETTEER_CD_COLUMNS.length,
    trimFields: true,
  });
}

export function parseGazetteerStateLegislative(
  bytes: Uint8Array,
): DelimitedResult {
  return parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: true,
    expectedFieldCount: GAZETTEER_SLD_COLUMNS.length,
    trimFields: true,
  });
}
