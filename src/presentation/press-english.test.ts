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
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { lifePlaceSearch } from "../simulation/life-places";
import { reporterQuestionPacket } from "./press-english";
import { composeReporterQuestion } from "./press-request";

function createReporterQuestionFixture(seed: string) {
  const fixture = createRunCFixture(seed);
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
  return { source, reporter, world, event, knowledge };
}

it("keeps a reporter's fallible belief and actual source across Save/Continue", () => {
  // Authored fixture tests provenance, not a random-place game exchange.
  const { source, reporter, world, event, knowledge } =
    createReporterQuestionFixture("session4-press-provenance");
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
  expect(question.ok && question.statement).toBe(
    `What's your take on what's happening in ${world.jurisdictions[event.jurisdictionId!]!.name}?`,
  );
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

it("uses the recorded place name in reporter questions across all 56 jurisdictions", () => {
  const { source, reporter, world, event } = createReporterQuestionFixture(
    "session49-bg71-all-jurisdictions",
  );
  expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
  for (const usps of CHIEF_EXECUTIVE_JURISDICTIONS) {
    const place = lifePlaceSearch("", 1, {
      scope: "locality",
      stateJurisdictionKey: `US-${usps}`,
    })[0];
    expect(place, `a modeled locality for US-${usps}`).toBeDefined();
    if (!place) throw new Error(`No modeled locality for US-${usps}`);

    const jurisdiction = place.context.jurisdiction;
    expect(jurisdiction.id).toBeTruthy();
    expect(jurisdiction.name).toBe(place.displayName);
    expect(jurisdiction.parentName).toBe(place.withinName);
    expect(jurisdiction.provenance.jurisdiction).toBe(jurisdiction.id);
    const placeWorld = {
      ...world,
      jurisdictions: {
        ...world.jurisdictions,
        [jurisdiction.id]: jurisdiction,
      },
      jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
      history: {
        ...world.history,
        events: world.history.events.map((entry) =>
          entry.id === event.id
            ? { ...entry, jurisdictionId: jurisdiction.id }
            : entry,
        ),
      },
    };
    const packet = reporterQuestionPacket(
      placeWorld,
      source,
      reporter,
      event.id,
    );

    expect(packet?.facts.topic).toEqual({
      text: `what's happening in ${jurisdiction.name}`,
      sourceRecordIds: [event.id, jurisdiction.id],
    });
    expect(
      composeReporterQuestion({
        subjectSummary: packet?.facts.subject?.text ?? "",
        terms: "on-record",
        grounding: packet,
      }),
    ).toEqual({
      ok: true,
      statement: `What's your take on what's happening in ${jurisdiction.name}?`,
    });
  }
});
