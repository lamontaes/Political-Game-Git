import { addDays, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  assessLifeLoadAt,
  careResponsibilityStateHistory,
  fatigueAt,
  householdLocationHistory,
  householdMembershipStateHistory,
  organizationProfileHistory,
  partnershipStateHistory,
  workRoleHistory,
  workStatusHistory,
} from "./life-queries";
import { recordTemporaryState } from "./mind";
import {
  assertOpenTaxonomyKey,
  CARE_NAMESPACES,
  HOUSEHOLD_LOCATION_NAMESPACES,
  HOUSEHOLD_MEMBERSHIP_NAMESPACES,
  KINSHIP_NAMESPACES,
  LIFE_COMMITMENT_NAMESPACES,
  OCCUPATION_CLASSIFICATION_NAMESPACES,
  ORGANIZATION_CLASSIFICATION_NAMESPACES,
  PARTNERSHIP_NAMESPACES,
  WORK_RELATIONSHIP_NAMESPACES,
} from "./taxonomy";
import type {
  CareKind,
  CareResponsibility,
  CareResponsibilityShare,
  CareResponsibilityStateRecord,
  EffortMode,
  EntityId,
  HistoricalCutoff,
  Household,
  HouseholdLocationKind,
  HouseholdLocationRecord,
  HouseholdMembership,
  HouseholdMembershipKind,
  HouseholdMembershipStateRecord,
  KinshipKind,
  KinshipRelationship,
  LifeCommitmentKind,
  LifeCommitmentRecord,
  LifeLoadContributor,
  LifeLoadResolutionRecord,
  LifeRecordProvenance,
  MindStrength,
  OccupationClassification,
  Organization,
  OrganizationClassification,
  OrganizationProfileRecord,
  Partnership,
  PartnershipKind,
  PartnershipStateRecord,
  RecoveryLevel,
  ResidenceRole,
  TimeDemandProfile,
  WorkAuthority,
  WorkCompensation,
  WorkDependency,
  WorkEconomicRisk,
  WorkRelationship,
  WorkRelationshipKind,
  WorkRelationshipStatus,
  WorkRoleRecord,
  WorkStatusRecord,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

export interface CreateOrganizationInput {
  readonly stableKey: string;
  readonly formedAt: string;
  readonly detailLevel?: "lightweight" | "detailed";
  readonly provenance: LifeRecordProvenance;
  readonly initialProfile: {
    readonly name: string;
    readonly classification: OrganizationClassification;
    readonly locationJurisdictionId: EntityId | null;
  };
}

export interface RecordOrganizationProfileInput {
  readonly stableKey: string;
  readonly organizationId: EntityId;
  readonly effectiveAt: string;
  readonly name: string;
  readonly classification: OrganizationClassification;
  readonly locationJurisdictionId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesProfileId: EntityId;
}

export interface CreateWorkRelationshipInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly organizationId: EntityId | null;
  readonly startedAt: string;
  readonly initialStatus?: "active" | "expected";
  readonly kind: WorkRelationshipKind;
  readonly compensation: WorkCompensation;
  readonly authority: WorkAuthority;
  readonly dependency: WorkDependency;
  readonly economicRisk: WorkEconomicRisk;
  readonly provenance: LifeRecordProvenance;
  readonly initialRole: {
    readonly title: string;
    readonly occupationClassification: OccupationClassification | null;
    readonly locationJurisdictionId: EntityId | null;
    readonly timeDemand: TimeDemandProfile;
  };
}

export interface RecordWorkStatusInput {
  readonly stableKey: string;
  readonly workRelationshipId: EntityId;
  readonly effectiveAt: string;
  readonly status: WorkRelationshipStatus;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStatusId: EntityId;
}

export interface RecordWorkRoleInput {
  readonly stableKey: string;
  readonly workRelationshipId: EntityId;
  readonly effectiveAt: string;
  readonly title: string;
  readonly occupationClassification: OccupationClassification | null;
  readonly locationJurisdictionId: EntityId | null;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesRoleId: EntityId;
}

export interface CreateHouseholdInput {
  readonly stableKey: string;
  readonly formedAt: string;
  readonly label: string;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordHouseholdLocationInput {
  readonly stableKey: string;
  readonly householdId: EntityId;
  readonly effectiveAt: string;
  readonly jurisdictionId: EntityId;
  readonly label: string;
  readonly kind: HouseholdLocationKind;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesLocationId: EntityId | null;
}

export interface StartHouseholdMembershipInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly householdId: EntityId;
  readonly startedAt: string;
  readonly residenceRole: ResidenceRole;
  readonly kind: HouseholdMembershipKind;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordHouseholdMembershipStateInput {
  readonly stableKey: string;
  readonly membershipId: EntityId;
  readonly effectiveAt: string;
  readonly status: HouseholdMembershipStateRecord["status"];
  readonly residenceRole: ResidenceRole;
  readonly kind: HouseholdMembershipKind;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId;
}

export interface RecordKinshipInput {
  readonly stableKey: string;
  readonly personIds: readonly [EntityId, EntityId];
  readonly establishedAt: string;
  readonly kind: KinshipKind;
  readonly provenance: LifeRecordProvenance;
}

export interface CreatePartnershipInput {
  readonly stableKey: string;
  readonly personIds: readonly [EntityId, EntityId];
  readonly startedAt: string;
  readonly kind: PartnershipKind;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordPartnershipStateInput {
  readonly stableKey: string;
  readonly partnershipId: EntityId;
  readonly effectiveAt: string;
  readonly status: PartnershipStateRecord["status"];
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId;
}

export interface CreateCareResponsibilityInput {
  readonly stableKey: string;
  readonly caregiverPersonId: EntityId;
  readonly recipientPersonId: EntityId;
  readonly startedAt: string;
  readonly kind: CareKind;
  readonly share: CareResponsibilityShare;
  readonly context: string;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
}

export interface RecordCareResponsibilityStateInput {
  readonly stableKey: string;
  readonly careResponsibilityId: EntityId;
  readonly effectiveAt: string;
  readonly status: CareResponsibilityStateRecord["status"];
  readonly share: CareResponsibilityShare;
  readonly context: string;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId;
}

export interface RecordLifeCommitmentInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly kind: LifeCommitmentKind;
  readonly label: string;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
}

export interface ResolveLifeLoadPeriodInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly periodStartsAt: string;
  readonly periodEndsAt: string;
  readonly historySequenceExclusive?: number;
  readonly effortMode: EffortMode;
  readonly recovery: RecoveryLevel;
}

export function createOrganization(
  world: World,
  input: CreateOrganizationInput,
): World {
  assertUniqueStableKey(
    world.history.organizations,
    input.stableKey,
    "organization",
  );
  const formedAt = personIndependentDate(
    world,
    input.formedAt,
    "Organization formation",
  );
  validateLifeProvenance(world, input.provenance, formedAt);
  validateOrganizationProfile(
    world,
    input.initialProfile.name,
    input.initialProfile.classification,
    input.initialProfile.locationJurisdictionId,
  );
  const organization: Organization = {
    id: createStableId("organization", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    formedAt,
    detailLevel: input.detailLevel ?? "lightweight",
    provenance: cloneLifeProvenance(input.provenance),
  };
  const profileStableKey = `${input.stableKey}:profile:initial`;
  const profile: OrganizationProfileRecord = {
    id: createStableId(
      "organization-profile",
      `${world.id}:${profileStableKey}`,
    ),
    stableKey: profileStableKey,
    sequence: world.history.nextSequence + 1,
    organizationId: organization.id,
    effectiveAt: formedAt,
    name: input.initialProfile.name,
    classification: input.initialProfile.classification,
    locationJurisdictionId: input.initialProfile.locationJurisdictionId,
    provenance: cloneLifeProvenance(input.provenance),
    supersedesProfileId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    organizations: [...world.history.organizations, organization],
    organizationProfiles: [...world.history.organizationProfiles, profile],
  });
}

export function materializeOrganization(
  world: World,
  organizationId: EntityId,
): World {
  const organization = requireRecord(
    world.history.organizations,
    organizationId,
    "organization",
  );
  if (organization.detailLevel === "detailed") return world;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      organizations: world.history.organizations.map((candidate) =>
        candidate.id === organizationId
          ? { ...candidate, detailLevel: "detailed" as const }
          : candidate,
      ),
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function recordOrganizationProfile(
  world: World,
  input: RecordOrganizationProfileInput,
): World {
  const organization = requireRecord(
    world.history.organizations,
    input.organizationId,
    "organization",
  );
  const effectiveAt = personIndependentDate(
    world,
    input.effectiveAt,
    "Organization profile",
  );
  if (effectiveAt < organization.formedAt) {
    throw new Error("An organization profile cannot predate the organization.");
  }
  validateOrganizationProfile(
    world,
    input.name,
    input.classification,
    input.locationJurisdictionId,
  );
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const previous = organizationProfileHistory(world, organization.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesProfileId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error(
      "Organization profile must supersede its latest prior profile.",
    );
  }
  const record: OrganizationProfileRecord = {
    ...input,
    id: createStableId(
      "organization-profile",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "organizationProfiles", record);
}

export function createWorkRelationship(
  world: World,
  input: CreateWorkRelationshipInput,
): World {
  assertUniqueStableKey(
    world.history.workRelationships,
    input.stableKey,
    "work relationship",
  );
  const person = requirePerson(world, input.personId);
  const recordedAt = makeIsoDate(world.currentDate);
  const startedAt = makeIsoDate(input.startedAt);
  const initialStatus = input.initialStatus ?? "active";
  if (startedAt < person.birthDate) {
    throw new Error("A work relationship cannot predate the person.");
  }
  if (initialStatus === "active" && startedAt > recordedAt) {
    throw new Error("Active work cannot start in the future.");
  }
  if (initialStatus === "expected" && startedAt <= recordedAt) {
    throw new Error("Expected work must have a future start date.");
  }
  if (input.organizationId !== null) {
    const organization = requireRecord(
      world.history.organizations,
      input.organizationId,
      "organization",
    );
    if (organization.formedAt > recordedAt) {
      throw new Error(
        "A work relationship cannot be recorded before its organization exists.",
      );
    }
  }
  assertOpenTaxonomyKey(
    input.kind,
    WORK_RELATIONSHIP_NAMESPACES,
    "Work relationship kind",
  );
  validateWorkDimensions(input);
  validateRole(world, input.initialRole);
  validateLifeProvenance(world, input.provenance, recordedAt);
  const relationship: WorkRelationship = {
    id: createStableId("work-relationship", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    personId: person.id,
    organizationId: input.organizationId,
    recordedAt,
    startedAt,
    kind: input.kind,
    compensation: input.compensation,
    authority: input.authority,
    dependency: input.dependency,
    economicRisk: input.economicRisk,
    provenance: cloneLifeProvenance(input.provenance),
  };
  const statusKey = `${input.stableKey}:status:initial`;
  const status: WorkStatusRecord = {
    id: createStableId("work-status", `${world.id}:${statusKey}`),
    stableKey: statusKey,
    sequence: world.history.nextSequence + 1,
    workRelationshipId: relationship.id,
    effectiveAt: initialStatus === "expected" ? recordedAt : startedAt,
    status: initialStatus,
    reason: null,
    provenance: cloneLifeProvenance(input.provenance),
    supersedesStatusId: null,
  };
  const roleKey = `${input.stableKey}:role:initial`;
  const role: WorkRoleRecord = {
    id: createStableId("work-role", `${world.id}:${roleKey}`),
    stableKey: roleKey,
    sequence: world.history.nextSequence + 2,
    workRelationshipId: relationship.id,
    effectiveAt: initialStatus === "expected" ? recordedAt : startedAt,
    title: input.initialRole.title,
    occupationClassification: input.initialRole.occupationClassification,
    locationJurisdictionId: input.initialRole.locationJurisdictionId,
    timeDemand: cloneTimeDemand(input.initialRole.timeDemand),
    provenance: cloneLifeProvenance(input.provenance),
    supersedesRoleId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 3,
    workRelationships: [...world.history.workRelationships, relationship],
    workStatuses: [...world.history.workStatuses, status],
    workRoles: [...world.history.workRoles, role],
  });
}

export function recordWorkStatus(
  world: World,
  input: RecordWorkStatusInput,
): World {
  const relationship = requireRecord(
    world.history.workRelationships,
    input.workRelationshipId,
    "work relationship",
  );
  const effectiveAt = personDate(
    world,
    relationship.personId,
    input.effectiveAt,
    "Work status",
  );
  const previous = workStatusHistory(world, relationship.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesStatusId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error("Work status must supersede its latest prior status.");
  }
  if (previous.status === "ended") {
    throw new Error("An ended work relationship cannot be reactivated.");
  }
  if (previous.status === input.status) {
    throw new Error("A work status transition must change state.");
  }
  if (input.status === "expected") {
    throw new Error("Expected is only valid as the initial work status.");
  }
  if (input.status === "active" && effectiveAt < relationship.startedAt) {
    throw new Error(
      "Expected work cannot become active before its start date.",
    );
  }
  if (
    previous.status === "expected" &&
    input.status === "temporarily-inactive"
  ) {
    throw new Error("Expected work must become active or end before leave.");
  }
  if (input.status === "temporarily-inactive" || input.status === "ended") {
    assertNonEmpty(input.reason, "Work status reason");
  } else {
    assertOptional(input.reason, "Work status reason");
  }
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: WorkStatusRecord = {
    ...input,
    id: createStableId("work-status", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "workStatuses", record);
}

export function recordWorkRole(
  world: World,
  input: RecordWorkRoleInput,
): World {
  const relationship = requireRecord(
    world.history.workRelationships,
    input.workRelationshipId,
    "work relationship",
  );
  const effectiveAt = personDate(
    world,
    relationship.personId,
    input.effectiveAt,
    "Work role",
  );
  const previous = workRoleHistory(world, relationship.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesRoleId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error("Work role must supersede its latest prior role.");
  }
  if (workStatusHistory(world, relationship.id).at(-1)?.status === "ended") {
    throw new Error("An ended work relationship cannot receive a new role.");
  }
  validateRole(world, input);
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: WorkRoleRecord = {
    ...input,
    id: createStableId("work-role", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt,
    timeDemand: cloneTimeDemand(input.timeDemand),
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "workRoles", record);
}

export function createHousehold(
  world: World,
  input: CreateHouseholdInput,
): World {
  const formedAt = personIndependentDate(
    world,
    input.formedAt,
    "Household formation",
  );
  assertNonEmpty(input.label, "Household label");
  validateLifeProvenance(world, input.provenance, formedAt);
  const household: Household = {
    id: createStableId("household", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    formedAt,
    label: input.label,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "households", household);
}

export function recordHouseholdLocation(
  world: World,
  input: RecordHouseholdLocationInput,
): World {
  const household = requireRecord(
    world.history.households,
    input.householdId,
    "household",
  );
  const effectiveAt = personIndependentDate(
    world,
    input.effectiveAt,
    "Household location",
  );
  if (effectiveAt < household.formedAt) {
    throw new Error("A household location cannot predate the household.");
  }
  requireJurisdiction(world, input.jurisdictionId);
  assertNonEmpty(input.label, "Household location label");
  assertOpenTaxonomyKey(
    input.kind,
    HOUSEHOLD_LOCATION_NAMESPACES,
    "Household location kind",
  );
  const previous = householdLocationHistory(world, household.id).at(-1);
  if (
    (previous?.id ?? null) !== input.supersedesLocationId ||
    (previous && previous.effectiveAt > effectiveAt)
  ) {
    throw new Error(
      "Household location must supersede its latest prior location.",
    );
  }
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: HouseholdLocationRecord = {
    ...input,
    id: createStableId("household-location", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "householdLocations", record);
}

export function startHouseholdMembership(
  world: World,
  input: StartHouseholdMembershipInput,
): World {
  const person = requirePerson(world, input.personId);
  const household = requireRecord(
    world.history.households,
    input.householdId,
    "household",
  );
  const startedAt = personDate(
    world,
    person.id,
    input.startedAt,
    "Household membership",
  );
  if (startedAt < household.formedAt) {
    throw new Error("A household membership cannot predate the household.");
  }
  validateMembership(input.residenceRole, input.kind);
  validateLifeProvenance(world, input.provenance, startedAt);
  const membership: HouseholdMembership = {
    id: createStableId(
      "household-membership",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    personId: person.id,
    householdId: household.id,
    startedAt,
    provenance: cloneLifeProvenance(input.provenance),
  };
  const stateKey = `${input.stableKey}:state:initial`;
  const state: HouseholdMembershipStateRecord = {
    id: createStableId("household-membership-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence + 1,
    membershipId: membership.id,
    effectiveAt: startedAt,
    status: "resident",
    residenceRole: input.residenceRole,
    kind: input.kind,
    provenance: cloneLifeProvenance(input.provenance),
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    householdMemberships: [...world.history.householdMemberships, membership],
    householdMembershipStates: [
      ...world.history.householdMembershipStates,
      state,
    ],
  });
}

export function recordHouseholdMembershipState(
  world: World,
  input: RecordHouseholdMembershipStateInput,
): World {
  const membership = requireRecord(
    world.history.householdMemberships,
    input.membershipId,
    "household membership",
  );
  const effectiveAt = personDate(
    world,
    membership.personId,
    input.effectiveAt,
    "Household membership state",
  );
  const previous = householdMembershipStateHistory(world, membership.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesStateId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error(
      "Household membership state must supersede its latest prior state.",
    );
  }
  if (previous.status === "ended") {
    throw new Error("An ended household membership cannot be reopened.");
  }
  validateMembership(input.residenceRole, input.kind);
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: HouseholdMembershipStateRecord = {
    ...input,
    id: createStableId(
      "household-membership-state",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "householdMembershipStates", record);
}

export function recordKinship(world: World, input: RecordKinshipInput): World {
  const personIds = canonicalPair(
    world,
    input.personIds,
    input.establishedAt,
    "Kinship",
  );
  const establishedAt = makeIsoDate(input.establishedAt);
  assertOpenTaxonomyKey(input.kind, KINSHIP_NAMESPACES, "Kinship kind");
  validateLifeProvenance(world, input.provenance, establishedAt);
  const record: KinshipRelationship = {
    id: createStableId("kinship", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    personIds,
    establishedAt,
    kind: input.kind,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "kinshipRelationships", record);
}

export function createPartnership(
  world: World,
  input: CreatePartnershipInput,
): World {
  const personIds = canonicalPair(
    world,
    input.personIds,
    input.startedAt,
    "Partnership",
  );
  const startedAt = makeIsoDate(input.startedAt);
  assertOpenTaxonomyKey(input.kind, PARTNERSHIP_NAMESPACES, "Partnership kind");
  validateLifeProvenance(world, input.provenance, startedAt);
  const partnership: Partnership = {
    id: createStableId("partnership", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    personIds,
    startedAt,
    kind: input.kind,
    provenance: cloneLifeProvenance(input.provenance),
  };
  const stateKey = `${input.stableKey}:state:initial`;
  const state: PartnershipStateRecord = {
    id: createStableId("partnership-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence + 1,
    partnershipId: partnership.id,
    effectiveAt: startedAt,
    status: "active",
    provenance: cloneLifeProvenance(input.provenance),
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    partnerships: [...world.history.partnerships, partnership],
    partnershipStates: [...world.history.partnershipStates, state],
  });
}

export function recordPartnershipState(
  world: World,
  input: RecordPartnershipStateInput,
): World {
  const partnership = requireRecord(
    world.history.partnerships,
    input.partnershipId,
    "partnership",
  );
  const effectiveAt = pairDate(
    world,
    partnership.personIds,
    input.effectiveAt,
    "Partnership state",
  );
  const previous = partnershipStateHistory(world, partnership.id).at(-1);
  if (
    !previous ||
    previous.id !== input.supersedesStateId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error("Partnership state must supersede its latest prior state.");
  }
  if (previous.status === "ended") {
    throw new Error("An ended partnership cannot be reopened.");
  }
  if (input.status !== "ended") {
    throw new Error(
      "A partnership state transition must end the active relationship.",
    );
  }
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: PartnershipStateRecord = {
    ...input,
    id: createStableId("partnership-state", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt,
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "partnershipStates", record);
}

export function createCareResponsibility(
  world: World,
  input: CreateCareResponsibilityInput,
): World {
  if (input.caregiverPersonId === input.recipientPersonId) {
    throw new Error("A care responsibility requires two different people.");
  }
  const startedAt = pairDate(
    world,
    [input.caregiverPersonId, input.recipientPersonId],
    input.startedAt,
    "Care responsibility",
  );
  assertOpenTaxonomyKey(input.kind, CARE_NAMESPACES, "Care kind");
  validateCareState(world, input.share, input.context, input.timeDemand);
  validateLifeProvenance(world, input.provenance, startedAt);
  const responsibility: CareResponsibility = {
    id: createStableId("care-responsibility", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    caregiverPersonId: input.caregiverPersonId,
    recipientPersonId: input.recipientPersonId,
    startedAt,
    kind: input.kind,
    provenance: cloneLifeProvenance(input.provenance),
  };
  const stateKey = `${input.stableKey}:state:initial`;
  const state: CareResponsibilityStateRecord = {
    id: createStableId("care-state", `${world.id}:${stateKey}`),
    stableKey: stateKey,
    sequence: world.history.nextSequence + 1,
    careResponsibilityId: responsibility.id,
    effectiveAt: startedAt,
    status: "active",
    share: input.share,
    context: input.context,
    timeDemand: cloneTimeDemand(input.timeDemand),
    provenance: cloneLifeProvenance(input.provenance),
    supersedesStateId: null,
  };
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 2,
    careResponsibilities: [
      ...world.history.careResponsibilities,
      responsibility,
    ],
    careResponsibilityStates: [
      ...world.history.careResponsibilityStates,
      state,
    ],
  });
}

export function recordCareResponsibilityState(
  world: World,
  input: RecordCareResponsibilityStateInput,
): World {
  const responsibility = requireRecord(
    world.history.careResponsibilities,
    input.careResponsibilityId,
    "care responsibility",
  );
  const effectiveAt = pairDate(
    world,
    [responsibility.caregiverPersonId, responsibility.recipientPersonId],
    input.effectiveAt,
    "Care responsibility state",
  );
  const previous = careResponsibilityStateHistory(world, responsibility.id).at(
    -1,
  );
  if (
    !previous ||
    previous.id !== input.supersedesStateId ||
    previous.effectiveAt > effectiveAt
  ) {
    throw new Error("Care state must supersede its latest prior state.");
  }
  if (previous.status === "ended") {
    throw new Error("An ended care responsibility cannot be reopened.");
  }
  validateCareState(world, input.share, input.context, input.timeDemand);
  validateLifeProvenance(world, input.provenance, effectiveAt);
  const record: CareResponsibilityStateRecord = {
    ...input,
    id: createStableId("care-state", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt,
    timeDemand: cloneTimeDemand(input.timeDemand),
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "careResponsibilityStates", record);
}

export function recordLifeCommitment(
  world: World,
  input: RecordLifeCommitmentInput,
): World {
  const startsAt = personDate(
    world,
    input.personId,
    input.startsAt,
    "Life commitment",
  );
  const endsAt = input.endsAt === null ? null : makeIsoDate(input.endsAt);
  if (endsAt !== null && (endsAt <= startsAt || endsAt > world.currentDate)) {
    throw new Error(
      "A life commitment must use a valid past or current half-open interval.",
    );
  }
  assertOpenTaxonomyKey(
    input.kind,
    LIFE_COMMITMENT_NAMESPACES,
    "Life commitment kind",
  );
  assertNonEmpty(input.label, "Life commitment label");
  validateTimeDemand(world, input.timeDemand);
  validateLifeProvenance(world, input.provenance, startsAt);
  const record: LifeCommitmentRecord = {
    ...input,
    id: createStableId("life-commitment", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    startsAt,
    endsAt,
    timeDemand: cloneTimeDemand(input.timeDemand),
    provenance: cloneLifeProvenance(input.provenance),
  };
  return appendOne(world, "lifeCommitments", record);
}

export function resolveLifeLoadPeriod(
  world: World,
  input: ResolveLifeLoadPeriodInput,
): World {
  const person = requirePerson(world, input.personId);
  const periodStartsAt = makeIsoDate(input.periodStartsAt);
  const periodEndsAt = makeIsoDate(input.periodEndsAt);
  if (
    periodStartsAt < person.birthDate ||
    periodEndsAt !== addDays(periodStartsAt, 7) ||
    periodEndsAt > world.currentDate
  ) {
    throw new Error(
      "Life-load resolution requires a completed seven-day period within the person's life.",
    );
  }
  if (!["normal", "push", "recover"].includes(input.effortMode)) {
    throw new Error(`Invalid effort mode: ${String(input.effortMode)}`);
  }
  if (!["limited", "adequate", "substantial"].includes(input.recovery)) {
    throw new Error(`Invalid recovery level: ${String(input.recovery)}`);
  }
  if (
    world.history.lifeLoadResolutions.some(
      (record) =>
        record.personId === input.personId &&
        periodStartsAt < record.periodEndsAt &&
        record.periodStartsAt < periodEndsAt,
    )
  ) {
    throw new Error("Life-load periods cannot overlap for one person.");
  }
  const cutoff: HistoricalCutoff = {
    asOfDate: periodStartsAt,
    historySequenceExclusive:
      input.historySequenceExclusive ?? world.history.nextSequence,
  };
  const assessment = assessLifeLoadAt(world, input.personId, cutoff);
  const priorFatigue = fatigueAt(world, input.personId, cutoff);
  const resultingFatigue = resolveFatigue(
    assessment.loadBand,
    priorFatigue,
    input.effortMode,
    input.recovery,
  );
  const immediateOutputPotential = resolveImmediateOutput(
    priorFatigue,
    input.effortMode,
  );
  const futureCapacity = resolveFutureCapacity(
    priorFatigue,
    resultingFatigue,
    input.recovery,
  );
  assertUniqueStableKey(
    world.history.lifeLoadResolutions,
    input.stableKey,
    "life-load resolution",
  );
  const record: LifeLoadResolutionRecord = {
    id: createStableId(
      "life-load-resolution",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    personId: input.personId,
    periodStartsAt,
    periodEndsAt,
    cutoff,
    effortMode: input.effortMode,
    recovery: input.recovery,
    loadBand: assessment.loadBand,
    priorFatigue,
    resultingFatigue,
    immediateOutputPotential,
    futureCapacity,
    expectedWeekly: { ...assessment.expectedWeekly },
    exclusiveEquivalentWeekly: { ...assessment.exclusiveEquivalentWeekly },
    contributorRefs: assessment.contributors.map(cloneContributor),
  };
  if (resultingFatigue === null) {
    return appendOne(world, "lifeLoadResolutions", record);
  }
  const withResolution: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      lifeLoadResolutions: [...world.history.lifeLoadResolutions, record],
    },
  };
  return recordTemporaryState(withResolution, {
    stableKey: `${input.stableKey}:temporary-state:fatigue`,
    personId: input.personId,
    stateKey: "life:fatigue",
    label: "Recovery debt from recent life load",
    recordedAt: periodEndsAt,
    startsAt: periodEndsAt,
    endsAt: addDays(periodEndsAt, 7),
    intensity: resultingFatigue,
    decisionTags: ["life.capacity", "life.recovery"],
    provenance: {
      kind: "authored",
      sourceRefs: [
        {
          kind: "life-load-resolution",
          lifeLoadResolutionId: record.id,
        },
      ],
      note: "Deterministically derived from the resolved life-load period.",
    },
  });
}

function appendOne<K extends keyof World["history"]>(
  world: World,
  family: K,
  record: World["history"][K] extends readonly (infer T)[] ? T : never,
): World {
  const records = world.history[family];
  if (!Array.isArray(records))
    throw new Error("History family is not appendable.");
  assertUniqueStableKey(
    records as readonly { readonly stableKey: string }[],
    (record as { readonly stableKey: string }).stableKey,
    String(family),
  );
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    [family]: [...records, record],
  });
}

function commit(world: World, history: World["history"]): World {
  const next = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

function validateOrganizationProfile(
  world: World,
  name: string,
  classification: OrganizationClassification,
  locationJurisdictionId: EntityId | null,
): void {
  assertNonEmpty(name, "Organization name");
  assertOpenTaxonomyKey(
    classification,
    ORGANIZATION_CLASSIFICATION_NAMESPACES,
    "Organization classification",
  );
  if (locationJurisdictionId !== null)
    requireJurisdiction(world, locationJurisdictionId);
}

function validateWorkDimensions(input: CreateWorkRelationshipInput): void {
  if (!["paid", "unpaid", "mixed", "in-kind"].includes(input.compensation)) {
    throw new Error(`Invalid work compensation: ${String(input.compensation)}`);
  }
  if (
    !["directed", "shared", "self-directed", "directs-others"].includes(
      input.authority,
    )
  ) {
    throw new Error(`Invalid work authority: ${String(input.authority)}`);
  }
  if (
    !["independent", "partly-dependent", "dependent"].includes(input.dependency)
  ) {
    throw new Error(`Invalid work dependency: ${String(input.dependency)}`);
  }
  if (
    !["organization-borne", "shared", "person-borne"].includes(
      input.economicRisk,
    )
  ) {
    throw new Error(
      `Invalid work economic risk: ${String(input.economicRisk)}`,
    );
  }
  if (input.organizationId === null && input.authority === "directed") {
    throw new Error(
      "Directed work requires an organization or economic unit reference.",
    );
  }
}

function validateRole(
  world: World,
  input: {
    readonly title: string;
    readonly occupationClassification: OccupationClassification | null;
    readonly locationJurisdictionId: EntityId | null;
    readonly timeDemand: TimeDemandProfile;
  },
): void {
  assertNonEmpty(input.title, "Work role title");
  if (input.occupationClassification !== null) {
    assertOpenTaxonomyKey(
      input.occupationClassification,
      OCCUPATION_CLASSIFICATION_NAMESPACES,
      "Occupation classification",
    );
  }
  if (input.locationJurisdictionId !== null)
    requireJurisdiction(world, input.locationJurisdictionId);
  validateTimeDemand(world, input.timeDemand);
}

function validateMembership(
  role: ResidenceRole,
  kind: HouseholdMembershipKind,
): void {
  if (!["primary", "secondary", "shared"].includes(role)) {
    throw new Error(`Invalid residence role: ${String(role)}`);
  }
  assertOpenTaxonomyKey(
    kind,
    HOUSEHOLD_MEMBERSHIP_NAMESPACES,
    "Household membership kind",
  );
}

function validateCareState(
  world: World,
  share: CareResponsibilityShare,
  context: string,
  timeDemand: TimeDemandProfile,
): void {
  if (!["supporting", "shared", "primary"].includes(share)) {
    throw new Error(`Invalid care responsibility share: ${String(share)}`);
  }
  assertNonEmpty(context, "Care context");
  validateTimeDemand(world, timeDemand);
}

export function validateTimeDemand(
  world: World,
  profile: TimeDemandProfile,
): void {
  const { minimumHours, maximumHours } = profile.expectedWeekly;
  if (
    !Number.isSafeInteger(minimumHours) ||
    !Number.isSafeInteger(maximumHours) ||
    minimumHours < 0 ||
    maximumHours < minimumHours ||
    maximumHours > 168
  ) {
    throw new Error("Expected weekly time must be a valid whole-hour range.");
  }
  if (!["low", "moderate", "high", "continuous"].includes(profile.attention)) {
    throw new Error(`Invalid attention demand: ${String(profile.attention)}`);
  }
  if (
    !["mostly-concurrent", "partly-concurrent", "mostly-exclusive"].includes(
      profile.concurrency,
    )
  ) {
    throw new Error(
      `Invalid concurrency potential: ${String(profile.concurrency)}`,
    );
  }
  if (!["flexible", "mixed", "rigid"].includes(profile.scheduleRigidity)) {
    throw new Error(
      `Invalid schedule rigidity: ${String(profile.scheduleRigidity)}`,
    );
  }
  if (
    !["interruptible", "limited", "non-interruptible"].includes(
      profile.interruptibility,
    )
  ) {
    throw new Error(
      `Invalid interruptibility: ${String(profile.interruptibility)}`,
    );
  }
  if (profile.locationJurisdictionId !== null) {
    requireJurisdiction(world, profile.locationJurisdictionId);
  }
}

function resolveFatigue(
  loadBand: "sustainable" | "demanding" | "overloaded" | "severe",
  prior: MindStrength | null,
  effortMode: EffortMode,
  recovery: RecoveryLevel,
): MindStrength | null {
  const loadPoints = { sustainable: 0, demanding: 1, overloaded: 2, severe: 3 }[
    loadBand
  ];
  const priorPoints =
    prior === null
      ? 0
      : { subtle: 1, moderate: 2, strong: 3, defining: 4 }[prior];
  const effortPoints =
    effortMode === "push" ? 2 : effortMode === "recover" ? -1 : 0;
  const recoveryPoints =
    recovery === "limited" ? 0 : recovery === "adequate" ? -2 : -4;
  const result = Math.max(
    0,
    Math.min(4, loadPoints + priorPoints + effortPoints + recoveryPoints),
  );
  return (
    ([null, "subtle", "moderate", "strong", "defining"] as const)[result] ??
    null
  );
}

function resolveImmediateOutput(
  prior: MindStrength | null,
  effortMode: EffortMode,
): LifeLoadResolutionRecord["immediateOutputPotential"] {
  if (effortMode === "recover") return "reduced";
  if (prior === "defining") return "reduced";
  if (effortMode === "push")
    return prior === "strong" ? "ordinary" : "elevated";
  return prior === "strong" ? "reduced" : "ordinary";
}

function resolveFutureCapacity(
  prior: MindStrength | null,
  result: MindStrength | null,
  recovery: RecoveryLevel,
): LifeLoadResolutionRecord["futureCapacity"] {
  if (result === "defining") return "depleted";
  if (result === "strong" || result === "moderate" || result === "subtle")
    return "reduced";
  if (prior !== null && recovery === "substantial") return "restored";
  return "ordinary";
}

function canonicalPair(
  world: World,
  personIds: readonly [EntityId, EntityId],
  date: string,
  label: string,
): readonly [EntityId, EntityId] {
  pairDate(world, personIds, date, label);
  if (personIds[0] === personIds[1])
    throw new Error(`${label} requires two different people.`);
  return [...personIds].sort() as [EntityId, EntityId];
}

function pairDate(
  world: World,
  personIds: readonly [EntityId, EntityId],
  value: string,
  label: string,
) {
  const date = personIndependentDate(world, value, label);
  for (const id of personIds) {
    const person = requirePerson(world, id);
    if (date < person.birthDate)
      throw new Error(`${label} cannot predate either person.`);
  }
  return date;
}

function personDate(
  world: World,
  personId: EntityId,
  value: string,
  label: string,
) {
  const date = personIndependentDate(world, value, label);
  if (date < requirePerson(world, personId).birthDate) {
    throw new Error(`${label} cannot predate the person.`);
  }
  return date;
}

function personIndependentDate(world: World, value: string, label: string) {
  const date = makeIsoDate(value);
  if (date > world.currentDate)
    throw new Error(`${label} cannot be in the future.`);
  return date;
}

function validateLifeProvenance(
  world: World,
  provenance: LifeRecordProvenance,
  effectiveAt: string,
): void {
  switch (provenance.kind) {
    case "authored":
      assertNonEmpty(provenance.note, "Authored life provenance note");
      return;
    case "simulated-event": {
      const event = world.history.events.find(
        (candidate) => candidate.id === provenance.eventId,
      );
      if (
        !event ||
        event.sequence >= world.history.nextSequence ||
        event.occurredAt > effectiveAt
      ) {
        throw new Error("Life provenance references an unavailable event.");
      }
      return;
    }
    case "source-record":
      assertNonEmpty(provenance.reference, "Life source-record reference");
      if (makeIsoDate(provenance.asOf) > effectiveAt) {
        throw new Error("Life source provenance cannot postdate the record.");
      }
      return;
    default:
      throw new Error(`Invalid life provenance: ${runtimeKind(provenance)}`);
  }
}

function cloneLifeProvenance(
  provenance: LifeRecordProvenance,
): LifeRecordProvenance {
  return { ...provenance };
}

function cloneTimeDemand(profile: TimeDemandProfile): TimeDemandProfile {
  return { ...profile, expectedWeekly: { ...profile.expectedWeekly } };
}

function cloneContributor(
  contributor: LifeLoadContributor,
): LifeLoadContributor {
  return {
    ...contributor,
    timeDemand: cloneTimeDemand(contributor.timeDemand),
  };
}

function requirePerson(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  return person;
}

function requireJurisdiction(world: World, jurisdictionId: EntityId): void {
  if (!world.jurisdictions[jurisdictionId]) {
    throw new Error(`Missing jurisdiction: ${jurisdictionId}`);
  }
}

function requireRecord<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
  label: string,
): T {
  const record = records.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`Missing ${label}: ${id}`);
  return record;
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
  label: string,
): void {
  assertNonEmpty(stableKey, `${label} stable key`);
  if (records.some((record) => record.stableKey === stableKey)) {
    throw new Error(`${label} stable key already exists: ${stableKey}`);
  }
}

function assertOptional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
}
