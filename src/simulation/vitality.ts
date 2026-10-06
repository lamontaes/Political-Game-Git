import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import { succeedDeceasedLeader } from "./living-world/movement-succession";
import type {
  EntityId,
  PersonDeathRecord,
  PersonFunctionalCapacityRecord,
  PersonFunctionalCapacityStatus,
  VitalityRecordProvenance,
  VitalitySemanticKey,
  World,
} from "./types";
import {
  MORTALITY_OBSOLETE_REASON,
  MORTALITY_OBSOLETE_CONTEXT,
  MORTALITY_DEATH_CONTEXT,
  MORTALITY_SURVIVAL_CONTEXT,
  MORTALITY_TRANSITION_KEY,
  isPersonAliveAt,
  personActionAvailabilityAt,
  personFunctionalCapacityAt,
} from "./vitality-integrity";

// The annual mortality check (a seeded draw against a life table) is gone:
// deaths come from recorded health, hazards and harm through crisis/
// mortality.ts and the crisis producers. These keys stay exported so an old
// save that carries the check's records is still read and validated as it was
// written; nothing writes them now.
export {
  MORTALITY_OBSOLETE_REASON,
  MORTALITY_OBSOLETE_CONTEXT,
  MORTALITY_DEATH_CONTEXT,
  MORTALITY_SURVIVAL_CONTEXT,
  MORTALITY_TRANSITION_KEY,
  isPersonAliveAt,
  personActionAvailabilityAt,
  personFunctionalCapacityAt,
};

export interface RecordPersonDeathInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly diedAt: string;
  readonly causeKey: VitalitySemanticKey;
  readonly sourceEntityIds: readonly EntityId[];
  readonly summary: string;
  readonly provenance: VitalityRecordProvenance;
}

export interface RecordPersonFunctionalCapacityInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly effectiveAt: string;
  readonly status: PersonFunctionalCapacityStatus;
  readonly reasonKey: VitalitySemanticKey;
  readonly sourceEntityIds: readonly EntityId[];
  readonly summary: string;
  readonly provenance: VitalityRecordProvenance;
}

const CAPACITY_STATUSES: readonly PersonFunctionalCapacityStatus[] = [
  "capable",
  "limited",
  "incapacitated",
];
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function recordPersonDeath(
  world: World,
  input: RecordPersonDeathInput,
): World {
  assertStableKey(input.stableKey, "Person-death stable key");
  assertSemanticKey(input.causeKey, "Person-death cause key");
  assertNonEmpty(input.summary, "Person-death summary");
  // Annual life-table probabilities describe a population total; they must
  // never select an individual death. Older saves can still carry records
  // written by that retired transition, but no current writer may add one.
  if (input.causeKey === MORTALITY_TRANSITION_KEY) {
    throw new Error(
      "The retired annual mortality check cannot write a person death.",
    );
  }
  const person = world.people[input.personId];
  if (!person) throw new Error(`Missing death person: ${input.personId}`);
  const diedAt = makeIsoDate(input.diedAt);
  if (diedAt < person.birthDate || diedAt > world.currentDate) {
    throw new Error(
      "A person's death must occur within their simulated lifetime.",
    );
  }
  if (
    world.history.personDeaths.some(
      (death) => death.personId === input.personId,
    )
  ) {
    throw new Error("A person may have only one death record.");
  }
  const sourceEntityIds = canonicalIds(
    input.sourceEntityIds,
    "Person-death source entities",
  );
  if (sourceEntityIds.length === 0) {
    throw new Error("A person-death record requires a canonical cause source.");
  }
  const eventStableKey = `${input.stableKey}:event`;
  const withEvent = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: "person.died",
    occurredAt: diedAt,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: canonicalIds(
      [input.personId, ...sourceEntityIds],
      "Person-death event entities",
    ),
    participants: [
      {
        personId: input.personId,
        role: "impact:deceased",
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["vitality.death"],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = withEvent.history.events.at(-1);
  if (!event || event.stableKey !== eventStableKey) {
    throw new Error("Person-death event was not committed exactly.");
  }
  const death: PersonDeathRecord = {
    id: createStableId("person-death", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: withEvent.history.nextSequence,
    personId: input.personId,
    diedAt,
    recordedAt: world.currentDate,
    eventId: event.id,
    causeKey: input.causeKey,
    sourceEntityIds,
    provenance: cloneProvenance(input.provenance),
  };
  const next: World = {
    ...withEvent,
    history: {
      ...withEvent.history,
      nextSequence: withEvent.history.nextSequence + 1,
      personDeaths: [...withEvent.history.personDeaths, death],
    },
  };
  assertWorldIntegrity(next);
  return succeedDeceasedLeader(next, input.personId);
}

export function recordPersonFunctionalCapacity(
  world: World,
  input: RecordPersonFunctionalCapacityInput,
): World {
  assertStableKey(input.stableKey, "Functional-capacity stable key");
  assertSemanticKey(input.reasonKey, "Functional-capacity reason key");
  assertNonEmpty(input.summary, "Functional-capacity summary");
  const person = world.people[input.personId];
  if (!person) {
    throw new Error(`Missing functional-capacity person: ${input.personId}`);
  }
  if (!CAPACITY_STATUSES.includes(input.status)) {
    throw new Error(
      `Invalid functional-capacity status: ${String(input.status)}`,
    );
  }
  const effectiveAt = makeIsoDate(input.effectiveAt);
  if (effectiveAt < person.birthDate || effectiveAt > world.currentDate) {
    throw new Error(
      "Functional capacity date is outside the person's lifetime.",
    );
  }
  if (
    !isPersonAliveAt(world, input.personId, {
      asOfDate: effectiveAt,
      historySequenceExclusive: world.history.nextSequence,
    })
  ) {
    throw new Error("Functional capacity cannot change after death.");
  }
  const prior = world.history.personFunctionalCapacities
    .filter((record) => record.personId === input.personId)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1);
  if ((prior?.status ?? "capable") === input.status) {
    throw new Error(
      "Functional-capacity history must record an actual change.",
    );
  }
  if (prior && effectiveAt < prior.effectiveAt) {
    throw new Error(
      "Functional-capacity effective dates cannot move backward.",
    );
  }
  const sourceEntityIds = canonicalIds(
    input.sourceEntityIds,
    "Functional-capacity source entities",
  );
  const eventStableKey = `${input.stableKey}:event`;
  const withEvent = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: "person.capacity-changed",
    occurredAt: effectiveAt,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: canonicalIds(
      [input.personId, ...sourceEntityIds],
      "Functional-capacity event entities",
    ),
    participants: [
      {
        personId: input.personId,
        role: "impact:capacity-change",
        detail: input.status,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["vitality.capacity"],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = withEvent.history.events.at(-1);
  if (!event || event.stableKey !== eventStableKey) {
    throw new Error("Functional-capacity event was not committed exactly.");
  }
  const record: PersonFunctionalCapacityRecord = {
    id: createStableId(
      "person-functional-capacity",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: withEvent.history.nextSequence,
    personId: input.personId,
    effectiveAt,
    recordedAt: world.currentDate,
    status: input.status,
    eventId: event.id,
    reasonKey: input.reasonKey,
    sourceEntityIds,
    supersedesCapacityId: prior?.id ?? null,
    provenance: cloneProvenance(input.provenance),
  };
  return commit(withEvent, {
    ...withEvent.history,
    nextSequence: withEvent.history.nextSequence + 1,
    personFunctionalCapacities: [
      ...withEvent.history.personFunctionalCapacities,
      record,
    ],
  });
}

function commit(world: World, history: World["history"]): World {
  const next: World = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

function cloneProvenance(
  provenance: VitalityRecordProvenance,
): VitalityRecordProvenance {
  return provenance.kind === "simulated"
    ? { kind: "simulated", sourceEntityIds: [...provenance.sourceEntityIds] }
    : { ...provenance };
}

function canonicalIds(
  ids: readonly EntityId[],
  label: string,
): readonly EntityId[] {
  void label;
  return [...new Set(ids)].sort();
}

function assertStableKey(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}

function assertSemanticKey(value: string, label: string): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
