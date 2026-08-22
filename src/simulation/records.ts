import { makeIsoDate } from "./dates";
import {
  appendClaimRecord,
  appendEventKnowledgeRecord,
  appendMemoryRecord,
  appendRelationshipInteraction,
} from "./history";
import type {
  ClaimRecordInput,
  EventKnowledgeRecordInput,
  MemoryRecordInput,
  RelationshipInteractionInput,
} from "./history";
import { createStableId } from "./ids";
import { assertWorldIntegrity } from "./world";
import type { EntityId, HistoricalEvent, PersonFact, World } from "./types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type PersonFactInput = DistributiveOmit<PersonFact, "id">;

const MEMORY_STRENGTHS = ["faint", "moderate", "strong", "defining"] as const;
const KNOWLEDGE_ACCURACIES = [
  "accurate",
  "partial",
  "inaccurate",
  "unknown",
] as const;
const KNOWLEDGE_CONFIDENCES = ["low", "medium", "high"] as const;
const CLAIM_AUDIENCES = ["private", "limited", "public"] as const;
const CLAIM_TRUTH_RELATIONS = [
  "consistent",
  "contradicts",
  "reframes",
  "unknown",
] as const;
const RELATIONSHIP_KINDS = [
  "introduction",
  "shared-work",
  "shared-experience",
  "support",
  "favor",
  "conflict",
  "betrayal",
  "commitment",
  "other",
] as const;
const RELATIONSHIP_CHANGES = [
  "formed",
  "strengthened",
  "maintained",
  "strained",
  "ended",
] as const;
const RELATIONSHIP_SIGNIFICANCES = ["minor", "meaningful", "major"] as const;

export function appendPersonFact(
  world: World,
  personId: EntityId,
  input: PersonFactInput,
): World {
  const person = requirePerson(world, personId);
  assertNonEmpty(input.stableKey, "Person fact stable key");
  assertNonEmpty(input.summary, "Person fact summary");
  assertDateInWorld(world, input.occurredAt, "Person fact date");
  if (
    person.establishedFacts.some(
      (fact) => fact.stableKey === input.stableKey,
    ) ||
    (person.detailLevel === "materialized" &&
      person.details.generatedFacts.some(
        (fact) => fact.stableKey === input.stableKey,
      ))
  ) {
    throw new Error(
      `Person fact stable key already exists: ${input.stableKey}`,
    );
  }
  if (
    input.provenance.sourceEventId !== null &&
    !eventById(world, input.provenance.sourceEventId)
  ) {
    throw new Error(
      `Person fact provenance references a missing event: ${input.provenance.sourceEventId}`,
    );
  }

  const fact = {
    ...input,
    id: createStableId("fact", `${personId}:${input.stableKey}`),
    provenance: { ...input.provenance },
    ...(input.kind === "education" || input.kind === "occupation"
      ? { subjectIds: [...input.subjectIds] }
      : {}),
  } as PersonFact;

  const nextWorld: World = {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        establishedFacts: [...person.establishedFacts, fact],
      },
    },
  };
  assertWorldIntegrity(nextWorld);
  return nextWorld;
}

export function recordMemory(world: World, input: MemoryRecordInput): World {
  const person = requirePerson(world, input.personId);
  const event = requireEvent(world, input.eventId);
  assertDateRange(world, event, input.formedAt, "Memory formation date");
  if (input.formedAt < person.birthDate) {
    throw new Error("Memory formation cannot predate the person.");
  }
  const hasEventAccess =
    event.involvedEntityIds.includes(input.personId) ||
    world.history.knowledge.some(
      (knowledge) =>
        knowledge.personId === input.personId &&
        knowledge.eventId === input.eventId &&
        knowledge.learnedAt <= input.formedAt,
    );
  if (!hasEventAccess) {
    throw new Error(
      "A memory requires direct event involvement or prior event knowledge.",
    );
  }
  assertNonEmpty(input.rememberedSummary, "Remembered summary");
  assertNonEmpty(input.interpretation, "Memory interpretation");
  assertTags(input.relevanceTags, "Memory relevance");
  if (!MEMORY_STRENGTHS.includes(input.strength)) {
    throw new Error(`Invalid memory strength: ${String(input.strength)}`);
  }
  if (input.supersedesMemoryId !== null) {
    const prior = world.history.memories.find(
      (memory) => memory.id === input.supersedesMemoryId,
    );
    if (
      !prior ||
      prior.personId !== input.personId ||
      prior.eventId !== input.eventId ||
      prior.formedAt > input.formedAt
    ) {
      throw new Error(
        "A memory may only supersede an earlier-dated memory by the same person about the same event.",
      );
    }
  }
  return {
    ...world,
    history: appendMemoryRecord(world.history, world.id, input),
  };
}

export function recordEventKnowledge(
  world: World,
  input: EventKnowledgeRecordInput,
): World {
  const person = requirePerson(world, input.personId);
  const event = requireEvent(world, input.eventId);
  assertDateRange(world, event, input.learnedAt, "Knowledge date");
  if (input.learnedAt < person.birthDate) {
    throw new Error("Event knowledge cannot predate the person.");
  }
  assertNonEmpty(input.believedSummary, "Believed summary");
  if (!KNOWLEDGE_ACCURACIES.includes(input.accuracy)) {
    throw new Error(`Invalid knowledge accuracy: ${String(input.accuracy)}`);
  }
  if (!KNOWLEDGE_CONFIDENCES.includes(input.confidence)) {
    throw new Error(
      `Invalid knowledge confidence: ${String(input.confidence)}`,
    );
  }
  validateKnowledgeSource(world, event, input);
  return {
    ...world,
    history: appendEventKnowledgeRecord(world.history, world.id, input),
  };
}

export function recordClaim(world: World, input: ClaimRecordInput): World {
  const speaker = requirePerson(world, input.speakerPersonId);
  const event = requireEvent(world, input.eventId);
  assertDateRange(world, event, input.madeAt, "Claim date");
  if (input.madeAt < speaker.birthDate) {
    throw new Error("A claim cannot predate its speaker.");
  }
  assertNonEmpty(input.statement, "Claim statement");
  if (!CLAIM_AUDIENCES.includes(input.audience)) {
    throw new Error(`Invalid claim audience: ${String(input.audience)}`);
  }
  if (!CLAIM_TRUTH_RELATIONS.includes(input.relationshipToTruth)) {
    throw new Error(
      `Invalid claim truth relationship: ${String(input.relationshipToTruth)}`,
    );
  }
  switch (input.provenance.kind) {
    case "direct-record":
      break;
    case "reported-by":
      if (input.provenance.reporterPersonId === input.speakerPersonId) {
        throw new Error(
          "A reported-by claim requires another person as reporter.",
        );
      }
      if (
        requirePerson(world, input.provenance.reporterPersonId).birthDate >
        input.madeAt
      ) {
        throw new Error("A claim reporter must be born by the claim date.");
      }
      break;
    case "public-record":
      assertNonEmpty(
        input.provenance.reference,
        "Claim public-record reference",
      );
      break;
    case "media-record":
      assertNonEmpty(input.provenance.outlet, "Claim media outlet");
      assertOptional(input.provenance.reference, "Claim media reference");
      break;
    default:
      throw new Error(
        `Invalid claim provenance kind: ${runtimeKind(input.provenance)}`,
      );
  }
  return {
    ...world,
    history: appendClaimRecord(world.history, world.id, input),
  };
}

export function recordRelationshipInteraction(
  world: World,
  input: RelationshipInteractionInput,
): World {
  const [firstId, secondId] = input.personIds;
  const firstPerson = requirePerson(world, firstId);
  const secondPerson = requirePerson(world, secondId);
  if (firstId === secondId) {
    throw new Error(
      "A relationship interaction requires two different people.",
    );
  }
  const occurredAt = assertDateInWorld(
    world,
    input.occurredAt,
    "Relationship interaction date",
  );
  if (
    occurredAt < firstPerson.birthDate ||
    occurredAt < secondPerson.birthDate
  ) {
    throw new Error("A relationship interaction cannot predate either person.");
  }
  if (input.eventId !== null) {
    const event = requireEvent(world, input.eventId);
    if (
      !event.involvedEntityIds.includes(firstId) ||
      !event.involvedEntityIds.includes(secondId)
    ) {
      throw new Error(
        "A relationship interaction event must involve both people.",
      );
    }
    if (event.occurredAt !== occurredAt) {
      throw new Error(
        "A relationship interaction must share its source event date.",
      );
    }
  }
  if (!RELATIONSHIP_KINDS.includes(input.kind)) {
    throw new Error(
      `Invalid relationship interaction kind: ${String(input.kind)}`,
    );
  }
  if (!RELATIONSHIP_CHANGES.includes(input.change)) {
    throw new Error(`Invalid relationship change: ${String(input.change)}`);
  }
  if (!RELATIONSHIP_SIGNIFICANCES.includes(input.significance)) {
    throw new Error(
      `Invalid relationship significance: ${String(input.significance)}`,
    );
  }
  assertNonEmpty(input.summary, "Relationship interaction summary");
  assertTags(input.tags, "Relationship interaction");
  return {
    ...world,
    history: appendRelationshipInteraction(world.history, world.id, input),
  };
}

function validateKnowledgeSource(
  world: World,
  event: HistoricalEvent,
  input: EventKnowledgeRecordInput,
): void {
  const source = input.source;
  switch (source.kind) {
    case "direct":
      if (!event.involvedEntityIds.includes(input.personId)) {
        throw new Error(
          "Direct event knowledge requires presence in the event record.",
        );
      }
      break;
    case "told-by": {
      const sourcePerson = requirePerson(world, source.sourcePersonId);
      if (source.sourcePersonId === input.personId) {
        throw new Error("Told-by knowledge requires another person as source.");
      }
      if (sourcePerson.birthDate > input.learnedAt) {
        throw new Error("A knowledge source must be born before telling it.");
      }
      if (source.claimId !== null) {
        const claim = world.history.claims.find(
          (candidate) => candidate.id === source.claimId,
        );
        if (
          !claim ||
          claim.speakerPersonId !== source.sourcePersonId ||
          claim.eventId !== input.eventId ||
          claim.madeAt > input.learnedAt
        ) {
          throw new Error(
            "Told-by knowledge references an incompatible claim.",
          );
        }
      }
      break;
    }
    case "public-record":
      assertNonEmpty(source.reference, "Knowledge public-record reference");
      break;
    case "media":
      assertNonEmpty(source.outlet, "Knowledge media outlet");
      assertOptional(source.reference, "Knowledge media reference");
      break;
    case "rumor":
      if (source.sourcePersonId !== null) {
        const sourcePerson = requirePerson(world, source.sourcePersonId);
        if (sourcePerson.birthDate > input.learnedAt) {
          throw new Error("A rumor source must be born before the rumor.");
        }
      }
      assertOptional(source.chainDescription, "Rumor chain description");
      break;
    default:
      throw new Error(`Invalid knowledge source kind: ${runtimeKind(source)}`);
  }
}

function runtimeKind(value: never): string {
  return String((value as { readonly kind?: unknown }).kind);
}

function requirePerson(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) {
    throw new Error(`Missing person: ${personId}`);
  }
  return person;
}

function eventById(world: World, eventId: EntityId) {
  return world.history.events.find((event) => event.id === eventId);
}

function requireEvent(world: World, eventId: EntityId): HistoricalEvent {
  const event = eventById(world, eventId);
  if (!event) {
    throw new Error(`Missing historical event: ${eventId}`);
  }
  return event;
}

function assertDateInWorld(world: World, value: string, label: string) {
  const date = makeIsoDate(value);
  if (date > world.currentDate) {
    throw new Error(`${label} cannot be after the current world date.`);
  }
  return date;
}

function assertDateRange(
  world: World,
  event: HistoricalEvent,
  value: string,
  label: string,
): void {
  const date = assertDateInWorld(world, value, label);
  if (date < event.occurredAt) {
    throw new Error(`${label} cannot predate the event.`);
  }
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertOptional(value: string | null, label: string): void {
  if (value !== null) {
    assertNonEmpty(value, label);
  }
}

function assertTags(tags: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const tag of tags) {
    assertNonEmpty(tag, `${label} tag`);
    if (seen.has(tag)) {
      throw new Error(`${label} contains a duplicate tag: ${tag}`);
    }
    seen.add(tag);
  }
}
