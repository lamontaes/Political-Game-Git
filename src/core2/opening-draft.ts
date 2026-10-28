/**
 * The opening's draft: the plain record set the opening population is built
 * into before it becomes a `CoreInput`. It replaces the scratch old-engine
 * World the builder used to create, write people and jobs into, and throw
 * away (`core-old-engine-04-opening-population-no-throwaway-world`).
 *
 * Every id is derived exactly as the old world derived it (the world id from
 * the seed, each record from `${world.id}:${stableKey}`), so a town built
 * before and after this port is the same town by record id. Nothing here is
 * advanced, validated or saved: the draft is read once by the opening's own
 * builders (`opening-people`, `opening-town-jobs`, `opening-employment`,
 * `opening-work`, `opening-upbringing`) and then dropped.
 */
import type { EntityId, IsoDate } from "./kernel/brands";
import { makeIsoDate } from "./kernel/dates";
import { createStableId } from "./kernel/ids";
import { normalizeSeed } from "./kernel/rng";
import type { CoreJurisdiction } from "./place-lookup";
import type {
  OccupationClassification,
  OrganizationClassification,
  ScheduleRigidity,
  WorkAuthority,
  WorkRelationshipKind,
} from "./town-workplaces";
import type { StoredAppearance } from "./appearance";

/** The old world's generator stamp for a fixture-lineage world, kept so ids match. */
const DRAFT_GENERATOR_VERSION = "demo-world-v15";

export type GeneratedProvenance = {
  readonly kind: "generated";
  readonly generatorKey: string;
};
export type SourceRecordProvenance = {
  readonly kind: "source-record";
  readonly reference: string;
  readonly asOf: IsoDate;
};
export type AuthoredProvenance = {
  readonly kind: "authored";
  readonly note: string;
};
export type DraftProvenance =
  GeneratedProvenance | SourceRecordProvenance | AuthoredProvenance;

export interface DraftPersonFact {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly kind: string;
  readonly occurredAt: IsoDate;
  readonly endedAt?: IsoDate | null;
  readonly jurisdictionId: EntityId | null;
  readonly summary: string;
}

export interface DraftPersonIdentity {
  readonly gender: string;
  readonly pronouns: string;
}

export interface DraftPerson {
  readonly id: EntityId;
  readonly generationKey: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly identity?: DraftPersonIdentity;
  readonly appearance: StoredAppearance;
  readonly establishedFacts: readonly DraftPersonFact[];
}

export interface DraftHousehold {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly formedAt: IsoDate;
  readonly label: string;
  readonly provenance: GeneratedProvenance;
}

export interface DraftHouseholdLocation {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly householdId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly label: string;
  readonly kind: string;
  readonly provenance: GeneratedProvenance;
  readonly supersedesLocationId: null;
}

export interface DraftHouseholdMembership {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly householdId: EntityId;
  readonly startedAt: IsoDate;
  readonly provenance: GeneratedProvenance;
}

export interface DraftHouseholdMembershipState {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly membershipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: "resident";
  readonly residenceRole: "primary";
  readonly kind: string;
  readonly provenance: GeneratedProvenance;
  readonly supersedesStateId: null;
}

export interface DraftKinship {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personIds: readonly [EntityId, EntityId];
  readonly establishedAt: IsoDate;
  readonly kind: "lineal:parent-child";
  readonly provenance: GeneratedProvenance;
}

export interface DraftPartnership {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personIds: readonly [EntityId, EntityId];
  readonly startedAt: IsoDate;
  readonly kind: "legal:marriage";
  readonly provenance: GeneratedProvenance;
}

export interface DraftPartnershipState {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly partnershipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: "active";
  readonly provenance: GeneratedProvenance;
  readonly supersedesStateId: null;
}

export interface DraftOrganization {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly formedAt: IsoDate;
  readonly detailLevel: "lightweight";
  readonly provenance: DraftProvenance;
}

export interface DraftPublicGovernmentIdentity {
  readonly kind: "local-government";
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
}

export interface DraftOrganizationProfile {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly organizationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly name: string;
  readonly classification: OrganizationClassification;
  readonly locationJurisdictionId: EntityId | null;
  readonly publicGovernmentIdentity?: DraftPublicGovernmentIdentity;
  readonly provenance: DraftProvenance;
  readonly supersedesProfileId: null;
}

/** One recorded local government as the opening writes it (`gov-rules/local-governments.ts`). */
export type { LocalGovernmentOrganization as DraftGovernmentOrganization } from "./gov-rules/local-governments";

export interface DraftWorkRelationship {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly organizationId: EntityId | null;
  readonly recordedAt: IsoDate;
  readonly startedAt: IsoDate;
  readonly kind: WorkRelationshipKind;
  readonly compensation: "paid" | "unpaid" | "mixed";
  readonly authority: WorkAuthority;
  readonly dependency: "dependent" | "independent";
  readonly economicRisk: "organization-borne" | "person-borne";
  readonly provenance: GeneratedProvenance;
}

export interface DraftWorkStatus {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly workRelationshipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: "active";
  readonly reason: null;
  readonly provenance: GeneratedProvenance;
  readonly supersedesStatusId: null;
}

export interface DraftTimeDemand {
  readonly expectedWeekly: {
    readonly minimumHours: number;
    readonly maximumHours: number;
  };
  readonly attention: "moderate";
  readonly concurrency: "mostly-exclusive";
  readonly scheduleRigidity: ScheduleRigidity;
  readonly interruptibility: "limited";
  readonly locationJurisdictionId: EntityId;
}

export interface DraftWorkRole {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly workRelationshipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly title: string;
  readonly occupationClassification: OccupationClassification;
  readonly locationJurisdictionId: EntityId;
  readonly timeDemand: DraftTimeDemand;
  readonly provenance: GeneratedProvenance;
  readonly supersedesRoleId: null;
}

export interface OpeningDraftHistory {
  nextSequence: number;
  readonly households: DraftHousehold[];
  readonly householdLocations: DraftHouseholdLocation[];
  readonly householdMemberships: DraftHouseholdMembership[];
  readonly householdMembershipStates: DraftHouseholdMembershipState[];
  readonly kinshipRelationships: DraftKinship[];
  readonly partnerships: DraftPartnership[];
  readonly partnershipStates: DraftPartnershipState[];
  readonly organizations: DraftOrganization[];
  readonly organizationProfiles: DraftOrganizationProfile[];
  readonly workRelationships: DraftWorkRelationship[];
  readonly workStatuses: DraftWorkStatus[];
  readonly workRoles: DraftWorkRole[];
}

/**
 * The opening's draft. Built once per opening and written in place by the
 * opening's builders, in order; nothing reads it after `buildPopulation`
 * returns.
 */
export interface OpeningDraft {
  readonly id: EntityId;
  readonly seed: string;
  readonly currentDate: IsoDate;
  /** The opening date again, under the name the household builder reads. */
  readonly startedAt: IsoDate;
  readonly jurisdictions: Record<EntityId, CoreJurisdiction>;
  readonly people: Record<EntityId, DraftPerson>;
  readonly personOrder: EntityId[];
  readonly history: OpeningDraftHistory;
}

/** The same world id the old engine gave a fixture world of this seed. */
export function openingDraftId(seed: string): EntityId {
  return createStableId(
    "world",
    `${DRAFT_GENERATOR_VERSION}:${normalizeSeed(seed)}`,
  );
}

export function createOpeningDraft(input: {
  readonly seed: string;
  readonly currentDate: string;
  readonly jurisdictions: readonly CoreJurisdiction[];
}): OpeningDraft {
  const seed = normalizeSeed(input.seed);
  const jurisdictions: Record<EntityId, CoreJurisdiction> = {};
  for (const jurisdiction of input.jurisdictions)
    jurisdictions[jurisdiction.id] = jurisdiction;
  const currentDate = makeIsoDate(input.currentDate);
  return {
    id: openingDraftId(seed),
    seed,
    currentDate,
    startedAt: currentDate,
    jurisdictions,
    people: {},
    personOrder: [],
    history: {
      nextSequence: 0,
      households: [],
      householdLocations: [],
      householdMemberships: [],
      householdMembershipStates: [],
      kinshipRelationships: [],
      partnerships: [],
      partnershipStates: [],
      organizations: [],
      organizationProfiles: [],
      workRelationships: [],
      workStatuses: [],
      workRoles: [],
    },
  };
}

/** The next history sequence number, advancing the draft. */
export function takeSequence(draft: OpeningDraft): number {
  const sequence = draft.history.nextSequence;
  draft.history.nextSequence = sequence + 1;
  return sequence;
}

/** A person's current household memberships, in membership order. */
export function draftMembershipsOf(
  draft: OpeningDraft,
  personId: EntityId,
): readonly DraftHouseholdMembership[] {
  return draft.history.householdMemberships.filter(
    (row) => row.personId === personId,
  );
}

/** The people in a household, by id, as the old query returned them (sorted). */
export function draftHouseholdMembers(
  draft: OpeningDraft,
  householdId: EntityId,
): readonly EntityId[] {
  return draft.history.householdMemberships
    .filter((row) => row.householdId === householdId)
    .map((row) => row.personId)
    .sort();
}

/** The latest organization profile per organization at the opening date. */
export function draftOrganizationProfiles(
  draft: OpeningDraft,
): ReadonlyMap<EntityId, DraftOrganizationProfile> {
  const latest = new Map<EntityId, DraftOrganizationProfile>();
  for (const record of draft.history.organizationProfiles) {
    if (record.effectiveAt > draft.currentDate) continue;
    const held = latest.get(record.organizationId);
    if (
      !held ||
      record.effectiveAt > held.effectiveAt ||
      (record.effectiveAt === held.effectiveAt &&
        record.sequence > held.sequence)
    )
      latest.set(record.organizationId, record);
  }
  return latest;
}
