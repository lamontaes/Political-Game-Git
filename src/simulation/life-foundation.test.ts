import { describe, expect, it } from "vitest";

import {
  LEXINGTON_PLACEHOLDER_ID,
  activeCareResponsibilitiesAt,
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  advanceWorld,
  assessLifeLoadAt,
  assertWorldIntegrity,
  createCareResponsibility,
  createDemoWorld,
  createHousehold,
  createOrganization,
  createPartnership,
  createStableId,
  createWorld,
  currentLifeCutoff,
  deserializeWorld,
  didPeoplePreviouslyWorkTogether,
  fatigueAt,
  householdLocationAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  lifeLoadResolutionHistory,
  materializeOrganization,
  materializePerson,
  organizationProfileAt,
  organizationProfileHistory,
  organizationsAt,
  peopleInHouseholdAt,
  recordCareResponsibilityState,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  recordKinship,
  recordLifeCommitment,
  recordOrganizationProfile,
  recordPartnershipState,
  recordWorkRole,
  recordWorkStatus,
  resolveLifeLoadPeriod,
  serializeWorld,
  startHouseholdMembership,
  workRoleHistory,
  workRelationshipHistoryForPerson,
  workStatusAt,
  workStatusHistory,
  createWorkRelationship,
} from "./index";
import type {
  EntityId,
  Jurisdiction,
  LifeRecordProvenance,
  OrganizationClassification,
  Person,
  TimeDemandProfile,
  World,
} from "./types";

const OTHER_PLACE_ID = createStableId(
  "jurisdiction",
  "definition:stage5-other-place",
);
const AUTHORED: LifeRecordProvenance = {
  kind: "authored",
  note: "Synthetic Stage 5.1 semantic fixture.",
};

const PROFESSIONAL_TIME: TimeDemandProfile = {
  expectedWeekly: { minimumHours: 36, maximumHours: 44 },
  attention: "high",
  concurrency: "mostly-exclusive",
  scheduleRigidity: "rigid",
  interruptibility: "limited",
  locationJurisdictionId: LEXINGTON_PLACEHOLDER_ID,
};

const FLEXIBLE_TIME: TimeDemandProfile = {
  expectedWeekly: { minimumHours: 6, maximumHours: 10 },
  attention: "moderate",
  concurrency: "partly-concurrent",
  scheduleRigidity: "flexible",
  interruptibility: "interruptible",
  locationJurisdictionId: null,
};

const LOW_OVERLAP_CARE: TimeDemandProfile = {
  expectedWeekly: { minimumHours: 24, maximumHours: 30 },
  attention: "low",
  concurrency: "mostly-concurrent",
  scheduleRigidity: "flexible",
  interruptibility: "interruptible",
  locationJurisdictionId: null,
};

const HIGH_EXCLUSIVE_CARE: TimeDemandProfile = {
  expectedWeekly: { minimumHours: 24, maximumHours: 30 },
  attention: "continuous",
  concurrency: "mostly-exclusive",
  scheduleRigidity: "rigid",
  interruptibility: "non-interruptible",
  locationJurisdictionId: OTHER_PLACE_ID,
};

function createLifeWorld(seed = "stage5-life-foundation"): World {
  const demo = createDemoWorld(seed);
  const lexington = demo.jurisdictions[LEXINGTON_PLACEHOLDER_ID];
  if (!lexington) throw new Error("Missing Lexington fixture.");
  const otherPlace: Jurisdiction = {
    id: OTHER_PLACE_ID,
    slug: "stage5-other-place",
    name: "Stage 5 other-place placeholder",
    kind: "place-placeholder",
    parentName: null,
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: OTHER_PLACE_ID,
      status: "placeholder",
    },
  };
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: [lexington, otherPlace],
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function personId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error(`Missing person ${index}.`);
  return id;
}

function addOrganization(
  world: World,
  stableKey: string,
  classification: OrganizationClassification = "community:makerspace-cooperative",
): { readonly world: World; readonly id: EntityId } {
  const next = createOrganization(world, {
    stableKey,
    formedAt: "2005-01-01",
    provenance: AUTHORED,
    initialProfile: {
      name: `Synthetic ${stableKey}`,
      classification,
      locationJurisdictionId: LEXINGTON_PLACEHOLDER_ID,
    },
  });
  const id = next.history.organizations.at(-1)?.id;
  if (!id) throw new Error("Missing organization.");
  return { world: next, id };
}

function addWork(
  world: World,
  stableKey: string,
  workerId: EntityId,
  organizationId: EntityId | null,
  overrides: Partial<{
    readonly startedAt: string;
    readonly initialStatus: "active" | "expected";
    readonly kind:
      "employment:staff" | "volunteer:member" | "independent:practice";
    readonly compensation: "paid" | "unpaid";
    readonly authority: "directed" | "self-directed";
    readonly dependency: "dependent" | "independent";
    readonly economicRisk: "organization-borne" | "person-borne";
    readonly title: string;
    readonly timeDemand: TimeDemandProfile;
  }> = {},
): { readonly world: World; readonly id: EntityId } {
  const next = createWorkRelationship(world, {
    stableKey,
    personId: workerId,
    organizationId,
    startedAt: overrides.startedAt ?? "2018-01-01",
    initialStatus: overrides.initialStatus,
    kind: overrides.kind ?? "employment:staff",
    compensation: overrides.compensation ?? "paid",
    authority: overrides.authority ?? "directed",
    dependency: overrides.dependency ?? "dependent",
    economicRisk: overrides.economicRisk ?? "organization-borne",
    provenance: AUTHORED,
    initialRole: {
      title: overrides.title ?? "Policy analyst",
      occupationClassification: "profession:policy-analysis",
      locationJurisdictionId: LEXINGTON_PLACEHOLDER_ID,
      timeDemand: overrides.timeDemand ?? PROFESSIONAL_TIME,
    },
  });
  const id = next.history.workRelationships.at(-1)?.id;
  if (!id) throw new Error("Missing work relationship.");
  return { world: next, id };
}

function addHousehold(
  world: World,
  stableKey: string,
  jurisdictionId: EntityId,
): { readonly world: World; readonly id: EntityId } {
  let next = createHousehold(world, {
    stableKey,
    formedAt: "2010-01-01",
    label: `Synthetic ${stableKey}`,
    provenance: AUTHORED,
  });
  const id = next.history.households.at(-1)?.id;
  if (!id) throw new Error("Missing household.");
  next = recordHouseholdLocation(next, {
    stableKey: `${stableKey}:location:initial`,
    householdId: id,
    effectiveAt: "2010-01-01",
    jurisdictionId,
    label: `Initial location for ${stableKey}`,
    kind: "residence:community-base",
    provenance: AUTHORED,
    supersedesLocationId: null,
  });
  return { world: next, id };
}

describe("Stage 5.1 organizations and work", () => {
  it("keeps organization identity stable across open classification, profile history, detail promotion, and save/load", () => {
    const first = addOrganization(
      createLifeWorld("organization-stability"),
      "org:makerspace",
    );
    const second = addOrganization(
      createLifeWorld("organization-stability"),
      "org:makerspace",
    );
    expect(first.id).toBe(second.id);
    expect(organizationProfileAt(first.world, first.id)?.classification).toBe(
      "community:makerspace-cooperative",
    );

    const priorProfile = organizationProfileAt(first.world, first.id);
    if (!priorProfile) throw new Error("Missing profile.");
    let world = recordOrganizationProfile(first.world, {
      stableKey: "org:makerspace:profile:renamed",
      organizationId: first.id,
      effectiveAt: "2020-01-01",
      name: "Synthetic Civic Fabrication Guild",
      classification: "custom:civic-fabrication-guild",
      locationJurisdictionId: OTHER_PLACE_ID,
      provenance: AUTHORED,
      supersedesProfileId: priorProfile.id,
    });
    world = materializeOrganization(world, first.id);
    expect(world.history.organizations[0]).toMatchObject({
      id: first.id,
      detailLevel: "detailed",
    });
    expect(
      organizationProfileHistory(world, first.id).map((item) => item.name),
    ).toEqual([
      "Synthetic org:makerspace",
      "Synthetic Civic Fabrication Guild",
    ]);
    expect(
      organizationProfileAt(world, first.id, {
        asOfDate: "2019-01-01" as World["currentDate"],
        historySequenceExclusive: world.history.nextSequence,
      })?.name,
    ).toBe("Synthetic org:makerspace");
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);
  });

  it("supports concurrent paid, unpaid, and independent work without a current-career slot", () => {
    let world = createLifeWorld("multiple-work");
    const workerId = personId(world, 0);
    const primaryOrg = addOrganization(world, "org:primary");
    world = primaryOrg.world;
    const volunteerOrg = addOrganization(
      world,
      "org:volunteer",
      "membership:neighborhood-lab",
    );
    world = volunteerOrg.world;
    const primary = addWork(world, "work:primary", workerId, primaryOrg.id);
    world = primary.world;
    const volunteer = addWork(
      world,
      "work:volunteer",
      workerId,
      volunteerOrg.id,
      {
        kind: "volunteer:member",
        compensation: "unpaid",
        title: "Volunteer repair mentor",
        timeDemand: FLEXIBLE_TIME,
      },
    );
    world = volunteer.world;
    const independent = addWork(world, "work:independent", workerId, null, {
      kind: "independent:practice",
      authority: "self-directed",
      dependency: "independent",
      economicRisk: "person-borne",
      title: "Independent language consultant",
      timeDemand: FLEXIBLE_TIME,
    });
    world = independent.world;

    const active = activeWorkRelationshipsAt(world, workerId);
    expect(active).toHaveLength(3);
    expect(active.map((item) => item.relationship.compensation)).toEqual(
      expect.arrayContaining(["paid", "unpaid"]),
    );
    expect(
      active.find((item) => item.relationship.id === independent.id)
        ?.relationship.organizationId,
    ).toBeNull();
    expect(world.people[workerId]).not.toHaveProperty("currentCareer");
  });

  it("records expected future work without treating it as active before it starts", () => {
    let world = createLifeWorld("expected-work");
    const workerId = personId(world, 0);
    const organization = addOrganization(world, "org:future");
    world = organization.world;
    const expected = addWork(world, "work:future", workerId, organization.id, {
      startedAt: "2027-01-05",
      initialStatus: "expected",
      title: "Incoming program director",
    });
    world = expected.world;

    expect(workRelationshipHistoryForPerson(world, workerId)).toHaveLength(1);
    expect(workStatusAt(world, expected.id)?.status).toBe("expected");
    expect(activeWorkRelationshipsAt(world, workerId)).toHaveLength(0);
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);

    world = advanceWorld(world, 365);
    const expectedStatus = workStatusAt(world, expected.id);
    if (!expectedStatus) throw new Error("Missing expected work status.");
    world = recordWorkStatus(world, {
      stableKey: "work:future:status:active",
      workRelationshipId: expected.id,
      effectiveAt: "2027-01-05",
      status: "active",
      reason: "Scheduled work began",
      provenance: AUTHORED,
      supersedesStatusId: expectedStatus.id,
    });

    expect(activeWorkRelationshipsAt(world, workerId)).toHaveLength(1);
  });

  it("preserves promotion, organization transition, leave, return, and independent ending histories", () => {
    let world = createLifeWorld("work-history");
    const workerId = personId(world, 0);
    const firstOrg = addOrganization(world, "org:first");
    world = firstOrg.world;
    const secondOrg = addOrganization(world, "org:second");
    world = secondOrg.world;
    const first = addWork(world, "work:first", workerId, firstOrg.id);
    world = first.world;
    const firstRole = workRoleHistory(world, first.id).at(-1);
    if (!firstRole) throw new Error("Missing first role.");
    world = recordWorkRole(world, {
      stableKey: "work:first:role:director",
      workRelationshipId: first.id,
      effectiveAt: "2020-01-01",
      title: "Program director",
      occupationClassification: "profession:program-leadership",
      locationJurisdictionId: LEXINGTON_PLACEHOLDER_ID,
      timeDemand: PROFESSIONAL_TIME,
      provenance: AUTHORED,
      supersedesRoleId: firstRole.id,
    });
    const activeStatus = workStatusHistory(world, first.id).at(-1);
    if (!activeStatus) throw new Error("Missing status.");
    world = recordWorkStatus(world, {
      stableKey: "work:first:status:leave",
      workRelationshipId: first.id,
      effectiveAt: "2021-01-01",
      status: "temporarily-inactive",
      reason: "Temporary personal leave",
      provenance: AUTHORED,
      supersedesStatusId: activeStatus.id,
    });
    const leave = workStatusHistory(world, first.id).at(-1);
    if (!leave) throw new Error("Missing leave.");
    world = recordWorkStatus(world, {
      stableKey: "work:first:status:return",
      workRelationshipId: first.id,
      effectiveAt: "2021-04-01",
      status: "active",
      reason: "Returned from leave",
      provenance: AUTHORED,
      supersedesStatusId: leave.id,
    });
    const returned = workStatusHistory(world, first.id).at(-1);
    if (!returned) throw new Error("Missing return.");
    world = recordWorkStatus(world, {
      stableKey: "work:first:status:ended",
      workRelationshipId: first.id,
      effectiveAt: "2022-01-01",
      status: "ended",
      reason: "Moved to another organization",
      provenance: AUTHORED,
      supersedesStatusId: returned.id,
    });
    const second = addWork(world, "work:second", workerId, secondOrg.id, {
      startedAt: "2022-01-01",
      title: "Regional coordinator",
    });
    world = second.world;

    expect(workRoleHistory(world, first.id).map((item) => item.title)).toEqual([
      "Policy analyst",
      "Program director",
    ]);
    expect(
      workStatusHistory(world, first.id).map((item) => item.status),
    ).toEqual(["active", "temporarily-inactive", "active", "ended"]);
    expect(workStatusAt(world, first.id)?.status).toBe("ended");
    expect(
      workStatusAt(world, first.id, {
        asOfDate: "2021-02-01" as World["currentDate"],
        historySequenceExclusive: world.history.nextSequence,
      })?.status,
    ).toBe("temporarily-inactive");
    expect(
      workRoleHistory(world, first.id, {
        asOfDate: "2019-01-01" as World["currentDate"],
        historySequenceExclusive: world.history.nextSequence,
      }).at(-1)?.title,
    ).toBe("Policy analyst");
    expect(
      activeWorkRelationshipsAt(world, workerId).map(
        (item) => item.relationship.id,
      ),
    ).toEqual([second.id]);
  });

  it("uses stable organization identity for shared-work history", () => {
    let world = createLifeWorld("stable-shared-work");
    const firstId = personId(world, 0);
    const secondId = personId(world, 1);
    const org = addOrganization(world, "org:shared");
    world = org.world;
    world = addWork(world, "work:shared:first", firstId, org.id).world;
    world = addWork(world, "work:shared:second", secondId, org.id, {
      startedAt: "2019-01-01",
    }).world;
    expect(didPeoplePreviouslyWorkTogether(world, firstId, secondId)).toBe(
      true,
    );

    const leaveOnlyFirstId = personId(world, 2);
    const leaveOnlySecondId = personId(world, 3);
    const leaveOnlyFirst = addWork(
      world,
      "work:shared:on-leave:first",
      leaveOnlyFirstId,
      org.id,
    );
    world = leaveOnlyFirst.world;
    const active = workStatusAt(world, leaveOnlyFirst.id);
    if (!active) throw new Error("Missing pre-leave work status.");
    world = recordWorkStatus(world, {
      stableKey: "work:shared:on-leave:first:leave",
      workRelationshipId: leaveOnlyFirst.id,
      effectiveAt: "2018-06-01",
      status: "temporarily-inactive",
      reason: "Leave before the later worker arrived",
      provenance: AUTHORED,
      supersedesStatusId: active.id,
    });
    world = addWork(
      world,
      "work:shared:on-leave:second",
      leaveOnlySecondId,
      org.id,
      { startedAt: "2019-01-01" },
    ).world;
    expect(
      didPeoplePreviouslyWorkTogether(
        world,
        leaveOnlyFirstId,
        leaveOnlySecondId,
      ),
    ).toBe(false);
  });
});

describe("Stage 5.1 households, kinship, partnership, and care", () => {
  it("keeps unrelated co-residents separate from kin living apart and supports household movement", () => {
    let world = createLifeWorld("household-separation");
    const firstId = personId(world, 0);
    const roommateId = personId(world, 1);
    const kinId = personId(world, 2);
    const firstHome = addHousehold(
      world,
      "household:first",
      LEXINGTON_PLACEHOLDER_ID,
    );
    world = firstHome.world;
    const secondHome = addHousehold(world, "household:kin", OTHER_PLACE_ID);
    world = secondHome.world;
    world = startHouseholdMembership(world, {
      stableKey: "membership:first",
      personId: firstId,
      householdId: firstHome.id,
      startedAt: "2012-01-01",
      residenceRole: "primary",
      kind: "resident:member",
      provenance: AUTHORED,
    });
    world = startHouseholdMembership(world, {
      stableKey: "membership:roommate",
      personId: roommateId,
      householdId: firstHome.id,
      startedAt: "2012-01-01",
      residenceRole: "primary",
      kind: "resident:roommate",
      provenance: AUTHORED,
    });
    world = startHouseholdMembership(world, {
      stableKey: "membership:kin",
      personId: kinId,
      householdId: secondHome.id,
      startedAt: "2012-01-01",
      residenceRole: "primary",
      kind: "resident:member",
      provenance: AUTHORED,
    });
    world = recordKinship(world, {
      stableKey: "kinship:parent-child",
      personIds: [firstId, kinId],
      establishedAt: "2012-01-01",
      kind: "lineal:parent-child",
      provenance: AUTHORED,
    });
    const priorLocation = householdLocationAt(world, firstHome.id);
    if (!priorLocation) throw new Error("Missing location.");
    world = recordHouseholdLocation(world, {
      stableKey: "household:first:location:moved",
      householdId: firstHome.id,
      effectiveAt: "2020-01-01",
      jurisdictionId: OTHER_PLACE_ID,
      label: "Household's later jurisdiction",
      kind: "residence:relocated-base",
      provenance: AUTHORED,
      supersedesLocationId: priorLocation.id,
    });

    expect(peopleInHouseholdAt(world, firstHome.id)).toEqual(
      expect.arrayContaining([firstId, roommateId]),
    );
    expect(kinshipRelationshipsAt(world, firstId)).toHaveLength(1);
    expect(kinshipRelationshipsAt(world, roommateId)).toHaveLength(0);
    expect(peopleInHouseholdAt(world, secondHome.id)).toEqual([kinId]);
    expect(householdLocationAt(world, firstHome.id)?.jurisdictionId).toBe(
      OTHER_PLACE_ID,
    );
    expect(
      householdLocationAt(world, firstHome.id, {
        asOfDate: "2019-01-01" as World["currentDate"],
        historySequenceExclusive: world.history.nextSequence,
      })?.jurisdictionId,
    ).toBe(LEXINGTON_PLACEHOLDER_ID);
    expect(world.history.households[0]).not.toHaveProperty("dwellingId");
  });

  it("supports valid multi-residence but rejects overlapping duplicate primary residence", () => {
    let world = createLifeWorld("multi-residence");
    const person = personId(world, 0);
    const first = addHousehold(
      world,
      "household:primary",
      LEXINGTON_PLACEHOLDER_ID,
    );
    world = first.world;
    const second = addHousehold(world, "household:secondary", OTHER_PLACE_ID);
    world = second.world;
    world = startHouseholdMembership(world, {
      stableKey: "membership:primary",
      personId: person,
      householdId: first.id,
      startedAt: "2015-01-01",
      residenceRole: "primary",
      kind: "resident:district-base",
      provenance: AUTHORED,
    });
    world = startHouseholdMembership(world, {
      stableKey: "membership:secondary",
      personId: person,
      householdId: second.id,
      startedAt: "2018-01-01",
      residenceRole: "secondary",
      kind: "custom:seasonal-base",
      provenance: AUTHORED,
    });
    expect(householdMembershipsAt(world, person)).toHaveLength(2);
    const secondaryMembership = world.history.householdMemberships.find(
      (membership) => membership.stableKey === "membership:secondary",
    );
    const secondaryState = world.history.householdMembershipStates.find(
      (state) => state.membershipId === secondaryMembership?.id,
    );
    if (!secondaryMembership || !secondaryState) {
      throw new Error("Missing secondary membership history.");
    }
    world = recordHouseholdMembershipState(world, {
      stableKey: "membership:secondary:ended",
      membershipId: secondaryMembership.id,
      effectiveAt: "2021-01-01",
      status: "ended",
      residenceRole: "secondary",
      kind: "custom:seasonal-base",
      provenance: AUTHORED,
      supersedesStateId: secondaryState.id,
    });
    expect(
      householdMembershipsAt(world, person, {
        asOfDate: "2020-01-01" as World["currentDate"],
        historySequenceExclusive: world.history.nextSequence,
      }),
    ).toHaveLength(2);
    expect(householdMembershipsAt(world, person)).toHaveLength(1);
    expect(() =>
      startHouseholdMembership(world, {
        stableKey: "membership:invalid-second-primary",
        personId: person,
        householdId: second.id,
        startedAt: "2020-01-01",
        residenceRole: "primary",
        kind: "resident:second-primary",
        provenance: AUTHORED,
      }),
    ).toThrow(/overlapping primary|duplicate active membership/i);
  });

  it("keeps partnership independent of kinship and household membership", () => {
    let world = createLifeWorld("partnership-separation");
    const firstId = personId(world, 0);
    const secondId = personId(world, 1);
    world = createPartnership(world, {
      stableKey: "partnership:legal",
      personIds: [firstId, secondId],
      startedAt: "2019-01-01",
      kind: "legal:civil-union",
      provenance: AUTHORED,
    });
    const partnership = world.history.partnerships.at(-1);
    if (!partnership) throw new Error("Missing partnership.");
    expect(activePartnershipsAt(world, firstId)).toHaveLength(1);
    expect(kinshipRelationshipsAt(world, firstId)).toHaveLength(0);
    expect(householdMembershipsAt(world, firstId)).toHaveLength(0);
    const state = world.history.partnershipStates.at(-1);
    if (!state) throw new Error("Missing partnership state.");
    world = recordPartnershipState(world, {
      stableKey: "partnership:legal:ended",
      partnershipId: partnership.id,
      effectiveAt: "2022-01-01",
      status: "ended",
      provenance: AUTHORED,
      supersedesStateId: state.id,
    });
    expect(activePartnershipsAt(world, firstId)).toHaveLength(0);
  });

  it("allows shared care across households and context changes without closing care kinds", () => {
    let world = createLifeWorld("care-across-households");
    const caregiverId = personId(world, 0);
    const secondCaregiverId = personId(world, 1);
    const recipientId = personId(world, 2);
    const caregiverHome = addHousehold(
      world,
      "household:caregiver",
      LEXINGTON_PLACEHOLDER_ID,
    );
    world = caregiverHome.world;
    const recipientHome = addHousehold(
      world,
      "household:recipient",
      OTHER_PLACE_ID,
    );
    world = recipientHome.world;
    world = startHouseholdMembership(world, {
      stableKey: "membership:caregiver",
      personId: caregiverId,
      householdId: caregiverHome.id,
      startedAt: "2010-01-01",
      residenceRole: "primary",
      kind: "resident:member",
      provenance: AUTHORED,
    });
    world = startHouseholdMembership(world, {
      stableKey: "membership:recipient",
      personId: recipientId,
      householdId: recipientHome.id,
      startedAt: "2010-01-01",
      residenceRole: "primary",
      kind: "resident:member",
      provenance: AUTHORED,
    });
    world = createCareResponsibility(world, {
      stableKey: "care:language-brokerage",
      caregiverPersonId: caregiverId,
      recipientPersonId: recipientId,
      startedAt: "2020-01-01",
      kind: "custom:language-brokerage-support",
      share: "shared",
      context: "Periodic language and appointment support",
      timeDemand: LOW_OVERLAP_CARE,
      provenance: AUTHORED,
    });
    const firstCare = world.history.careResponsibilities.at(-1);
    world = createCareResponsibility(world, {
      stableKey: "care:coordination",
      caregiverPersonId: secondCaregiverId,
      recipientPersonId: recipientId,
      startedAt: "2020-01-01",
      kind: "coordination:shared-support",
      share: "shared",
      context: "Shared coordination responsibility",
      timeDemand: FLEXIBLE_TIME,
      provenance: AUTHORED,
    });
    if (!firstCare) throw new Error("Missing care responsibility.");
    const firstState = world.history.careResponsibilityStates.find(
      (state) => state.careResponsibilityId === firstCare.id,
    );
    if (!firstState) throw new Error("Missing care state.");
    const overlapAssessment = assessLifeLoadAt(world, caregiverId);
    world = recordCareResponsibilityState(world, {
      stableKey: "care:language-brokerage:high-attention",
      careResponsibilityId: firstCare.id,
      effectiveAt: "2024-01-01",
      status: "active",
      share: "primary",
      context: "Temporary continuous in-person supervision",
      timeDemand: HIGH_EXCLUSIVE_CARE,
      provenance: AUTHORED,
      supersedesStateId: firstState.id,
    });
    const exclusiveAssessment = assessLifeLoadAt(world, caregiverId);

    expect(activeCareResponsibilitiesAt(world, caregiverId)).toHaveLength(1);
    expect(activeCareResponsibilitiesAt(world, secondCaregiverId)).toHaveLength(
      1,
    );
    expect(
      householdMembershipsAt(world, caregiverId)[0]?.household.id,
    ).not.toBe(householdMembershipsAt(world, recipientId)[0]?.household.id);
    expect(
      exclusiveAssessment.exclusiveEquivalentWeekly.maximumHours,
    ).toBeGreaterThan(overlapAssessment.exclusiveEquivalentWeekly.maximumHours);
  });
});

describe("Stage 5.1 time, overload, recovery, and historical cutoffs", () => {
  it("distinguishes flexible/interruptible from rigid/non-interruptible commitments and derives conflict", () => {
    let world = createLifeWorld("time-demand-semantics");
    const workerId = personId(world, 0);
    world = recordLifeCommitment(world, {
      stableKey: "commitment:flexible",
      personId: workerId,
      startsAt: "2020-01-01",
      endsAt: null,
      kind: "custom:neighborhood-translation-circle",
      label: "Flexible translation circle",
      timeDemand: FLEXIBLE_TIME,
      provenance: AUTHORED,
    });
    const flexible = assessLifeLoadAt(world, workerId);
    world = recordLifeCommitment(world, {
      stableKey: "commitment:rigid",
      personId: workerId,
      startsAt: "2020-01-01",
      endsAt: null,
      kind: "community:fixed-response-duty",
      label: "Fixed response duty",
      timeDemand: {
        ...FLEXIBLE_TIME,
        scheduleRigidity: "rigid",
        interruptibility: "non-interruptible",
        locationJurisdictionId: OTHER_PLACE_ID,
      },
      provenance: AUTHORED,
    });
    const combined = assessLifeLoadAt(world, workerId);
    expect(flexible.expectedWeekly).toEqual({
      minimumHours: 6,
      maximumHours: 10,
    });
    expect(combined.coordinationPressure).not.toBe("low");
    expect(
      combined.contributors.map((item) => item.timeDemand.interruptibility),
    ).toEqual(expect.arrayContaining(["interruptible", "non-interruptible"]));
  });

  it("makes short pushing useful, sustained overload self-defeating, and recovery restorative", () => {
    let world = createLifeWorld("load-recovery");
    const workerId = personId(world, 0);
    const org = addOrganization(world, "org:crisis-work");
    world = org.world;
    const work = addWork(world, "work:crisis", workerId, org.id, {
      timeDemand: PROFESSIONAL_TIME,
    });
    world = work.world;
    world = recordLifeCommitment(world, {
      stableKey: "commitment:crisis",
      personId: workerId,
      startsAt: "2025-01-01",
      endsAt: "2025-12-25",
      kind: "community:time-limited-crisis-response",
      label: "Time-limited crisis response",
      timeDemand: {
        expectedWeekly: { minimumHours: 28, maximumHours: 34 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "non-interruptible",
        locationJurisdictionId: OTHER_PLACE_ID,
      },
      provenance: AUTHORED,
    });
    world = resolveLifeLoadPeriod(world, {
      stableKey: "load:push:first",
      personId: workerId,
      periodStartsAt: "2025-12-11",
      periodEndsAt: "2025-12-18",
      effortMode: "push",
      recovery: "limited",
    });
    world = resolveLifeLoadPeriod(world, {
      stableKey: "load:push:second",
      personId: workerId,
      periodStartsAt: "2025-12-18",
      periodEndsAt: "2025-12-25",
      effortMode: "push",
      recovery: "limited",
    });
    const active = workStatusHistory(world, work.id).at(-1);
    if (!active) throw new Error("Missing work status.");
    world = recordWorkStatus(world, {
      stableKey: "work:crisis:status:recovery-leave",
      workRelationshipId: work.id,
      effectiveAt: "2025-12-25",
      status: "temporarily-inactive",
      reason: "Planned recovery week",
      provenance: AUTHORED,
      supersedesStatusId: active.id,
    });
    world = resolveLifeLoadPeriod(world, {
      stableKey: "load:recover",
      personId: workerId,
      periodStartsAt: "2025-12-25",
      periodEndsAt: "2026-01-01",
      effortMode: "recover",
      recovery: "substantial",
    });

    const history = lifeLoadResolutionHistory(world, workerId);
    expect(history[0]).toMatchObject({
      immediateOutputPotential: "elevated",
      futureCapacity: "depleted",
    });
    expect(history[1]).toMatchObject({
      priorFatigue: "defining",
      immediateOutputPotential: "reduced",
      futureCapacity: "depleted",
    });
    expect(history[2]).toMatchObject({
      effortMode: "recover",
      resultingFatigue: null,
      futureCapacity: "restored",
    });
    expect(fatigueAt(world, workerId, currentLifeCutoff(world))).toBeNull();
    expect(
      world.history.temporaryStates.every(
        (state) => state.stateKey === "life:fatigue",
      ),
    ).toBe(true);
    expect(() =>
      resolveLifeLoadPeriod(world, {
        stableKey: "load:push:duplicate-period",
        personId: workerId,
        periodStartsAt: "2025-12-11",
        periodEndsAt: "2025-12-18",
        effortMode: "normal",
        recovery: "adequate",
      }),
    ).toThrow(/overlap/i);
  });

  it("prevents later-appended backfill from leaking into an earlier sequence cutoff", () => {
    let world = createLifeWorld("life-backfill-cutoff");
    const workerId = personId(world, 0);
    const before = currentLifeCutoff(world);
    const organization = addOrganization(world, "org:backfilled");
    world = organization.world;
    world = addWork(world, "work:backfilled", workerId, organization.id, {
      startedAt: "2015-01-01",
    }).world;
    expect(organizationsAt(world, before)).toHaveLength(0);
    expect(activeWorkRelationshipsAt(world, workerId, before)).toHaveLength(0);
    expect(activeWorkRelationshipsAt(world, workerId)).toHaveLength(1);
  });

  it("keeps life-load results deterministic despite unrelated organization processing order", () => {
    const build = (reverse: boolean) => {
      let world = createLifeWorld("unrelated-order");
      const workerId = personId(world, 0);
      const keys = reverse
        ? ["org:unrelated", "org:work"]
        : ["org:work", "org:unrelated"];
      const ids = new Map<string, EntityId>();
      for (const key of keys) {
        const added = addOrganization(world, key);
        world = added.world;
        ids.set(key, added.id);
      }
      world = addWork(
        world,
        "work:stable",
        workerId,
        ids.get("org:work") as EntityId,
      ).world;
      return assessLifeLoadAt(world, workerId);
    };
    expect(build(false)).toStrictEqual(build(true));
  });

  it("preserves life references when a lightweight person becomes detailed", () => {
    let world = createLifeWorld("progressive-person-life");
    const workerId = personId(world, 0);
    const org = addOrganization(world, "org:progressive");
    world = addWork(org.world, "work:progressive", workerId, org.id).world;
    const before = structuredClone(world.history.workRelationships);
    world = materializePerson(world, workerId);
    expect(world.people[workerId]?.detailLevel).toBe("materialized");
    expect(world.history.workRelationships).toStrictEqual(before);
    expect(activeWorkRelationshipsAt(world, workerId)).toHaveLength(1);
  });

  it("rejects dangling life references and impossible chronology during load validation", () => {
    let world = createLifeWorld("life-integrity-rejection");
    const workerId = personId(world, 0);
    const org = addOrganization(world, "org:integrity");
    world = addWork(org.world, "work:integrity", workerId, org.id).world;
    const dangling = structuredClone(world) as World;
    const relationship = dangling.history.workRelationships[0];
    if (!relationship) throw new Error("Missing work relationship.");
    Object.assign(relationship, {
      organizationId: createStableId("organization", "missing"),
    });
    expect(() => assertWorldIntegrity(dangling)).toThrow(/organization/i);

    const resolved = resolveLifeLoadPeriod(world, {
      stableKey: "load:integrity",
      personId: workerId,
      periodStartsAt: "2025-12-18",
      periodEndsAt: "2025-12-25",
      effortMode: "push",
      recovery: "limited",
    });
    const unlinkedFatigue = structuredClone(resolved) as World;
    const state = unlinkedFatigue.history.temporaryStates.at(-1);
    if (!state) throw new Error("Missing derived fatigue state.");
    Object.assign(state, {
      provenance: { ...state.provenance, sourceRefs: [] },
    });
    expect(() => assertWorldIntegrity(unlinkedFatigue)).toThrow(
      /derived fatigue/i,
    );

    const unborn = createLifeWorld("life-chronology-rejection");
    const person = unborn.people[personId(unborn, 0)] as Person;
    expect(() =>
      recordLifeCommitment(unborn, {
        stableKey: "commitment:prebirth",
        personId: person.id,
        startsAt: person.birthDate.slice(0, 4) + "-01-01",
        endsAt: person.birthDate,
        kind: "custom:impossible",
        label: "Impossible commitment",
        timeDemand: FLEXIBLE_TIME,
        provenance: AUTHORED,
      }),
    ).toThrow(/predate|interval/i);
  });
});
