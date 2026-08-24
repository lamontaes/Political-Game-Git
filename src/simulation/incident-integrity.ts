import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  assertExactQuantity,
  compareExactQuantities,
  multiplyExactShares,
  scaleExactQuantity,
  scaleSafeIntegerByExactShare,
  subtractExactQuantities,
} from "./quantity";
import { makeCurrencyCode } from "./resources";
import { assertDottedContentKey } from "./taxonomy";
import type {
  CausalRecordProvenance,
  EntityId,
  EntityKind,
  ExactQuantity,
  IncidentAppliedConsequencePlan,
  IncidentConsequencePlan,
  IncidentEvaluation,
  IncidentRecord,
  IncidentStateRecord,
  IncidentTransitionPlanRecord,
  MetricReferencePeriod,
  MetricScope,
  World,
  WorldMetricValue,
} from "./types";

const ONE_SHARE: ExactQuantity = {
  numerator: 1,
  denominator: 1,
  unit: "rate:share",
};
const ZERO_SHARE: ExactQuantity = {
  numerator: 0,
  denominator: 1,
  unit: "rate:share",
};
const INCIDENT_TRANSITION_KEY = "incident:transition";
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function incidentEntityExists(world: World, id: EntityId): boolean {
  return !![
    ...world.history.incidents,
    ...world.history.incidentStates,
    ...world.history.incidentTransitionPlans,
  ].find((record) => record.id === id);
}

export function incidentEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const incident = world.history.incidents.find((record) => record.id === id);
  if (incident) {
    return (
      incident.recordedAt <= asOfDate && incident.sequence < sequenceExclusive
    );
  }
  const state = world.history.incidentStates.find((record) => record.id === id);
  if (state) {
    return state.effectiveAt <= asOfDate && state.sequence < sequenceExclusive;
  }
  const plan = world.history.incidentTransitionPlans.find(
    (record) => record.id === id,
  );
  return !!(
    plan &&
    plan.recordedAt <= asOfDate &&
    plan.sequence < sequenceExclusive
  );
}

export function incidentHistoryRecords(
  world: World,
): readonly (
  IncidentRecord | IncidentStateRecord | IncidentTransitionPlanRecord
)[] {
  return [
    ...world.history.incidents,
    ...world.history.incidentStates,
    ...world.history.incidentTransitionPlans,
  ];
}

export function assertIncidentIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  validateDefinitionReferences(world);
  assertSequenceOrdered(world.history.incidents, "incident");
  assertSequenceOrdered(world.history.incidentStates, "incident state");
  assertSequenceOrdered(
    world.history.incidentTransitionPlans,
    "incident transition plan",
  );
  const incidents = new Map<EntityId, IncidentRecord>();
  const roots = new Set<EntityId>();
  for (const incident of world.history.incidents) {
    assertHistoryIdentity(ids, world, incident, "incident", incident.stableKey);
    if (incidents.has(incident.id)) {
      throw new Error(`Duplicate incident identity: ${incident.id}`);
    }
    incidents.set(incident.id, incident);
    const definition = world.incidentCatalog.definitions[incident.definitionId];
    if (!definition || definition.incidentKind !== incident.incidentKind) {
      throw new Error(
        `Incident has missing or mismatched definition: ${incident.id}`,
      );
    }
    validateScope(world, incident.scope, `Incident scope: ${incident.id}`);
    makeIsoDate(incident.onsetAt);
    makeIsoDate(incident.recordedAt);
    if (
      incident.onsetAt > incident.recordedAt ||
      incident.recordedAt > world.currentDate
    ) {
      throw new Error(`Incident has impossible chronology: ${incident.id}`);
    }
    const root = world.history.causalProcesses.find(
      (record) => record.id === incident.rootCausalProcessId,
    );
    const onsetEvent = world.history.events.find(
      (record) => record.id === incident.onsetEventId,
    );
    if (
      !root ||
      root.sequence >= incident.sequence ||
      root.kind !== "incident:occurrence" ||
      root.parentCausalIds.length !== 0 ||
      root.sourceEntityIds.length !== 1 ||
      root.sourceEntityIds[0] !== incident.onsetEventId ||
      !onsetEvent ||
      onsetEvent.sequence >= incident.sequence ||
      onsetEvent.occurredAt !== incident.onsetAt ||
      onsetEvent.jurisdictionId !== incident.scope.jurisdictionId ||
      onsetEvent.type !== "incident.occurred" ||
      incident.provenance.kind !== "simulated" ||
      incident.provenance.sourceEntityIds.length !== 1 ||
      incident.provenance.sourceEntityIds[0] !== onsetEvent.id
    ) {
      throw new Error(
        `Incident has missing or wrong root/event linkage: ${incident.id}`,
      );
    }
    if (roots.has(root.id)) {
      throw new Error(
        `Incident root is reused by another incident: ${incident.id}`,
      );
    }
    roots.add(root.id);
    validateEvaluation(world, incident.occurrence, incident);
    validateCausalProvenance(world, incident.provenance, incident.sequence);
    for (const consequence of incident.occurrence.consequences) {
      assertIncidentEffect(world, incident, consequence, incident.stableKey);
    }
  }

  const statesByIncident = new Map<EntityId, IncidentStateRecord[]>();
  for (const state of world.history.incidentStates) {
    assertHistoryIdentity(ids, world, state, "incident-state", state.stableKey);
    const incident = incidents.get(state.incidentId);
    const prior = statesByIncident.get(state.incidentId) ?? [];
    const previous = prior.at(-1);
    const event = world.history.events.find(
      (record) => record.id === state.eventId,
    );
    if (
      !incident ||
      incident.sequence >= state.sequence ||
      !event ||
      event.sequence >= state.sequence ||
      event.occurredAt !== state.effectiveAt ||
      event.jurisdictionId !== incident.scope.jurisdictionId ||
      event.type !== "incident.phase" ||
      !event.tags.includes("incident.phase") ||
      !event.involvedEntityIds.includes(incident.id) ||
      state.effectiveAt < incident.onsetAt ||
      state.effectiveAt > world.currentDate ||
      (state.status !== "active" && state.status !== "resolved") ||
      !SEMANTIC_KEY.test(state.phaseKey) ||
      (state.reasonKey !== null && !SEMANTIC_KEY.test(state.reasonKey)) ||
      (previous === undefined
        ? state.supersedesStateId !== null || state.status !== "active"
        : previous.status === "resolved" ||
          state.supersedesStateId !== previous.id)
    ) {
      throw new Error(
        `Incident state has invalid lifecycle or event: ${state.id}`,
      );
    }
    validateOptionalNonEmpty(state.context, "Incident state context");
    validateCausalProvenance(world, state.provenance, state.sequence);
    prior.push(state);
    statesByIncident.set(state.incidentId, prior);
  }
  for (const incident of world.history.incidents) {
    const states = statesByIncident.get(incident.id) ?? [];
    if (states.length === 0) {
      throw new Error(`Incident lacks initial state: ${incident.id}`);
    }
  }

  const planKeys = new Set<string>();
  const plans = new Map<EntityId, IncidentTransitionPlanRecord>();
  for (const plan of world.history.incidentTransitionPlans) {
    assertHistoryIdentity(
      ids,
      world,
      plan,
      "incident-transition-plan",
      plan.stableKey,
    );
    if (planKeys.has(plan.stableKey)) {
      throw new Error(
        `Duplicate incident transition-plan key: ${plan.stableKey}`,
      );
    }
    planKeys.add(plan.stableKey);
    plans.set(plan.id, plan);
    const incident = incidents.get(plan.incidentId);
    const priorState = latestStateBefore(
      statesByIncident.get(plan.incidentId) ?? [],
      plan.sequence,
    );
    makeIsoDate(plan.dueAt);
    makeIsoDate(plan.recordedAt);
    if (
      !incident ||
      incident.sequence >= plan.sequence ||
      plan.dueAt <= plan.recordedAt ||
      plan.recordedAt > world.currentDate ||
      !priorState ||
      priorState.status !== "active" ||
      !SEMANTIC_KEY.test(plan.phaseKey) ||
      (plan.reasonKey !== null && !SEMANTIC_KEY.test(plan.reasonKey))
    ) {
      throw new Error(`Incident transition plan is invalid: ${plan.id}`);
    }
    validateOptionalNonEmpty(plan.context, "Incident transition plan context");
    validateCausalProvenance(world, plan.provenance, plan.sequence);
    const consequenceKeys = new Set<string>();
    for (const consequence of plan.consequences) {
      if (consequenceKeys.has(consequence.stableKey)) {
        throw new Error(
          `Duplicate incident transition consequence: ${plan.id}`,
        );
      }
      consequenceKeys.add(consequence.stableKey);
      validateConsequencePlan(world, consequence, plan.dueAt);
    }
  }
  assertIncidentDueIntegrity(world, plans, statesByIncident);
  assertResolvedTransitionEffects(world, plans, statesByIncident);
}

function validateDefinitionReferences(world: World): void {
  for (const definition of Object.values(world.incidentCatalog.definitions)) {
    for (const rule of [...definition.prerequisites, ...definition.blockers]) {
      if (rule.kind !== "metric-comparison") continue;
      const metric = world.metricCatalog.definitions[rule.metricId];
      if (!metric) {
        throw new Error(
          `Incident rule references missing metric: ${rule.stableKey}`,
        );
      }
      validateMetricValue(
        rule.threshold,
        metric.valueKind,
        metric.quantityUnit,
      );
      if (
        rule.reference.kind === "exact" &&
        rule.reference.referencePeriod.kind !== metric.referencePeriodKind
      ) {
        throw new Error(
          `Incident rule period mismatches metric: ${rule.stableKey}`,
        );
      }
      if (
        rule.reference.kind === "at-evaluation" &&
        metric.referencePeriodKind !== "point"
      ) {
        throw new Error(
          `Incident at-evaluation rule requires a point metric: ${rule.stableKey}`,
        );
      }
    }
  }
}

export function assertIncidentDueIntegrity(
  world: World,
  plans = new Map(
    world.history.incidentTransitionPlans.map((plan) => [plan.id, plan]),
  ),
  statesByIncident = new Map<EntityId, IncidentStateRecord[]>(),
): void {
  const dueByPlan = new Set<EntityId>();
  for (const dueItem of world.history.futureDueItems) {
    if (dueItem.transitionKey !== INCIDENT_TRANSITION_KEY) continue;
    const planId = dueItem.entityIds[0];
    const plan = planId ? plans.get(planId) : undefined;
    const incident = plan
      ? world.history.incidents.find((record) => record.id === plan.incidentId)
      : undefined;
    if (
      dueItem.entityIds.length !== 1 ||
      !plan ||
      !incident ||
      plan.sequence >= dueItem.sequence ||
      plan.recordedAt > dueItem.scheduledAt ||
      dueItem.dueAt !== plan.dueAt ||
      dueItem.jurisdictionId !== incident.scope.jurisdictionId ||
      dueItem.provenance.kind !== "simulated" ||
      dueItem.provenance.sourceEntityIds.length !== 1 ||
      dueItem.provenance.sourceEntityIds[0] !== plan.id ||
      dueByPlan.has(plan.id)
    ) {
      throw new Error(
        `Incident due item has invalid transition plan: ${dueItem.id}`,
      );
    }
    const states =
      statesByIncident.get(incident.id) ??
      world.history.incidentStates.filter(
        (state) => state.incidentId === incident.id,
      );
    const stateAtCreation = latestStateBefore(states, dueItem.sequence);
    if (!stateAtCreation || stateAtCreation.status !== "active") {
      throw new Error(
        `Incident due item was invalid when scheduled: ${dueItem.id}`,
      );
    }
    dueByPlan.add(plan.id);
  }
}

function validateEvaluation(
  world: World,
  evaluation: IncidentEvaluation,
  incident: IncidentRecord,
): void {
  if (
    evaluation.definitionId !== incident.definitionId ||
    !evaluation.occurred ||
    evaluation.evaluatedAt !== incident.onsetAt ||
    evaluation.cutoff.asOfDate !== evaluation.evaluatedAt ||
    evaluation.cutoff.historySequenceExclusive > incident.sequence
  ) {
    throw new Error(
      `Incident has malformed occurrence snapshot: ${incident.id}`,
    );
  }
  validateScope(
    world,
    evaluation.scope,
    `Incident evaluation scope: ${incident.id}`,
  );
  if (!sameScope(evaluation.scope, incident.scope)) {
    throw new Error(
      `Incident occurrence scope does not match incident: ${incident.id}`,
    );
  }
  assertShare(evaluation.baseLikelihood, "Incident base likelihood");
  assertShare(evaluation.likelihood, "Incident likelihood");
  assertShare(evaluation.exposure, "Incident exposure");
  assertShare(evaluation.vulnerability, "Incident vulnerability");
  assertShare(evaluation.resilience, "Incident resilience");
  assertShare(evaluation.impactShare, "Incident impact share");
  const impact = multiplyExactShares(
    multiplyExactShares(evaluation.exposure, evaluation.vulnerability),
    subtractExactQuantities(ONE_SHARE, evaluation.resilience),
  );
  if (compareExactQuantities(impact, evaluation.impactShare) !== 0) {
    throw new Error(`Incident impact share is inconsistent: ${incident.id}`);
  }
  if (evaluation.rng !== null) {
    if (
      !Number.isSafeInteger(evaluation.rng.draw) ||
      evaluation.rng.draw < 0 ||
      evaluation.rng.draw >= evaluation.rng.drawRangeExclusive ||
      evaluation.rng.drawRangeExclusive !== 4294967296 ||
      !evaluation.rng.occurred
    ) {
      throw new Error(`Incident RNG snapshot is malformed: ${incident.id}`);
    }
  }
  const keys = new Set<string>();
  for (const result of [
    ...evaluation.prerequisiteResults,
    ...evaluation.blockerResults,
  ]) {
    if (
      keys.has(result.ruleStableKey) ||
      !SEMANTIC_KEY.test(result.ruleStableKey)
    ) {
      throw new Error(`Incident rule evaluation is malformed: ${incident.id}`);
    }
    keys.add(result.ruleStableKey);
    if (
      result.status !== "satisfied" &&
      result.status !== "unsatisfied" &&
      result.status !== "unavailable"
    ) {
      throw new Error(
        `Incident rule evaluation has invalid status: ${incident.id}`,
      );
    }
  }
  for (const modifier of evaluation.appliedLikelihoodModifiers) {
    assertShare(modifier.factor, "Incident likelihood modifier factor");
    if (!SEMANTIC_KEY.test(modifier.modifierStableKey)) {
      throw new Error(
        `Incident likelihood modifier snapshot is malformed: ${incident.id}`,
      );
    }
  }
  const consequenceKeys = new Set<string>();
  for (const consequence of evaluation.consequences) {
    if (consequenceKeys.has(consequence.stableKey)) {
      throw new Error(
        `Incident consequence snapshot duplicates a key: ${incident.id}`,
      );
    }
    consequenceKeys.add(consequence.stableKey);
    validateConsequencePlan(world, consequence, incident.onsetAt);
    if (
      !sameMetricValue(
        scaleMetricValue(consequence.baseMagnitude, evaluation.impactShare),
        consequence.scaledMagnitude,
      )
    ) {
      throw new Error(
        `Incident consequence magnitude is inconsistent: ${incident.id}`,
      );
    }
  }
}

function assertIncidentEffect(
  world: World,
  incident: IncidentRecord,
  consequence: IncidentAppliedConsequencePlan,
  stablePrefix: string,
): void {
  const stableKey = `${stablePrefix}:effect:${consequence.stableKey}`;
  const effect = world.history.effectActivations.find(
    (record) => record.stableKey === stableKey,
  );
  if (
    !effect ||
    effect.sequence >= incident.sequence ||
    effect.causalProcessId !== incident.rootCausalProcessId ||
    !effect.sourceEntityIds.includes(incident.onsetEventId) ||
    effect.targetMetricId !== consequence.targetMetricId ||
    !sameScope(effect.targetScope, consequence.targetScope) ||
    !sameMetricValue(effect.magnitude, consequence.scaledMagnitude) ||
    JSON.stringify(effect.magnitudeBasis) !==
      JSON.stringify(consequence.magnitudeBasis) ||
    effect.mechanismDefinitionId !== consequence.mechanismDefinitionId ||
    effect.direction !== consequence.direction ||
    effect.onsetAt !== consequence.onsetAt ||
    effect.maturesAt !== consequence.maturesAt ||
    effect.endsAt !== consequence.endsAt ||
    effect.realizationKind !== consequence.realizationKind
  ) {
    throw new Error(
      `Incident consequence is not an exact Run B effect: ${incident.id}`,
    );
  }
}

function assertResolvedTransitionEffects(
  world: World,
  plans: ReadonlyMap<EntityId, IncidentTransitionPlanRecord>,
  statesByIncident: ReadonlyMap<EntityId, readonly IncidentStateRecord[]>,
): void {
  for (const plan of plans.values()) {
    const dueItem = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === INCIDENT_TRANSITION_KEY &&
        item.entityIds.length === 1 &&
        item.entityIds[0] === plan.id,
    );
    if (!dueItem) continue;
    const dueState = world.history.futureDueItemStates
      .filter((state) => state.dueItemId === dueItem.id)
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1);
    if (!dueState || dueState.status !== "resolved") continue;
    const incident = world.history.incidents.find(
      (candidate) => candidate.id === plan.incidentId,
    );
    const state = (statesByIncident.get(plan.incidentId) ?? []).find(
      (candidate) => candidate.eventId === dueState.outcomeEventId,
    );
    if (
      !incident ||
      !state ||
      state.sequence <= plan.sequence ||
      state.phaseKey !== plan.phaseKey ||
      state.status !== plan.targetStatus
    ) {
      throw new Error(
        `Resolved incident transition has invalid state: ${plan.id}`,
      );
    }
    for (const consequence of plan.consequences) {
      const applied = {
        ...consequence,
        scaledMagnitude: scaleMetricValue(
          consequence.baseMagnitude,
          incident.occurrence.impactShare,
        ),
      };
      const effect = world.history.effectActivations.find(
        (record) =>
          record.stableKey ===
          `${plan.stableKey}:effect:${consequence.stableKey}`,
      );
      if (
        !effect ||
        effect.sequence <= plan.sequence ||
        effect.causalProcessId !== incident.rootCausalProcessId ||
        effect.sourceEntityIds.length !== 1 ||
        effect.sourceEntityIds[0] !== state.eventId ||
        effect.targetMetricId !== applied.targetMetricId ||
        !sameScope(effect.targetScope, applied.targetScope) ||
        !sameMetricValue(effect.magnitude, applied.scaledMagnitude) ||
        JSON.stringify(effect.magnitudeBasis) !==
          JSON.stringify(applied.magnitudeBasis) ||
        effect.mechanismDefinitionId !== applied.mechanismDefinitionId ||
        effect.direction !== applied.direction ||
        effect.onsetAt !== applied.onsetAt ||
        effect.maturesAt !== applied.maturesAt ||
        effect.endsAt !== applied.endsAt ||
        effect.realizationKind !== applied.realizationKind
      ) {
        throw new Error(
          `Resolved incident transition has invalid effect: ${plan.id}`,
        );
      }
    }
  }
}

function validateConsequencePlan(
  world: World,
  plan: IncidentConsequencePlan,
  earliestAt: string,
): void {
  if (
    !SEMANTIC_KEY.test(plan.stableKey) ||
    !SEMANTIC_KEY.test(plan.realizationKind)
  ) {
    throw new Error("Incident consequence plan has invalid semantic key.");
  }
  const metric = world.metricCatalog.definitions[plan.targetMetricId];
  if (!metric || metric.stateSemantics !== "primitive") {
    throw new Error(
      `Incident consequence targets invalid metric: ${plan.stableKey}`,
    );
  }
  validateScope(world, plan.targetScope, "Incident consequence scope");
  validateMetricValue(
    plan.baseMagnitude,
    metric.valueKind,
    metric.quantityUnit,
  );
  const scaledMagnitude = hasScaledMagnitude(plan)
    ? plan.scaledMagnitude
    : plan.baseMagnitude;
  validateMetricValue(scaledMagnitude, metric.valueKind, metric.quantityUnit);
  validateReferencePeriod(plan.referencePeriod, metric.referencePeriodKind);
  if (
    !world.causalMechanismCatalog.definitions[plan.mechanismDefinitionId] ||
    (plan.direction !== "increase" && plan.direction !== "decrease") ||
    plan.onsetAt < earliestAt ||
    plan.maturesAt < plan.onsetAt ||
    (plan.endsAt !== null && plan.endsAt <= plan.maturesAt)
  ) {
    throw new Error(
      `Incident consequence plan has invalid effect timing: ${plan.stableKey}`,
    );
  }
  makeIsoDate(plan.onsetAt);
  makeIsoDate(plan.maturesAt);
  if (plan.endsAt !== null) makeIsoDate(plan.endsAt);
  if (
    (plan.referencePeriod.kind === "point" &&
      plan.magnitudeBasis.kind !== "point-at-target") ||
    (plan.referencePeriod.kind === "interval" &&
      (plan.magnitudeBasis.kind !== "interval-total" ||
        JSON.stringify(plan.magnitudeBasis.referencePeriod) !==
          JSON.stringify(plan.referencePeriod)))
  ) {
    throw new Error(
      `Incident consequence has invalid magnitude basis: ${plan.stableKey}`,
    );
  }
}

function validateCausalProvenance(
  world: World,
  provenance: CausalRecordProvenance,
  sequenceExclusive: number,
): void {
  if (provenance.kind === "simulated") {
    if (provenance.sourceEntityIds.length === 0) {
      throw new Error("Incident simulated provenance requires a source.");
    }
    for (const id of provenance.sourceEntityIds) {
      if (
        !incidentEntityAvailableAt(
          world,
          id,
          world.currentDate,
          sequenceExclusive,
        ) &&
        !world.history.events.some(
          (event) => event.id === id && event.sequence < sequenceExclusive,
        )
      ) {
        throw new Error(`Incident provenance source is unavailable: ${id}`);
      }
    }
  }
}

function latestStateBefore(
  states: readonly IncidentStateRecord[],
  sequenceExclusive: number,
): IncidentStateRecord | null {
  return (
    states
      .filter((state) => state.sequence < sequenceExclusive)
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1) ?? null
  );
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  prefix: EntityKind,
  stableKey: string,
): void {
  if (
    record.id !== createStableId(prefix, `${world.id}:${stableKey}`) ||
    ids.has(record.id)
  ) {
    throw new Error(`Invalid or duplicate ${prefix} identity: ${record.id}`);
  }
  ids.add(record.id);
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

function validateScope(world: World, scope: MetricScope, label: string): void {
  if (!world.jurisdictions[scope.jurisdictionId]) {
    throw new Error(`${label} has missing jurisdiction.`);
  }
  if (scope.segmentKey !== null)
    assertDottedContentKey(scope.segmentKey, label);
}

function validateReferencePeriod(
  period: MetricReferencePeriod,
  expectedKind: "point" | "interval",
): void {
  if (period.kind !== expectedKind) {
    throw new Error("Incident consequence period mismatches target metric.");
  }
  if (period.kind === "point") makeIsoDate(period.at);
  else if (makeIsoDate(period.startsAt) > makeIsoDate(period.endsAt)) {
    throw new Error("Incident consequence interval is reversed.");
  }
}

function validateMetricValue(
  value: WorldMetricValue,
  expectedKind: WorldMetricValue["kind"],
  unit: string | null,
): void {
  if (value.kind !== expectedKind)
    throw new Error("Incident metric value kind mismatches target.");
  if (value.kind === "quantity") {
    assertExactQuantity(value.quantity);
    if (value.quantity.unit !== unit)
      throw new Error("Incident quantity unit mismatches target.");
  } else {
    makeCurrencyCode(value.money.currency);
    if (!Number.isSafeInteger(value.money.minorUnits)) {
      throw new Error("Incident money amount is unsafe.");
    }
  }
}

function scaleMetricValue(
  value: WorldMetricValue,
  factor: ExactQuantity,
): WorldMetricValue {
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: scaleExactQuantity(value.quantity, factor) }
    : {
        kind: "money",
        money: {
          currency: value.money.currency,
          minorUnits: scaleSafeIntegerByExactShare(
            value.money.minorUnits,
            factor,
          ),
        },
      };
}

function sameMetricValue(
  left: WorldMetricValue,
  right: WorldMetricValue,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasScaledMagnitude(
  plan: IncidentConsequencePlan,
): plan is IncidentAppliedConsequencePlan {
  return "scaledMagnitude" in plan;
}

function sameScope(left: MetricScope, right: MetricScope): boolean {
  return (
    left.jurisdictionId === right.jurisdictionId &&
    left.segmentKey === right.segmentKey
  );
}

function assertShare(value: ExactQuantity, label: string): void {
  assertExactQuantity(value);
  if (
    value.unit !== "rate:share" ||
    compareExactQuantities(value, ZERO_SHARE) < 0 ||
    compareExactQuantities(value, ONE_SHARE) > 0
  ) {
    throw new Error(`${label} must be a bounded exact rate:share.`);
  }
}

function validateOptionalNonEmpty(value: string | null, label: string): void {
  if (value !== null && value.trim().length === 0) {
    throw new Error(`${label} must not be blank.`);
  }
}
