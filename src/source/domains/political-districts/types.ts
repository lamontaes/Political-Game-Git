/**
 * Legislative district geography.
 *
 * A record establishes that the Census Bureau publishes a district with this
 * identifier, this area and this interior point, in this state, for this
 * chamber. It establishes nothing about who represents it, which party holds
 * it, how it was drawn, or whether it is competitive. Geography is not
 * election outcome and not legal power.
 *
 * The Gazetteer's congressional-districts file publishes no NAME column, so
 * congressional records carry no name. That absence is preserved rather than
 * filled: a name this substrate invented and then displayed would be a fact the
 * publisher never stated.
 */

import type { Evidence } from "../../core/index";

export type DistrictChamber = "congressional" | "state-lower" | "state-upper";

export interface DistrictInteriorPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface PoliticalDistrictRecord {
  /** `${chamber}:${geoid}` — unique across the three files, which reuse GEOIDs. */
  readonly recordId: string;
  readonly chamber: DistrictChamber;
  /** State FIPS followed by the district code, as published. */
  readonly geoid: string;
  readonly geoidFq: string;
  readonly stateFips: string;
  readonly stateUsps: string;
  /**
   * The district code as published: two digits for congressional districts,
   * three for state legislative districts, and `ZZ`/`ZZZ` where the Census
   * assigns territory to no district.
   */
  readonly districtCode: string;
  /**
   * The published district name, where the product publishes one.
   *
   * `null` for congressional districts, whose file has no NAME column at all.
   */
  readonly sourceName: string | null;
  /** True for the Census residual codes `ZZ` and `ZZZ`. */
  readonly isUnassignedResidual: boolean;
  readonly landAreaSquareMeters: number;
  readonly waterAreaSquareMeters: number;
  readonly landAreaSquareMiles: number;
  readonly waterAreaSquareMiles: number;
  readonly interiorPoint: DistrictInteriorPoint;
  readonly evidence: Evidence;
}
