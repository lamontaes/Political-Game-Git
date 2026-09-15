import {
  TRANSIT_METRIC_INPUT,
  TRANSIT_MECHANISM_INPUT,
} from "./transit-contract-definitions";
import { canonicalJson } from "./canonical-json";
import { createOrganization } from "./life";
import { createStableId, stableHash } from "./ids";
import { addDays } from "./dates";
import {
  createWorldMetricDefinition,
  createWorldMetricCatalog,
  recordWorldMetricState,
} from "./world-metrics";
import {
  createCausalMechanismDefinition,
  createCausalMechanismCatalog,
  recordEvaluatedMetricState,
} from "./causal-effects";
import { createExactQuantity } from "./quantity";
import { money } from "./resources";
import {
  recordPolicyAlternative,
  recordPolicyBaseline,
  recordPolicyOperation,
  recordPolicyImplementationProfile,
  recordPolicyProjectionRoot,
  recordPolicyEstimate,
  directPolicyImplementationFactor,
  resourceRatioPolicyImplementationFactor,
  realizePolicyEstimate,
} from "./policy-semantics";
import { recordPolicyAnalysisKnowledge } from "./policy-decision";
import { recordEventKnowledge } from "./records";
import { publishPublicEvent } from "./public-information";
import {
  scheduleFutureDueItem,
  cancelFutureDueItem,
  futureDueItemStateAt,
  createFutureTransitionHandlerRegistry,
} from "./future-transitions";
import { createWorkItem, workItemState } from "./time-work";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import {
  resolveTransitFunding,
  type TransitFundingMandate,
} from "./transit-funding";
import { TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR } from "./legislation-transit-families";
import type { PublicPaymentInput, PublicPaymentResult } from "./public-fiscal";
import type {
  EntityId,
  FutureDueItem,
  FutureDueReasonKey,
  MetricScope,
  FutureTransitionHandlerResult,
  MoneyAmount,
  PolicyEstimateRecord,
  PolicyRecordProvenance,
  World,
} from "./types";

export const TRANSIT_DELIVERY_KEY = "transit:deliver-stage";
const authored: PolicyRecordProvenance = {
  kind: "authored",
  note: "Additional service under an authored $100 per vehicle-service-hour contract. These are physical service units, not real-world effectiveness, ridership, access or opinion.",
};
function transitMetric() {
  return createWorldMetricDefinition(TRANSIT_METRIC_INPUT);
}
function transitMechanism() {
  return createCausalMechanismDefinition(TRANSIT_MECHANISM_INPUT);
}
const units = (numerator: number, denominator = 1) => ({
  kind: "quantity" as const,
  quantity: createExactQuantity(
    numerator,
    denominator,
    "duration:vehicle-service-hour",
  ),
});
const moneyValue = (amount: MoneyAmount) => ({
  kind: "money" as const,
  money: amount,
});

/** Exact paid contract hours in words. The authored price is a power of ten
 * cents per hour, so a partial hour keeps its exact decimal, never a rounding. */
export function serviceHoursText(paidMinorUnits: number): string {
  const price = TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR;
  const whole = Math.floor(paidMinorUnits / price);
  const rest = paidMinorUnits % price;
  const text =
    rest === 0
      ? String(whole)
      : `${whole}.${String(rest)
          .padStart(String(price).length - 1, "0")
          .replace(/0+$/, "")}`;
  return `${text} vehicle-service ${text === "1" ? "hour" : "hours"}`;
}
export function dollarsText(amount: MoneyAmount): string {
  return (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
  });
}

/** F supplies the public payment writer; T neither creates nor credits accounts. */
export type TransitPaymentRequest = PublicPaymentInput;
export type TransitPaymentWriter = (
  world: World,
  input: TransitPaymentRequest,
  resolveFunding: typeof resolveTransitFunding,
) => PublicPaymentResult;

function requireFunding(
  world: World,
  measureId: EntityId,
): TransitFundingMandate {
  const r = resolveTransitFunding(world, measureId);
  if (r.kind === "unavailable") throw new Error(r.reason);
  return r.mandate;
}
export function transitDueState(world: World, dueItemId: EntityId) {
  const state = futureDueItemStateAt(world, dueItemId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (!state) throw new Error("Transit due item has no canonical state.");
  return state;
}
function requestKey(measureId: EntityId) {
  return `transit-request:${measureId}`;
}
function stageEstimate(world: World, due: FutureDueItem): PolicyEstimateRecord {
  const candidates = world.history.policyEstimates.filter((r) =>
    due.entityIds.includes(r.id),
  );
  if (due.transitionKey !== TRANSIT_DELIVERY_KEY || candidates.length !== 1)
    throw new Error("Transit stage must name exactly one estimate.");
  return candidates[0]!;
}
function stageMeasure(world: World, due: FutureDueItem) {
  const candidates = (world.history.legislativeMeasures ?? []).filter((r) =>
    due.entityIds.includes(r.id),
  );
  if (
    candidates.length !== 1 ||
    candidates[0]!.jurisdictionId !== due.jurisdictionId
  )
    throw new Error("Transit stage has no matching governing appropriation.");
  return candidates[0]!;
}
function factors(
  amount: MoneyAmount,
  paid: MoneyAmount,
  evidence: EntityId[],
  allowed = true,
) {
  const one = createExactQuantity(1, 1, "rate:share");
  const zero = createExactQuantity(0, 1, "rate:share");
  return [
    directPolicyImplementationFactor({
      kind: "authority",
      share: allowed ? one : zero,
      reasonKey: allowed
        ? "transit:operative-mandate"
        : "transit:authority-unavailable",
      explanation: allowed
        ? "The exact operative appropriation authorizes this service request."
        : "Funding authority is unavailable.",
      evidenceEntityIds: evidence,
    }),
    resourceRatioPolicyImplementationFactor({
      kind: "funding",
      required: moneyValue(amount),
      available: moneyValue(paid),
      reasonKey: "transit:paid-contract-coverage",
      explanation:
        "Only the fraction of the contract actually paid is recorded as service.",
      evidenceEntityIds: evidence,
    }),
    ...(
      [
        "administrative-capacity",
        "enforcement-compliance",
        "uptake-participation",
      ] as const
    ).map((kind) =>
      directPolicyImplementationFactor({
        kind,
        share: one,
        reasonKey: "transit:contract-units-only",
        explanation:
          "Arithmetic identity for an excluded response. This records contract service units; it does not assess capacity, compliance, uptake, or any political entity or policy.",
        evidenceEntityIds: evidence,
      }),
    ),
  ];
}
/** Explicit sponsor request. Caller must first reconcile the actual office at the presentation boundary. */
export function requestTransitImplementation(
  world: World,
  input: { readonly measureId: EntityId; readonly personId: EntityId },
): World {
  assertWorldIntegrity(world);
  const metric = transitMetric();
  const mechanism = transitMechanism();
  const mandate = requireFunding(world, input.measureId);
  const measure = (world.history.legislativeMeasures ?? []).find(
    (r) => r.id === input.measureId,
  )!;
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId ||
    measure.sponsorPersonId !== input.personId
  )
    throw new Error(
      "Only the controlled sponsor may request this transit implementation.",
    );
  const key = requestKey(measure.id);
  if (world.history.events.some((r) => r.stableKey === key))
    throw new Error(
      "This appropriation already has an implementation request.",
    );
  if (addDays(world.currentDate, 28) > mandate.endsAt)
    throw new Error(
      "Two service periods cannot finish before this appropriation expires.",
    );
  let next: World = {
    ...world,
    metricCatalog: createWorldMetricCatalog({
      definitions: [
        ...world.metricCatalog.definitionOrder.map(
          (id) => world.metricCatalog.definitions[id]!,
        ),
        ...(!world.metricCatalog.definitions[metric.id] ? [metric] : []),
      ],
    }),
    causalMechanismCatalog: createCausalMechanismCatalog({
      definitions: [
        ...world.causalMechanismCatalog.definitionOrder.map(
          (id) => world.causalMechanismCatalog.definitions[id]!,
        ),
        ...(!world.causalMechanismCatalog.definitions[mechanism.id]
          ? [mechanism]
          : []),
      ],
    }),
  };
  next = recordWorldEvent(next, {
    stableKey: key,
    type: "transit.implementation-requested",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: mandate.jurisdictionId,
    involvedEntityIds: [
      input.personId,
      measure.id,
      mandate.fundingId,
      ...mandate.provisionIds,
    ].sort(),
    participants: [
      {
        personId: input.personId,
        role: "agency:transit-request",
        detail:
          "Requested service under the enacted appropriation; not an executive spending act.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["transit.request"],
    summary: `Requested two ${mandate.serviceWindow} service periods under ${measure.designation}. Delivery depends on actual public cash.`,
    context: {
      location: null,
      socialContext: "Transit implementation request",
      pressure: null,
      choice: mandate.serviceWindow,
      motivation: null,
      immediateReaction: null,
    },
  });
  const requestEvent = next.history.events.at(-1)!;
  const amounts = [
    Math.floor(mandate.amount.minorUnits / 2),
    mandate.amount.minorUnits - Math.floor(mandate.amount.minorUnits / 2),
  ];
  for (const [index, amount] of amounts.entries()) {
    const sk = `${key}:period-${index + 1}`;
    const dueAt = addDays(world.currentDate, 14 * (index + 1));
    const period = {
      kind: "point" as const,
      at: dueAt,
    };
    const scope: MetricScope = {
      jurisdictionId: mandate.jurisdictionId,
      segmentKey: `transit.contract-${stableHash(measure.id)}.period-${index + 1}-${mandate.serviceWindow}`,
    };
    next = recordPolicyAlternative(next, {
      stableKey: sk,
      alternativeKind: "request:transit-service-period",
      title: `Additional ${mandate.serviceWindow} service — period ${index + 1}`,
      summary:
        "Authored contract service request; not delivery or publication.",
      propositionId: null,
      proposedAt: next.currentDate,
      recordedAt: next.currentDate,
      provenance: { kind: "simulated", sourceEntityIds: [requestEvent.id] },
    });
    const alternativeId = next.history.policyAlternatives.at(-1)!.id;
    next = recordPolicyBaseline(next, {
      stableKey: `${sk}:baseline`,
      seriesKey: `baseline:transit-${alternativeId}`,
      metricId: metric.id,
      scope,
      referencePeriod: period,
      expectedValue: units(0),
      generatedAt: next.currentDate,
      recordedAt: next.currentDate,
      sourceEntityIds: [requestEvent.id],
      methodologyKey: "forecast:additional-contract-service-v1",
      assumptionKeys: ["assumption:additional-service-only"],
      uncertainty: { kind: "none" },
      provenance: authored,
      supersedesBaselineId: null,
    });
    const baselineId = next.history.policyBaselines.at(-1)!.id;
    next = recordPolicyOperation(next, {
      stableKey: `${sk}:operation`,
      alternativeId,
      targetMetricId: metric.id,
      targetScope: scope,
      targetReferencePeriod: period,
      targetBaselineId: baselineId,
      operation: {
        kind: "absolute-change",
        direction: "increase",
        magnitude: units(amount, TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR),
      },
      trigger: null,
      mechanismDefinitionId: mechanism.id,
      realizationKind: "transit:completed-contract-service",
      timing: { startsAt: dueAt, maturesAt: dueAt, endsAt: addDays(dueAt, 1) },
      recordedAt: next.currentDate,
      provenance: authored,
    });
    const operationIds = [next.history.policyOperations.at(-1)!.id];
    next = recordPolicyImplementationProfile(next, {
      stableKey: `${sk}:forecast-profile`,
      alternativeId,
      operationIds,
      factors: factors(money(amount, "USD"), money(amount, "USD"), [
        requestEvent.id,
      ]),
      assessedAt: next.currentDate,
      recordedAt: next.currentDate,
      provenance: authored,
    });
    const profileId = next.history.policyImplementationProfiles.at(-1)!.id;
    next = recordPolicyProjectionRoot(next, {
      stableKey: `${sk}:projection`,
      alternativeId,
      operationIds,
      effectiveAt: next.currentDate,
      recordedAt: next.currentDate,
    });
    const projectedCausalProcessId = next.history.causalProcesses.at(-1)!.id;
    next = recordPolicyEstimate(next, {
      stableKey: `${sk}:estimate`,
      seriesKey: `estimate:transit-${alternativeId}`,
      alternativeId,
      operationIds,
      implementationProfileId: profileId,
      projectedCausalProcessId,
      generatedAt: next.currentDate,
      recordedAt: next.currentDate,
      provenance: authored,
      supersedesEstimateId: null,
    });
    const estimateId = next.history.policyEstimates.at(-1)!.id;
    next = recordPolicyAnalysisKnowledge(next, {
      stableKey: `${sk}:review`,
      personId: input.personId,
      estimateId,
      summary:
        "Reviewed an authored contract forecast; cash and delivery remain unconfirmed.",
      believedSummary:
        "The forecast is conditional on payment for the completed service period.",
      accuracy: "accurate",
      confidence: "low",
      visibility: "private",
    });
    next = scheduleFutureDueItem(next, {
      stableKey: `${sk}:due`,
      dueAt,
      transitionKey: TRANSIT_DELIVERY_KEY,
      entityIds: [input.personId, measure.id, estimateId].sort(),
      jurisdictionId: mandate.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [requestEvent.id] },
    });
  }
  next = createWorkItem(next, {
    stableKey: key,
    title: "Transit service implementation",
    summary:
      "Two service periods are pending payment and delivery. You may cancel undelivered periods.",
    jurisdictionId: mandate.jurisdictionId,
    sourceEntityIds: [requestEvent.id],
    focus: {
      kind: "other",
      targetKey: "transit:implementation",
      sourceEntityId: requestEvent.id,
    },
    effort: null,
    access: { kind: "private", personIds: [input.personId] },
    assignedPersonIds: [input.personId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  return next;
}

/** At the canonical due event: authority -> F payment -> exact paid service -> optional publication. */
export function deliverTransitStage(
  world: World,
  due: FutureDueItem,
  pay: TransitPaymentWriter,
): FutureTransitionHandlerResult {
  const canonicalDue = world.history.futureDueItems.find(
    (d) => d.id === due.id,
  );
  if (!canonicalDue || canonicalJson(canonicalDue) !== canonicalJson(due))
    throw new Error("Transit dispatch requires the exact canonical due item.");
  const estimate = stageEstimate(world, due);
  const measure = stageMeasure(world, due);
  const result = (
    w: World,
    status: "resolved" | "blocked" | "cancelled",
    reasonKey: FutureDueReasonKey | null,
    context: string,
    eventId: EntityId | null,
  ): FutureTransitionHandlerResult => ({
    world: w,
    status,
    reasonKey,
    context,
    outcomeEventId: eventId,
  });
  const state = transitDueState(world, due.id);
  if (state.status !== "scheduled")
    return result(
      world,
      state.status,
      state.reasonKey,
      state.context ?? "Stage already closed.",
      state.outcomeEventId,
    );
  const prior = world.history.policyRealizations.find(
    (r) => r.estimateId === estimate.id,
  );
  if (prior)
    return result(world, "resolved", null, "Stage already realized.", null);
  if (world.currentDate !== due.dueAt)
    throw new Error("Transit delivery must run at its canonical due date.");
  const profile = world.history.policyImplementationProfiles.find(
    (r) => r.id === estimate.implementationProfileId,
  )!;
  const funding = profile.factors.find((f) => f.kind === "funding")!;
  if (
    funding.basis.kind !== "resource-ratio" ||
    funding.basis.required.kind !== "money"
  )
    throw new Error("Transit stage has no frozen contract cost.");
  const amount = funding.basis.required.money;
  const mandate = resolveTransitFunding(world, measure.id);
  const request = world.history.events.find(
    (r) => r.stableKey === requestKey(measure.id),
  );
  if (!request) throw new Error("Transit stage lost its canonical request.");
  const expectedProvisionIds = (world.history.legislativeProvisions ?? [])
    .filter((p) => request.involvedEntityIds.includes(p.id))
    .map((p) => p.id)
    .sort();
  let next = world;
  let paymentFlowId: EntityId | null = null;
  let paid = money(0, "USD");
  let refusal: string | null =
    mandate.kind === "unavailable" ? mandate.reason : null;
  if (mandate.kind === "available") {
    const contractorKey = `transit-contractor:${measure.jurisdictionId}`;
    let contractor = next.history.organizations.find(
      (o) => o.stableKey === contractorKey,
    );
    if (!contractor) {
      next = createOrganization(next, {
        stableKey: contractorKey,
        formedAt: next.currentDate,
        provenance: {
          kind: "authored",
          note: "Fictional transit contract provider, with no seeded balance or invented official.",
        },
        initialProfile: {
          name: "Authored transit service contractor",
          classification: "sector:private",
          locationJurisdictionId: measure.jurisdictionId,
        },
      });
      contractor = next.history.organizations.at(-1)!;
    }
    const payment = pay(
      next,
      {
        fundingId: mandate.mandate.fundingId,
        measureId: measure.id,
        expectedProvisionIds,
        operationKey: due.id,
        requestedAmount: amount,
        recipient: { kind: "organization", organizationId: contractor.id },
      },
      resolveTransitFunding,
    );
    next = payment.world;
    if (payment.kind === "refused") refusal = payment.reason;
    else {
      const outcome = next.history.resourceTransferOutcomes.find(
        (r) => r.id === payment.outcomeId,
      );
      const flow = next.history.resourceFlows.find(
        (f) => f.id === outcome?.resourceFlowId,
      );
      if (
        !outcome ||
        outcome.status !== "completed" ||
        outcome.occurredAt !== due.dueAt ||
        !flow ||
        flow.source.kind !== "organization" ||
        flow.source.organizationId !== payment.publicOrganizationId ||
        canonicalJson(flow.recipient) !==
          canonicalJson({
            kind: "organization",
            organizationId: contractor.id,
          }) ||
        flow.basisReference.kind !== "public-funding" ||
        flow.basisReference.operationKey !== due.id ||
        flow.basisReference.mandate.fundingId !== mandate.mandate.fundingId ||
        canonicalJson(flow.basisReference.mandate.provisionIds) !==
          canonicalJson(expectedProvisionIds) ||
        outcome.transferredAmount.currency !== amount.currency ||
        canonicalJson(outcome.attemptedAmount) !== canonicalJson(amount) ||
        canonicalJson(outcome.transferredAmount) !== canonicalJson(amount)
      )
        throw new Error("Public payment returned an incompatible settlement.");
      paymentFlowId = flow.id;
      paid = outcome.transferredAmount;
    }
  }
  next = recordWorldEvent(next, {
    stableKey: `${due.stableKey}:settlement`,
    type: "transit.service-period-settled",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      estimate.id,
      measure.id,
      request.participants[0]!.personId,
      ...(paymentFlowId ? [paymentFlowId] : []),
    ].sort(),
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["transit.service"],
    summary: refusal
      ? `The service period ending ${due.dueAt} was not delivered, and nothing was paid. ${refusal}`
      : `Delivered ${serviceHoursText(paid.minorUnits)} of added contract service for the period ending ${due.dueAt}, paid with ${dollarsText(paid)} from the public account. This is a modeled contract record, not observed ridership, travel time or access.`,
    context: {
      location: null,
      socialContext: "Completed service-period settlement",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: refusal,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = recordPolicyImplementationProfile(next, {
    stableKey: `${due.stableKey}:actual-profile`,
    alternativeId: estimate.alternativeId,
    operationIds: estimate.operationIds,
    factors: factors(
      amount,
      paid,
      [eventId],
      mandate.kind === "available" &&
        canonicalJson(mandate.mandate.provisionIds) ===
          canonicalJson(expectedProvisionIds),
    ),
    assessedAt: next.currentDate,
    recordedAt: next.currentDate,
    provenance: { kind: "simulated", sourceEntityIds: [eventId] },
  });
  next = realizePolicyEstimate(next, {
    stableKey: `${due.stableKey}:realization`,
    estimateId: estimate.id,
    implementationProfileId:
      next.history.policyImplementationProfiles.at(-1)!.id,
    provenance: { kind: "simulated", sourceEntityIds: [eventId] },
  });
  const realization = next.history.policyRealizations.at(-1)!;
  if (realization.consequences.length) {
    const metric = transitMetric();
    const op = next.history.policyOperations.find(
      (r) => r.id === estimate.operationIds[0],
    )!;
    next = recordWorldMetricState(next, {
      stableKey: `${due.stableKey}:zero-additional`,
      metricId: metric.id,
      scope: op.targetScope,
      referencePeriod: op.targetReferencePeriod,
      value: units(0),
      recordedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: "Zero additional units before this unique contract period; not a baseline for existing transit service.",
      },
      supersedesStateId: null,
    });
    next = recordEvaluatedMetricState(next, {
      stableKey: `${due.stableKey}:delivered`,
      baselineStateId: next.history.metricStates.at(-1)!.id,
      evaluatedAt: next.currentDate,
      referencePeriod: op.targetReferencePeriod,
    });
  }
  const personId = request.participants[0]!.personId;
  next = recordEventKnowledge(next, {
    stableKey: `${due.stableKey}:notice`,
    personId,
    eventId,
    learnedAt: next.currentDate,
    believedSummary: next.history.events.find((e) => e.id === eventId)!.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return result(
    closeTransitWork(next, measure.id, due.id),
    refusal ? "blocked" : "resolved",
    refusal ? "transit:payment-or-authority-refused" : null,
    refusal ?? "Service period recorded from actual paid contract units.",
    eventId,
  );
}
export function createTransitTransitionRegistry(pay: TransitPaymentWriter) {
  return createFutureTransitionHandlerRegistry([
    [TRANSIT_DELIVERY_KEY, (w, due) => deliverTransitStage(w, due, pay)],
  ]);
}

export function cancelTransitImplementation(
  world: World,
  input: { readonly measureId: EntityId; readonly personId: EntityId },
): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (m) => m.id === input.measureId,
  );
  if (
    !measure ||
    world.control.kind !== "person" ||
    world.control.personId !== input.personId ||
    measure.sponsorPersonId !== input.personId
  )
    throw new Error(
      "Only the controlled sponsor may cancel undelivered periods.",
    );
  let next = world;
  const dueItems = world.history.futureDueItems.filter(
    (d) =>
      d.transitionKey === TRANSIT_DELIVERY_KEY &&
      d.entityIds.includes(measure.id) &&
      transitDueState(world, d.id).status === "scheduled",
  );
  if (!dueItems.length)
    throw new Error("No undelivered service period remains to cancel.");
  for (const due of dueItems)
    next = cancelFutureDueItem(next, {
      stableKey: `${due.stableKey}:cancel`,
      dueItemId: due.id,
      effectiveAt: next.currentDate,
      reasonKey: "transit:sponsor-cancelled",
      context:
        "Cancelled undelivered service only; prior payments and delivered hours stand.",
    });
  next = recordWorldEvent(next, {
    stableKey: `${requestKey(measure.id)}:cancel`,
    type: "transit.undelivered-service-cancelled",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      measure.id,
      input.personId,
      ...dueItems.map((d) => d.id),
    ].sort(),
    participants: [
      {
        personId: input.personId,
        role: "agency:transit-cancellation",
        detail: "Cancelled undelivered periods.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["transit.cancellation"],
    summary:
      "Undelivered transit service was cancelled. Prior completed payments and vehicle-service hours remain in history.",
    context: {
      location: null,
      socialContext: "Transit cancellation",
      pressure: null,
      choice: "Cancel remaining periods",
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = recordEventKnowledge(next, {
    stableKey: `${requestKey(measure.id)}:cancel-notice`,
    personId: input.personId,
    eventId,
    learnedAt: next.currentDate,
    believedSummary: next.history.events.at(-1)!.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  return closeTransitWork(next, measure.id);
}
export function closeTransitWork(
  world: World,
  measureId: EntityId,
  completingDueId?: EntityId,
): World {
  if (
    world.history.futureDueItems.some(
      (d) =>
        d.transitionKey === TRANSIT_DELIVERY_KEY &&
        d.entityIds.includes(measureId) &&
        d.id !== completingDueId &&
        transitDueState(world, d.id).status === "scheduled",
    )
  )
    return world;
  const work = world.history.workItems.find(
    (w) => w.stableKey === requestKey(measureId),
  );
  if (!work) return world;
  const state = workItemState(world, work.id);
  if (state.status === "completed" || state.status === "cancelled")
    return world;
  const stableKey = `${requestKey(measureId)}:closed`;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [
        ...world.history.workItemStates,
        {
          ...state,
          id: createStableId("work-item-state", `${world.id}:${stableKey}`),
          stableKey,
          sequence: world.history.nextSequence,
          recordedAt: world.currentMoment,
          status: "completed",
          playerRequirement: "none",
          waitingOnPersonIds: [],
          blocker: null,
          outcomeEventId: null,
          supersedesStateId: state.id,
        },
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}
/** A separate explicit report; private model truth is never broadcast on inspection. */
export function publishTransitReport(
  world: World,
  input: { readonly eventId: EntityId; readonly personId: EntityId },
): World {
  const event = world.history.events.find((e) => e.id === input.eventId);
  if (
    !event ||
    ![
      "transit.service-period-settled",
      "transit.undelivered-service-cancelled",
    ].includes(event.type)
  )
    throw new Error(
      "Only a settled service period or cancellation can be reported.",
    );
  const measure = (world.history.legislativeMeasures ?? []).find((m) =>
    event.involvedEntityIds.includes(m.id),
  );
  if (
    !measure ||
    measure.sponsorPersonId !== input.personId ||
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  )
    throw new Error("Only the controlled sponsor may release this report.");
  const sk = `transit-report:${event.id}`;
  if (world.history.events.some((e) => e.stableKey === sk))
    throw new Error("This service record already has a report.");
  let next = recordWorldEvent(world, {
    stableKey: sk,
    type: "transit.service-report-published",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: event.jurisdictionId,
    involvedEntityIds: [
      ...new Set([
        ...event.involvedEntityIds,
        ...world.history.policyRealizations
          .filter((r) => event.involvedEntityIds.includes(r.estimateId))
          .map((r) => r.id),
      ]),
    ].sort(),
    participants: [
      {
        personId: input.personId,
        role: "other:transit-report",
        detail: "Released a dated contract service record.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["transit.report"],
    summary: event.summary,
    context: {
      location: null,
      socialContext:
        "Dated contract report; publication is distinct from delivery",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const reportId = next.history.events.at(-1)!.id;
  next = publishPublicEvent(next, { stableKey: sk, sourceEventId: reportId });
  return next;
}
