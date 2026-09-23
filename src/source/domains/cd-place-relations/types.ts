/**
 * 119th Congressional District to 2020 Place intersection geography.
 *
 * A record says which published congressional districts a Census place
 * intersects. Exactly one intersecting district is whole-place membership;
 * more than one is a split whose intersecting districts are candidates, never
 * a largest-overlap pick. It is not an address, not an interior point, and not
 * proof that any particular person lives in a particular district.
 */

import type { Evidence } from "../../core/index";

export type CongressionalPlaceMembershipKind = "whole-place" | "split";

export interface CongressionalPlaceRelationRecord {
  /** `congressional:${placeGeoid}` */
  readonly recordId: string;
  readonly chamber: "congressional";
  /** 2020 Census place GEOID, as published in the relationship file. */
  readonly placeGeoid: string;
  readonly membership: CongressionalPlaceMembershipKind;
  /** The sole intersecting district when the place is whole; null when split. */
  readonly districtGeoid: string | null;
  /** Distinct intersecting district GEOIDs, sorted, residual codes included. */
  readonly intersectingDistrictGeoids: readonly string[];
  readonly placeLandAreaSquareMeters: number;
  readonly placeWaterAreaSquareMeters: number;
  readonly intersectionLandAreaSquareMeters: number;
  readonly intersectionWaterAreaSquareMeters: number;
  readonly evidence: Evidence;
}
