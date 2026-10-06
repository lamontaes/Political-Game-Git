import vectors from "./official-vectors.generated.json" with { type: "json" };
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

export const OFFICIAL_PLACE_RELATION_VECTORS =
  vectors as readonly PlaceRelationVector[];
