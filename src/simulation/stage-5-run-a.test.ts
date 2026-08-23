import { describe, expect, it } from "vitest";

import {
  activeCareResponsibilitiesAt,
  activeChildAuthoritiesAt,
  activeEducationEnrollmentsAt,
  activeOrganizationParticipationsAt,
  activeAuthoritiesHeldByPersonAt,
  advanceWorld,
  appendPersonFact,
  assessLifeLoadAt,
  assertWorldIntegrity,
  childAuthorityHistoryForChild,
  childAuthorityStateHistory,
  createCareResponsibility,
  createChildAuthority,
  createDemoWorld,
  createEducationEnrollment,
  createHousehold,
  createOrganization,
  createOrganizationParticipation,
  createStableId,
  createWorld,
  createWorkRelationship,
  currentLifeCutoff,
  deserializeWorld,
  didPeoplePreviouslyWorkTogether,
  didPersonShareEducationOrganizationWithWorker,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  educationHistoryEvidenceForPerson,
  evaluateDecision,
  evaluateLifeEligibility,
  factsForPerson,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  makeIsoDate,
  materializePerson,
  organizationParticipationHistoryForPerson,
  organizationProfileAt,
  recordChildAuthorityState,
  recordAppraisal,
  recordDurableDecisionTrace,
  recordEducationEnrollmentState,
  recordKinship,
  recordLifeCommitment,
  recordOrganizationProfile,
  recordPerception,
  recordRelationshipInteraction,
  recordWorkStatus,
  recordWorldEvent,
  relationshipHistory,
  serializeWorld,
  startHouseholdMembership,
  workRelationshipHistoryForPerson,
} from "./index";
import type {
  EntityId,
  Jurisdiction,
  LifeEligibilityProvider,
  LifeRecordProvenance,
  Person,
  TimeDemandProfile,
  World,
} from "./types";

const AUTHORED: LifeRecordProvenance = {
  kind: "authored",
  note: "Synthetic Stage 5 Run A semantic fixture.",
};

const LIGHT_TIME: TimeDemandProfile = {
  expectedWeekly: { minimumHours: 3, maximumHours: 6 },
  attention: "moderate",
  concurrency: "partly-concurrent",
  scheduleRigidity: "flexible",
  interruptibility: "interruptible",
  locationJurisdictionId: null,
};

const TERRITORY_ID = createStableId(
  "jurisdiction",
  "definition:run-a-open-territory-placeholder",
);

function createRunAWorld(seed = "stage-5-run-a"): World {
  const demo = createDemoWorld(seed);
  const firstJurisdictionId = demo.jurisdictionOrder[0];
  const firstJurisdiction = firstJurisdictionId
    ? demo.jurisdictions[firstJurisdictionId]
    : undefined;
  if (!firstJurisdiction) throw new Error("Missing demo jurisdiction.");
  const territory: Jurisdiction = {
    id: TERRITORY_ID,
    slug: "run-a-open-territory-placeholder",
    name: "Run A open territory placeholder",
    kind: "territory-placeholder",
    parentName: null,
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: TERRITORY_ID,
      status: "placeholder",
    },
  };
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: [firstJurisdiction, territory],
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function personId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing Run A person ${index}.`);
  return id;
}

function addOrganization(
  world: World,
  stableKey: string,
  name = stableKey,
  jurisdictionId: EntityId | null = TERRITORY_ID,
): { readonly world: World; readonly id: EntityId } {
  const next = createOrganization(world, {
    stableKey,
    formedAt: "1980-01-01",
    provenance: AUTHORED,
    initialProfile: {
      name,
      classification: "custom:run-a-institution",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const id = next.history.organizations.at(-1)?.id;
  if (!id) throw new Error("Missing Run A organization.");
  return { world: next, id };
}

function addHousehold(
  world: World,
  stableKey: string,
): { readonly world: World; readonly id: EntityId } {
  const next = createHousehold(world, {
    stableKey,
    formedAt: "1999-01-01",
    label: stableKey,
    provenance: AUTHORED,
  });
  const id = next.history.households.at(-1)?.id;
  if (!id) throw new Error("Missing Run A household.");
  return { world: next, id };
}

describe("Stage 5 Run A structural relationship separation", () => {
  it("keeps grandparent care and co-residence independent from parent kinship and authority", () => {
    let world = createRunAWorld("run-a-grandparent-care");
    const childId = personId(world, 1);
    const parentId = personId(world, 0);
    const grandparentId = personId(world, 5);
    const childHome = addHousehold(world, "household:child-grandparent");
    world = childHome.world;
    const parentHome = addHousehold(world, "household:parent-elsewhere");
    world = parentHome.world;
    for (const [stableKey, residentId, householdId] of [
      ["membership:child", childId, childHome.id],
      ["membership:grandparent", grandparentId, childHome.id],
      ["membership:parent", parentId, parentHome.id],
    ] as const) {
      world = startHouseholdMembership(world, {
        stableKey,
        personId: residentId,
        householdId,
        startedAt: "2000-01-01",
        residenceRole: "primary",
        kind: "resident:family-home",
        provenance: AUTHORED,
      });
    }
    world = recordKinship(world, {
      stableKey: "kinship:child-parent",
      personIds: [childId, parentId],
      establishedAt: "2000-01-01",
      kind: "lineal:parent-child",
      provenance: AUTHORED,
    });
    world = recordKinship(world, {
      stableKey: "kinship:child-grandparent",
      personIds: [childId, grandparentId],
      establishedAt: "2000-01-01",
      kind: "lineal:grandparent-grandchild",
      provenance: AUTHORED,
    });
    world = createCareResponsibility(world, {
      stableKey: "care:grandparent-child",
      caregiverPersonId: grandparentId,
      recipientPersonId: childId,
      startedAt: "2000-01-01",
      kind: "supervision:daily-care",
      share: "primary",
      context: "Daily care in the grandparent's household",
      timeDemand: LIGHT_TIME,
      provenance: AUTHORED,
    });
    world = createChildAuthority(world, {
      stableKey: "authority:parent-child",
      childPersonId: childId,
      holder: { kind: "person", personId: parentId },
      establishedAt: "2000-01-01",
      kind: "parental:recognized-parent",
      basisKind: "legal:parental-status",
      context: "Parent retains authority while living elsewhere",
      provenance: AUTHORED,
    });

    expect(householdMembershipsAt(world, childId)[0]?.household.id).toBe(
      childHome.id,
    );
    expect(householdMembershipsAt(world, parentId)[0]?.household.id).toBe(
      parentHome.id,
    );
    expect(
      activeCareResponsibilitiesAt(world, grandparentId)[0]?.responsibility,
    ).toMatchObject({ recipientPersonId: childId });
    expect(
      activeChildAuthoritiesAt(world, childId)[0]?.authority.holder,
    ).toEqual({ kind: "person", personId: parentId });
    expect(activeAuthoritiesHeldByPersonAt(world, parentId)).toHaveLength(1);
    expect(kinshipRelationshipsAt(world, childId)).toHaveLength(2);
    expect(world.history.partnerships).toHaveLength(0);
  });

  it("supports a relative guardian without manufacturing household or partnership state", () => {
    let world = createRunAWorld("run-a-relative-guardian");
    const childId = personId(world, 1);
    const relativeId = personId(world, 3);
    world = recordKinship(world, {
      stableKey: "kinship:child-relative",
      personIds: [childId, relativeId],
      establishedAt: "2005-01-01",
      kind: "extended:guardian-relative",
      provenance: AUTHORED,
    });
    const beforeKinship = structuredClone(world.history.kinshipRelationships);
    world = createChildAuthority(world, {
      stableKey: "authority:relative-guardian",
      childPersonId: childId,
      holder: { kind: "person", personId: relativeId },
      establishedAt: "2005-01-01",
      kind: "guardianship:relative-guardian",
      basisKind: "custom:community-recognized-basis",
      context: null,
      provenance: AUTHORED,
    });
    const authority = world.history.childAuthorities.at(-1);
    const state = world.history.childAuthorityStates.at(-1);
    if (!authority || !state) throw new Error("Missing relative authority.");

    expect(world.history.kinshipRelationships).toStrictEqual(beforeKinship);
    expect(world.history.partnerships).toHaveLength(0);
    expect(world.history.householdMemberships).toHaveLength(0);
    expect(world.history.careResponsibilities).toHaveLength(0);
    world = recordChildAuthorityState(world, {
      stableKey: "authority:relative-guardian:ended",
      childAuthorityId: authority.id,
      effectiveAt: "2020-01-01",
      status: "ended",
      basisKind: "legal:guardianship-ended",
      context: "Authority ended without changing kinship identity",
      provenance: AUTHORED,
      supersedesStateId: state.id,
    });
    expect(activeChildAuthoritiesAt(world, childId)).toHaveLength(0);
    expect(childAuthorityHistoryForChild(world, childId)).toHaveLength(1);
    expect(
      childAuthorityStateHistory(world, authority.id).map(
        (item) => item.status,
      ),
    ).toEqual(["active", "ended"]);
    expect(kinshipRelationshipsAt(world, childId)).toHaveLength(1);
  });

  it("allows agency authority while a different caregiver supplies care and co-residence", () => {
    let world = createRunAWorld("run-a-agency-authority");
    const childId = personId(world, 1);
    const caregiverId = personId(world, 4);
    const agency = addOrganization(world, "org:child-welfare-agency", "Agency");
    world = agency.world;
    const home = addHousehold(world, "household:foster-caregiver");
    world = home.world;
    for (const [key, id] of [
      ["membership:agency-child", childId],
      ["membership:agency-caregiver", caregiverId],
    ] as const) {
      world = startHouseholdMembership(world, {
        stableKey: key,
        personId: id,
        householdId: home.id,
        startedAt: "2005-01-01",
        residenceRole: "primary",
        kind: "shared-care:foster-home",
        provenance: AUTHORED,
      });
    }
    world = createCareResponsibility(world, {
      stableKey: "care:foster-caregiver-child",
      caregiverPersonId: caregiverId,
      recipientPersonId: childId,
      startedAt: "2005-01-01",
      kind: "personal:daily-care",
      share: "primary",
      context: "Daily foster care and co-residence",
      timeDemand: LIGHT_TIME,
      provenance: AUTHORED,
    });
    world = createChildAuthority(world, {
      stableKey: "authority:agency-custody",
      childPersonId: childId,
      holder: { kind: "organization", organizationId: agency.id },
      establishedAt: "2005-01-01",
      kind: "custody:agency-custody",
      basisKind: "administrative:placement-order",
      context: "Agency custody is separate from the daily caregiver",
      provenance: AUTHORED,
    });

    expect(
      activeChildAuthoritiesAt(world, childId)[0]?.authority.holder,
    ).toEqual({ kind: "organization", organizationId: agency.id });
    expect(
      activeCareResponsibilitiesAt(world, caregiverId)[0]?.responsibility,
    ).toMatchObject({ recipientPersonId: childId });
    expect(householdMembershipsAt(world, childId)[0]?.household.id).toBe(
      home.id,
    );
    expect(world.history.kinshipRelationships).toHaveLength(0);
  });
});

describe("Stage 5 Run A education and participation histories", () => {
  it("preserves school transfer and later rename through stable organization history", () => {
    let world = createRunAWorld("run-a-school-transfer");
    const studentId = personId(world, 1);
    const schoolA = addOrganization(world, "org:school-a", "School A");
    world = schoolA.world;
    const schoolB = addOrganization(world, "org:school-b", "School B");
    world = schoolB.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:student:school-a",
      personId: studentId,
      organizationId: schoolA.id,
      startedAt: "2010-09-01",
      programKind: "schooling:secondary-program",
      contextKind: "stage:secondary",
      provenance: AUTHORED,
    });
    const firstEnrollment = world.history.educationEnrollments.at(-1);
    const firstState = world.history.educationEnrollmentStates.at(-1);
    if (!firstEnrollment || !firstState) throw new Error("Missing School A.");
    world = recordEducationEnrollmentState(world, {
      stableKey: "education:student:school-a:transferred",
      enrollmentId: firstEnrollment.id,
      effectiveAt: "2013-09-01",
      status: "transferred",
      contextKind: "stage:secondary",
      reason: "Transferred to School B",
      provenance: AUTHORED,
      supersedesStateId: firstState.id,
    });
    world = createEducationEnrollment(world, {
      stableKey: "education:student:school-b",
      personId: studentId,
      organizationId: schoolB.id,
      startedAt: "2013-09-01",
      programKind: "schooling:secondary-program",
      contextKind: "track:interdisciplinary",
      provenance: AUTHORED,
    });
    const secondEnrollment = world.history.educationEnrollments.at(-1);
    const secondState = world.history.educationEnrollmentStates.at(-1);
    if (!secondEnrollment || !secondState) throw new Error("Missing School B.");
    world = recordEducationEnrollmentState(world, {
      stableKey: "education:student:school-b:completed",
      enrollmentId: secondEnrollment.id,
      effectiveAt: "2017-06-01",
      status: "completed",
      contextKind: "track:interdisciplinary",
      reason: "Completed the program",
      provenance: AUTHORED,
      supersedesStateId: secondState.id,
    });
    const oldProfile = organizationProfileAt(world, schoolA.id);
    if (!oldProfile) throw new Error("Missing School A profile.");
    world = recordOrganizationProfile(world, {
      stableKey: "org:school-a:profile:renamed",
      organizationId: schoolA.id,
      effectiveAt: "2020-01-01",
      name: "School A Community Academy",
      classification: "custom:run-a-institution",
      locationJurisdictionId: TERRITORY_ID,
      provenance: AUTHORED,
      supersedesProfileId: oldProfile.id,
    });

    expect(educationEnrollmentHistoryForPerson(world, studentId)).toHaveLength(
      2,
    );
    expect(
      activeEducationEnrollmentsAt(world, studentId, {
        asOfDate: makeIsoDate("2012-01-01"),
        historySequenceExclusive: world.history.nextSequence,
      })[0]?.enrollment.organizationId,
    ).toBe(schoolA.id);
    expect(
      activeEducationEnrollmentsAt(world, studentId, {
        asOfDate: makeIsoDate("2015-01-01"),
        historySequenceExclusive: world.history.nextSequence,
      })[0]?.enrollment.organizationId,
    ).toBe(schoolB.id);
    expect(
      organizationProfileAt(world, schoolA.id, {
        asOfDate: makeIsoDate("2012-01-01"),
        historySequenceExclusive: world.history.nextSequence,
      })?.name,
    ).toBe("School A");
    expect(organizationProfileAt(world, schoolA.id)?.name).toBe(
      "School A Community Academy",
    );
    expect(firstEnrollment.organizationId).toBe(schoolA.id);
  });

  it("keeps expected enrollment inactive until an explicit dated activation", () => {
    let world = createRunAWorld("run-a-expected-enrollment");
    const studentId = personId(world, 1);
    const school = addOrganization(
      world,
      "org:future-training",
      "Training Lab",
    );
    world = school.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:future-training",
      personId: studentId,
      organizationId: school.id,
      startedAt: "2027-01-05",
      initialStatus: "expected",
      programKind: "training:future-residency",
      contextKind: "program:planned",
      provenance: AUTHORED,
    });
    const enrollment = world.history.educationEnrollments.at(-1);
    const state = world.history.educationEnrollmentStates.at(-1);
    if (!enrollment || !state) throw new Error("Missing expected enrollment.");
    expect(educationEnrollmentStateAt(world, enrollment.id)?.status).toBe(
      "expected",
    );
    expect(activeEducationEnrollmentsAt(world, studentId)).toHaveLength(0);
    world = advanceWorld(world, 365);
    world = recordEducationEnrollmentState(world, {
      stableKey: "education:future-training:active",
      enrollmentId: enrollment.id,
      effectiveAt: "2027-01-05",
      status: "active",
      contextKind: "program:begun",
      reason: "Planned program began",
      provenance: AUTHORED,
      supersedesStateId: state.id,
    });
    expect(activeEducationEnrollmentsAt(world, studentId)).toHaveLength(1);
  });

  it("proves teacher/former-student continuity through organization IDs before later coworker and ally history", () => {
    let world = createRunAWorld("run-a-school-continuity");
    const teacherId = personId(world, 0);
    const studentId = personId(world, 1);
    const school = addOrganization(world, "org:shared-school", "Shared School");
    world = school.world;
    world = createWorkRelationship(world, {
      stableKey: "work:teacher:shared-school",
      personId: teacherId,
      organizationId: school.id,
      startedAt: "2009-01-01",
      kind: "employment:teacher",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: AUTHORED,
      initialRole: {
        title: "Teacher",
        occupationClassification: "profession:educator",
        locationJurisdictionId: TERRITORY_ID,
        timeDemand: LIGHT_TIME,
      },
    });
    const teaching = world.history.workRelationships.at(-1);
    const teachingStatus = world.history.workStatuses.at(-1);
    if (!teaching || !teachingStatus) {
      throw new Error("Missing teacher work history.");
    }
    world = createEducationEnrollment(world, {
      stableKey: "education:former-student:shared-school",
      personId: studentId,
      organizationId: school.id,
      startedAt: "2010-01-01",
      programKind: "schooling:secondary-program",
      contextKind: "stage:secondary",
      provenance: AUTHORED,
    });
    const schoolEnrollment = world.history.educationEnrollments.at(-1);
    const schoolEnrollmentState =
      world.history.educationEnrollmentStates.at(-1);
    if (!schoolEnrollment || !schoolEnrollmentState) {
      throw new Error("Missing former-student enrollment history.");
    }
    world = recordEducationEnrollmentState(world, {
      stableKey: "education:former-student:shared-school:completed",
      enrollmentId: schoolEnrollment.id,
      effectiveAt: "2014-06-01",
      status: "completed",
      contextKind: "stage:secondary",
      reason: "Completed the school program",
      provenance: AUTHORED,
      supersedesStateId: schoolEnrollmentState.id,
    });
    world = recordWorkStatus(world, {
      stableKey: "work:teacher:shared-school:ended",
      workRelationshipId: teaching.id,
      effectiveAt: "2015-06-01",
      status: "ended",
      reason: "Left the school",
      provenance: AUTHORED,
      supersedesStatusId: teachingStatus.id,
    });
    expect(
      didPersonShareEducationOrganizationWithWorker(
        world,
        studentId,
        teacherId,
      ),
    ).toBe(true);

    const workplace = addOrganization(
      world,
      "org:later-workplace",
      "Later Work",
    );
    world = workplace.world;
    for (const [key, id] of [
      ["work:later:teacher", teacherId],
      ["work:later:student", studentId],
    ] as const) {
      world = createWorkRelationship(world, {
        stableKey: key,
        personId: id,
        organizationId: workplace.id,
        startedAt: "2020-01-01",
        kind: "employment:staff",
        compensation: "paid",
        authority: "shared",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: AUTHORED,
        initialRole: {
          title: "Program staff",
          occupationClassification: "custom:program-staff",
          locationJurisdictionId: TERRITORY_ID,
          timeDemand: LIGHT_TIME,
        },
      });
    }
    world = recordRelationshipInteraction(world, {
      stableKey: "relationship:later-political-allies",
      personIds: [teacherId, studentId],
      eventId: null,
      occurredAt: makeIsoDate("2022-01-01"),
      kind: "support:political-alliance",
      change: "strengthened",
      significance: "meaningful",
      summary: "The former teacher and student later became political allies.",
      tags: ["relationship.political-alliance"],
    });

    expect(didPeoplePreviouslyWorkTogether(world, teacherId, studentId)).toBe(
      true,
    );
    expect(relationshipHistory(world, teacherId, studentId)).toHaveLength(1);
    expect(
      didPersonShareEducationOrganizationWithWorker(
        world,
        studentId,
        teacherId,
        {
          asOfDate: makeIsoDate("2012-01-01"),
          historySequenceExclusive: world.history.nextSequence,
        },
      ),
    ).toBe(true);
  });

  it("separates non-work participation from actual volunteer service and reuses life commitments for load", () => {
    let world = createRunAWorld("run-a-participation-boundary");
    const studentId = personId(world, 1);
    const school = addOrganization(world, "org:debate-school", "Debate School");
    world = school.world;
    const church = addOrganization(world, "org:church-group", "Church Group");
    world = church.world;
    world = createOrganizationParticipation(world, {
      stableKey: "participation:school-debate",
      personId: studentId,
      organizationId: school.id,
      startedAt: "2020-01-01",
      kind: "activity:debate",
      roleKind: "participant:debater",
      context: "Debate activity hosted inside the school organization",
      provenance: AUTHORED,
    });
    world = createOrganizationParticipation(world, {
      stableKey: "participation:church-youth-group",
      personId: studentId,
      organizationId: church.id,
      startedAt: "2020-01-01",
      kind: "membership:youth-group",
      roleKind: "member:participant",
      context: "Membership in a separate persistent organization",
      provenance: AUTHORED,
    });
    world = recordLifeCommitment(world, {
      stableKey: "commitment:school-debate",
      personId: studentId,
      startsAt: "2020-01-01",
      endsAt: null,
      kind: "community:school-debate-practice",
      label: "School debate practice",
      timeDemand: LIGHT_TIME,
      provenance: AUTHORED,
    });
    expect(activeOrganizationParticipationsAt(world, studentId)).toHaveLength(
      2,
    );
    expect(workRelationshipHistoryForPerson(world, studentId)).toHaveLength(0);
    expect(
      assessLifeLoadAt(world, studentId).contributors.some(
        (item) => item.kind === "life-commitment",
      ),
    ).toBe(true);

    world = createWorkRelationship(world, {
      stableKey: "work:volunteer-service",
      personId: studentId,
      organizationId: church.id,
      startedAt: "2021-01-01",
      kind: "volunteer:direct-service",
      compensation: "unpaid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: AUTHORED,
      initialRole: {
        title: "Volunteer meal-service coordinator",
        occupationClassification: "service:community-food-service",
        locationJurisdictionId: TERRITORY_ID,
        timeDemand: LIGHT_TIME,
      },
    });
    expect(workRelationshipHistoryForPerson(world, studentId)).toHaveLength(1);
    expect(
      organizationParticipationHistoryForPerson(world, studentId),
    ).toHaveLength(2);
  });
});

describe("Stage 5 Run A history, compatibility, source, and rule seams", () => {
  it("prevents later-appended backdated education from leaking through an earlier sequence cutoff", () => {
    let world = createRunAWorld("run-a-backdated-append");
    const studentId = personId(world, 1);
    const before = currentLifeCutoff(world);
    const school = addOrganization(
      world,
      "org:backdated-school",
      "Backdated School",
    );
    world = school.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:backdated",
      personId: studentId,
      organizationId: school.id,
      startedAt: "2012-01-01",
      programKind: "schooling:secondary-program",
      contextKind: "stage:secondary",
      provenance: AUTHORED,
    });
    const enrollment = world.history.educationEnrollments.at(-1);
    if (!enrollment) throw new Error("Missing backdated enrollment.");
    expect(
      educationEnrollmentHistoryForPerson(world, studentId, before),
    ).toHaveLength(0);
    expect(educationEnrollmentHistoryForPerson(world, studentId)).toHaveLength(
      1,
    );
    expect(() =>
      evaluateDecision(world, {
        stableKey: "decision:historical-school-evidence",
        decisionType: "run-a-source-cutoff",
        actorPersonId: studentId,
        cutoff: before,
        subject: {
          kind: "domain:education",
          key: "education:historical-evidence",
          entityId: enrollment.id,
        },
        options: [
          { key: "use", label: "Use", description: "Use the evidence." },
          { key: "omit", label: "Omit", description: "Omit the evidence." },
        ],
        constraints: [],
        considerations: [
          {
            stableKey: "backdated-enrollment",
            optionKey: "use",
            sourceType: "domain:education-history",
            direction: "supports",
            importance: "moderate",
            confidence: "high",
            explanation: "The enrollment would be relevant if available.",
            sourceRefs: [
              {
                kind: "life-history",
                reference: {
                  family: "education-enrollment",
                  recordId: enrollment.id,
                },
              },
            ],
          },
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      }),
    ).toThrow(/unavailable life-history/i);
  });

  it("keeps progressive materialization nondiegetic and order-independent", () => {
    const initial = createRunAWorld("run-a-materialization");
    const firstId = personId(initial, 0);
    const secondId = personId(initial, 1);
    const beforeHistory = structuredClone(initial.history);
    const directSecond = materializePerson(initial, secondId);
    const afterFirst = materializePerson(initial, firstId);
    const afterBoth = materializePerson(afterFirst, secondId);

    expect(afterFirst.history).toStrictEqual(beforeHistory);
    expect(afterFirst.history.nextSequence).toBe(initial.history.nextSequence);
    expect(afterBoth.history).toStrictEqual(beforeHistory);
    expect(afterBoth.people[secondId]).toStrictEqual(
      directSecond.people[secondId],
    );
  });

  it("retains legacy PersonFacts unchanged while canonical education and work take precedence", () => {
    let world = createRunAWorld("run-a-person-fact-boundary");
    const person = personId(world, 0);
    const relative = personId(world, 2);
    world = appendPersonFact(world, person, {
      stableKey: "legacy:family-summary",
      kind: "family-relationship",
      occurredAt: world.currentDate,
      endedAt: null,
      jurisdictionId: null,
      relatedPersonId: relative,
      relationship: "extended:family-summary",
      summary: "Legacy family summary retained for compatibility.",
      provenance: {
        method: "manual",
        sourceEventId: null,
        note: "Synthetic Run A compatibility fixture.",
      },
    });
    world = materializePerson(world, person);
    const legacyFacts = structuredClone(
      factsForPerson(world.people[person] as Person),
    );
    expect(legacyFacts.some((fact) => fact.kind === "education")).toBe(true);
    expect(legacyFacts.some((fact) => fact.kind === "occupation")).toBe(true);
    expect(legacyFacts.some((fact) => fact.kind === "residence")).toBe(true);
    expect(
      legacyFacts.some((fact) => fact.kind === "family-relationship"),
    ).toBe(true);
    expect(legacyFacts.every((fact) => !("sequence" in fact))).toBe(true);
    expect(educationHistoryEvidenceForPerson(world, person)[0]?.source).toBe(
      "legacy-summary",
    );

    const school = addOrganization(
      world,
      "org:canonical-school",
      "Canonical School",
    );
    world = school.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:canonical",
      personId: person,
      organizationId: school.id,
      startedAt: "2020-01-01",
      programKind: "custom:transdisciplinary-residency",
      contextKind: "custom:oral-history-track",
      provenance: AUTHORED,
    });
    world = createWorkRelationship(world, {
      stableKey: "work:canonical",
      personId: person,
      organizationId: school.id,
      startedAt: "2021-01-01",
      kind: "custom:archive-practice",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "shared",
      provenance: AUTHORED,
      initialRole: {
        title: "Archive practitioner",
        occupationClassification: "custom:oral-history-practice",
        locationJurisdictionId: TERRITORY_ID,
        timeDemand: LIGHT_TIME,
      },
    });

    expect(factsForPerson(world.people[person] as Person)).toStrictEqual(
      legacyFacts,
    );
    expect(educationHistoryEvidenceForPerson(world, person)[0]?.source).toBe(
      "canonical",
    );
    expect(workRelationshipHistoryForPerson(world, person)).toHaveLength(1);
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);
  });

  it("accepts unanticipated semantic keys, rejects malformed keys, and preserves open jurisdictions", () => {
    let world = createRunAWorld("run-a-open-sets");
    const childId = personId(world, 1);
    const holderId = personId(world, 2);
    const organization = addOrganization(
      world,
      "org:open-set",
      "Open Set Institute",
      TERRITORY_ID,
    );
    world = organization.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:open-set",
      personId: childId,
      organizationId: organization.id,
      startedAt: "2020-01-01",
      programKind: "custom:intergenerational-field-lab",
      contextKind: "custom:rotating-applied-inquiry",
      provenance: AUTHORED,
    });
    world = createOrganizationParticipation(world, {
      stableKey: "participation:open-set",
      personId: childId,
      organizationId: organization.id,
      startedAt: "2020-01-01",
      kind: "custom:oral-history-circle",
      roleKind: "custom:story-custodian",
      context: null,
      provenance: AUTHORED,
    });
    world = createChildAuthority(world, {
      stableKey: "authority:open-set",
      childPersonId: childId,
      holder: { kind: "person", personId: holderId },
      establishedAt: "2020-01-01",
      kind: "custom:community-delegated-authority",
      basisKind: "custom:restorative-compact",
      context: null,
      provenance: AUTHORED,
    });
    expect(world.jurisdictions[TERRITORY_ID]?.kind).toBe(
      "territory-placeholder",
    );
    expect(() =>
      createEducationEnrollment(world, {
        stableKey: "education:malformed",
        personId: childId,
        organizationId: organization.id,
        startedAt: "2020-01-01",
        programKind: "malformed" as never,
        contextKind: "stage:valid",
        provenance: AUTHORED,
      }),
    ).toThrow(/namespace|taxonomy|education program/i);
    assertWorldIntegrity(world);
  });

  it("returns allowed and blocked structured eligibility without embedding an age rule", () => {
    const world = createRunAWorld("run-a-eligibility");
    const actorPersonId = personId(world, 1);
    const allowed = evaluateLifeEligibility(world, {
      actorPersonId,
      actionKey: "education:enroll",
      asOfDate: world.currentDate,
      jurisdictionId: TERRITORY_ID,
      contextEntityIds: [TERRITORY_ID, TERRITORY_ID],
    });
    const blockedProvider: LifeEligibilityProvider = {
      evaluate: (_candidateWorld, request) => ({
        status: "blocked",
        reasons: [
          {
            key: "custom:fixture-prerequisite-missing",
            explanation: `Fixture provider blocked ${request.actionKey}.`,
          },
        ],
      }),
    };
    const blocked = evaluateLifeEligibility(
      world,
      {
        actorPersonId,
        actionKey: "participation:join",
        asOfDate: world.currentDate,
        jurisdictionId: TERRITORY_ID,
        contextEntityIds: [],
      },
      blockedProvider,
    );

    expect(allowed).toEqual({ status: "allowed", reasons: [] });
    expect(blocked).toEqual({
      status: "blocked",
      reasons: [
        {
          key: "custom:fixture-prerequisite-missing",
          explanation: "Fixture provider blocked participation:join.",
        },
      ],
    });
    expect(serializeWorld(world)).not.toContain("age >= 14");
  });

  it("uses canonical life records as historically available perception and frozen decision sources", () => {
    let world = createRunAWorld("run-a-life-sources");
    const studentId = personId(world, 1);
    const otherId = personId(world, 0);
    const school = addOrganization(world, "org:source-school", "Source School");
    world = school.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:source",
      personId: studentId,
      organizationId: school.id,
      startedAt: "2015-01-01",
      programKind: "schooling:secondary-program",
      contextKind: "stage:secondary",
      provenance: AUTHORED,
    });
    const enrollment = world.history.educationEnrollments.at(-1);
    if (!enrollment) throw new Error("Missing source enrollment.");
    const source = {
      kind: "life-history" as const,
      reference: {
        family: "education-enrollment" as const,
        recordId: enrollment.id,
      },
    };
    expect(() =>
      recordPerception(world, {
        stableKey: "perception:other-person-enrollment",
        personId: otherId,
        perceivedAt: world.currentDate,
        subjectKind: "domain:education",
        subjectKey: "education:source-school",
        subjectEntityId: enrollment.id,
        assertion: "The other person directly experienced this enrollment.",
        confidence: "high",
        sourceCredibility: "high",
        source,
        supersedesPerceptionId: null,
      }),
    ).toThrow(/unavailable life-history/i);
    world = recordPerception(world, {
      stableKey: "perception:own-enrollment",
      personId: studentId,
      perceivedAt: world.currentDate,
      subjectKind: "domain:education",
      subjectKey: "education:source-school",
      subjectEntityId: enrollment.id,
      assertion: "I attended the source school.",
      confidence: "high",
      sourceCredibility: "high",
      source,
      supersedesPerceptionId: null,
    });
    world = recordWorldEvent(world, {
      stableKey: "event:source-school-reflection",
      type: "personal.education-reflection",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: TERRITORY_ID,
      involvedEntityIds: [studentId, enrollment.id],
      participants: [
        {
          personId: studentId,
          role: "agency:reflector",
          detail: "Reflected on their education history.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["education.reflection"],
      summary: "The former student reflected on their school experience.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const reflection = world.history.events.at(-1);
    if (!reflection) throw new Error("Missing education reflection event.");
    world = recordAppraisal(world, {
      stableKey: "appraisal:source-school-reflection",
      personId: studentId,
      eventId: reflection.id,
      memoryId: null,
      eventKnowledgeId: null,
      appraisedAt: world.currentDate,
      meanings: [
        {
          key: "continuity",
          label: "Personal continuity",
          valence: "positive",
          intensity: "moderate",
        },
      ],
      interpretation:
        "The enrollment remains part of the person's own history.",
      confidence: "high",
      involvedPersonIds: [studentId],
      provenance: {
        kind: "reflection",
        sourceRefs: [source],
        note: null,
      },
      supersedesAppraisalId: null,
    });
    expect(world.history.appraisals.at(-1)?.provenance.sourceRefs).toEqual([
      source,
    ]);
    const evaluation = evaluateDecision(world, {
      stableKey: "decision:use-school-experience",
      decisionType: "run-a-life-source",
      actorPersonId: studentId,
      cutoff: currentLifeCutoff(world),
      subject: {
        kind: "domain:education",
        key: "education:source-school",
        entityId: enrollment.id,
      },
      options: [
        { key: "mention", label: "Mention", description: "Mention it." },
        { key: "omit", label: "Omit", description: "Omit it." },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "personal-school-history",
          optionKey: "mention",
          sourceType: "domain:education-history",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation: "The actor's own enrollment is relevant evidence.",
          sourceRefs: [source],
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    expect(evaluation.sourceSnapshots).toEqual([
      expect.objectContaining({
        reference: source,
        label: "Education · Source School",
      }),
    ]);
    world = recordDurableDecisionTrace(world, evaluation);
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored).toStrictEqual(world);
    expect(
      restored.history.decisionTraces.at(-1)?.sourceSnapshots[0]?.reference,
    ).toStrictEqual(source);
  });

  it("creates no duplicate biography or unrelated relationship truth", () => {
    let world = createRunAWorld("run-a-no-duplicate-truth");
    const person = personId(world, 1);
    const holder = personId(world, 0);
    const factsBefore = structuredClone(
      factsForPerson(world.people[person] as Person),
    );
    const organization = addOrganization(
      world,
      "org:no-duplicate",
      "No Duplicate",
    );
    world = organization.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:no-duplicate",
      personId: person,
      organizationId: organization.id,
      startedAt: "2020-01-01",
      programKind: "training:public-history",
      contextKind: "program:applied",
      provenance: AUTHORED,
    });
    world = createOrganizationParticipation(world, {
      stableKey: "participation:no-duplicate",
      personId: person,
      organizationId: organization.id,
      startedAt: "2020-01-01",
      kind: "affiliation:alumni-circle",
      roleKind: null,
      context: null,
      provenance: AUTHORED,
    });
    world = createChildAuthority(world, {
      stableKey: "authority:no-duplicate",
      childPersonId: person,
      holder: { kind: "person", personId: holder },
      establishedAt: "2020-01-01",
      kind: "guardianship:limited-purpose",
      basisKind: "consensual:family-agreement",
      context: null,
      provenance: AUTHORED,
    });

    expect(factsForPerson(world.people[person] as Person)).toStrictEqual(
      factsBefore,
    );
    expect(world.history.workRelationships).toHaveLength(0);
    expect(world.history.householdMemberships).toHaveLength(0);
    expect(world.history.kinshipRelationships).toHaveLength(0);
    expect(world.history.partnerships).toHaveLength(0);
    expect(world.history.careResponsibilities).toHaveLength(0);
  });

  it("rejects dangling and impossible Run A graphs at the persistence integrity boundary", () => {
    let world = createRunAWorld("run-a-integrity-rejection");
    const person = personId(world, 1);
    const holder = personId(world, 0);
    const organization = addOrganization(world, "org:integrity", "Integrity");
    world = organization.world;
    world = createEducationEnrollment(world, {
      stableKey: "education:integrity",
      personId: person,
      organizationId: organization.id,
      startedAt: "2020-01-01",
      programKind: "training:integrity",
      contextKind: "program:integrity",
      provenance: AUTHORED,
    });
    world = createOrganizationParticipation(world, {
      stableKey: "participation:integrity",
      personId: person,
      organizationId: organization.id,
      startedAt: "2020-01-01",
      kind: "membership:integrity",
      roleKind: "member:integrity",
      context: null,
      provenance: AUTHORED,
    });
    world = createChildAuthority(world, {
      stableKey: "authority:integrity",
      childPersonId: person,
      holder: { kind: "person", personId: holder },
      establishedAt: "2020-01-01",
      kind: "guardianship:integrity",
      basisKind: "legal:integrity",
      context: null,
      provenance: AUTHORED,
    });

    const missingOrganization = createStableId("organization", "missing");
    const danglingEducation = structuredClone(world) as World;
    Object.assign(danglingEducation.history.educationEnrollments[0]!, {
      organizationId: missingOrganization,
    });
    expect(() => assertWorldIntegrity(danglingEducation)).toThrow(
      /education enrollment.*organization/i,
    );

    const impossibleParticipation = structuredClone(world) as World;
    Object.assign(
      impossibleParticipation.history.organizationParticipations[0]!,
      {
        startedAt: "1900-01-01",
      },
    );
    expect(() => assertWorldIntegrity(impossibleParticipation)).toThrow(
      /participation.*chronology/i,
    );

    const danglingAuthority = structuredClone(world) as World;
    Object.assign(danglingAuthority.history.childAuthorities[0]!, {
      holder: {
        kind: "organization",
        organizationId: missingOrganization,
      },
    });
    expect(() => assertWorldIntegrity(danglingAuthority)).toThrow(
      /authority.*organization holder/i,
    );
  });
});
