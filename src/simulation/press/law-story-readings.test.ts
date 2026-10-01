import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createWorld } from "../world";
import type {
  EntityId,
  HistoricalEvent,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  World,
} from "../types";
import type { StoryLeadRecord, StoryDispositionRecord } from "./records";
import { resolveLawStoryReading } from "./law-story-readings";
import { LAW_EFFECT_EVENT_TYPE } from "./shared";
const OVERSIGHT = "proposition_civilian_oversight" as EntityId;
const date = makeIsoDate("2027-03-01");
const personId = "person_reader" as EntityId;
const placeId = "jurisdiction_fixture" as EntityId;
function event(
  id: string,
  sequence: number,
  type: HistoricalEvent["type"],
  tags: readonly string[] = [],
): HistoricalEvent {
  return {
    id: id as EntityId,
    stableKey: id,
    sequence,
    type,
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: placeId,
    involvedEntityIds: [],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags,
    summary: "Controlled saved story fixture",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  };
}
function ordinance(
  jurisdictionId: EntityId,
  tag: string,
  answer: "yes" | "no",
  effectiveAt: string,
  sequence: number,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${tag}_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${tag}:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `ORD ${sequence}`,
      shortTitle: "Civilian Oversight of Police Ordinance",
      summary: "A test ordinance.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [OVERSIGHT],
      propositionAnswers: [{ propositionId: OVERSIGHT, answer }],
    },
    enactment: {
      id: `enactment_${tag}_${sequence}` as EntityId,
      stableKey: `test:${tag}:${sequence}:enactment`,
      sequence: 1000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-16"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_${tag}_${sequence}` as EntityId,
    },
  };
}

// Controlled boundary records: this proves the join, not natural publication or views.
function fixture(): World {
  const world = createWorld({
    seed: "news-saved-reading",
    currentDate: date,
    jurisdictions: [],
    people: [],
  });
  const law = ordinance(placeId, "story", "yes", "2026-03-01", 1);
  const basis = event("event_basis", 1100, LAW_EFFECT_EVENT_TYPE, [
    "law-effect:outcome:crime.violent",
    `law-effect:measure:${law.measure.id}`,
  ]);
  const story = event("event_story", 1200, "press.story");
  const lead: StoryLeadRecord = {
    id: "lead_fixture" as EntityId,
    stableKey: "lead_fixture",
    sequence: 1150,
    recordedAt: date,
    kind: "story-lead",
    outletId: "outlet_fixture" as EntityId,
    family: "records",
    route: "editor-assignment",
    basisEventIds: [basis.id],
    subjectPersonIds: [],
    jurisdictionId: placeId,
    matterId: null,
    followsPublicationId: null,
    receivedAt: date,
  };
  const disposition: StoryDispositionRecord = {
    id: "disposition_fixture" as EntityId,
    stableKey: "disposition_fixture",
    sequence: 1300,
    recordedAt: date,
    kind: "story-disposition",
    leadId: lead.id,
    decision: "published",
    reporterPersonId: null,
    reasonKey: "fixture:published",
    decidedAt: date,
    decisionTraceId: null,
    eventId: story.id,
    publicationId: "publication_fixture" as EntityId,
    responseDueAt: null,
    contributionIds: [],
  };
  return {
    ...world,
    people: {
      [personId]: {
        id: personId,
        generationKey: "fixture:reader",
        givenName: "Actual",
        familyName: "Reader",
        birthDate: makeIsoDate("1980-01-01"),
        homeJurisdictionId: placeId,
        establishedFacts: [],
        detailLevel: "lightweight",
      },
    },
    history: {
      ...world.history,
      nextSequence: 1500,
      legislativeMeasures: [law.measure],
      legislativeEnactments: [law.enactment],
      events: [basis, story],
      pressRecords: [lead, disposition],
      publications: [
        {
          id: disposition.publicationId!,
          stableKey: "publication_fixture",
          sequence: 1250,
          kind: "press-story",
          sourceEventId: story.id,
          sourceRecordIds: [basis.id],
          jurisdictionId: placeId,
          outletKey: "media:outlet_fixture",
          outletName: "Fixture paper",
          headline: "Saved law story",
          body: "Recorded outcome",
          publishedAt: date,
          recordedAt: date,
          correctsPublicationId: null,
          correctionNote: null,
        },
      ],
      knowledge: [
        {
          id: "knowledge_fixture" as EntityId,
          stableKey: "knowledge_fixture",
          sequence: 1400,
          personId,
          eventId: story.id,
          learnedAt: date,
          believedSummary: "Fixture paper reported the saved story",
          accuracy: "accurate",
          confidence: "high",
          source: {
            kind: "media",
            outlet: "Fixture paper",
            reference: disposition.publicationId!,
          },
        },
      ],
    },
  };
}
const input = {
  knowledgeId: "knowledge_fixture" as EntityId,
  basisEventId: "event_basis" as EntityId,
};
describe("NEWS saved story reading", () => {
  it("resolves actual knowledge and the full saved publication/basis chain without writing", () => {
    const world = fixture();
    const before = JSON.stringify(world);
    expect(resolveLawStoryReading(world, input)).toEqual({
      knowledgeId: input.knowledgeId,
      personId,
      measureId: world.history.legislativeMeasures![0]!.id,
      publicationId: "publication_fixture",
      storyEventId: "event_story",
      leadId: "lead_fixture",
      dispositionId: "disposition_fixture",
      basisEventId: input.basisEventId,
      learnedAt: date,
    });
    expect(resolveLawStoryReading(world, input)).toEqual(
      resolveLawStoryReading(world, input),
    );
    expect(resolveLawStoryReading(JSON.parse(before) as World, input)).toEqual(
      resolveLawStoryReading(world, input),
    );
    expect(JSON.stringify(world)).toBe(before);
  });
  it("does not treat a publication or residence as learned knowledge", () => {
    const w = fixture();
    expect(
      resolveLawStoryReading(
        { ...w, history: { ...w.history, knowledge: [] } },
        input,
      ),
    ).toBeNull();
  });
  it("does not accept word of mouth as a story reading", () => {
    const w = fixture();
    expect(
      resolveLawStoryReading(
        {
          ...w,
          history: {
            ...w.history,
            knowledge: w.history.knowledge.map((k) => ({
              ...k,
              source: {
                kind: "told-by" as const,
                sourcePersonId: personId,
                claimId: null,
              },
            })),
          },
        },
        input,
      ),
    ).toBeNull();
  });
  it("requires knowledge of this publication's story", () => {
    const w = fixture();
    expect(
      resolveLawStoryReading(
        {
          ...w,
          history: {
            ...w.history,
            knowledge: w.history.knowledge.map((k) => ({
              ...k,
              eventId: input.basisEventId,
            })),
          },
        },
        input,
      ),
    ).toBeNull();
  });
  it("requires a published disposition and its exact basis lead", () => {
    const w = fixture();
    for (const records of [
      [],
      w.history.pressRecords!.filter((r) => r.kind !== "story-disposition"),
      w.history.pressRecords!.map((r) =>
        r.kind === "story-lead" ? { ...r, basisEventIds: [] } : r,
      ),
    ])
      expect(
        resolveLawStoryReading(
          { ...w, history: { ...w.history, pressRecords: records } },
          input,
        ),
      ).toBeNull();
  });
  it("rejects future knowledge and evidence saved after it", () => {
    const w = fixture();
    for (const k of [
      { ...w.history.knowledge[0]!, learnedAt: makeIsoDate("2027-03-02") },
      { ...w.history.knowledge[0]!, sequence: 1249 },
    ])
      expect(
        resolveLawStoryReading(
          { ...w, history: { ...w.history, knowledge: [k] } },
          input,
        ),
      ).toBeNull();
  });
  it("requires unambiguous law attribution and actual enactment", () => {
    const w = fixture();
    expect(
      resolveLawStoryReading(
        { ...w, history: { ...w.history, legislativeEnactments: [] } },
        input,
      ),
    ).toBeNull();
    expect(
      resolveLawStoryReading(
        {
          ...w,
          history: {
            ...w.history,
            events: w.history.events.map((e) =>
              e.id === input.basisEventId
                ? { ...e, tags: [...e.tags, "law-effect:measure:other"] }
                : e,
            ),
          },
        },
        input,
      ),
    ).toBeNull();
  });
  it("never derives sustained attention from followsPublicationId", () => {
    const w = fixture();
    const changed = {
      ...w,
      history: {
        ...w.history,
        pressRecords: w.history.pressRecords!.map((r) =>
          r.kind === "story-lead"
            ? { ...r, followsPublicationId: "prior_publication" as EntityId }
            : r,
        ),
      },
    };
    expect(resolveLawStoryReading(changed, input)).toEqual(
      resolveLawStoryReading(w, input),
    );
  });
});
