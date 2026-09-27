import { makeIsoDate } from "./dates";
import { makeCurrencyCode } from "./resources";
import type { EntityId, IsoDate, MoneyAmount, World } from "./types";
import {
  recordWorldMetricState,
  worldMetricStateForPeriodAt,
} from "./world-metrics";

export type GovernmentFiscalFlowMetric =
  "government.revenue" | "government.outlays";

/**
 * Record completed, modeled public cash flows against the exact jurisdiction
 * and day they occurred. A missing flow stays missing; this writer does not
 * manufacture an opening balance or infer that an appropriation was paid.
 */
export function recordDailyGovernmentFiscalFlow(
  world: World,
  input: {
    readonly metricStableKey: GovernmentFiscalFlowMetric;
    readonly jurisdictionId: EntityId;
    readonly occurredAt: IsoDate | string;
    readonly amounts: readonly MoneyAmount[];
    readonly sourceEventIds: readonly EntityId[];
  },
): World {
  const date = makeIsoDate(input.occurredAt);
  if (date > world.currentDate)
    throw new Error(
      "A government fiscal flow cannot be recorded before it occurs.",
    );
  const sourceEventIds = [...new Set(input.sourceEventIds)].sort();
  if (sourceEventIds.length === 0 || input.amounts.length === 0) return world;

  const currency = input.amounts[0]!.currency;
  let totalMinorUnits = 0n;
  for (const amount of input.amounts) {
    if (
      amount.currency !== currency ||
      !Number.isSafeInteger(amount.minorUnits) ||
      amount.minorUnits < 0
    )
      throw new Error(
        "A government fiscal flow needs nonnegative amounts in one currency.",
      );
    totalMinorUnits += BigInt(amount.minorUnits);
  }
  if (totalMinorUnits === 0n) return world;
  const minorUnits = Number(totalMinorUnits);
  if (!Number.isSafeInteger(minorUnits))
    throw new Error("A government fiscal flow exceeds exact safe minor units.");

  const metric = Object.values(world.metricCatalog.definitions).find(
    (definition) => definition.stableKey === input.metricStableKey,
  );
  if (!metric)
    throw new Error(`Production metric is missing: ${input.metricStableKey}`);

  // Date intervals are inclusive, so a same-day interval represents one
  // calendar day's receipts or payments and can be corrected as later flows
  // for that jurisdiction arrive.
  const referencePeriod = {
    kind: "interval" as const,
    startsAt: date,
    endsAt: date,
  };
  const scope = { jurisdictionId: input.jurisdictionId, segmentKey: null };
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const previous = worldMetricStateForPeriodAt(
    world,
    metric.id,
    scope,
    referencePeriod,
    cutoff,
  );
  return recordWorldMetricState(world, {
    stableKey: `government-fiscal:${input.metricStableKey}:${input.jurisdictionId}:${date}:${world.history.nextSequence}`,
    metricId: metric.id,
    scope,
    referencePeriod,
    value: {
      kind: "money",
      money: { minorUnits, currency: makeCurrencyCode(currency) },
    },
    recordedAt: world.currentDate,
    provenance: { kind: "simulated", sourceEntityIds: sourceEventIds },
    supersedesStateId: previous?.id ?? null,
  });
}
