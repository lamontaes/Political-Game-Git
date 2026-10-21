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
import { makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { OPENING_PUBLIC_PAY_STOPGAP } from "./opening-public-pay";
import { corePlaceByKey, type CorePlace } from "./place-lookup";
import { stopgap } from "./stopgaps";
import { governmentUnitJurisdictionId } from "./reference/government-units";
import type { PublicGovernmentIdentity } from "./kernel/brands";
import type {
  CoreInput,
  OrganizationInput,
  PublicPayAuthorityInput,
  Source,
  WorkCommitmentInput,
} from "./types";

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

/**
 * The public school district as a department of the town's own government: it
 * joins that government's pay group (the owner another department already
 * holds, else the district itself) and carries its own pay authority, so the
 * treasury pays its teachers on every payday like any other department.
 */
export function withDistrictPayAuthority(
  input: Pick<CoreInput, "organizations" | "placeMetadata" | "startedAt">,
  district: OrganizationInput,
  commitments: readonly WorkCommitmentInput[],
): {
  district: OrganizationInput;
  commitments: readonly WorkCommitmentInput[];
} {
  const key = input.placeMetadata?.placeKey;
  const place = key ? corePlaceByKey(key) : null;
  const town = place ? townGovernmentOf(place) : undefined;
  if (!town || town.identity.kind !== "local-government")
    return { district, commitments };
  stopgap("SG-WORLD-department-government");
  const at = makeIsoDate(input.startedAt);
  const governmentKey = town.identity.governmentKey;
  const ownerId =
    input.organizations.find(
      (row) => row.publicPayAuthority?.governmentKey === governmentKey,
    )?.publicPayAuthority?.ownerId ?? district.id;
  const link = departmentLinkSource(district.source, district.id);
  const authority: PublicPayAuthorityInput = {
    id: `opening-public-pay:${stableHash(
      JSON.stringify([
        district.id,
        governmentKey,
        town.identity.jurisdictionId,
      ]),
    )}`,
    ownerId,
    governmentKey,
    jurisdictionId: town.identity.jurisdictionId,
    workCommitmentIds: commitments.map((row) => row.id),
    basisRecordIds: [district.id],
    source: {
      ...link,
      asOf: at,
      citation: `${link.citation} ${OPENING_PUBLIC_PAY_STOPGAP}`,
    },
  };
  return {
    district: {
      ...district,
      governmentFacts: town.governmentFacts,
      publicPayAuthority: authority,
      ...(ownerId === district.id ? { outsideFlow: authority.source } : {}),
    },
    commitments: commitments.map((row) => ({
      ...row,
      publicPayAuthorityId: authority.id,
    })),
  };
}
