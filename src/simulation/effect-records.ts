/** Saved effect records and integrity; no effect evaluator or outcome producer. */
import { eventById } from "./event-index";
import { makeIsoDate } from "./dates";
import {
  futureTransitionEntityAvailableAt,
  futureTransitionEntityExists,
} from "./future-transitions";
import { createStableId } from "./ids";
import {
  incidentEntityAvailableAt,
  incidentEntityExists,
} from "./incident-integrity";
import { lifeEntityAvailableAt, lifeEntityExists } from "./life-integrity";
import { assertExactQuantity } from "./quantity";
import {
  resourceHousingEntityAvailableAt,
  resourceHousingEntityExists,
} from "./resource-integrity";
import { makeCurrencyCode } from "./resources";
import { assertDottedContentKey } from "./taxonomy";
import type {
  CausalMechanismCatalog,
  CausalMechanismDefinition,
  CausalProcessRecord,
  CausalRecordProvenance,
  EffectActivationRecord,
  EffectDirection,
  EffectMagnitudeBasis,
  EffectRealizationKind,
  EffectTargetBound,
  EffectThreshold,
  EntityId,
  HistoricalCutoff,
  MetricScope,
  World,
  WorldMetricDefinition,
  WorldMetricValue,
} from "./types";
import { assertWorldIntegrity } from "./world";
import {
  requireMetricDefinition,
  sameMetricScope,
  validateReferencePeriod,
  worldMetricEntityAvailableAt,
  worldMetricEntityExists,
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
  readonly magnitudeBasis: EffectMagnitudeBasis;
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
    magnitudeBasis: cloneEffectMagnitudeBasis(input.magnitudeBasis),
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
  validateEffectMagnitudeBasis(activation, metric);
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

function validateEffectMagnitudeBasis(
  activation: EffectActivationRecord,
  metric: WorldMetricDefinition,
): void {
  const basis = activation.magnitudeBasis;
  if (!basis || typeof basis !== "object") {
    throw new Error(
      `Effect activation has no magnitude basis: ${activation.id}`,
    );
  }
  if (metric.referencePeriodKind === "point") {
    if (basis.kind !== "point-at-target") {
      throw new Error(
        `Point metric effect requires a point-at-target magnitude basis: ${activation.id}`,
      );
    }
    return;
  }
  if (basis.kind !== "interval-total") {
    throw new Error(
      `Interval metric effect requires an exact interval-total magnitude basis: ${activation.id}`,
    );
  }
  validateReferencePeriod(basis.referencePeriod);
  if (basis.referencePeriod.kind !== "interval") {
    throw new Error(
      `Interval metric effect has an invalid magnitude reference period: ${activation.id}`,
    );
  }
}

export function assertMetricValueForDefinition(
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

export function assertCompatibleMetricValues(
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

function metricValueSign(value: WorldMetricValue): number {
  return value.kind === "quantity"
    ? Math.sign(value.quantity.numerator)
    : Math.sign(value.money.minorUnits);
}

export function cloneMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: { ...value.quantity } }
    : { kind: "money", money: { ...value.money } };
}

function cloneEffectMagnitudeBasis(
  basis: EffectMagnitudeBasis,
): EffectMagnitudeBasis {
  if (!basis || typeof basis !== "object") {
    return basis;
  }
  return basis.kind === "point-at-target"
    ? { kind: "point-at-target" }
    : basis.kind === "interval-total"
      ? {
          kind: "interval-total",
          referencePeriod: { ...basis.referencePeriod },
        }
      : basis;
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

export function validateMetricScope(world: World, scope: MetricScope): void {
  if (!world.jurisdictions[scope.jurisdictionId]) {
    throw new Error(
      `Metric scope references missing jurisdiction: ${scope.jurisdictionId}`,
    );
  }
  if (scope.segmentKey !== null) {
    assertDottedContentKey(scope.segmentKey, "Metric segment key");
  }
}

export function validateCutoff(world: World, cutoff: HistoricalCutoff): void {
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

export function causalRecordAvailable(
  record: CausalProcessRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
}

export function effectRecordAvailable(
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
  if (incidentEntityExists(world, id)) {
    return incidentEntityAvailableAt(world, id, asOfDate, sequenceExclusive);
  }
  if (futureTransitionEntityExists(world, id)) {
    return futureTransitionEntityAvailableAt(
      world,
      id,
      asOfDate,
      sequenceExclusive,
    );
  }
  const policyRecord = [
    ...world.history.policyAlternatives,
    ...world.history.policyBaselines,
    ...world.history.policyOperations,
    ...world.history.policyImplementationProfiles,
    ...world.history.policyEstimates,
    ...world.history.policyRealizations,
  ].find((record) => record.id === id);
  if (policyRecord) {
    return (
      policyRecord.recordedAt <= asOfDate &&
      policyRecord.sequence < sequenceExclusive
    );
  }
  const event = eventById(world, id);
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

export function canonicalEntityIds(
  ids: readonly EntityId[],
): readonly EntityId[] {
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

export function bySequence<T extends { readonly sequence: number }>(
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
