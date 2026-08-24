import { daysBetween, makeIsoDate } from "./dates";
import {
  futureTransitionEntityAvailableAt,
  futureTransitionEntityExists,
} from "./future-transitions";
import { createStableId } from "./ids";
import { lifeEntityAvailableAt, lifeEntityExists } from "./life-integrity";
import {
  addExactQuantities,
  assertExactQuantity,
  compareExactQuantities,
  createExactQuantity,
  multiplyExactShares,
  scaleExactQuantity,
  scaleSafeIntegerByExactShare,
  subtractExactQuantities,
} from "./quantity";
import {
  resourceHousingEntityAvailableAt,
  resourceHousingEntityExists,
} from "./resource-integrity";
import { makeCurrencyCode } from "./resources";
import { assertDottedContentKey } from "./taxonomy";
import type {
  AggregateMetricEvaluation,
  CausalMechanismCatalog,
  CausalMechanismDefinition,
  CausalProcessRecord,
  CausalRecordProvenance,
  EffectActivationRecord,
  EffectContribution,
  EffectDirection,
  EffectRealizationKind,
  EffectTargetBound,
  EffectThreshold,
  EntityId,
  HistoricalCutoff,
  MetricReferencePeriod,
  MetricScope,
  World,
  WorldMetricDefinition,
  WorldMetricValue,
} from "./types";
import { assertWorldIntegrity } from "./world";
import {
  recordWorldMetricState,
  requireMetricDefinition,
  sameMetricScope,
  sameReferencePeriod,
  validateReferencePeriod,
  worldMetricEntityAvailableAt,
  worldMetricEntityExists,
  worldMetricStateForPeriodAt,
} from "./world-metrics";

const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export interface CausalMechanismDefinitionInput {
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly domainKey: CausalMechanismDefinition["domainKey"];
  readonly responseCurve: CausalMechanismDefinition["responseCurve"];
  readonly tags: readonly string[];
}

export interface CausalMechanismCatalogInput {
  readonly definitions: readonly CausalMechanismDefinition[];
}

export interface RecordCausalProcessInput {
  readonly stableKey: string;
  readonly kind: CausalProcessRecord["kind"];
  readonly effectiveAt: string;
  readonly recordedAt: string;
  readonly sourceEntityIds: readonly EntityId[];
  readonly parentCausalIds: readonly EntityId[];
  readonly provenance: CausalRecordProvenance;
}

export interface ActivateEffectInput {
  readonly stableKey: string;
  readonly mechanismDefinitionId: EntityId;
  readonly causalProcessId: EntityId;
  readonly targetMetricId: EntityId;
  readonly targetScope: MetricScope;
  readonly direction: EffectDirection;
  readonly magnitude: WorldMetricValue;
  readonly activatedAt: string;
  readonly onsetAt: string;
  readonly maturesAt: string;
  readonly endsAt: string | null;
  readonly threshold: EffectThreshold | null;
  readonly targetBound: EffectTargetBound | null;
  readonly realizationKind: EffectRealizationKind;
  readonly sourceEntityIds: readonly EntityId[];
  readonly recordedAt: string;
}

export interface EvaluateEffectContributionInput {
  readonly effectActivationId: EntityId;
  readonly evaluatedAt: string;
  readonly referencePeriod: MetricReferencePeriod;
  readonly cutoff: HistoricalCutoff;
  readonly baselineValue: WorldMetricValue;
}

export interface EvaluateAggregateMetricInput {
  readonly baselineStateId: EntityId;
  readonly evaluatedAt: string;
  readonly referencePeriod: MetricReferencePeriod;
  readonly cutoff: HistoricalCutoff;
}

export interface RecordEvaluatedMetricStateInput {
  readonly stableKey: string;
  readonly baselineStateId: EntityId;
  readonly evaluatedAt: string;
  readonly referencePeriod: MetricReferencePeriod;
}

export function createCausalMechanismDefinition(
  input: CausalMechanismDefinitionInput,
): CausalMechanismDefinition {
  return {
    ...input,
    id: createStableId(
      "causal-mechanism-definition",
      `definition:${input.stableKey}`,
    ),
    responseCurve: { ...input.responseCurve },
    tags: canonicalDottedKeys(input.tags, "Causal mechanism tag"),
  };
}

export function createCausalMechanismCatalog(
  input: CausalMechanismCatalogInput,
): CausalMechanismCatalog {
  const catalog: CausalMechanismCatalog = {
    catalogVersion: "causal-mechanism-catalog-v1",
    definitions: Object.fromEntries(
      input.definitions.map((definition) => [
        definition.id,
        cloneMechanismDefinition(definition),
      ]),
    ),
    definitionOrder: input.definitions.map((definition) => definition.id),
  };
  assertCausalMechanismCatalogIntegrity(catalog);
  return cloneCausalMechanismCatalog(catalog);
}

export function createSyntheticCausalMechanismCatalog(): CausalMechanismCatalog {
  return createCausalMechanismCatalog({
    definitions: [
      createCausalMechanismDefinition({
        stableKey: "mechanism.linear-transition",
        name: "Linear transition",
        description:
          "A contribution phases linearly from zero to its exact magnitude.",
        domainKey: "causal.general",
        responseCurve: { kind: "linear" },
        tags: ["causal.linear"],
      }),
      createCausalMechanismDefinition({
        stableKey: "mechanism.bounded-ease-out",
        name: "Bounded ease-out transition",
        description:
          "A nonlinear exact contribution approaches its magnitude with a bounded quadratic ease-out curve.",
        domainKey: "causal.general",
        responseCurve: { kind: "bounded-ease-out" },
        tags: ["causal.bounded", "causal.nonlinear"],
      }),
    ],
  });
}

export function cloneCausalMechanismCatalog(
  catalog: CausalMechanismCatalog,
): CausalMechanismCatalog {
  return {
    catalogVersion: catalog.catalogVersion,
    definitions: Object.fromEntries(
      Object.entries(catalog.definitions).map(([id, definition]) => [
        id,
        cloneMechanismDefinition(definition),
      ]),
    ),
    definitionOrder: [...catalog.definitionOrder],
  };
}

export function assertCausalMechanismCatalogIntegrity(
  catalog: CausalMechanismCatalog,
): void {
  if (catalog.catalogVersion !== "causal-mechanism-catalog-v1") {
    throw new Error("Unsupported causal-mechanism catalog version.");
  }
  const recordIds = Object.keys(catalog.definitions).sort();
  const orderIds = [...catalog.definitionOrder].sort();
  if (
    new Set(catalog.definitionOrder).size !== catalog.definitionOrder.length ||
    JSON.stringify(recordIds) !== JSON.stringify(orderIds)
  ) {
    throw new Error("Causal-mechanism catalog order and definitions disagree.");
  }
  const stableKeys = new Set<string>();
  for (const id of catalog.definitionOrder) {
    const definition = catalog.definitions[id];
    if (!definition || definition.id !== id) {
      throw new Error(`Missing or miskeyed causal mechanism: ${id}`);
    }
    assertDottedContentKey(definition.stableKey, "Causal mechanism stable key");
    if (
      definition.id !==
      createStableId(
        "causal-mechanism-definition",
        `definition:${definition.stableKey}`,
      )
    ) {
      throw new Error(`Causal mechanism ID does not match its key: ${id}`);
    }
    if (stableKeys.has(definition.stableKey)) {
      throw new Error(
        `Duplicate causal-mechanism stable key: ${definition.stableKey}`,
      );
    }
    stableKeys.add(definition.stableKey);
    assertNonEmpty(definition.name, "Causal mechanism name");
    assertNonEmpty(definition.description, "Causal mechanism description");
    assertDottedContentKey(definition.domainKey, "Causal mechanism domain");
    if (
      definition.responseCurve.kind !== "linear" &&
      definition.responseCurve.kind !== "bounded-ease-out"
    ) {
      throw new Error(`Invalid causal response curve: ${id}`);
    }
    assertCanonicalDottedKeys(definition.tags, "Causal mechanism tag");
  }
}

export function recordCausalProcess(
  world: World,
  input: RecordCausalProcessInput,
): World {
  assertUniqueStableKey(
    world.history.causalProcesses,
    input.stableKey,
    "causal process",
  );
  const record: CausalProcessRecord = {
    ...input,
    id: createStableId("causal-process", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    effectiveAt: makeIsoDate(input.effectiveAt),
    recordedAt: makeIsoDate(input.recordedAt),
    sourceEntityIds: canonicalEntityIds(input.sourceEntityIds),
    parentCausalIds: canonicalEntityIds(input.parentCausalIds),
    provenance: cloneCausalProvenance(input.provenance),
  };
  validateCausalProcess(world, record, world.history.causalProcesses);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    causalProcesses: [...world.history.causalProcesses, record],
  });
}

export function activateEffect(
  world: World,
  input: ActivateEffectInput,
): World {
  assertUniqueStableKey(
    world.history.effectActivations,
    input.stableKey,
    "effect activation",
  );
  const activation: EffectActivationRecord = {
    ...input,
    id: createStableId("effect-activation", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    targetScope: { ...input.targetScope },
    magnitude: cloneMetricValue(input.magnitude),
    activatedAt: makeIsoDate(input.activatedAt),
    onsetAt: makeIsoDate(input.onsetAt),
    maturesAt: makeIsoDate(input.maturesAt),
    endsAt: input.endsAt === null ? null : makeIsoDate(input.endsAt),
    threshold: cloneThreshold(input.threshold),
    targetBound: cloneTargetBound(input.targetBound),
    sourceEntityIds: canonicalEntityIds(input.sourceEntityIds),
    recordedAt: makeIsoDate(input.recordedAt),
  };
  validateEffectActivation(world, activation);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    effectActivations: [...world.history.effectActivations, activation],
  });
}

export function causalProcessAt(
  world: World,
  causalProcessId: EntityId,
  cutoff: HistoricalCutoff,
): CausalProcessRecord | null {
  validateCutoff(world, cutoff);
  const record = world.history.causalProcesses.find(
    (candidate) => candidate.id === causalProcessId,
  );
  return record && causalRecordAvailable(record, cutoff) ? record : null;
}

export function effectActivationsAt(
  world: World,
  targetMetricId: EntityId,
  targetScope: MetricScope,
  cutoff: HistoricalCutoff,
): readonly EffectActivationRecord[] {
  validateCutoff(world, cutoff);
  validateMetricScope(world, targetScope);
  return world.history.effectActivations
    .filter(
      (activation) =>
        activation.targetMetricId === targetMetricId &&
        sameMetricScope(activation.targetScope, targetScope) &&
        effectRecordAvailable(activation, cutoff),
    )
    .sort(bySequence);
}

export function distinctRootCausalIds(
  world: World,
  causalOrEffectIds: readonly EntityId[],
  cutoff: HistoricalCutoff,
): readonly EntityId[] {
  validateCutoff(world, cutoff);
  const roots = new Set<EntityId>();
  const visiting = new Set<EntityId>();
  const visit = (causalId: EntityId): void => {
    if (visiting.has(causalId)) {
      throw new Error(`Causal ancestry contains a cycle: ${causalId}`);
    }
    const record = causalProcessAt(world, causalId, cutoff);
    if (!record) {
      throw new Error(`Causal process is unavailable at cutoff: ${causalId}`);
    }
    if (record.parentCausalIds.length === 0) {
      roots.add(record.id);
      return;
    }
    visiting.add(record.id);
    for (const parentId of record.parentCausalIds) visit(parentId);
    visiting.delete(record.id);
  };
  for (const id of [...new Set(causalOrEffectIds)].sort()) {
    const activation = world.history.effectActivations.find(
      (candidate) => candidate.id === id,
    );
    if (activation) {
      if (!effectRecordAvailable(activation, cutoff)) {
        throw new Error(`Effect activation is unavailable at cutoff: ${id}`);
      }
      visit(activation.causalProcessId);
    } else {
      visit(id);
    }
  }
  return [...roots].sort();
}

export function evaluateEffectContribution(
  world: World,
  input: EvaluateEffectContributionInput,
): EffectContribution {
  validateCutoff(world, input.cutoff);
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  if (evaluatedAt > input.cutoff.asOfDate || evaluatedAt > world.currentDate) {
    throw new Error("Effect evaluation date is outside its historical cutoff.");
  }
  validateReferencePeriod(input.referencePeriod);
  const activation = world.history.effectActivations.find(
    (candidate) => candidate.id === input.effectActivationId,
  );
  if (!activation || !effectRecordAvailable(activation, input.cutoff)) {
    throw new Error(
      `Effect activation is unavailable at cutoff: ${input.effectActivationId}`,
    );
  }
  const definition = requireMetricDefinition(world, activation.targetMetricId);
  if (definition.referencePeriodKind !== input.referencePeriod.kind) {
    throw new Error("Effect evaluation period does not match target metric.");
  }
  assertMetricValueForDefinition(input.baselineValue, definition);
  assertCompatibleMetricValues(input.baselineValue, activation.magnitude);
  const roots = distinctRootCausalIds(
    world,
    [activation.causalProcessId],
    input.cutoff,
  );
  const factorResult = responseFactorAt(world, activation, evaluatedAt);
  if (
    factorResult.phase !== "not-started" &&
    factorResult.phase !== "expired" &&
    activation.threshold !== null &&
    !thresholdSatisfied(input.baselineValue, activation.threshold)
  ) {
    return {
      effectActivationId: activation.id,
      causalProcessId: activation.causalProcessId,
      rootCausalIds: roots,
      phase: "threshold-not-met",
      factor: zeroShare(),
      signedValue: zeroMetricValue(activation.magnitude),
    };
  }
  let signedValue = scaleMetricValue(activation.magnitude, factorResult.factor);
  if (activation.direction === "decrease") {
    signedValue = negateMetricValue(signedValue);
  }
  if (activation.targetBound !== null) {
    const desired = addMetricValues(input.baselineValue, signedValue);
    const bounded = applyTargetBound(desired, activation.targetBound);
    signedValue = subtractMetricValues(bounded, input.baselineValue);
  }
  return {
    effectActivationId: activation.id,
    causalProcessId: activation.causalProcessId,
    rootCausalIds: roots,
    phase: factorResult.phase,
    factor: factorResult.factor,
    signedValue,
  };
}

export function evaluateAggregateMetric(
  world: World,
  input: EvaluateAggregateMetricInput,
): AggregateMetricEvaluation {
  validateCutoff(world, input.cutoff);
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  const baseline = world.history.metricStates.find(
    (candidate) => candidate.id === input.baselineStateId,
  );
  if (
    !baseline ||
    baseline.recordedAt > input.cutoff.asOfDate ||
    baseline.sequence >= input.cutoff.historySequenceExclusive
  ) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-baseline",
      missingMetricIds: [],
    };
  }
  if (!sameReferencePeriod(baseline.referencePeriod, input.referencePeriod)) {
    throw new Error(
      "Aggregate evaluation period does not match baseline state.",
    );
  }
  const activations = effectActivationsAt(
    world,
    baseline.metricId,
    baseline.scope,
    input.cutoff,
  );
  const contributions: EffectContribution[] = [];
  let resultingValue = cloneMetricValue(baseline.value);
  for (const activation of activations) {
    const contribution = evaluateEffectContribution(world, {
      effectActivationId: activation.id,
      evaluatedAt,
      referencePeriod: input.referencePeriod,
      cutoff: input.cutoff,
      baselineValue: resultingValue,
    });
    contributions.push(contribution);
    resultingValue = addMetricValues(resultingValue, contribution.signedValue);
  }
  return {
    status: "available",
    baselineStateId: baseline.id,
    metricId: baseline.metricId,
    scope: { ...baseline.scope },
    referencePeriod: { ...input.referencePeriod },
    evaluatedAt,
    baselineValue: cloneMetricValue(baseline.value),
    resultingValue,
    contributions,
    rootCausalIds: distinctRootCausalIds(
      world,
      contributions.map((contribution) => contribution.effectActivationId),
      input.cutoff,
    ),
  };
}

export function recordEvaluatedMetricState(
  world: World,
  input: RecordEvaluatedMetricStateInput,
): World {
  const evaluatedAt = makeIsoDate(input.evaluatedAt);
  const cutoff: HistoricalCutoff = {
    asOfDate: evaluatedAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const evaluation = evaluateAggregateMetric(world, {
    baselineStateId: input.baselineStateId,
    evaluatedAt,
    referencePeriod: input.referencePeriod,
    cutoff,
  });
  if (evaluation.status === "unavailable") {
    throw new Error(
      `Aggregate metric evaluation unavailable: ${evaluation.reasonKey}`,
    );
  }
  const contributingIds = evaluation.contributions
    .filter((contribution) => !isZeroMetricValue(contribution.signedValue))
    .map((contribution) => contribution.effectActivationId);
  if (contributingIds.length === 0) {
    throw new Error("Aggregate metric evaluation has no active contribution.");
  }
  const latest = worldMetricStateForPeriodAt(
    world,
    evaluation.metricId,
    evaluation.scope,
    evaluation.referencePeriod,
    cutoff,
  );
  if (!latest) {
    throw new Error("Aggregate metric evaluation lost its canonical baseline.");
  }
  return recordWorldMetricState(world, {
    stableKey: input.stableKey,
    metricId: evaluation.metricId,
    scope: evaluation.scope,
    referencePeriod: evaluation.referencePeriod,
    value: evaluation.resultingValue,
    recordedAt: evaluatedAt,
    provenance: {
      kind: "simulated",
      sourceEntityIds: canonicalEntityIds([
        evaluation.baselineStateId,
        ...contributingIds,
      ]),
    },
    supersedesStateId: latest.id,
  });
}

export function causalEffectEntityExists(world: World, id: EntityId): boolean {
  return (
    world.causalMechanismCatalog.definitions[id] !== undefined ||
    world.history.causalProcesses.some((record) => record.id === id) ||
    world.history.effectActivations.some((record) => record.id === id)
  );
}

export function causalEffectEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (world.causalMechanismCatalog.definitions[id]) return true;
  const causal = world.history.causalProcesses.find(
    (record) => record.id === id,
  );
  if (causal) {
    return causal.recordedAt <= asOfDate && causal.sequence < sequenceExclusive;
  }
  const activation = world.history.effectActivations.find(
    (record) => record.id === id,
  );
  return !!(
    activation &&
    activation.recordedAt <= asOfDate &&
    activation.sequence < sequenceExclusive
  );
}

export function causalEffectHistoryRecords(
  world: World,
): readonly (CausalProcessRecord | EffectActivationRecord)[] {
  return [...world.history.causalProcesses, ...world.history.effectActivations];
}

export function assertCausalEffectIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertCausalMechanismCatalogIntegrity(world.causalMechanismCatalog);
  assertSequenceOrdered(world.history.causalProcesses, "causal process");
  assertSequenceOrdered(world.history.effectActivations, "effect activation");
  const priorCausal: CausalProcessRecord[] = [];
  for (const record of world.history.causalProcesses) {
    assertHistoryIdentity(ids, world, record, "causal-process");
    validateCausalProcess(world, record, priorCausal);
    priorCausal.push(record);
  }
  for (const activation of world.history.effectActivations) {
    assertHistoryIdentity(ids, world, activation, "effect-activation");
    validateEffectActivation(world, activation);
  }
  assertAcyclicCausalGraph(world.history.causalProcesses);
}

function validateCausalProcess(
  world: World,
  record: CausalProcessRecord,
  priorRecords: readonly CausalProcessRecord[],
): void {
  assertNonEmpty(record.stableKey, "Causal-process stable key");
  assertSemanticKey(record.kind, "Causal-process kind");
  makeIsoDate(record.effectiveAt);
  makeIsoDate(record.recordedAt);
  if (
    record.effectiveAt > record.recordedAt ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(`Causal process has invalid chronology: ${record.id}`);
  }
  assertCanonicalEntityIds(record.sourceEntityIds, "Causal-process source");
  assertCanonicalEntityIds(record.parentCausalIds, "Causal-process parent");
  if (
    record.sourceEntityIds.length === 0 &&
    record.parentCausalIds.length === 0
  ) {
    throw new Error(
      `Causal process requires a canonical source or parent: ${record.id}`,
    );
  }
  if (record.parentCausalIds.includes(record.id)) {
    throw new Error(`Causal process cannot parent itself: ${record.id}`);
  }
  for (const sourceId of record.sourceEntityIds) {
    if (
      !canonicalEntityAvailable(
        world,
        sourceId,
        record.recordedAt,
        record.sequence,
      )
    ) {
      throw new Error(
        `Causal process references unavailable source: ${sourceId}`,
      );
    }
  }
  for (const parentId of record.parentCausalIds) {
    const parent = priorRecords.find((candidate) => candidate.id === parentId);
    if (
      !parent ||
      parent.sequence >= record.sequence ||
      parent.recordedAt > record.recordedAt ||
      parent.effectiveAt > record.effectiveAt
    ) {
      throw new Error(
        `Causal process references unavailable parent: ${parentId}`,
      );
    }
  }
  validateCausalProvenance(world, record);
}

function validateEffectActivation(
  world: World,
  activation: EffectActivationRecord,
): void {
  assertNonEmpty(activation.stableKey, "Effect-activation stable key");
  const mechanism =
    world.causalMechanismCatalog.definitions[activation.mechanismDefinitionId];
  if (!mechanism) {
    throw new Error(
      `Effect activation references missing mechanism: ${activation.id}`,
    );
  }
  const causal = world.history.causalProcesses.find(
    (record) => record.id === activation.causalProcessId,
  );
  if (
    !causal ||
    causal.sequence >= activation.sequence ||
    causal.recordedAt > activation.recordedAt ||
    causal.effectiveAt > activation.activatedAt
  ) {
    throw new Error(
      `Effect activation references unavailable causal process: ${activation.id}`,
    );
  }
  const metric = requireMetricDefinition(world, activation.targetMetricId);
  if (metric.stateSemantics !== "primitive") {
    throw new Error(
      `Effect activation cannot target derived metric: ${activation.id}`,
    );
  }
  validateMetricScope(world, activation.targetScope);
  assertMetricValueForDefinition(activation.magnitude, metric);
  if (metricValueSign(activation.magnitude) < 0) {
    throw new Error(`Effect magnitude cannot be negative: ${activation.id}`);
  }
  if (
    activation.direction !== "increase" &&
    activation.direction !== "decrease"
  ) {
    throw new Error(
      `Effect activation has invalid direction: ${activation.id}`,
    );
  }
  makeIsoDate(activation.activatedAt);
  makeIsoDate(activation.onsetAt);
  makeIsoDate(activation.maturesAt);
  makeIsoDate(activation.recordedAt);
  if (
    activation.activatedAt > activation.onsetAt ||
    activation.onsetAt > activation.maturesAt ||
    activation.activatedAt > activation.recordedAt ||
    activation.recordedAt > world.currentDate ||
    (activation.endsAt !== null &&
      makeIsoDate(activation.endsAt) <= activation.maturesAt)
  ) {
    throw new Error(`Effect activation has invalid timing: ${activation.id}`);
  }
  if (activation.threshold !== null) {
    if (
      activation.threshold.kind !== "target-at-least" &&
      activation.threshold.kind !== "target-at-most"
    ) {
      throw new Error(
        `Effect activation has invalid threshold: ${activation.id}`,
      );
    }
    assertMetricValueForDefinition(activation.threshold.value, metric);
    assertCompatibleMetricValues(
      activation.magnitude,
      activation.threshold.value,
    );
  }
  if (activation.targetBound !== null) {
    if (
      activation.targetBound.kind !== "minimum" &&
      activation.targetBound.kind !== "maximum"
    ) {
      throw new Error(
        `Effect activation has invalid target bound: ${activation.id}`,
      );
    }
    assertMetricValueForDefinition(activation.targetBound.value, metric);
    assertCompatibleMetricValues(
      activation.magnitude,
      activation.targetBound.value,
    );
  }
  assertSemanticKey(activation.realizationKind, "Effect realization kind");
  assertCanonicalEntityIds(activation.sourceEntityIds, "Effect source");
  for (const sourceId of activation.sourceEntityIds) {
    if (
      !canonicalEntityAvailable(
        world,
        sourceId,
        activation.recordedAt,
        activation.sequence,
      )
    ) {
      throw new Error(
        `Effect activation references unavailable source: ${sourceId}`,
      );
    }
  }
}

function validateCausalProvenance(
  world: World,
  record: CausalProcessRecord,
): void {
  if (record.provenance.kind === "simulated") {
    assertCanonicalEntityIds(
      record.provenance.sourceEntityIds,
      "Causal provenance source",
    );
    for (const sourceId of record.provenance.sourceEntityIds) {
      if (
        !canonicalEntityAvailable(
          world,
          sourceId,
          record.recordedAt,
          record.sequence,
        )
      ) {
        throw new Error(`Causal provenance source is unavailable: ${sourceId}`);
      }
    }
  } else if (record.provenance.kind === "initialization") {
    if (record.provenance.sourceReference !== null) {
      assertNonEmpty(
        record.provenance.sourceReference.title,
        "Causal source title",
      );
      if (record.provenance.sourceReference.locator !== null) {
        assertNonEmpty(
          record.provenance.sourceReference.locator,
          "Causal source locator",
        );
      }
    }
  } else if (record.provenance.kind === "authored") {
    assertNonEmpty(record.provenance.note, "Authored causal note");
  } else {
    throw new Error(`Causal process has invalid provenance: ${record.id}`);
  }
}

function responseFactorAt(
  world: World,
  activation: EffectActivationRecord,
  evaluatedAt: string,
): {
  readonly phase: EffectContribution["phase"];
  readonly factor: ReturnType<typeof zeroShare>;
} {
  if (evaluatedAt < activation.onsetAt) {
    return { phase: "not-started", factor: zeroShare() };
  }
  if (activation.endsAt !== null && evaluatedAt >= activation.endsAt) {
    return { phase: "expired", factor: zeroShare() };
  }
  if (
    activation.maturesAt === activation.onsetAt ||
    evaluatedAt >= activation.maturesAt
  ) {
    return { phase: "mature", factor: oneShare() };
  }
  const elapsed = daysBetween(activation.onsetAt, makeIsoDate(evaluatedAt));
  const rampDays = daysBetween(activation.onsetAt, activation.maturesAt);
  const linear = createExactQuantity(elapsed, rampDays, "rate:share");
  const mechanism =
    world.causalMechanismCatalog.definitions[activation.mechanismDefinitionId];
  if (!mechanism)
    throw new Error("Effect mechanism disappeared during evaluation.");
  if (mechanism.responseCurve.kind === "linear") {
    return { phase: "ramping", factor: linear };
  }
  const twice = multiplyExactShares(
    linear,
    createExactQuantity(2, 1, "rate:share"),
  );
  const square = multiplyExactShares(linear, linear);
  return {
    phase: "ramping",
    factor: subtractExactQuantities(twice, square),
  };
}

function thresholdSatisfied(
  baseline: WorldMetricValue,
  threshold: EffectThreshold,
): boolean {
  const comparison = compareMetricValues(baseline, threshold.value);
  return threshold.kind === "target-at-least"
    ? comparison >= 0
    : comparison <= 0;
}

function applyTargetBound(
  desired: WorldMetricValue,
  bound: EffectTargetBound,
): WorldMetricValue {
  const comparison = compareMetricValues(desired, bound.value);
  if (
    (bound.kind === "maximum" && comparison > 0) ||
    (bound.kind === "minimum" && comparison < 0)
  ) {
    return cloneMetricValue(bound.value);
  }
  return desired;
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
    if (!Number.isSafeInteger(minorUnits)) {
      throw new Error("Metric money addition exceeds safe integer precision.");
    }
    return {
      kind: "money",
      money: { minorUnits, currency: left.money.currency },
    };
  }
  throw new Error("Metric values are incompatible.");
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
    throw new Error("Metric money negation exceeds safe integer precision.");
  }
  return {
    kind: "money",
    money: {
      minorUnits: -value.money.minorUnits,
      currency: value.money.currency,
    },
  };
}

function scaleMetricValue(
  value: WorldMetricValue,
  factor: ReturnType<typeof zeroShare>,
): WorldMetricValue {
  if (value.kind === "quantity") {
    return {
      kind: "quantity",
      quantity: scaleExactQuantity(value.quantity, factor),
    };
  }
  return {
    kind: "money",
    money: {
      minorUnits: scaleSafeIntegerByExactShare(value.money.minorUnits, factor),
      currency: value.money.currency,
    },
  };
}

function assertMetricValueForDefinition(
  value: WorldMetricValue,
  definition: WorldMetricDefinition,
): void {
  if (value.kind !== definition.valueKind) {
    throw new Error(
      `Metric value kind does not match definition: ${definition.id}`,
    );
  }
  if (value.kind === "quantity") {
    assertExactQuantity(value.quantity);
    if (value.quantity.unit !== definition.quantityUnit) {
      throw new Error(
        `Metric value unit does not match definition: ${definition.id}`,
      );
    }
  } else {
    makeCurrencyCode(value.money.currency);
    if (!Number.isSafeInteger(value.money.minorUnits)) {
      throw new Error("Metric money must use exact safe integer minor units.");
    }
  }
}

function assertCompatibleMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): void {
  if (left.kind !== right.kind) {
    throw new Error("Metric value kinds are incompatible.");
  }
  if (left.kind === "quantity" && right.kind === "quantity") {
    assertExactQuantity(left.quantity);
    assertExactQuantity(right.quantity);
    if (left.quantity.unit !== right.quantity.unit) {
      throw new Error("Metric quantity units are incompatible.");
    }
  } else if (
    left.kind === "money" &&
    right.kind === "money" &&
    left.money.currency !== right.money.currency
  ) {
    throw new Error("Metric money currencies are incompatible.");
  }
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
  throw new Error("Metric values are incompatible.");
}

function metricValueSign(value: WorldMetricValue): number {
  return value.kind === "quantity"
    ? Math.sign(value.quantity.numerator)
    : Math.sign(value.money.minorUnits);
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

function isZeroMetricValue(value: WorldMetricValue): boolean {
  return value.kind === "quantity"
    ? value.quantity.numerator === 0
    : value.money.minorUnits === 0;
}

function zeroShare() {
  return createExactQuantity(0, 1, "rate:share");
}

function oneShare() {
  return createExactQuantity(1, 1, "rate:share");
}

function cloneMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: { ...value.quantity } }
    : { kind: "money", money: { ...value.money } };
}

function cloneThreshold(
  threshold: EffectThreshold | null,
): EffectThreshold | null {
  return threshold === null
    ? null
    : { kind: threshold.kind, value: cloneMetricValue(threshold.value) };
}

function cloneTargetBound(
  bound: EffectTargetBound | null,
): EffectTargetBound | null {
  return bound === null
    ? null
    : { kind: bound.kind, value: cloneMetricValue(bound.value) };
}

function cloneCausalProvenance(
  provenance: CausalRecordProvenance,
): CausalRecordProvenance {
  if (provenance.kind === "simulated") {
    return {
      kind: "simulated",
      sourceEntityIds: canonicalEntityIds(provenance.sourceEntityIds),
    };
  }
  if (provenance.kind === "initialization") {
    return {
      kind: "initialization",
      sourceReference:
        provenance.sourceReference === null
          ? null
          : { ...provenance.sourceReference },
    };
  }
  return { ...provenance };
}

function cloneMechanismDefinition(
  definition: CausalMechanismDefinition,
): CausalMechanismDefinition {
  return {
    ...definition,
    responseCurve: { ...definition.responseCurve },
    tags: [...definition.tags],
  };
}

function validateMetricScope(world: World, scope: MetricScope): void {
  if (!world.jurisdictions[scope.jurisdictionId]) {
    throw new Error(
      `Metric scope references missing jurisdiction: ${scope.jurisdictionId}`,
    );
  }
  if (scope.segmentKey !== null) {
    assertDottedContentKey(scope.segmentKey, "Metric segment key");
  }
}

function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
  makeIsoDate(cutoff.asOfDate);
  if (cutoff.asOfDate > world.currentDate) {
    throw new Error("Historical cutoff is after the current world date.");
  }
  if (
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Historical cutoff sequence is outside world history.");
  }
}

function causalRecordAvailable(
  record: CausalProcessRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
}

function effectRecordAvailable(
  record: EffectActivationRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
}

function canonicalEntityAvailable(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (id === world.id || world.jurisdictions[id] || world.people[id])
    return true;
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
  const event = world.history.events.find((record) => record.id === id);
  if (event) {
    return event.recordedAt <= asOfDate && event.sequence < sequenceExclusive;
  }
  const causal = world.history.causalProcesses.find(
    (record) => record.id === id,
  );
  if (causal) {
    return causal.recordedAt <= asOfDate && causal.sequence < sequenceExclusive;
  }
  const effect = world.history.effectActivations.find(
    (record) => record.id === id,
  );
  return !!(
    effect &&
    effect.recordedAt <= asOfDate &&
    effect.sequence < sequenceExclusive
  );
}

function assertAcyclicCausalGraph(
  records: readonly CausalProcessRecord[],
): void {
  const byId = new Map(records.map((record) => [record.id, record]));
  const complete = new Set<EntityId>();
  const visiting = new Set<EntityId>();
  const visit = (id: EntityId): void => {
    if (complete.has(id)) return;
    if (visiting.has(id))
      throw new Error(`Causal ancestry contains a cycle: ${id}`);
    const record = byId.get(id);
    if (!record)
      throw new Error(`Causal graph references missing record: ${id}`);
    visiting.add(id);
    for (const parentId of record.parentCausalIds) visit(parentId);
    visiting.delete(id);
    complete.add(id);
  };
  for (const record of records) visit(record.id);
}

function canonicalEntityIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort();
}

function assertCanonicalEntityIds(
  ids: readonly EntityId[],
  label: string,
): void {
  if (JSON.stringify(ids) !== JSON.stringify(canonicalEntityIds(ids))) {
    throw new Error(`${label} IDs must be sorted and unique.`);
  }
}

function canonicalDottedKeys(
  values: readonly string[],
  label: string,
): readonly string[] {
  const canonical = [...new Set(values)].sort();
  for (const value of canonical) assertDottedContentKey(value, label);
  return canonical;
}

function assertCanonicalDottedKeys(
  values: readonly string[],
  label: string,
): void {
  if (JSON.stringify(values) !== JSON.stringify([...new Set(values)].sort())) {
    throw new Error(`${label}s must be sorted and unique.`);
  }
  for (const value of values) assertDottedContentKey(value, label);
}

function assertSemanticKey(value: string, label: string): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind: "causal-process" | "effect-activation",
): void {
  if (ids.has(record.id)) throw new Error(`Duplicate entity ID: ${record.id}`);
  ids.add(record.id);
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(`${kind} ID does not match stable key: ${record.id}`);
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
    throw new Error(`${label} history is not stored in sequence order.`);
  }
}

function bySequence<T extends { readonly sequence: number }>(
  left: T,
  right: T,
): number {
  return left.sequence - right.sequence;
}

function commit(world: World, history: World["history"]): World {
  const next = { ...world, history };
  assertWorldIntegrity(next);
  return next;
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}
