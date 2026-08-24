import { ageOnDate, dateAtAge, makeIsoDate, yearOf } from "./dates";
import { createStableId } from "./ids";
import { assertExactQuantity } from "./quantity";
import { SeededRng } from "./rng";
import type {
  EntityId,
  FutureDueItem,
  HistoricalCutoff,
  IsoDate,
  LifeEligibilityDecision,
  MortalityCheckPlanRecord,
  MortalityCheckResultRecord,
  MortalityRngResult,
  PersonDeathRecord,
  PersonFunctionalCapacityRecord,
  PersonFunctionalCapacityStatus,
  VitalityRecordProvenance,
  World,
} from "./types";

export const MORTALITY_TRANSITION_KEY = "vitality:mortality-check" as const;
export const MORTALITY_OBSOLETE_REASON =
  "vitality:person-no-longer-alive" as const;
export const MORTALITY_OBSOLETE_CONTEXT =
  "The once-valid mortality plan became obsolete after death." as const;
export const MORTALITY_DEATH_CONTEXT =
  "The annual mortality check produced death." as const;
export const MORTALITY_SURVIVAL_CONTEXT =
  "The annual mortality check was survived." as const;

const UINT32_RANGE = 0x1_0000_0000;
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;
const CAPACITY_STATUSES: readonly PersonFunctionalCapacityStatus[] = [
  "capable",
  "limited",
  "incapacitated",
];

type VitalityHistoryRecord =
  | MortalityCheckPlanRecord
  | MortalityCheckResultRecord
  | PersonDeathRecord
  | PersonFunctionalCapacityRecord;

export function vitalityHistoryRecords(
  world: World,
): readonly VitalityHistoryRecord[] {
  return [
    ...world.history.mortalityCheckPlans,
    ...world.history.mortalityCheckResults,
    ...world.history.personDeaths,
    ...world.history.personFunctionalCapacities,
  ];
}

export function vitalityEntityExists(world: World, id: EntityId): boolean {
  return vitalityHistoryRecords(world).some((record) => record.id === id);
}

export function vitalityEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = vitalityHistoryRecords(world).find(
    (candidate) => candidate.id === id,
  );
  if (!record || record.sequence >= sequenceExclusive) return false;
  return vitalityRecordDate(record) <= asOfDate;
}

export function isPersonAliveAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): boolean {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing vitality person: ${personId}`);
  validateCutoff(world, cutoff);
  if (cutoff.asOfDate < person.birthDate) return false;
  return !world.history.personDeaths.some(
    (record) =>
      record.personId === personId &&
      record.diedAt <= cutoff.asOfDate &&
      record.sequence < cutoff.historySequenceExclusive,
  );
}

export function personFunctionalCapacityAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): PersonFunctionalCapacityStatus | null {
  if (!world.people[personId]) {
    throw new Error(`Missing functional-capacity person: ${personId}`);
  }
  validateCutoff(world, cutoff);
  if (!isPersonAliveAt(world, personId, cutoff)) return null;
  return (
    world.history.personFunctionalCapacities
      .filter(
        (record) =>
          record.personId === personId &&
          record.effectiveAt <= cutoff.asOfDate &&
          record.sequence < cutoff.historySequenceExclusive,
      )
      .sort(bySequence)
      .at(-1)?.status ?? "capable"
  );
}

export function personActionAvailabilityAt(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): LifeEligibilityDecision {
  if (!isPersonAliveAt(world, personId, cutoff)) {
    return {
      status: "blocked",
      reasons: [
        {
          key: "capacity:deceased",
          explanation: "The person was deceased at this historical frontier.",
        },
      ],
    };
  }
  const capacity = personFunctionalCapacityAt(world, personId, cutoff);
  if (capacity === "incapacitated") {
    return {
      status: "blocked",
      reasons: [
        {
          key: "capacity:incapacitated",
          explanation:
            "The person was functionally incapacitated at this historical frontier.",
        },
      ],
    };
  }
  return capacity === "limited"
    ? {
        status: "allowed",
        reasons: [
          {
            key: "capacity:limited",
            explanation:
              "The person had limited functional capacity; the domain may apply narrower rules.",
          },
        ],
      }
    : { status: "allowed", reasons: [] };
}

export function mortalityRngForPlan(
  world: World,
  plan: MortalityCheckPlanRecord,
): MortalityRngResult {
  const table = world.vitalityCatalog.mortalityTables[plan.mortalityTableId];
  if (!table)
    throw new Error(`Missing mortality table: ${plan.mortalityTableId}`);
  const key = JSON.stringify([
    "mortality-evaluation-v1",
    world.seed,
    plan.personId,
    table.id,
    table.stableKey,
    plan.checkYear,
    plan.dueAt,
    plan.age,
  ]);
  const draw = new SeededRng("mortality-rng-v1").fork(key).nextUint32();
  const died =
    BigInt(draw) * BigInt(plan.annualProbability.denominator) <
    BigInt(plan.annualProbability.numerator) * BigInt(UINT32_RANGE);
  return {
    version: "mortality-rng-v1",
    key,
    draw,
    drawRangeExclusive: 4294967296,
    died,
  };
}

export function assertVitalityIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertSequenceOrdered(world.history.mortalityCheckPlans, "mortality plan");
  assertSequenceOrdered(
    world.history.mortalityCheckResults,
    "mortality result",
  );
  assertSequenceOrdered(world.history.personDeaths, "person death");
  assertSequenceOrdered(
    world.history.personFunctionalCapacities,
    "person functional-capacity",
  );

  const planKeys = new Set<string>();
  const planByPersonYear = new Set<string>();
  const dueByPlan = new Map<EntityId, FutureDueItem>();
  for (const item of world.history.futureDueItems) {
    if (item.transitionKey !== MORTALITY_TRANSITION_KEY) continue;
    if (item.entityIds.length !== 1) {
      throw new Error(
        `Mortality due item must reference exactly one plan: ${item.id}`,
      );
    }
    const planId = item.entityIds[0] as EntityId;
    if (dueByPlan.has(planId)) {
      throw new Error(`Duplicate mortality due item for plan: ${planId}`);
    }
    dueByPlan.set(planId, item);
  }

  for (const plan of world.history.mortalityCheckPlans) {
    assertIdentity(ids, world, plan, "mortality-check-plan");
    assertUniqueKey(planKeys, plan.stableKey, "mortality plan");
    const person = world.people[plan.personId];
    const table = world.vitalityCatalog.mortalityTables[plan.mortalityTableId];
    if (!person || person.detailLevel !== "materialized" || !table) {
      throw new Error(
        `Mortality plan has unavailable person or table: ${plan.id}`,
      );
    }
    makeIsoDate(plan.recordedAt);
    makeIsoDate(plan.dueAt);
    if (
      !Number.isSafeInteger(plan.checkYear) ||
      !Number.isSafeInteger(plan.age) ||
      plan.age < 0 ||
      plan.checkYear !== yearOf(person.birthDate) + plan.age ||
      plan.dueAt !== dateAtAge(person.birthDate, plan.age) ||
      ageOnDate(person.birthDate, plan.dueAt) !== plan.age ||
      plan.dueAt <= plan.recordedAt ||
      plan.recordedAt > world.currentDate
    ) {
      throw new Error(
        `Mortality plan has invalid birthday chronology: ${plan.id}`,
      );
    }
    const rate = table.rates.find((entry) => entry.age === plan.age);
    assertExactQuantity(plan.annualProbability);
    if (
      !rate ||
      JSON.stringify(rate.annualProbability) !==
        JSON.stringify(plan.annualProbability)
    ) {
      throw new Error(
        `Mortality plan probability does not match its table: ${plan.id}`,
      );
    }
    const personYearKey = `${plan.personId}:${plan.checkYear}`;
    if (planByPersonYear.has(personYearKey)) {
      throw new Error(
        `Duplicate mortality plan for person/year: ${personYearKey}`,
      );
    }
    planByPersonYear.add(personYearKey);
    if (
      !isPersonAliveAt(world, plan.personId, {
        asOfDate: plan.recordedAt,
        historySequenceExclusive: plan.sequence,
      })
    ) {
      throw new Error(
        `Mortality plan was created for a deceased person: ${plan.id}`,
      );
    }
    validateProvenance(
      world,
      plan.provenance,
      plan.recordedAt,
      plan.sequence,
      "Mortality plan",
    );
    const due = dueByPlan.get(plan.id);
    if (
      !due ||
      due.sequence !== plan.sequence + 1 ||
      due.stableKey !== `${plan.stableKey}:due` ||
      due.scheduledAt !== plan.recordedAt ||
      due.dueAt !== plan.dueAt ||
      due.jurisdictionId !== null ||
      JSON.stringify(due.entityIds) !== JSON.stringify([plan.id]) ||
      JSON.stringify(due.provenance) !==
        JSON.stringify({ kind: "simulated", sourceEntityIds: [plan.id] })
    ) {
      throw new Error(
        `Mortality plan lacks its exact Run A due item: ${plan.id}`,
      );
    }
    const earlierActivePlans = world.history.mortalityCheckPlans.filter(
      (candidate) => {
        if (
          candidate.personId !== plan.personId ||
          candidate.sequence >= plan.sequence
        ) {
          return false;
        }
        const candidateDue = dueByPlan.get(candidate.id);
        return (
          candidateDue !== undefined &&
          latestDueStateBefore(world, candidateDue.id, plan.sequence)
            ?.status === "scheduled"
        );
      },
    );
    if (earlierActivePlans.length > 0) {
      const priorPlan = earlierActivePlans[0];
      const priorResult = priorPlan
        ? world.history.mortalityCheckResults.find(
            (candidate) =>
              candidate.planId === priorPlan.id &&
              candidate.sequence < plan.sequence,
          )
        : undefined;
      if (
        earlierActivePlans.length !== 1 ||
        !priorPlan ||
        priorResult?.outcome !== "survived" ||
        priorPlan.dueAt !== plan.recordedAt ||
        plan.checkYear !== priorPlan.checkYear + 1 ||
        plan.age !== priorPlan.age + 1 ||
        plan.mortalityTableId !== priorPlan.mortalityTableId ||
        plan.stableKey !==
          `${priorPlan.stableKey}:follow-on:${plan.checkYear}` ||
        !world.vitalityCatalog.mortalityTables[
          priorPlan.mortalityTableId
        ]?.rates.some((entry) => entry.age === plan.age) ||
        JSON.stringify(plan.provenance) !==
          JSON.stringify({
            kind: "simulated",
            sourceEntityIds: [priorResult.id],
          })
      ) {
        throw new Error(
          `Mortality plan overlapped active due work at creation: ${plan.id}`,
        );
      }
    }
  }
  for (const planId of dueByPlan.keys()) {
    if (!world.history.mortalityCheckPlans.some((plan) => plan.id === planId)) {
      throw new Error(
        `Mortality due item bypasses a canonical plan: ${planId}`,
      );
    }
  }

  const resultKeys = new Set<string>();
  const resultByPlan = new Map<EntityId, MortalityCheckResultRecord>();
  for (const result of world.history.mortalityCheckResults) {
    assertIdentity(ids, world, result, "mortality-check-result");
    assertUniqueKey(resultKeys, result.stableKey, "mortality result");
    const plan = world.history.mortalityCheckPlans.find(
      (candidate) => candidate.id === result.planId,
    );
    const due = plan ? dueByPlan.get(plan.id) : undefined;
    const initialDueState = due
      ? world.history.futureDueItemStates.find(
          (state) => state.dueItemId === due.id && state.status === "scheduled",
        )
      : undefined;
    makeIsoDate(result.checkedAt);
    if (
      !plan ||
      !due ||
      !initialDueState ||
      initialDueState.sequence >= result.sequence ||
      result.checkedAt !== plan.dueAt ||
      result.checkedAt > world.currentDate ||
      result.stableKey !== `${plan.stableKey}:result` ||
      JSON.stringify(result.provenance) !==
        JSON.stringify({ kind: "simulated", sourceEntityIds: [plan.id] })
    ) {
      throw new Error(`Mortality result has no exact prior plan: ${result.id}`);
    }
    if (resultByPlan.has(plan.id)) {
      throw new Error(`Duplicate mortality result for plan: ${plan.id}`);
    }
    resultByPlan.set(plan.id, result);
    const expectedRng = mortalityRngForPlan(world, plan);
    if (
      JSON.stringify(result.rng) !== JSON.stringify(expectedRng) ||
      result.outcome !== (expectedRng.died ? "died" : "survived")
    ) {
      throw new Error(`Mortality result cannot be reconstructed: ${result.id}`);
    }
    validateProvenance(
      world,
      result.provenance,
      result.checkedAt,
      result.sequence,
      "Mortality result",
    );
    if (result.outcome === "survived") {
      if (result.deathEventId !== null || result.deathRecordId !== null) {
        throw new Error(
          `Surviving mortality result links a death: ${result.id}`,
        );
      }
      if (
        !isPersonAliveAt(world, plan.personId, {
          asOfDate: result.checkedAt,
          historySequenceExclusive: result.sequence,
        })
      ) {
        throw new Error(
          `Mortality result was evaluated after an earlier death: ${result.id}`,
        );
      }
    } else {
      const death = world.history.personDeaths.find(
        (candidate) => candidate.id === result.deathRecordId,
      );
      if (
        !death ||
        death.sequence >= result.sequence ||
        death.sequence + 1 !== result.sequence ||
        death.stableKey !== `${plan.stableKey}:death` ||
        death.personId !== plan.personId ||
        death.diedAt !== plan.dueAt ||
        death.eventId !== result.deathEventId ||
        death.causeKey !== MORTALITY_TRANSITION_KEY ||
        JSON.stringify(death.sourceEntityIds) !== JSON.stringify([plan.id]) ||
        JSON.stringify(death.provenance) !==
          JSON.stringify({ kind: "simulated", sourceEntityIds: [plan.id] })
      ) {
        throw new Error(
          `Died mortality result has an invalid death link: ${result.id}`,
        );
      }
      if (
        !isPersonAliveAt(world, plan.personId, {
          asOfDate: result.checkedAt,
          historySequenceExclusive: death.sequence,
        })
      ) {
        throw new Error(
          `Mortality death result followed an earlier death: ${result.id}`,
        );
      }
    }
  }

  const deathKeys = new Set<string>();
  const deathsByPerson = new Set<EntityId>();
  for (const death of world.history.personDeaths) {
    assertIdentity(ids, world, death, "person-death");
    assertUniqueKey(deathKeys, death.stableKey, "person death");
    const person = world.people[death.personId];
    const event = world.history.events.find(
      (candidate) => candidate.id === death.eventId,
    );
    if (!person || deathsByPerson.has(death.personId)) {
      throw new Error(`Missing person or duplicate death: ${death.personId}`);
    }
    deathsByPerson.add(death.personId);
    makeIsoDate(death.diedAt);
    makeIsoDate(death.recordedAt);
    canonicalIds(death.sourceEntityIds, "Death source entities");
    assertSemanticKey(death.causeKey, "Death cause key");
    if (
      death.sourceEntityIds.length === 0 ||
      death.diedAt < person.birthDate ||
      death.recordedAt < death.diedAt ||
      death.recordedAt > world.currentDate ||
      !event ||
      event.sequence + 1 !== death.sequence ||
      event.stableKey !== `${death.stableKey}:event` ||
      event.type !== "person.died" ||
      event.occurredAt !== death.diedAt ||
      event.recordedAt !== death.recordedAt ||
      event.jurisdictionId !== person.homeJurisdictionId ||
      event.visibility !== "private" ||
      JSON.stringify(event.tags) !== JSON.stringify(["vitality.death"]) ||
      JSON.stringify(event.involvedEntityIds) !==
        JSON.stringify(sortedIds([death.personId, ...death.sourceEntityIds])) ||
      event.participants.length !== 1 ||
      event.participants[0]?.personId !== death.personId ||
      event.participants[0]?.role !== "impact:deceased" ||
      event.participants[0]?.detail !== null ||
      event.personFactConstraints.length !== 0 ||
      !hasEmptyContext(event)
    ) {
      throw new Error(
        `Death record has an invalid exact event link: ${death.id}`,
      );
    }
    for (const sourceId of death.sourceEntityIds) {
      if (!sourceAvailable(world, sourceId, death.diedAt, event.sequence)) {
        throw new Error(
          `Death source was unavailable at occurrence: ${sourceId}`,
        );
      }
    }
    validateProvenance(
      world,
      death.provenance,
      death.recordedAt,
      death.sequence,
      "Person death",
    );
    if (
      death.provenance.kind === "simulated" &&
      JSON.stringify(death.provenance.sourceEntityIds) !==
        JSON.stringify(death.sourceEntityIds)
    ) {
      throw new Error(
        `Person-death simulated provenance does not match its cause sources: ${death.id}`,
      );
    }
    if (death.causeKey === MORTALITY_TRANSITION_KEY) {
      const planId = death.sourceEntityIds[0];
      const result = planId ? resultByPlan.get(planId) : undefined;
      if (
        death.sourceEntityIds.length !== 1 ||
        !result ||
        result.outcome !== "died" ||
        result.deathRecordId !== death.id ||
        result.deathEventId !== death.eventId
      ) {
        throw new Error(
          `Mortality-caused death lacks its exact died result: ${death.id}`,
        );
      }
    }
  }
  for (const event of world.history.events.filter(
    (candidate) => candidate.type === "person.died",
  )) {
    if (
      world.history.personDeaths.filter((death) => death.eventId === event.id)
        .length !== 1
    ) {
      throw new Error(
        `Reserved person-death event lacks exactly one death record: ${event.id}`,
      );
    }
  }

  const capacityKeys = new Set<string>();
  const priorCapacityByPerson = new Map<
    EntityId,
    PersonFunctionalCapacityRecord
  >();
  for (const capacity of world.history.personFunctionalCapacities) {
    assertIdentity(ids, world, capacity, "person-functional-capacity");
    assertUniqueKey(capacityKeys, capacity.stableKey, "functional capacity");
    const person = world.people[capacity.personId];
    const event = world.history.events.find(
      (candidate) => candidate.id === capacity.eventId,
    );
    const prior = priorCapacityByPerson.get(capacity.personId);
    makeIsoDate(capacity.effectiveAt);
    makeIsoDate(capacity.recordedAt);
    assertSemanticKey(capacity.reasonKey, "Functional-capacity reason key");
    canonicalIds(capacity.sourceEntityIds, "Functional-capacity sources");
    if (
      !person ||
      !CAPACITY_STATUSES.includes(capacity.status) ||
      capacity.effectiveAt < person.birthDate ||
      capacity.recordedAt < capacity.effectiveAt ||
      capacity.recordedAt > world.currentDate ||
      capacity.supersedesCapacityId !== (prior?.id ?? null) ||
      capacity.status === (prior?.status ?? "capable") ||
      (prior !== undefined && capacity.effectiveAt < prior.effectiveAt) ||
      !isPersonAliveAt(world, capacity.personId, {
        asOfDate: capacity.effectiveAt,
        historySequenceExclusive: capacity.sequence,
      }) ||
      !event ||
      event.sequence + 1 !== capacity.sequence ||
      event.stableKey !== `${capacity.stableKey}:event` ||
      event.type !== "person.capacity-changed" ||
      event.occurredAt !== capacity.effectiveAt ||
      event.recordedAt !== capacity.recordedAt ||
      event.jurisdictionId !== person.homeJurisdictionId ||
      event.visibility !== "private" ||
      JSON.stringify(event.tags) !== JSON.stringify(["vitality.capacity"]) ||
      event.participants.length !== 1 ||
      event.participants[0]?.personId !== capacity.personId ||
      event.participants[0]?.role !== "impact:capacity-change" ||
      event.participants[0]?.detail !== capacity.status ||
      event.personFactConstraints.length !== 0 ||
      !hasEmptyContext(event) ||
      JSON.stringify(event.involvedEntityIds) !==
        JSON.stringify(
          sortedIds([capacity.personId, ...capacity.sourceEntityIds]),
        )
    ) {
      throw new Error(
        `Functional-capacity record has invalid semantics: ${capacity.id}`,
      );
    }
    for (const sourceId of capacity.sourceEntityIds) {
      if (
        !sourceAvailable(world, sourceId, capacity.effectiveAt, event.sequence)
      ) {
        throw new Error(
          `Functional-capacity source is unavailable: ${sourceId}`,
        );
      }
    }
    validateProvenance(
      world,
      capacity.provenance,
      capacity.recordedAt,
      capacity.sequence,
      "Functional capacity",
    );
    if (
      capacity.provenance.kind === "simulated" &&
      JSON.stringify(capacity.provenance.sourceEntityIds) !==
        JSON.stringify(capacity.sourceEntityIds)
    ) {
      throw new Error(
        `Functional-capacity simulated provenance does not match its reason sources: ${capacity.id}`,
      );
    }
    priorCapacityByPerson.set(capacity.personId, capacity);
  }
  for (const event of world.history.events.filter(
    (candidate) => candidate.type === "person.capacity-changed",
  )) {
    if (
      world.history.personFunctionalCapacities.filter(
        (capacity) => capacity.eventId === event.id,
      ).length !== 1
    ) {
      throw new Error(
        `Reserved functional-capacity event lacks exactly one capacity record: ${event.id}`,
      );
    }
  }

  validateMortalityLifecycles(world, dueByPlan, resultByPlan);
}

function validateMortalityLifecycles(
  world: World,
  dueByPlan: ReadonlyMap<EntityId, FutureDueItem>,
  resultByPlan: ReadonlyMap<EntityId, MortalityCheckResultRecord>,
): void {
  for (const plan of world.history.mortalityCheckPlans) {
    const due = dueByPlan.get(plan.id);
    if (!due) continue;
    const states = world.history.futureDueItemStates
      .filter((state) => state.dueItemId === due.id)
      .sort(bySequence);
    const latest = states.at(-1);
    const result = resultByPlan.get(plan.id);
    if (result) {
      if (!mortalityDueWasNextAtFrontier(world, due, result.sequence)) {
        throw new Error(
          `Mortality result was evaluated out of Run A order: ${result.id}`,
        );
      }
      const followOn = validateSurvivalFollowOn(world, plan, result);
      const followOnDue = followOn ? dueByPlan.get(followOn.id) : undefined;
      const followOnScheduled = followOnDue
        ? world.history.futureDueItemStates.find(
            (state) =>
              state.dueItemId === followOnDue.id &&
              state.status === "scheduled",
          )
        : undefined;
      const expectedTerminalSequence = followOnScheduled
        ? followOnScheduled.sequence + 1
        : result.sequence + 1;
      const expectedOutcomeEventId =
        result.outcome === "died" ? result.deathEventId : null;
      const terminalMatches =
        latest?.status === "resolved" &&
        latest.sequence === expectedTerminalSequence &&
        latest.stableKey === `${due.stableKey}:state:resolved:${due.dueAt}` &&
        latest.effectiveAt === plan.dueAt &&
        latest.reasonKey === null &&
        latest.context ===
          (result.outcome === "died"
            ? MORTALITY_DEATH_CONTEXT
            : MORTALITY_SURVIVAL_CONTEXT) &&
        latest.outcomeEventId === expectedOutcomeEventId &&
        mortalityTerminalHasTimeContinuity(world, latest.sequence, plan.dueAt);
      const exactInFlight =
        latest?.status === "scheduled" &&
        world.currentDate === plan.dueAt &&
        world.history.nextSequence === expectedTerminalSequence;
      if (!terminalMatches && !exactInFlight) {
        throw new Error(
          `Mortality result lacks an exact due lifecycle: ${result.id}`,
        );
      }
    } else if (latest?.status === "cancelled") {
      if (
        !mortalityDueWasNextAtFrontier(world, due, latest.sequence) ||
        latest.stableKey !== `${due.stableKey}:state:cancelled:${due.dueAt}` ||
        latest.effectiveAt !== plan.dueAt ||
        latest.reasonKey !== MORTALITY_OBSOLETE_REASON ||
        latest.context !== MORTALITY_OBSOLETE_CONTEXT ||
        latest.outcomeEventId !== null ||
        !mortalityTerminalHasTimeContinuity(
          world,
          latest.sequence,
          plan.dueAt,
        ) ||
        isPersonAliveAt(world, plan.personId, {
          asOfDate: latest.effectiveAt,
          historySequenceExclusive: latest.sequence,
        })
      ) {
        throw new Error(
          `Mortality cancellation is not an obsolete-death case: ${due.id}`,
        );
      }
    } else if (latest?.status !== "scheduled") {
      throw new Error(
        `Mortality plan terminally ended without a result: ${plan.id}`,
      );
    }
  }

  const scheduledByPerson = new Map<EntityId, MortalityCheckPlanRecord[]>();
  for (const plan of world.history.mortalityCheckPlans) {
    const due = dueByPlan.get(plan.id);
    const latest = due
      ? world.history.futureDueItemStates
          .filter((state) => state.dueItemId === due.id)
          .sort(bySequence)
          .at(-1)
      : undefined;
    if (latest?.status !== "scheduled") continue;
    const group = scheduledByPerson.get(plan.personId) ?? [];
    group.push(plan);
    scheduledByPerson.set(plan.personId, group);
  }
  for (const [personId, plans] of scheduledByPerson) {
    if (plans.length <= 1) continue;
    const ordered = plans.sort(bySequence);
    const older = ordered[ordered.length - 2];
    const newer = ordered[ordered.length - 1];
    const olderResult = older ? resultByPlan.get(older.id) : undefined;
    if (
      plans.length !== 2 ||
      !older ||
      !newer ||
      olderResult?.outcome !== "survived" ||
      world.currentDate !== older.dueAt ||
      newer.checkYear !== older.checkYear + 1 ||
      newer.sequence <= olderResult.sequence
    ) {
      throw new Error(
        `Person has multiple active mortality checks: ${personId}`,
      );
    }
  }
}

function mortalityDueWasNextAtFrontier(
  world: World,
  mortalityDue: FutureDueItem,
  resultSequence: number,
): boolean {
  return !world.history.futureDueItems.some((candidate) => {
    if (candidate.id === mortalityDue.id) return false;
    const precedesMortality =
      candidate.dueAt < mortalityDue.dueAt ||
      (candidate.dueAt === mortalityDue.dueAt &&
        candidate.sequence < mortalityDue.sequence);
    return (
      precedesMortality &&
      latestDueStateBefore(world, candidate.id, resultSequence)?.status ===
        "scheduled"
    );
  });
}

function mortalityTerminalHasTimeContinuity(
  world: World,
  terminalSequence: number,
  dueAt: string,
): boolean {
  if (world.currentDate === dueAt) return true;
  return world.history.events.some(
    (event) =>
      event.type === "simulation.time-advanced" &&
      event.sequence > terminalSequence &&
      event.occurredAt > dueAt &&
      event.occurredAt <= world.currentDate,
  );
}

function validateSurvivalFollowOn(
  world: World,
  plan: MortalityCheckPlanRecord,
  result: MortalityCheckResultRecord,
): MortalityCheckPlanRecord | null {
  if (result.outcome !== "survived") return null;
  const table = world.vitalityCatalog.mortalityTables[plan.mortalityTableId];
  const nextYear = plan.checkYear + 1;
  const nextAge = plan.age + 1;
  const nextRate = table?.rates.find((entry) => entry.age === nextAge);
  const followOns = world.history.mortalityCheckPlans.filter(
    (candidate) =>
      candidate.sequence > result.sequence &&
      candidate.personId === plan.personId &&
      candidate.checkYear === nextYear,
  );

  if (!nextRate) {
    if (followOns.length > 0) {
      throw new Error(
        `Unsupported mortality survival created a follow-on: ${result.id}`,
      );
    }
    return null;
  }

  const followOn = followOns[0];
  if (
    followOns.length !== 1 ||
    !followOn ||
    followOn.sequence !== result.sequence + 1 ||
    followOn.stableKey !== `${plan.stableKey}:follow-on:${nextYear}` ||
    followOn.mortalityTableId !== plan.mortalityTableId ||
    followOn.age !== nextAge ||
    followOn.dueAt !==
      dateAtAge(world.people[plan.personId]!.birthDate, nextAge) ||
    JSON.stringify(followOn.annualProbability) !==
      JSON.stringify(nextRate.annualProbability) ||
    JSON.stringify(followOn.provenance) !==
      JSON.stringify({ kind: "simulated", sourceEntityIds: [result.id] })
  ) {
    throw new Error(
      `Mortality survival has an invalid follow-on: ${result.id}`,
    );
  }
  return followOn;
}

function latestDueStateBefore(
  world: World,
  dueItemId: EntityId,
  sequenceExclusive: number,
) {
  return world.history.futureDueItemStates
    .filter(
      (state) =>
        state.dueItemId === dueItemId && state.sequence < sequenceExclusive,
    )
    .sort(bySequence)
    .at(-1);
}

function validateProvenance(
  world: World,
  provenance: VitalityRecordProvenance,
  asOfDate: string,
  sequenceExclusive: number,
  label: string,
): void {
  if (provenance.kind === "authored") {
    if (provenance.note.trim().length === 0) {
      throw new Error(`${label} authored provenance requires a note.`);
    }
    return;
  }
  if (provenance.kind !== "simulated") {
    throw new Error(`${label} has invalid provenance.`);
  }
  canonicalIds(provenance.sourceEntityIds, `${label} provenance sources`);
  if (provenance.sourceEntityIds.length === 0) {
    throw new Error(`${label} simulated provenance requires a source.`);
  }
  for (const id of provenance.sourceEntityIds) {
    if (!sourceAvailable(world, id, asOfDate, sequenceExclusive)) {
      throw new Error(`${label} provenance source is unavailable: ${id}`);
    }
  }
}

function sourceAvailable(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (id === world.id || world.jurisdictions[id]) return true;
  const person = world.people[id];
  if (person) return person.birthDate <= asOfDate;
  if (vitalityEntityAvailableAt(world, id, asOfDate, sequenceExclusive)) {
    return true;
  }
  const event = world.history.events.find((record) => record.id === id);
  if (event) {
    return event.occurredAt <= asOfDate && event.sequence < sequenceExclusive;
  }
  const incident = world.history.incidents.find((record) => record.id === id);
  if (incident) {
    return (
      incident.onsetAt <= asOfDate && incident.sequence < sequenceExclusive
    );
  }
  const due = world.history.futureDueItems.find((record) => record.id === id);
  return !!(
    due &&
    due.scheduledAt <= asOfDate &&
    due.sequence < sequenceExclusive
  );
}

function vitalityRecordDate(record: VitalityHistoryRecord): IsoDate {
  if ("dueAt" in record) return record.recordedAt;
  if ("checkedAt" in record) return record.checkedAt;
  if ("diedAt" in record) return record.diedAt;
  return record.effectiveAt;
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  makeIsoDate(cutoff.asOfDate);
  if (cutoff.asOfDate > world.currentDate) {
    throw new Error("Vitality cutoff is after the current world date.");
  }
  if (
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Vitality cutoff sequence is outside world history.");
  }
}

function canonicalIds(
  ids: readonly EntityId[],
  label: string,
): readonly EntityId[] {
  const canonical = [...new Set(ids)].sort();
  if (JSON.stringify(ids) !== JSON.stringify(canonical)) {
    throw new Error(`${label} must be sorted and unique.`);
  }
  return canonical;
}

function sortedIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort();
}

function hasEmptyContext(event: World["history"]["events"][number]): boolean {
  return (
    event.context.location === null &&
    event.context.socialContext === null &&
    event.context.pressure === null &&
    event.context.choice === null &&
    event.context.motivation === null &&
    event.context.immediateReaction === null
  );
}

function assertSemanticKey(value: string, label: string): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function assertIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind:
    | "mortality-check-plan"
    | "mortality-check-result"
    | "person-death"
    | "person-functional-capacity",
): void {
  if (
    record.stableKey.trim().length === 0 ||
    record.id !== createStableId(kind, `${world.id}:${record.stableKey}`) ||
    ids.has(record.id)
  ) {
    throw new Error(`Invalid or duplicate ${kind} identity: ${record.id}`);
  }
  ids.add(record.id);
}

function assertUniqueKey(seen: Set<string>, key: string, label: string): void {
  if (seen.has(key)) throw new Error(`Duplicate ${label} stable key: ${key}`);
  seen.add(key);
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= (records[index - 1]?.sequence ?? -1),
    )
  ) {
    throw new Error(`${label} history is not sequence ordered.`);
  }
}

function bySequence<T extends { readonly sequence: number }>(
  left: T,
  right: T,
): number {
  return left.sequence - right.sequence;
}
