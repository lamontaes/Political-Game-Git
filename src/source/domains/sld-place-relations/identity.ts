/**
 * Official identifiers used as oracles against the relationship compiler.
 *
 * These are Census place GEOIDs and published district GEOIDs, not names we
 * assigned and not interior-point guesses.
 */

import type { RelationChamber } from "./types";

export const PLACE_GEOID_PATTERN = /^\d{7}$/;
export const STATE_LEGISLATIVE_GEOID_PATTERN = /^\d{2}[0-9A-Z-]{3}$/;

export function isPlaceGeoid(value: string): boolean {
  return PLACE_GEOID_PATTERN.test(value);
}

export function isStateLegislativeGeoid(value: string): boolean {
  return STATE_LEGISLATIVE_GEOID_PATTERN.test(value);
}

export function isUnassignedResidualGeoid(geoid: string): boolean {
  const code = geoid.slice(2);
  return code === "ZZ" || code === "ZZZ";
}

export interface PlaceRelationVector {
  readonly placeGeoid: string;
  readonly chamber: RelationChamber;
  readonly membership: "whole-place" | "split";
  readonly districtGeoid: string | null;
  readonly note: string;
}

/**
 * Lexington-Fayette, Kentucky. A merged city-county that the 2024 SLDL file
 * intersects with more than one house district. Used as the split oracle.
 */
export const LEXINGTON_FAYETTE_PLACE_GEOID = "2146027";
/** Adak city, Alaska. Wholly inside House District 37 / Senate District S. */
export const ADAK_PLACE_GEOID = "0200065";

export const OFFICIAL_PLACE_RELATION_VECTORS: readonly PlaceRelationVector[] = [
  {
    placeGeoid: LEXINGTON_FAYETTE_PLACE_GEOID,
    chamber: "state-lower",
    membership: "split",
    districtGeoid: null,
    note: "Lexington-Fayette is split across Kentucky house districts; whole-place membership is refused.",
  },
  {
    placeGeoid: ADAK_PLACE_GEOID,
    chamber: "state-lower",
    membership: "whole-place",
    districtGeoid: "02037",
    note: "Adak city lies wholly in Alaska State House District 37 in the 2024 SLDL–place relationship file.",
  },
];
