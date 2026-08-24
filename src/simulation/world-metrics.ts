import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { lifeEntityAvailableAt, lifeEntityExists } from "./life-integrity";
import {
  assertExactQuantity,
  compareExactQuantities,
  makeQuantityUnitKey,
} from "./quantity";
import { makeCurrencyCode } from "./resources";
import {
  resourceHousingEntityAvailableAt,
  resourceHousingEntityExists,
} from "./resource-integrity";
import { assertDottedContentKey } from "./taxonomy";
import type {
  EntityId,
  HistoricalCutoff,
  MetricObservationUncertainty,
  MetricReferencePeriod,
  MetricScope,
  MetricStateProvenance,
  World,
  WorldMetricCatalog,
  WorldMetricDefinition,
  WorldMetricObservationRecord,
  WorldMetricStateRecord,
  WorldMetricValue,
} from "./types";
import { assertWorldIntegrity } from "./world";

export interface WorldMetricDefinitionInput {
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly domainKey: WorldMetricDefinition["domainKey"];
  readonly valueKind: WorldMetricDefinition["valueKind"];
  readonly quantityUnit: WorldMetricDefinition["quantityUnit"];
  readonly measureNature: WorldMetricDefinition["measureNature"];
  readonly referencePeriodKind: WorldMetricDefinition["referencePeriodKind"];
  readonly denominatorMetricId: EntityId | null;
  readonly aggregationKind: WorldMetricDefinition["aggregationKind"];
  readonly aggregationNote: string;
  readonly stateSemantics: WorldMetricDefinition["stateSemantics"];
  readonly tags: readonly string[];
}

export interface WorldMetricCatalogInput {
  readonly definitions: readonly WorldMetricDefinition[];
}

export interface RecordWorldMetricStateInput {
  readonly stableKey: string;
  readonly metricId: EntityId;
  readonly scope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly value: WorldMetricValue;
  readonly recordedAt: string;
  readonly provenance: MetricStateProvenance;
  readonly supersedesStateId: EntityId | null;
}

export interface RecordWorldMetricObservationInput {
  readonly stableKey: string;
  readonly metricId: EntityId;
  readonly scope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly value: WorldMetricValue;
  readonly sourceSeriesKey: string;
  readonly sourceLabel: string;
  readonly sourceReference: WorldMetricObservationRecord["sourceReference"];
  readonly methodologyKey: string | null;
  readonly releaseDate: string;
  readonly recordedAt: string;
  readonly vintageKey: string;
  readonly uncertainty: MetricObservationUncertainty;
  readonly supersedesObservationId: EntityId | null;
  readonly underlyingStateId: EntityId | null;
}

const MEASURE_NATURES = ["stock", "flow", "rate", "index"] as const;
const PERIOD_KINDS = ["point", "interval"] as const;
const AGGREGATION_KINDS = [
  "not-aggregatable",
  "sum-compatible",
  "derived-only",
] as const;
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function createWorldMetricDefinition(
  input: WorldMetricDefinitionInput,
): WorldMetricDefinition {
  return {
    ...input,
    id: createStableId(
      "world-metric-definition",
      `definition:${input.stableKey}`,
    ),
    tags: canonicalStrings(input.tags),
  };
}

export function createWorldMetricCatalog(
  input: WorldMetricCatalogInput,
): WorldMetricCatalog {
  const definitions = Object.fromEntries(
    input.definitions.map((definition) => [
      definition.id,
      cloneDefinition(definition),
    ]),
  );
  const catalog: WorldMetricCatalog = {
    catalogVersion: "world-metric-catalog-v2",
    definitions,
    definitionOrder: input.definitions.map((definition) => definition.id),
  };
  assertWorldMetricCatalogIntegrity(catalog);
  return cloneWorldMetricCatalog(catalog);
}

export function createSyntheticWorldMetricCatalog(): WorldMetricCatalog {
  const residentPopulation = createWorldMetricDefinition({
    stableKey: "population.resident-count",
    name: "Resident population",
    description: "Canonical resident population at an explicit point in time.",
    domainKey: "population.demography",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("count:people"),
    measureNature: "stock",
    referencePeriodKind: "point",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only across caller-proven disjoint geographic scopes.",
    stateSemantics: "primitive",
    tags: ["population.residents"],
  });
  const employmentRate = createWorldMetricDefinition({
    stableKey: "labor.employment-rate",
    name: "Employment rate",
    description: "Employment share measured over an explicit interval.",
    domainKey: "labor.employment",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("rate:share"),
    measureNature: "rate",
    referencePeriodKind: "interval",
    denominatorMetricId: residentPopulation.id,
    aggregationKind: "derived-only",
    aggregationNote:
      "Rates require denominator-aware derivation and cannot be summed directly.",
    stateSemantics: "primitive",
    tags: ["labor.rate"],
  });
  const aggregateIncome = createWorldMetricDefinition({
    stableKey: "income.aggregate-personal",
    name: "Aggregate personal income",
    description: "Exact aggregate personal income over an explicit interval.",
    domainKey: "economy.income",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only for the same currency, period, and disjoint scopes.",
    stateSemantics: "primitive",
    tags: ["economy.income"],
  });
  const laborForce = createWorldMetricDefinition({
    stableKey: "labor.force-count",
    name: "Labor force",
    description: "Canonical labor-force population at a point in time.",
    domainKey: "labor.population",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("count:people"),
    measureNature: "stock",
    referencePeriodKind: "point",
    denominatorMetricId: residentPopulation.id,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only across caller-proven disjoint scopes at the same point.",
    stateSemantics: "primitive",
    tags: ["labor.population"],
  });
  const employedPopulation = createWorldMetricDefinition({
    stableKey: "labor.employed-count",
    name: "Employed population",
    description:
      "Canonical employed labor-force population at a point in time.",
    domainKey: "labor.population",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("count:people"),
    measureNature: "stock",
    referencePeriodKind: "point",
    denominatorMetricId: laborForce.id,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only across caller-proven disjoint scopes at the same point.",
    stateSemantics: "primitive",
    tags: ["labor.employment", "labor.population"],
  });
  const unemployedPopulation = createWorldMetricDefinition({
    stableKey: "labor.unemployed-count",
    name: "Unemployed population",
    description: "Derived labor force minus employed population.",
    domainKey: "labor.population",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("count:people"),
    measureNature: "stock",
    referencePeriodKind: "point",
    denominatorMetricId: laborForce.id,
    aggregationKind: "derived-only",
    aggregationNote:
      "Derived from coherent same-scope labor-force and employed counts; never independently summed or written.",
    stateSemantics: "derived",
    tags: ["labor.unemployment"],
  });
  const unemploymentRate = createWorldMetricDefinition({
    stableKey: "labor.unemployment-rate",
    name: "Unemployment rate",
    description: "Derived unemployed population divided by labor force.",
    domainKey: "labor.employment",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("rate:share"),
    measureNature: "rate",
    referencePeriodKind: "point",
    denominatorMetricId: laborForce.id,
    aggregationKind: "derived-only",
    aggregationNote:
      "Derived from coherent same-scope counts and cannot be summed or written independently.",
    stateSemantics: "derived",
    tags: ["labor.rate", "labor.unemployment"],
  });
  const laborIncome = createWorldMetricDefinition({
    stableKey: "labor.aggregate-income",
    name: "Aggregate labor income",
    description:
      "Exact aggregate labor-income proxy over an explicit interval.",
    domainKey: "labor.income",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only for the same currency, interval, and disjoint scopes.",
    stateSemantics: "primitive",
    tags: ["economy.income", "labor.income"],
  });
  const costLevel = createWorldMetricDefinition({
    stableKey: "prices.cost-level",
    name: "Cost level",
    description: "Exact aggregate price/cost index at a point in time.",
    domainKey: "economy.prices",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("index:cost-level"),
    measureNature: "index",
    referencePeriodKind: "point",
    denominatorMetricId: null,
    aggregationKind: "not-aggregatable",
    aggregationNote: "Index levels cannot be summed across scopes.",
    stateSemantics: "primitive",
    tags: ["economy.cost", "economy.prices"],
  });
  const consumptionDemand = createWorldMetricDefinition({
    stableKey: "economy.consumption-demand",
    name: "Aggregate consumption demand",
    description: "Exact aggregate consumption/demand proxy over an interval.",
    domainKey: "economy.demand",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only for the same currency, interval, and disjoint scopes.",
    stateSemantics: "primitive",
    tags: ["economy.consumption", "economy.demand"],
  });
  const outputActivity = createWorldMetricDefinition({
    stableKey: "economy.output-activity",
    name: "Aggregate output activity",
    description:
      "Exact aggregate output/business-activity proxy over an interval.",
    domainKey: "economy.output",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only for the same currency, interval, and disjoint scopes.",
    stateSemantics: "primitive",
    tags: ["economy.business-activity", "economy.output"],
  });
  const housingPressure = createWorldMetricDefinition({
    stableKey: "housing.availability-pressure",
    name: "Housing availability pressure",
    description:
      "Exact aggregate housing availability/pressure index at a point.",
    domainKey: "housing.conditions",
    valueKind: "quantity",
    quantityUnit: makeQuantityUnitKey("index:housing-pressure"),
    measureNature: "index",
    referencePeriodKind: "point",
    denominatorMetricId: null,
    aggregationKind: "not-aggregatable",
    aggregationNote: "Pressure indexes cannot be summed across scopes.",
    stateSemantics: "primitive",
    tags: ["housing.aggregate", "housing.pressure"],
  });
  const governmentRevenue = createWorldMetricDefinition({
    stableKey: "government.revenue",
    name: "Government revenue",
    description: "Exact aggregate government revenue over an interval.",
    domainKey: "government.fiscal",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only for the same currency, interval, and nonoverlapping fiscal scopes.",
    stateSemantics: "primitive",
    tags: ["government.fiscal", "government.revenue"],
  });
  const governmentOutlays = createWorldMetricDefinition({
    stableKey: "government.outlays",
    name: "Government outlays",
    description: "Exact aggregate government outlays over an interval.",
    domainKey: "government.fiscal",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "sum-compatible",
    aggregationNote:
      "May be summed only for the same currency, interval, and nonoverlapping fiscal scopes.",
    stateSemantics: "primitive",
    tags: ["government.fiscal", "government.outlays"],
  });
  const governmentDebt = createWorldMetricDefinition({
    stableKey: "government.debt",
    name: "Government debt",
    description: "Exact aggregate government debt outstanding at a point.",
    domainKey: "government.fiscal",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "stock",
    referencePeriodKind: "point",
    denominatorMetricId: null,
    aggregationKind: "not-aggregatable",
    aggregationNote:
      "Debt stocks require authority-aware consolidation and cannot be automatically summed.",
    stateSemantics: "primitive",
    tags: ["government.debt", "government.fiscal"],
  });
  const fiscalBalance = createWorldMetricDefinition({
    stableKey: "government.fiscal-balance",
    name: "Government fiscal balance",
    description:
      "Derived revenue minus outlays for one scope, interval, and currency.",
    domainKey: "government.fiscal",
    valueKind: "money",
    quantityUnit: null,
    measureNature: "flow",
    referencePeriodKind: "interval",
    denominatorMetricId: null,
    aggregationKind: "derived-only",
    aggregationNote:
      "Derived from same-scope, same-period, same-currency revenue and outlays; never independently written.",
    stateSemantics: "derived",
    tags: ["government.balance", "government.fiscal"],
  });
  return createWorldMetricCatalog({
    definitions: [
      residentPopulation,
      employmentRate,
      aggregateIncome,
      laborForce,
      employedPopulation,
      unemployedPopulation,
      unemploymentRate,
      laborIncome,
      costLevel,
      consumptionDemand,
      outputActivity,
      housingPressure,
      governmentRevenue,
      governmentOutlays,
      governmentDebt,
      fiscalBalance,
    ],
  });
}

export function cloneWorldMetricCatalog(
  catalog: WorldMetricCatalog,
): WorldMetricCatalog {
  return {
    catalogVersion: catalog.catalogVersion,
    definitions: Object.fromEntries(
      Object.entries(catalog.definitions).map(([id, definition]) => [
        id,
        cloneDefinition(definition),
      ]),
    ),
    definitionOrder: [...catalog.definitionOrder],
  };
}

export function assertWorldMetricCatalogIntegrity(
  catalog: WorldMetricCatalog,
): void {
  if (catalog.catalogVersion !== "world-metric-catalog-v2") {
    throw new Error("Unsupported world-metric catalog version.");
  }
  const recordIds = Object.keys(catalog.definitions).sort();
  const orderIds = [...catalog.definitionOrder].sort();
  if (
    new Set(catalog.definitionOrder).size !== catalog.definitionOrder.length ||
    JSON.stringify(recordIds) !== JSON.stringify(orderIds)
  ) {
    throw new Error("World-metric catalog order and definitions disagree.");
  }
  const stableKeys = new Set<string>();
  for (const id of catalog.definitionOrder) {
    const definition = catalog.definitions[id];
    if (!definition || definition.id !== id) {
      throw new Error(`Missing or miskeyed world-metric definition: ${id}`);
    }
    assertNonEmpty(definition.stableKey, "Metric definition stable key");
    assertDottedContentKey(
      definition.stableKey,
      "Metric definition stable key",
    );
    if (
      definition.id !==
      createStableId(
        "world-metric-definition",
        `definition:${definition.stableKey}`,
      )
    ) {
      throw new Error(`Metric definition ID does not match its key: ${id}`);
    }
    if (stableKeys.has(definition.stableKey)) {
      throw new Error(
        `Duplicate metric definition key: ${definition.stableKey}`,
      );
    }
    stableKeys.add(definition.stableKey);
    assertNonEmpty(definition.name, "Metric definition name");
    assertNonEmpty(definition.description, "Metric definition description");
    assertDottedContentKey(definition.domainKey, "Metric domain key");
    if (!MEASURE_NATURES.includes(definition.measureNature)) {
      throw new Error(`Invalid metric measure nature: ${id}`);
    }
    if (!PERIOD_KINDS.includes(definition.referencePeriodKind)) {
      throw new Error(`Invalid metric reference-period kind: ${id}`);
    }
    if (!AGGREGATION_KINDS.includes(definition.aggregationKind)) {
      throw new Error(`Invalid metric aggregation kind: ${id}`);
    }
    assertNonEmpty(definition.aggregationNote, "Metric aggregation note");
    if (
      definition.stateSemantics !== "primitive" &&
      definition.stateSemantics !== "derived"
    ) {
      throw new Error(`Invalid metric state semantics: ${id}`);
    }
    if (
      definition.stateSemantics === "derived" &&
      definition.aggregationKind !== "derived-only"
    ) {
      throw new Error(
        `Derived metric must use derived-only aggregation: ${id}`,
      );
    }
    if (definition.valueKind === "quantity") {
      if (definition.quantityUnit === null) {
        throw new Error(`Quantity metric requires an expected unit: ${id}`);
      }
      makeQuantityUnitKey(definition.quantityUnit);
    } else if (definition.valueKind === "money") {
      if (definition.quantityUnit !== null) {
        throw new Error(`Money metric cannot declare a quantity unit: ${id}`);
      }
    } else {
      throw new Error(`Invalid metric value kind: ${id}`);
    }
    assertCanonicalDottedKeys(definition.tags, "Metric tag");
  }
  for (const definition of Object.values(catalog.definitions)) {
    if (
      definition.denominatorMetricId !== null &&
      (!catalog.definitions[definition.denominatorMetricId] ||
        definition.denominatorMetricId === definition.id)
    ) {
      throw new Error(
        `Metric denominator reference is missing or self-referential: ${definition.id}`,
      );
    }
  }
}

export function recordWorldMetricState(
  world: World,
  input: RecordWorldMetricStateInput,
): World {
  assertUniqueStableKey(
    world.history.metricStates,
    input.stableKey,
    "metric state",
  );
  const record: WorldMetricStateRecord = {
    ...input,
    id: createStableId("metric-state", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    scope: { ...input.scope },
    referencePeriod: { ...input.referencePeriod },
    value: cloneMetricValue(input.value),
    recordedAt: makeIsoDate(input.recordedAt),
    provenance: cloneStateProvenance(input.provenance),
  };
  validateStateRecord(world, record, world.history.metricStates);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    metricStates: [...world.history.metricStates, record],
  });
}

export function recordWorldMetricObservation(
  world: World,
  input: RecordWorldMetricObservationInput,
): World {
  assertUniqueStableKey(
    world.history.metricObservations,
    input.stableKey,
    "metric observation",
  );
  const record: WorldMetricObservationRecord = {
    ...input,
    id: createStableId("metric-observation", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    scope: { ...input.scope },
    referencePeriod: { ...input.referencePeriod },
    value: cloneMetricValue(input.value),
    sourceReference:
      input.sourceReference === null ? null : { ...input.sourceReference },
    releaseDate: makeIsoDate(input.releaseDate),
    recordedAt: makeIsoDate(input.recordedAt),
    uncertainty: cloneUncertainty(input.uncertainty),
  };
  validateObservationRecord(world, record, world.history.metricObservations);
  return commit(world, {
    ...world.history,
    nextSequence: world.history.nextSequence + 1,
    metricObservations: [...world.history.metricObservations, record],
  });
}

export function worldMetricStateForPeriodAt(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  period: MetricReferencePeriod,
  cutoff: HistoricalCutoff,
): WorldMetricStateRecord | null {
  validateCutoff(world, cutoff);
  validateScope(world, scope);
  validateReferencePeriod(period);
  return (
    world.history.metricStates
      .filter(
        (record) =>
          record.metricId === metricId &&
          sameScope(record.scope, scope) &&
          sameReferencePeriod(record.referencePeriod, period) &&
          stateAvailable(record, cutoff),
      )
      .sort(bySequence)
      .at(-1) ?? null
  );
}

export function mostRecentWorldMetricStateAt(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  cutoff: HistoricalCutoff,
): WorldMetricStateRecord | null {
  validateCutoff(world, cutoff);
  validateScope(world, scope);
  const records = world.history.metricStates.filter(
    (record) =>
      record.metricId === metricId &&
      sameScope(record.scope, scope) &&
      stateAvailable(record, cutoff),
  );
  return records.sort(comparePeriodThenSequence).at(-1) ?? null;
}

export function worldMetricStateHistory(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  cutoff: HistoricalCutoff,
): readonly WorldMetricStateRecord[] {
  validateCutoff(world, cutoff);
  validateScope(world, scope);
  return world.history.metricStates
    .filter(
      (record) =>
        record.metricId === metricId &&
        sameScope(record.scope, scope) &&
        stateAvailable(record, cutoff),
    )
    .sort(bySequence);
}

export function worldMetricObservationHistory(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  sourceSeriesKey: string,
  cutoff: HistoricalCutoff,
): readonly WorldMetricObservationRecord[] {
  validateCutoff(world, cutoff);
  validateScope(world, scope);
  assertDottedContentKey(sourceSeriesKey, "Observation source-series key");
  return world.history.metricObservations
    .filter(
      (record) =>
        record.metricId === metricId &&
        sameScope(record.scope, scope) &&
        record.sourceSeriesKey === sourceSeriesKey &&
        observationAvailable(record, cutoff),
    )
    .sort(bySequence);
}

export function observationVintagesForPeriodAt(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  period: MetricReferencePeriod,
  sourceSeriesKey: string,
  cutoff: HistoricalCutoff,
): readonly WorldMetricObservationRecord[] {
  return worldMetricObservationHistory(
    world,
    metricId,
    scope,
    sourceSeriesKey,
    cutoff,
  ).filter((record) => sameReferencePeriod(record.referencePeriod, period));
}

export function latestObservationForSeriesAt(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  sourceSeriesKey: string,
  cutoff: HistoricalCutoff,
): WorldMetricObservationRecord | null {
  const records = worldMetricObservationHistory(
    world,
    metricId,
    scope,
    sourceSeriesKey,
    cutoff,
  );
  return [...records].sort(comparePeriodThenSequence).at(-1) ?? null;
}

export function observationsAcrossSeriesAt(
  world: World,
  metricId: EntityId,
  scope: MetricScope,
  cutoff: HistoricalCutoff,
): readonly WorldMetricObservationRecord[] {
  validateCutoff(world, cutoff);
  validateScope(world, scope);
  return world.history.metricObservations
    .filter(
      (record) =>
        record.metricId === metricId &&
        sameScope(record.scope, scope) &&
        observationAvailable(record, cutoff),
    )
    .sort(
      (left, right) =>
        left.sourceSeriesKey.localeCompare(right.sourceSeriesKey) ||
        comparePeriodThenSequence(left, right),
    );
}

export function worldMetricEntityExists(world: World, id: EntityId): boolean {
  return (
    world.metricCatalog.definitions[id] !== undefined ||
    world.history.metricStates.some((record) => record.id === id) ||
    world.history.metricObservations.some((record) => record.id === id)
  );
}

export function worldMetricEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (world.metricCatalog.definitions[id]) return true;
  const state = world.history.metricStates.find((record) => record.id === id);
  if (state) {
    return state.recordedAt <= asOfDate && state.sequence < sequenceExclusive;
  }
  const observation = world.history.metricObservations.find(
    (record) => record.id === id,
  );
  return !!(
    observation &&
    observation.releaseDate <= asOfDate &&
    observation.recordedAt <= asOfDate &&
    observation.sequence < sequenceExclusive
  );
}

export function worldMetricHistoryRecords(
  world: World,
): readonly (WorldMetricStateRecord | WorldMetricObservationRecord)[] {
  return [...world.history.metricStates, ...world.history.metricObservations];
}

export function assertWorldMetricIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertWorldMetricCatalogIntegrity(world.metricCatalog);
  assertSequenceOrdered(world.history.metricStates, "metric state");
  assertSequenceOrdered(world.history.metricObservations, "metric observation");
  const priorStates: WorldMetricStateRecord[] = [];
  for (const record of world.history.metricStates) {
    assertHistoryIdentity(ids, world, record, "metric-state");
    validateStateRecord(world, record, priorStates);
    priorStates.push(record);
  }
  const priorObservations: WorldMetricObservationRecord[] = [];
  for (const record of world.history.metricObservations) {
    assertHistoryIdentity(ids, world, record, "metric-observation");
    validateObservationRecord(world, record, priorObservations);
    priorObservations.push(record);
  }
}

function validateStateRecord(
  world: World,
  record: WorldMetricStateRecord,
  priorRecords: readonly WorldMetricStateRecord[],
): void {
  assertNonEmpty(record.stableKey, "Metric-state stable key");
  const definition = requireMetricDefinition(world, record.metricId);
  if (definition.stateSemantics === "derived") {
    throw new Error(
      `Derived metric cannot be committed as independent canonical truth: ${record.metricId}`,
    );
  }
  validateScope(world, record.scope);
  validateReferencePeriodForDefinition(record.referencePeriod, definition);
  validateMetricValue(record.value, definition);
  makeIsoDate(record.recordedAt);
  if (
    record.recordedAt > world.currentDate ||
    referencePeriodEnd(record.referencePeriod) > record.recordedAt
  ) {
    throw new Error(
      `Metric state has invalid recording chronology: ${record.id}`,
    );
  }
  const matching = priorRecords.filter(
    (candidate) =>
      candidate.metricId === record.metricId &&
      sameScope(candidate.scope, record.scope) &&
      sameReferencePeriod(candidate.referencePeriod, record.referencePeriod),
  );
  const previous = [...matching].sort(bySequence).at(-1);
  if (
    (previous === undefined && record.supersedesStateId !== null) ||
    (previous !== undefined && record.supersedesStateId !== previous.id)
  ) {
    throw new Error(
      `Metric-state correction must explicitly supersede the latest matching truth: ${record.id}`,
    );
  }
  if (previous && previous.recordedAt > record.recordedAt) {
    throw new Error(
      `Metric-state correction cannot be recorded before its predecessor: ${record.id}`,
    );
  }
  validateStateProvenance(world, record);
}

function validateObservationRecord(
  world: World,
  record: WorldMetricObservationRecord,
  priorRecords: readonly WorldMetricObservationRecord[],
): void {
  assertNonEmpty(record.stableKey, "Metric-observation stable key");
  const definition = requireMetricDefinition(world, record.metricId);
  validateScope(world, record.scope);
  validateReferencePeriodForDefinition(record.referencePeriod, definition);
  validateMetricValue(record.value, definition);
  assertDottedContentKey(
    record.sourceSeriesKey,
    "Observation source-series key",
  );
  assertNonEmpty(record.sourceLabel, "Observation source label");
  assertDottedContentKey(record.vintageKey, "Observation vintage key");
  if (record.methodologyKey !== null) {
    assertDottedContentKey(
      record.methodologyKey,
      "Observation methodology key",
    );
  }
  if (record.sourceReference !== null) {
    assertNonEmpty(record.sourceReference.title, "Observation source title");
    assertOptional(
      record.sourceReference.locator,
      "Observation source locator",
    );
  }
  makeIsoDate(record.releaseDate);
  makeIsoDate(record.recordedAt);
  if (
    referencePeriodEnd(record.referencePeriod) > record.releaseDate ||
    record.releaseDate > record.recordedAt ||
    record.recordedAt > world.currentDate
  ) {
    throw new Error(`Metric observation has invalid chronology: ${record.id}`);
  }
  validateUncertainty(record.uncertainty, record.value);
  const matching = priorRecords.filter(
    (candidate) =>
      candidate.metricId === record.metricId &&
      sameScope(candidate.scope, record.scope) &&
      sameReferencePeriod(candidate.referencePeriod, record.referencePeriod) &&
      candidate.sourceSeriesKey === record.sourceSeriesKey,
  );
  const previous = [...matching].sort(bySequence).at(-1);
  if (
    (previous === undefined && record.supersedesObservationId !== null) ||
    (previous !== undefined && record.supersedesObservationId !== previous.id)
  ) {
    throw new Error(
      `Observation revision must supersede the latest matching series vintage: ${record.id}`,
    );
  }
  if (previous && previous.releaseDate > record.releaseDate) {
    throw new Error(
      `Observation revision predates its prior release: ${record.id}`,
    );
  }
  if (previous && previous.recordedAt > record.recordedAt) {
    throw new Error(
      `Observation revision cannot be recorded before its predecessor: ${record.id}`,
    );
  }
  if (previous && previous.vintageKey === record.vintageKey) {
    throw new Error(
      `Observation revision requires a new vintage key: ${record.id}`,
    );
  }
  if (record.underlyingStateId !== null) {
    const state = world.history.metricStates.find(
      (candidate) => candidate.id === record.underlyingStateId,
    );
    if (
      !state ||
      state.sequence >= record.sequence ||
      state.recordedAt > record.releaseDate ||
      state.metricId !== record.metricId ||
      !sameScope(state.scope, record.scope) ||
      !sameReferencePeriod(state.referencePeriod, record.referencePeriod)
    ) {
      throw new Error(
        `Observation references unavailable or mismatched canonical state: ${record.id}`,
      );
    }
  }
}

function validateMetricValue(
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
        `Metric quantity unit does not match definition: ${definition.id}`,
      );
    }
  } else {
    makeCurrencyCode(value.money.currency);
    if (!Number.isSafeInteger(value.money.minorUnits)) {
      throw new Error("Metric money must use exact safe integer minor units.");
    }
  }
}

function validateUncertainty(
  uncertainty: MetricObservationUncertainty,
  observed: WorldMetricValue,
): void {
  if (uncertainty.kind === "none") return;
  if (uncertainty.kind === "range") {
    assertCompatibleMetricValues(uncertainty.lower, observed);
    assertCompatibleMetricValues(uncertainty.upper, observed);
    if (compareMetricValues(uncertainty.lower, uncertainty.upper) > 0) {
      throw new Error("Observation uncertainty range is reversed.");
    }
    return;
  }
  if (uncertainty.kind !== "margin-of-error") {
    throw new Error("Observation uncertainty has an invalid kind.");
  }
  assertCompatibleMetricValues(uncertainty.margin, observed);
  if (metricValueSign(uncertainty.margin) < 0) {
    throw new Error("Observation margin of error cannot be negative.");
  }
  if (uncertainty.confidence !== null) {
    assertExactQuantity(uncertainty.confidence);
    if (
      uncertainty.confidence.unit !== "rate:share" ||
      uncertainty.confidence.numerator < 0 ||
      compareExactQuantities(uncertainty.confidence, {
        numerator: 1,
        denominator: 1,
        unit: uncertainty.confidence.unit,
      }) > 0
    ) {
      throw new Error(
        "Observation confidence must be an exact share from zero to one.",
      );
    }
  }
}

function validateStateProvenance(
  world: World,
  record: WorldMetricStateRecord,
): void {
  if (record.provenance.kind === "simulated") {
    const sourceIds = [...record.provenance.sourceEntityIds];
    if (
      JSON.stringify(sourceIds) !==
      JSON.stringify([...new Set(sourceIds)].sort())
    ) {
      throw new Error(
        "Metric-state source entity IDs must be sorted and unique.",
      );
    }
    for (const id of sourceIds) {
      if (
        !canonicalSourceAvailable(world, id, record.recordedAt, record.sequence)
      ) {
        throw new Error(`Metric state references an unavailable source: ${id}`);
      }
    }
  } else if (record.provenance.kind === "initialization") {
    if (record.provenance.sourceReference !== null) {
      assertNonEmpty(
        record.provenance.sourceReference.title,
        "Metric calibration source title",
      );
      assertOptional(
        record.provenance.sourceReference.locator,
        "Metric calibration source locator",
      );
    }
  } else if (record.provenance.kind === "authored") {
    assertNonEmpty(record.provenance.note, "Authored metric-state note");
  } else {
    throw new Error(`Metric state has invalid provenance: ${record.id}`);
  }
}

function canonicalSourceAvailable(
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
  const event = world.history.events.find((record) => record.id === id);
  if (event) {
    return event.recordedAt <= asOfDate && event.sequence < sequenceExclusive;
  }
  const causalRecord = [
    ...world.history.causalProcesses,
    ...world.history.effectActivations,
  ].find((record) => record.id === id);
  if (causalRecord) {
    return (
      causalRecord.recordedAt <= asOfDate &&
      causalRecord.sequence < sequenceExclusive
    );
  }
  const metricRecord = [
    ...world.history.metricStates,
    ...world.history.metricObservations,
  ].find((record) => record.id === id);
  return !!(
    metricRecord &&
    metricRecord.recordedAt <= asOfDate &&
    metricRecord.sequence < sequenceExclusive
  );
}

function validateReferencePeriodForDefinition(
  period: MetricReferencePeriod,
  definition: WorldMetricDefinition,
): void {
  validateReferencePeriod(period);
  if (period.kind !== definition.referencePeriodKind) {
    throw new Error(
      `Metric reference-period kind does not match definition: ${definition.id}`,
    );
  }
}

export function validateReferencePeriod(period: MetricReferencePeriod): void {
  if (period.kind === "point") {
    makeIsoDate(period.at);
    return;
  }
  if (period.kind !== "interval") {
    throw new Error("Metric reference period has an invalid kind.");
  }
  makeIsoDate(period.startsAt);
  makeIsoDate(period.endsAt);
  if (period.endsAt < period.startsAt) {
    throw new Error("Metric reference interval cannot end before it starts.");
  }
}

function validateScope(world: World, scope: MetricScope): void {
  if (!world.jurisdictions[scope.jurisdictionId]) {
    throw new Error(
      `Metric scope references missing jurisdiction: ${scope.jurisdictionId}`,
    );
  }
  if (scope.segmentKey !== null) {
    assertDottedContentKey(scope.segmentKey, "Metric segment key");
  }
}

export function requireMetricDefinition(
  world: World,
  metricId: EntityId,
): WorldMetricDefinition {
  const definition = world.metricCatalog.definitions[metricId];
  if (!definition)
    throw new Error(`Missing world-metric definition: ${metricId}`);
  return definition;
}

export function worldMetricDefinitionByStableKey(
  world: World,
  stableKey: string,
): WorldMetricDefinition {
  assertDottedContentKey(stableKey, "Metric definition stable key");
  const definition = world.metricCatalog.definitionOrder
    .map((id) => world.metricCatalog.definitions[id])
    .find((candidate) => candidate?.stableKey === stableKey);
  if (!definition) {
    throw new Error(`Missing world-metric definition key: ${stableKey}`);
  }
  return definition;
}

function cloneDefinition(
  definition: WorldMetricDefinition,
): WorldMetricDefinition {
  return { ...definition, tags: [...definition.tags] };
}

function cloneMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "quantity"
    ? { kind: "quantity", quantity: { ...value.quantity } }
    : { kind: "money", money: { ...value.money } };
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

function cloneStateProvenance(
  provenance: MetricStateProvenance,
): MetricStateProvenance {
  return provenance.kind === "simulated"
    ? { kind: "simulated", sourceEntityIds: [...provenance.sourceEntityIds] }
    : provenance.kind === "initialization"
      ? {
          kind: "initialization",
          sourceReference:
            provenance.sourceReference === null
              ? null
              : { ...provenance.sourceReference },
        }
      : { ...provenance };
}

export function sameMetricScope(
  left: MetricScope,
  right: MetricScope,
): boolean {
  return (
    left.jurisdictionId === right.jurisdictionId &&
    left.segmentKey === right.segmentKey
  );
}

const sameScope = sameMetricScope;

export function sameReferencePeriod(
  left: MetricReferencePeriod,
  right: MetricReferencePeriod,
): boolean {
  return left.kind === "point"
    ? right.kind === "point" && left.at === right.at
    : right.kind === "interval" &&
        left.startsAt === right.startsAt &&
        left.endsAt === right.endsAt;
}

export function referencePeriodKey(period: MetricReferencePeriod): string {
  validateReferencePeriod(period);
  return period.kind === "point"
    ? `point:${period.at}`
    : `interval:${period.startsAt}:${period.endsAt}`;
}

function referencePeriodStart(period: MetricReferencePeriod): string {
  return period.kind === "point" ? period.at : period.startsAt;
}

function referencePeriodEnd(period: MetricReferencePeriod): string {
  return period.kind === "point" ? period.at : period.endsAt;
}

function comparePeriodThenSequence<
  T extends {
    readonly referencePeriod: MetricReferencePeriod;
    readonly sequence: number;
  },
>(left: T, right: T): number {
  return (
    referencePeriodEnd(left.referencePeriod).localeCompare(
      referencePeriodEnd(right.referencePeriod),
    ) ||
    referencePeriodStart(left.referencePeriod).localeCompare(
      referencePeriodStart(right.referencePeriod),
    ) ||
    left.sequence - right.sequence
  );
}

function stateAvailable(
  record: WorldMetricStateRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
}

function observationAvailable(
  record: WorldMetricObservationRecord,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    record.releaseDate <= cutoff.asOfDate &&
    record.recordedAt <= cutoff.asOfDate &&
    record.sequence < cutoff.historySequenceExclusive
  );
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

function assertCompatibleMetricValues(
  left: WorldMetricValue,
  right: WorldMetricValue,
): void {
  if (left.kind !== right.kind) {
    throw new Error("Observation uncertainty value kind is incompatible.");
  }
  if (
    left.kind === "quantity" &&
    right.kind === "quantity" &&
    left.quantity.unit !== right.quantity.unit
  ) {
    throw new Error("Observation uncertainty quantity unit is incompatible.");
  }
  if (
    left.kind === "money" &&
    right.kind === "money" &&
    left.money.currency !== right.money.currency
  ) {
    throw new Error("Observation uncertainty currency is incompatible.");
  }
  if (left.kind === "quantity") assertExactQuantity(left.quantity);
  else if (!Number.isSafeInteger(left.money.minorUnits)) {
    throw new Error("Observation uncertainty money must use safe integers.");
  }
}

function metricValueSign(value: WorldMetricValue): number {
  return value.kind === "quantity"
    ? Math.sign(value.quantity.numerator)
    : Math.sign(value.money.minorUnits);
}

function canonicalStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function assertCanonicalDottedKeys(
  values: readonly string[],
  label: string,
): void {
  if (JSON.stringify(values) !== JSON.stringify(canonicalStrings(values))) {
    throw new Error(`${label}s must be sorted and unique.`);
  }
  for (const value of values) assertDottedContentKey(value, label);
}

function assertHistoryIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind: "metric-state" | "metric-observation",
): void {
  if (ids.has(record.id)) throw new Error(`Duplicate entity ID: ${record.id}`);
  ids.add(record.id);
  if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
    throw new Error(`${kind} ID does not match stable key: ${record.id}`);
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

function assertOptional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}

export function assertSemanticTransitionKey(
  value: string,
  label: string,
): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}
