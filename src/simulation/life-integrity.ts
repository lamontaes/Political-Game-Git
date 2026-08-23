import { addDays, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  assessLifeLoadAt,
  careResponsibilityStateHistory,
  childAuthorityStateHistory,
  educationEnrollmentStateHistory,
  fatigueAt,
  householdMembershipsAt,
  householdMembershipStateHistory,
  organizationProfileHistory,
  organizationParticipationStateHistory,
  partnershipStateHistory,
  workRoleHistory,
  workStatusHistory,
} from "./life-queries";
import {
  CARE_NAMESPACES,
  CHILD_AUTHORITY_BASIS_NAMESPACES,
  CHILD_AUTHORITY_NAMESPACES,
  EDUCATION_CONTEXT_NAMESPACES,
  EDUCATION_PROGRAM_NAMESPACES,
  HOUSEHOLD_LOCATION_NAMESPACES,
  HOUSEHOLD_MEMBERSHIP_NAMESPACES,
  isOpenTaxonomyKey,
  KINSHIP_NAMESPACES,
  LIFE_COMMITMENT_NAMESPACES,
  OCCUPATION_CLASSIFICATION_NAMESPACES,
  ORGANIZATION_CLASSIFICATION_NAMESPACES,
  ORGANIZATION_PARTICIPATION_NAMESPACES,
  ORGANIZATION_PARTICIPATION_ROLE_NAMESPACES,
  PARTNERSHIP_NAMESPACES,
  WORK_RELATIONSHIP_NAMESPACES,
} from "./taxonomy";
import type {
  ChildAuthorityHolder,
  EntityId,
  LifeLoadResolutionRecord,
  LifeRecordProvenance,
  MindStrength,
  TimeDemandProfile,
  World,
} from "./types";

export function lifeHistoryRecords(world: World): readonly {
  readonly sequence: number;
}[] {
  const history = world.history;
  return [
    ...history.organizations,
    ...history.organizationProfiles,
    ...history.educationEnrollments,
    ...history.educationEnrollmentStates,
    ...history.organizationParticipations,
    ...history.organizationParticipationStates,
    ...history.workRelationships,
    ...history.workStatuses,
    ...history.workRoles,
    ...history.households,
    ...history.householdLocations,
    ...history.householdMemberships,
    ...history.householdMembershipStates,
    ...history.kinshipRelationships,
    ...history.partnerships,
    ...history.partnershipStates,
    ...history.careResponsibilities,
    ...history.careResponsibilityStates,
    ...history.childAuthorities,
    ...history.childAuthorityStates,
    ...history.lifeCommitments,
    ...history.lifeLoadResolutions,
  ];
}

export function lifeEntityExists(world: World, id: EntityId): boolean {
  return [
    world.history.organizations,
    world.history.educationEnrollments,
    world.history.organizationParticipations,
    world.history.workRelationships,
    world.history.households,
    world.history.householdMemberships,
    world.history.kinshipRelationships,
    world.history.partnerships,
    world.history.careResponsibilities,
    world.history.childAuthorities,
  ].some((records) => records.some((record) => record.id === id));
}

export function lifeEntityAvailableAt(
  world: World,
  id: EntityId,
  date: string,
  historySequenceExclusive: number,
): boolean {
  const record = [
    ...world.history.organizations.map((item) => ({
      id: item.id,
      date: item.formedAt,
      sequence: item.sequence,
    })),
    ...world.history.workRelationships.map((item) => ({
      id: item.id,
      date: item.startedAt < item.recordedAt ? item.startedAt : item.recordedAt,
      sequence: item.sequence,
    })),
    ...world.history.educationEnrollments.map((item) => ({
      id: item.id,
      date: item.startedAt < item.recordedAt ? item.startedAt : item.recordedAt,
      sequence: item.sequence,
    })),
    ...world.history.organizationParticipations.map((item) => ({
      id: item.id,
      date: item.startedAt < item.recordedAt ? item.startedAt : item.recordedAt,
      sequence: item.sequence,
    })),
    ...world.history.households.map((item) => ({
      id: item.id,
      date: item.formedAt,
      sequence: item.sequence,
    })),
    ...world.history.householdMemberships.map((item) => ({
      id: item.id,
      date: item.startedAt,
      sequence: item.sequence,
    })),
    ...world.history.kinshipRelationships.map((item) => ({
      id: item.id,
      date: item.establishedAt,
      sequence: item.sequence,
    })),
    ...world.history.partnerships.map((item) => ({
      id: item.id,
      date: item.startedAt,
      sequence: item.sequence,
    })),
    ...world.history.careResponsibilities.map((item) => ({
      id: item.id,
      date: item.startedAt,
      sequence: item.sequence,
    })),
    ...world.history.childAuthorities.map((item) => ({
      id: item.id,
      date: item.establishedAt,
      sequence: item.sequence,
    })),
  ].find((item) => item.id === id);
  return (
    record !== undefined &&
    record.date <= date &&
    record.sequence < historySequenceExclusive
  );
}

export function assertLifeHistoryIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const h = world.history;
  const families = [
    [h.organizations, "organization", "organization"],
    [h.organizationProfiles, "organization profile", "organization-profile"],
    [h.educationEnrollments, "education enrollment", "education-enrollment"],
    [
      h.educationEnrollmentStates,
      "education enrollment state",
      "education-enrollment-state",
    ],
    [
      h.organizationParticipations,
      "organization participation",
      "organization-participation",
    ],
    [
      h.organizationParticipationStates,
      "organization participation state",
      "organization-participation-state",
    ],
    [h.workRelationships, "work relationship", "work-relationship"],
    [h.workStatuses, "work status", "work-status"],
    [h.workRoles, "work role", "work-role"],
    [h.households, "household", "household"],
    [h.householdLocations, "household location", "household-location"],
    [h.householdMemberships, "household membership", "household-membership"],
    [
      h.householdMembershipStates,
      "household membership state",
      "household-membership-state",
    ],
    [h.kinshipRelationships, "kinship", "kinship"],
    [h.partnerships, "partnership", "partnership"],
    [h.partnershipStates, "partnership state", "partnership-state"],
    [h.careResponsibilities, "care responsibility", "care-responsibility"],
    [h.careResponsibilityStates, "care state", "care-state"],
    [h.childAuthorities, "child authority", "child-authority"],
    [h.childAuthorityStates, "child authority state", "child-authority-state"],
    [h.lifeCommitments, "life commitment", "life-commitment"],
    [h.lifeLoadResolutions, "life-load resolution", "life-load-resolution"],
  ] as const;
  for (const [records, label, kind] of families) {
    assertOrdered(records, label);
    const keys = new Set<string>();
    for (const record of records) {
      assertNonEmpty(record.stableKey, `${label} stable key`);
      if (keys.has(record.stableKey)) {
        throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
      }
      keys.add(record.stableKey);
      if (ids.has(record.id))
        throw new Error(`Duplicate entity ID: ${record.id}`);
      ids.add(record.id);
      if (
        record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)
      ) {
        throw new Error(
          `${label} ID does not match its stable key: ${record.id}`,
        );
      }
    }
  }

  for (const organization of h.organizations) {
    dateInWorld(world, organization.formedAt, organization.id);
    if (
      !(["lightweight", "detailed"] as const).includes(organization.detailLevel)
    ) {
      throw new Error(`Invalid organization detail level: ${organization.id}`);
    }
    validateProvenance(
      world,
      organization.provenance,
      organization.formedAt,
      organization.sequence,
    );
    const profiles = organizationProfileHistory(world, organization.id);
    if (
      profiles.length === 0 ||
      profiles[0]?.effectiveAt !== organization.formedAt
    ) {
      throw new Error(
        `Organization is missing its initial profile: ${organization.id}`,
      );
    }
  }

  for (const profile of h.organizationProfiles) {
    const organization = byId(h.organizations, profile.organizationId);
    if (!organization || organization.sequence >= profile.sequence) {
      throw new Error(
        `Organization profile has a dangling organization: ${profile.id}`,
      );
    }
    dateInWorld(world, profile.effectiveAt, profile.id);
    if (profile.effectiveAt < organization.formedAt) {
      throw new Error(
        `Organization profile predates its organization: ${profile.id}`,
      );
    }
    assertNonEmpty(profile.name, "Organization profile name");
    if (
      !isOpenTaxonomyKey(
        profile.classification,
        ORGANIZATION_CLASSIFICATION_NAMESPACES,
      )
    ) {
      throw new Error(`Invalid organization classification: ${profile.id}`);
    }
    jurisdictionOrNull(world, profile.locationJurisdictionId, profile.id);
    validateProvenance(
      world,
      profile.provenance,
      profile.effectiveAt,
      profile.sequence,
    );
    validateSupersession(
      profile,
      profile.supersedesProfileId,
      h.organizationProfiles,
      (candidate) => candidate.organizationId,
      (candidate) => candidate.effectiveAt,
      "organization profile",
    );
  }

  for (const enrollment of h.educationEnrollments) {
    const person = world.people[enrollment.personId];
    const organization = byId(h.organizations, enrollment.organizationId);
    personDate(
      world,
      enrollment.personId,
      enrollment.recordedAt,
      enrollment.id,
    );
    if (!person || makeIsoDate(enrollment.startedAt) < person.birthDate) {
      throw new Error(
        `Education enrollment has invalid start chronology: ${enrollment.id}`,
      );
    }
    if (
      !organization ||
      organization.sequence >= enrollment.sequence ||
      organization.formedAt > enrollment.startedAt
    ) {
      throw new Error(
        `Education enrollment has an invalid organization: ${enrollment.id}`,
      );
    }
    if (
      !isOpenTaxonomyKey(enrollment.programKind, EDUCATION_PROGRAM_NAMESPACES)
    ) {
      throw new Error(`Invalid education program kind: ${enrollment.id}`);
    }
    validateProvenance(
      world,
      enrollment.provenance,
      enrollment.recordedAt,
      enrollment.sequence,
    );
    const states = educationEnrollmentStateHistory(world, enrollment.id);
    if (
      !states[0] ||
      (states[0].status === "active" &&
        (states[0].effectiveAt !== enrollment.startedAt ||
          enrollment.startedAt > enrollment.recordedAt)) ||
      (states[0].status === "expected" &&
        (states[0].effectiveAt !== enrollment.recordedAt ||
          enrollment.startedAt <= enrollment.recordedAt)) ||
      !["active", "expected"].includes(states[0].status)
    ) {
      throw new Error(
        `Education enrollment lacks valid initial state: ${enrollment.id}`,
      );
    }
  }

  for (const state of h.educationEnrollmentStates) {
    const enrollment = byId(h.educationEnrollments, state.enrollmentId);
    if (!enrollment || enrollment.sequence >= state.sequence) {
      throw new Error(`Education state has a dangling enrollment: ${state.id}`);
    }
    personDate(world, enrollment.personId, state.effectiveAt, state.id);
    assertMember(
      ["expected", "active", "completed", "withdrawn", "transferred", "ended"],
      state.status,
      "education enrollment status",
    );
    if (!isOpenTaxonomyKey(state.contextKind, EDUCATION_CONTEXT_NAMESPACES)) {
      throw new Error(`Invalid education context kind: ${state.id}`);
    }
    if (state.status === "expected" || state.status === "active") {
      optional(state.reason, "Education state reason");
    } else {
      assertNonEmpty(state.reason, "Education state reason");
    }
    validateProvenance(
      world,
      state.provenance,
      state.effectiveAt,
      state.sequence,
    );
    validateSupersession(
      state,
      state.supersedesStateId,
      h.educationEnrollmentStates,
      (candidate) => candidate.enrollmentId,
      (candidate) => candidate.effectiveAt,
      "education enrollment state",
    );
    const prior = state.supersedesStateId
      ? byId(h.educationEnrollmentStates, state.supersedesStateId)
      : undefined;
    if (
      (prior &&
        ["completed", "withdrawn", "transferred", "ended"].includes(
          prior.status,
        )) ||
      prior?.status === state.status ||
      (state.status === "expected" && prior !== undefined) ||
      (state.status === "active" && state.effectiveAt < enrollment.startedAt)
    ) {
      throw new Error(`Invalid education enrollment transition: ${state.id}`);
    }
  }

  for (const participation of h.organizationParticipations) {
    const person = world.people[participation.personId];
    const organization = byId(h.organizations, participation.organizationId);
    personDate(
      world,
      participation.personId,
      participation.recordedAt,
      participation.id,
    );
    if (!person || makeIsoDate(participation.startedAt) < person.birthDate) {
      throw new Error(
        `Organization participation has invalid chronology: ${participation.id}`,
      );
    }
    if (
      !organization ||
      organization.sequence >= participation.sequence ||
      organization.formedAt > participation.startedAt
    ) {
      throw new Error(
        `Organization participation has an invalid organization: ${participation.id}`,
      );
    }
    if (
      !isOpenTaxonomyKey(
        participation.kind,
        ORGANIZATION_PARTICIPATION_NAMESPACES,
      )
    ) {
      throw new Error(
        `Invalid organization participation kind: ${participation.id}`,
      );
    }
    validateProvenance(
      world,
      participation.provenance,
      participation.recordedAt,
      participation.sequence,
    );
    const states = organizationParticipationStateHistory(
      world,
      participation.id,
    );
    if (
      !states[0] ||
      (states[0].status === "active" &&
        (states[0].effectiveAt !== participation.startedAt ||
          participation.startedAt > participation.recordedAt)) ||
      (states[0].status === "expected" &&
        (states[0].effectiveAt !== participation.recordedAt ||
          participation.startedAt <= participation.recordedAt)) ||
      !["active", "expected"].includes(states[0].status)
    ) {
      throw new Error(
        `Organization participation lacks valid initial state: ${participation.id}`,
      );
    }
  }

  for (const state of h.organizationParticipationStates) {
    const participation = byId(
      h.organizationParticipations,
      state.participationId,
    );
    if (!participation || participation.sequence >= state.sequence) {
      throw new Error(
        `Participation state has a dangling participation: ${state.id}`,
      );
    }
    personDate(world, participation.personId, state.effectiveAt, state.id);
    assertMember(
      ["expected", "active", "inactive", "ended"],
      state.status,
      "organization participation status",
    );
    if (
      state.roleKind !== null &&
      !isOpenTaxonomyKey(
        state.roleKind,
        ORGANIZATION_PARTICIPATION_ROLE_NAMESPACES,
      )
    ) {
      throw new Error(`Invalid organization participation role: ${state.id}`);
    }
    optional(state.context, "Organization participation context");
    validateProvenance(
      world,
      state.provenance,
      state.effectiveAt,
      state.sequence,
    );
    validateSupersession(
      state,
      state.supersedesStateId,
      h.organizationParticipationStates,
      (candidate) => candidate.participationId,
      (candidate) => candidate.effectiveAt,
      "organization participation state",
    );
    const prior = state.supersedesStateId
      ? byId(h.organizationParticipationStates, state.supersedesStateId)
      : undefined;
    if (
      prior?.status === "ended" ||
      prior?.status === state.status ||
      (state.status === "expected" && prior !== undefined) ||
      (prior?.status === "expected" && state.status === "inactive") ||
      (state.status === "active" && state.effectiveAt < participation.startedAt)
    ) {
      throw new Error(
        `Invalid organization participation transition: ${state.id}`,
      );
    }
  }

  for (const relationship of h.workRelationships) {
    personDate(
      world,
      relationship.personId,
      relationship.recordedAt,
      relationship.id,
    );
    const person = world.people[relationship.personId];
    if (!person || makeIsoDate(relationship.startedAt) < person.birthDate) {
      throw new Error(
        `Work relationship has invalid start chronology: ${relationship.id}`,
      );
    }
    if (relationship.organizationId !== null) {
      const organization = byId(h.organizations, relationship.organizationId);
      if (
        !organization ||
        organization.sequence >= relationship.sequence ||
        organization.formedAt > relationship.recordedAt
      ) {
        throw new Error(
          `Work relationship has an invalid organization: ${relationship.id}`,
        );
      }
    }
    if (!isOpenTaxonomyKey(relationship.kind, WORK_RELATIONSHIP_NAMESPACES)) {
      throw new Error(`Invalid work relationship kind: ${relationship.id}`);
    }
    assertMember(
      ["paid", "unpaid", "mixed", "in-kind"],
      relationship.compensation,
      "work compensation",
    );
    assertMember(
      ["directed", "shared", "self-directed", "directs-others"],
      relationship.authority,
      "work authority",
    );
    assertMember(
      ["independent", "partly-dependent", "dependent"],
      relationship.dependency,
      "work dependency",
    );
    assertMember(
      ["organization-borne", "shared", "person-borne"],
      relationship.economicRisk,
      "work economic risk",
    );
    if (
      relationship.organizationId === null &&
      relationship.authority === "directed"
    ) {
      throw new Error(
        `Directed work is missing an organization: ${relationship.id}`,
      );
    }
    validateProvenance(
      world,
      relationship.provenance,
      relationship.recordedAt,
      relationship.sequence,
    );
    const statuses = workStatusHistory(world, relationship.id);
    const roles = workRoleHistory(world, relationship.id);
    if (
      !statuses[0] ||
      !roles[0] ||
      statuses[0].effectiveAt !== roles[0].effectiveAt ||
      (statuses[0].status === "active" &&
        (statuses[0].effectiveAt !== relationship.startedAt ||
          relationship.startedAt > relationship.recordedAt)) ||
      (statuses[0].status === "expected" &&
        (statuses[0].effectiveAt !== relationship.recordedAt ||
          relationship.startedAt <= relationship.recordedAt)) ||
      !["active", "expected"].includes(statuses[0].status)
    ) {
      throw new Error(
        `Work relationship lacks initial state: ${relationship.id}`,
      );
    }
  }

  for (const status of h.workStatuses) {
    const relationship = byId(h.workRelationships, status.workRelationshipId);
    if (!relationship || relationship.sequence >= status.sequence) {
      throw new Error(`Work status has a dangling relationship: ${status.id}`);
    }
    personDate(world, relationship.personId, status.effectiveAt, status.id);
    assertMember(
      ["expected", "active", "temporarily-inactive", "ended"],
      status.status,
      "work status",
    );
    if (status.status === "temporarily-inactive" || status.status === "ended")
      assertNonEmpty(status.reason, "Work status reason");
    else optional(status.reason, "Work status reason");
    validateProvenance(
      world,
      status.provenance,
      status.effectiveAt,
      status.sequence,
    );
    validateSupersession(
      status,
      status.supersedesStatusId,
      h.workStatuses,
      (candidate) => candidate.workRelationshipId,
      (candidate) => candidate.effectiveAt,
      "work status",
    );
    const prior = status.supersedesStatusId
      ? byId(h.workStatuses, status.supersedesStatusId)
      : undefined;
    if (
      prior?.status === "ended" ||
      prior?.status === status.status ||
      (status.status === "expected" && prior !== undefined) ||
      (prior?.status === "expected" &&
        status.status === "temporarily-inactive") ||
      (status.status === "active" &&
        status.effectiveAt < relationship.startedAt)
    ) {
      throw new Error(`Invalid work status transition: ${status.id}`);
    }
  }

  for (const role of h.workRoles) {
    const relationship = byId(h.workRelationships, role.workRelationshipId);
    if (!relationship || relationship.sequence >= role.sequence) {
      throw new Error(`Work role has a dangling relationship: ${role.id}`);
    }
    personDate(world, relationship.personId, role.effectiveAt, role.id);
    assertNonEmpty(role.title, "Work role title");
    if (
      role.occupationClassification !== null &&
      !isOpenTaxonomyKey(
        role.occupationClassification,
        OCCUPATION_CLASSIFICATION_NAMESPACES,
      )
    ) {
      throw new Error(`Invalid occupation classification: ${role.id}`);
    }
    jurisdictionOrNull(world, role.locationJurisdictionId, role.id);
    validateTimeDemand(world, role.timeDemand, role.id);
    validateProvenance(world, role.provenance, role.effectiveAt, role.sequence);
    validateSupersession(
      role,
      role.supersedesRoleId,
      h.workRoles,
      (candidate) => candidate.workRelationshipId,
      (candidate) => candidate.effectiveAt,
      "work role",
    );
  }

  for (const household of h.households) {
    dateInWorld(world, household.formedAt, household.id);
    assertNonEmpty(household.label, "Household label");
    validateProvenance(
      world,
      household.provenance,
      household.formedAt,
      household.sequence,
    );
  }

  for (const location of h.householdLocations) {
    const household = byId(h.households, location.householdId);
    if (
      !household ||
      household.sequence >= location.sequence ||
      household.formedAt > location.effectiveAt
    ) {
      throw new Error(
        `Household location has invalid household history: ${location.id}`,
      );
    }
    dateInWorld(world, location.effectiveAt, location.id);
    jurisdiction(world, location.jurisdictionId, location.id);
    assertNonEmpty(location.label, "Household location label");
    if (!isOpenTaxonomyKey(location.kind, HOUSEHOLD_LOCATION_NAMESPACES)) {
      throw new Error(`Invalid household location kind: ${location.id}`);
    }
    validateProvenance(
      world,
      location.provenance,
      location.effectiveAt,
      location.sequence,
    );
    validateSupersession(
      location,
      location.supersedesLocationId,
      h.householdLocations,
      (candidate) => candidate.householdId,
      (candidate) => candidate.effectiveAt,
      "household location",
    );
  }

  for (const membership of h.householdMemberships) {
    const household = byId(h.households, membership.householdId);
    personDate(world, membership.personId, membership.startedAt, membership.id);
    if (
      !household ||
      household.sequence >= membership.sequence ||
      household.formedAt > membership.startedAt
    ) {
      throw new Error(
        `Household membership has invalid household history: ${membership.id}`,
      );
    }
    validateProvenance(
      world,
      membership.provenance,
      membership.startedAt,
      membership.sequence,
    );
    const states = householdMembershipStateHistory(world, membership.id);
    if (
      states[0]?.effectiveAt !== membership.startedAt ||
      states[0]?.status !== "resident"
    ) {
      throw new Error(
        `Household membership lacks initial state: ${membership.id}`,
      );
    }
  }

  for (const state of h.householdMembershipStates) {
    const membership = byId(h.householdMemberships, state.membershipId);
    if (!membership || membership.sequence >= state.sequence) {
      throw new Error(`Household state has a dangling membership: ${state.id}`);
    }
    personDate(world, membership.personId, state.effectiveAt, state.id);
    assertMember(
      ["resident", "ended"],
      state.status,
      "household membership status",
    );
    assertMember(
      ["primary", "secondary", "shared"],
      state.residenceRole,
      "residence role",
    );
    if (!isOpenTaxonomyKey(state.kind, HOUSEHOLD_MEMBERSHIP_NAMESPACES)) {
      throw new Error(`Invalid household membership kind: ${state.id}`);
    }
    validateProvenance(
      world,
      state.provenance,
      state.effectiveAt,
      state.sequence,
    );
    validateSupersession(
      state,
      state.supersedesStateId,
      h.householdMembershipStates,
      (candidate) => candidate.membershipId,
      (candidate) => candidate.effectiveAt,
      "household membership state",
    );
    const prior = state.supersedesStateId
      ? byId(h.householdMembershipStates, state.supersedesStateId)
      : undefined;
    if (prior?.status === "ended") {
      throw new Error(`Ended household membership was reopened: ${state.id}`);
    }
  }
  validateResidenceMultiplicity(world);

  for (const kinship of h.kinshipRelationships) {
    validatePair(world, kinship.personIds, kinship.establishedAt, kinship.id);
    if (kinship.personIds[0] > kinship.personIds[1]) {
      throw new Error(`Kinship pair is not canonical: ${kinship.id}`);
    }
    if (!isOpenTaxonomyKey(kinship.kind, KINSHIP_NAMESPACES)) {
      throw new Error(`Invalid kinship kind: ${kinship.id}`);
    }
    validateProvenance(
      world,
      kinship.provenance,
      kinship.establishedAt,
      kinship.sequence,
    );
  }

  for (const partnership of h.partnerships) {
    validatePair(
      world,
      partnership.personIds,
      partnership.startedAt,
      partnership.id,
    );
    if (partnership.personIds[0] > partnership.personIds[1]) {
      throw new Error(`Partnership pair is not canonical: ${partnership.id}`);
    }
    if (!isOpenTaxonomyKey(partnership.kind, PARTNERSHIP_NAMESPACES)) {
      throw new Error(`Invalid partnership kind: ${partnership.id}`);
    }
    validateProvenance(
      world,
      partnership.provenance,
      partnership.startedAt,
      partnership.sequence,
    );
    const states = partnershipStateHistory(world, partnership.id);
    if (
      states[0]?.effectiveAt !== partnership.startedAt ||
      states[0]?.status !== "active"
    ) {
      throw new Error(`Partnership lacks initial state: ${partnership.id}`);
    }
  }

  for (const state of h.partnershipStates) {
    const partnership = byId(h.partnerships, state.partnershipId);
    if (!partnership || partnership.sequence >= state.sequence) {
      throw new Error(
        `Partnership state has a dangling partnership: ${state.id}`,
      );
    }
    validatePair(world, partnership.personIds, state.effectiveAt, state.id);
    assertMember(["active", "ended"], state.status, "partnership status");
    validateProvenance(
      world,
      state.provenance,
      state.effectiveAt,
      state.sequence,
    );
    validateSupersession(
      state,
      state.supersedesStateId,
      h.partnershipStates,
      (candidate) => candidate.partnershipId,
      (candidate) => candidate.effectiveAt,
      "partnership state",
    );
    const prior = state.supersedesStateId
      ? byId(h.partnershipStates, state.supersedesStateId)
      : undefined;
    if (prior?.status === "ended" || (prior && state.status !== "ended")) {
      throw new Error(`Invalid partnership transition: ${state.id}`);
    }
  }

  for (const care of h.careResponsibilities) {
    validatePair(
      world,
      [care.caregiverPersonId, care.recipientPersonId],
      care.startedAt,
      care.id,
    );
    if (!isOpenTaxonomyKey(care.kind, CARE_NAMESPACES)) {
      throw new Error(`Invalid care kind: ${care.id}`);
    }
    validateProvenance(world, care.provenance, care.startedAt, care.sequence);
    const states = careResponsibilityStateHistory(world, care.id);
    if (
      states[0]?.effectiveAt !== care.startedAt ||
      states[0]?.status !== "active"
    ) {
      throw new Error(`Care responsibility lacks initial state: ${care.id}`);
    }
  }

  for (const state of h.careResponsibilityStates) {
    const care = byId(h.careResponsibilities, state.careResponsibilityId);
    if (!care || care.sequence >= state.sequence) {
      throw new Error(`Care state has a dangling responsibility: ${state.id}`);
    }
    validatePair(
      world,
      [care.caregiverPersonId, care.recipientPersonId],
      state.effectiveAt,
      state.id,
    );
    assertMember(["active", "ended"], state.status, "care status");
    assertMember(
      ["supporting", "shared", "primary"],
      state.share,
      "care share",
    );
    assertNonEmpty(state.context, "Care context");
    validateTimeDemand(world, state.timeDemand, state.id);
    validateProvenance(
      world,
      state.provenance,
      state.effectiveAt,
      state.sequence,
    );
    validateSupersession(
      state,
      state.supersedesStateId,
      h.careResponsibilityStates,
      (candidate) => candidate.careResponsibilityId,
      (candidate) => candidate.effectiveAt,
      "care state",
    );
    const prior = state.supersedesStateId
      ? byId(h.careResponsibilityStates, state.supersedesStateId)
      : undefined;
    if (prior?.status === "ended") {
      throw new Error(`Ended care responsibility was reopened: ${state.id}`);
    }
  }

  for (const authority of h.childAuthorities) {
    personDate(
      world,
      authority.childPersonId,
      authority.establishedAt,
      authority.id,
    );
    validateAuthorityHolder(
      world,
      authority.childPersonId,
      authority.holder,
      authority.establishedAt,
      authority.sequence,
      authority.id,
    );
    if (!isOpenTaxonomyKey(authority.kind, CHILD_AUTHORITY_NAMESPACES)) {
      throw new Error(`Invalid child authority kind: ${authority.id}`);
    }
    validateProvenance(
      world,
      authority.provenance,
      authority.establishedAt,
      authority.sequence,
    );
    const states = childAuthorityStateHistory(world, authority.id);
    if (
      states[0]?.effectiveAt !== authority.establishedAt ||
      states[0]?.status !== "active"
    ) {
      throw new Error(`Child authority lacks initial state: ${authority.id}`);
    }
  }

  for (const state of h.childAuthorityStates) {
    const authority = byId(h.childAuthorities, state.childAuthorityId);
    if (!authority || authority.sequence >= state.sequence) {
      throw new Error(
        `Child authority state has a dangling authority: ${state.id}`,
      );
    }
    personDate(world, authority.childPersonId, state.effectiveAt, state.id);
    assertMember(["active", "ended"], state.status, "child authority status");
    if (!isOpenTaxonomyKey(state.basisKind, CHILD_AUTHORITY_BASIS_NAMESPACES)) {
      throw new Error(`Invalid child authority basis: ${state.id}`);
    }
    optional(state.context, "Child authority context");
    validateProvenance(
      world,
      state.provenance,
      state.effectiveAt,
      state.sequence,
    );
    validateSupersession(
      state,
      state.supersedesStateId,
      h.childAuthorityStates,
      (candidate) => candidate.childAuthorityId,
      (candidate) => candidate.effectiveAt,
      "child authority state",
    );
    const prior = state.supersedesStateId
      ? byId(h.childAuthorityStates, state.supersedesStateId)
      : undefined;
    if (prior?.status === "ended" || (prior && state.status !== "ended")) {
      throw new Error(`Invalid child authority transition: ${state.id}`);
    }
  }

  for (const commitment of h.lifeCommitments) {
    personDate(world, commitment.personId, commitment.startsAt, commitment.id);
    if (commitment.endsAt !== null) {
      dateInWorld(world, commitment.endsAt, commitment.id);
      if (commitment.endsAt <= commitment.startsAt) {
        throw new Error(
          `Life commitment has an invalid interval: ${commitment.id}`,
        );
      }
    }
    if (!isOpenTaxonomyKey(commitment.kind, LIFE_COMMITMENT_NAMESPACES)) {
      throw new Error(`Invalid life commitment kind: ${commitment.id}`);
    }
    assertNonEmpty(commitment.label, "Life commitment label");
    validateTimeDemand(world, commitment.timeDemand, commitment.id);
    validateProvenance(
      world,
      commitment.provenance,
      commitment.startsAt,
      commitment.sequence,
    );
  }

  for (const resolution of h.lifeLoadResolutions) {
    validateLoadResolution(world, resolution);
  }
  for (const [index, resolution] of h.lifeLoadResolutions.entries()) {
    if (
      h.lifeLoadResolutions
        .slice(index + 1)
        .some(
          (other) =>
            other.personId === resolution.personId &&
            resolution.periodStartsAt < other.periodEndsAt &&
            other.periodStartsAt < resolution.periodEndsAt,
        )
    ) {
      throw new Error(
        `Life-load resolutions overlap for one person: ${resolution.id}`,
      );
    }
  }
}

function validateResidenceMultiplicity(world: World): void {
  for (const personId of world.personOrder) {
    const dates = new Set(
      world.history.householdMembershipStates
        .filter((state) => {
          const membership = byId(
            world.history.householdMemberships,
            state.membershipId,
          );
          return membership?.personId === personId;
        })
        .map((state) => state.effectiveAt),
    );
    for (const date of dates) {
      const sequence = world.history.nextSequence;
      const active = householdMembershipsAt(world, personId, {
        asOfDate: date,
        historySequenceExclusive: sequence,
      });
      if (
        active.filter((item) => item.state.residenceRole === "primary").length >
        1
      ) {
        throw new Error(
          `Person has overlapping primary household memberships: ${personId}`,
        );
      }
      const householdIds = active.map((item) => item.household.id);
      if (new Set(householdIds).size !== householdIds.length) {
        throw new Error(
          `Person has duplicate active membership in one household: ${personId}`,
        );
      }
    }
  }
}

function validateLoadResolution(
  world: World,
  record: LifeLoadResolutionRecord,
): void {
  personDate(world, record.personId, record.periodStartsAt, record.id);
  dateInWorld(world, record.periodEndsAt, record.id);
  if (
    record.periodStartsAt >= record.periodEndsAt ||
    record.cutoff.asOfDate !== record.periodStartsAt
  ) {
    throw new Error(
      `Life-load resolution has invalid chronology: ${record.id}`,
    );
  }
  if (record.periodEndsAt !== addDays(record.periodStartsAt, 7)) {
    throw new Error(`Life-load resolution must cover seven days: ${record.id}`);
  }
  if (
    record.cutoff.historySequenceExclusive > record.sequence ||
    record.cutoff.historySequenceExclusive < 0
  ) {
    throw new Error(
      `Life-load resolution has an invalid sequence cutoff: ${record.id}`,
    );
  }
  assertMember(["normal", "push", "recover"], record.effortMode, "effort mode");
  assertMember(
    ["limited", "adequate", "substantial"],
    record.recovery,
    "recovery level",
  );
  assertMember(
    ["sustainable", "demanding", "overloaded", "severe"],
    record.loadBand,
    "life-load band",
  );
  assertMember(
    ["reduced", "ordinary", "elevated"],
    record.immediateOutputPotential,
    "output potential",
  );
  assertMember(
    ["depleted", "reduced", "ordinary", "restored"],
    record.futureCapacity,
    "future capacity",
  );
  optionalStrength(record.priorFatigue, record.id);
  optionalStrength(record.resultingFatigue, record.id);
  const assessment = assessLifeLoadAt(world, record.personId, record.cutoff);
  const prior = fatigueAt(world, record.personId, record.cutoff);
  if (
    assessment.loadBand !== record.loadBand ||
    prior !== record.priorFatigue ||
    JSON.stringify(assessment.expectedWeekly) !==
      JSON.stringify(record.expectedWeekly) ||
    JSON.stringify(assessment.exclusiveEquivalentWeekly) !==
      JSON.stringify(record.exclusiveEquivalentWeekly) ||
    JSON.stringify(assessment.contributors) !==
      JSON.stringify(record.contributorRefs)
  ) {
    throw new Error(
      `Life-load resolution does not match its historical inputs: ${record.id}`,
    );
  }
  const resultingFatigue = expectedFatigue(
    record.loadBand,
    record.priorFatigue,
    record.effortMode,
    record.recovery,
  );
  const immediateOutput = expectedImmediateOutput(
    record.priorFatigue,
    record.effortMode,
  );
  const futureCapacity = expectedFutureCapacity(
    record.priorFatigue,
    resultingFatigue,
    record.recovery,
  );
  if (
    record.resultingFatigue !== resultingFatigue ||
    record.immediateOutputPotential !== immediateOutput ||
    record.futureCapacity !== futureCapacity
  ) {
    throw new Error(
      `Life-load resolution has inconsistent consequences: ${record.id}`,
    );
  }
  const derivedStates = world.history.temporaryStates.filter((state) =>
    state.provenance.sourceRefs.some(
      (reference) =>
        reference.kind === "life-load-resolution" &&
        reference.lifeLoadResolutionId === record.id,
    ),
  );
  if (resultingFatigue === null) {
    if (derivedStates.length !== 0) {
      throw new Error(
        `Recovered life-load resolution has a fatigue state: ${record.id}`,
      );
    }
    return;
  }
  const state = derivedStates[0];
  if (
    derivedStates.length !== 1 ||
    !state ||
    state.sequence <= record.sequence ||
    state.personId !== record.personId ||
    state.stateKey !== "life:fatigue" ||
    state.recordedAt !== record.periodEndsAt ||
    state.startsAt !== record.periodEndsAt ||
    state.endsAt !== addDays(record.periodEndsAt, 7) ||
    state.intensity !== resultingFatigue
  ) {
    throw new Error(
      `Life-load resolution lacks its derived fatigue state: ${record.id}`,
    );
  }
}

function expectedFatigue(
  loadBand: LifeLoadResolutionRecord["loadBand"],
  prior: MindStrength | null,
  effortMode: LifeLoadResolutionRecord["effortMode"],
  recovery: LifeLoadResolutionRecord["recovery"],
): MindStrength | null {
  const loadPoints = {
    sustainable: 0,
    demanding: 1,
    overloaded: 2,
    severe: 3,
  }[loadBand];
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

function expectedImmediateOutput(
  prior: MindStrength | null,
  effortMode: LifeLoadResolutionRecord["effortMode"],
): LifeLoadResolutionRecord["immediateOutputPotential"] {
  if (effortMode === "recover" || prior === "defining") return "reduced";
  if (effortMode === "push") {
    return prior === "strong" ? "ordinary" : "elevated";
  }
  return prior === "strong" ? "reduced" : "ordinary";
}

function expectedFutureCapacity(
  prior: MindStrength | null,
  result: MindStrength | null,
  recovery: LifeLoadResolutionRecord["recovery"],
): LifeLoadResolutionRecord["futureCapacity"] {
  if (result === "defining") return "depleted";
  if (result !== null) return "reduced";
  if (prior !== null && recovery === "substantial") return "restored";
  return "ordinary";
}

function validateTimeDemand(
  world: World,
  profile: TimeDemandProfile,
  recordId: EntityId,
): void {
  const { minimumHours, maximumHours } = profile.expectedWeekly;
  if (
    !Number.isSafeInteger(minimumHours) ||
    !Number.isSafeInteger(maximumHours) ||
    minimumHours < 0 ||
    maximumHours < minimumHours ||
    maximumHours > 168
  ) {
    throw new Error(`Invalid weekly time range: ${recordId}`);
  }
  assertMember(
    ["low", "moderate", "high", "continuous"],
    profile.attention,
    "attention demand",
  );
  assertMember(
    ["mostly-concurrent", "partly-concurrent", "mostly-exclusive"],
    profile.concurrency,
    "concurrency potential",
  );
  assertMember(
    ["flexible", "mixed", "rigid"],
    profile.scheduleRigidity,
    "schedule rigidity",
  );
  assertMember(
    ["interruptible", "limited", "non-interruptible"],
    profile.interruptibility,
    "interruptibility",
  );
  jurisdictionOrNull(world, profile.locationJurisdictionId, recordId);
}

function validateProvenance(
  world: World,
  provenance: LifeRecordProvenance,
  effectiveAt: string,
  sequence: number,
): void {
  switch (provenance.kind) {
    case "authored":
      assertNonEmpty(provenance.note, "Authored life provenance note");
      return;
    case "generated":
      assertNonEmpty(provenance.generatorKey, "Generated life provenance key");
      return;
    case "simulated-event": {
      const event = byId(world.history.events, provenance.eventId);
      if (
        !event ||
        event.sequence >= sequence ||
        event.occurredAt > effectiveAt
      ) {
        throw new Error("Life provenance references an unavailable event.");
      }
      return;
    }
    case "source-record":
      assertNonEmpty(provenance.reference, "Life source reference");
      if (makeIsoDate(provenance.asOf) > effectiveAt) {
        throw new Error("Life source provenance postdates its record.");
      }
      return;
    default:
      throw new Error(
        `Invalid life provenance kind: ${runtimeKind(provenance)}`,
      );
  }
}

function validateSupersession<
  T extends { readonly id: EntityId; readonly sequence: number },
  S,
>(
  record: T,
  priorId: EntityId | null,
  records: readonly T[],
  subjectOf: (candidate: T) => S,
  dateOf: (candidate: T) => string,
  label: string,
): void {
  const previous = records
    .filter(
      (candidate) =>
        subjectOf(candidate) === subjectOf(record) &&
        candidate.sequence < record.sequence,
    )
    .at(-1);
  const prior = priorId === null ? undefined : byId(records, priorId);
  if (
    (previous === undefined && priorId !== null) ||
    (previous !== undefined && previous.id !== priorId) ||
    (priorId !== null && !prior) ||
    (prior &&
      (subjectOf(prior) !== subjectOf(record) ||
        prior.sequence >= record.sequence ||
        dateOf(prior) > dateOf(record)))
  ) {
    throw new Error(`Invalid ${label} supersession: ${record.id}`);
  }
}

function validatePair(
  world: World,
  ids: readonly [EntityId, EntityId],
  date: string,
  recordId: EntityId,
): void {
  if (ids[0] === ids[1])
    throw new Error(`Life relationship requires two people: ${recordId}`);
  personDate(world, ids[0], date, recordId);
  personDate(world, ids[1], date, recordId);
}

function validateAuthorityHolder(
  world: World,
  childPersonId: EntityId,
  holder: ChildAuthorityHolder,
  establishedAt: string,
  sequence: number,
  recordId: EntityId,
): void {
  switch (holder.kind) {
    case "person": {
      const person = world.people[holder.personId];
      if (
        holder.personId === childPersonId ||
        !person ||
        person.birthDate > establishedAt
      ) {
        throw new Error(
          `Child authority has an invalid person holder: ${recordId}`,
        );
      }
      return;
    }
    case "organization": {
      const organization = byId(
        world.history.organizations,
        holder.organizationId,
      );
      if (
        !organization ||
        organization.sequence >= sequence ||
        organization.formedAt > establishedAt
      ) {
        throw new Error(
          `Child authority has an invalid organization holder: ${recordId}`,
        );
      }
      return;
    }
    default:
      throw new Error(`Invalid child authority holder: ${runtimeKind(holder)}`);
  }
}

function personDate(
  world: World,
  personId: EntityId,
  date: string,
  recordId: EntityId,
): void {
  const person = world.people[personId];
  const parsed = makeIsoDate(date);
  if (!person || parsed < person.birthDate || parsed > world.currentDate) {
    throw new Error(`Life record has invalid person chronology: ${recordId}`);
  }
}

function dateInWorld(world: World, date: string, recordId: EntityId): void {
  if (makeIsoDate(date) > world.currentDate) {
    throw new Error(
      `Life record is dated after the current world date: ${recordId}`,
    );
  }
}

function jurisdiction(world: World, id: EntityId, recordId: EntityId): void {
  if (!world.jurisdictions[id]) {
    throw new Error(
      `Life record references a missing jurisdiction: ${recordId}`,
    );
  }
}

function jurisdictionOrNull(
  world: World,
  id: EntityId | null,
  recordId: EntityId,
): void {
  if (id !== null) jurisdiction(world, id, recordId);
}

function assertOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= (records[index - 1]?.sequence ?? -1),
    )
  ) {
    throw new Error(`${label} history is not in append-sequence order.`);
  }
}

function byId<T extends { readonly id: EntityId }>(
  records: readonly T[],
  id: EntityId,
): T | undefined {
  return records.find((record) => record.id === id);
}

function optional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

function optionalStrength(
  value: MindStrength | null,
  recordId: EntityId,
): void {
  if (value !== null) {
    assertMember(
      ["subtle", "moderate", "strong", "defining"],
      value,
      `fatigue strength for ${recordId}`,
    );
  }
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertMember<T extends string>(
  values: readonly T[],
  value: T,
  label: string,
): void {
  if (!values.includes(value))
    throw new Error(`Invalid ${label}: ${String(value)}`);
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
}
