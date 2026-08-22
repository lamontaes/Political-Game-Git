import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { createLightweightPerson, personName } from "./people";
import { pickDistinct, SeededRng, normalizeSeed } from "./rng";
import {
  recordClaim,
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import type { EntityId, Jurisdiction, World } from "./types";
import {
  advanceWorld,
  createWorld,
  createWorldId,
  materializePerson,
  recordWorldEvent,
} from "./world";

export const DEFAULT_DEMO_SEED = "lexington-foundation";
export const DEMO_START_DATE = makeIsoDate("2026-01-05");
export const LEXINGTON_PLACEHOLDER_ID = createStableId(
  "jurisdiction",
  "definition:us-ky-lexington-fayette-placeholder",
);

const COMMUNITY_TOPICS = [
  "access to neighborhood services",
  "local transportation needs",
  "small-business conditions",
  "workforce training options",
] as const;

function createLexingtonPlaceholder(): Jurisdiction {
  return {
    id: LEXINGTON_PLACEHOLDER_ID,
    slug: "us-ky-lexington-fayette-placeholder",
    name: "Lexington-Fayette, Kentucky",
    kind: "consolidated-city-county-placeholder",
    parentName: "Kentucky",
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: LEXINGTON_PLACEHOLDER_ID,
      status: "placeholder",
    },
  };
}

export function createDemoWorld(seedInput = DEFAULT_DEMO_SEED): World {
  const seed = normalizeSeed(seedInput);
  const worldId = createWorldId(seed);
  const jurisdiction = createLexingtonPlaceholder();
  const people = Array.from({ length: 6 }, (_, index) =>
    createLightweightPerson({
      worldId,
      worldSeed: seed,
      index,
      currentDate: DEMO_START_DATE,
      homeJurisdictionId: jurisdiction.id,
    }),
  );

  let world = createWorld({
    seed,
    currentDate: DEMO_START_DATE,
    jurisdictions: [jurisdiction],
    people,
  });

  world = recordWorldEvent(world, {
    stableKey: "initial:world-created",
    type: "world.created",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [jurisdiction.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.world-created"],
    summary:
      "Seeded demonstration world created with a Lexington-Fayette placeholder.",
    context: {
      location: {
        jurisdictionId: jurisdiction.id,
        label: jurisdiction.name,
        setting: "Synthetic development fixture",
      },
      socialContext:
        "Synthetic foundation data; not a sourced real-world civic snapshot.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  for (const person of people) {
    world = recordWorldEvent(world, {
      stableKey: `initial:lightweight-person:${person.id}`,
      type: "person.lightweight-generated",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: jurisdiction.id,
      involvedEntityIds: [person.id, jurisdiction.id],
      participants: [
        { personId: person.id, role: "subject", detail: "Generated person" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["person.generated", "simulation.fixture"],
      summary: `${personName(person)} entered the active simulation as a lightweight person.`,
      context: {
        location: {
          jurisdictionId: jurisdiction.id,
          label: jurisdiction.name,
          setting: "Synthetic development fixture",
        },
        socialContext: "Synthetic progressive-generation demonstration event.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }

  return world;
}

export function advanceDemoWorld(world: World, days = 7): World {
  const actionSequence = world.actionSequence;
  let advanced = advanceWorld(world, days);
  const jurisdictionId = advanced.jurisdictionOrder[0];

  if (!jurisdictionId || advanced.personOrder.length < 2) {
    return advanced;
  }

  const rng = new SeededRng(world.seed).fork(
    `demo-advance-v1:${actionSequence}:${world.currentDate}:${days}`,
  );
  const participantIds = pickDistinct(rng, advanced.personOrder, 2);
  const firstPersonId = participantIds[0];
  const secondPersonId = participantIds[1];
  const firstPerson = firstPersonId
    ? advanced.people[firstPersonId]
    : undefined;
  const secondPerson = secondPersonId
    ? advanced.people[secondPersonId]
    : undefined;

  if (!firstPerson || !secondPerson) {
    throw new Error(
      "Demo occurrence could not resolve its selected participants.",
    );
  }

  const topic = rng.pick(COMMUNITY_TOPICS);

  advanced = recordWorldEvent(advanced, {
    stableKey: `action:${actionSequence}:community-listening-session:${world.currentDate}:${days}:${advanced.currentDate}:${firstPerson.id}:${secondPerson.id}:${topic}`,
    type: "community.listening-session",
    occurredAt: advanced.currentDate,
    recordedAt: advanced.currentDate,
    jurisdictionId,
    involvedEntityIds: [jurisdictionId, firstPerson.id, secondPerson.id],
    participants: [
      {
        personId: firstPerson.id,
        role: "participant",
        detail: "Attendee",
      },
      {
        personId: secondPerson.id,
        role: "participant",
        detail: "Attendee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["community.listening", "relationship.shared-experience"],
    summary: `${personName(firstPerson)} and ${personName(secondPerson)} attended a listening session about ${topic}.`,
    context: {
      location: {
        jurisdictionId,
        label: "Lexington-Fayette community venue",
        setting: "Public listening session",
      },
      socialContext:
        "Synthetic placeholder occurrence generated to exercise durable history.",
      pressure: null,
      choice: `Both people chose to attend a session about ${topic}.`,
      motivation: "Learn about a local concern.",
      immediateReaction: "Both remained through the session.",
    },
  });

  const listeningEvent = advanced.history.events.at(-1);
  if (!listeningEvent) {
    throw new Error("Demo listening-session event was not recorded.");
  }
  advanced = recordRelationshipInteraction(advanced, {
    stableKey: `action:${actionSequence}:relationship:${firstPerson.id}:${secondPerson.id}`,
    personIds: [firstPerson.id, secondPerson.id],
    eventId: listeningEvent.id,
    occurredAt: listeningEvent.occurredAt,
    kind: "shared-experience",
    change: "formed",
    significance: "minor",
    summary: `${personName(firstPerson)} and ${personName(secondPerson)} met through the listening session.`,
    tags: ["community.listening", "relationship.shared-experience"],
  });
  advanced = recordMemory(advanced, {
    stableKey: `action:${actionSequence}:memory:${firstPerson.id}`,
    personId: firstPerson.id,
    eventId: listeningEvent.id,
    formedAt: listeningEvent.occurredAt,
    rememberedSummary: `A public session about ${topic}.`,
    interpretation: "A modest local encounter worth remembering.",
    strength: "faint",
    relevanceTags: ["community.listening"],
    supersedesMemoryId: null,
  });
  for (const person of [firstPerson, secondPerson]) {
    advanced = recordEventKnowledge(advanced, {
      stableKey: `action:${actionSequence}:knowledge:${person.id}`,
      personId: person.id,
      eventId: listeningEvent.id,
      learnedAt: listeningEvent.occurredAt,
      believedSummary: listeningEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  advanced = recordClaim(advanced, {
    stableKey: `action:${actionSequence}:claim:${firstPerson.id}`,
    speakerPersonId: firstPerson.id,
    eventId: listeningEvent.id,
    madeAt: listeningEvent.occurredAt,
    audience: "limited",
    statement: `The listening session focused on ${topic}.`,
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });

  return advanced;
}

function executeDemoActions(seed: string): World {
  let world = createDemoWorld(seed);
  world = advanceDemoWorld(world, 7);
  world = advanceDemoWorld(world, 14);

  const materializedPersonId = world.personOrder[0];
  if (!materializedPersonId) {
    throw new Error("Demo world did not generate a person to materialize.");
  }

  return materializePerson(world, materializedPersonId);
}

export interface DemoScenarioResult {
  readonly world: World;
  readonly materializedPersonId: EntityId;
  readonly reproducible: boolean;
  readonly snapshotId: EntityId;
}

export function runDemoScenario(
  seedInput = DEFAULT_DEMO_SEED,
): DemoScenarioResult {
  const seed = normalizeSeed(seedInput);
  const world = executeDemoActions(seed);
  const replay = executeDemoActions(seed);
  const materializedPersonId = world.personOrder[0];

  if (!materializedPersonId) {
    throw new Error("Demo world did not generate a person to materialize.");
  }

  const serialized = JSON.stringify(world);

  return {
    world,
    materializedPersonId,
    reproducible: serialized === JSON.stringify(replay),
    snapshotId: createStableId("snapshot", serialized),
  };
}
