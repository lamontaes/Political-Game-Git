import { describe, expect, it } from "vitest";

import {
  activeWorkRelationshipsAt,
  applyCharacterHistoryPlan,
  availableLifeSituations,
  characterHistoryContextPersonId,
  composeApprenticeshipPlan,
  composeGuardReservePlan,
  composePcsRelocationPlan,
  createDemoWorld,
  createStableId,
  createWorld,
  dateAtAge,
  deserializeWorld,
  educationEnrollmentStateHistory,
  formativeIntervalAt,
  generateQuickCharacterHistory,
  householdLocationHistory,
  materializePerson,
  resolveLifeSituation,
  serializeWorld,
} from "./index";
import type {
  CharacterHistoryPlan,
  EntityId,
  EventContext,
  HistoricalEventInput,
  IsoDate,
  Jurisdiction,
  Person,
  World,
} from "./index";

function personId(world: World, index = 1): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error("Missing test person.");
  return id;
}

function bareWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function event(
  stableKey: string,
  person: EntityId,
  occurredAt: IsoDate,
  jurisdictionId: EntityId,
): HistoricalEventInput {
  const context: EventContext = {
    location: { jurisdictionId, label: "Test context", setting: null },
    socialContext: "Test context",
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
  return {
    stableKey,
    type: "life.test-history-choice",
    occurredAt,
    recordedAt: occurredAt,
    jurisdictionId,
    involvedEntityIds: [person],
    participants: [{ personId: person, role: "agency:actor", detail: null }],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["test.history"],
    summary: "A canonical history-choice fixture.",
    context,
  };
}

function lowTimeDemand(locationJurisdictionId: EntityId | null) {
  return {
    expectedWeekly: { minimumHours: 3, maximumHours: 8 },
    attention: "low" as const,
    concurrency: "mostly-concurrent" as const,
    scheduleRigidity: "flexible" as const,
    interruptibility: "interruptible" as const,
    locationJurisdictionId,
  };
}

function commonPlan(
  world: World,
  person: EntityId,
  mode: CharacterHistoryPlan["mode"],
): CharacterHistoryPlan {
  const occurrence = dateAtAge(world.people[person]!.birthDate, 12);
  const eventKey = `common:${mode}:event`;
  return {
    stableKey: `common:${mode}`,
    mode,
    personId: person,
    transitions: [
      {
        kind: "event",
        input: event(eventKey, person, occurrence, world.jurisdictionOrder[0]!),
      },
      {
        kind: "knowledge",
        input: {
          stableKey: `common:${mode}:knowledge`,
          personId: person,
          eventStableKey: eventKey,
          learnedAt: occurrence,
          believedSummary: "A canonical history-choice fixture.",
          accuracy: "accurate",
          confidence: "high",
          source: { kind: "direct" },
        },
      },
      {
        kind: "memory",
        input: {
          stableKey: `common:${mode}:memory`,
          personId: person,
          eventStableKey: eventKey,
          formedAt: occurrence,
          rememberedSummary: "A canonical choice.",
          interpretation: "It still has context.",
          strength: "moderate",
          relevanceTags: ["test.history"],
          supersedesMemoryId: null,
        },
      },
      {
        kind: "appraisal",
        input: {
          stableKey: `common:${mode}:appraisal`,
          personId: person,
          eventStableKey: eventKey,
          memoryStableKey: `common:${mode}:memory`,
          knowledgeStableKey: `common:${mode}:knowledge`,
          appraisedAt: occurrence,
          meanings: [
            {
              key: "choice",
              label: "Choice",
              valence: "neutral",
              intensity: "subtle",
            },
          ],
          interpretation: "It still has context.",
          confidence: "medium",
          involvedPersonIds: [],
          supersedesAppraisalId: null,
        },
      },
    ],
  };
}

describe("Stage 5 Run B playable life paths and character history", () => {
  it("quick generation produces compressed canonical formative history with persistent people and no weekly loop", () => {
    const initial = bareWorld("run-b-formative");
    const playerId = personId(initial);
    const result = applyCharacterHistoryPlan(
      initial,
      generateQuickCharacterHistory(initial, {
        stableKey: "quick:formative",
        personId: playerId,
        jurisdictionId: initial.jurisdictionOrder[0]!,
      }),
    );
    const { world } = result;
    const interval = formativeIntervalAt(
      world,
      playerId,
      dateAtAge(world.people[playerId]!.birthDate, 10),
    );
    expect(interval).toMatchObject({
      band: "middle-childhood",
      agency: "shared",
    });
    expect(world.history.careResponsibilities).toHaveLength(1);
    expect(world.history.childAuthorities).toHaveLength(1);
    expect(world.history.householdLocations).toHaveLength(2);
    expect(world.history.educationEnrollments).toHaveLength(3);
    expect(
      world.history.events.filter((item) => item.type.startsWith("life.")),
    ).toHaveLength(6);
    expect(world.history.events.length).toBeLessThan(30);
    expect(world.history.memories).toHaveLength(1);
    expect(world.history.appraisals).toHaveLength(1);
    const teacherId = characterHistoryContextPersonId(
      world,
      "quick:formative:teacher",
    );
    const peerId = characterHistoryContextPersonId(
      world,
      "quick:formative:peer",
    );
    expect(world.people[teacherId]).toBeDefined();
    expect(world.people[peerId]).toBeDefined();
    expect(
      world.history.workRelationships.some(
        (work) => work.personId === teacherId,
      ),
    ).toBe(true);
    expect(
      world.history.relationshipInteractions.some((item) =>
        item.personIds.includes(peerId),
      ),
    ).toBe(true);
  });

  it("supports an 18-anchor detailed formative run without weekly simulation while preserving early structure and school transfer", () => {
    const initial = bareWorld("run-b-detailed-formative");
    const player = personId(initial);
    const jurisdictionId = initial.jurisdictionOrder[0]!;
    const quick = applyCharacterHistoryPlan(
      initial,
      generateQuickCharacterHistory(initial, {
        stableKey: "detailed:base",
        personId: player,
        jurisdictionId,
      }),
    ).world;
    const peer = characterHistoryContextPersonId(quick, "detailed:base:peer");
    let world: World = {
      ...quick,
      control: { kind: "person" as const, personId: player },
    };
    const scenes = [
      ["formative.household-transition", "settle-in", 1, null],
      ["formative.school-entry", "join-in", 2, null],
      ["formative.lunch-table", "make-room", 8, peer],
      ["formative.friend-conflict", "withdraw", 9, peer],
      ["formative.teacher-mentor", "accept-guidance", 10, peer],
      ["formative.lunch-table", "make-room", 11, peer],
      ["formative.activity-choice", "join", 13, null],
      ["formative.civic-volunteering", "observe", 13, null],
      ["formative.activity-choice", "leave", 14, null],
      ["formative.civic-volunteering", "volunteer", 15, null],
      ["formative.teen-work-opportunity", "decline", 16, null],
      ["formative.future-preparation", "prepare", 17, null],
    ] as const;
    for (const [situationKey, optionKey, age, otherPersonId] of scenes) {
      const result = resolveLifeSituation(world, {
        stableKey: `detailed:${age}:${situationKey}:${optionKey}`,
        mode: "played",
        personId: player,
        situationKey,
        optionKey,
        occurredAt: dateAtAge(world.people[player]!.birthDate, age),
        jurisdictionId,
        otherPersonId,
      });
      if (result.status !== "resolved")
        throw new Error("Expected scene resolution.");
      world = result.world;
    }
    expect(
      world.history.events.filter((item) => item.type.startsWith("life.")),
    ).toHaveLength(18);
    expect(world.history.events).toHaveLength(18);
    expect(world.history.careResponsibilities).toHaveLength(1);
    expect(world.history.childAuthorities).toHaveLength(1);
    expect(world.history.householdLocations).toHaveLength(2);
    expect(
      world.history.educationEnrollmentStates.some(
        (item) => item.status === "transferred",
      ),
    ).toBe(true);
    expect(world.history.educationEnrollments).toHaveLength(3);
    expect(world.history.events.length).toBeLessThan(30);
  });

  it("uses one transition contract for played, quick-generated, and authored history", () => {
    const runs = (["played", "quick-generated", "authored"] as const).map(
      (mode) => {
        let world = createDemoWorld(`run-b-common-${mode}`);
        const person = personId(world);
        if (mode === "played")
          world = { ...world, control: { kind: "person", personId: person } };
        return applyCharacterHistoryPlan(world, commonPlan(world, person, mode))
          .world;
      },
    );
    for (const world of runs) {
      expect(world.history.events).toHaveLength(8);
      expect(world.history.knowledge).toHaveLength(1);
      expect(world.history.memories).toHaveLength(1);
      expect(world.history.appraisals).toHaveLength(2);
      expect(world.history).not.toHaveProperty("characterHistories");
    }
    expect(runs[1]!.history.appraisals.at(-1)?.provenance.kind).toBe(
      "reflection",
    );
    expect(runs[2]!.history.appraisals.at(-1)?.provenance.kind).toBe(
      "authored",
    );
  });

  it("accepts an unusual manually authored guardian, household, school, and activity combination through the same plan", () => {
    const initial = bareWorld("run-b-manual-history");
    const player = personId(initial);
    const jurisdictionId = initial.jurisdictionOrder[0]!;
    const birthDate = initial.people[player]!.birthDate;
    const guardianKey = "manual:guardian";
    const householdKey = "manual:household";
    const schoolKey = "manual:school";
    const activityKey = "manual:activity";
    const guardianId = characterHistoryContextPersonId(initial, guardianKey);
    const householdId = createStableId(
      "household",
      `${initial.id}:${householdKey}`,
    );
    const schoolId = createStableId(
      "organization",
      `${initial.id}:${schoolKey}`,
    );
    const activityId = createStableId(
      "organization",
      `${initial.id}:${activityKey}`,
    );
    const guardianBirth = `${(Number(birthDate.slice(0, 4)) - 35)
      .toString()
      .padStart(4, "0")}${birthDate.slice(4)}` as IsoDate;
    const beforeFacts = initial.people[player]!.establishedFacts;
    const applied = applyCharacterHistoryPlan(initial, {
      stableKey: "manual:unusual-history",
      mode: "authored",
      personId: player,
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey: guardianKey,
            givenName: "Morgan",
            familyName: "Rivera",
            birthDate: guardianBirth,
            homeJurisdictionId: jurisdictionId,
          },
        },
        {
          kind: "organization",
          input: {
            stableKey: schoolKey,
            formedAt: birthDate,
            provenance: { kind: "authored", note: "Manual school." },
            initialProfile: {
              name: "Open Learning School",
              classification: "service:school",
              locationJurisdictionId: jurisdictionId,
            },
          },
        },
        {
          kind: "organization",
          input: {
            stableKey: activityKey,
            formedAt: birthDate,
            provenance: { kind: "authored", note: "Manual activity." },
            initialProfile: {
              name: "Robotics Collective",
              classification: "community:youth-activity",
              locationJurisdictionId: jurisdictionId,
            },
          },
        },
        {
          kind: "household",
          input: {
            stableKey: householdKey,
            formedAt: birthDate,
            label: "Guardian household",
            provenance: { kind: "authored", note: "Manual household." },
          },
        },
        {
          kind: "household-location",
          input: {
            stableKey: "manual:household-location",
            householdStableKey: householdKey,
            effectiveAt: birthDate,
            jurisdictionId,
            label: "Guardian residence",
            kind: "residence:guardian-home",
            provenance: { kind: "authored", note: "Manual household." },
          },
        },
        {
          kind: "household-membership",
          input: {
            stableKey: "manual:household-player",
            personId: player,
            householdId,
            startedAt: birthDate,
            residenceRole: "primary",
            kind: "resident:child",
            provenance: { kind: "authored", note: "Manual household." },
          },
        },
        {
          kind: "household-membership",
          input: {
            stableKey: "manual:household-guardian",
            personId: guardianId,
            householdId,
            startedAt: birthDate,
            residenceRole: "primary",
            kind: "resident:guardian",
            provenance: { kind: "authored", note: "Manual household." },
          },
        },
        {
          kind: "care",
          input: {
            stableKey: "manual:care",
            caregiverPersonId: guardianId,
            recipientPersonId: player,
            startedAt: birthDate,
            kind: "supportive:kin-care",
            share: "primary",
            context: "Non-default guardian care",
            timeDemand: lowTimeDemand(jurisdictionId),
            provenance: { kind: "authored", note: "Manual care." },
          },
        },
        {
          kind: "authority",
          input: {
            stableKey: "manual:authority",
            childPersonId: player,
            holder: { kind: "person", personId: guardianId },
            establishedAt: birthDate,
            kind: "guardianship:kin",
            basisKind: "custom:authored-arrangement",
            context: "Non-default guardian authority",
            provenance: { kind: "authored", note: "Manual authority." },
          },
        },
        {
          kind: "education",
          input: {
            stableKey: "manual:education",
            personId: player,
            organizationId: schoolId,
            startedAt: dateAtAge(birthDate, 5),
            programKind: "schooling:project-based",
            contextKind: "track:open-learning",
            provenance: { kind: "authored", note: "Manual education." },
          },
        },
        {
          kind: "participation",
          input: {
            stableKey: "manual:activity",
            personId: player,
            organizationId: activityId,
            startedAt: dateAtAge(birthDate, 13),
            kind: "activity:robotics",
            roleKind: "participant:member",
            context: "School-adjacent activity",
            provenance: { kind: "authored", note: "Manual activity." },
          },
        },
      ],
    });
    expect(applied.world.history.childAuthorities[0]).toMatchObject({
      holder: { kind: "person", personId: guardianId },
      provenance: { kind: "authored" },
    });
    expect(applied.world.history.educationEnrollments[0]).toMatchObject({
      organizationId: schoolId,
      provenance: { kind: "authored" },
    });
    expect(applied.world.history.organizationParticipations[0]).toMatchObject({
      organizationId: activityId,
      provenance: { kind: "authored" },
    });
    expect(applied.world.people[player]!.establishedFacts).toStrictEqual(
      beforeFacts,
    );
  });

  it("resolves a lunch-table choice through ordinary subjective and relationship history, with repeat-only development evidence", () => {
    let world = createDemoWorld("run-b-lunch");
    const player = personId(world);
    const peer = personId(world, 2);
    world = { ...world, control: { kind: "person", personId: player } };
    const age10 = dateAtAge(world.people[player]!.birthDate, 10);
    const age11 = dateAtAge(world.people[player]!.birthDate, 11);
    const priorTendencyCount = world.history.personalityTendencies.length;
    expect(
      availableLifeSituations(world, {
        personId: player,
        asOfDate: age10,
        otherPersonId: peer,
      }).map((item) => item.key),
    ).toContain("formative.lunch-table");
    const first = resolveLifeSituation(world, {
      stableKey: "lunch:first",
      mode: "played",
      personId: player,
      situationKey: "formative.lunch-table",
      optionKey: "make-room",
      occurredAt: age10,
      jurisdictionId: world.jurisdictionOrder[0]!,
      otherPersonId: peer,
    });
    if (first.status !== "resolved")
      throw new Error("Expected lunch resolution.");
    expect(first.world.history.personalityTendencies).toHaveLength(
      priorTendencyCount,
    );
    expect(first.developmentProposals).toHaveLength(0);
    const second = resolveLifeSituation(first.world, {
      stableKey: "lunch:second",
      mode: "played",
      personId: player,
      situationKey: "formative.lunch-table",
      optionKey: "make-room",
      occurredAt: age11,
      jurisdictionId: first.world.jurisdictionOrder[0]!,
      otherPersonId: peer,
    });
    if (second.status !== "resolved")
      throw new Error("Expected second lunch resolution.");
    expect(second.world.history.events).toHaveLength(9);
    expect(second.world.history.relationshipInteractions).toHaveLength(2);
    expect(second.world.history.knowledge).toHaveLength(4);
    expect(second.world.history.memories).toHaveLength(2);
    expect(second.world.history.appraisals).toHaveLength(3);
    expect(second.developmentProposals[0]).toMatchObject({
      requiresPlayerChoice: true,
      repetitionKey: "formative.lunch-table",
    });
  });

  it("retains a stable childhood peer over decades and grounds conflict/recognition in subjective history rather than a friendship entity", () => {
    let world = bareWorld("run-b-social-continuity");
    const actorKey = "continuity:actor";
    const peerKey = "continuity:peer";
    const actor = characterHistoryContextPersonId(world, actorKey);
    const peer = characterHistoryContextPersonId(world, peerKey);
    world = applyCharacterHistoryPlan(world, {
      stableKey: "continuity:people",
      mode: "authored",
      personId: personId(world),
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey: actorKey,
            givenName: "Jordan",
            familyName: "Davis",
            birthDate: "1970-05-01" as IsoDate,
            homeJurisdictionId: world.jurisdictionOrder[0]!,
          },
        },
        {
          kind: "context-person",
          input: {
            stableKey: peerKey,
            givenName: "Avery",
            familyName: "Nguyen",
            birthDate: "1970-07-01" as IsoDate,
            homeJurisdictionId: world.jurisdictionOrder[0]!,
          },
        },
      ],
    }).world;
    world = { ...world, control: { kind: "person", personId: actor } };
    const lunch = resolveLifeSituation(world, {
      stableKey: "continuity:lunch",
      mode: "played",
      personId: actor,
      situationKey: "formative.lunch-table",
      optionKey: "make-room",
      occurredAt: "1980-06-01" as IsoDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      otherPersonId: peer,
    });
    if (lunch.status !== "resolved")
      throw new Error("Expected lunch resolution.");
    const conflict = resolveLifeSituation(lunch.world, {
      stableKey: "continuity:conflict",
      mode: "played",
      personId: actor,
      situationKey: "formative.friend-conflict",
      optionKey: "withdraw",
      occurredAt: "1981-06-01" as IsoDate,
      jurisdictionId: lunch.world.jurisdictionOrder[0]!,
      otherPersonId: peer,
    });
    if (conflict.status !== "resolved")
      throw new Error("Expected conflict resolution.");
    const lunchEvent = conflict.world.history.events.find(
      (item) => item.stableKey === "continuity:lunch:event",
    );
    expect(conflict.world.people[peer]?.id).toBe(peer);
    expect(lunchEvent?.occurredAt).toBe("1980-06-01");
    expect(
      conflict.world.history.memories.some(
        (item) => item.personId === actor && item.eventId === lunchEvent?.id,
      ),
    ).toBe(true);
    expect(
      conflict.world.history.knowledge.some(
        (item) => item.personId === peer && item.eventId === lunchEvent?.id,
      ),
    ).toBe(true);
    expect(
      conflict.world.history.relationshipInteractions.some(
        (item) => item.kind === "conflict:formative",
      ),
    ).toBe(true);
    expect(conflict.world.history).not.toHaveProperty("friendships");
  });

  it("consults eligibility for teen work and leaves no forbidden work truth when blocked", () => {
    const initial = createDemoWorld("run-b-eligibility");
    const player = personId(initial);
    const jurisdictionId = initial.jurisdictionOrder[0]!;
    const prepared = applyCharacterHistoryPlan(initial, {
      stableKey: "teen-work-prep",
      mode: "authored",
      personId: player,
      transitions: [
        {
          kind: "organization",
          input: {
            stableKey: "teen-market",
            formedAt: initial.people[player]!.birthDate,
            provenance: { kind: "authored", note: "Test employer." },
            initialProfile: {
              name: "Teen market",
              classification: "enterprise:retail",
              locationJurisdictionId: jurisdictionId,
            },
          },
        },
      ],
    }).world;
    const controlled = {
      ...prepared,
      control: { kind: "person" as const, personId: player },
    };
    const employer = controlled.history.organizations[0]!;
    const occurrence = dateAtAge(controlled.people[player]!.birthDate, 16);
    const priorWorkCount = controlled.history.workRelationships.length;
    const work = {
      organizationId: employer.id,
      workStableKey: "teen-job",
      title: "Weekend helper",
      workKind: "employment:part-time" as const,
      occupationClassification: "custom:open-teen-role" as const,
      timeDemand: lowTimeDemand(jurisdictionId),
    };
    const blocked = resolveLifeSituation(controlled, {
      stableKey: "teen-work:blocked",
      mode: "played",
      personId: player,
      situationKey: "formative.teen-work-opportunity",
      optionKey: "accept",
      occurredAt: occurrence,
      jurisdictionId,
      teenWorkOpportunity: work,
      eligibilityProvider: {
        evaluate: () => ({
          status: "blocked",
          reasons: [
            {
              key: "rule:test-prohibition",
              explanation: "Fixture rule blocks this work.",
            },
          ],
        }),
      },
    });
    expect(blocked.status).toBe("blocked");
    expect(blocked.world).toBe(controlled);
    expect(blocked.world.history.workRelationships).toHaveLength(
      priorWorkCount,
    );
    const allowed = resolveLifeSituation(controlled, {
      stableKey: "teen-work:allowed",
      mode: "played",
      personId: player,
      situationKey: "formative.teen-work-opportunity",
      optionKey: "accept",
      occurredAt: occurrence,
      jurisdictionId,
      teenWorkOpportunity: work,
      eligibilityProvider: {
        evaluate: () => ({ status: "allowed", reasons: [] }),
      },
    });
    if (allowed.status !== "resolved")
      throw new Error("Expected allowed work.");
    expect(allowed.world.history.workRelationships.at(-1)).toMatchObject({
      kind: "employment:part-time",
      compensation: "paid",
      provenance: { kind: "simulated-event" },
    });
    expect(allowed.world.history.workRoles.at(-1)).not.toHaveProperty("amount");
  });

  it("composes apprenticeship, concurrent Guard/Reserve service, and an open OCONUS relocation without new engines", () => {
    const demo = createDemoWorld("run-b-adult-paths");
    const oconusId = createStableId("jurisdiction", "fixture:oconus-location");
    const oconus: Jurisdiction = {
      id: oconusId,
      slug: "oconus-fixture",
      name: "Overseas assignment fixture",
      kind: "location-context",
      parentName: "Outside United States",
      provenance: {
        asOf: null,
        source: null,
        jurisdiction: oconusId,
        status: "placeholder",
      },
    };
    let world = createWorld({
      seed: "run-b-adult-paths",
      currentDate: demo.currentDate,
      jurisdictions: [
        ...demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
        oconus,
      ],
      people: demo.personOrder.map((id) => demo.people[id] as Person),
    });
    const player = personId(world);
    const mentor = personId(world, 2);
    const home = "adult-household";
    world = applyCharacterHistoryPlan(world, {
      stableKey: "adult-path-orgs",
      mode: "authored",
      personId: player,
      transitions: [
        {
          kind: "organization",
          input: {
            stableKey: "guild",
            formedAt: world.people[player]!.birthDate,
            provenance: { kind: "authored", note: "Fixture." },
            initialProfile: {
              name: "Open Trade Guild",
              classification: "service:training",
              locationJurisdictionId: world.jurisdictionOrder[0]!,
            },
          },
        },
        {
          kind: "organization",
          input: {
            stableKey: "civilian",
            formedAt: world.people[player]!.birthDate,
            provenance: { kind: "authored", note: "Fixture." },
            initialProfile: {
              name: "Civilian employer",
              classification: "enterprise:services",
              locationJurisdictionId: world.jurisdictionOrder[0]!,
            },
          },
        },
        {
          kind: "organization",
          input: {
            stableKey: "reserve",
            formedAt: world.people[player]!.birthDate,
            provenance: { kind: "authored", note: "Fixture." },
            initialProfile: {
              name: "Reserve service",
              classification: "service:reserve",
              locationJurisdictionId: world.jurisdictionOrder[0]!,
            },
          },
        },
        {
          kind: "household",
          input: {
            stableKey: home,
            formedAt: dateAtAge(world.people[player]!.birthDate, 18),
            label: "Adult household",
            provenance: { kind: "authored", note: "Fixture." },
          },
        },
        {
          kind: "household-location",
          input: {
            stableKey: "adult-home-location",
            householdStableKey: home,
            effectiveAt: dateAtAge(world.people[player]!.birthDate, 18),
            jurisdictionId: world.jurisdictionOrder[0]!,
            label: "Domestic location",
            kind: "residence:adult",
            provenance: { kind: "authored", note: "Fixture." },
          },
        },
      ],
    }).world;
    const org = (key: string) =>
      world.history.organizations.find((item) => item.stableKey === key)!.id;
    const start = dateAtAge(world.people[player]!.birthDate, 19);
    const finish = dateAtAge(world.people[player]!.birthDate, 21);
    world = applyCharacterHistoryPlan(
      world,
      composeApprenticeshipPlan({
        stableKey: "apprenticeship",
        mode: "authored",
        personId: player,
        organizationId: org("guild"),
        mentorPersonId: mentor,
        startsAt: start,
        completesAt: finish,
        jurisdictionId: world.jurisdictionOrder[0]!,
      }),
    ).world;
    expect(
      educationEnrollmentStateHistory(
        world,
        world.history.educationEnrollments[0]!.id,
      ).at(-1),
    ).toMatchObject({ status: "completed" });
    expect(world.history.workRelationships[0]).toMatchObject({
      kind: "training:apprenticeship",
      compensation: "paid",
    });
    expect(
      world.history.relationshipInteractions.some(
        (item) => item.kind === "mentorship:training",
      ),
    ).toBe(true);
    world = applyCharacterHistoryPlan(
      world,
      composeGuardReservePlan({
        stableKey: "guard",
        mode: "authored",
        personId: player,
        civilianOrganizationId: org("civilian"),
        serviceOrganizationId: org("reserve"),
        civilianStartsAt: start,
        serviceStartsAt: start,
        activationAt: finish,
        returnAt: dateAtAge(world.people[player]!.birthDate, 22),
        jurisdictionId: world.jurisdictionOrder[0]!,
      }),
    ).world;
    const activation = {
      asOfDate: finish,
      historySequenceExclusive: world.history.nextSequence,
    };
    expect(
      activeWorkRelationshipsAt(world, player, activation).map(
        (item) => item.relationship.kind,
      ),
    ).toContain("service:reserve");
    expect(
      activeWorkRelationshipsAt(world, player, activation).map(
        (item) => item.relationship.kind,
      ),
    ).not.toContain("employment:ordinary");
    const returnedAt = dateAtAge(world.people[player]!.birthDate, 22);
    const returnCutoff = {
      asOfDate: returnedAt,
      historySequenceExclusive: world.history.nextSequence,
    };
    expect(
      activeWorkRelationshipsAt(world, player, returnCutoff).map(
        (item) => item.relationship.kind,
      ),
    ).toEqual(
      expect.arrayContaining(["employment:ordinary", "service:reserve"]),
    );
    world = applyCharacterHistoryPlan(
      world,
      composePcsRelocationPlan({
        stableKey: "pcs",
        mode: "authored",
        personId: player,
        householdStableKey: home,
        effectiveAt: returnedAt,
        jurisdictionId: oconusId,
        label: "Overseas assignment context",
      }),
    ).world;
    expect(
      householdLocationHistory(world, world.history.households[0]!.id).at(-1),
    ).toMatchObject({ jurisdictionId: oconusId });
    expect(world.jurisdictionOrder).toContain(oconusId);
    expect(world.history).not.toHaveProperty("foreignGovernments");
  });

  it("keeps quick histories deterministic, persistence-exact, and unrelated materialization history-neutral", () => {
    const first = bareWorld("run-b-determinism");
    const player = personId(first);
    const second = bareWorld("run-b-determinism");
    const secondPlayer = personId(second);
    const generatedFirst = applyCharacterHistoryPlan(
      first,
      generateQuickCharacterHistory(first, {
        stableKey: "quick:determinism",
        personId: player,
        jurisdictionId: first.jurisdictionOrder[0]!,
      }),
    ).world;
    const preMaterialized = materializePerson(second, personId(second, 4));
    const generatedSecond = applyCharacterHistoryPlan(
      preMaterialized,
      generateQuickCharacterHistory(preMaterialized, {
        stableKey: "quick:determinism",
        personId: secondPlayer,
        jurisdictionId: preMaterialized.jurisdictionOrder[0]!,
      }),
    ).world;
    expect(generatedFirst.history).toStrictEqual(generatedSecond.history);
    const untouched = generatedFirst.personOrder[3]!;
    const before = generatedFirst.history.nextSequence;
    const materialized = materializePerson(generatedFirst, untouched);
    expect(materialized.history).toStrictEqual(generatedFirst.history);
    expect(materialized.history.nextSequence).toBe(before);
    expect(deserializeWorld(serializeWorld(generatedFirst))).toStrictEqual(
      generatedFirst,
    );
  });
});
