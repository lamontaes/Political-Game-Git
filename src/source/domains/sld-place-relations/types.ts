/**
 * 2024 State Legislative District to 2020 Place intersection geography.
 *
 * A record says whether a Census place lies wholly inside one published
 * district of one chamber, or is split across more than one. It is not a
 * Gazetteer interior point, not a nearest-district assignment, and not proof
 * that any particular address or person lives there.
 */

import type { Evidence } from "../../core/index";

export type RelationChamber = "state-lower" | "state-upper";

export type PlaceDistrictMembershipKind = "whole-place" | "split";

export interface PlaceDistrictRelationRecord {
  /** `${chamber}:${placeGeoid}` */
  readonly recordId: string;
  readonly chamber: RelationChamber;
  /** 2020 Census place GEOID, as published in the relationship file. */
  readonly placeGeoid: string;
  readonly membership: PlaceDistrictMembershipKind;
  /**
   * The sole district GEOID when the place is wholly inside one district.
   * Null when the place is split. Residual ZZ/ZZZ codes are never stored here.
   */
  readonly districtGeoid: string | null;
  /** Distinct intersecting district GEOIDs, sorted, excluding empty cells. */
  readonly intersectingDistrictGeoids: readonly string[];
  readonly placeLandAreaSquareMeters: number;
  readonly placeWaterAreaSquareMeters: number;
  readonly intersectionLandAreaSquareMeters: number;
  readonly intersectionWaterAreaSquareMeters: number;
  readonly evidence: Evidence;
}
