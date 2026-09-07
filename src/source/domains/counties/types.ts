/**
 * County and county-equivalent identity.
 *
 * A row here establishes that the Census Bureau lists this county-equivalent
 * under this identifier, with this published name, area and interior point. It
 * establishes nothing about what the county government may do: powers,
 * home-rule status, officeholders and elections are separate facts requiring
 * separate first-party evidence (32A §10).
 *
 * The Gazetteer publishes a complete row for every record — no cell in the 2025
 * national file is blank — so the record cites its row once and its fields are
 * the values that row states. Uncertainty in this substrate is spelled
 * `Sourced<T>`, and it appears in the domains that actually have some.
 */

import type { Evidence } from "../../core/index";

/** A published interior point. Census computes it; it is not a centroid claim. */
export interface InteriorPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface CountyRecord {
  /** State FIPS + county FIPS, as published. */
  readonly geoid: string;
  /** The fully qualified Census identifier, `0500000US{geoid}`. */
  readonly geoidFq: string;
  readonly stateFips: string;
  readonly countyFips: string;
  readonly stateUsps: string;
  /** ANSI/GNIS feature code for the governmental unit. */
  readonly ansiCode: string;
  /** The Census NAME field verbatim, e.g. "Baltimore city", "Acadia Parish". */
  readonly sourceName: string;
  /**
   * A disambiguated label derived from `sourceName`.
   *
   * This is a derivation, not a published field, and it exists because Maryland,
   * Missouri and Virginia each contain an independent city and a county of the
   * same name. The derivation rule is stated in `normalize.ts` and tested; it
   * never mutates the ANSI code or the GEOID.
   */
  readonly displayName: string;
  readonly landAreaSquareMeters: number;
  readonly waterAreaSquareMeters: number;
  readonly landAreaSquareMiles: number;
  readonly waterAreaSquareMiles: number;
  readonly interiorPoint: InteriorPoint;
  /** Which row of which artifact said all of this. */
  readonly evidence: Evidence;
}
