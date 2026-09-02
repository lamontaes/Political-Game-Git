/**
 * Crosswalk between a governance profile and an enumerated government unit.
 *
 * Two layers describe the same real thing from different sources:
 *
 *   government-universe  — the Census enumerated this unit (existence, class,
 *                          function), keyed by 14-digit Census Government ID.
 *   governance profile   — the law gives this jurisdiction these offices and
 *                          powers, keyed by profile identity with citations.
 *
 * Joining them is useful and easy to get wrong. The wrong version reads a
 * Census class off the universe record and fills in governance fields the
 * profile has not researched — a county exists, therefore it has a commission,
 * therefore the commission is elected. This module joins the two by identifier
 * and reports what agrees, what conflicts, and what remains unresearched. It
 * never transfers a value from one side to the other.
 */

import {
  getStateByPostal,
  parseCensusGovId,
} from "../government-universe/census_id.js";
import type { GovernmentClass } from "../government-universe/types.js";
import { isKnown } from "../sourced-value.js";
import type { JurisdictionProfile, JurisdictionType } from "./types.js";

/**
 * How a jurisdiction type corresponds to a Census government class.
 *
 * This is a correspondence between two classification vocabularies, not an
 * inference: it says the Census would file a MUNICIPALITY under "municipal",
 * and nothing about what that municipality may do.
 */
const JURISDICTION_TYPE_TO_GOVERNMENT_CLASS: Partial<
  Record<JurisdictionType, GovernmentClass>
> = {
  FEDERAL: "federal",
  STATE: "state",
  COUNTY_EQUIVALENT: "county",
  MUNICIPALITY: "municipal",
  TOWNSHIP: "township",
  SPECIAL_DISTRICT: "special_district",
};

export type CrosswalkFinding =
  | { readonly kind: "no_census_gov_id"; readonly detail: string }
  | { readonly kind: "unparseable_census_gov_id"; readonly detail: string }
  | { readonly kind: "state_mismatch"; readonly detail: string }
  | { readonly kind: "class_mismatch"; readonly detail: string }
  | { readonly kind: "jurisdiction_type_unresolved"; readonly detail: string };

export interface CrosswalkResult {
  readonly profileId: string;
  /** The Census Government ID the profile claims, when it carries one. */
  readonly censusGovId: string | null;
  /** True only when every check that could run passed. */
  readonly consistent: boolean;
  readonly findings: readonly CrosswalkFinding[];
}

/**
 * Checks a governance profile's Census identifiers against what the Census
 * Government ID itself decodes to.
 *
 * An absent identifier is reported, not treated as a failure: most profiles
 * will not have been joined yet, and "not yet crosswalked" is a different state
 * from "crosswalked and wrong".
 */
export function crosswalkProfileToCensusGovId(
  profile: JurisdictionProfile,
): CrosswalkResult {
  const findings: CrosswalkFinding[] = [];
  const identity = profile.identity;

  const censusFips = identity.censusFips;
  const censusGovId = isKnown(censusFips)
    ? (censusFips.value.censusGovId ?? null)
    : null;

  if (censusGovId === null) {
    findings.push({
      kind: "no_census_gov_id",
      detail:
        "Profile carries no censusGovId, so it is not yet joined to an enumerated government unit.",
    });
    return {
      profileId: profile.profileId,
      censusGovId: null,
      consistent: false,
      findings,
    };
  }

  let parsed;
  try {
    parsed = parseCensusGovId(censusGovId);
  } catch (error) {
    findings.push({
      kind: "unparseable_census_gov_id",
      detail:
        error instanceof Error
          ? error.message
          : `censusGovId ${censusGovId} is not a valid 14-digit Census Government ID.`,
    });
    return {
      profileId: profile.profileId,
      censusGovId,
      consistent: false,
      findings,
    };
  }

  // State agreement, compared through the postal code so the Census state code
  // and the state FIPS code are never assumed to be the same numbering.
  const postal = identity.postalAbbreviation;
  if (isKnown(postal)) {
    const mapped = getStateByPostal(postal.value);
    if (mapped !== undefined && mapped.postal !== parsed.statePostal) {
      findings.push({
        kind: "state_mismatch",
        detail: `Profile state ${postal.value} does not match Census Gov ID state ${parsed.statePostal}.`,
      });
    }
  }

  // Class agreement.
  const jurisdictionType = identity.jurisdictionType;
  if (!isKnown(jurisdictionType)) {
    findings.push({
      kind: "jurisdiction_type_unresolved",
      detail:
        "Profile jurisdictionType is not KNOWN, so its class cannot be compared with the Census classification.",
    });
  } else {
    const expected =
      JURISDICTION_TYPE_TO_GOVERNMENT_CLASS[jurisdictionType.value];
    if (expected !== undefined && expected !== parsed.governmentType) {
      findings.push({
        kind: "class_mismatch",
        detail: `Profile jurisdictionType ${jurisdictionType.value} corresponds to Census class ${expected}, but the Census Gov ID decodes to ${parsed.governmentType}.`,
      });
    }
  }

  return {
    profileId: profile.profileId,
    censusGovId,
    consistent: findings.length === 0,
    findings,
  };
}
