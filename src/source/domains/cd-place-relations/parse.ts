/**
 * Census 119th CD to 2020 Place national relationship file layout.
 *
 * Seventeen pipe-delimited columns (the core decoder drops the file's UTF-8
 * byte-order mark). Rows with an
 * empty place GEOID are a district's remainder outside every place; they are
 * kept for the normalizer to skip, not filled in.
 */

import { parseDelimited } from "../../core/index";
import type { DelimitedResult } from "../../core/index";

export const CD_PLACE_COLUMNS = [
  "OID_CD119_20",
  "GEOID_CD119_20",
  "NAMELSAD_CD119_20",
  "AREALAND_CD119_20",
  "AREAWATER_CD119_20",
  "MTFCC_CD119_20",
  "FUNCSTAT_CD119_20",
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

export function parseCdPlaceRelations(bytes: Uint8Array): DelimitedResult {
  const parsed = parseDelimited(bytes, {
    delimiter: "|",
    hasHeaderRow: true,
    expectedFieldCount: CD_PLACE_COLUMNS.length,
    trimFields: true,
  });
  if (
    parsed.header === null ||
    parsed.header.length !== CD_PLACE_COLUMNS.length ||
    parsed.header.some((name, index) => name !== CD_PLACE_COLUMNS[index])
  ) {
    return {
      ...parsed,
      rows: [],
      defects: [
        ...parsed.defects,
        {
          kind: "unparsable-record",
          line: 1,
          message:
            "The congressional relationship file header is not the published 17-column layout.",
        },
      ],
    };
  }
  return parsed;
}
