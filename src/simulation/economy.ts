import { makeIsoDate } from "./dates";
import {
  compareExactQuantities,
  createExactQuantity,
  divideExactQuantities,
  subtractExactQuantities,
} from "./quantity";
import type {
  DerivedFiscalBalance,
  DerivedLaborMarket,
  DerivedPurchasingPower,
  EntityId,
  HistoricalCutoff,
  MetricReferencePeriod,
  MetricScope,
  World,
  WorldMetricStateRecord,
} from "./types";
import {
  sameMetricScope,
  sameReferencePeriod,
  worldMetricDefinitionByStableKey,
  worldMetricStateForPeriodAt,
} from "./world-metrics";

export interface DeriveLaborMarketInput {
  readonly scope: MetricScope;
  readonly referencePeriod: Extract<MetricReferencePeriod, { kind: "point" }>;
  readonly cutoff: HistoricalCutoff;
}

export interface DerivePurchasingPowerInput {
  readonly scope: MetricScope;
  readonly nominalIncomePeriod: Extract<
    MetricReferencePeriod,
    { kind: "interval" }
  >;
  readonly costLevelPeriod: Extract<MetricReferencePeriod, { kind: "point" }>;
  readonly cutoff: HistoricalCutoff;
}

export interface DeriveFiscalBalanceInput {
  readonly scope: MetricScope;
  readonly referencePeriod: Extract<
    MetricReferencePeriod,
    { kind: "interval" }
  >;
  readonly cutoff: HistoricalCutoff;
}

export interface DeriveFiscalBalanceFromStatesInput {
  readonly revenueStateId: EntityId;
  readonly outlaysStateId: EntityId;
  readonly cutoff: HistoricalCutoff;
}

export function deriveLaborMarketAt(
  world: World,
  input: DeriveLaborMarketInput,
): DerivedLaborMarket {
  const residentMetric = worldMetricDefinitionByStableKey(
    world,
    "population.resident-count",
  );
  const laborForceMetric = worldMetricDefinitionByStableKey(
    world,
    "labor.force-count",
  );
  const employedMetric = worldMetricDefinitionByStableKey(
    world,
    "labor.employed-count",
  );
  const states = [residentMetric, laborForceMetric, employedMetric].map(
    (definition) =>
      worldMetricStateForPeriodAt(
        world,
        definition.id,
        input.scope,
        input.referencePeriod,
        input.cutoff,
      ),
  );
  const missingMetricIds = states.flatMap((state, index) =>
    state
      ? []
      : [[residentMetric, laborForceMetric, employedMetric][index]!.id],
  );
  if (missingMetricIds.length > 0) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-labor-input",
      missingMetricIds,
    };
  }
  const residentState = states[0];
  const laborForceState = states[1];
  const employedState = states[2];
  if (!residentState || !laborForceState || !employedState) {
    throw new Error("Labor input availability changed during derivation.");
  }
  if (
    residentState.value.kind !== "quantity" ||
    laborForceState.value.kind !== "quantity" ||
    employedState.value.kind !== "quantity"
  ) {
    throw new Error("Labor identities require exact quantity inputs.");
  }
  const residentPopulation = residentState.value.quantity;
  const laborForce = laborForceState.value.quantity;
  const employedPopulation = employedState.value.quantity;
  for (const quantity of [residentPopulation, laborForce, employedPopulation]) {
    if (quantity.unit !== "count:people" || quantity.numerator < 0) {
      throw new Error(
        "Labor population inputs must be nonnegative people counts.",
      );
    }
  }
  if (compareExactQuantities(laborForce, residentPopulation) > 0) {
    throw new Error("Labor force cannot exceed resident population.");
  }
  if (compareExactQuantities(employedPopulation, laborForce) > 0) {
    throw new Error("Employed population cannot exceed labor force.");
  }
  const unemployedPopulation = subtractExactQuantities(
    laborForce,
    employedPopulation,
  );
  if (laborForce.numerator === 0) {
    return {
      status: "unavailable",
      reasonKey: "economy:zero-labor-force",
      missingMetricIds: [],
    };
  }
  return {
    status: "available",
    residentPopulation,
    laborForce,
    employedPopulation,
    unemployedPopulation,
    unemploymentRate: divideExactQuantities(
      unemployedPopulation,
      laborForce,
      "rate:share",
    ),
    sourceStateIds: [
      residentState.id,
      laborForceState.id,
      employedState.id,
    ].sort(),
  };
}

export function derivePurchasingPowerAt(
  world: World,
  input: DerivePurchasingPowerInput,
): DerivedPurchasingPower {
  const nominalMetric = worldMetricDefinitionByStableKey(
    world,
    "income.aggregate-personal",
  );
  const costMetric = worldMetricDefinitionByStableKey(
    world,
    "prices.cost-level",
  );
  const nominalState = worldMetricStateForPeriodAt(
    world,
    nominalMetric.id,
    input.scope,
    input.nominalIncomePeriod,
    input.cutoff,
  );
  const costState = worldMetricStateForPeriodAt(
    world,
    costMetric.id,
    input.scope,
    input.costLevelPeriod,
    input.cutoff,
  );
  const missingMetricIds = [
    ...(nominalState ? [] : [nominalMetric.id]),
    ...(costState ? [] : [costMetric.id]),
  ];
  if (!nominalState || !costState) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-purchasing-power-input",
      missingMetricIds,
    };
  }
  if (
    nominalState.value.kind !== "money" ||
    costState.value.kind !== "quantity" ||
    costState.value.quantity.unit !== "index:cost-level"
  ) {
    throw new Error("Purchasing-power inputs are dimensionally incompatible.");
  }
  if (
    nominalState.value.money.minorUnits < 0 ||
    costState.value.quantity.numerator <= 0
  ) {
    throw new Error(
      "Purchasing-power inputs require nonnegative income and positive cost level.",
    );
  }
  const numerator =
    nominalState.value.money.minorUnits * costState.value.quantity.denominator;
  if (!Number.isSafeInteger(numerator)) {
    throw new Error(
      "Purchasing-power derivation exceeds safe integer precision.",
    );
  }
  return {
    status: "available",
    value: createExactQuantity(
      numerator,
      costState.value.quantity.numerator,
      `purchasing-power:${nominalState.value.money.currency.toLowerCase()}`,
    ),
    nominalIncomeStateId: nominalState.id,
    costLevelStateId: costState.id,
  };
}

export function deriveFiscalBalanceAt(
  world: World,
  input: DeriveFiscalBalanceInput,
): DerivedFiscalBalance {
  const revenueMetric = worldMetricDefinitionByStableKey(
    world,
    "government.revenue",
  );
  const outlaysMetric = worldMetricDefinitionByStableKey(
    world,
    "government.outlays",
  );
  const revenue = worldMetricStateForPeriodAt(
    world,
    revenueMetric.id,
    input.scope,
    input.referencePeriod,
    input.cutoff,
  );
  const outlays = worldMetricStateForPeriodAt(
    world,
    outlaysMetric.id,
    input.scope,
    input.referencePeriod,
    input.cutoff,
  );
  if (!revenue || !outlays) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-fiscal-input",
      missingMetricIds: [
        ...(revenue ? [] : [revenueMetric.id]),
        ...(outlays ? [] : [outlaysMetric.id]),
      ],
    };
  }
  return deriveFiscalBalanceFromStates(world, {
    revenueStateId: revenue.id,
    outlaysStateId: outlays.id,
    cutoff: input.cutoff,
  });
}

export function deriveFiscalBalanceFromStates(
  world: World,
  input: DeriveFiscalBalanceFromStatesInput,
): DerivedFiscalBalance {
  makeIsoDate(input.cutoff.asOfDate);
  const revenue = availableState(world, input.revenueStateId, input.cutoff);
  const outlays = availableState(world, input.outlaysStateId, input.cutoff);
  if (!revenue || !outlays) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-fiscal-input",
      missingMetricIds: [],
    };
  }
  const revenueMetric = worldMetricDefinitionByStableKey(
    world,
    "government.revenue",
  );
  const outlaysMetric = worldMetricDefinitionByStableKey(
    world,
    "government.outlays",
  );
  if (
    revenue.metricId !== revenueMetric.id ||
    outlays.metricId !== outlaysMetric.id ||
    !sameMetricScope(revenue.scope, outlays.scope) ||
    !sameReferencePeriod(revenue.referencePeriod, outlays.referencePeriod) ||
    revenue.referencePeriod.kind !== "interval" ||
    outlays.referencePeriod.kind !== "interval"
  ) {
    throw new Error(
      "Fiscal balance requires matching revenue/outlays scope and interval.",
    );
  }
  if (
    revenue.value.kind !== "money" ||
    outlays.value.kind !== "money" ||
    revenue.value.money.currency !== outlays.value.money.currency
  ) {
    throw new Error(
      "Fiscal balance requires exact revenue/outlays in one currency.",
    );
  }
  const minorUnits =
    revenue.value.money.minorUnits - outlays.value.money.minorUnits;
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error("Fiscal balance exceeds safe integer precision.");
  }
  return {
    status: "available",
    balance: { minorUnits, currency: revenue.value.money.currency },
    revenueStateId: revenue.id,
    outlaysStateId: outlays.id,
  };
}

function availableState(
  world: World,
  stateId: EntityId,
  cutoff: HistoricalCutoff,
): WorldMetricStateRecord | null {
  if (
    cutoff.asOfDate > world.currentDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > world.history.nextSequence
  ) {
    throw new Error("Historical cutoff is outside world history.");
  }
  const state = world.history.metricStates.find(
    (candidate) => candidate.id === stateId,
  );
  return state &&
    state.recordedAt <= cutoff.asOfDate &&
    state.sequence < cutoff.historySequenceExclusive
    ? state
    : null;
}
