/**
 * Government-unit identity records.
 *
 * A record answers exactly one question: does the Census Bureau list this
 * government, under this identifier, with this name, state, type and status?
 * Everything a later system will want to know about the government's *powers*
 * is deliberately absent — see `FORBIDDEN_GOVERNANCE_KEYS` in `identity.ts`.
 *
 * Three identities are kept strictly apart, because 42A's central caveat is
 * that they are routinely confused:
 *
 *  - The *government* is this record: an institution with a Census government
 *    ID.
 *  - A *Census place* (an incorporated place or CDP, with a 7-digit place
 *    GEOID) is a geography, not a government. A place named the same as a
 *    municipality is not proven to be that municipality.
 *  - A *county geography* (a county or county-equivalent, from the counties
 *    domain) is a geography, not a government. Connecticut and Rhode Island
 *    have county geographies with no county governments at all.
 *
 * So the record carries no place GEOID and no county GEOID as an identity
 * field. Where a later crosswalk artifact establishes such a link it is carried
 * in `crosswalk`, as a `Sourced` value that is unresolved until the source
 * establishes it — never matched by name.
 */

import type { Evidence, Sourced } from "../../core/index";
import type { GovernmentType, GovernmentTypeCode } from "./identity";

/**
 * The truthful seam to canonical geographies.
 *
 * Each target is `Sourced` so that "the source does not establish this link"
 * (`UNKNOWN`) is a first-class, type-enforced state distinct from "this link is
 * meaningless for this kind of government" (`NOT_APPLICABLE`) and from "the
 * source establishes it" (`KNOWN`). A crosswalk match the Government Units
 * listing does not itself publish is preserved as unresolved rather than
 * manufactured from a shared name.
 */
export interface GovernmentUnitCrosswalk {
  /** The government's Census place, where a place crosswalk is applicable. */
  readonly censusPlace: Sourced<string>;
  /** The county or county-equivalent geography, as a county GEOID. */
  readonly countyOrEquivalent: Sourced<string>;
  /** The school-district geography, for a school-district government. */
  readonly schoolDistrictGeography: Sourced<string>;
  /** The special-district geography, for a special-district government. */
  readonly specialDistrictGeography: Sourced<string>;
}

export interface GovernmentUnitRecord {
  /** The 14-digit Census government identifier, verbatim and stable. */
  readonly censusGovernmentId: string;
  /** Position 1-2 of the ID: the Census state code (not a FIPS code). */
  readonly stateCensusCode: string;
  /** Position 3 of the ID: the government-type digit. */
  readonly governmentTypeCode: GovernmentTypeCode;
  /** Position 4-6 of the ID: the Census county code (000 when not county-bound). */
  readonly countyCensusCode: string;
  /** Position 7-9 of the ID: the unit code within its county and type. */
  readonly unitCensusCode: string;
  /** Position 10-14 of the ID: the supplement code. */
  readonly supplementCensusCode: string;
  /** The classification, derived from the ID's type digit. */
  readonly governmentType: GovernmentType;
  /** The government name, as the listing publishes it. */
  readonly name: string;
  /** The two-letter USPS state abbreviation the listing carries. */
  readonly stateUsps: string;
  /** The state FIPS code where the source supplies one; null when it does not. */
  readonly stateFips: string | null;
  /**
   * Whether the unit is an active government, as the source states it.
   *
   * `KNOWN(true)` and `KNOWN(false)` are both things a source can state; a row
   * with no status is `UNKNOWN`, which carries no value — missing is not the
   * same as inactive, and neither is the same as not-applicable.
   */
  readonly active: Sourced<boolean>;
  /**
   * The one parent relationship the source always establishes: the state.
   *
   * The government ID encodes a state and the listing prints its USPS code, so
   * every unit's state parent is source-supported. A unit's *county* is a
   * geographic locator (`countyCensusCode`), not a governing parent, and lives
   * in the crosswalk rather than here.
   */
  readonly parentStateRelationship: Sourced<string>;
  /** The truthful, mostly-unresolved seam to canonical geographies. */
  readonly crosswalk: GovernmentUnitCrosswalk;
  /** The listing's reference year, e.g. "2025". */
  readonly sourceVintage: string;
  /** Which row of which artifact stated all of this. */
  readonly evidence: Evidence;
}
