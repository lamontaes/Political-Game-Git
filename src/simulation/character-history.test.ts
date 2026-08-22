import { describe, expect, it } from "vitest";

import {
  LEXINGTON_PLACEHOLDER_ID,
  advanceWorld,
  appendPersonFact,
  claimsForEvent,
  createDemoWorld,
  createStableId,
  createWorld,
  dateAtAge,
  deserializeWorld,
  didPeoplePreviouslyWorkTogether,
  factsForPerson,
  hasCloseRelationshipWithPersonAffectedByEvent,
  hasExperiencedTaggedEvent,
  hasExperiencedTaggedEventBeforeAge,
  hasLivedInJurisdiction,
  knowledgeForEvent,
  materializePerson,
  memoriesForPerson,
  queryEvents,
  recordClaim,
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
  recordWorldEvent,
  relationshipHistory,
  serializeWorld,
} from "./index";
import type {
  EntityId,
  EventContext,
  IsoDate,
  Jurisdiction,
  Person,
  World,
} from "./types";

const MICHIGAN_ID = createStableId(
  "jurisdiction",
  "definition:us-mi-test-placeholder",
);

interface FoundationFixture {
  readonly world: World;
  readonly personIds: readonly [EntityId, EntityId, EntityId];
}

function createFoundationFixture(): FoundationFixture {
  const seed = "character-history-foundation";
  const demo = createDemoWorld(seed);
  const lexington = demo.jurisdictions[LEXINGTON_PLACEHOLDER_ID];
  if (!lexington) {
    throw new Error("Missing Lexington fixture.");
  }
  const michigan: Jurisdiction = {
    id: MICHIGAN_ID,
    slug: "us-mi-test-placeholder",
    name: "Michigan test placeholder",
    kind: "state-placeholder",
    parentName: "United States",
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: MICHIGAN_ID,
      status: "placeholder",
    },
  };
  const personIds = demo.personOrder.slice(0, 3) as unknown as readonly [
    EntityId,
    EntityId,
    EntityId,
  ];
  const people = personIds.map((id) => demo.people[id] as Person);
  return {
    world: createWorld({
      seed,
      currentDate: demo.currentDate,
      jurisdictions: [lexington, michigan],
      people,
    }),
    personIds,
  };
}

function eventContext(overrides: Partial<EventContext> = {}): EventContext {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
    ...overrides,
  };
}

function later(left: IsoDate, right: IsoDate): IsoDate {
  return left > right ? left : right;
}

function recordTeenEvent(
  world: World,
  personId: EntityId,
  witnessId: EntityId,
) {
  const person = world.people[personId] as Person;
  const occurredAt = dateAtAge(person.birthDate, 17);
  return recordWorldEvent(world, {
    stableKey: `life:teen-choice:${personId}`,
    type: "personal.substance-use",
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: MICHIGAN_ID,
    involvedEntityIds: [personId, witnessId, MICHIGAN_ID],
    participants: [
      { personId, role: "actor", detail: "Made the choice" },
      {
        personId: witnessId,
        role: "witness",
        detail: "Present at the gathering",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["personal.choice", "substance.marijuana", "substance.use"],
    summary: "At 17, the person tried marijuana once at a small gathering.",
    context: eventContext({
      location: {
        jurisdictionId: MICHIGAN_ID,
        label: "A friend's home in Michigan",
        setting: "Small private gathering",
      },
      socialContext: "Several older friends were participating.",
      pressure: "The person wanted to avoid appearing timid.",
      choice: "Accepted and tried it once.",
      motivation: "Curiosity mixed with a desire to fit in.",
      immediateReaction: "Felt uncomfortable and left early.",
    }),
  });
}

function buildRichHistory(): {
  readonly world: World;
  readonly teenEventId: EntityId;
  readonly adultEventId: EntityId;
  readonly unemploymentEventId: EntityId;
  readonly contradictoryClaimId: EntityId;
  readonly personIds: readonly [EntityId, EntityId, EntityId];
} {
  const fixture = createFoundationFixture();
  const [firstId, secondId, thirdId] = fixture.personIds;
  const first = fixture.world.people[firstId] as Person;
  const second = fixture.world.people[secondId] as Person;
  let world = appendPersonFact(fixture.world, firstId, {
    stableKey: "residence:michigan-childhood",
    kind: "residence",
    occurredAt: dateAtAge(first.birthDate, 10),
    endedAt: dateAtAge(first.birthDate, 13),
    jurisdictionId: MICHIGAN_ID,
    summary: "The person lived in Michigan during childhood.",
    provenance: {
      method: "manual",
      sourceEventId: null,
      note: "Test fixture.",
    },
  });
  world = appendPersonFact(world, firstId, {
    stableKey: `family:sibling:${thirdId}`,
    kind: "family-relationship",
    occurredAt: world.currentDate,
    endedAt: null,
    jurisdictionId: null,
    relatedPersonId: thirdId,
    relationship: "sibling",
    summary: "The people are siblings.",
    provenance: {
      method: "manual",
      sourceEventId: null,
      note: "Test fixture.",
    },
  });

  world = recordTeenEvent(world, firstId, thirdId);
  const teenEvent = world.history.events.at(-1);
  if (!teenEvent) throw new Error("Missing teen event.");

  const adultDate = dateAtAge(first.birthDate, 23);
  world = recordWorldEvent(world, {
    stableKey: `life:adult-choice:${firstId}`,
    type: "personal.substance-use",
    occurredAt: adultDate,
    recordedAt: world.currentDate,
    jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
    involvedEntityIds: [firstId, LEXINGTON_PLACEHOLDER_ID],
    participants: [{ personId: firstId, role: "subject", detail: "Patient" }],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["health.treatment", "substance.use"],
    summary: "At 23, the person took prescribed pain medication after surgery.",
    context: eventContext({
      location: {
        jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
        label: "Outpatient clinic",
        setting: "Post-operative recovery",
      },
      socialContext: "Medication was prescribed by a clinician.",
      pressure: null,
      choice: "Followed the written dosage instructions.",
      motivation: "Manage acute pain after surgery.",
      immediateReaction: "Pain decreased without a social response.",
    }),
  });
  const adultEvent = world.history.events.at(-1);
  if (!adultEvent) throw new Error("Missing adult event.");

  world = recordMemory(world, {
    stableKey: `memory:teen-initial:${firstId}`,
    personId: firstId,
    eventId: teenEvent.id,
    formedAt: teenEvent.occurredAt,
    rememberedSummary: "I tried it once because the group expected me to.",
    interpretation: "An embarrassing mistake.",
    strength: "moderate",
    relevanceTags: ["identity.private", "social-pressure"],
    supersedesMemoryId: null,
  });
  const initialMemory = world.history.memories.at(-1);
  if (!initialMemory) throw new Error("Missing initial memory.");
  world = recordMemory(world, {
    stableKey: `memory:teen-later:${firstId}`,
    personId: firstId,
    eventId: teenEvent.id,
    formedAt: world.currentDate,
    rememberedSummary: "I made a poor choice while trying to fit in.",
    interpretation: "A lesson about resisting social pressure.",
    strength: "strong",
    relevanceTags: ["identity.private", "lesson"],
    supersedesMemoryId: initialMemory.id,
  });
  world = recordMemory(world, {
    stableKey: `memory:teen-witness:${thirdId}`,
    personId: thirdId,
    eventId: teenEvent.id,
    formedAt: teenEvent.occurredAt,
    rememberedSummary: "I vaguely remember the gathering.",
    interpretation: "A minor teenage incident.",
    strength: "faint",
    relevanceTags: ["acquaintance-history"],
    supersedesMemoryId: null,
  });
  world = recordEventKnowledge(world, {
    stableKey: `knowledge:teen-direct:${firstId}`,
    personId: firstId,
    eventId: teenEvent.id,
    learnedAt: teenEvent.occurredAt,
    believedSummary: teenEvent.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  world = recordClaim(world, {
    stableKey: `claim:teen-denial:${firstId}`,
    speakerPersonId: firstId,
    eventId: teenEvent.id,
    madeAt: world.currentDate,
    audience: "public",
    statement: "I never used marijuana as a teenager.",
    relationshipToTruth: "contradicts",
    provenance: { kind: "direct-record" },
  });
  const claim = world.history.claims.at(-1);
  if (!claim) throw new Error("Missing contradictory claim.");
  world = recordEventKnowledge(world, {
    stableKey: `knowledge:teen-secondhand:${secondId}`,
    personId: secondId,
    eventId: teenEvent.id,
    learnedAt: world.currentDate,
    believedSummary: "The person never used marijuana as a teenager.",
    accuracy: "inaccurate",
    confidence: "medium",
    source: { kind: "told-by", sourcePersonId: firstId, claimId: claim.id },
  });

  const workDate = later(
    dateAtAge(first.birthDate, 21),
    dateAtAge(second.birthDate, 21),
  );
  world = recordWorldEvent(world, {
    stableKey: `work:shared-project:${firstId}:${secondId}`,
    type: "career.shared-project",
    occurredAt: workDate,
    recordedAt: world.currentDate,
    jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
    involvedEntityIds: [firstId, secondId, LEXINGTON_PLACEHOLDER_ID],
    participants: [
      { personId: firstId, role: "participant", detail: "Coworker" },
      { personId: secondId, role: "participant", detail: "Coworker" },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["career.work", "relationship.shared-work"],
    summary: "The two people worked on the same project.",
    context: eventContext({
      socialContext: "A temporary workplace project team.",
    }),
  });
  const workEvent = world.history.events.at(-1);
  if (!workEvent) throw new Error("Missing shared-work event.");
  world = recordRelationshipInteraction(world, {
    stableKey: `relationship:shared-work:${firstId}:${secondId}`,
    personIds: [firstId, secondId],
    eventId: workEvent.id,
    occurredAt: workEvent.occurredAt,
    kind: "shared-work",
    change: "formed",
    significance: "meaningful",
    summary: "Working together established mutual trust.",
    tags: ["relationship.shared-work"],
  });

  const unemploymentDate = later(
    dateAtAge(first.birthDate, 22),
    dateAtAge(second.birthDate, 22),
  );
  world = recordWorldEvent(world, {
    stableKey: `career:unemployment:${secondId}`,
    type: "career.unemployment-began",
    occurredAt: unemploymentDate,
    recordedAt: world.currentDate,
    jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
    involvedEntityIds: [firstId, secondId, LEXINGTON_PLACEHOLDER_ID],
    participants: [
      { personId: secondId, role: "affected", detail: "Lost employment" },
      { personId: firstId, role: "witness", detail: "Close supporter" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["employment.unemployment", "life.financial-stress"],
    summary: "One person experienced a period of unemployment.",
    context: eventContext({
      socialContext: "A workplace closure eliminated the position.",
      immediateReaction: "The other person offered practical support.",
    }),
  });
  const unemploymentEvent = world.history.events.at(-1);
  if (!unemploymentEvent) throw new Error("Missing unemployment event.");
  world = recordRelationshipInteraction(world, {
    stableKey: `relationship:unemployment-support:${firstId}:${secondId}`,
    personIds: [firstId, secondId],
    eventId: unemploymentEvent.id,
    occurredAt: unemploymentEvent.occurredAt,
    kind: "support",
    change: "strengthened",
    significance: "meaningful",
    summary:
      "Practical support during unemployment strengthened the relationship.",
    tags: ["relationship.support", "employment.unemployment"],
  });

  return {
    world,
    teenEventId: teenEvent.id,
    adultEventId: adultEvent.id,
    unemploymentEventId: unemploymentEvent.id,
    contradictoryClaimId: claim.id,
    personIds: fixture.personIds,
  };
}

describe("persistent character and history foundation", () => {
  it("keeps immutable biography facts structured and materializes without losing them", () => {
    const built = buildRichHistory();
    const [firstId, , thirdId] = built.personIds;
    const before = built.world.people[firstId] as Person;
    expect(hasLivedInJurisdiction(built.world, firstId, MICHIGAN_ID)).toBe(
      true,
    );
    expect(
      factsForPerson(before).some(
        (fact) =>
          fact.kind === "family-relationship" &&
          fact.relatedPersonId === thirdId &&
          fact.relationship === "sibling",
      ),
    ).toBe(true);

    const expanded = materializePerson(built.world, firstId);
    const after = expanded.people[firstId];
    expect(after?.establishedFacts).toStrictEqual(before.establishedFacts);
    if (after?.detailLevel !== "materialized") {
      throw new Error("Expected materialized biography.");
    }
    const education = after.details.generatedFacts.find(
      (fact) => fact.kind === "education",
    );
    const occupation = after.details.generatedFacts.find(
      (fact) => fact.kind === "occupation",
    );
    expect(education).toMatchObject({ status: "completed" });
    expect(occupation).toMatchObject({ status: "ongoing" });
  });

  it("retains materially different contexts for events in one broad category", () => {
    const built = buildRichHistory();
    const events = queryEvents(built.world, { tagsAll: ["substance.use"] });
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe(events[1]?.type);
    expect(events[0]?.context.pressure).toContain("avoid appearing timid");
    expect(events[1]?.context.pressure).toBeNull();
    expect(events[0]?.context.location?.setting).toBe(
      "Small private gathering",
    );
    expect(events[1]?.context.location?.setting).toBe(
      "Post-operative recovery",
    );
  });

  it("allows a later statement to contradict truth without changing the event", () => {
    const built = buildRichHistory();
    const original = built.world.history.events.find(
      (event) => event.id === built.teenEventId,
    );
    const claim = claimsForEvent(built.world, built.teenEventId)[0];
    expect(original?.context.choice).toBe("Accepted and tried it once.");
    expect(claim).toMatchObject({
      id: built.contradictoryClaimId,
      relationshipToTruth: "contradicts",
      statement: "I never used marijuana as a teenager.",
    });
    expect(
      built.world.history.events.find(
        (event) => event.id === built.teenEventId,
      ),
    ).toStrictEqual(original);
  });

  it("lets another character know only an inaccurate secondhand version", () => {
    const built = buildRichHistory();
    const [, secondId] = built.personIds;
    const known = knowledgeForEvent(built.world, built.teenEventId).filter(
      (knowledge) => knowledge.personId === secondId,
    );
    expect(known).toHaveLength(1);
    expect(known[0]).toMatchObject({
      accuracy: "inaccurate",
      believedSummary: "The person never used marijuana as a teenager.",
      source: {
        kind: "told-by",
        claimId: built.contradictoryClaimId,
      },
    });
  });

  it("keeps subjective memories separate, including later reinterpretation", () => {
    const built = buildRichHistory();
    const [firstId, , thirdId] = built.personIds;
    const firstMemories = memoriesForPerson(built.world, firstId).filter(
      (memory) => memory.eventId === built.teenEventId,
    );
    const witnessMemory = memoriesForPerson(built.world, thirdId).find(
      (memory) => memory.eventId === built.teenEventId,
    );
    expect(firstMemories).toHaveLength(2);
    expect(firstMemories[1]?.supersedesMemoryId).toBe(firstMemories[0]?.id);
    expect(firstMemories[0]?.interpretation).toBe("An embarrassing mistake.");
    expect(firstMemories[1]?.interpretation).toContain(
      "resisting social pressure",
    );
    expect(witnessMemory?.strength).toBe("faint");
  });

  it("answers later-system biography, experience, relationship, and work queries", () => {
    const built = buildRichHistory();
    const [firstId, secondId] = built.personIds;
    expect(hasLivedInJurisdiction(built.world, firstId, MICHIGAN_ID)).toBe(
      true,
    );
    expect(
      hasExperiencedTaggedEventBeforeAge(
        built.world,
        firstId,
        "substance.marijuana",
        21,
      ),
    ).toBe(true);
    expect(
      hasExperiencedTaggedEvent(
        built.world,
        secondId,
        "employment.unemployment",
      ),
    ).toBe(true);
    expect(
      hasCloseRelationshipWithPersonAffectedByEvent(
        built.world,
        firstId,
        built.unemploymentEventId,
      ),
    ).toBe(true);
    expect(
      didPeoplePreviouslyWorkTogether(built.world, firstId, secondId),
    ).toBe(true);
    expect(relationshipHistory(built.world, firstId, secondId)).toHaveLength(2);
  });

  it("keeps a minor teenage event queryable after four simulated decades", () => {
    const built = buildRichHistory();
    const [firstId] = built.personIds;
    const original = structuredClone(
      built.world.history.events.find(
        (event) => event.id === built.teenEventId,
      ),
    );
    const decadesLater = advanceWorld(built.world, 365 * 40);
    expect(decadesLater.currentDate.slice(0, 4)).toBe("2065");
    expect(
      hasExperiencedTaggedEventBeforeAge(
        decadesLater,
        firstId,
        "substance.marijuana",
        21,
      ),
    ).toBe(true);
    expect(
      decadesLater.history.events.find(
        (event) => event.id === built.teenEventId,
      ),
    ).toStrictEqual(original);
  });

  it("round-trips the complete graph through versioned serialization", () => {
    const built = buildRichHistory();
    const payload = serializeWorld(built.world);
    const restored = deserializeWorld(payload);
    expect(restored).toStrictEqual(built.world);
    expect(serializeWorld(restored)).toBe(payload);
  });

  it("rejects snapshot tampering and unsupported versions", () => {
    const built = buildRichHistory();
    const parsed = JSON.parse(serializeWorld(built.world)) as Record<
      string,
      unknown
    >;
    parsed.formatVersion = 999;
    expect(() => deserializeWorld(JSON.stringify(parsed))).toThrow(
      /unsupported/i,
    );

    const tampered = JSON.parse(serializeWorld(built.world)) as {
      snapshotId: string;
    };
    tampered.snapshotId = "snapshot_tampered";
    expect(() => deserializeWorld(JSON.stringify(tampered))).toThrow(
      /metadata/i,
    );
  });
});
