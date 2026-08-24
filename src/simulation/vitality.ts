import { dateAtAge, makeIsoDate, yearOf } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { createStableId } from "./ids";
import { assertExactQuantity } from "./quantity";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import type {
  EntityId,
  FutureTransitionHandler,
  MortalityCheckPlanRecord,
  MortalityCheckResultRecord,
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
  mortalityRngForPlan,
  personActionAvailabilityAt,
  personFunctionalCapacityAt,
} from "./vitality-integrity";

export {
  MORTALITY_OBSOLETE_REASON,
  MORTALITY_OBSOLETE_CONTEXT,
  MORTALITY_DEATH_CONTEXT,
  MORTALITY_SURVIVAL_CONTEXT,
  MORTALITY_TRANSITION_KEY,
  isPersonAliveAt,
  mortalityRngForPlan,
  personActionAvailabilityAt,
  personFunctionalCapacityAt,
};

export interface SchedulePersonMortalityCheckInput {
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly mortalityTableId: EntityId;
  readonly checkYear: number;
  readonly provenance: VitalityRecordProvenance;
}

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

export function schedulePersonMortalityCheck(
  world: World,
  input: SchedulePersonMortalityCheckInput,
): World {
  assertStableKey(input.stableKey, "Mortality plan stable key");
  const person = world.people[input.personId];
  if (!person)
    throw new Error(`Missing mortality-check person: ${input.personId}`);
  if (person.detailLevel !== "materialized") {
    throw new Error(
      "Individual mortality checks require a materialized person.",
    );
  }
  const table = world.vitalityCatalog.mortalityTables[input.mortalityTableId];
  if (!table)
    throw new Error(`Missing mortality table: ${input.mortalityTableId}`);
  if (!Number.isSafeInteger(input.checkYear)) {
    throw new Error("Mortality check year must be a safe integer.");
  }
  const age = input.checkYear - yearOf(person.birthDate);
  if (!Number.isSafeInteger(age) || age < 0) {
    throw new Error("Mortality check cannot precede the person's birth year.");
  }
  const dueAt = dateAtAge(person.birthDate, age);
  if (dueAt <= world.currentDate) {
    throw new Error("Mortality check must be scheduled for a future birthday.");
  }
  const rate = table.rates.find((entry) => entry.age === age);
  if (!rate) {
    throw new Error(
      `Mortality table has no explicit probability for age ${age}.`,
    );
  }
  assertExactQuantity(rate.annualProbability);
  if (
    world.history.mortalityCheckPlans.some(
      (plan) =>
        plan.personId === input.personId && plan.checkYear === input.checkYear,
    )
  ) {
    throw new Error(
      "A mortality plan already exists for this person and year.",
    );
  }
  if (
    !isPersonAliveAt(world, input.personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  ) {
    throw new Error("A deceased person cannot acquire a mortality check.");
  }
  assertOneActiveMortalityCheckOrInFlightFollowOn(
    world,
    input.personId,
    input.checkYear,
  );

  const plan: MortalityCheckPlanRecord = {
    id: createStableId(
      "mortality-check-plan",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    personId: input.personId,
    mortalityTableId: input.mortalityTableId,
    checkYear: input.checkYear,
    dueAt,
    age,
    annualProbability: { ...rate.annualProbability },
    recordedAt: world.currentDate,
    provenance: cloneProvenance(input.provenance),
  };
  const withPlan: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      mortalityCheckPlans: [...world.history.mortalityCheckPlans, plan],
    },
  };
  return scheduleFutureDueItem(withPlan, {
    stableKey: `${input.stableKey}:due`,
    dueAt,
    transitionKey: MORTALITY_TRANSITION_KEY,
    entityIds: [plan.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
  });
}

export function recordPersonDeath(
  world: World,
  input: RecordPersonDeathInput,
): World {
  return appendPersonDeath(world, input, true);
}

function appendPersonDeath(
  world: World,
  input: RecordPersonDeathInput,
  validateResult: boolean,
): World {
  assertStableKey(input.stableKey, "Person-death stable key");
  assertSemanticKey(input.causeKey, "Person-death cause key");
  assertNonEmpty(input.summary, "Person-death summary");
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
  if (validateResult) assertWorldIntegrity(next);
  return next;
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

export const mortalityTransitionHandler: FutureTransitionHandler = (
  world,
  dueItem,
) => {
  if (world.currentDate !== dueItem.dueAt) {
    throw new Error(
      "Mortality checks must run at their exact due-date frontier.",
    );
  }
  if (
    dueItem.transitionKey !== MORTALITY_TRANSITION_KEY ||
    dueItem.entityIds.length !== 1
  ) {
    throw new Error("Mortality handler received a mismatched due item.");
  }
  const plan = world.history.mortalityCheckPlans.find(
    (candidate) => candidate.id === dueItem.entityIds[0],
  );
  if (!plan || dueItem.dueAt !== plan.dueAt) {
    throw new Error(
      "Mortality handler received a due item without its exact plan.",
    );
  }
  const existingResult = world.history.mortalityCheckResults.find(
    (result) => result.planId === plan.id,
  );
  if (existingResult) {
    const resumed = ensureSurvivalFollowOn(world, plan, existingResult);
    return {
      world: resumed,
      status: "resolved",
      reasonKey: null,
      context:
        existingResult.outcome === "died"
          ? MORTALITY_DEATH_CONTEXT
          : MORTALITY_SURVIVAL_CONTEXT,
      outcomeEventId: existingResult.deathEventId,
    };
  }
  if (
    !isPersonAliveAt(world, plan.personId, {
      asOfDate: plan.dueAt,
      historySequenceExclusive: world.history.nextSequence,
    })
  ) {
    return {
      world,
      status: "cancelled",
      reasonKey: MORTALITY_OBSOLETE_REASON,
      context: MORTALITY_OBSOLETE_CONTEXT,
      outcomeEventId: null,
    };
  }

  const rng = mortalityRngForPlan(world, plan);
  let working = world;
  let deathEventId: EntityId | null = null;
  let deathRecordId: EntityId | null = null;
  if (rng.died) {
    working = appendPersonDeath(
      working,
      {
        stableKey: `${plan.stableKey}:death`,
        personId: plan.personId,
        diedAt: plan.dueAt,
        causeKey: MORTALITY_TRANSITION_KEY,
        sourceEntityIds: [plan.id],
        summary: "The person died at the annual mortality-check frontier.",
        provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
      },
      false,
    );
    const death = working.history.personDeaths.at(-1);
    if (!death || death.personId !== plan.personId) {
      throw new Error("Mortality death was not committed exactly.");
    }
    deathEventId = death.eventId;
    deathRecordId = death.id;
  }

  const result: MortalityCheckResultRecord = {
    id: createStableId(
      "mortality-check-result",
      `${world.id}:${plan.stableKey}:result`,
    ),
    stableKey: `${plan.stableKey}:result`,
    sequence: working.history.nextSequence,
    planId: plan.id,
    checkedAt: plan.dueAt,
    outcome: rng.died ? "died" : "survived",
    rng,
    deathEventId,
    deathRecordId,
    provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
  };
  working = {
    ...working,
    history: {
      ...working.history,
      nextSequence: working.history.nextSequence + 1,
      mortalityCheckResults: [...working.history.mortalityCheckResults, result],
    },
  };

  working = ensureSurvivalFollowOn(working, plan, result);

  return {
    world: working,
    status: "resolved",
    reasonKey: null,
    context: rng.died ? MORTALITY_DEATH_CONTEXT : MORTALITY_SURVIVAL_CONTEXT,
    outcomeEventId: deathEventId,
  };
};

function ensureSurvivalFollowOn(
  world: World,
  plan: MortalityCheckPlanRecord,
  result: MortalityCheckResultRecord,
): World {
  if (result.outcome !== "survived") return world;
  const table = world.vitalityCatalog.mortalityTables[plan.mortalityTableId];
  const nextYear = plan.checkYear + 1;
  if (!table?.rates.some((entry) => entry.age === plan.age + 1)) return world;
  if (
    world.history.mortalityCheckPlans.some(
      (candidate) =>
        candidate.personId === plan.personId &&
        candidate.checkYear === nextYear,
    )
  ) {
    return world;
  }
  return schedulePersonMortalityCheck(world, {
    stableKey: `${plan.stableKey}:follow-on:${nextYear}`,
    personId: plan.personId,
    mortalityTableId: plan.mortalityTableId,
    checkYear: nextYear,
    provenance: { kind: "simulated", sourceEntityIds: [result.id] },
  });
}

function assertOneActiveMortalityCheckOrInFlightFollowOn(
  world: World,
  personId: EntityId,
  requestedYear: number,
): void {
  const active = world.history.mortalityCheckPlans.filter((plan) => {
    if (plan.personId !== personId) return false;
    const item = world.history.futureDueItems.find(
      (candidate) =>
        candidate.transitionKey === MORTALITY_TRANSITION_KEY &&
        candidate.entityIds.length === 1 &&
        candidate.entityIds[0] === plan.id,
    );
    if (!item) return false;
    return (
      world.history.futureDueItemStates
        .filter((state) => state.dueItemId === item.id)
        .sort((left, right) => left.sequence - right.sequence)
        .at(-1)?.status === "scheduled"
    );
  });
  if (active.length === 0) return;
  const prior = active.at(-1) as MortalityCheckPlanRecord;
  const result = world.history.mortalityCheckResults.find(
    (candidate) => candidate.planId === prior.id,
  );
  if (
    active.length !== 1 ||
    result?.outcome !== "survived" ||
    world.currentDate !== prior.dueAt ||
    requestedYear !== prior.checkYear + 1
  ) {
    throw new Error(
      "A person may have only one active mortality-check due item.",
    );
  }
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
