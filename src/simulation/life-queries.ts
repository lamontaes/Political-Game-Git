import { makeIsoDate } from "./dates";
import { factsForPerson } from "./people";
import type {
  ChildAuthority,
  ChildAuthorityStateRecord,
  CareResponsibility,
  CareResponsibilityStateRecord,
  CoordinationPressure,
  EntityId,
  EducationEnrollment,
  EducationEnrollmentStateRecord,
  EducationFact,
  ExpectedWeeklyTimeRange,
  HistoricalCutoff,
  Household,
  HouseholdLocationRecord,
  HouseholdMembership,
  HouseholdMembershipStateRecord,
  KinshipRelationship,
  LifeCommitmentRecord,
  LifeLoadAssessment,
  LifeLoadContributor,
  LifeLoadResolutionRecord,
  MindStrength,
  Organization,
  OrganizationParticipation,
  OrganizationParticipationStateRecord,
  OrganizationProfileRecord,
  Partnership,
  PartnershipStateRecord,
  TimeDemandProfile,
  WorkRelationship,
  WorkRoleRecord,
  WorkStatusRecord,
  World,
} from "./types";

export interface ActiveWorkRelationship {
  readonly relationship: WorkRelationship;
  readonly status: WorkStatusRecord;
  readonly role: WorkRoleRecord;
}

export interface ActiveHouseholdMembership {
  readonly membership: HouseholdMembership;
  readonly state: HouseholdMembershipStateRecord;
  readonly household: Household;
  readonly location: HouseholdLocationRecord | null;
}

export interface ActiveCareResponsibility {
  readonly responsibility: CareResponsibility;
  readonly state: CareResponsibilityStateRecord;
}

export interface ActiveEducationEnrollment {
  readonly enrollment: EducationEnrollment;
  readonly state: EducationEnrollmentStateRecord;
}

export interface ActiveOrganizationParticipation {
  readonly participation: OrganizationParticipation;
  readonly state: OrganizationParticipationStateRecord;
}

export interface ActiveChildAuthority {
  readonly authority: ChildAuthority;
  readonly state: ChildAuthorityStateRecord;
}

export type EducationHistoryEvidence =
  | {
      readonly source: "canonical";
      readonly enrollment: EducationEnrollment;
      readonly state: EducationEnrollmentStateRecord;
    }
  | {
      readonly source: "legacy-summary";
      readonly fact: EducationFact;
    };

export function currentLifeCutoff(world: World): HistoricalCutoff {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

export function organizationsAt(
  world: World,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly Organization[] {
  validateCutoff(world, cutoff);
  return world.history.organizations.filter((organization) =>
    available(organization.sequence, organization.formedAt, cutoff),
  );
}

export function organizationProfileHistory(
  world: World,
  organizationId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly OrganizationProfileRecord[] {
  validateCutoff(world, cutoff);
  return world.history.organizationProfiles
    .filter(
      (record) =>
        record.organizationId === organizationId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function organizationProfileAt(
  world: World,
  organizationId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): OrganizationProfileRecord | undefined {
  return organizationProfileHistory(world, organizationId, cutoff).at(-1);
}

export function educationEnrollmentHistoryForPerson(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly EducationEnrollment[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.educationEnrollments.filter(
    (enrollment) =>
      enrollment.personId === personId &&
      available(
        enrollment.sequence,
        enrollment.startedAt < enrollment.recordedAt
          ? enrollment.startedAt
          : enrollment.recordedAt,
        cutoff,
      ),
  );
}

export function educationEnrollmentStateHistory(
  world: World,
  enrollmentId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly EducationEnrollmentStateRecord[] {
  validateCutoff(world, cutoff);
  return world.history.educationEnrollmentStates
    .filter(
      (record) =>
        record.enrollmentId === enrollmentId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function educationEnrollmentStateAt(
  world: World,
  enrollmentId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): EducationEnrollmentStateRecord | undefined {
  return educationEnrollmentStateHistory(world, enrollmentId, cutoff).at(-1);
}

export function activeEducationEnrollmentsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveEducationEnrollment[] {
  return educationEnrollmentHistoryForPerson(world, personId, cutoff).flatMap(
    (enrollment) => {
      const state = educationEnrollmentStateAt(world, enrollment.id, cutoff);
      return state?.status === "active" &&
        enrollment.startedAt <= cutoff.asOfDate
        ? [{ enrollment, state }]
        : [];
    },
  );
}

/** Canonical sequence-aware enrollment wins; biography facts are frontier-only fallback. */
export function educationHistoryEvidenceForPerson(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly EducationHistoryEvidence[] {
  const enrollments = educationEnrollmentHistoryForPerson(
    world,
    personId,
    cutoff,
  );
  if (enrollments.length > 0) {
    return enrollments.flatMap((enrollment) => {
      const state = educationEnrollmentStateAt(world, enrollment.id, cutoff);
      return state ? [{ source: "canonical" as const, enrollment, state }] : [];
    });
  }
  if (
    cutoff.asOfDate !== world.currentDate ||
    cutoff.historySequenceExclusive !== world.history.nextSequence
  ) {
    return [];
  }
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  return factsForPerson(person).flatMap((fact) =>
    fact.kind === "education" && fact.occurredAt <= cutoff.asOfDate
      ? [{ source: "legacy-summary" as const, fact }]
      : [],
  );
}

export function didPeopleShareEducationOrganization(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): boolean {
  if (firstPersonId === secondPersonId) return false;
  const first = educationEnrollmentHistoryForPerson(
    world,
    firstPersonId,
    cutoff,
  );
  const second = educationEnrollmentHistoryForPerson(
    world,
    secondPersonId,
    cutoff,
  );
  return first.some((left) =>
    second.some(
      (right) =>
        left.organizationId === right.organizationId &&
        educationAndEducationPeriodsOverlap(world, left, right, cutoff),
    ),
  );
}

export function didPersonShareEducationOrganizationWithWorker(
  world: World,
  studentPersonId: EntityId,
  workerPersonId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): boolean {
  const enrollments = educationEnrollmentHistoryForPerson(
    world,
    studentPersonId,
    cutoff,
  );
  const work = workRelationshipHistoryForPerson(world, workerPersonId, cutoff);
  return enrollments.some((enrollment) =>
    work.some(
      (relationship) =>
        relationship.organizationId === enrollment.organizationId &&
        educationAndWorkPeriodsOverlap(world, enrollment, relationship, cutoff),
    ),
  );
}

export function organizationParticipationHistoryForPerson(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly OrganizationParticipation[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.organizationParticipations.filter(
    (participation) =>
      participation.personId === personId &&
      available(
        participation.sequence,
        participation.startedAt < participation.recordedAt
          ? participation.startedAt
          : participation.recordedAt,
        cutoff,
      ),
  );
}

export function organizationParticipationStateHistory(
  world: World,
  participationId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly OrganizationParticipationStateRecord[] {
  validateCutoff(world, cutoff);
  return world.history.organizationParticipationStates
    .filter(
      (record) =>
        record.participationId === participationId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function organizationParticipationStateAt(
  world: World,
  participationId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): OrganizationParticipationStateRecord | undefined {
  return organizationParticipationStateHistory(
    world,
    participationId,
    cutoff,
  ).at(-1);
}

export function activeOrganizationParticipationsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveOrganizationParticipation[] {
  return organizationParticipationHistoryForPerson(
    world,
    personId,
    cutoff,
  ).flatMap((participation) => {
    const state = organizationParticipationStateAt(
      world,
      participation.id,
      cutoff,
    );
    return state?.status === "active" &&
      participation.startedAt <= cutoff.asOfDate
      ? [{ participation, state }]
      : [];
  });
}

export function childAuthorityStateHistory(
  world: World,
  childAuthorityId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ChildAuthorityStateRecord[] {
  validateCutoff(world, cutoff);
  return world.history.childAuthorityStates
    .filter(
      (record) =>
        record.childAuthorityId === childAuthorityId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function childAuthorityHistoryForChild(
  world: World,
  childPersonId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ChildAuthority[] {
  validatePersonCutoff(world, childPersonId, cutoff);
  return world.history.childAuthorities.filter(
    (authority) =>
      authority.childPersonId === childPersonId &&
      available(authority.sequence, authority.establishedAt, cutoff),
  );
}

export function childAuthorityStateAt(
  world: World,
  childAuthorityId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): ChildAuthorityStateRecord | undefined {
  return childAuthorityStateHistory(world, childAuthorityId, cutoff).at(-1);
}

export function activeChildAuthoritiesAt(
  world: World,
  childPersonId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveChildAuthority[] {
  validatePersonCutoff(world, childPersonId, cutoff);
  return childAuthorityHistoryForChild(world, childPersonId, cutoff).flatMap(
    (authority) => {
      const state = childAuthorityStateAt(world, authority.id, cutoff);
      return state?.status === "active" ? [{ authority, state }] : [];
    },
  );
}

export function activeAuthoritiesHeldByPersonAt(
  world: World,
  holderPersonId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveChildAuthority[] {
  validatePersonCutoff(world, holderPersonId, cutoff);
  return world.history.childAuthorities.flatMap((authority) => {
    if (
      authority.holder.kind !== "person" ||
      authority.holder.personId !== holderPersonId ||
      !available(authority.sequence, authority.establishedAt, cutoff)
    ) {
      return [];
    }
    const state = childAuthorityStateAt(world, authority.id, cutoff);
    return state?.status === "active" ? [{ authority, state }] : [];
  });
}

export function workRelationshipHistoryForPerson(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly WorkRelationship[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.workRelationships.filter(
    (relationship) =>
      relationship.personId === personId &&
      available(
        relationship.sequence,
        relationship.startedAt < relationship.recordedAt
          ? relationship.startedAt
          : relationship.recordedAt,
        cutoff,
      ),
  );
}

export function workStatusHistory(
  world: World,
  workRelationshipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly WorkStatusRecord[] {
  validateCutoff(world, cutoff);
  return world.history.workStatuses
    .filter(
      (record) =>
        record.workRelationshipId === workRelationshipId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function workRoleHistory(
  world: World,
  workRelationshipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly WorkRoleRecord[] {
  validateCutoff(world, cutoff);
  return world.history.workRoles
    .filter(
      (record) =>
        record.workRelationshipId === workRelationshipId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function workStatusAt(
  world: World,
  workRelationshipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): WorkStatusRecord | undefined {
  return workStatusHistory(world, workRelationshipId, cutoff).at(-1);
}

export function workRoleAt(
  world: World,
  workRelationshipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): WorkRoleRecord | undefined {
  return workRoleHistory(world, workRelationshipId, cutoff).at(-1);
}

export function activeWorkRelationshipsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveWorkRelationship[] {
  return workRelationshipHistoryForPerson(world, personId, cutoff).flatMap(
    (relationship) => {
      const status = workStatusAt(world, relationship.id, cutoff);
      const role = workRoleAt(world, relationship.id, cutoff);
      return status?.status === "active" &&
        relationship.startedAt <= cutoff.asOfDate &&
        role
        ? [{ relationship, status, role }]
        : [];
    },
  );
}

export function didPeopleShareOrganizationWork(
  world: World,
  firstPersonId: EntityId,
  secondPersonId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): boolean {
  if (firstPersonId === secondPersonId) return false;
  const first = workRelationshipHistoryForPerson(world, firstPersonId, cutoff);
  const second = workRelationshipHistoryForPerson(
    world,
    secondPersonId,
    cutoff,
  );
  return first.some(
    (left) =>
      left.organizationId !== null &&
      second.some(
        (right) =>
          right.organizationId === left.organizationId &&
          workPeriodsOverlap(world, left, right, cutoff),
      ),
  );
}

export function householdLocationHistory(
  world: World,
  householdId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly HouseholdLocationRecord[] {
  validateCutoff(world, cutoff);
  return world.history.householdLocations
    .filter(
      (record) =>
        record.householdId === householdId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function householdLocationAt(
  world: World,
  householdId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): HouseholdLocationRecord | undefined {
  return householdLocationHistory(world, householdId, cutoff).at(-1);
}

export function householdMembershipStateHistory(
  world: World,
  membershipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly HouseholdMembershipStateRecord[] {
  validateCutoff(world, cutoff);
  return world.history.householdMembershipStates
    .filter(
      (record) =>
        record.membershipId === membershipId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function householdMembershipStateAt(
  world: World,
  membershipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): HouseholdMembershipStateRecord | undefined {
  return householdMembershipStateHistory(world, membershipId, cutoff).at(-1);
}

export function householdMembershipsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveHouseholdMembership[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.householdMemberships.flatMap((membership) => {
    if (
      membership.personId !== personId ||
      !available(membership.sequence, membership.startedAt, cutoff)
    ) {
      return [];
    }
    const state = householdMembershipStateAt(world, membership.id, cutoff);
    const household = world.history.households.find(
      (candidate) => candidate.id === membership.householdId,
    );
    if (!state || state.status !== "resident" || !household) return [];
    return [
      {
        membership,
        state,
        household,
        location: householdLocationAt(world, household.id, cutoff) ?? null,
      },
    ];
  });
}

export function peopleInHouseholdAt(
  world: World,
  householdId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly EntityId[] {
  validateCutoff(world, cutoff);
  return world.history.householdMemberships
    .filter(
      (membership) =>
        membership.householdId === householdId &&
        available(membership.sequence, membership.startedAt, cutoff) &&
        householdMembershipStateAt(world, membership.id, cutoff)?.status ===
          "resident",
    )
    .map((membership) => membership.personId)
    .sort();
}

export function hasHouseholdResidenceInJurisdiction(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): boolean {
  validatePersonCutoff(world, personId, cutoff);
  const dates = new Set<string>([cutoff.asOfDate]);
  for (const membership of world.history.householdMemberships) {
    if (
      membership.personId === personId &&
      membership.sequence < cutoff.historySequenceExclusive
    ) {
      dates.add(membership.startedAt);
      for (const state of householdMembershipStateHistory(
        world,
        membership.id,
        cutoff,
      )) {
        dates.add(state.effectiveAt);
      }
      for (const location of householdLocationHistory(
        world,
        membership.householdId,
        cutoff,
      )) {
        dates.add(location.effectiveAt);
      }
    }
  }
  return [...dates].some((date) => {
    if (date > cutoff.asOfDate) return false;
    return householdMembershipsAt(world, personId, {
      ...cutoff,
      asOfDate: date as HistoricalCutoff["asOfDate"],
    }).some(
      (membership) => membership.location?.jurisdictionId === jurisdictionId,
    );
  });
}

export function kinshipRelationshipsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly KinshipRelationship[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.kinshipRelationships.filter(
    (relationship) =>
      relationship.personIds.includes(personId) &&
      available(relationship.sequence, relationship.establishedAt, cutoff),
  );
}

export function partnershipStateHistory(
  world: World,
  partnershipId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly PartnershipStateRecord[] {
  validateCutoff(world, cutoff);
  return world.history.partnershipStates
    .filter(
      (record) =>
        record.partnershipId === partnershipId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function activePartnershipsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly Partnership[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.partnerships.filter(
    (partnership) =>
      partnership.personIds.includes(personId) &&
      available(partnership.sequence, partnership.startedAt, cutoff) &&
      partnershipStateHistory(world, partnership.id, cutoff).at(-1)?.status ===
        "active",
  );
}

export function careResponsibilityStateHistory(
  world: World,
  careResponsibilityId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly CareResponsibilityStateRecord[] {
  validateCutoff(world, cutoff);
  return world.history.careResponsibilityStates
    .filter(
      (record) =>
        record.careResponsibilityId === careResponsibilityId &&
        available(record.sequence, record.effectiveAt, cutoff),
    )
    .sort(byEffectiveDateThenSequence);
}

export function activeCareResponsibilitiesAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly ActiveCareResponsibility[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.careResponsibilities.flatMap((responsibility) => {
    if (
      responsibility.caregiverPersonId !== personId ||
      !available(responsibility.sequence, responsibility.startedAt, cutoff)
    ) {
      return [];
    }
    const state = careResponsibilityStateHistory(
      world,
      responsibility.id,
      cutoff,
    ).at(-1);
    return state?.status === "active" ? [{ responsibility, state }] : [];
  });
}

export function activeLifeCommitmentsAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly LifeCommitmentRecord[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.lifeCommitments.filter(
    (record) =>
      record.personId === personId &&
      available(record.sequence, record.startsAt, cutoff) &&
      (record.endsAt === null || cutoff.asOfDate < record.endsAt),
  );
}

export function assessLifeLoadAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): LifeLoadAssessment {
  validatePersonCutoff(world, personId, cutoff);
  const contributors: LifeLoadContributor[] = [];
  for (const active of activeWorkRelationshipsAt(world, personId, cutoff)) {
    contributors.push({
      kind: "work-role",
      recordId: active.role.id,
      label: active.role.title,
      timeDemand: cloneTimeDemand(active.role.timeDemand),
    });
  }
  for (const active of activeCareResponsibilitiesAt(world, personId, cutoff)) {
    contributors.push({
      kind: "care-responsibility",
      recordId: active.state.id,
      label: active.state.context,
      timeDemand: cloneTimeDemand(active.state.timeDemand),
    });
  }
  for (const commitment of activeLifeCommitmentsAt(world, personId, cutoff)) {
    contributors.push({
      kind: "life-commitment",
      recordId: commitment.id,
      label: commitment.label,
      timeDemand: cloneTimeDemand(commitment.timeDemand),
    });
  }
  contributors.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.recordId.localeCompare(right.recordId),
  );

  const expectedWeekly = sumRanges(
    contributors.map((item) => item.timeDemand.expectedWeekly),
  );
  const exclusiveEquivalentWeekly = sumRanges(
    contributors.map((item) => exclusiveRange(item.timeDemand)),
  );
  const coordinationPoints = contributors.reduce(
    (total, item) => total + coordinationWeight(item.timeDemand),
    0,
  );
  const constrainedLocations = new Set(
    contributors
      .filter(
        (item) =>
          item.timeDemand.scheduleRigidity === "rigid" &&
          item.timeDemand.locationJurisdictionId !== null,
      )
      .map((item) => item.timeDemand.locationJurisdictionId),
  );
  const coordinationPressure = coordinationBand(
    coordinationPoints + Math.max(0, constrainedLocations.size - 1) * 2,
  );
  const loadBand = deriveLoadBand(
    exclusiveEquivalentWeekly.maximumHours,
    coordinationPressure,
  );
  return {
    personId,
    cutoff: { ...cutoff },
    expectedWeekly,
    exclusiveEquivalentWeekly,
    coordinationPressure,
    loadBand,
    contributors,
  };
}

export function lifeLoadResolutionHistory(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly LifeLoadResolutionRecord[] {
  validatePersonCutoff(world, personId, cutoff);
  return world.history.lifeLoadResolutions
    .filter(
      (record) =>
        record.personId === personId &&
        available(record.sequence, record.periodEndsAt, cutoff),
    )
    .sort(
      (left, right) =>
        left.periodEndsAt.localeCompare(right.periodEndsAt) ||
        left.sequence - right.sequence,
    );
}

export function fatigueAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): MindStrength | null {
  validatePersonCutoff(world, personId, cutoff);
  const strengths: readonly MindStrength[] = [
    "subtle",
    "moderate",
    "strong",
    "defining",
  ];
  return (
    world.history.temporaryStates
      .filter(
        (record) =>
          record.personId === personId &&
          record.stateKey === "life:fatigue" &&
          available(record.sequence, record.recordedAt, cutoff) &&
          record.startsAt <= cutoff.asOfDate &&
          cutoff.asOfDate < record.endsAt,
      )
      .map((record) => record.intensity)
      .sort((left, right) => strengths.indexOf(left) - strengths.indexOf(right))
      .at(-1) ?? null
  );
}

function workPeriodsOverlap(
  world: World,
  left: WorkRelationship,
  right: WorkRelationship,
  cutoff: HistoricalCutoff,
): boolean {
  const dates = new Set([
    left.startedAt,
    right.startedAt,
    ...workStatusHistory(world, left.id, cutoff).map(
      (item) => item.effectiveAt,
    ),
    ...workStatusHistory(world, right.id, cutoff).map(
      (item) => item.effectiveAt,
    ),
    cutoff.asOfDate,
  ]);
  return [...dates].some((date) => {
    if (date > cutoff.asOfDate) return false;
    const atDate = { ...cutoff, asOfDate: date };
    return (
      workStatusAt(world, left.id, atDate)?.status === "active" &&
      workStatusAt(world, right.id, atDate)?.status === "active" &&
      left.startedAt <= date &&
      right.startedAt <= date
    );
  });
}

function educationAndEducationPeriodsOverlap(
  world: World,
  left: EducationEnrollment,
  right: EducationEnrollment,
  cutoff: HistoricalCutoff,
): boolean {
  const dates = new Set([
    left.startedAt,
    right.startedAt,
    ...educationEnrollmentStateHistory(world, left.id, cutoff).map(
      (item) => item.effectiveAt,
    ),
    ...educationEnrollmentStateHistory(world, right.id, cutoff).map(
      (item) => item.effectiveAt,
    ),
    cutoff.asOfDate,
  ]);
  return [...dates].some((date) => {
    if (date > cutoff.asOfDate) return false;
    const atDate = { ...cutoff, asOfDate: date };
    return (
      educationEnrollmentStateAt(world, left.id, atDate)?.status === "active" &&
      educationEnrollmentStateAt(world, right.id, atDate)?.status ===
        "active" &&
      left.startedAt <= date &&
      right.startedAt <= date
    );
  });
}

function educationAndWorkPeriodsOverlap(
  world: World,
  enrollment: EducationEnrollment,
  work: WorkRelationship,
  cutoff: HistoricalCutoff,
): boolean {
  const dates = new Set([
    enrollment.startedAt,
    work.startedAt,
    ...educationEnrollmentStateHistory(world, enrollment.id, cutoff).map(
      (item) => item.effectiveAt,
    ),
    ...workStatusHistory(world, work.id, cutoff).map(
      (item) => item.effectiveAt,
    ),
    cutoff.asOfDate,
  ]);
  return [...dates].some((date) => {
    if (date > cutoff.asOfDate) return false;
    const atDate = { ...cutoff, asOfDate: date };
    return (
      educationEnrollmentStateAt(world, enrollment.id, atDate)?.status ===
        "active" &&
      workStatusAt(world, work.id, atDate)?.status === "active" &&
      enrollment.startedAt <= date &&
      work.startedAt <= date
    );
  });
}

function exclusiveRange(profile: TimeDemandProfile): ExpectedWeeklyTimeRange {
  const concurrencyIndex =
    profile.concurrency === "mostly-concurrent"
      ? 0
      : profile.concurrency === "partly-concurrent"
        ? 1
        : 2;
  const attentionIndex =
    profile.attention === "low"
      ? 0
      : profile.attention === "moderate"
        ? 1
        : profile.attention === "high"
          ? 2
          : 3;
  const weights = [
    [0.15, 0.25, 0.5, 0.75],
    [0.4, 0.55, 0.75, 0.9],
    [1, 1, 1, 1],
  ] as const;
  const weight = weights[concurrencyIndex]?.[attentionIndex] ?? 1;
  return {
    minimumHours: Math.round(profile.expectedWeekly.minimumHours * weight),
    maximumHours: Math.round(profile.expectedWeekly.maximumHours * weight),
  };
}

function coordinationWeight(profile: TimeDemandProfile): number {
  const rigidity =
    profile.scheduleRigidity === "flexible"
      ? 0
      : profile.scheduleRigidity === "mixed"
        ? 1
        : 2;
  const interruption =
    profile.interruptibility === "interruptible"
      ? 0
      : profile.interruptibility === "limited"
        ? 1
        : 2;
  return rigidity + interruption;
}

function coordinationBand(points: number): CoordinationPressure {
  if (points <= 1) return "low";
  if (points <= 4) return "moderate";
  if (points <= 7) return "high";
  return "severe";
}

function deriveLoadBand(
  maximumExclusiveHours: number,
  coordinationPressure: CoordinationPressure,
): LifeLoadAssessment["loadBand"] {
  const coordinationAdjustment =
    coordinationPressure === "low"
      ? 0
      : coordinationPressure === "moderate"
        ? 5
        : coordinationPressure === "high"
          ? 10
          : 15;
  const pressure = maximumExclusiveHours + coordinationAdjustment;
  if (pressure <= 40) return "sustainable";
  if (pressure <= 55) return "demanding";
  if (pressure <= 70) return "overloaded";
  return "severe";
}

function sumRanges(
  ranges: readonly ExpectedWeeklyTimeRange[],
): ExpectedWeeklyTimeRange {
  return ranges.reduce(
    (sum, range) => ({
      minimumHours: sum.minimumHours + range.minimumHours,
      maximumHours: sum.maximumHours + range.maximumHours,
    }),
    { minimumHours: 0, maximumHours: 0 },
  );
}

function cloneTimeDemand(profile: TimeDemandProfile): TimeDemandProfile {
  return {
    ...profile,
    expectedWeekly: { ...profile.expectedWeekly },
  };
}

function validatePersonCutoff(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): void {
  validateCutoff(world, cutoff);
  const person = world.people[personId];
  if (!person) throw new Error(`Missing person: ${personId}`);
  if (cutoff.asOfDate < person.birthDate) {
    throw new Error("Historical cutoff predates the person's birth.");
  }
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  const asOfDate = makeIsoDate(cutoff.asOfDate);
  if (asOfDate > world.currentDate) {
    throw new Error("Historical cutoff is after the current world date.");
  }
  if (
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Historical cutoff sequence is outside world history.");
  }
}

function available(
  sequence: number,
  effectiveAt: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    sequence < cutoff.historySequenceExclusive && effectiveAt <= cutoff.asOfDate
  );
}

function byEffectiveDateThenSequence<
  T extends { readonly effectiveAt: string; readonly sequence: number },
>(left: T, right: T): number {
  return (
    left.effectiveAt.localeCompare(right.effectiveAt) ||
    left.sequence - right.sequence
  );
}
