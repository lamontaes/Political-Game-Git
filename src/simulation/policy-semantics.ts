import { makeIsoDate } from "./dates";
import { activateEffect, recordCausalProcess } from "./causal-effects";
import {
  futureTransitionEntityAvailableAt,
  futureTransitionEntityExists,
  scheduleFutureDueItem,
} from "./future-transitions";
import { createStableId } from "./ids";
import { lifeEntityAvailableAt, lifeEntityExists } from "./life-integrity";
import {
  addExactQuantities,
  assertExactQuantity,
  compareExactQuantities,
  createExactQuantity,
  divideExactQuantities,
  multiplyExactShares,
  scaleExactQuantity,
  scaleSafeIntegerByExactShare,
} from "./quantity";
import {
  resourceHousingEntityAvailableAt,
  resourceHousingEntityExists,
} from "./resource-integrity";
import { makeCurrencyCode } from "./resources";
import { assertDottedContentKey } from "./taxonomy";
import type {
  CausalProcessRecord,
  EntityId,
  EffectActivationRecord,
  ExactQuantity,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalCutoff,
  MetricObservationUncertainty,
  MetricReferencePeriod,
  MetricScope,
  PolicyAlternativeRecord,
  PolicyBaselineRecord,
  PolicyEstimateRecord,
  PolicyEstimatedConsequence,
  PolicyImplementationFactor,
  PolicyImplementationFactorKind,
  PolicyImplementationProfileRecord,
  PolicyImplementationStatus,
  PolicyOperationRecord,
  PolicyOperationTrigger,
  PolicyRealizationRecord,
  PolicyRealizedConsequence,
  PolicyRealizationStatus,
  PolicyRecordProvenance,
  PolicySemanticKey,
  QuantitativePolicyOperation,
  World,
  WorldMetricDefinition,
  WorldMetricValue,
} from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import {
  requireMetricDefinition,
  sameMetricScope,
  sameReferencePeriod,
  validateReferencePeriod,
  worldMetricEntityAvailableAt,
  worldMetricEntityExists,
} from "./world-metrics";

const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;
const IMPLEMENTATION_FACTOR_ORDER = [
  "authority",
  "funding",
  "administrative-capacity",
  "enforcement-compliance",
  "uptake-participation",
] as const satisfies readonly PolicyImplementationFactorKind[];

export const POLICY_REALIZATION_TRANSITION_KEY =
  "policy:realize-estimate" as const;

export interface RecordPolicyAlternativeInput {
  readonly stableKey: string;
  readonly alternativeKind: PolicyAlternativeRecord["alternativeKind"];
  readonly title: string;
  readonly summary: string;
  readonly propositionId: EntityId | null;
  readonly proposedAt: string;
  readonly recordedAt: string;
  readonly provenance: PolicyRecordProvenance;
}

export interface RecordPolicyBaselineInput {
  readonly stableKey: string;
  readonly seriesKey: PolicySemanticKey;
  readonly metricId: EntityId;
  readonly scope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly expectedValue: WorldMetricValue;
  readonly generatedAt: string;
  readonly recordedAt: string;
  readonly sourceEntityIds: readonly EntityId[];
  readonly methodologyKey: PolicySemanticKey;
  readonly assumptionKeys: readonly PolicySemanticKey[];
  readonly uncertainty: MetricObservationUncertainty;
  readonly provenance: PolicyRecordProvenance;
  readonly supersedesBaselineId: EntityId | null;
}

export interface RecordPolicyOperationInput {
  readonly stableKey: string;
  readonly alternativeId: EntityId;
  readonly targetMetricId: EntityId;
  readonly targetScope: MetricScope;
  readonly targetReferencePeriod: MetricReferencePeriod;
  readonly targetBaselineId: EntityId;
  readonly operation: QuantitativePolicyOperation;
  readonly trigger: PolicyOperationTrigger | null;
  readonly mechanismDefinitionId: EntityId;
  readonly realizationKind: PolicyOperationRecord["realizationKind"];
  readonly timing: {
    readonly startsAt: string;
    readonly maturesAt: string;
    readonly endsAt: string | null;
  };
  readonly recordedAt: string;
  readonly provenance: PolicyRecordProvenance;
}

export interface RecordPolicyImplementationProfileInput {
  readonly stableKey: string;
  readonly alternativeId: EntityId;
  readonly operationIds: readonly EntityId[];
  readonly factors: readonly PolicyImplementationFactor[];
  readonly assessedAt: string;
  readonly recordedAt: string;
  readonly provenance: PolicyRecordProvenance;
}

export interface RecordPolicyProjectionRootInput {
  readonly stableKey: string;
  readonly alternativeId: EntityId;
  readonly operationIds: readonly EntityId[];
  readonly effectiveAt: string;
  readonly recordedAt: string;
}

export interface RecordPolicyEstimateInput {
  readonly stableKey: string;
  readonly seriesKey: PolicySemanticKey;
  readonly alternativeId: EntityId;
  readonly operationIds: readonly EntityId[];
  readonly implementationProfileId: EntityId;
  readonly projectedCausalProcessId: EntityId;
  readonly generatedAt: string;
  readonly recordedAt: string;
  readonly provenance: PolicyRecordProvenance;
  readonly supersedesEstimateId: EntityId | null;
}

export interface RealizePolicyEstimateInput {
  readonly stableKey: string;
  readonly estimateId: EntityId;
  readonly implementationProfileId?: EntityId;
  readonly provenance: PolicyRecordProvenance;
}

export interface SchedulePolicyEstimateRealizationInput {
  readonly stableKey: string;
  readonly estimateId: EntityId;
}

export interface DirectPolicyImplementationFactorInput {
  readonly kind: PolicyImplementationFactorKind;
  readonly share: ExactQuantity;
  readonly reasonKey: PolicySemanticKey;
  readonly explanation: string;
  readonly evidenceEntityIds?: readonly EntityId[];
}

export interface ResourceRatioPolicyImplementationFactorInput {
  readonly kind: "funding" | "administrative-capacity";
  readonly required: WorldMetricValue;
  readonly available: WorldMetricValue;
  readonly reasonKey: PolicySemanticKey;
  readonly explanation: string;
  readonly evidenceEntityIds: readonly EntityId[];
}

export function directPolicyImplementationFactor(
  input: DirectPolicyImplementationFactorInput,
): PolicyImplementationFactor {
  return {
    kind: input.kind,
    share: { ...input.share },
    basis: { kind: "direct" },
    reasonKey: input.reasonKey,
    explanation: input.explanation,
    evidenceEntityIds: canonicalEntityIds(input.evidenceEntityIds ?? []),
  };
}

export function resourceRatioPolicyImplementationFactor(
  input: ResourceRatioPolicyImplementationFactorInput,
): PolicyImplementationFactor {
  return {
    kind: input.kind,
    share: coverageShare(input.required, input.available),
    basis: {
      kind: "resource-ratio",
      required: cloneMetricValue(input.required),
      available: cloneMetricValue(input.available),
    },
    reasonKey: input.reasonKey,
    explanation: input.explanation,
    evidenceEntityIds: canonicalEntityIds(input.evidenceEntityIds),
  };
}

export function recordPolicyAlternative(
  world: World,
  input: RecordPolicyAlternativeInput,
): World {
  assertUniqueStableKey(
    world.history.policyAlternatives,
    input.stableKey,
    "policy alternative",
  );
  const record: PolicyAlternativeRecord = {
    ...input,
    id: createStableId("policy-alternative", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    proposedAt: makeIsoDate(input.proposedAt),
    recordedAt: makeIsoDate(input.recordedAt),
    provenance: clonePolicyProvenance(input.provenance),
  };
  validatePolicyAlternative(world, record);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    policyAlternatives: [...world.history.policyAlternatives, record],
  });
}

export function recordPolicyBaseline(
  world: World,
  input: RecordPolicyBaselineInput,
): World {
  assertUniqueStableKey(
    world.history.policyBaselines,
    input.stableKey,
    "policy baseline",
  );
  const record: PolicyBaselineRecord = {
    ...input,
    id: createStableId("policy-baseline", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    scope: { ...input.scope },
    referencePeriod: { ...input.referencePeriod },
    expectedValue: cloneMetricValue(input.expectedValue),
    generatedAt: makeIsoDate(input.generatedAt),
    recordedAt: makeIsoDate(input.recordedAt),
    sourceEntityIds: canonicalEntityIds(input.sourceEntityIds),
    assumptionKeys: canonicalSemanticKeys(input.assumptionKeys),
    uncertainty: cloneUncertainty(input.uncertainty),
    provenance: clonePolicyProvenance(input.provenance),
  };
  validatePolicyBaseline(world, record, world.history.policyBaselines);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    policyBaselines: [...world.history.policyBaselines, record],
  });
}

export function recordPolicyOperation(
  world: World,
  input: RecordPolicyOperationInput,
): World {
  assertUniqueStableKey(
    world.history.policyOperations,
    input.stableKey,
    "policy operation",
  );
  const record: PolicyOperationRecord = {
    ...input,
    id: createStableId("policy-operation", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    targetScope: { ...input.targetScope },
    targetReferencePeriod: { ...input.targetReferencePeriod },
    operation: clonePolicyOperation(input.operation),
    trigger: clonePolicyTrigger(input.trigger),
    timing: {
      startsAt: makeIsoDate(input.timing.startsAt),
      maturesAt: makeIsoDate(input.timing.maturesAt),
      endsAt:
        input.timing.endsAt === null ? null : makeIsoDate(input.timing.endsAt),
    },
    recordedAt: makeIsoDate(input.recordedAt),
    provenance: clonePolicyProvenance(input.provenance),
  };
  validatePolicyOperation(world, record);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    policyOperations: [...world.history.policyOperations, record],
  });
}

export function recordPolicyImplementationProfile(
  world: World,
  input: RecordPolicyImplementationProfileInput,
): World {
  assertUniqueStableKey(
    world.history.policyImplementationProfiles,
    input.stableKey,
    "policy implementation profile",
  );
  const record: PolicyImplementationProfileRecord = {
    ...input,
    id: createStableId(
      "policy-implementation-profile",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    operationIds: canonicalEntityIds(input.operationIds),
    factors: canonicalFactors(input.factors),
    aggregateRule: "multiplicative-v1",
    assessedAt: makeIsoDate(input.assessedAt),
    recordedAt: makeIsoDate(input.recordedAt),
    provenance: clonePolicyProvenance(input.provenance),
  };
  validatePolicyImplementationProfile(world, record);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    policyImplementationProfiles: [
      ...world.history.policyImplementationProfiles,
      record,
    ],
  });
}

export function recordPolicyProjectionRoot(
  world: World,
  input: RecordPolicyProjectionRootInput,
): World {
  const alternative = requirePolicyAlternative(world, input.alternativeId);
  const operationIds = canonicalEntityIds(input.operationIds);
  if (operationIds.length === 0) {
    throw new Error(
      "A projected policy cause requires at least one operation.",
    );
  }
  for (const operationId of operationIds) {
    const operation = requirePolicyOperation(world, operationId);
    if (operation.alternativeId !== alternative.id) {
      throw new Error(
        "Projected policy operations must share one alternative.",
      );
    }
  }
  if (makeIsoDate(input.effectiveAt) < alternative.proposedAt) {
    throw new Error("A projected policy cause cannot predate its alternative.");
  }
  return recordCausalProcess(world, {
    stableKey: input.stableKey,
    kind: "policy:projected-alternative",
    effectiveAt: input.effectiveAt,
    recordedAt: input.recordedAt,
    sourceEntityIds: [alternative.id, ...operationIds],
    parentCausalIds: [],
    provenance: {
      kind: "simulated",
      sourceEntityIds: [alternative.id, ...operationIds],
    },
  });
}

export function recordPolicyEstimate(
  world: World,
  input: RecordPolicyEstimateInput,
): World {
  assertUniqueStableKey(
    world.history.policyEstimates,
    input.stableKey,
    "policy estimate",
  );
  const operationIds = canonicalEntityIds(input.operationIds);
  const profile = requirePolicyImplementationProfile(
    world,
    input.implementationProfileId,
  );
  const consequences = computePolicyConsequences(world, operationIds, profile);
  const record: PolicyEstimateRecord = {
    ...input,
    id: createStableId("policy-estimate", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    operationIds,
    implementationStatus: implementationStatus(profile),
    consequences,
    generatedAt: makeIsoDate(input.generatedAt),
    recordedAt: makeIsoDate(input.recordedAt),
    provenance: clonePolicyProvenance(input.provenance),
  };
  validatePolicyEstimate(world, record, world.history.policyEstimates);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    policyEstimates: [...world.history.policyEstimates, record],
  });
}

export function implementationShare(
  profile: PolicyImplementationProfileRecord,
): ExactQuantity {
  return profile.factors.reduce(
    (product, factor) => multiplyExactShares(product, factor.share),
    createExactQuantity(1, 1, "rate:share"),
  );
}

export function implementationStatus(
  profile: PolicyImplementationProfileRecord,
): PolicyImplementationStatus {
  const share = implementationShare(profile);
  return share.numerator === 0
    ? "blocked"
    : compareExactQuantities(share, createExactQuantity(1, 1, "rate:share")) ===
        0
      ? "full"
      : "partial";
}

export function realizePolicyEstimate(
  world: World,
  input: RealizePolicyEstimateInput,
): World {
  assertUniqueStableKey(
    world.history.policyRealizations,
    input.stableKey,
    "policy realization",
  );
  const estimate = requirePolicyEstimate(world, input.estimateId);
  assertPolicyEstimateIsCurrentForImplementation(world, estimate);
  if (
    world.history.policyRealizations.some(
      (record) => record.estimateId === estimate.id,
    )
  ) {
    throw new Error("A policy estimate may be realized only once.");
  }
  const profile = requirePolicyImplementationProfile(
    world,
    input.implementationProfileId ?? estimate.implementationProfileId,
  );
  if (profile.alternativeId !== estimate.alternativeId) {
    throw new Error(
      "Policy realization profile belongs to another alternative.",
    );
  }
  const computed = computePolicyConsequences(
    world,
    estimate.operationIds,
    profile,
  );
  const active = computed.filter(
    (consequence) =>
      consequence.triggered && !isZeroMetricValue(consequence.estimatedChange),
  );
  const status = realizationStatus(profile, active.length > 0);
  if (status === "full" || status === "partial") {
    assertAlternativeHasNoEffectProducingRealization(world, estimate);
  }
  if (status === "blocked" || status === "not-triggered") {
    return appendPolicyRealization(world, {
      stableKey: input.stableKey,
      estimateId: estimate.id,
      implementationProfileId: profile.id,
      status,
      actualCausalProcessId: null,
      consequences: [],
      reasonKeys:
        status === "blocked"
          ? blockedFactorReasonKeys(profile)
          : (["policy:trigger-not-met"] as PolicySemanticKey[]),
      provenance: input.provenance,
    });
  }
  for (const consequence of active) {
    const operation = requirePolicyOperation(world, consequence.operationId);
    if (world.currentDate > operation.timing.startsAt) {
      throw new Error(
        "Policy realization must be committed no later than its intended start.",
      );
    }
  }
  let working = recordCausalProcess(world, {
    stableKey: `${input.stableKey}:actual-cause`,
    kind: "policy:realized-intervention",
    effectiveAt: world.currentDate,
    recordedAt: world.currentDate,
    sourceEntityIds: [estimate.id],
    parentCausalIds: [estimate.projectedCausalProcessId],
    provenance: { kind: "simulated", sourceEntityIds: [estimate.id] },
  });
  const actualCause = working.history.causalProcesses.at(-1);
  if (!actualCause)
    throw new Error("Policy realization lost its causal record.");
  const realizedConsequences: PolicyRealizedConsequence[] = [];
  for (const consequence of active) {
    const operation = requirePolicyOperation(working, consequence.operationId);
    const direction =
      metricValueSign(consequence.estimatedChange) < 0
        ? "decrease"
        : "increase";
    working = activateEffect(working, {
      stableKey: `${input.stableKey}:effect:${operation.stableKey}`,
      mechanismDefinitionId: operation.mechanismDefinitionId,
      causalProcessId: actualCause.id,
      targetMetricId: operation.targetMetricId,
      targetScope: operation.targetScope,
      direction,
      magnitude: absoluteMetricValue(consequence.estimatedChange),
      magnitudeBasis:
        operation.targetReferencePeriod.kind === "point"
          ? { kind: "point-at-target" }
          : {
              kind: "interval-total",
              referencePeriod: { ...operation.targetReferencePeriod },
            },
      activatedAt: world.currentDate,
      onsetAt: operation.timing.startsAt,
      maturesAt: operation.timing.maturesAt,
      endsAt: operation.timing.endsAt,
      threshold: null,
      targetBound: null,
      realizationKind: operation.realizationKind,
      sourceEntityIds: [estimate.id],
      recordedAt: world.currentDate,
    });
    const effect = working.history.effectActivations.at(-1);
    if (!effect)
      throw new Error("Policy realization lost an effect activation.");
    realizedConsequences.push({
      operationId: operation.id,
      effectActivationId: effect.id,
      realizedChange: cloneMetricValue(consequence.estimatedChange),
    });
  }
  return appendPolicyRealization(working, {
    stableKey: input.stableKey,
    estimateId: estimate.id,
    implementationProfileId: profile.id,
    status,
    actualCausalProcessId: actualCause.id,
    consequences: realizedConsequences,
    reasonKeys:
      status === "partial"
        ? constrainedFactorReasonKeys(profile)
        : (["policy:fully-realized"] as PolicySemanticKey[]),
    provenance: input.provenance,
  });
}

export function schedulePolicyEstimateRealization(
  world: World,
  input: SchedulePolicyEstimateRealizationInput,
): World {
  const estimate = requirePolicyEstimate(world, input.estimateId);
  assertPolicyEstimateIsCurrentForImplementation(world, estimate);
  if (
    world.history.policyRealizations.some(
      (record) => record.estimateId === estimate.id,
    )
  ) {
    throw new Error("A realized policy estimate cannot be scheduled again.");
  }
  if (policyEstimateWouldProduceEffects(world, estimate)) {
    assertAlternativeHasNoEffectProducingRealization(world, estimate);
  }
  if (policyRealizationDueItemsForEstimate(world, estimate.id).length > 0) {
    throw new Error(
      "A policy estimate may have only one policy-realization due item.",
    );
  }
  const dueAt = policyRealizationDueAt(world, estimate);
  return scheduleFutureDueItem(world, {
    stableKey: input.stableKey,
    dueAt,
    transitionKey: POLICY_REALIZATION_TRANSITION_KEY,
    entityIds: [estimate.id],
    jurisdictionId: policyRealizationJurisdictionId(world, estimate),
    provenance: { kind: "simulated", sourceEntityIds: [estimate.id] },
  });
}

export function policyRealizationTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== POLICY_REALIZATION_TRANSITION_KEY) {
    throw new Error("Policy realization handler received another transition.");
  }
  const estimate = validatePolicyRealizationDueItem(world, dueItem);
  let working = realizePolicyEstimate(world, {
    stableKey: `${dueItem.stableKey}:realization`,
    estimateId: estimate.id,
    provenance: { kind: "simulated", sourceEntityIds: [dueItem.id] },
  });
  const realization = working.history.policyRealizations.at(-1);
  if (!realization) throw new Error("Policy due handler lost its realization.");
  working = recordWorldEvent(working, {
    stableKey: `${dueItem.stableKey}:outcome`,
    type: "policy.implementation-realization",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: policyRealizationJurisdictionId(working, estimate),
    involvedEntityIds: [
      estimate.id,
      realization.id,
      ...realization.consequences.map((item) => item.effectActivationId),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["policy.implementation", `policy.${realization.status}`],
    summary: `Policy implementation was ${realization.status}.`,
    context: {
      location: null,
      socialContext:
        "A delayed quantitative policy estimate reached its explicit implementation frontier.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = working.history.events.at(-1);
  if (!event) throw new Error("Policy due handler lost its outcome event.");
  return {
    world: working,
    status: realization.status === "blocked" ? "blocked" : "resolved",
    reasonKey:
      realization.status === "blocked"
        ? (realization.reasonKeys[0] ?? "policy:implementation-blocked")
        : null,
    context: `Policy realization ${realization.status}.`,
    outcomeEventId: event.id,
  };
}

export function policyBaselineAt(
  world: World,
  baselineId: EntityId,
  cutoff: HistoricalCutoff,
): PolicyBaselineRecord | null {
  validateCutoff(world, cutoff);
  const record = world.history.policyBaselines.find(
    (candidate) => candidate.id === baselineId,
  );
  return record && policyRecordAvailable(record, cutoff) ? record : null;
}

export function latestPolicyBaselineForSeriesAt(
  world: World,
  seriesKey: PolicySemanticKey,
  cutoff: HistoricalCutoff,
): PolicyBaselineRecord | null {
  validateCutoff(world, cutoff);
  assertSemanticKey(seriesKey, "Policy baseline series key");
  return (
    world.history.policyBaselines
      .filter(
        (record) =>
          record.seriesKey === seriesKey &&
          policyRecordAvailable(record, cutoff),
      )
      .sort(bySequence)
      .at(-1) ?? null
  );
}

export function policyEstimateAt(
  world: World,
  estimateId: EntityId,
  cutoff: HistoricalCutoff,
): PolicyEstimateRecord | null {
  validateCutoff(world, cutoff);
  const record = world.history.policyEstimates.find(
    (candidate) => candidate.id === estimateId,
  );
  return record && policyRecordAvailable(record, cutoff) ? record : null;
}

export function latestPolicyEstimateForSeriesAt(
  world: World,
  seriesKey: PolicySemanticKey,
  cutoff: HistoricalCutoff,
): PolicyEstimateRecord | null {
  validateCutoff(world, cutoff);
  assertSemanticKey(seriesKey, "Policy estimate series key");
  return (
    world.history.policyEstimates
      .filter(
        (record) =>
          record.seriesKey === seriesKey &&
          policyRecordAvailable(record, cutoff),
      )
      .sort(bySequence)
      .at(-1) ?? null
  );
}

export function policySemanticsEntityExists(
  world: World,
  id: EntityId,
): boolean {
  return policyHistoryRecords(world).some((record) => record.id === id);
}

export function policySemanticsEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = policyHistoryRecords(world).find((item) => item.id === id);
  return !!(
    record &&
    record.recordedAt <= asOfDate &&
    record.sequence < sequenceExclusive
  );
}

export function policyHistoryRecords(
  world: World,
): readonly PolicyHistoryRecord[] {
  return [
    ...world.history.policyAlternatives,
    ...world.history.policyBaselines,
    ...world.history.policyOperations,
    ...world.history.policyImplementationProfiles,
    ...world.history.policyEstimates,
    ...world.history.policyRealizations,
  ];
}

export function assertPolicySemanticsIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertSequenceOrdered(world.history.policyAlternatives, "policy alternative");
  assertSequenceOrdered(world.history.policyBaselines, "policy baseline");
  assertSequenceOrdered(world.history.policyOperations, "policy operation");
  assertSequenceOrdered(
    world.history.policyImplementationProfiles,
    "policy implementation profile",
  );
  assertSequenceOrdered(world.history.policyEstimates, "policy estimate");
  assertSequenceOrdered(world.history.policyRealizations, "policy realization");
  for (const record of world.history.policyAlternatives) {
    assertHistoryIdentity(ids, world, record, "policy-alternative");
    validatePolicyAlternative(world, record);
  }
  const priorBaselines: PolicyBaselineRecord[] = [];
  for (const record of world.history.policyBaselines) {
    assertHistoryIdentity(ids, world, record, "policy-baseline");
    validatePolicyBaseline(world, record, priorBaselines);
    priorBaselines.push(record);
  }
  for (const record of world.history.policyOperations) {
    assertHistoryIdentity(ids, world, record, "policy-operation");
    validatePolicyOperation(world, record);
  }
  for (const record of world.history.policyImplementationProfiles) {
    assertHistoryIdentity(ids, world, record, "policy-implementation-profile");
    validatePolicyImplementationProfile(world, record);
  }
  const priorEstimates: PolicyEstimateRecord[] = [];
  for (const record of world.history.policyEstimates) {
    assertHistoryIdentity(ids, world, record, "policy-estimate");
    validatePolicyEstimate(world, record, priorEstimates);
    priorEstimates.push(record);
  }
  for (const record of world.history.policyRealizations) {
    assertHistoryIdentity(ids, world, record, "policy-realization");
    validatePolicyRealization(world, record);
  }
  validatePolicyRealizationDueItems(world);
}

type PolicyHistoryRecord =
  | PolicyAlternativeRecord
  | PolicyBaselineRecord
  | PolicyOperationRecord
  | PolicyImplementationProfileRecord
  | PolicyEstimateRecord
  | PolicyRealizationRecord;

function appendPolicyRealization(
  world: World,
  input: Omit<
    PolicyRealizationRecord,
    "id" | "sequence" | "realizedAt" | "recordedAt"
  >,
): World {
  const record: PolicyRealizationRecord = {
    ...input,
    id: createStableId("policy-realization", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    realizedAt: world.currentDate,
    recordedAt: world.currentDate,
    consequences: input.consequences.map((item) => ({
      ...item,
      realizedChange: cloneMetricValue(item.realizedChange),
    })),
    reasonKeys: canonicalSemanticKeys(input.reasonKeys),
    provenance: clonePolicyProvenance(input.provenance),
  };
  validatePolicyRealization(world, record);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    policyRealizations: [...world.history.policyRealizations, record],
  });
}

function assertPolicyEstimateIsCurrentForImplementation(
  world: World,
  estimate: PolicyEstimateRecord,
): void {
  const latest = world.history.policyEstimates
    .filter((record) => record.seriesKey === estimate.seriesKey)
    .sort(bySequence)
    .at(-1);
  if (!latest || latest.id !== estimate.id) {
    throw new Error(
      "A superseded policy estimate cannot be newly scheduled or realized.",
    );
  }
}

function assertAlternativeHasNoEffectProducingRealization(
  world: World,
  estimate: PolicyEstimateRecord,
): void {
  const existing = world.history.policyRealizations.find((record) => {
    if (record.status !== "full" && record.status !== "partial") return false;
    const realizedEstimate = requirePolicyEstimate(world, record.estimateId);
    return realizedEstimate.alternativeId === estimate.alternativeId;
  });
  if (existing) {
    throw new Error(
      "A policy alternative may have only one effect-producing realization.",
    );
  }
}

function policyRealizationDueItemsForEstimate(
  world: World,
  estimateId: EntityId,
): readonly FutureDueItem[] {
  return world.history.futureDueItems.filter(
    (item) =>
      item.transitionKey === POLICY_REALIZATION_TRANSITION_KEY &&
      item.entityIds.includes(estimateId),
  );
}

function policyEstimateWouldProduceEffects(
  world: World,
  estimate: PolicyEstimateRecord,
): boolean {
  const profile = requirePolicyImplementationProfile(
    world,
    estimate.implementationProfileId,
  );
  const hasActiveChange = computePolicyConsequences(
    world,
    estimate.operationIds,
    profile,
  ).some(
    (consequence) =>
      consequence.triggered && !isZeroMetricValue(consequence.estimatedChange),
  );
  const status = realizationStatus(profile, hasActiveChange);
  return status === "full" || status === "partial";
}

function policyRealizationDueAt(
  world: World,
  estimate: PolicyEstimateRecord,
): ReturnType<typeof makeIsoDate> {
  const dueAt = estimate.operationIds
    .map((id) => requirePolicyOperation(world, id).timing.startsAt)
    .sort()[0];
  if (!dueAt) throw new Error("Policy estimate has no operation start date.");
  return dueAt;
}

function policyRealizationJurisdictionId(
  world: World,
  estimate: PolicyEstimateRecord,
): EntityId | null {
  const jurisdictionIds = new Set(
    estimate.operationIds.map(
      (id) => requirePolicyOperation(world, id).targetScope.jurisdictionId,
    ),
  );
  if (jurisdictionIds.size !== 1) return null;
  return jurisdictionIds.values().next().value ?? null;
}

function validatePolicyRealizationDueItems(world: World): void {
  const seenEstimateIds = new Set<EntityId>();
  for (const dueItem of world.history.futureDueItems) {
    if (dueItem.transitionKey !== POLICY_REALIZATION_TRANSITION_KEY) continue;
    const estimate = validatePolicyRealizationDueItem(world, dueItem);
    if (seenEstimateIds.has(estimate.id)) {
      throw new Error(
        `Policy estimate has duplicate realization due items: ${estimate.id}`,
      );
    }
    seenEstimateIds.add(estimate.id);
  }
}

function validatePolicyRealizationDueItem(
  world: World,
  dueItem: FutureDueItem,
): PolicyEstimateRecord {
  if (dueItem.entityIds.length !== 1 || dueItem.entityIds[0] === undefined) {
    throw new Error(
      `Policy realization due item must reference exactly one estimate: ${dueItem.id}`,
    );
  }
  const estimate = requirePolicyEstimate(world, dueItem.entityIds[0]);
  if (
    estimate.sequence >= dueItem.sequence ||
    estimate.recordedAt > dueItem.scheduledAt ||
    dueItem.dueAt !== policyRealizationDueAt(world, estimate) ||
    dueItem.jurisdictionId !== policyRealizationJurisdictionId(world, estimate)
  ) {
    throw new Error(
      `Policy realization due item has mismatched estimate semantics: ${dueItem.id}`,
    );
  }
  for (const operationId of estimate.operationIds) {
    const operation = requirePolicyOperation(world, operationId);
    if (
      operation.sequence >= dueItem.sequence ||
      operation.recordedAt > dueItem.scheduledAt
    ) {
      throw new Error(
        `Policy realization due item has unavailable operation: ${dueItem.id}`,
      );
    }
  }
  if (
    dueItem.provenance.kind !== "simulated" ||
    !sameEntityIds(dueItem.provenance.sourceEntityIds, [estimate.id])
  ) {
    throw new Error(
      `Policy realization due item has invalid canonical source: ${dueItem.id}`,
    );
  }
  const realization = world.history.policyRealizations.find(
    (record) => record.estimateId === estimate.id,
  );
  if (realization) {
    if (realization.sequence < dueItem.sequence) {
      throw new Error(
        `Policy realization due item was created after realization: ${dueItem.id}`,
      );
    }
    const latestState = world.history.futureDueItemStates
      .filter((state) => state.dueItemId === dueItem.id)
      .sort(bySequence)
      .at(-1);
    if (
      latestState?.status === "scheduled" &&
      !isPolicyDueResolutionInFlight(world, dueItem, realization)
    ) {
      throw new Error(
        `Policy realization due item remains pending after realization: ${dueItem.id}`,
      );
    }
  }
  if (
    policyEstimateWouldProduceEffects(world, estimate) &&
    world.history.policyRealizations.some((record) => {
      if (
        record.sequence >= dueItem.sequence ||
        (record.status !== "full" && record.status !== "partial")
      ) {
        return false;
      }
      return (
        requirePolicyEstimate(world, record.estimateId).alternativeId ===
        estimate.alternativeId
      );
    })
  ) {
    throw new Error(
      `Policy realization due item would duplicate an implemented alternative: ${dueItem.id}`,
    );
  }
  return estimate;
}

function isPolicyDueResolutionInFlight(
  world: World,
  dueItem: FutureDueItem,
  realization: PolicyRealizationRecord,
): boolean {
  return (
    dueItem.dueAt === world.currentDate &&
    realization.stableKey === `${dueItem.stableKey}:realization` &&
    realization.provenance.kind === "simulated" &&
    sameEntityIds(realization.provenance.sourceEntityIds, [dueItem.id])
  );
}

function computePolicyConsequences(
  world: World,
  operationIds: readonly EntityId[],
  profile: PolicyImplementationProfileRecord,
): readonly PolicyEstimatedConsequence[] {
  if (operationIds.length === 0) {
    throw new Error("A policy estimate requires at least one operation.");
  }
  if (JSON.stringify(operationIds) !== JSON.stringify(profile.operationIds)) {
    throw new Error(
      "Policy estimate operations must match its implementation profile.",
    );
  }
  const share = implementationShare(profile);
  return operationIds.map((operationId) => {
    const operation = requirePolicyOperation(world, operationId);
    const baseline = requirePolicyBaseline(world, operation.targetBaselineId);
    const triggered =
      operation.trigger === null || triggerSatisfied(world, operation.trigger);
    const intendedResult = triggered
      ? operationResult(world, operation, baseline.expectedValue)
      : cloneMetricValue(baseline.expectedValue);
    const intendedChange = subtractMetricValues(
      intendedResult,
      baseline.expectedValue,
    );
    const estimatedChange = triggered
      ? scaleMetricValue(intendedChange, share)
      : zeroMetricValue(baseline.expectedValue);
    return {
      operationId: operation.id,
      baselineId: baseline.id,
      triggered,
      baselineValue: cloneMetricValue(baseline.expectedValue),
      intendedChange,
      intendedResult,
      implementationShare: { ...share },
      estimatedChange,
      estimatedResult: addMetricValues(baseline.expectedValue, estimatedChange),
      uncertainty: cloneUncertainty(baseline.uncertainty),
    };
  });
}

function operationResult(
  world: World,
  operation: PolicyOperationRecord,
  baselineValue: WorldMetricValue,
): WorldMetricValue {
  const semantics = operation.operation;
  switch (semantics.kind) {
    case "set-level":
      return cloneMetricValue(semantics.value);
    case "absolute-change": {
      const signed =
        semantics.direction === "increase"
          ? semantics.magnitude
          : negateMetricValue(semantics.magnitude);
      return addMetricValues(baselineValue, signed);
    }
    case "relative-change": {
      const magnitude = scaleMetricValue(baselineValue, semantics.share);
      return addMetricValues(
        baselineValue,
        semantics.direction === "increase"
          ? magnitude
          : negateMetricValue(magnitude),
      );
    }
    case "share-of-baseline": {
      const source = requirePolicyBaseline(world, semantics.sourceBaselineId);
      const magnitude = scaleMetricValue(source.expectedValue, semantics.share);
      return addMetricValues(
        baselineValue,
        semantics.direction === "increase"
          ? magnitude
          : negateMetricValue(magnitude),
      );
    }
    case "cap":
      return compareMetricValues(baselineValue, semantics.maximum) > 0
        ? cloneMetricValue(semantics.maximum)
        : cloneMetricValue(baselineValue);
    case "floor":
      return compareMetricValues(baselineValue, semantics.minimum) < 0
        ? cloneMetricValue(semantics.minimum)
        : cloneMetricValue(baselineValue);
  }
}

function triggerSatisfied(
  world: World,
  trigger: PolicyOperationTrigger,
): boolean {
  const baseline = requirePolicyBaseline(world, trigger.baselineId);
  const comparison = compareMetricValues(
    baseline.expectedValue,
    trigger.threshold,
  );
  return trigger.comparison === "at-least" ? comparison >= 0 : comparison <= 0;
}

function validatePolicyAlternative(
  world: World,
  record: PolicyAlternativeRecord,
): void {
  assertNonEmpty(record.stableKey, "Policy-alternative stable key");
  assertSemanticKey(record.alternativeKind, "Policy-alternative kind");
  assertNonEmpty(record.title, "Policy-alternative title");
  assertNonEmpty(record.summary, "Policy-alternative summary");
  makeIsoDate(record.proposedAt);
  makeIsoDate(record.recordedAt);
  if (
    record.proposedAt > record.recordedAt ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(`Policy alternative has invalid chronology: ${record.id}`);
  }
  if (
    record.propositionId !== null &&
    !world.policyCatalog.propositions[record.propositionId]
  ) {
    throw new Error(
      `Policy alternative references missing proposition: ${record.id}`,
    );
  }
  validatePolicyProvenance(
    world,
    record.provenance,
    record.recordedAt,
    record.sequence,
  );
}

function validatePolicyBaseline(
  world: World,
  record: PolicyBaselineRecord,
  priorRecords: readonly PolicyBaselineRecord[],
): void {
  assertNonEmpty(record.stableKey, "Policy-baseline stable key");
  assertSemanticKey(record.seriesKey, "Policy-baseline series key");
  assertSemanticKey(record.methodologyKey, "Policy-baseline methodology key");
  assertCanonicalSemanticKeys(
    record.assumptionKeys,
    "Policy-baseline assumption",
  );
  const definition = requireMetricDefinition(world, record.metricId);
  validateMetricScope(world, record.scope);
  validateReferencePeriod(record.referencePeriod);
  if (record.referencePeriod.kind !== definition.referencePeriodKind) {
    throw new Error(
      `Policy baseline period does not match metric: ${record.id}`,
    );
  }
  assertMetricValueForDefinition(record.expectedValue, definition);
  validateUncertainty(record.uncertainty, record.expectedValue);
  makeIsoDate(record.generatedAt);
  makeIsoDate(record.recordedAt);
  if (
    record.generatedAt > record.recordedAt ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(`Policy baseline has invalid chronology: ${record.id}`);
  }
  assertCanonicalEntityIds(record.sourceEntityIds, "Policy-baseline source");
  if (record.sourceEntityIds.length === 0) {
    throw new Error(`Policy baseline requires source evidence: ${record.id}`);
  }
  for (const sourceId of record.sourceEntityIds) {
    if (
      !canonicalEntityAvailable(
        world,
        sourceId,
        record.generatedAt,
        record.sequence,
      )
    ) {
      throw new Error(`Policy baseline source is unavailable: ${sourceId}`);
    }
  }
  const sameSeries = priorRecords.filter(
    (candidate) => candidate.seriesKey === record.seriesKey,
  );
  const previous = [...sameSeries].sort(bySequence).at(-1);
  if (
    (previous === undefined && record.supersedesBaselineId !== null) ||
    (previous !== undefined && record.supersedesBaselineId !== previous.id)
  ) {
    throw new Error(
      `Policy baseline revision must supersede its latest series record: ${record.id}`,
    );
  }
  if (previous) {
    if (
      previous.metricId !== record.metricId ||
      !sameMetricScope(previous.scope, record.scope) ||
      !sameReferencePeriod(previous.referencePeriod, record.referencePeriod)
    ) {
      throw new Error(
        `Policy baseline revision changed its metric/scope/period: ${record.id}`,
      );
    }
    if (previous.recordedAt > record.recordedAt) {
      throw new Error(
        `Policy baseline revision predates its recorded predecessor: ${record.id}`,
      );
    }
  }
  validatePolicyProvenance(
    world,
    record.provenance,
    record.recordedAt,
    record.sequence,
  );
}

function validatePolicyOperation(
  world: World,
  record: PolicyOperationRecord,
): void {
  assertNonEmpty(record.stableKey, "Policy-operation stable key");
  const alternative = requirePolicyAlternative(world, record.alternativeId);
  if (
    alternative.sequence >= record.sequence ||
    alternative.recordedAt > record.recordedAt
  ) {
    throw new Error(
      `Policy operation references unavailable alternative: ${record.id}`,
    );
  }
  const definition = requireMetricDefinition(world, record.targetMetricId);
  if (definition.stateSemantics !== "primitive") {
    throw new Error(
      `Policy operation cannot target derived metric: ${record.id}`,
    );
  }
  validateMetricScope(world, record.targetScope);
  validateReferencePeriod(record.targetReferencePeriod);
  if (record.targetReferencePeriod.kind !== definition.referencePeriodKind) {
    throw new Error(
      `Policy operation period does not match target metric: ${record.id}`,
    );
  }
  const baseline = requirePolicyBaseline(world, record.targetBaselineId);
  if (
    baseline.sequence >= record.sequence ||
    baseline.recordedAt > record.recordedAt ||
    baseline.metricId !== record.targetMetricId ||
    !sameMetricScope(baseline.scope, record.targetScope) ||
    !sameReferencePeriod(baseline.referencePeriod, record.targetReferencePeriod)
  ) {
    throw new Error(
      `Policy operation target baseline is unavailable or mismatched: ${record.id}`,
    );
  }
  validateOperationSemantics(world, record, definition, baseline.expectedValue);
  if (record.trigger !== null)
    validatePolicyTrigger(
      world,
      record.trigger,
      record.recordedAt,
      record.sequence,
    );
  if (!world.causalMechanismCatalog.definitions[record.mechanismDefinitionId]) {
    throw new Error(
      `Policy operation references missing mechanism: ${record.id}`,
    );
  }
  assertSemanticKey(record.realizationKind, "Policy realization kind");
  makeIsoDate(record.timing.startsAt);
  makeIsoDate(record.timing.maturesAt);
  makeIsoDate(record.recordedAt);
  if (
    record.timing.startsAt < alternative.proposedAt ||
    record.timing.startsAt > referencePeriodEnd(record.targetReferencePeriod) ||
    record.timing.startsAt > record.timing.maturesAt ||
    (record.timing.endsAt !== null &&
      makeIsoDate(record.timing.endsAt) <= record.timing.maturesAt) ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(`Policy operation has invalid timing: ${record.id}`);
  }
  validatePolicyProvenance(
    world,
    record.provenance,
    record.recordedAt,
    record.sequence,
  );
}

function validateOperationSemantics(
  world: World,
  record: PolicyOperationRecord,
  definition: WorldMetricDefinition,
  baselineValue: WorldMetricValue,
): void {
  const operation = record.operation;
  switch (operation.kind) {
    case "set-level":
      assertMetricValueForDefinition(operation.value, definition);
      assertCompatibleMetricValues(baselineValue, operation.value);
      return;
    case "absolute-change":
      assertDirection(operation.direction);
      assertMetricValueForDefinition(operation.magnitude, definition);
      assertCompatibleMetricValues(baselineValue, operation.magnitude);
      assertNonnegativeMetricValue(
        operation.magnitude,
        "Policy absolute magnitude",
      );
      return;
    case "relative-change":
      assertDirection(operation.direction);
      assertNonnegativeShare(operation.share, false, "Policy relative share");
      return;
    case "share-of-baseline": {
      assertDirection(operation.direction);
      assertNonnegativeShare(operation.share, false, "Policy baseline share");
      const source = requirePolicyBaseline(world, operation.sourceBaselineId);
      if (
        source.sequence >= record.sequence ||
        source.recordedAt > record.recordedAt
      ) {
        throw new Error(
          `Policy operation source baseline is unavailable: ${record.id}`,
        );
      }
      assertCompatibleMetricValues(baselineValue, source.expectedValue);
      return;
    }
    case "cap":
      assertMetricValueForDefinition(operation.maximum, definition);
      assertCompatibleMetricValues(baselineValue, operation.maximum);
      return;
    case "floor":
      assertMetricValueForDefinition(operation.minimum, definition);
      assertCompatibleMetricValues(baselineValue, operation.minimum);
      return;
    default:
      throw new Error(`Malformed quantitative policy operation: ${record.id}`);
  }
}

function validatePolicyTrigger(
  world: World,
  trigger: PolicyOperationTrigger,
  recordedAt: string,
  sequenceExclusive: number,
): void {
  if (trigger.comparison !== "at-least" && trigger.comparison !== "at-most") {
    throw new Error("Policy operation has malformed trigger comparison.");
  }
  const baseline = requirePolicyBaseline(world, trigger.baselineId);
  if (
    baseline.sequence >= sequenceExclusive ||
    baseline.recordedAt > recordedAt
  ) {
    throw new Error("Policy operation trigger baseline is unavailable.");
  }
  assertCompatibleMetricValues(baseline.expectedValue, trigger.threshold);
}

function validatePolicyImplementationProfile(
  world: World,
  record: PolicyImplementationProfileRecord,
): void {
  assertNonEmpty(record.stableKey, "Policy implementation-profile stable key");
  const alternative = requirePolicyAlternative(world, record.alternativeId);
  if (
    alternative.sequence >= record.sequence ||
    alternative.recordedAt > record.assessedAt
  ) {
    throw new Error(
      `Policy implementation profile has unavailable alternative: ${record.id}`,
    );
  }
  if (record.operationIds.length === 0) {
    throw new Error(
      `Policy implementation profile has no operations: ${record.id}`,
    );
  }
  assertCanonicalEntityIds(record.operationIds, "Policy profile operation");
  for (const id of record.operationIds) {
    const operation = requirePolicyOperation(world, id);
    if (
      operation.sequence >= record.sequence ||
      operation.recordedAt > record.assessedAt ||
      operation.alternativeId !== alternative.id
    ) {
      throw new Error(
        `Policy implementation profile has mismatched operation: ${record.id}`,
      );
    }
  }
  if (record.aggregateRule !== "multiplicative-v1") {
    throw new Error(
      `Policy implementation profile has invalid aggregate rule: ${record.id}`,
    );
  }
  const kinds = record.factors.map((factor) => factor.kind);
  if (JSON.stringify(kinds) !== JSON.stringify(IMPLEMENTATION_FACTOR_ORDER)) {
    throw new Error(
      `Policy implementation profile must preserve five distinct factors: ${record.id}`,
    );
  }
  makeIsoDate(record.assessedAt);
  makeIsoDate(record.recordedAt);
  if (
    record.assessedAt > record.recordedAt ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(
      `Policy implementation profile has invalid chronology: ${record.id}`,
    );
  }
  for (const factor of record.factors) {
    validateImplementationFactor(
      world,
      factor,
      record.assessedAt,
      record.sequence,
    );
  }
  validatePolicyProvenance(
    world,
    record.provenance,
    record.recordedAt,
    record.sequence,
  );
}

function validateImplementationFactor(
  world: World,
  factor: PolicyImplementationFactor,
  assessedAt: string,
  sequenceExclusive: number,
): void {
  if (!IMPLEMENTATION_FACTOR_ORDER.includes(factor.kind)) {
    throw new Error(
      `Unknown policy implementation factor: ${String(factor.kind)}`,
    );
  }
  assertNonnegativeShare(factor.share, true, "Policy implementation factor");
  if (
    factor.kind === "authority" &&
    factor.share.numerator !== 0 &&
    compareExactQuantities(
      factor.share,
      createExactQuantity(1, 1, "rate:share"),
    ) !== 0
  ) {
    throw new Error("Policy authority factor must be allowed or blocked.");
  }
  assertSemanticKey(factor.reasonKey, "Policy implementation reason key");
  assertNonEmpty(factor.explanation, "Policy implementation explanation");
  assertCanonicalEntityIds(
    factor.evidenceEntityIds,
    "Policy implementation evidence",
  );
  for (const id of factor.evidenceEntityIds) {
    if (!canonicalEntityAvailable(world, id, assessedAt, sequenceExclusive)) {
      throw new Error(`Policy implementation evidence is unavailable: ${id}`);
    }
  }
  if (factor.basis.kind === "resource-ratio") {
    if (
      factor.kind !== "funding" &&
      factor.kind !== "administrative-capacity"
    ) {
      throw new Error(
        "Only funding/capacity factors may use a resource ratio.",
      );
    }
    const expected = coverageShare(
      factor.basis.required,
      factor.basis.available,
    );
    if (compareExactQuantities(expected, factor.share) !== 0) {
      throw new Error(
        "Policy resource-ratio factor does not match its evidence.",
      );
    }
  } else if (factor.basis.kind !== "direct") {
    throw new Error("Policy implementation factor has malformed basis.");
  }
}

function validatePolicyEstimate(
  world: World,
  record: PolicyEstimateRecord,
  priorRecords: readonly PolicyEstimateRecord[],
): void {
  assertNonEmpty(record.stableKey, "Policy-estimate stable key");
  assertSemanticKey(record.seriesKey, "Policy-estimate series key");
  const alternative = requirePolicyAlternative(world, record.alternativeId);
  const profile = requirePolicyImplementationProfile(
    world,
    record.implementationProfileId,
  );
  if (
    alternative.sequence >= record.sequence ||
    alternative.recordedAt > record.generatedAt ||
    profile.sequence >= record.sequence ||
    profile.recordedAt > record.generatedAt ||
    profile.alternativeId !== alternative.id ||
    JSON.stringify(record.operationIds) !== JSON.stringify(profile.operationIds)
  ) {
    throw new Error(
      `Policy estimate has unavailable/mismatched inputs: ${record.id}`,
    );
  }
  assertCanonicalEntityIds(record.operationIds, "Policy-estimate operation");
  const causal = world.history.causalProcesses.find(
    (candidate) => candidate.id === record.projectedCausalProcessId,
  );
  if (
    !causal ||
    causal.sequence >= record.sequence ||
    causal.recordedAt > record.generatedAt ||
    causal.kind !== "policy:projected-alternative" ||
    !causal.sourceEntityIds.includes(alternative.id) ||
    record.operationIds.some((id) => !causal.sourceEntityIds.includes(id))
  ) {
    throw new Error(
      `Policy estimate has unavailable projected causal root: ${record.id}`,
    );
  }
  const expectedConsequences = computePolicyConsequences(
    world,
    record.operationIds,
    profile,
  );
  if (
    JSON.stringify(expectedConsequences) !== JSON.stringify(record.consequences)
  ) {
    throw new Error(
      `Policy estimate consequences do not match canonical inputs: ${record.id}`,
    );
  }
  if (record.implementationStatus !== implementationStatus(profile)) {
    throw new Error(
      `Policy estimate implementation status is inconsistent: ${record.id}`,
    );
  }
  makeIsoDate(record.generatedAt);
  makeIsoDate(record.recordedAt);
  if (
    record.generatedAt > record.recordedAt ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(`Policy estimate has invalid chronology: ${record.id}`);
  }
  const sameSeries = priorRecords.filter(
    (candidate) => candidate.seriesKey === record.seriesKey,
  );
  const previous = [...sameSeries].sort(bySequence).at(-1);
  if (
    (previous === undefined && record.supersedesEstimateId !== null) ||
    (previous !== undefined && record.supersedesEstimateId !== previous.id)
  ) {
    throw new Error(
      `Policy estimate revision must supersede its latest series record: ${record.id}`,
    );
  }
  if (previous) {
    if (previous.alternativeId !== record.alternativeId) {
      throw new Error(
        `Policy estimate revision changed its alternative: ${record.id}`,
      );
    }
    if (previous.recordedAt > record.recordedAt) {
      throw new Error(
        `Policy estimate revision predates its recorded predecessor: ${record.id}`,
      );
    }
  }
  validatePolicyProvenance(
    world,
    record.provenance,
    record.recordedAt,
    record.sequence,
  );
}

function validatePolicyRealization(
  world: World,
  record: PolicyRealizationRecord,
): void {
  assertNonEmpty(record.stableKey, "Policy-realization stable key");
  const estimate = requirePolicyEstimate(world, record.estimateId);
  assertEstimateHasNoOtherPolicyRealization(world, record);
  const profile = requirePolicyImplementationProfile(
    world,
    record.implementationProfileId,
  );
  if (
    estimate.sequence >= record.sequence ||
    profile.sequence >= record.sequence ||
    profile.alternativeId !== estimate.alternativeId
  ) {
    throw new Error(
      `Policy realization has unavailable/mismatched inputs: ${record.id}`,
    );
  }
  makeIsoDate(record.realizedAt);
  makeIsoDate(record.recordedAt);
  if (
    record.realizedAt !== record.recordedAt ||
    record.recordedAt > world.currentDate ||
    !["full", "partial", "blocked", "not-triggered"].includes(record.status)
  ) {
    throw new Error(
      `Policy realization has invalid status/chronology: ${record.id}`,
    );
  }
  assertCanonicalSemanticKeys(record.reasonKeys, "Policy-realization reason");
  const computed = computePolicyConsequences(
    world,
    estimate.operationIds,
    profile,
  );
  const active = computed.filter(
    (item) => item.triggered && !isZeroMetricValue(item.estimatedChange),
  );
  const expectedStatus = realizationStatus(profile, active.length > 0);
  if (record.status !== expectedStatus) {
    throw new Error(
      `Policy realization status does not match implementation evidence: ${record.id}`,
    );
  }
  if (record.status === "blocked" || record.status === "not-triggered") {
    if (
      record.actualCausalProcessId !== null ||
      record.consequences.length !== 0
    ) {
      throw new Error(
        `Blocked/untriggered realization cannot create effects: ${record.id}`,
      );
    }
  } else {
    assertAlternativeHasNoOtherEffectProducingRealization(world, record);
    const cause = requireRealizedPolicyCause(world, record, estimate);
    validateRealizedPolicyConsequences(world, record, estimate, cause, active);
  }
  validatePolicyProvenance(
    world,
    record.provenance,
    record.recordedAt,
    record.sequence,
  );
}

function assertEstimateHasNoOtherPolicyRealization(
  world: World,
  record: PolicyRealizationRecord,
): void {
  if (
    world.history.policyRealizations.some(
      (candidate) =>
        candidate.id !== record.id &&
        candidate.estimateId === record.estimateId,
    )
  ) {
    throw new Error(
      `Policy estimate has multiple realization records: ${record.id}`,
    );
  }
}

function assertAlternativeHasNoOtherEffectProducingRealization(
  world: World,
  record: PolicyRealizationRecord,
): void {
  const estimate = requirePolicyEstimate(world, record.estimateId);
  const other = world.history.policyRealizations.find((candidate) => {
    if (candidate.id === record.id) return false;
    if (candidate.status !== "full" && candidate.status !== "partial") {
      return false;
    }
    return (
      requirePolicyEstimate(world, candidate.estimateId).alternativeId ===
      estimate.alternativeId
    );
  });
  if (other) {
    throw new Error(
      `Policy alternative has multiple effect-producing realizations: ${record.id}`,
    );
  }
}

function requireRealizedPolicyCause(
  world: World,
  realization: PolicyRealizationRecord,
  estimate: PolicyEstimateRecord,
): CausalProcessRecord {
  const cause = world.history.causalProcesses.find(
    (candidate) => candidate.id === realization.actualCausalProcessId,
  );
  if (
    !cause ||
    cause.sequence >= realization.sequence ||
    cause.kind !== "policy:realized-intervention" ||
    !sameEntityIds(cause.parentCausalIds, [
      estimate.projectedCausalProcessId,
    ]) ||
    !sameEntityIds(cause.sourceEntityIds, [estimate.id]) ||
    cause.effectiveAt !== realization.realizedAt ||
    cause.recordedAt !== realization.recordedAt ||
    cause.provenance.kind !== "simulated" ||
    !sameEntityIds(cause.provenance.sourceEntityIds, [estimate.id])
  ) {
    throw new Error(
      `Policy realization has invalid actual causal process: ${realization.id}`,
    );
  }
  return cause;
}

function validateRealizedPolicyConsequences(
  world: World,
  realization: PolicyRealizationRecord,
  estimate: PolicyEstimateRecord,
  cause: CausalProcessRecord,
  active: readonly PolicyEstimatedConsequence[],
): void {
  if (
    realization.consequences.length !== active.length ||
    JSON.stringify(realization.consequences.map((item) => item.operationId)) !==
      JSON.stringify(active.map((item) => item.operationId)) ||
    new Set(realization.consequences.map((item) => item.effectActivationId))
      .size !== realization.consequences.length
  ) {
    throw new Error(
      `Policy realization effect count/order is inconsistent: ${realization.id}`,
    );
  }
  for (const [index, item] of realization.consequences.entries()) {
    const expected = active[index];
    if (!expected) {
      throw new Error(
        `Policy realization has an unexpected effect: ${realization.id}`,
      );
    }
    const operation = requirePolicyOperation(world, item.operationId);
    const effect = world.history.effectActivations.find(
      (candidate) => candidate.id === item.effectActivationId,
    );
    if (
      !effect ||
      !isCanonicalRealizedPolicyEffect(
        effect,
        operation,
        expected,
        estimate,
        cause,
        realization,
      ) ||
      JSON.stringify(item.realizedChange) !==
        JSON.stringify(expected.estimatedChange)
    ) {
      throw new Error(
        `Policy realization has mismatched Run B effect: ${realization.id}`,
      );
    }
  }
}

function isCanonicalRealizedPolicyEffect(
  effect: EffectActivationRecord,
  operation: PolicyOperationRecord,
  expected: PolicyEstimatedConsequence,
  estimate: PolicyEstimateRecord,
  cause: CausalProcessRecord,
  realization: PolicyRealizationRecord,
): boolean {
  const direction =
    metricValueSign(expected.estimatedChange) < 0 ? "decrease" : "increase";
  return (
    effect.sequence < realization.sequence &&
    effect.causalProcessId === cause.id &&
    effect.targetMetricId === operation.targetMetricId &&
    sameMetricScope(effect.targetScope, operation.targetScope) &&
    effect.direction === direction &&
    JSON.stringify(effect.magnitude) ===
      JSON.stringify(absoluteMetricValue(expected.estimatedChange)) &&
    effectMagnitudeBasisMatchesOperation(effect, operation) &&
    effect.mechanismDefinitionId === operation.mechanismDefinitionId &&
    effect.activatedAt === realization.realizedAt &&
    effect.onsetAt === operation.timing.startsAt &&
    effect.maturesAt === operation.timing.maturesAt &&
    effect.endsAt === operation.timing.endsAt &&
    effect.threshold === null &&
    effect.targetBound === null &&
    effect.realizationKind === operation.realizationKind &&
    sameEntityIds(effect.sourceEntityIds, [estimate.id]) &&
    effect.recordedAt === realization.recordedAt
  );
}

function effectMagnitudeBasisMatchesOperation(
  effect: EffectActivationRecord,
  operation: PolicyOperationRecord,
): boolean {
  return operation.targetReferencePeriod.kind === "point"
    ? effect.magnitudeBasis.kind === "point-at-target"
    : effect.magnitudeBasis.kind === "interval-total" &&
        sameReferencePeriod(
          effect.magnitudeBasis.referencePeriod,
          operation.targetReferencePeriod,
        );
}

function validatePolicyProvenance(
  world: World,
  provenance: PolicyRecordProvenance,
  recordedAt: string,
  sequenceExclusive: number,
): void {
  if (provenance.kind === "authored") {
    assertNonEmpty(provenance.note, "Authored policy provenance note");
    return;
  }
  if (provenance.kind === "source-record") {
    assertNonEmpty(provenance.reference, "Policy source-record reference");
    if (makeIsoDate(provenance.asOf) > recordedAt) {
      throw new Error("Policy source-record provenance is from the future.");
    }
    return;
  }
  if (provenance.kind !== "simulated") {
    throw new Error("Policy record has malformed provenance.");
  }
  assertCanonicalEntityIds(
    provenance.sourceEntityIds,
    "Policy provenance source",
  );
  for (const id of provenance.sourceEntityIds) {
    if (!canonicalEntityAvailable(world, id, recordedAt, sequenceExclusive)) {
      throw new Error(`Policy provenance source is unavailable: ${id}`);
    }
  }
}

function realizationStatus(
  profile: PolicyImplementationProfileRecord,
  hasTriggeredChange: boolean,
): PolicyRealizationStatus {
  if (implementationStatus(profile) === "blocked") return "blocked";
  if (!hasTriggeredChange) return "not-triggered";
  return implementationStatus(profile);
}

function blockedFactorReasonKeys(
  profile: PolicyImplementationProfileRecord,
): PolicySemanticKey[] {
  return canonicalSemanticKeys(
    profile.factors
      .filter((factor) => factor.share.numerator === 0)
      .map((factor) => factor.reasonKey),
  );
}

function constrainedFactorReasonKeys(
  profile: PolicyImplementationProfileRecord,
): PolicySemanticKey[] {
  const one = createExactQuantity(1, 1, "rate:share");
  return canonicalSemanticKeys(
    profile.factors
      .filter((factor) => compareExactQuantities(factor.share, one) < 0)
      .map((factor) => factor.reasonKey),
  );
}

function coverageShare(
  required: WorldMetricValue,
  available: WorldMetricValue,
): ExactQuantity {
  assertCompatibleMetricValues(required, available);
  assertNonnegativeMetricValue(required, "Required policy resource");
  assertNonnegativeMetricValue(available, "Available policy resource");
  if (isZeroMetricValue(required))
    return createExactQuantity(1, 1, "rate:share");
  if (compareMetricValues(available, required) >= 0) {
    return createExactQuantity(1, 1, "rate:share");
  }
  return required.kind === "quantity" && available.kind === "quantity"
    ? divideExactQuantities(available.quantity, required.quantity, "rate:share")
    : required.kind === "money" && available.kind === "money"
      ? createExactQuantity(
          available.money.minorUnits,
          required.money.minorUnits,
          "rate:share",
        )
      : (() => {
          throw new Error("Policy resources are incompatible.");
        })();
}

function canonicalFactors(
  factors: readonly PolicyImplementationFactor[],
): readonly PolicyImplementationFactor[] {
  const order = new Map(
    IMPLEMENTATION_FACTOR_ORDER.map((kind, index) => [kind, index]),
  );
  return factors
    .map((factor) => ({
      ...factor,
      share: { ...factor.share },
      basis:
        factor.basis.kind === "direct"
          ? { kind: "direct" as const }
          : {
              kind: "resource-ratio" as const,
              required: cloneMetricValue(factor.basis.required),
              available: cloneMetricValue(factor.basis.available),
            },
      evidenceEntityIds: canonicalEntityIds(factor.evidenceEntityIds),
    }))
    .sort(
      (left, right) =>
        (order.get(left.kind) ?? 99) - (order.get(right.kind) ?? 99),
    );
}

function canonicalEntityAvailable(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (
    id === world.id ||
    world.jurisdictions[id] ||
    world.people[id] ||
    world.policyCatalog.domains[id] ||
    world.policyCatalog.issues[id] ||
    world.policyCatalog.propositions[id] ||
    world.metricCatalog.definitions[id] ||
    world.causalMechanismCatalog.definitions[id]
  ) {
    return true;
  }
  const policy = policyHistoryRecords(world).find((record) => record.id === id);
  if (policy)
    return policy.recordedAt <= asOfDate && policy.sequence < sequenceExclusive;
  if (lifeEntityExists(world, id)) {
    return lifeEntityAvailableAt(
      world,
      id,
      makeIsoDate(asOfDate),
      sequenceExclusive,
    );
  }
  if (resourceHousingEntityExists(world, id)) {
    return resourceHousingEntityAvailableAt(
      world,
      id,
      makeIsoDate(asOfDate),
      sequenceExclusive,
    );
  }
  if (worldMetricEntityExists(world, id)) {
    return worldMetricEntityAvailableAt(world, id, asOfDate, sequenceExclusive);
  }
  if (futureTransitionEntityExists(world, id)) {
    return futureTransitionEntityAvailableAt(
      world,
      id,
      asOfDate,
      sequenceExclusive,
    );
  }
  const historyRecord = [
    ...world.history.events,
    ...world.history.causalProcesses,
    ...world.history.effectActivations,
  ].find((record) => record.id === id);
  return !!(
    historyRecord &&
    historyRecord.recordedAt <= asOfDate &&
    historyRecord.sequence < sequenceExclusive
  );
}

function requirePolicyAlternative(
  world: World,
  id: EntityId,
): PolicyAlternativeRecord {
  const record = world.history.policyAlternatives.find(
    (candidate) => candidate.id === id,
  );
  if (!record) throw new Error(`Missing policy alternative: ${id}`);
  return record;
}

function requirePolicyBaseline(
  world: World,
  id: EntityId,
): PolicyBaselineRecord {
  const record = world.history.policyBaselines.find(
    (candidate) => candidate.id === id,
  );
  if (!record) throw new Error(`Missing policy baseline: ${id}`);
  return record;
}

function requirePolicyOperation(
  world: World,
  id: EntityId,
): PolicyOperationRecord {
  const record = world.history.policyOperations.find(
    (candidate) => candidate.id === id,
  );
  if (!record) throw new Error(`Missing policy operation: ${id}`);
  return record;
}

function requirePolicyImplementationProfile(
  world: World,
  id: EntityId,
): PolicyImplementationProfileRecord {
  const record = world.history.policyImplementationProfiles.find(
    (candidate) => candidate.id === id,
  );
  if (!record) throw new Error(`Missing policy implementation profile: ${id}`);
  return record;
}

function requirePolicyEstimate(
  world: World,
  id: EntityId,
): PolicyEstimateRecord {
  const record = world.history.policyEstimates.find(
    (candidate) => candidate.id === id,
  );
  if (!record) throw new Error(`Missing policy estimate: ${id}`);
  return record;
}

function validateMetricScope(world: World, scope: MetricScope): void {
  if (!world.jurisdictions[scope.jurisdictionId]) {
    throw new Error(
      `Policy metric scope has missing jurisdiction: ${scope.jurisdictionId}`,
    );
  }
  if (scope.segmentKey !== null) {
    assertDottedContentKey(scope.segmentKey, "Policy metric segment key");
  }
}

function referencePeriodEnd(period: MetricReferencePeriod): string {
  return period.kind === "point" ? period.at : period.endsAt;
}

function assertMetricValueForDefinition(
  value: WorldMetricValue,
  definition: WorldMetricDefinition,
): void {
  if (value.kind !== definition.valueKind) {
    throw new Error(
      `Policy metric value kind does not match definition: ${definition.id}`,
    );
  }
  if (value.kind === "quantity") {
    assertExactQuantity(value.quantity);
    if (value.quantity.unit !== definition.quantityUnit) {
      throw new Error(
        `Policy metric quantity unit does not match definition: ${definition.id}`,
      );
    }
  } else {
    makeCurrencyCode(value.money.currency);
    if (!Number.isSafeInteger(value.money.minorUnits)) {
      throw new Error("Policy money must use exact safe integer minor units.");
    }
  }
}

function validateUncertainty(
  uncertainty: MetricObservationUncertainty,
  value: WorldMetricValue,
): void {
  if (uncertainty.kind === "none") return;
  if (uncertainty.kind === "range") {
    assertCompatibleMetricValues(value, uncertainty.lower);
    assertCompatibleMetricValues(value, uncertainty.upper);
    if (compareMetricValues(uncertainty.lower, uncertainty.upper) > 0) {
      throw new Error("Policy uncertainty range is reversed.");
    }
    return;
  }
  if (uncertainty.kind !== "margin-of-error") {
    throw new Error("Policy uncertainty has malformed kind.");
  }
  assertCompatibleMetricValues(value, uncertainty.margin);
  assertNonnegativeMetricValue(uncertainty.margin, "Policy uncertainty margin");
  if (uncertainty.confidence !== null) {
    assertNonnegativeShare(
      uncertainty.confidence,
      true,
      "Policy uncertainty confidence",
    );
  }
}

function assertNonnegativeShare(
  value: ExactQuantity,
  bounded: boolean,
  label: string,
): void {
  assertExactQuantity(value);
  if (value.unit !== "rate:share" || value.numerator < 0) {
    throw new Error(`${label} must be a nonnegative exact share.`);
  }
  if (
    bounded &&
    compareExactQuantities(value, createExactQuantity(1, 1, "rate:share")) > 0
  ) {
    throw new Error(`${label} must not exceed one.`);
  }
}

function assertNonnegativeMetricValue(
  value: WorldMetricValue,
  label: string,
): void {
  if (metricValueSign(value) < 0)
    throw new Error(`${label} cannot be negative.`);
}

function assertDirection(direction: string): void {
  if (direction !== "increase" && direction !== "decrease") {
    throw new Error(`Malformed policy change direction: ${direction}`);
  }
}

function addMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): WorldMetricValue {
  assertCompatibleMetricValues(left, right);
  if (left.kind === "quantity" && right.kind === "quantity") {
    return {
      kind: "quantity",
      quantity: addExactQuantities(left.quantity, right.quantity),
    };
  }
  if (left.kind === "money" && right.kind === "money") {
    const minorUnits = left.money.minorUnits + right.money.minorUnits;
    if (!Number.isSafeInteger(minorUnits))
      throw new Error("Policy money addition exceeds safe precision.");
    return {
      kind: "money",
      money: { minorUnits, currency: left.money.currency },
    };
  }
  throw new Error("Policy metric values are incompatible.");
}

function subtractMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): WorldMetricValue {
  return addMetricValues(left, negateMetricValue(right));
}

function negateMetricValue(value: WorldMetricValue): WorldMetricValue {
  if (value.kind === "quantity") {
    return {
      kind: "quantity",
      quantity: createExactQuantity(
        -value.quantity.numerator,
        value.quantity.denominator,
        value.quantity.unit,
      ),
    };
  }
  if (value.money.minorUnits === Number.MIN_SAFE_INTEGER) {
    throw new Error("Policy money negation exceeds safe precision.");
  }
  return {
    kind: "money",
    money: {
      minorUnits: -value.money.minorUnits,
      currency: value.money.currency,
    },
  };
}

function absoluteMetricValue(value: WorldMetricValue): WorldMetricValue {
  return metricValueSign(value) < 0
    ? negateMetricValue(value)
    : cloneMetricValue(value);
}

function scaleMetricValue(
  value: WorldMetricValue,
  factor: ExactQuantity,
): WorldMetricValue {
  assertExactQuantity(factor);
  if (factor.unit !== "rate:share")
    throw new Error("Policy scale factor must use rate:share.");
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: scaleExactQuantity(value.quantity, factor) }
    : {
        kind: "money",
        money: {
          minorUnits: scaleSafeIntegerByExactShare(
            value.money.minorUnits,
            factor,
          ),
          currency: value.money.currency,
        },
      };
}

function compareMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): number {
  assertCompatibleMetricValues(left, right);
  if (left.kind === "quantity" && right.kind === "quantity") {
    return compareExactQuantities(left.quantity, right.quantity);
  }
  if (left.kind === "money" && right.kind === "money") {
    return left.money.minorUnits < right.money.minorUnits
      ? -1
      : left.money.minorUnits > right.money.minorUnits
        ? 1
        : 0;
  }
  throw new Error("Policy metric values are incompatible.");
}

function assertCompatibleMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): void {
  if (left.kind !== right.kind)
    throw new Error("Policy metric value kinds are incompatible.");
  if (left.kind === "quantity" && right.kind === "quantity") {
    assertExactQuantity(left.quantity);
    assertExactQuantity(right.quantity);
    if (left.quantity.unit !== right.quantity.unit) {
      throw new Error("Policy metric quantity units are incompatible.");
    }
  } else if (
    left.kind === "money" &&
    right.kind === "money" &&
    left.money.currency !== right.money.currency
  ) {
    throw new Error("Policy metric money currencies are incompatible.");
  }
}

function metricValueSign(value: WorldMetricValue): number {
  return value.kind === "quantity"
    ? Math.sign(value.quantity.numerator)
    : Math.sign(value.money.minorUnits);
}

function isZeroMetricValue(value: WorldMetricValue): boolean {
  return value.kind === "quantity"
    ? value.quantity.numerator === 0
    : value.money.minorUnits === 0;
}

function zeroMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? {
        kind: "quantity",
        quantity: createExactQuantity(0, 1, value.quantity.unit),
      }
    : {
        kind: "money",
        money: { minorUnits: 0, currency: value.money.currency },
      };
}

function cloneMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: { ...value.quantity } }
    : { kind: "money", money: { ...value.money } };
}

function clonePolicyOperation(
  operation: QuantitativePolicyOperation,
): QuantitativePolicyOperation {
  switch (operation.kind) {
    case "set-level":
      return { kind: operation.kind, value: cloneMetricValue(operation.value) };
    case "absolute-change":
      return { ...operation, magnitude: cloneMetricValue(operation.magnitude) };
    case "relative-change":
      return { ...operation, share: { ...operation.share } };
    case "share-of-baseline":
      return { ...operation, share: { ...operation.share } };
    case "cap":
      return {
        kind: operation.kind,
        maximum: cloneMetricValue(operation.maximum),
      };
    case "floor":
      return {
        kind: operation.kind,
        minimum: cloneMetricValue(operation.minimum),
      };
  }
}

function clonePolicyTrigger(
  trigger: PolicyOperationTrigger | null,
): PolicyOperationTrigger | null {
  return trigger === null
    ? null
    : { ...trigger, threshold: cloneMetricValue(trigger.threshold) };
}

function cloneUncertainty(
  uncertainty: MetricObservationUncertainty,
): MetricObservationUncertainty {
  if (uncertainty.kind === "none") return { kind: "none" };
  if (uncertainty.kind === "range") {
    return {
      kind: "range",
      lower: cloneMetricValue(uncertainty.lower),
      upper: cloneMetricValue(uncertainty.upper),
    };
  }
  return {
    kind: "margin-of-error",
    margin: cloneMetricValue(uncertainty.margin),
    confidence:
      uncertainty.confidence === null ? null : { ...uncertainty.confidence },
  };
}

function clonePolicyProvenance(
  provenance: PolicyRecordProvenance,
): PolicyRecordProvenance {
  return provenance.kind === "simulated"
    ? {
        kind: "simulated",
        sourceEntityIds: canonicalEntityIds(provenance.sourceEntityIds),
      }
    : { ...provenance };
}

function canonicalEntityIds(values: readonly EntityId[]): EntityId[] {
  return [...new Set(values)].sort();
}

function sameEntityIds(
  left: readonly EntityId[],
  right: readonly EntityId[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertCanonicalEntityIds(
  values: readonly EntityId[],
  label: string,
): void {
  if (JSON.stringify(values) !== JSON.stringify(canonicalEntityIds(values))) {
    throw new Error(`${label} IDs must be sorted and unique.`);
  }
}

function canonicalSemanticKeys(
  values: readonly PolicySemanticKey[],
): PolicySemanticKey[] {
  for (const value of values) assertSemanticKey(value, "Policy semantic key");
  return [...new Set(values)].sort();
}

function assertCanonicalSemanticKeys(
  values: readonly PolicySemanticKey[],
  label: string,
): void {
  if (
    JSON.stringify(values) !== JSON.stringify(canonicalSemanticKeys(values))
  ) {
    throw new Error(`${label} keys must be sorted and unique.`);
  }
}

function assertSemanticKey(
  value: string,
  label: string,
): asserts value is PolicySemanticKey {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  makeIsoDate(cutoff.asOfDate);
  if (
    cutoff.asOfDate > world.currentDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Policy historical cutoff is outside world history.");
  }
}

function policyRecordAvailable(
  record: PolicyHistoryRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: PolicyHistoryRecord,
  kind: Parameters<typeof createStableId>[0],
): void {
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(
      `Policy history ID does not match stable key: ${record.id}`,
    );
  }
  if (ids.has(record.id)) throw new Error(`Duplicate entity ID: ${record.id}`);
  ids.add(record.id);
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 0) {
    throw new Error(`Policy history has invalid sequence: ${record.id}`);
  }
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  for (let index = 1; index < records.length; index += 1) {
    if (records[index - 1]!.sequence >= records[index]!.sequence) {
      throw new Error(`${label} history is not append-sequence ordered.`);
    }
  }
}

function assertUniqueStableKey(
  records: readonly { readonly stableKey: string }[],
  stableKey: string,
  label: string,
): void {
  assertNonEmpty(stableKey, `${label} stable key`);
  if (records.some((record) => record.stableKey === stableKey)) {
    throw new Error(`Duplicate ${label} stable key: ${stableKey}`);
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

function bySequence(
  left: { readonly sequence: number },
  right: { readonly sequence: number },
): number {
  return left.sequence - right.sequence;
}

function commit(world: World, history: World["history"]): World {
  const next: World = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}
