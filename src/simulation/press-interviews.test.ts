import { describe, expect, it } from "vitest";

import { createRunCFixture } from "../presentation/run-c-working-document";
import {
  projectPublicInformationHeadline,
  projectPublicInformationPanel,
} from "../presentation/public-information-adapters";
import {
  addSimulationMinutes,
  advanceWorldMinutes,
  correctPublication,
  createWorkRelationship,
  deserializeWorld,
  projectPublicInformationDigest,
  recordEventKnowledge,
  recordClaim,
  recordWorldEvent,
  serializeWorld,
} from "./index";
import {
  arrangePressInterview,
  completePressInterview,
  confirmPressResponse,
  draftPressResponse,
  JOURNALISM_OCCUPATION_CLASSIFICATION,
  projectPressInterview,
  publishPressInterview,
  recordPressAdviserFeedback,
  recordPressPreparation,
  type PressPlayMode,
  type PressRecordTerms,
} from "./press-interviews";
import type { EntityId, World } from "./types";

const AUTHORED = {
  kind: "authored" as const,
  note: "Synthetic NEWS-PRESS4 acceptance fixture.",
};

interface PressFixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly adviserPersonId: EntityId;
  readonly reporterWorkRoleId: EntityId;
  readonly basisEventId: EntityId;
  readonly pitchClaimId: EntityId;
  readonly jurisdictionId: EntityId;
}

function pressFixture(seed: string): PressFixture {
  const fixture = createRunCFixture(seed);
  let world = fixture.world;
  const playerPersonId = fixture.playerPersonId;
  const adviserPersonId = fixture.scenePerson.personId;
  const reporterPersonId = world.personOrder[2]!;
  const jurisdictionId = fixture.roomContext.jurisdictionId;

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
    provenance: AUTHORED,
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
    stableKey: `${seed}:public-briefing`,
    type: "civic.public-briefing-held",
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
        role: "agency:briefing-speaker",
        detail: "Answered questions at a public briefing",
      },
      {
        personId: reporterPersonId,
        role: "observation:reporter",
        detail: "Attended the public briefing",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["civic", "press.question-basis"],
    summary: "A public briefing described the office's current proposal.",
    context: {
      location: {
        jurisdictionId,
        label: "Public briefing room",
        setting: "Open briefing",
      },
      socialContext: "A reporter asked about an existing public proposal.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const basisEventId = world.history.events.at(-1)!.id;
  world = recordEventKnowledge(world, {
    stableKey: `${seed}:reporter-knows-briefing`,
    personId: reporterPersonId,
    eventId: basisEventId,
    learnedAt: world.currentDate,
    believedSummary: "The reporter attended the public proposal briefing.",
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });

  const pitch = "Discuss the proposal already raised at the public briefing.";
  world = recordWorldEvent(world, {
    stableKey: `${seed}:press-pitch-event`,
    type: "conversation.press-pitch-made",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [playerPersonId, reporterPersonId].sort(),
    participants: [
      {
        personId: playerPersonId,
        role: "agency:press-source",
        detail: "Requested a press exchange",
      },
      {
        personId: reporterPersonId,
        role: "observation:reporter",
        detail: "Received the request",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["conversation", "press.pitch"],
    summary: "A source requested a press exchange with a reporter.",
    context: {
      location: null,
      socialContext: "A direct press request.",
      pressure: null,
      choice: null,
      motivation: pitch,
      immediateReaction: null,
    },
  });
  const pitchEventId = world.history.events.at(-1)!.id;
  world = recordClaim(world, {
    stableKey: `${seed}:press-pitch-claim`,
    speakerPersonId: playerPersonId,
    eventId: pitchEventId,
    madeAt: world.currentDate,
    audience: "limited",
    statement: pitch,
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });
  const pitchClaimId = world.history.claims.at(-1)!.id;

  return {
    world,
    playerPersonId,
    reporterPersonId,
    adviserPersonId,
    reporterWorkRoleId,
    basisEventId,
    pitchClaimId,
    jurisdictionId,
  };
}

function arrange(seed: string, terms: PressRecordTerms, mode: PressPlayMode) {
  const fixture = pressFixture(seed);
  const start = addSimulationMinutes(fixture.world.currentMoment, 90);
  const end = addSimulationMinutes(start, 30);
  const arranged = arrangePressInterview(fixture.world, {
    stableKey: `${seed}:interview`,
    pitchClaimId: fixture.pitchClaimId,
    reporterPersonId: fixture.reporterPersonId,
    reporterWorkRoleId: fixture.reporterWorkRoleId,
    adviserPersonId: fixture.adviserPersonId,
    jurisdictionId: fixture.jurisdictionId,
    channel: mode === "condensed" ? "written" : "spoken",
    terms,
    backgroundAttribution:
      terms === "on-background" ? "a legislative office official" : null,
    pitch: "Discuss the proposal already raised at the public briefing.",
    primaryQuestion: "What would the proposal change, and what remains open?",
    questionBasisEventIds: [fixture.basisEventId],
    relationshipInteractionIds: [],
    start,
    end,
    location: {
      locationKey: "legislative-office-press-room",
      label: "Legislative office press room",
    },
    preparationMinutes: 30,
  });

  let world = advanceWorldMinutes(arranged.world, 30);
  world = recordPressPreparation(world, {
    stableKey: `${seed}:preparation-recorded`,
    activityId: arranged.activityId,
    adviserPersonId: fixture.adviserPersonId,
    knownFacts: ["The proposal was discussed at a recorded public briefing."],
    likelyFollowUps: ["Which details are not yet decided?"],
    responseOptions: [
      "Answer the question directly.",
      "Add context without claiming a final result.",
    ],
  });
  world = draftPressResponse(world, {
    stableKey: `${seed}:response-draft`,
    activityId: arranged.activityId,
    mode,
    intent: "add-context",
    followUpQuestion: "Which details are not yet decided?",
    proposedWording:
      "The proposal is still under consideration, and no final vote has occurred.",
  });
  world = confirmPressResponse(world, {
    stableKey: `${seed}:response-confirmed`,
    activityId: arranged.activityId,
    confirmedWording:
      "The proposal is still under consideration, and no final vote has occurred.",
  });
  world = completePressInterview(world, arranged.activityId);
  return { ...fixture, ...arranged, world };
}

describe("press interviews over canonical people, time, work and publication", () => {
  it("runs an interactive on-record answer through confirmation, publication, correction and feedback", () => {
    const completed = arrange(
      "news-press4-interactive",
      "on-record",
      "interactive",
    );
    let world = publishPressInterview(completed.world, {
      stableKey: "news-press4-interactive:story",
      activityId: completed.activityId,
    });
    const publication = world.history.publications!.at(-1)!;
    world = correctPublication(world, {
      stableKey: "news-press4-interactive:correction",
      correctsPublicationId: publication.id,
      headline: `${publication.headline} — corrected`,
      body: `${publication.body} The interview remained under on-record terms.`,
      correctionNote: "Clarified the description of the agreed ground rules.",
    });
    world = recordPressAdviserFeedback(world, {
      stableKey: "news-press4-interactive:feedback",
      activityId: completed.activityId,
      adviserPersonId: completed.adviserPersonId,
      interpretation:
        "My read is that the story foregrounded the unresolved vote, but that is an interpretation rather than measured public reaction.",
    });

    const view = projectPressInterview(world, completed.activityId);
    expect(view).toMatchObject({
      channel: "spoken",
      terms: "on-record",
      mode: "interactive",
      intent: "add-context",
      completed: true,
      publicationId: publication.id,
      condensedPenaltyApplied: false,
    });
    expect(view.confirmedWording).toBe(view.proposedWording);
    expect(view.adviserFeedback).toMatch(/interpretation/u);
    const claim = world.history.claims.find(
      (candidate) =>
        candidate.eventId ===
        world.history.events.find(
          (event) =>
            event.type === "press.response-confirmed" &&
            event.involvedEntityIds.includes(completed.activityId),
        )?.id,
    )!;
    expect(claim.relationshipToTruth).toBe("unknown");
    expect(claim.statement).toBe(view.confirmedWording);

    const digest = projectPublicInformationDigest(
      world,
      completed.jurisdictionId,
    );
    expect(digest.items).toHaveLength(1);
    expect(digest.items[0]).toMatchObject({
      publicationId: publication.id,
      eventTime: world.currentDate,
      publicationTime: world.currentDate,
    });
    expect(digest.items[0]!.people.map((person) => person.personId)).toEqual(
      expect.arrayContaining([
        completed.playerPersonId,
        completed.reporterPersonId,
      ]),
    );
    expect(digest.items[0]!.corrections).toHaveLength(1);
    expect(
      projectPublicInformationHeadline(world, completed.jurisdictionId),
    ).toMatchObject({
      publicationId: publication.id,
      sourceEventId: publication.sourceEventId,
      text: digest.items[0]!.headline,
    });
    expect(
      projectPublicInformationPanel(world).items[0]!.civicReferences.map(
        (entry) => entry.conceptId,
      ),
    ).toEqual(["on-record", "published-information"]);

    const loaded = deserializeWorld(serializeWorld(world));
    expect(projectPressInterview(loaded, completed.activityId)).toEqual(view);
    expect(projectPublicInformationDigest(loaded)).toEqual(
      projectPublicInformationDigest(world),
    );
  });

  it("treats a condensed written background exchange as completed play without exposing the source", () => {
    const completed = arrange(
      "news-press4-condensed",
      "on-background",
      "condensed",
    );
    const beforeRead = serializeWorld(completed.world);
    expect(
      projectPressInterview(completed.world, completed.activityId),
    ).toMatchObject({
      channel: "written",
      terms: "on-background",
      mode: "condensed",
      completed: true,
      condensedPenaltyApplied: false,
    });
    expect(serializeWorld(completed.world)).toBe(beforeRead);

    const published = publishPressInterview(completed.world, {
      stableKey: "news-press4-condensed:story",
      activityId: completed.activityId,
    });
    const item = projectPublicInformationDigest(published).items[0]!;
    expect(item.headline).toContain("a legislative office official");
    expect(item.headline).not.toContain(
      published.people[completed.playerPersonId]!.familyName,
    );
    expect(item.people.map((person) => person.personId)).toEqual([
      completed.reporterPersonId,
    ]);
  });

  it("keeps off-record material unpublished and rejects duplicate or unconfirmed publication paths", () => {
    const completed = arrange(
      "news-press4-off-record",
      "off-record",
      "interactive",
    );
    expect(() =>
      publishPressInterview(completed.world, {
        stableKey: "news-press4-off-record:story",
        activityId: completed.activityId,
      }),
    ).toThrow(/Off-record material cannot be published/u);
    expect(completed.world.history.publications ?? []).toHaveLength(0);

    const onRecord = arrange(
      "news-press4-duplicate",
      "on-record",
      "interactive",
    );
    const published = publishPressInterview(onRecord.world, {
      stableKey: "news-press4-duplicate:story",
      activityId: onRecord.activityId,
    });
    expect(() =>
      publishPressInterview(published, {
        stableKey: "news-press4-duplicate:second-story",
        activityId: onRecord.activityId,
      }),
    ).toThrow(/already recorded press.story-published/u);
    expect(published.history.publications).toHaveLength(1);
  });

  it("rejects missing knowledge, non-journalist roles, premature prep and changed confirmation wording", () => {
    const fixture = pressFixture("news-press4-controls");
    const start = addSimulationMinutes(fixture.world.currentMoment, 90);
    const end = addSimulationMinutes(start, 30);
    const base = {
      stableKey: "news-press4-controls:interview",
      pitchClaimId: fixture.pitchClaimId,
      reporterPersonId: fixture.reporterPersonId,
      reporterWorkRoleId: fixture.reporterWorkRoleId,
      adviserPersonId: fixture.adviserPersonId,
      jurisdictionId: fixture.jurisdictionId,
      channel: "written" as const,
      terms: "on-record" as const,
      backgroundAttribution: null,
      pitch: "Discuss the proposal already raised at the public briefing.",
      primaryQuestion: "What happened?",
      questionBasisEventIds: [fixture.basisEventId],
      relationshipInteractionIds: [],
      start,
      end,
      location: { locationKey: "press-room", label: "Press room" },
      preparationMinutes: 30,
    };
    expect(() =>
      arrangePressInterview(fixture.world, {
        ...base,
        stableKey: "news-press4-controls:unknown-question",
        questionBasisEventIds: [fixture.world.id],
      }),
    ).toThrow(/future or missing event/u);
    expect(() =>
      arrangePressInterview(fixture.world, {
        ...base,
        stableKey: "news-press4-controls:wrong-role",
        reporterWorkRoleId: fixture.world.history.workRoles[0]!.id,
      }),
    ).toThrow(/current journalism role/u);
    expect(() =>
      arrangePressInterview(fixture.world, {
        ...base,
        stableKey: "news-press4-controls:missing-pitch",
        pitchClaimId: fixture.world.id,
      }),
    ).toThrow(/actual recorded pitch/u);

    const arranged = arrangePressInterview(fixture.world, base);
    expect(() =>
      recordPressPreparation(arranged.world, {
        stableKey: "news-press4-controls:early-prep",
        activityId: arranged.activityId,
        adviserPersonId: fixture.adviserPersonId,
        knownFacts: ["One fact"],
        likelyFollowUps: ["One follow-up"],
        responseOptions: ["One option"],
      }),
    ).toThrow(/not ready for review/u);
    let world = advanceWorldMinutes(arranged.world, 30);
    world = recordPressPreparation(world, {
      stableKey: "news-press4-controls:prep",
      activityId: arranged.activityId,
      adviserPersonId: fixture.adviserPersonId,
      knownFacts: ["One fact"],
      likelyFollowUps: ["One follow-up"],
      responseOptions: ["One option"],
    });
    world = draftPressResponse(world, {
      stableKey: "news-press4-controls:draft",
      activityId: arranged.activityId,
      mode: "interactive",
      intent: "answer-directly",
      followUpQuestion: "One follow-up",
      proposedWording: "Exact consequential wording.",
    });
    expect(() =>
      confirmPressResponse(world, {
        stableKey: "news-press4-controls:changed-confirmation",
        activityId: arranged.activityId,
        confirmedWording: "Different wording.",
      }),
    ).toThrow(/match the displayed draft exactly/u);
    expect(
      world.history.claims.some((claim) =>
        claim.statement.includes("Exact consequential"),
      ),
    ).toBe(false);
  });
});
