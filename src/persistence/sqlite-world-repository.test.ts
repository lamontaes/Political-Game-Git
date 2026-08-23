import { afterEach, describe, expect, it } from "vitest";

import {
  SYNTHETIC_POLICY_IDS,
  advanceDemoWorld,
  applyCharacterHistoryPlan,
  createChildAuthority,
  createFormationContext,
  createDemoWorld,
  createWorld,
  createEducationEnrollment,
  createOrganization,
  createOrganizationParticipation,
  createWorkRelationship,
  currentLifeCutoff,
  evaluateDecision,
  generateQuickCharacterHistory,
  materializePerson,
  recordChildAuthorityState,
  recordDurableDecisionTrace,
  recordEducationEnrollmentState,
  recordOrganizationParticipationState,
  recordPerception,
  recordPrivateBelief,
} from "../simulation";
import type { EntityId } from "../simulation";
import { SqliteWorldRepository } from "./sqlite-world-repository";

describe("SQLite world repository", () => {
  let repository: SqliteWorldRepository | null = null;

  afterEach(() => {
    repository?.close();
    repository = null;
  });

  it("persists, loads, lists, and updates a complete versioned world snapshot", () => {
    repository = new SqliteWorldRepository(":memory:");
    let initial = createDemoWorld("sqlite-persistence");
    const personId = initial.personOrder[0] as EntityId;
    initial = recordPrivateBelief(initial, {
      stableKey: "belief:sqlite:nuclear-investment",
      personId,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      formedAt: initial.currentDate,
      position: "conflicted",
      conviction: "strong",
      salience: "high",
      flexibility: "conditional",
      rationale: "Synthetic persistence fixture.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const detailed = materializePerson(initial, personId);
    const firstSave = repository.save(detailed);

    expect(repository.load(detailed.id)).toStrictEqual(detailed);
    expect(
      repository.load(detailed.id)?.history.privateBeliefs.at(-1),
    ).toMatchObject({
      propositionId: SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      position: "conflicted",
    });
    expect(repository.list()).toStrictEqual([firstSave]);

    const advanced = advanceDemoWorld(detailed, 30);
    const secondSave = repository.save(advanced);
    expect(secondSave.snapshotId).not.toBe(firstSave.snapshotId);
    expect(repository.load(advanced.id)).toStrictEqual(advanced);
    expect(repository.list()).toStrictEqual([secondSave]);
  });

  it("returns null for an unknown world", () => {
    repository = new SqliteWorldRepository(":memory:");
    const missingId = "world_missing" as EntityId;
    expect(repository.load(missingId)).toBeNull();
  });

  it("preserves Stage 5.1 organization and work history through SQLite", () => {
    repository = new SqliteWorldRepository(":memory:");
    let world = createDemoWorld("sqlite-life-foundation");
    const personId = world.personOrder[0] as EntityId;
    const jurisdictionId = world.jurisdictionOrder[0] as EntityId;
    world = createOrganization(world, {
      stableKey: "sqlite:organization:mutual-aid-lab",
      formedAt: "2010-01-01",
      provenance: {
        kind: "authored",
        note: "Synthetic SQLite life-foundation fixture.",
      },
      initialProfile: {
        name: "Synthetic Mutual Aid Lab",
        classification: "custom:mutual-aid-lab",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)?.id;
    if (!organizationId) throw new Error("Missing SQLite organization.");
    world = createWorkRelationship(world, {
      stableKey: "sqlite:work:repair-coordinator",
      personId,
      organizationId,
      startedAt: "2020-01-01",
      kind: "volunteer:repair-coordination",
      compensation: "unpaid",
      authority: "shared",
      dependency: "independent",
      economicRisk: "shared",
      provenance: {
        kind: "authored",
        note: "Synthetic SQLite life-foundation fixture.",
      },
      initialRole: {
        title: "Repair coordinator",
        occupationClassification: "custom:repair-coordination",
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 4, maximumHours: 8 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });

    repository.save(world);
    const restored = repository.load(world.id);
    expect(restored).toStrictEqual(world);
    expect(
      restored?.history.workRelationships.find(
        (relationship) =>
          relationship.stableKey === "sqlite:work:repair-coordinator",
      ),
    ).toMatchObject({
      organizationId,
      compensation: "unpaid",
    });
  });

  it("preserves every Stage 5 Run A family and typed life source exactly", () => {
    repository = new SqliteWorldRepository(":memory:");
    let world = createDemoWorld("sqlite-stage-5-run-a");
    const personId = world.personOrder[1] as EntityId;
    const holderId = world.personOrder[0] as EntityId;
    const jurisdictionId = world.jurisdictionOrder[0] as EntityId;
    const provenance = {
      kind: "authored" as const,
      note: "Synthetic SQLite Stage 5 Run A fixture.",
    };
    world = createOrganization(world, {
      stableKey: "sqlite:run-a:organization",
      formedAt: "1980-01-01",
      provenance,
      initialProfile: {
        name: "SQLite Run A Institute",
        classification: "custom:sqlite-run-a-institute",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)?.id;
    if (!organizationId) throw new Error("Missing Run A SQLite organization.");
    world = createEducationEnrollment(world, {
      stableKey: "sqlite:run-a:education",
      personId,
      organizationId,
      startedAt: "2015-01-01",
      programKind: "custom:sqlite-learning-program",
      contextKind: "custom:sqlite-learning-context",
      provenance,
    });
    const enrollment = world.history.educationEnrollments.at(-1);
    const enrollmentState = world.history.educationEnrollmentStates.at(-1);
    if (!enrollment || !enrollmentState) {
      throw new Error("Missing Run A SQLite education history.");
    }
    world = recordEducationEnrollmentState(world, {
      stableKey: "sqlite:run-a:education:completed",
      enrollmentId: enrollment.id,
      effectiveAt: "2020-01-01",
      status: "completed",
      contextKind: "custom:sqlite-learning-context",
      reason: "Completed the synthetic program",
      provenance,
      supersedesStateId: enrollmentState.id,
    });
    world = createOrganizationParticipation(world, {
      stableKey: "sqlite:run-a:participation",
      personId,
      organizationId,
      startedAt: "2018-01-01",
      kind: "custom:sqlite-membership",
      roleKind: "custom:sqlite-participant",
      context: "SQLite participation context",
      provenance,
    });
    const participation = world.history.organizationParticipations.at(-1);
    const participationState =
      world.history.organizationParticipationStates.at(-1);
    if (!participation || !participationState) {
      throw new Error("Missing Run A SQLite participation history.");
    }
    world = recordOrganizationParticipationState(world, {
      stableKey: "sqlite:run-a:participation:ended",
      participationId: participation.id,
      effectiveAt: "2022-01-01",
      status: "ended",
      roleKind: "custom:sqlite-participant",
      context: "Participation ended",
      provenance,
      supersedesStateId: participationState.id,
    });
    world = createChildAuthority(world, {
      stableKey: "sqlite:run-a:authority",
      childPersonId: personId,
      holder: { kind: "person", personId: holderId },
      establishedAt: "2018-01-01",
      kind: "custom:sqlite-authority",
      basisKind: "custom:sqlite-basis",
      context: "SQLite authority context",
      provenance,
    });
    const authority = world.history.childAuthorities.at(-1);
    const authorityState = world.history.childAuthorityStates.at(-1);
    if (!authority || !authorityState) {
      throw new Error("Missing Run A SQLite authority history.");
    }
    world = recordChildAuthorityState(world, {
      stableKey: "sqlite:run-a:authority:ended",
      childAuthorityId: authority.id,
      effectiveAt: "2023-01-01",
      status: "ended",
      basisKind: "custom:sqlite-basis-ended",
      context: "SQLite authority ended",
      provenance,
      supersedesStateId: authorityState.id,
    });
    const lifeSource = {
      kind: "life-history" as const,
      reference: {
        family: "education-enrollment" as const,
        recordId: enrollment.id,
      },
    };
    world = recordPerception(world, {
      stableKey: "sqlite:run-a:perception",
      personId,
      perceivedAt: world.currentDate,
      subjectKind: "domain:education",
      subjectKey: "education:sqlite-source",
      subjectEntityId: enrollment.id,
      assertion: "The person's education history remains available.",
      confidence: "high",
      sourceCredibility: "high",
      source: lifeSource,
      supersedesPerceptionId: null,
    });
    const evaluation = evaluateDecision(world, {
      stableKey: "sqlite:run-a:decision",
      decisionType: "sqlite-life-source",
      actorPersonId: personId,
      cutoff: currentLifeCutoff(world),
      subject: {
        kind: "domain:education",
        key: "education:sqlite-source",
        entityId: enrollment.id,
      },
      options: [
        { key: "use", label: "Use", description: "Use the evidence." },
        { key: "omit", label: "Omit", description: "Omit the evidence." },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "sqlite-life-source",
          optionKey: "use",
          sourceType: "domain:education-history",
          direction: "supports",
          importance: "moderate",
          confidence: "high",
          explanation: "The education record is durable evidence.",
          sourceRefs: [lifeSource],
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    world = recordDurableDecisionTrace(world, evaluation);

    const firstSaved = repository.save(world);
    world = materializePerson(world, holderId);
    const saved = repository.save(world);
    const restored = repository.load(world.id);
    expect(saved.snapshotId).not.toBe(firstSaved.snapshotId);
    expect(restored).toStrictEqual(world);
    expect(repository.list()).toStrictEqual([saved]);
    expect(restored?.history.educationEnrollmentStates).toHaveLength(2);
    expect(restored?.history.organizationParticipationStates).toHaveLength(2);
    expect(restored?.history.childAuthorityStates).toHaveLength(2);
    expect(restored?.history.perceptions.at(-1)?.source).toStrictEqual(
      lifeSource,
    );
    expect(
      restored?.history.decisionTraces.at(-1)?.sourceSnapshots[0]?.reference,
    ).toStrictEqual(lifeSource);
  });

  it("preserves generated Run B formative history, provenance, context people, and sequence exactly", () => {
    repository = new SqliteWorldRepository(":memory:");
    const demo = createDemoWorld("sqlite-stage-5-run-b");
    const initial = createWorld({
      seed: "sqlite-stage-5-run-b",
      currentDate: demo.currentDate,
      jurisdictions: demo.jurisdictionOrder.map(
        (id) => demo.jurisdictions[id]!,
      ),
      people: demo.personOrder.map((id) => demo.people[id]!),
    });
    const personId = initial.personOrder[1] as EntityId;
    const world = applyCharacterHistoryPlan(
      initial,
      generateQuickCharacterHistory(initial, {
        stableKey: "sqlite:run-b:quick-history",
        personId,
        jurisdictionId: initial.jurisdictionOrder[0] as EntityId,
      }),
    ).world;

    repository.save(world);
    const restored = repository.load(world.id);
    expect(restored).toStrictEqual(world);
    expect(restored?.history.organizations[0]?.provenance).toMatchObject({
      kind: "generated",
      generatorKey: "character-history-v1:sqlite:run-b:quick-history",
    });
    expect(
      restored?.history.events.some(
        (event) => event.type === "life.lunch-table-choice",
      ),
    ).toBe(true);
    expect(restored?.history.nextSequence).toBe(world.history.nextSequence);
    expect(restored?.personOrder.length).toBeGreaterThan(
      initial.personOrder.length,
    );
  });
});
