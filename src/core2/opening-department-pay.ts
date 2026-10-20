/**
 * The government a town department belongs to, so its staff are paid from
 * that government's treasury (budgets calls api.fundPublicPay for every
 * employer that carries a pay authority). Without this link a department
 * holds no cash and no pay link and its workers are never paid.
 */
import departments from "./data/opening/department-governments.json" with { type: "json" };
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import {
  federalJurisdictionId,
  stateJurisdictionId,
} from "./government-jurisdictions";
import type { CorePlace } from "./place-lookup";
import { governmentUnitJurisdictionId } from "./reference/government-units";
import type { PublicGovernmentIdentity } from "./kernel/brands";
import type { OrganizationInput, Source } from "./types";

export interface OpeningDepartmentGovernment {
  readonly identity: PublicGovernmentIdentity;
  readonly governmentFacts: NonNullable<OrganizationInput["governmentFacts"]>;
}

/**
 * The town's own government: its city or village, or where the place has
 * none, the township that governs it, or the county where it is unincorporated
 * (each a unit budgets opens a treasury for).
 */
export function townGovernmentOf(
  place: CorePlace,
): OpeningDepartmentGovernment | undefined {
  const local = placeLocalGovernmentUnits(place);
  const unit = local.municipal[0] ?? local.townships[0] ?? local.counties[0];
  if (!unit) return undefined;
  const jurisdictionId = governmentUnitJurisdictionId(unit);
  return {
    identity: {
      kind: "local-government",
      governmentKey: unit.id,
      jurisdictionId,
    },
    governmentFacts: {
      governmentKind: "local-government",
      governmentKey: unit.id,
      governmentJurisdictionId: jurisdictionId,
    },
  };
}

/** A jurisdiction-scoped government (a state or the nation) as an owner link. */
function jurisdictionGovernment(
  jurisdictionId: string,
): OpeningDepartmentGovernment {
  return {
    identity: { kind: "jurisdiction", jurisdictionId: jurisdictionId as never },
    governmentFacts: {
      governmentKind: "jurisdiction",
      governmentJurisdictionId: jurisdictionId,
    },
  };
}

/** The governments a place's departments may belong to. */
export interface OpeningDepartmentOwners {
  readonly town: OpeningDepartmentGovernment | undefined;
  readonly state: OpeningDepartmentGovernment | undefined;
  readonly federal: OpeningDepartmentGovernment;
}

export function departmentOwnersOf(place: CorePlace): OpeningDepartmentOwners {
  const stateId = place.stateJurisdictionKey
    ? stateJurisdictionId(place.stateJurisdictionKey)
    : undefined;
  return {
    town: townGovernmentOf(place),
    state: stateId ? jurisdictionGovernment(stateId) : undefined,
    federal: jurisdictionGovernment(federalJurisdictionId()),
  };
}

/** Which government owns a department of this classification, if the data names one. */
export function departmentGovernment(
  classification: string,
  owners: OpeningDepartmentOwners,
): OpeningDepartmentGovernment | undefined {
  const owning = (departments.owning as Record<string, string>)[classification];
  return owning === "town" || owning === "state" || owning === "federal"
    ? owners[owning]
    : undefined;
}

// stopgapId: SG-WORLD-department-government
/** The estimate behind a department's government link, citing the data's source. */
export function departmentLinkSource(base: Source, profileId: string): Source {
  return {
    ...base,
    tag: "ESTIMATED",
    citation: `${base.citation} ${departments.source}; organization profile ${profileId}. The owner link is an assumption, not an appropriation.`,
    estimatedFrom:
      "A town's police, fire, public works and public health departments are paid by its own government; the Census of Governments does not name which unit employs a given opening department.",
  };
}
