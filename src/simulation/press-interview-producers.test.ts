import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import { projectPublicInformationPanel } from "../presentation/public-information-adapters";
import {
  activeWorkRelationshipsAt,
  addSimulationMinutes,
  advanceWorldMinutes,
  completePressInterview,
  confirmPressResponse,
  correctPublication,
  createWorkRelationship,
  deserializeWorld,
  draftPressResponse,
  projectPressInterview,
  projectPublicInformationDigest,
  publishPressInterview,
  recordEventKnowledge,
  recordWorldEvent,
  serializeWorld,
} from "./index";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "./press-interviews";
import {
  arrangeAcceptedPressInterview,
  producePressAdviserFeedback,
  producePressPreparation,
  projectEligiblePressAdvisers,
  projectEligiblePressReporters,
  recordPressAdviserResponse,
  recordPressRequest,
  recordPressRequestResponse,
} from "./press-interview-producers";
import type { EntityId, World } from "./types";

const PROVENANCE = {
  kind: "authored" as const,
  note: "Synthetic NEWS-PRODUCERS6 acceptance setup.",
};

interface ProducerFixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly adviserPersonId: EntityId;
  readonly unrelatedPersonId: EntityId;
  readonly reporterWorkRoleId: EntityId;
  readonly basisEventId: EntityId;
  readonly adviserBasisKnowledgeId: EntityId;
  readonly jurisdictionId: EntityId;
}

function producerFixture(seed: string): ProducerFixture {
  const created = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "legislative-office",
    household: "shares-a-home",
    seed,
    givenName: "Morgan",
    familyName: "Reed",
  });
  let world = created.world;
  const playerPersonId = created.playerPersonId;
  const otherPeople = world.personOrder.filter((id) => id !== playerPersonId);
  const adviserPersonId = otherPeople[0]!;
  const reporterPersonId = otherPeople[1]!;
  const unrelatedPersonId = otherPeople[2] ?? otherPeople[0]!;
  const playerWork = activeWorkRelationshipsAt(world, playerPersonId).find(
    ({ relationship }) => relationship.organizationId !== null,
  );
  if (!playerWork?.relationship.organizationId) {
    throw new Error("Acceptance setup requires the production office role.");
  }
  const jurisdictionId = playerWork.role.locationJurisdictionId!;

  world = createWorkRelationship(world, {
    stableKey: `${seed}:adviser-work`,
    personId: adviserPersonId,
    organizationId: playerWork.relationship.organizationId,
    startedAt: world.currentDate,
    kind: "employment:communications-advice",
    compensation: "paid",
    authority: "shared",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: PROVENANCE,
    initialRole: {
      title: "Communications adviser",
      occupationClassification: "occupation:communications-adviser",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "interruptible",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  world = createWorkRelationship(world, {
    stableKey: `${seed}:reporter-work`,
    personId: reporterPersonId,
    organizationId: null,
    startedAt: world.currentDate,
    kind: "employment:news-reporting",
    compensation: "paid",
    authority: "self-directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: PROVENANCE,
    initialRole: {
      title: "Civic affairs reporter",
      occupationClassification: JOURNALISM_OCCUPATION_CLASSIFICATION,
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const reporterWorkRoleId = world.history.workRoles.at(-1)!.id;
  world = recordWorldEvent(world, {
    stableKey: `${seed}:public-development`,
    type: "legislation.committee-hearing-completed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [
      jurisdictionId,
      playerPersonId,
      reporterPersonId,
    ].sort(),
    participants: [
      {
        personId: playerPersonId,
        role: "agency:hearing-participant",
        detail: "Participated in the recorded hearing",
      },
      {
        personId: reporterPersonId,
        role: "observation:reporter",
        detail: "Observed the recorded hearing",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "press.question-basis"],
    summary: "A scheduled committee hearing concluded without a final vote.",
    context: {
      location: {
        jurisdictionId,
        label: "Committee room",
        setting: "Recorded hearing",
      },
      socialContext: "The committee heard testimony on a pending measure.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const basisEventId = world.history.events.at(-1)!.id;
  world = recordEventKnowledge(world, {
    stableKey: `${seed}:reporter-knows-basis`,
    personId: reporterPersonId,
    eventId: basisEventId,
    learnedAt: world.currentDate,
    believedSummary: "The reporter observed the completed hearing.",
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  world = recordEventKnowledge(world, {
    stableKey: `${seed}:adviser-knows-basis`,
    personId: adviserPersonId,
    eventId: basisEventId,
    learnedAt: world.currentDate,
    believedSummary:
      "The hearing concluded, while the measure remained pending without a final vote.",
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "public-record", reference: basisEventId },
  });
  return {
    world,
    playerPersonId,
    reporterPersonId,
    adviserPersonId,
    unrelatedPersonId,
    reporterWorkRoleId,
    basisEventId,
    adviserBasisKnowledgeId: world.history.knowledge.at(-1)!.id,
    jurisdictionId,
  };
}

function acceptedArrangement(seed: string) {
  const fixture = producerFixture(seed);
  const request = recordPressRequest(fixture.world, {
    stableKey: `${seed}:request`,
    reporterPersonId: fixture.reporterPersonId,
    reporterWorkRoleId: fixture.reporterWorkRoleId,
    jurisdictionId: fixture.jurisdictionId,
    channel: "written",
    terms: "on-record",
    backgroundAttribution: null,
    pitch: "Discuss the completed hearing and the work that remains.",
    primaryQuestion:
      "What happened at the hearing, and is there a final result?",
    questionBasisEventIds: [fixture.basisEventId],
  });
  const reporterResponse = recordPressRequestResponse(request.world, {
    stableKey: `${seed}:reporter-response`,
    requestEventId: request.requestEventId,
    reporterPersonId: fixture.reporterPersonId,
    accepted: true,
    statement: "I accept the written on-record exchange on those terms.",
  });
  const adviserResponse = recordPressAdviserResponse(reporterResponse.world, {
    stableKey: `${seed}:adviser-response`,
    requestEventId: request.requestEventId,
    adviserPersonId: fixture.adviserPersonId,
    accepted: true,
    statement: "I can take the preparation assignment.",
  });
  const start = addSimulationMinutes(adviserResponse.world.currentMoment, 90);
  const arranged = arrangeAcceptedPressInterview(adviserResponse.world, {
    stableKey: `${seed}:arrangement`,
    requestEventId: request.requestEventId,
    reporterResponseEventId: reporterResponse.responseEventId,
    adviserResponseEventId: adviserResponse.responseEventId,
    start,
    end: addSimulationMinutes(start, 30),
    location: { locationKey: "office-press-room", label: "Office press room" },
    preparationMinutes: 30,
  });
  return { ...fixture, ...request, ...arranged };
}

describe("normal press request, eligibility and adviser producers", () => {
  it("runs request through consent, preparation, condensed interview, publication, correction, feedback and reload", () => {
    const arranged = acceptedArrangement("news-producers6-normal");
    let world = advanceWorldMinutes(arranged.world, 30);
    world = producePressPreparation(world, {
      stableKey: "news-producers6-normal:preparation",
      activityId: arranged.activityId,
      adviserPersonId: arranged.adviserPersonId,
      sourceKnowledgeIds: [arranged.adviserBasisKnowledgeId],
      likelyFollowUps: ["What procedural steps remain?"],
      responseOptions: [
        "State what the recorded hearing established.",
        "Say plainly that no final vote has occurred.",
      ],
    });
    world = draftPressResponse(world, {
      stableKey: "news-producers6-normal:draft",
      activityId: arranged.activityId,
      mode: "condensed",
      intent: "answer-directly",
      followUpQuestion: "What procedural steps remain?",
      proposedWording:
        "The hearing is complete, the measure remains pending, and no final vote has occurred.",
    });
    world = confirmPressResponse(world, {
      stableKey: "news-producers6-normal:confirm",
      activityId: arranged.activityId,
      confirmedWording:
        "The hearing is complete, the measure remains pending, and no final vote has occurred.",
    });
    world = completePressInterview(world, arranged.activityId);
    world = publishPressInterview(world, {
      stableKey: "news-producers6-normal:story",
      activityId: arranged.activityId,
    });
    const publication = world.history.publications!.at(-1)!;
    world = correctPublication(world, {
      stableKey: "news-producers6-normal:correction",
      correctsPublicationId: publication.id,
      headline: `${publication.headline} — corrected`,
      body: `${publication.body} The exchange was written and on record.`,
      correctionNote: "Clarified the channel used for the exchange.",
    });
    world = producePressAdviserFeedback(world, {
      stableKey: "news-producers6-normal:feedback",
      activityId: arranged.activityId,
      adviserPersonId: arranged.adviserPersonId,
      interpretation:
        "My reading is that the story kept the lack of a final result visible; that is advice, not measured public opinion.",
    });

    const interview = projectPressInterview(world, arranged.activityId);
    expect(interview).toMatchObject({
      mode: "condensed",
      channel: "written",
      terms: "on-record",
      completed: true,
      condensedPenaltyApplied: false,
      publicationId: publication.id,
    });
    expect(interview.knownFacts).toEqual([
      "The hearing concluded, while the measure remained pending without a final vote.",
    ]);
    expect(interview.confirmedWording).toBe(interview.proposedWording);
    expect(interview.adviserFeedback).toContain("not measured public opinion");

    const digest = projectPublicInformationDigest(
      world,
      arranged.jurisdictionId,
    );
    expect(digest.items).toHaveLength(1);
    expect(digest.items[0]).toMatchObject({
      publicationId: publication.id,
      sourceEventId: publication.sourceEventId,
      eventTime: world.currentDate,
      publicationTime: world.currentDate,
    });
    expect(digest.items[0]!.corrections).toHaveLength(1);
    expect(digest.items[0]!.people.map(({ personId }) => personId)).toEqual(
      expect.arrayContaining([
        arranged.playerPersonId,
        arranged.reporterPersonId,
      ]),
    );
    const panel = projectPublicInformationPanel(world);
    expect(panel.items[0]!.people[0]!.kind).toBe("person");
    expect(
      panel.items[0]!.civicReferences.map((reference) => reference.conceptId),
    ).toEqual(["on-record", "published-information"]);

    const loaded = deserializeWorld(serializeWorld(world));
    expect(projectPressInterview(loaded, arranged.activityId)).toEqual(
      interview,
    );
    expect(projectPublicInformationDigest(loaded)).toEqual(
      projectPublicInformationDigest(world),
    );
  });

  it("projects only actual current journalists with knowledge, without writing history", () => {
    const fixture = producerFixture("news-producers6-eligibility");
    const before = serializeWorld(fixture.world);
    expect(
      projectEligiblePressReporters(fixture.world, {
        sourcePersonId: fixture.playerPersonId,
        questionBasisEventIds: [fixture.basisEventId],
      }),
    ).toEqual([
      expect.objectContaining({
        personId: fixture.reporterPersonId,
        workRoleId: fixture.reporterWorkRoleId,
      }),
    ]);
    expect(
      projectEligiblePressReporters(fixture.world, {
        sourcePersonId: fixture.playerPersonId,
        questionBasisEventIds: [fixture.world.id],
      }),
    ).toEqual([]);
    expect(
      projectEligiblePressAdvisers(fixture.world, fixture.playerPersonId),
    ).toEqual([expect.objectContaining({ personId: fixture.adviserPersonId })]);
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it("requires reporter consent and current-colleague willingness before arrangement", () => {
    const fixture = producerFixture("news-producers6-consent");
    const request = recordPressRequest(fixture.world, {
      stableKey: "news-producers6-consent:request",
      reporterPersonId: fixture.reporterPersonId,
      reporterWorkRoleId: fixture.reporterWorkRoleId,
      jurisdictionId: fixture.jurisdictionId,
      channel: "spoken",
      terms: "on-record",
      backgroundAttribution: null,
      pitch: "Request an interview about the recorded hearing.",
      primaryQuestion: "What happened at the hearing?",
      questionBasisEventIds: [fixture.basisEventId],
    });
    expect(() =>
      recordPressAdviserResponse(request.world, {
        stableKey: "news-producers6-consent:family-only",
        requestEventId: request.requestEventId,
        adviserPersonId: fixture.unrelatedPersonId,
        accepted: true,
        statement: "I will help.",
      }),
    ).toThrow(/current colleague; family relationship alone is insufficient/u);
    const declined = recordPressRequestResponse(request.world, {
      stableKey: "news-producers6-consent:declined",
      requestEventId: request.requestEventId,
      reporterPersonId: fixture.reporterPersonId,
      accepted: false,
      statement: "I decline this request.",
    });
    const adviser = recordPressAdviserResponse(declined.world, {
      stableKey: "news-producers6-consent:adviser",
      requestEventId: request.requestEventId,
      adviserPersonId: fixture.adviserPersonId,
      accepted: true,
      statement: "I accept the assignment.",
    });
    const start = addSimulationMinutes(adviser.world.currentMoment, 90);
    expect(() =>
      arrangeAcceptedPressInterview(adviser.world, {
        stableKey: "news-producers6-consent:arrange",
        requestEventId: request.requestEventId,
        reporterResponseEventId: declined.responseEventId,
        adviserResponseEventId: adviser.responseEventId,
        start,
        end: addSimulationMinutes(start, 30),
        location: { locationKey: "press-room", label: "Press room" },
        preparationMinutes: 30,
      }),
    ).toThrow(/Reporter consent is required/u);
    expect(adviser.world.history.scheduledActivities).toHaveLength(0);
  });

  it("rejects unknown preparation and feedback before an actual publication", () => {
    const arranged = acceptedArrangement("news-producers6-boundaries");
    const ready = advanceWorldMinutes(arranged.world, 30);
    expect(() =>
      producePressPreparation(ready, {
        stableKey: "news-producers6-boundaries:unknown-prep",
        activityId: arranged.activityId,
        adviserPersonId: arranged.adviserPersonId,
        sourceKnowledgeIds: [arranged.world.id],
        likelyFollowUps: ["What remains?"],
        responseOptions: ["State only known facts."],
      }),
    ).toThrow(/assigned adviser's current knowledge/u);
    expect(() =>
      producePressAdviserFeedback(ready, {
        stableKey: "news-producers6-boundaries:early-feedback",
        activityId: arranged.activityId,
        adviserPersonId: arranged.adviserPersonId,
        interpretation: "An unsupported reading.",
      }),
    ).toThrow(/arranged, published interview/u);
    expect(ready.history.publications ?? []).toHaveLength(0);
  });
});
