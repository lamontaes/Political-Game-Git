import { expect, it } from "vitest";
import { createRunCFixture } from "./run-c-working-document";
import {
  createWorkRelationship,
  recordWorldEvent,
  recordEventKnowledge,
  serializeWorld,
  deserializeWorld,
} from "../simulation";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "../simulation/press-interviews";
import { publishPublicEvent } from "../simulation/public-information";
import { reporterQuestionPacket } from "./press-english";
import { composeReporterQuestion } from "./press-request";

it("keeps a reporter's fallible belief and actual source across Save/Continue", () => {
  // Authored fixture tests provenance, not a random-place game exchange.
  const fixture = createRunCFixture("session4-press-provenance");
  const source = fixture.playerPersonId;
  const reporter = fixture.world.personOrder.find((id) => id !== source)!;
  let world = createWorkRelationship(fixture.world, {
    stableKey: "fixture:reporter",
    personId: reporter,
    organizationId: null,
    startedAt: fixture.world.currentDate,
    kind: "employment:news-reporting",
    compensation: "paid",
    authority: "self-directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "Explicit Session 4 press adapter fixture.",
    },
    initialRole: {
      title: "Reporter",
      occupationClassification: JOURNALISM_OCCUPATION_CLASSIFICATION,
      locationJurisdictionId: fixture.roomContext.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: fixture.roomContext.jurisdictionId,
      },
    },
  });
  world = recordWorldEvent(world, {
    stableKey: "fixture:hearing",
    type: "civic.hearing-held",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: fixture.roomContext.jurisdictionId,
    involvedEntityIds: [source, reporter],
    participants: [
      {
        personId: source,
        role: "agency:speaker",
        detail: "Attended the fixture hearing",
      },
      {
        personId: reporter,
        role: "observation:reporter",
        detail: "Heard the fixture hearing",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture:press"],
    summary: "The hearing ended without a final vote.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.at(-1)!;
  world = recordEventKnowledge(world, {
    stableKey: "fixture:fallible-belief",
    personId: reporter,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: "The bill passed.",
    accuracy: "inaccurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  const knowledge = world.history.knowledge.at(-1)!;
  const before = serializeWorld(world);
  const packet = reporterQuestionPacket(world, source, reporter, event.id)!;
  expect(packet.facts.subject).toEqual({
    text: knowledge.believedSummary,
    sourceRecordIds: [knowledge.id, event.id],
  });
  expect(
    composeReporterQuestion({
      subjectSummary: event.summary,
      terms: "on-record",
      grounding: packet,
    }),
  ).toEqual({ ok: true, statement: "What happened?" });
  const question = composeReporterQuestion({
    subjectSummary: knowledge.believedSummary,
    terms: "on-record",
    grounding: packet,
  });
  expect(question.ok && question.statement).toContain("The bill passed.");
  expect(serializeWorld(world)).toBe(before);
  expect(
    reporterQuestionPacket(
      deserializeWorld(before),
      source,
      reporter,
      event.id,
    ),
  ).toEqual(packet);
});

it("asks a reporter about a published account by its headline, never its byline or who declined", () => {
  // Authored fixture tests the packet, not a random-place game exchange.
  const fixture = createRunCFixture("session4-press-byline");
  const source = fixture.playerPersonId;
  const reporter = fixture.world.personOrder.find((id) => id !== source)!;
  let world = createWorkRelationship(fixture.world, {
    stableKey: "fixture:reporter",
    personId: reporter,
    organizationId: null,
    startedAt: fixture.world.currentDate,
    kind: "employment:news-reporting",
    compensation: "paid",
    authority: "self-directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Explicit press fixture." },
    initialRole: {
      title: "Reporter",
      occupationClassification: JOURNALISM_OCCUPATION_CLASSIFICATION,
      locationJurisdictionId: fixture.roomContext.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: fixture.roomContext.jurisdictionId,
      },
    },
  });
  world = recordWorldEvent(world, {
    stableKey: "fixture:byline-hearing",
    type: "civic.hearing-held",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: fixture.roomContext.jurisdictionId,
    involvedEntityIds: [source, reporter],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture:press"],
    summary: "The hearing ended without a final vote.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.at(-1)!;
  world = publishPublicEvent(world, {
    stableKey: "fixture:byline-report",
    sourceEventId: event.id,
  });
  const published = world.history.publications!.at(-1)!;
  // Give the saved body the lines a press-desk story carries.
  world = {
    ...world,
    history: {
      ...world.history,
      publications: world.history.publications!.map((record) =>
        record.id === published.id
          ? {
              ...record,
              body: `${record.body}\n\nA council aide declined to comment.\n\nReported by Jordan Reyes for The Daily.`,
            }
          : record,
      ),
    },
  };
  const packet = reporterQuestionPacket(world, source, reporter, event.id)!;
  expect(packet.facts.subject?.text).toBe(published.headline);
  expect(packet.facts.subject?.text).not.toMatch(
    /Reported by|declined to comment/,
  );
});
