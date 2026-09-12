/**
 * Census 2024 SLDL/SLDU to 2020 Place national relationship file layout.
 *
 * Seventeen pipe-delimited columns. Empty district GEOIDs occur where the
 * publisher lists a place that has no district of that chamber (Nebraska has
 * no lower chamber; DC has no state legislature). Those rows are kept for the
 * normalizer to skip; they are not filled in.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";
import type { RelationChamber } from "./types";

export const SLDL_PLACE_COLUMNS = [
  "OID_SLDL2024_20",
  "GEOID_SLDL2024_20",
  "NAMELSAD_SLDL2024_20",
  "AREALAND_SLDL2024_20",
  "AREAWATER_SLDL2024_20",
  "MTFCC_SLDL2024_20",
  "FUNCSTAT_SLDL2024_20",
  "OID_PLACE_20",
  "GEOID_PLACE_20",
  "NAMELSAD_PLACE_20",
  "AREALAND_PLACE_20",
  "AREAWATER_PLACE_20",
  "MTFCC_PLACE_20",
  "CLASSFP_PLACE_20",
  "FUNCSTAT_PLACE_20",
  "AREALAND_PART",
  "AREAWATER_PART",
] as const;

export const SLDU_PLACE_COLUMNS = [
  "OID_SLDU2024_20",
  "GEOID_SLDU2024_20",
  "NAMELSAD_SLDU2024_20",
  "AREALAND_SLDU2024_20",
  "AREAWATER_SLDU2024_20",
  "MTFCC_SLDU2024_20",
  "FUNCSTAT_SLDU2024_20",
  "OID_PLACE_20",
  "GEOID_PLACE_20",
  "NAMELSAD_PLACE_20",
  "AREALAND_PLACE_20",
  "AREAWATER_PLACE_20",
  "MTFCC_PLACE_20",
  "CLASSFP_PLACE_20",
  "FUNCSTAT_PLACE_20",
  "AREALAND_PART",
  "AREAWATER_PART",
] as const;

export function columnsForChamber(chamber: RelationChamber): readonly string[] {
  return chamber === "state-lower" ? SLDL_PLACE_COLUMNS : SLDU_PLACE_COLUMNS;
}

export function districtGeoidColumn(chamber: RelationChamber): string {
  return chamber === "state-lower" ? "GEOID_SLDL2024_20" : "GEOID_SLDU2024_20";
}

export function parseSldPlaceRelations(
  bytes: Uint8Array,
  chamber: RelationChamber,
): DelimitedResult {
  const columns = columnsForChamber(chamber);
  const parsed = parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: true,
    expectedFieldCount: columns.length,
    trimFields: true,
  });
  if (
    parsed.header === null ||
    parsed.header.length !== columns.length ||
    parsed.header.some((name, index) => name !== columns[index])
  ) {
    return {
      ...parsed,
      rows: [],
      defects: [
        ...parsed.defects,
        {
          kind: "unparsable-record",
          line: 1,
          message: `The ${chamber} relationship file header is not the published 17-column layout.`,
        },
      ],
    };
  }
  return parsed;
}
