import { activateEffect, recordCausalProcess } from "./causal-effects";
import { makeIsoDate } from "./dates";
import { cloneIncidentDefinition } from "./incident-catalog";
import { createStableId } from "./ids";
import {
  compareExactQuantities,
  createExactQuantity,
  multiplyExactShares,
  scaleExactQuantity,
  scaleSafeIntegerByExactShare,
  subtractExactQuantities,
} from "./quantity";
import { SeededRng } from "./rng";
import { scheduleFutureDueItem } from "./future-transitions";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalCutoff,
  EntityId,
  IncidentAppliedConsequencePlan,
  IncidentConsequencePlan,
  IncidentDefinition,
  IncidentEvaluation,
  IncidentLikelihoodModifierEvaluation,
  IncidentRecord,
  IncidentRule,
  IncidentRuleEvaluation,
  IncidentStateRecord,
  IncidentTransitionPlanRecord,
  MetricReferencePeriod,
  MetricScope,
  World,
  WorldMetricValue,
} from "./types";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import { worldMetricStateForPeriodAt } from "./world-metrics";
import { personActionAvailabilityAt } from "./vitality-integrity";

export const INCIDENT_TRANSITION_KEY = "incident:transition" as const;

const ONE_SHARE = createExactQuantity(1, 1, "rate:share");
const ZERO_SHARE = createExactQuantity(0, 1, "rate:share");
const UINT32_RANGE = 4294967296;

export interface EvaluateIncidentInput {
  readonly definitionId: IncidentDefinition["id"];
  readonly evaluationKey: string;
  readonly scope: MetricScope;
  readonly evaluatedAt: string;
  readonly cutoff: HistoricalCutoff;
  readonly exposure: IncidentEvaluation["exposure"];
  readonly vulnerability: IncidentEvaluation["vulnerability"];
  readonly resilience: IncidentEvaluation["resilience"];
  readonly consequences: readonly IncidentConsequencePlan[];
}

export interface OccurIncidentInput {
  readonly stableKey: string;
  readonly evaluation: IncidentEvaluation;
  readonly actorPersonId?: EntityId | null;
  readonly summary: string;
  readonly visibility: "private" | "limited" | "public";
}

export interface RecordIncidentTransitionPlanInput {
  readonly stableKey: string;
  readonly incidentId: IncidentRecord["id"];
  readonly dueAt: string;
  readonly targetStatus: IncidentStateRecord["status"];
  readonly phaseKey: IncidentStateRecord["phaseKey"];
  readonly reasonKey: IncidentStateRecord["reasonKey"];
  readonly context: string | null;
  readonly consequences: readonly IncidentConsequencePlan[];
}

export interface ScheduleIncidentTransitionInput {
  readonly stableKey: string;
  readonly transitionPlanId: IncidentTransitionPlanRecord["id"];
}

export function evaluateIncident(
  world: World,
  input: EvaluateIncidentInput,
): IncidentEvaluation {
  assertWorldIntegrity(world);
  return evaluateIncidentCore(world, input);
}

export function evaluateIncidentCore(
  world: World,
  input: EvaluateIncidentInput,
): IncidentEvaluation {
  const definition = requireIncidentDefinition(world, input.definitionId);
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  validateEvaluationInput(world, input, evaluatedAt);
  const prerequisiteResults = definition.prerequisites.map((rule) =>
    evaluateRule(world, rule, input.scope, evaluatedAt, input.cutoff),
  );
  const blockerResults = definition.blockers.map((rule) =>
    evaluateRule(world, rule, input.scope, evaluatedAt, input.cutoff),
  );
  const eligible =
    prerequisiteResults.every((result) => result.status === "satisfied") &&
    blockerResults.every((result) => result.status !== "satisfied");
  const modifierEvaluations = definition.likelihoodModifiers.map((modifier) =>
    evaluateLikelihoodModifier(world, modifier, input.scope, input.cutoff),
  );
  const likelihood = modifierEvaluations.reduce(
    (current, modifier) =>
      modifier.applied
        ? multiplyExactShares(current, modifier.factor)
        : current,
    definition.baseLikelihood,
  );
  const impactShare = multiplyExactShares(
    multiplyExactShares(input.exposure, input.vulnerability),
    subtractExactQuantities(ONE_SHARE, input.resilience),
  );
  const consequences = input.consequences.map((plan) =>
    applyConsequencePlan(plan, impactShare),
  );
  const rngKey = JSON.stringify([
    "incident-evaluation-v1",
    world.seed,
    definition.stableKey,
    input.evaluationKey,
    input.scope,
    evaluatedAt,
    input.cutoff,
  ]);
  const rng =
    definition.occurrenceMode === "probabilistic"
      ? evaluateProbability(rngKey, likelihood, eligible)
      : null;
  const occurred =
    eligible &&
    (definition.occurrenceMode === "probabilistic"
      ? rng?.occurred === true
      : compareExactQuantities(likelihood, ZERO_SHARE) > 0);
  return {
    definitionId: definition.id,
    evaluationKey: input.evaluationKey,
    scope: { ...input.scope },
    evaluatedAt,
    cutoff: { ...input.cutoff },
    prerequisiteResults,
    blockerResults,
    baseLikelihood: { ...definition.baseLikelihood },
    appliedLikelihoodModifiers: modifierEvaluations,
    likelihood,
    rng,
    exposure: { ...input.exposure },
    vulnerability: { ...input.vulnerability },
    resilience: { ...input.resilience },
    impactShare,
    consequences,
    occurred,
  };
}

export function incidentEvaluationInputFromSnapshot(
  evaluation: IncidentEvaluation,
): EvaluateIncidentInput {
  return {
    definitionId: evaluation.definitionId,
    evaluationKey: evaluation.evaluationKey,
    scope: evaluation.scope,
    evaluatedAt: evaluation.evaluatedAt,
    cutoff: evaluation.cutoff,
    exposure: evaluation.exposure,
    vulnerability: evaluation.vulnerability,
    resilience: evaluation.resilience,
    consequences: evaluation.consequences.map(stripAppliedConsequence),
  };
}

export function occurIncident(world: World, input: OccurIncidentInput): World {
  assertWorldIntegrity(world);
  const definition = requireIncidentDefinition(
    world,
    input.evaluation.definitionId,
  );
  const expected = evaluateIncidentCore(
    world,
    incidentEvaluationInputFromSnapshot(input.evaluation),
  );
  if (
    !expected.occurred ||
    JSON.stringify(expected) !== JSON.stringify(input.evaluation)
  ) {
    throw new Error(
      "Incident occurrence must use an eligible exact evaluation.",
    );
  }
  if (input.evaluation.evaluatedAt !== world.currentDate) {
    throw new Error(
      "Incident occurrence must be recorded at its current evaluation date.",
    );
  }
  if (
    world.history.incidents.some(
      (record) => record.stableKey === input.stableKey,
    )
  ) {
    throw new Error(`Duplicate incident stable key: ${input.stableKey}`);
  }
  if (
    input.actorPersonId !== undefined &&
    input.actorPersonId !== null &&
    !world.people[input.actorPersonId]
  ) {
    throw new Error(`Incident actor is not available: ${input.actorPersonId}`);
  }
  if (definition.occurrenceMode === "actor-initiated" && !input.actorPersonId) {
    throw new Error("Actor-initiated incident occurrence requires an actor.");
  }
  if (
    definition.occurrenceMode === "probabilistic" &&
    input.actorPersonId !== undefined &&
    input.actorPersonId !== null
  ) {
    throw new Error("Probabilistic incident occurrence cannot name an actor.");
  }
  if (input.actorPersonId) {
    const availability = personActionAvailabilityAt(
      world,
      input.actorPersonId,
      {
        asOfDate: input.evaluation.evaluatedAt,
        historySequenceExclusive: world.history.nextSequence,
      },
    );
    if (availability.status === "blocked") {
      throw new Error(
        `Incident actor is blocked: ${availability.reasons.map((reason) => reason.key).join(", ")}`,
      );
    }
  }
  let working = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:occurred`,
    type: "incident.occurred",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.evaluation.scope.jurisdictionId,
    involvedEntityIds: [
      world.id,
      input.evaluation.scope.jurisdictionId,
      ...(input.actorPersonId ? [input.actorPersonId] : []),
    ].sort(),
    participants: input.actorPersonId
      ? [
          {
            personId: input.actorPersonId,
            role: "agency:actor",
            detail: "Initiated this incident occurrence.",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: [...definition.tags, "incident.occurred"],
    summary: input.summary,
    context: incidentEventContext(definition.label),
  });
  const onsetEvent = working.history.events.at(-1);
  if (!onsetEvent)
    throw new Error("Incident occurrence event was not committed.");
  working = recordCausalProcess(working, {
    stableKey: `${input.stableKey}:root`,
    kind: "incident:occurrence",
    effectiveAt: world.currentDate,
    recordedAt: world.currentDate,
    sourceEntityIds: [onsetEvent.id],
    parentCausalIds: [],
    provenance: { kind: "simulated", sourceEntityIds: [onsetEvent.id] },
  });
  const root = working.history.causalProcesses.at(-1);
  if (!root) throw new Error("Incident root cause was not committed.");
  let incident: IncidentRecord = {
    id: createStableId("incident", `${working.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: working.history.nextSequence,
    definitionId: definition.id,
    incidentKind: definition.incidentKind,
    scope: { ...input.evaluation.scope },
    onsetAt: world.currentDate,
    recordedAt: world.currentDate,
    rootCausalProcessId: root.id,
    onsetEventId: onsetEvent.id,
    occurrence: structuredClone(input.evaluation),
    provenance: { kind: "simulated", sourceEntityIds: [onsetEvent.id] },
  };
  for (const consequence of incident.occurrence.consequences) {
    working = activateIncidentConsequence(
      working,
      incident,
      consequence,
      incident.stableKey,
      onsetEvent.id,
    );
  }
  incident = { ...incident, sequence: working.history.nextSequence };
  working = appendIncident(working, incident);
  working = recordIncidentPhaseEvent(working, {
    stableKey: `${input.stableKey}:state:onset:event`,
    incident,
    phaseKey: "incident:onset",
    summary: `${definition.label} entered its onset phase.`,
  });
  const phaseEvent = working.history.events.at(-1);
  if (!phaseEvent)
    throw new Error("Incident onset phase event was not committed.");
  return appendIncidentState(working, {
    stableKey: `${input.stableKey}:state:onset`,
    incidentId: incident.id,
    effectiveAt: world.currentDate,
    status: "active",
    phaseKey: "incident:onset",
    eventId: phaseEvent.id,
    reasonKey: null,
    context: "Incident occurrence was committed from an explicit evaluation.",
    supersedesStateId: null,
    provenance: { kind: "simulated", sourceEntityIds: [incident.id] },
  });
}

export function recordActorInitiatedIncident(
  world: World,
  input: OccurIncidentInput,
): World {
  const definition = requireIncidentDefinition(
    world,
    input.evaluation.definitionId,
  );
  if (definition.occurrenceMode !== "actor-initiated") {
    throw new Error(
      "Actor-initiated incident adapter requires an actor-initiated definition.",
    );
  }
  if (!input.actorPersonId) {
    throw new Error(
      "Actor-initiated incident adapter requires an available actor.",
    );
  }
  return occurIncident(world, input);
}

export function recordIncidentTransitionPlan(
  world: World,
  input: RecordIncidentTransitionPlanInput,
): World {
  assertWorldIntegrity(world);
  if (
    world.history.incidentTransitionPlans.some(
      (plan) => plan.stableKey === input.stableKey,
    )
  ) {
    throw new Error(
      `Duplicate incident transition-plan key: ${input.stableKey}`,
    );
  }
  const incident = requireIncident(world, input.incidentId);
  const latest = latestIncidentState(world, incident.id);
  const dueAt = makeIsoDate(input.dueAt);
  if (!latest || latest.status !== "active" || dueAt <= world.currentDate) {
    throw new Error(
      "Incident transition plan requires an active incident and future due date.",
    );
  }
  const plan: IncidentTransitionPlanRecord = {
    id: createStableId(
      "incident-transition-plan",
      `${world.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    incidentId: incident.id,
    dueAt,
    recordedAt: world.currentDate,
    targetStatus: input.targetStatus,
    phaseKey: input.phaseKey,
    reasonKey: input.reasonKey,
    context: input.context,
    consequences: input.consequences.map((plan) => structuredClone(plan)),
    provenance: { kind: "simulated", sourceEntityIds: [incident.id] },
  };
  return appendTransitionPlan(world, plan);
}

export function scheduleIncidentTransition(
  world: World,
  input: ScheduleIncidentTransitionInput,
): World {
  assertWorldIntegrity(world);
  const plan = requireTransitionPlan(world, input.transitionPlanId);
  const incident = requireIncident(world, plan.incidentId);
  const sourceState = latestIncidentStateBefore(
    world,
    incident.id,
    plan.sequence,
  );
  const stateAtScheduling = latestIncidentState(world, incident.id);
  if (stateAtScheduling?.status !== "active") {
    throw new Error("A terminal incident cannot schedule another transition.");
  }
  if (!sourceState || sourceState.id !== stateAtScheduling.id) {
    throw new Error(
      "Incident transition plan is no longer current when scheduled.",
    );
  }
  if (
    world.history.futureDueItems.some(
      (item) =>
        item.transitionKey === INCIDENT_TRANSITION_KEY &&
        item.entityIds.length === 1 &&
        item.entityIds[0] === plan.id,
    )
  ) {
    throw new Error("Duplicate incident transition due item.");
  }
  return scheduleFutureDueItem(world, {
    stableKey: input.stableKey,
    dueAt: plan.dueAt,
    transitionKey: INCIDENT_TRANSITION_KEY,
    entityIds: [plan.id],
    jurisdictionId: incident.scope.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
  });
}

export function incidentTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  assertWorldIntegrity(world);
  if (
    dueItem.transitionKey !== INCIDENT_TRANSITION_KEY ||
    dueItem.entityIds.length !== 1
  ) {
    throw new Error(`Invalid incident transition due item: ${dueItem.id}`);
  }
  const planId = dueItem.entityIds[0];
  if (!planId)
    throw new Error(`Incident transition due item has no plan: ${dueItem.id}`);
  const plan = requireTransitionPlan(world, planId);
  const incident = requireIncident(world, plan.incidentId);
  const latest = latestIncidentState(world, incident.id);
  if (!latest || latest.status === "resolved") {
    return {
      world,
      status: "cancelled",
      reasonKey: "incident:already-resolved",
      context: "The incident had already reached a terminal state.",
      outcomeEventId: null,
    };
  }
  if (latest.sequence > plan.sequence) {
    return {
      world,
      status: "cancelled",
      reasonKey: "incident:state-advanced",
      context: "Later incident state history made this follow-on obsolete.",
      outcomeEventId: null,
    };
  }
  let working = recordIncidentPhaseEvent(world, {
    stableKey: `${plan.stableKey}:event`,
    incident,
    phaseKey: plan.phaseKey,
    summary: `${requireIncidentDefinition(world, incident.definitionId).label} entered ${plan.phaseKey}.`,
  });
  const event = working.history.events.at(-1);
  if (!event) throw new Error("Incident transition event was not committed.");
  for (const consequence of plan.consequences) {
    working = activateIncidentConsequence(
      working,
      incident,
      applyConsequencePlan(consequence, incident.occurrence.impactShare),
      plan.stableKey,
      event.id,
    );
  }
  working = appendIncidentState(working, {
    stableKey: `${plan.stableKey}:state`,
    incidentId: incident.id,
    effectiveAt: dueItem.dueAt,
    status: plan.targetStatus,
    phaseKey: plan.phaseKey,
    eventId: event.id,
    reasonKey: plan.reasonKey,
    context: plan.context,
    supersedesStateId: latest.id,
    provenance: { kind: "simulated", sourceEntityIds: [incident.id] },
  });
  return {
    world: working,
    status: "resolved",
    reasonKey: plan.reasonKey,
    context: plan.context,
    outcomeEventId: event.id,
  };
}

export function incidentAt(
  world: World,
  incidentId: IncidentRecord["id"],
  cutoff: HistoricalCutoff,
): IncidentRecord | null {
  validateCutoff(world, cutoff);
  const incident = world.history.incidents.find(
    (record) => record.id === incidentId,
  );
  return incident && available(incident.recordedAt, incident.sequence, cutoff)
    ? structuredClone(incident)
    : null;
}

export function incidentStateAt(
  world: World,
  incidentId: IncidentRecord["id"],
  cutoff: HistoricalCutoff,
): IncidentStateRecord | null {
  validateCutoff(world, cutoff);
  const state =
    world.history.incidentStates
      .filter(
        (state) =>
          state.incidentId === incidentId &&
          state.effectiveAt <= cutoff.asOfDate &&
          state.sequence < cutoff.historySequenceExclusive,
      )
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1) ?? null;
  return state ? structuredClone(state) : null;
}

export function activeIncidentsAt(
  world: World,
  cutoff: HistoricalCutoff,
): readonly IncidentRecord[] {
  validateCutoff(world, cutoff);
  return world.history.incidents.flatMap((incident) => {
    const availableIncident = incidentAt(world, incident.id, cutoff);
    return availableIncident &&
      incidentStateAt(world, incident.id, cutoff)?.status === "active"
      ? [availableIncident]
      : [];
  });
}

export function incidentsByDefinitionAt(
  world: World,
  definitionId: IncidentDefinition["id"],
  cutoff: HistoricalCutoff,
): readonly IncidentRecord[] {
  validateCutoff(world, cutoff);
  return world.history.incidents.flatMap((incident) => {
    const availableIncident = incidentAt(world, incident.id, cutoff);
    return incident.definitionId === definitionId && availableIncident
      ? [availableIncident]
      : [];
  });
}

export function incidentsByKindAt(
  world: World,
  incidentKind: IncidentRecord["incidentKind"],
  scope: MetricScope,
  cutoff: HistoricalCutoff,
): readonly IncidentRecord[] {
  validateCutoff(world, cutoff);
  return world.history.incidents.flatMap((incident) => {
    const availableIncident = incidentAt(world, incident.id, cutoff);
    return incident.incidentKind === incidentKind &&
      sameScope(incident.scope, scope) &&
      availableIncident
      ? [availableIncident]
      : [];
  });
}

export function incidentCausalRoot(
  world: World,
  incidentId: IncidentRecord["id"],
  cutoff: HistoricalCutoff,
) {
  const incident = incidentAt(world, incidentId, cutoff);
  if (!incident) return null;
  const root = world.history.causalProcesses.find(
    (record) => record.id === incident.rootCausalProcessId,
  );
  return root && available(root.recordedAt, root.sequence, cutoff)
    ? structuredClone(root)
    : null;
}

export function incidentEventHistory(
  world: World,
  incidentId: IncidentRecord["id"],
  cutoff: HistoricalCutoff,
) {
  const incident = incidentAt(world, incidentId, cutoff);
  if (!incident) return [];
  const eventIds = new Set([
    incident.onsetEventId,
    ...world.history.incidentStates
      .filter((state) => state.incidentId === incident.id)
      .map((state) => state.eventId),
  ]);
  return world.history.events
    .filter(
      (event) =>
        eventIds.has(event.id) &&
        available(event.recordedAt, event.sequence, cutoff),
    )
    .map((event) => structuredClone(event));
}

export function requireIncidentDefinition(
  world: World,
  definitionId: IncidentDefinition["id"],
): IncidentDefinition {
  const definition = world.incidentCatalog.definitions[definitionId];
  if (!definition)
    throw new Error(`Missing incident definition: ${definitionId}`);
  return cloneIncidentDefinition(definition);
}

function evaluateRule(
  world: World,
  rule: IncidentRule,
  scope: MetricScope,
  evaluatedAt: string,
  cutoff: HistoricalCutoff,
): IncidentRuleEvaluation {
  if (rule.kind === "metric-comparison") {
    const period = resolveRulePeriod(world, rule, evaluatedAt);
    if (!period) {
      return unavailableRule(
        rule,
        "The metric has no point period at this evaluation frontier.",
      );
    }
    const state = worldMetricStateForPeriodAt(
      world,
      rule.metricId,
      scope,
      period,
      cutoff,
    );
    if (!state)
      return unavailableRule(
        rule,
        "Required metric state is unavailable at this frontier.",
      );
    const comparison = compareMetricValues(state.value, rule.threshold);
    const satisfied =
      rule.comparison === "at-least" ? comparison >= 0 : comparison <= 0;
    return {
      ruleStableKey: rule.stableKey,
      kind: rule.kind,
      status: satisfied ? "satisfied" : "unsatisfied",
      reasonKey: rule.reasonKey,
      context: `Metric ${rule.comparison} comparison evaluated from canonical state.`,
      sourceEntityIds: [state.id],
    };
  }
  if (rule.kind === "historical-event") {
    const event = world.history.events.find(
      (candidate) =>
        candidate.occurredAt <= evaluatedAt &&
        candidate.sequence < cutoff.historySequenceExclusive &&
        (rule.eventType === null || candidate.type === rule.eventType) &&
        (rule.eventTag === null || candidate.tags.includes(rule.eventTag)),
    );
    return {
      ruleStableKey: rule.stableKey,
      kind: rule.kind,
      status: event ? "satisfied" : "unsatisfied",
      reasonKey: rule.reasonKey,
      context: event
        ? "Required historical event is available."
        : "No matching historical event is available.",
      sourceEntityIds: event ? [event.id] : [],
    };
  }
  const candidates = activeIncidentStates(world, cutoff).filter(
    ({ incident, state }) =>
      incident.definitionId === rule.definitionId &&
      sameScope(incident.scope, scope) &&
      state.status === rule.status &&
      (rule.phaseKey === null || state.phaseKey === rule.phaseKey),
  );
  return {
    ruleStableKey: rule.stableKey,
    kind: rule.kind,
    status: candidates.length > 0 ? "satisfied" : "unsatisfied",
    reasonKey: rule.reasonKey,
    context:
      candidates.length > 0
        ? "Required incident state is available."
        : "No matching incident state is available.",
    sourceEntityIds: candidates.map(({ incident }) => incident.id).sort(),
  };
}

function evaluateLikelihoodModifier(
  world: World,
  modifier: IncidentDefinition["likelihoodModifiers"][number],
  scope: MetricScope,
  cutoff: HistoricalCutoff,
): IncidentLikelihoodModifierEvaluation {
  const sources = activeIncidentStates(world, cutoff)
    .filter(
      ({ incident, state }) =>
        incident.definitionId === modifier.definitionId &&
        sameScope(incident.scope, scope) &&
        state.status === "active",
    )
    .map(({ incident }) => incident.id)
    .sort();
  return {
    modifierStableKey: modifier.stableKey,
    applied: sources.length > 0,
    factor: { ...modifier.factor },
    reasonKey: modifier.reasonKey,
    sourceEntityIds: sources,
  };
}

function activeIncidentStates(world: World, cutoff: HistoricalCutoff) {
  return world.history.incidents.flatMap((incident) => {
    if (!available(incident.recordedAt, incident.sequence, cutoff)) return [];
    const state = incidentStateAt(world, incident.id, cutoff);
    return state ? [{ incident, state }] : [];
  });
}

function evaluateProbability(
  key: string,
  likelihood: IncidentEvaluation["likelihood"],
  eligible: boolean,
) {
  const draw = new SeededRng("incident-rng-v1").fork(key).nextUint32();
  const occurred =
    eligible &&
    BigInt(draw) * BigInt(likelihood.denominator) <
      BigInt(likelihood.numerator) * BigInt(UINT32_RANGE);
  return { key, draw, drawRangeExclusive: 4294967296 as const, occurred };
}

function validateEvaluationInput(
  world: World,
  input: EvaluateIncidentInput,
  evaluatedAt: string,
): void {
  if (
    input.evaluationKey.trim().length === 0 ||
    evaluatedAt !== input.cutoff.asOfDate ||
    evaluatedAt > world.currentDate ||
    input.cutoff.historySequenceExclusive < 0 ||
    input.cutoff.historySequenceExclusive > world.history.nextSequence ||
    !world.jurisdictions[input.scope.jurisdictionId]
  ) {
    throw new Error("Incident evaluation has an invalid frontier or scope.");
  }
  for (const share of [input.exposure, input.vulnerability, input.resilience]) {
    assertShare(share);
  }
  const keys = new Set<string>();
  for (const plan of input.consequences) {
    if (keys.has(plan.stableKey))
      throw new Error("Incident consequences duplicate a stable key.");
    keys.add(plan.stableKey);
    validateConsequenceInput(world, plan, evaluatedAt);
  }
}

function resolveRulePeriod(
  world: World,
  rule: Extract<IncidentRule, { readonly kind: "metric-comparison" }>,
  evaluatedAt: string,
): MetricReferencePeriod | null {
  if (rule.reference.kind === "exact") return rule.reference.referencePeriod;
  const definition = world.metricCatalog.definitions[rule.metricId];
  return definition?.referencePeriodKind === "point"
    ? { kind: "point", at: makeIsoDate(evaluatedAt) }
    : null;
}

function unavailableRule(
  rule: IncidentRule,
  context: string,
): IncidentRuleEvaluation {
  return {
    ruleStableKey: rule.stableKey,
    kind: rule.kind,
    status: "unavailable",
    reasonKey: rule.reasonKey,
    context,
    sourceEntityIds: [],
  };
}

function applyConsequencePlan(
  plan: IncidentConsequencePlan,
  impactShare: IncidentEvaluation["impactShare"],
): IncidentAppliedConsequencePlan {
  return {
    ...structuredClone(plan),
    scaledMagnitude: scaleMetricValue(plan.baseMagnitude, impactShare),
  };
}

function stripAppliedConsequence(
  plan: IncidentAppliedConsequencePlan,
): IncidentConsequencePlan {
  const base = structuredClone(plan) as {
    scaledMagnitude?: WorldMetricValue;
  } & IncidentConsequencePlan;
  delete base.scaledMagnitude;
  return base;
}

function appendIncident(world: World, incident: IncidentRecord): World {
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      incidents: [...world.history.incidents, incident],
    },
  };
}

function appendIncidentState(
  world: World,
  input: Omit<IncidentStateRecord, "id" | "sequence">,
): World {
  const state: IncidentStateRecord = {
    ...input,
    id: createStableId("incident-state", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      incidentStates: [...world.history.incidentStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function appendTransitionPlan(
  world: World,
  plan: IncidentTransitionPlanRecord,
): World {
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      incidentTransitionPlans: [...world.history.incidentTransitionPlans, plan],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function recordIncidentPhaseEvent(
  world: World,
  input: {
    readonly stableKey: string;
    readonly incident: IncidentRecord;
    readonly phaseKey: string;
    readonly summary: string;
  },
): World {
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: "incident.phase",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.incident.scope.jurisdictionId,
    involvedEntityIds: [input.incident.id, input.incident.scope.jurisdictionId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["incident.phase", input.phaseKey.replace(":", ".")],
    summary: input.summary,
    context: incidentEventContext(input.phaseKey),
  });
}

function activateIncidentConsequence(
  world: World,
  incident: IncidentRecord,
  consequence: IncidentAppliedConsequencePlan,
  stablePrefix: string,
  sourceEventId: EntityId,
): World {
  return activateEffect(world, {
    stableKey: `${stablePrefix}:effect:${consequence.stableKey}`,
    mechanismDefinitionId: consequence.mechanismDefinitionId,
    causalProcessId: incident.rootCausalProcessId,
    targetMetricId: consequence.targetMetricId,
    targetScope: consequence.targetScope,
    direction: consequence.direction,
    magnitude: consequence.scaledMagnitude,
    magnitudeBasis: consequence.magnitudeBasis,
    activatedAt: world.currentDate,
    onsetAt: consequence.onsetAt,
    maturesAt: consequence.maturesAt,
    endsAt: consequence.endsAt,
    threshold: null,
    targetBound: null,
    realizationKind: consequence.realizationKind,
    sourceEntityIds: [sourceEventId],
    recordedAt: world.currentDate,
  });
}

function requireIncident(
  world: World,
  incidentId: IncidentRecord["id"],
): IncidentRecord {
  const incident = world.history.incidents.find(
    (record) => record.id === incidentId,
  );
  if (!incident) throw new Error(`Missing incident: ${incidentId}`);
  return incident;
}

function requireTransitionPlan(
  world: World,
  planId: IncidentTransitionPlanRecord["id"],
): IncidentTransitionPlanRecord {
  const plan = world.history.incidentTransitionPlans.find(
    (record) => record.id === planId,
  );
  if (!plan) throw new Error(`Missing incident transition plan: ${planId}`);
  return plan;
}

function latestIncidentState(
  world: World,
  incidentId: IncidentRecord["id"],
): IncidentStateRecord | null {
  return (
    world.history.incidentStates
      .filter((state) => state.incidentId === incidentId)
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1) ?? null
  );
}

function latestIncidentStateBefore(
  world: World,
  incidentId: IncidentRecord["id"],
  sequenceExclusive: number,
): IncidentStateRecord | null {
  return (
    world.history.incidentStates
      .filter(
        (state) =>
          state.incidentId === incidentId && state.sequence < sequenceExclusive,
      )
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1) ?? null
  );
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  makeIsoDate(cutoff.asOfDate);
  if (
    cutoff.asOfDate > world.currentDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Incident cutoff is invalid.");
  }
}

function available(
  recordedAt: string,
  sequence: number,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    recordedAt <= cutoff.asOfDate && sequence < cutoff.historySequenceExclusive
  );
}

function validateConsequenceInput(
  world: World,
  plan: IncidentConsequencePlan,
  earliestAt: string,
): void {
  if (
    !world.metricCatalog.definitions[plan.targetMetricId] ||
    !world.causalMechanismCatalog.definitions[plan.mechanismDefinitionId] ||
    plan.onsetAt < earliestAt ||
    plan.maturesAt < plan.onsetAt ||
    (plan.endsAt !== null && plan.endsAt <= plan.maturesAt)
  ) {
    throw new Error("Incident consequence plan is invalid.");
  }
  makeIsoDate(plan.onsetAt);
  makeIsoDate(plan.maturesAt);
  if (plan.endsAt !== null) makeIsoDate(plan.endsAt);
}

function compareMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): -1 | 0 | 1 {
  if (left.kind !== right.kind)
    throw new Error("Incident metric comparison is incompatible.");
  if (left.kind === "quantity" && right.kind === "quantity") {
    return compareExactQuantities(left.quantity, right.quantity);
  }
  if (left.kind === "money" && right.kind === "money") {
    if (left.money.currency !== right.money.currency) {
      throw new Error("Incident money comparison has incompatible currencies.");
    }
    return left.money.minorUnits < right.money.minorUnits
      ? -1
      : left.money.minorUnits > right.money.minorUnits
        ? 1
        : 0;
  }
  throw new Error("Incident metric comparison is incompatible.");
}

function scaleMetricValue(
  value: WorldMetricValue,
  factor: IncidentEvaluation["impactShare"],
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

function assertShare(share: IncidentEvaluation["exposure"]): void {
  if (
    share.unit !== "rate:share" ||
    compareExactQuantities(share, ZERO_SHARE) < 0 ||
    compareExactQuantities(share, ONE_SHARE) > 0
  ) {
    throw new Error("Incident shares must be bounded exact rate:share values.");
  }
}

function sameScope(left: MetricScope, right: MetricScope): boolean {
  return (
    left.jurisdictionId === right.jurisdictionId &&
    left.segmentKey === right.segmentKey
  );
}

function incidentEventContext(setting: string) {
  return {
    location: null,
    socialContext: "Explicit generalized incident history.",
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: setting,
  };
}
