import type { EducationInstitution } from "../education/types";
import { institutionDateReason } from "../education/catalog";
import { recordOrganizationProfile } from "./life";
import { organizationProfileAt } from "./life-queries";
import { samePublicGovernmentIdentity } from "./public-government-identity";
import type {
  EntityId,
  IsoDate,
  LifeRecordProvenance,
  PublicGovernmentIdentity,
  World,
} from "./types";

/** The government employer is independently sourced, never derived from the directory parent. */
export interface SchoolEmployerGovernmentInput {
  readonly stableKey: string;
  readonly organizationId: EntityId;
  readonly institution: EducationInstitution;
  readonly publicGovernmentIdentity: PublicGovernmentIdentity;
  readonly effectiveAt: IsoDate;
  readonly provenance: Extract<LifeRecordProvenance, { kind: "source-record" }>;
}

/**
 * Attach supplied employer evidence to an existing directory-backed school.
 * Directory existence alone does not admit a government identity. The caller
 * must supply independent employer evidence; the existing profile writer
 * validates its source date and the actual compiled government identity.
 */
export function recordSchoolEmployerGovernment(
  world: World,
  input: SchoolEmployerGovernmentInput,
): World {
  const organization = world.history.organizations.find(
    (row) => row.id === input.organizationId,
  );
  if (
    !organization ||
    organization.stableKey !== `edu-path7:institution:${input.institution.id}`
  )
    throw new Error(
      "The saved employer has no matching institution association.",
    );
  if (
    input.institution.kind !== "school" &&
    input.institution.kind !== "district"
  )
    throw new Error(
      "This employer binding requires a school or district directory record.",
    );
  const unavailable = institutionDateReason(
    input.institution,
    input.effectiveAt,
  );
  if (unavailable) throw new Error(unavailable);
  if (!input.institution.evidence.length)
    throw new Error(
      "The institution association requires directory source records.",
    );

  const recorded = world.history.organizationProfiles.find(
    (row) => row.stableKey === input.stableKey,
  );
  if (recorded) {
    if (
      recorded.organizationId !== input.organizationId ||
      recorded.effectiveAt !== input.effectiveAt ||
      !recorded.publicGovernmentIdentity ||
      !samePublicGovernmentIdentity(
        recorded.publicGovernmentIdentity,
        input.publicGovernmentIdentity,
      ) ||
      recorded.provenance.kind !== "source-record" ||
      recorded.provenance.reference !== input.provenance.reference ||
      recorded.provenance.asOf !== input.provenance.asOf
    )
      throw new Error(
        "The school employer binding key already names different evidence.",
      );
    return world;
  }
  const profile = organizationProfileAt(world, organization.id, {
    asOfDate: input.effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (!profile || profile.closed)
    throw new Error(
      "No open employer profile is visible at the evidence date.",
    );
  return recordOrganizationProfile(world, {
    stableKey: input.stableKey,
    organizationId: organization.id,
    effectiveAt: input.effectiveAt,
    name: profile.name,
    classification: profile.classification,
    locationJurisdictionId: profile.locationJurisdictionId,
    publicGovernmentIdentity: input.publicGovernmentIdentity,
    provenance: input.provenance,
    supersedesProfileId: profile.id,
  });
}
