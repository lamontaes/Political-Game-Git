/** Complete retained fiscal metric-state availability and public parent checks/math. */
import { makeIsoDate } from "../../simulation/dates";
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  WorldMetricStateRecord,
  WorldMetricDefinition,
  WorldMetricCatalog,
  DerivedFiscalBalance,
  MetricScope,
  MetricReferencePeriod,
} from "../../simulation/types";
import type { DeriveFiscalBalanceFromStatesInput } from "../../simulation/economy";
export interface FiscalMetricFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly states: readonly WorldMetricStateRecord[];
  readonly catalog: WorldMetricCatalog;
}
const DOTTED_CONTENT_KEY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export function assertDottedContentKey(
  value: string,
  label: string,
): asserts value is `${string}.${string}` {
  if (!DOTTED_CONTENT_KEY_PATTERN.test(value)) {
    throw new Error(`${label} must be a stable dotted content key: ${value}`);
  }
}
export function worldMetricDefinitionByStableKey(
  facts: FiscalMetricFacts,
  stableKey: string,
): WorldMetricDefinition {
  assertDottedContentKey(stableKey, "Metric definition stable key");
  const definition = facts.catalog.definitionOrder
    .map((id) => facts.catalog.definitions[id])
    .find((candidate) => candidate?.stableKey === stableKey);
  if (!definition) {
    throw new Error(`Missing world-metric definition key: ${stableKey}`);
  }
  return definition;
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
export function deriveFiscalBalanceFromStates(
  facts: FiscalMetricFacts,
  input: DeriveFiscalBalanceFromStatesInput,
): DerivedFiscalBalance {
  makeIsoDate(input.cutoff.asOfDate);
  const revenue = availableState(facts, input.revenueStateId, input.cutoff);
  const outlays = availableState(facts, input.outlaysStateId, input.cutoff);
  if (!revenue || !outlays) {
    return {
      status: "unavailable",
      reasonKey: "economy:missing-fiscal-input",
      missingMetricIds: [],
    };
  }
  const revenueMetric = worldMetricDefinitionByStableKey(
    facts,
    "government.revenue",
  );
  const outlaysMetric = worldMetricDefinitionByStableKey(
    facts,
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
  facts: FiscalMetricFacts,
  stateId: EntityId,
  cutoff: HistoricalCutoff,
): WorldMetricStateRecord | null {
  if (
    cutoff.asOfDate > facts.onDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > facts.nextSequence
  ) {
    throw new Error("Historical cutoff is outside world history.");
  }
  const state = facts.states.find((candidate) => candidate.id === stateId);
  return state &&
    state.recordedAt <= cutoff.asOfDate &&
    state.sequence < cutoff.historySequenceExclusive
    ? state
    : null;
}
