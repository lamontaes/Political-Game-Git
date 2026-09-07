/**
 * Reading a Government Units listing.
 *
 * The listing is tab-separated, one row per government, with the fields this
 * domain needs to establish government identity. The exact column layout of the
 * Census public-use file is confirmed against the publisher's documentation at
 * acquisition time (see the production gate in `index.ts`); this schema is the
 * shape the compiler reads, and the fixture supplies it byte-for-byte.
 *
 * Tabs specifically, with a width check, because a value-bearing column can
 * contain spaces (a government name), and a delimiter that a transport step can
 * silently collapse produces a one-column file that reads as if it parsed.
 */

import { SourceParseError, parseDelimited } from "../../core/index";
import type { DelimitedRow } from "../../core/index";

export const GOVERNMENT_UNIT_COLUMNS = [
  "government_id",
  "government_name",
  "state_usps",
  "state_fips",
  "government_type",
  "status",
  "vintage",
  "census_place_geoid",
  "county_geoid",
] as const;

export type GovernmentUnitColumn = (typeof GOVERNMENT_UNIT_COLUMNS)[number];

export interface GovernmentUnitTable {
  readonly rows: readonly DelimitedRow[];
  readonly header: readonly string[];
}

/** Parse a Government Units listing, refusing anything that is not the shape. */
export function parseGovernmentUnitsListing(
  bytes: Uint8Array,
): GovernmentUnitTable {
  const parsed = parseDelimited(bytes, {
    delimiter: "\t",
    hasHeaderRow: true,
    expectedFieldCount: GOVERNMENT_UNIT_COLUMNS.length,
    trimFields: true,
  });

  const header = parsed.header ?? [];
  if (header.length !== GOVERNMENT_UNIT_COLUMNS.length) {
    throw new SourceParseError(
      `A Government Units listing has ${GOVERNMENT_UNIT_COLUMNS.length} tab-separated columns; this one has ${header.length}. If it reads as one column, its tab characters did not survive transport.`,
    );
  }
  for (const [index, expected] of GOVERNMENT_UNIT_COLUMNS.entries()) {
    if (header[index] !== expected) {
      throw new SourceParseError(
        `Column ${index + 1} of the Government Units listing is "${header[index]}"; the schema declares "${expected}".`,
      );
    }
  }
  if (parsed.defects.length > 0) {
    throw new SourceParseError(
      `The Government Units listing produced ${parsed.defects.length} parse defects, the first being: ${parsed.defects[0]?.message}`,
    );
  }

  return { rows: parsed.rows, header };
}

/** Read a named column out of a listing row. */
export function listingField(
  row: DelimitedRow,
  column: GovernmentUnitColumn,
): string {
  return row.fields[GOVERNMENT_UNIT_COLUMNS.indexOf(column)] ?? "";
}
