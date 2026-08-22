import { addDays, makeIsoDate } from "./dates";
import {
  appendHistoricalEvent,
  createHistoryStore,
  eventsInvolving,
} from "./history";
import type { HistoricalEventInput } from "./history";
import { createStableId } from "./ids";
import { materializePersonRecord, personName } from "./people";
import { normalizeSeed } from "./rng";
import type {
  EntityId,
  EventContext,
  HistoricalEvent,
  IsoDate,
  Jurisdiction,
  Person,
  PersonFact,
  PersonFactKind,
  World,
} from "./types";

const PERSON_FACT_KINDS: readonly PersonFactKind[] = [
  "birth-date",
  "birthplace",
  "residence",
  "family-relationship",
  "education",
  "occupation",
];
const DATA_STATUSES = [
  "placeholder",
  "candidate",
  "approved",
  "superseded",
] as const;
const EVENT_VISIBILITIES = ["private", "limited", "public"] as const;
const EVENT_PARTICIPANT_ROLES = [
  "actor",
  "participant",
  "subject",
  "affected",
  "witness",
] as const;
const FACT_PROVENANCE_METHODS = [
  "procedural-placeholder",
  "simulated-event",
  "manual",
] as const;
const FAMILY_RELATIONSHIP_KINDS = [
  "parent",
  "child",
  "sibling",
  "spouse",
  "partner",
  "guardian",
  "ward",
  "other",
] as const;
const EDUCATION_STATUSES = [
  "attended",
  "completed",
  "ongoing",
  "withdrew",
] as const;
const OCCUPATION_STATUSES = ["ended", "ongoing"] as const;

export interface CreateWorldInput {
  readonly seed: string;
  readonly currentDate: IsoDate;
  readonly jurisdictions: readonly Jurisdiction[];
  readonly people: readonly Person[];
}

function recordById<T extends { readonly id: EntityId }>(
  entities: readonly T[],
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const entity of entities) {
    if (result[entity.id]) {
      throw new Error(`Duplicate entity ID: ${entity.id}`);
    }
    result[entity.id] = entity;
  }

  return result;
}

export function createWorldId(seed: string): EntityId {
  return createStableId("world", `demo-world-v2:${normalizeSeed(seed)}`);
}

export function createWorld(input: CreateWorldInput): World {
  const seed = normalizeSeed(input.seed);
  const currentDate = makeIsoDate(input.currentDate);
  const worldId = createWorldId(seed);

  assertJsonSafe(input.jurisdictions, "jurisdictions");
  assertJsonSafe(input.people, "people");

  if (input.jurisdictions.length === 0) {
    throw new Error("A world must begin with at least one jurisdiction.");
  }

  validateInitialEntities(
    worldId,
    currentDate,
    input.jurisdictions,
    input.people,
  );
  const jurisdictions = input.jurisdictions.map(cloneJurisdiction);
  const people = input.people.map(clonePerson);

  return {
    schemaVersion: 2,
    generatorVersion: "demo-world-v2",
    id: worldId,
    seed,
    startedAt: currentDate,
    currentDate,
    actionSequence: 0,
    jurisdictions: recordById(jurisdictions),
    jurisdictionOrder: jurisdictions.map((jurisdiction) => jurisdiction.id),
    people: recordById(people),
    personOrder: people.map((person) => person.id),
    history: createHistoryStore(),
  };
}

export function assertWorldIntegrity(world: World): void {
  assertJsonSafe(world, "world");
  if (world.schemaVersion !== 2 || world.generatorVersion !== "demo-world-v2") {
    throw new Error("Unsupported world schema or generator version.");
  }
  if (world.id !== createWorldId(world.seed)) {
    throw new Error("World ID does not match its stable seed identity.");
  }
  const startedAt = makeIsoDate(world.startedAt);
  const currentDate = makeIsoDate(world.currentDate);
  if (currentDate < startedAt) {
    throw new Error("World current date cannot predate its start date.");
  }
  if (!Number.isSafeInteger(world.actionSequence) || world.actionSequence < 0) {
    throw new Error(
      "World action sequence must be a non-negative safe integer.",
    );
  }

  const jurisdictions = orderedRecords(
    world.jurisdictions,
    world.jurisdictionOrder,
    "jurisdiction",
  );
  const people = orderedRecords(world.people, world.personOrder, "person");
  validateInitialEntities(world.id, currentDate, jurisdictions, people);
  validateHistoryIntegrity(world);
}

export function recordWorldEvent(
  world: World,
  input: HistoricalEventInput,
): World {
  assertJsonSafe(input, "historicalEvent");
  const occurredAt = makeIsoDate(input.occurredAt);
  const recordedAt = makeIsoDate(input.recordedAt);

  if (recordedAt < occurredAt) {
    throw new Error(
      "A historical event cannot be recorded before it occurred.",
    );
  }

  if (occurredAt > world.currentDate || recordedAt > world.currentDate) {
    throw new Error(
      "A historical event cannot occur or be recorded after the current world date.",
    );
  }

  if (input.involvedEntityIds.length === 0) {
    throw new Error("A historical event must involve at least one entity.");
  }

  assertNonEmptyString(input.stableKey, "Historical event stable key");
  assertNonEmptyString(input.type, "Historical event type");
  assertNonEmptyString(input.summary, "Historical event summary");
  if (!EVENT_VISIBILITIES.includes(input.visibility)) {
    throw new Error(
      `Historical event has an invalid visibility: ${String(input.visibility)}`,
    );
  }
  validateTags(input.tags, "Historical event");
  validateEventContext(world, input.context);

  if (input.jurisdictionId && !world.jurisdictions[input.jurisdictionId]) {
    throw new Error(
      `Historical event references a missing jurisdiction: ${input.jurisdictionId}`,
    );
  }

  for (const entityId of input.involvedEntityIds) {
    if (
      entityId !== world.id &&
      !world.people[entityId] &&
      !world.jurisdictions[entityId]
    ) {
      throw new Error(
        `Historical event references a missing entity: ${entityId}`,
      );
    }
  }

  const participantKeys = new Set<string>();
  for (const participant of input.participants) {
    const participantPerson = world.people[participant.personId];
    if (!participantPerson) {
      throw new Error(
        `Historical event participant is missing: ${participant.personId}`,
      );
    }
    if (occurredAt < participantPerson.birthDate) {
      throw new Error(
        `Historical event participant was not yet born: ${participant.personId}`,
      );
    }
    if (!input.involvedEntityIds.includes(participant.personId)) {
      throw new Error(
        `Historical event participant is not an involved entity: ${participant.personId}`,
      );
    }
    if (!EVENT_PARTICIPANT_ROLES.includes(participant.role)) {
      throw new Error(
        `Historical event participant has an invalid role: ${String(participant.role)}`,
      );
    }
    if (participant.detail !== null) {
      assertNonEmptyString(participant.detail, "Event participant detail");
    }
    const participantKey = `${participant.personId}:${participant.role}`;
    if (participantKeys.has(participantKey)) {
      throw new Error(
        `Duplicate historical event participant: ${participantKey}`,
      );
    }
    participantKeys.add(participantKey);
  }

  const constraintKeys = new Set<string>();
  for (const constraint of input.personFactConstraints) {
    const person = world.people[constraint.personId];
    if (!person) {
      throw new Error(
        `Historical fact constraint references a missing person: ${constraint.personId}`,
      );
    }
    if (!input.involvedEntityIds.includes(constraint.personId)) {
      throw new Error(
        `Historical fact constraint person is not involved in the event: ${constraint.personId}`,
      );
    }
    if (!PERSON_FACT_KINDS.includes(constraint.kind)) {
      throw new Error(
        `Historical fact constraint has an invalid kind: ${String(constraint.kind)}`,
      );
    }

    const constraintKey = `${constraint.personId}:${constraint.kind}`;
    if (constraintKeys.has(constraintKey)) {
      throw new Error(`Duplicate historical fact constraint: ${constraintKey}`);
    }
    constraintKeys.add(constraintKey);

    if (
      person.detailLevel === "materialized" &&
      person.details.generatedFacts.some(
        (fact) => fact.kind === constraint.kind,
      )
    ) {
      throw new Error(
        `Historical fact constraint conflicts with materialized person detail: ${constraintKey}`,
      );
    }
  }

  return {
    ...world,
    history: appendHistoricalEvent(world.history, world.id, {
      ...input,
      occurredAt,
      recordedAt,
    }),
  };
}

export function advanceWorld(world: World, days: number): World {
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error(
      "Time advancement must be a positive whole number of days.",
    );
  }

  const actionSequence = world.actionSequence;
  const nextDate = addDays(world.currentDate, days);
  const primaryJurisdictionId = world.jurisdictionOrder[0] ?? null;
  const advanced: World = {
    ...world,
    currentDate: nextDate,
    actionSequence: actionSequence + 1,
  };

  return recordWorldEvent(advanced, {
    stableKey: `action:${actionSequence}:time-advanced:${world.currentDate}:${days}:${nextDate}`,
    type: "simulation.time-advanced",
    occurredAt: nextDate,
    recordedAt: nextDate,
    jurisdictionId: primaryJurisdictionId,
    involvedEntityIds: primaryJurisdictionId ? [primaryJurisdictionId] : [],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.time"],
    summary: `Simulation time advanced ${days} days to ${nextDate}.`,
    context: {
      location: primaryJurisdictionId
        ? {
            jurisdictionId: primaryJurisdictionId,
            label: "Primary simulation jurisdiction",
            setting: null,
          }
        : null,
      socialContext: "Deterministic simulation clock transition.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export function materializePerson(world: World, personId: EntityId): World {
  const existing = world.people[personId];

  if (!existing) {
    throw new Error(`Cannot materialize missing person: ${personId}`);
  }

  const materialized = materializePersonRecord(
    existing,
    world.seed,
    world.startedAt,
    eventsInvolving(world.history, personId),
  );

  if (materialized === existing) {
    return world;
  }

  return {
    ...world,
    people: {
      ...world.people,
      [personId]: materialized,
    },
  };
}

export function selectPerson(
  world: World,
  personId: EntityId,
): Person | undefined {
  return world.people[personId];
}

export function selectPersonHistory(
  world: World,
  personId: EntityId,
): readonly HistoricalEvent[] {
  return eventsInvolving(world.history, personId);
}

export function resolveEntityLabel(world: World, entityId: EntityId): string {
  const person = world.people[entityId];
  if (person) {
    return personName(person);
  }

  const jurisdiction = world.jurisdictions[entityId];
  return jurisdiction?.name ?? entityId;
}

function validateInitialEntities(
  worldId: EntityId,
  currentDate: IsoDate,
  jurisdictions: readonly Jurisdiction[],
  people: readonly Person[],
): void {
  const entityIds = new Set<EntityId>([worldId]);
  const jurisdictionIds = new Set(
    jurisdictions.map((jurisdiction) => jurisdiction.id),
  );
  const personIds = new Set(people.map((person) => person.id));

  for (const jurisdiction of jurisdictions) {
    assertUniqueId(entityIds, jurisdiction.id);
    assertNonEmptyString(jurisdiction.slug, "Jurisdiction slug");
    assertNonEmptyString(jurisdiction.name, "Jurisdiction name");
    assertNonEmptyString(jurisdiction.kind, "Jurisdiction kind");
    if (jurisdiction.parentName !== null) {
      assertNonEmptyString(jurisdiction.parentName, "Jurisdiction parent name");
    }
    if (jurisdiction.provenance.jurisdiction !== jurisdiction.id) {
      throw new Error(
        `Jurisdiction provenance does not match its entity ID: ${jurisdiction.id}`,
      );
    }
    if (!DATA_STATUSES.includes(jurisdiction.provenance.status)) {
      throw new Error(
        `Jurisdiction provenance has an invalid status: ${String(jurisdiction.provenance.status)}`,
      );
    }
    if (jurisdiction.provenance.source !== null) {
      assertNonEmptyString(
        jurisdiction.provenance.source,
        "Jurisdiction provenance source",
      );
    }
    if (jurisdiction.provenance.asOf) {
      makeIsoDate(jurisdiction.provenance.asOf);
    }
  }

  for (const person of people) {
    assertUniqueId(entityIds, person.id);
    assertNonEmptyString(person.generationKey, "Person generation key");
    if (
      person.id !==
      createStableId("person", `${worldId}:${person.generationKey}`)
    ) {
      throw new Error(
        `Person ID does not match its stable generation key: ${person.id}`,
      );
    }
    assertNonEmptyString(person.givenName, "Person given name");
    assertNonEmptyString(person.familyName, "Person family name");
    const birthDate = makeIsoDate(person.birthDate);
    if (birthDate > currentDate) {
      throw new Error(
        `Person birth date is after the world start date: ${person.id}`,
      );
    }
    if (!jurisdictionIds.has(person.homeJurisdictionId)) {
      throw new Error(
        `Person references a missing home jurisdiction: ${person.id}`,
      );
    }

    const runtimeDetailLevel = (person as { readonly detailLevel?: unknown })
      .detailLevel;
    if (
      runtimeDetailLevel !== "lightweight" &&
      runtimeDetailLevel !== "materialized"
    ) {
      throw new Error(
        `Person has an invalid detail level: ${String(runtimeDetailLevel)}`,
      );
    }

    const runtimeDetails = (person as Person & { readonly details?: unknown })
      .details;
    if (person.detailLevel === "lightweight" && runtimeDetails !== undefined) {
      throw new Error(
        `Lightweight person unexpectedly contains materialized details: ${person.id}`,
      );
    }
    if (person.detailLevel === "materialized" && runtimeDetails === undefined) {
      throw new Error(`Materialized person is missing details: ${person.id}`);
    }

    const facts = [
      ...person.establishedFacts,
      ...(person.detailLevel === "materialized"
        ? person.details.generatedFacts
        : []),
    ];
    const factStableKeys = new Set<string>();
    let birthDateFactCount = 0;
    let birthplaceFactCount = 0;
    let currentResidenceCount = 0;

    for (const fact of facts) {
      assertUniqueId(entityIds, fact.id);
      assertNonEmptyString(fact.stableKey, "Person fact stable key");
      if (
        fact.id !== createStableId("fact", `${person.id}:${fact.stableKey}`)
      ) {
        throw new Error(
          `Person fact ID does not match its stable key: ${fact.id}`,
        );
      }
      if (factStableKeys.has(fact.stableKey)) {
        throw new Error(
          `Duplicate person fact stable key for ${person.id}: ${fact.stableKey}`,
        );
      }
      factStableKeys.add(fact.stableKey);
      if (!PERSON_FACT_KINDS.includes(fact.kind)) {
        throw new Error(
          `Person fact has an invalid kind: ${String(fact.kind)}`,
        );
      }
      const factDate = makeIsoDate(fact.occurredAt);
      assertNonEmptyString(fact.summary, "Person fact summary");
      if (factDate < birthDate) {
        throw new Error(`Person fact predates its person: ${fact.id}`);
      }
      if (factDate > currentDate) {
        throw new Error(
          `Person fact occurs after the world start date: ${fact.id}`,
        );
      }
      if (fact.jurisdictionId && !jurisdictionIds.has(fact.jurisdictionId)) {
        throw new Error(
          `Person fact references a missing jurisdiction: ${fact.id}`,
        );
      }
      if (fact.kind === "birth-date" && factDate !== birthDate) {
        throw new Error(
          `Birth-date fact contradicts its person's birth date: ${fact.id}`,
        );
      }
      validateFactProvenance(fact);

      switch (fact.kind) {
        case "birth-date":
          birthDateFactCount += 1;
          break;
        case "birthplace":
          birthplaceFactCount += 1;
          if (factDate !== birthDate) {
            throw new Error(
              `Birthplace fact must occur on the birth date: ${fact.id}`,
            );
          }
          break;
        case "residence":
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (fact.endedAt === null) {
            currentResidenceCount += 1;
            if (fact.jurisdictionId !== person.homeJurisdictionId) {
              throw new Error(
                `Current residence fact contradicts its person's home: ${fact.id}`,
              );
            }
          }
          break;
        case "family-relationship":
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (!personIds.has(fact.relatedPersonId)) {
            throw new Error(
              `Family fact references a missing person: ${fact.id}`,
            );
          }
          if (fact.relatedPersonId === person.id) {
            throw new Error(
              `A person cannot be their own family relation: ${fact.id}`,
            );
          }
          if (!FAMILY_RELATIONSHIP_KINDS.includes(fact.relationship)) {
            throw new Error(
              `Family fact has an invalid relationship: ${fact.id}`,
            );
          }
          break;
        case "education":
          assertNonEmptyString(fact.institution, "Education institution");
          validateOptionalString(fact.field, "Education field");
          validateOptionalString(fact.credential, "Education credential");
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (!EDUCATION_STATUSES.includes(fact.status)) {
            throw new Error(`Education fact has an invalid status: ${fact.id}`);
          }
          if ((fact.status === "ongoing") !== (fact.endedAt === null)) {
            throw new Error(
              `Education status and end date disagree: ${fact.id}`,
            );
          }
          break;
        case "occupation":
          assertNonEmptyString(fact.employer, "Occupation employer");
          assertNonEmptyString(fact.title, "Occupation title");
          validateEndedAt(fact.id, factDate, fact.endedAt, currentDate);
          if (!OCCUPATION_STATUSES.includes(fact.status)) {
            throw new Error(
              `Occupation fact has an invalid status: ${fact.id}`,
            );
          }
          if ((fact.status === "ongoing") !== (fact.endedAt === null)) {
            throw new Error(
              `Occupation status and end date disagree: ${fact.id}`,
            );
          }
          break;
      }
    }

    if (birthDateFactCount !== 1) {
      throw new Error(
        `Person must have exactly one birth-date fact: ${person.id}`,
      );
    }
    if (birthplaceFactCount !== 1) {
      throw new Error(
        `Person must have exactly one birthplace fact: ${person.id}`,
      );
    }
    if (currentResidenceCount !== 1) {
      throw new Error(
        `Person must have exactly one current residence fact: ${person.id}`,
      );
    }

    if (person.detailLevel === "materialized") {
      if (person.details.generatorVersion !== "person-materialization-v2") {
        throw new Error(
          `Person details use an unsupported generator: ${person.id}`,
        );
      }
      for (const value of [
        ...person.details.expertise,
        ...person.details.personalityTendencies,
        ...person.details.currentGoals,
      ]) {
        assertNonEmptyString(value, "Materialized person detail");
      }
    }
  }
}

function validateFactProvenance(fact: PersonFact): void {
  if (!FACT_PROVENANCE_METHODS.includes(fact.provenance.method)) {
    throw new Error(`Person fact has invalid provenance: ${fact.id}`);
  }
  validateOptionalString(fact.provenance.note, "Person fact provenance note");
  if (
    fact.provenance.method === "simulated-event" &&
    fact.provenance.sourceEventId === null
  ) {
    throw new Error(
      `Simulated-event fact is missing its source event: ${fact.id}`,
    );
  }
  if (
    fact.provenance.method !== "simulated-event" &&
    fact.provenance.sourceEventId !== null
  ) {
    throw new Error(
      `Non-event fact unexpectedly references an event: ${fact.id}`,
    );
  }
}

function validateEndedAt(
  factId: EntityId,
  occurredAt: IsoDate,
  endedAt: IsoDate | null,
  currentDate: IsoDate,
): void {
  if (endedAt === null) {
    return;
  }
  const parsed = makeIsoDate(endedAt);
  if (parsed < occurredAt) {
    throw new Error(`Person fact ends before it begins: ${factId}`);
  }
  if (parsed > currentDate) {
    throw new Error(`Person fact ends after the world start date: ${factId}`);
  }
}

function validateOptionalString(value: string | null, label: string): void {
  if (value !== null) {
    assertNonEmptyString(value, label);
  }
}

function assertUniqueId(ids: Set<EntityId>, id: EntityId): void {
  assertNonEmptyString(id, "Entity ID");
  if (ids.has(id)) {
    throw new Error(`Duplicate entity ID: ${id}`);
  }
  ids.add(id);
}

function orderedRecords<T extends { readonly id: EntityId }>(
  records: Readonly<Record<string, T>>,
  order: readonly EntityId[],
  label: string,
): readonly T[] {
  if (new Set(order).size !== order.length) {
    throw new Error(`World ${label} order contains duplicate IDs.`);
  }
  const recordIds = Object.keys(records).sort();
  const orderedIds = [...order].sort();
  if (JSON.stringify(recordIds) !== JSON.stringify(orderedIds)) {
    throw new Error(`World ${label} order and record keys disagree.`);
  }
  return order.map((id) => {
    const record = records[id];
    if (!record || record.id !== id) {
      throw new Error(`World ${label} record is missing or miskeyed: ${id}`);
    }
    return record;
  });
}

function validateHistoryIntegrity(world: World): void {
  const history = world.history;
  if (!Number.isSafeInteger(history.nextSequence) || history.nextSequence < 0) {
    throw new Error(
      "History next sequence must be a non-negative safe integer.",
    );
  }
  const records = [
    ...history.events,
    ...history.memories,
    ...history.knowledge,
    ...history.claims,
    ...history.relationshipInteractions,
  ];
  const sequences = records
    .map((record) => record.sequence)
    .sort((a, b) => a - b);
  if (
    history.nextSequence !== records.length ||
    sequences.some((sequence, index) => sequence !== index)
  ) {
    throw new Error("History sequence is not contiguous and append-oriented.");
  }
  const ids = new Set<EntityId>([
    world.id,
    ...world.jurisdictionOrder,
    ...world.personOrder,
    ...world.personOrder.flatMap((personId) => {
      const person = world.people[personId];
      if (!person) return [];
      return [
        ...person.establishedFacts.map((fact) => fact.id),
        ...(person.detailLevel === "materialized"
          ? person.details.generatedFacts.map((fact) => fact.id)
          : []),
      ];
    }),
  ]);
  assertUniqueStableKeys(history.events, "event");
  assertUniqueStableKeys(history.memories, "memory");
  assertUniqueStableKeys(history.knowledge, "knowledge");
  assertUniqueStableKeys(history.claims, "claim");
  assertUniqueStableKeys(history.relationshipInteractions, "relationship");

  const eventIds = new Set(history.events.map((event) => event.id));
  const claimIds = new Set(history.claims.map((claim) => claim.id));
  const memoryIds = new Set(history.memories.map((memory) => memory.id));
  const personIds = new Set(world.personOrder);
  const eventById = new Map(history.events.map((event) => [event.id, event]));
  const claimById = new Map(history.claims.map((claim) => [claim.id, claim]));
  const memoryById = new Map(
    history.memories.map((memory) => [memory.id, memory]),
  );
  for (const event of history.events) {
    assertHistoryIdentity(ids, world, event, "event");
    makeIsoDate(event.occurredAt);
    makeIsoDate(event.recordedAt);
    if (
      event.occurredAt > event.recordedAt ||
      event.recordedAt > world.currentDate
    ) {
      throw new Error(`Historical event has invalid chronology: ${event.id}`);
    }
    assertNonEmptyString(event.type, "Historical event type");
    assertNonEmptyString(event.summary, "Historical event summary");
    if (!EVENT_VISIBILITIES.includes(event.visibility)) {
      throw new Error(`Historical event has invalid visibility: ${event.id}`);
    }
    validateTags(event.tags, "Historical event");
    validateEventContext(world, event.context);
    if (
      event.jurisdictionId !== null &&
      !world.jurisdictions[event.jurisdictionId]
    ) {
      throw new Error(
        `Historical event references a missing jurisdiction: ${event.id}`,
      );
    }
    for (const involvedId of event.involvedEntityIds) {
      if (
        involvedId !== world.id &&
        !world.people[involvedId] &&
        !world.jurisdictions[involvedId]
      ) {
        throw new Error(
          `Historical event references a missing involved entity: ${event.id}`,
        );
      }
    }
    const participantKeys = new Set<string>();
    for (const participant of event.participants) {
      const person = world.people[participant.personId];
      if (!person || !event.involvedEntityIds.includes(participant.personId)) {
        throw new Error(
          `Historical event contains an invalid participant: ${event.id}`,
        );
      }
      if (
        !EVENT_PARTICIPANT_ROLES.includes(participant.role) ||
        event.occurredAt < person.birthDate
      ) {
        throw new Error(
          `Historical event contains an impossible participant: ${event.id}`,
        );
      }
      validateOptionalString(participant.detail, "Event participant detail");
      const participantKey = `${participant.personId}:${participant.role}`;
      if (participantKeys.has(participantKey)) {
        throw new Error(
          `Historical event contains a duplicate participant: ${event.id}`,
        );
      }
      participantKeys.add(participantKey);
    }
    for (const constraint of event.personFactConstraints) {
      if (
        !personIds.has(constraint.personId) ||
        !event.involvedEntityIds.includes(constraint.personId) ||
        !PERSON_FACT_KINDS.includes(constraint.kind)
      ) {
        throw new Error(
          `Historical event has an invalid biography constraint: ${event.id}`,
        );
      }
    }
  }
  for (const person of world.personOrder.map((id) => world.people[id])) {
    if (!person) continue;
    for (const fact of [
      ...person.establishedFacts,
      ...(person.detailLevel === "materialized"
        ? person.details.generatedFacts
        : []),
    ]) {
      if (
        fact.provenance.sourceEventId !== null &&
        !eventIds.has(fact.provenance.sourceEventId)
      ) {
        throw new Error(
          `Person fact references a missing source event: ${fact.id}`,
        );
      }
    }
  }
  for (const memory of history.memories) {
    assertHistoryIdentity(ids, world, memory, "memory");
    if (!personIds.has(memory.personId) || !eventIds.has(memory.eventId)) {
      throw new Error(
        `Memory references a missing person or event: ${memory.id}`,
      );
    }
    if (
      memory.supersedesMemoryId !== null &&
      !memoryIds.has(memory.supersedesMemoryId)
    ) {
      throw new Error(`Memory references a missing prior memory: ${memory.id}`);
    }
    const event = eventById.get(memory.eventId);
    const prior =
      memory.supersedesMemoryId === null
        ? undefined
        : memoryById.get(memory.supersedesMemoryId);
    if (
      !event ||
      makeIsoDate(memory.formedAt) < event.occurredAt ||
      memory.formedAt > world.currentDate ||
      (prior &&
        (prior.sequence >= memory.sequence ||
          prior.personId !== memory.personId ||
          prior.eventId !== memory.eventId))
    ) {
      throw new Error(
        `Memory has invalid chronology or supersession: ${memory.id}`,
      );
    }
    assertNonEmptyString(memory.rememberedSummary, "Remembered summary");
    assertNonEmptyString(memory.interpretation, "Memory interpretation");
    validateTags(memory.relevanceTags, "Memory relevance");
  }
  for (const knowledge of history.knowledge) {
    assertHistoryIdentity(ids, world, knowledge, "knowledge");
    if (
      !personIds.has(knowledge.personId) ||
      !eventIds.has(knowledge.eventId)
    ) {
      throw new Error(
        `Knowledge references a missing person or event: ${knowledge.id}`,
      );
    }
    if (knowledge.source.kind === "told-by") {
      if (!personIds.has(knowledge.source.sourcePersonId)) {
        throw new Error(
          `Knowledge references a missing source person: ${knowledge.id}`,
        );
      }
      if (
        knowledge.source.claimId !== null &&
        !claimIds.has(knowledge.source.claimId)
      ) {
        throw new Error(
          `Knowledge references a missing source claim: ${knowledge.id}`,
        );
      }
      const sourceClaim =
        knowledge.source.claimId === null
          ? undefined
          : claimById.get(knowledge.source.claimId);
      if (
        sourceClaim &&
        (sourceClaim.speakerPersonId !== knowledge.source.sourcePersonId ||
          sourceClaim.eventId !== knowledge.eventId ||
          sourceClaim.sequence >= knowledge.sequence ||
          sourceClaim.madeAt > knowledge.learnedAt)
      ) {
        throw new Error(
          `Knowledge references an incompatible source claim: ${knowledge.id}`,
        );
      }
    }
    const event = eventById.get(knowledge.eventId);
    if (
      !event ||
      makeIsoDate(knowledge.learnedAt) < event.occurredAt ||
      knowledge.learnedAt > world.currentDate ||
      (knowledge.source.kind === "direct" &&
        !event.involvedEntityIds.includes(knowledge.personId))
    ) {
      throw new Error(
        `Knowledge has invalid chronology or source: ${knowledge.id}`,
      );
    }
    assertNonEmptyString(knowledge.believedSummary, "Believed summary");
  }
  for (const claim of history.claims) {
    assertHistoryIdentity(ids, world, claim, "claim");
    if (!personIds.has(claim.speakerPersonId) || !eventIds.has(claim.eventId)) {
      throw new Error(
        `Claim references a missing person or event: ${claim.id}`,
      );
    }
    const event = eventById.get(claim.eventId);
    if (
      !event ||
      makeIsoDate(claim.madeAt) < event.occurredAt ||
      claim.madeAt > world.currentDate
    ) {
      throw new Error(`Claim has invalid chronology: ${claim.id}`);
    }
    assertNonEmptyString(claim.statement, "Claim statement");
  }
  for (const interaction of history.relationshipInteractions) {
    assertHistoryIdentity(ids, world, interaction, "relationship");
    if (
      interaction.personIds[0] === interaction.personIds[1] ||
      interaction.personIds.some((id) => !personIds.has(id)) ||
      (interaction.eventId !== null && !eventIds.has(interaction.eventId))
    ) {
      throw new Error(
        `Relationship interaction has invalid references: ${interaction.id}`,
      );
    }
    if (
      interaction.personIds[0] > interaction.personIds[1] ||
      makeIsoDate(interaction.occurredAt) > world.currentDate
    ) {
      throw new Error(
        `Relationship interaction is not canonical: ${interaction.id}`,
      );
    }
    if (interaction.eventId !== null) {
      const event = eventById.get(interaction.eventId);
      if (
        !event ||
        event.occurredAt !== interaction.occurredAt ||
        interaction.personIds.some(
          (personId) => !event.involvedEntityIds.includes(personId),
        )
      ) {
        throw new Error(
          `Relationship interaction has an incompatible event: ${interaction.id}`,
        );
      }
    }
    assertNonEmptyString(
      interaction.summary,
      "Relationship interaction summary",
    );
    validateTags(interaction.tags, "Relationship interaction");
  }
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind: "event" | "memory" | "knowledge" | "claim" | "relationship",
): void {
  assertUniqueId(ids, record.id);
  assertNonEmptyString(record.stableKey, "History stable key");
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(`${kind} ID does not match its stable key: ${record.id}`);
  }
}

function assertUniqueStableKeys(
  records: readonly { readonly stableKey: string }[],
  label: string,
): void {
  const keys = new Set<string>();
  for (const record of records) {
    if (keys.has(record.stableKey)) {
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    }
    keys.add(record.stableKey);
  }
}

function assertNonEmptyString(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function validateTags(tags: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const tag of tags) {
    assertNonEmptyString(tag, `${label} tag`);
    if (seen.has(tag)) {
      throw new Error(`${label} contains a duplicate tag: ${tag}`);
    }
    seen.add(tag);
  }
}

function validateEventContext(world: World, context: EventContext): void {
  if (context.location) {
    assertNonEmptyString(context.location.label, "Event location label");
    if (
      context.location.jurisdictionId &&
      !world.jurisdictions[context.location.jurisdictionId]
    ) {
      throw new Error(
        `Event context references a missing jurisdiction: ${context.location.jurisdictionId}`,
      );
    }
    if (context.location.setting !== null) {
      assertNonEmptyString(context.location.setting, "Event setting");
    }
  }
  for (const [field, value] of Object.entries(context)) {
    if (field !== "location" && value !== null) {
      assertNonEmptyString(value, `Event context ${field}`);
    }
  }
}

function assertJsonSafe(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number is not JSON-safe at ${path}.`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new Error(`Non-JSON-safe value at ${path}.`);
  }
  if (ancestors.has(value)) {
    throw new Error(`Cyclic value is not JSON-safe at ${path}.`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new Error(`Non-plain object is not JSON-safe at ${path}.`);
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertJsonSafe(entry, `${path}[${index}]`, ancestors),
    );
  } else {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

function cloneFact(fact: PersonFact): PersonFact {
  return { ...fact, provenance: { ...fact.provenance } };
}

function cloneJurisdiction(jurisdiction: Jurisdiction): Jurisdiction {
  return {
    ...jurisdiction,
    provenance: { ...jurisdiction.provenance },
  };
}

function clonePerson(person: Person): Person {
  const core = {
    ...person,
    establishedFacts: person.establishedFacts.map(cloneFact),
  };

  if (person.detailLevel === "lightweight") {
    return core;
  }

  return {
    ...core,
    detailLevel: "materialized",
    details: {
      ...person.details,
      expertise: [...person.details.expertise],
      personalityTendencies: [...person.details.personalityTendencies],
      currentGoals: [...person.details.currentGoals],
      generatedFacts: person.details.generatedFacts.map(cloneFact),
    },
  };
}
