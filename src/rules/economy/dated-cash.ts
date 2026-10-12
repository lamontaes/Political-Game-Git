/** Retained payment classification/minimum/caching; output requests never append transfers. */
import { makeIsoDate } from "../../simulation/dates";
import {
  resourcePositionAt,
  resourceFlowsTouching,
  resourceTransferOutcomesOfFlows,
  type CashFacts,
} from "./cash-positions";
import { money } from "../laws/money-facts";
import type {
  IsoDate,
  MoneyAmount,
  ResourcePositionOwner,
  ResourceOutcomeReasonKind,
  ResourceTransferOutcomeStatus,
  HistoricalCutoff,
  CurrencyCode,
  World,
} from "../../simulation/types";
type DatedCashMinimumReader = (
  facts: CashFacts,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  onDate: IsoDate,
  readBalance: DatedCashBalanceReader,
) => number;
type DatedCashBalanceReader = (
  facts: CashFacts,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  cutoff: HistoricalCutoff,
) => number | null;
const datedCashBalanceAt: DatedCashBalanceReader = (
  facts,
  payer,
  currency,
  cutoff,
) =>
  resourcePositionAt(facts, payer, currency, cutoff)?.liquidBalance
    .minorUnits ?? null;
export function createDatedCashPaymentReader(initial: CashFacts) {
  const balances = new Map<string, Map<number, number | null>>();
  const minima = new Map<
    string,
    {
      minimum: number;
      outcomeCount: number;
      lastOutcome:
        World["history"]["resourceTransferOutcomes"][number] | undefined;
      flowIds: ReadonlySet<string>;
    }
  >();
  const readBalance: DatedCashBalanceReader = (
    facts,
    payer,
    currency,
    cutoff,
  ) => {
    if (
      facts.id !== initial.id ||
      facts.onDate !== initial.onDate ||
      facts.records.resourcePositions !== initial.records.resourcePositions ||
      facts.records.resourceFlows !== initial.records.resourceFlows
    )
      return datedCashBalanceAt(facts, payer, currency, cutoff);
    if (cutoff.historySequenceExclusive === facts.records.nextSequence)
      return datedCashBalanceAt(facts, payer, currency, cutoff);
    const id =
      payer.kind === "person"
        ? payer.personId
        : payer.kind === "household"
          ? payer.householdId
          : payer.organizationId;
    const key = `${payer.kind}:${id}:${currency}:${cutoff.asOfDate}`;
    let readings = balances.get(key);
    if (!readings) {
      readings = new Map();
      balances.set(key, readings);
    }
    if (!readings.has(cutoff.historySequenceExclusive))
      readings.set(
        cutoff.historySequenceExclusive,
        datedCashBalanceAt(facts, payer, currency, cutoff),
      );
    return readings.get(cutoff.historySequenceExclusive)!;
  };
  const readMinimum: DatedCashMinimumReader = (
    facts,
    payer,
    currency,
    onDate,
    read,
  ) => {
    if (
      facts.id !== initial.id ||
      facts.onDate !== initial.onDate ||
      facts.records.resourcePositions !== initial.records.resourcePositions ||
      facts.records.resourceFlows !== initial.records.resourceFlows
    )
      return minimumDatedCashAt(facts, payer, currency, onDate, read);
    const id =
      payer.kind === "person"
        ? payer.personId
        : payer.kind === "household"
          ? payer.householdId
          : payer.organizationId;
    const key = `${payer.kind}:${id}:${currency}:${onDate}`;
    const outcomes = facts.records.resourceTransferOutcomes;
    let cached = minima.get(key);
    if (
      cached &&
      (outcomes.length < cached.outcomeCount ||
        (cached.outcomeCount > 0 &&
          outcomes[cached.outcomeCount - 1] !== cached.lastOutcome))
    ) {
      balances.clear();
      minima.clear();
      cached = undefined;
    }
    if (!cached) {
      const minimum = minimumOutcomeCashAt(
        facts,
        payer,
        currency,
        onDate,
        read,
      );
      minima.set(key, {
        minimum,
        outcomeCount: outcomes.length,
        lastOutcome: outcomes.at(-1),
        flowIds: new Set(
          resourceFlowsTouching(facts, payer).map((flow) => flow.id),
        ),
      });
      return Math.min(
        minimum,
        liveBoundaryMinimum(facts, payer, currency, onDate, read),
      );
    }
    let minimum = cached.minimum;
    for (let index = cached.outcomeCount; index < outcomes.length; index += 1) {
      const outcome = outcomes[index]!;
      if (
        cached.flowIds.has(outcome.resourceFlowId) &&
        outcome.occurredAt >= onDate &&
        outcome.occurredAt <= facts.onDate
      ) {
        const balance = read(facts, payer, currency, {
          asOfDate: makeIsoDate(outcome.occurredAt),
          historySequenceExclusive: outcome.sequence + 1,
        });
        if (balance !== null) minimum = Math.min(minimum, balance);
      }
    }
    cached.minimum = minimum;
    cached.outcomeCount = outcomes.length;
    cached.lastOutcome = outcomes.at(-1);
    return Math.min(
      minimum,
      liveBoundaryMinimum(facts, payer, currency, onDate, read),
    );
  };
  return (
    facts: CashFacts,
    payer: ResourcePositionOwner,
    amount: MoneyAmount,
    onDate: IsoDate,
  ) =>
    paymentFromDatedCash(
      facts,
      payer,
      amount,
      onDate,
      readBalance,
      readMinimum,
    );
}
export function paymentFromDatedCash(
  facts: CashFacts,
  payer: ResourcePositionOwner,
  attemptedAmount: MoneyAmount,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader = datedCashBalanceAt,
  readMinimum: DatedCashMinimumReader = minimumDatedCashAt,
): {
  readonly availableMinor: number | null;
  readonly status: ResourceTransferOutcomeStatus;
  readonly transferredAmount: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
} {
  const openingBalance = readBalance(facts, payer, attemptedAmount.currency, {
    asOfDate: occurredAt,
    historySequenceExclusive: facts.records.nextSequence,
  });
  if (openingBalance === null)
    return {
      availableMinor: null,
      status: "blocked",
      transferredAmount: money(0, attemptedAmount.currency),
      reasonKind: "capacity:money-unknown",
    };
  const availableMinor = Math.max(
    0,
    readMinimum(
      facts,
      payer,
      attemptedAmount.currency,
      occurredAt,
      readBalance,
    ),
  );
  const paid = Math.min(availableMinor, attemptedAmount.minorUnits);
  const status =
    paid === attemptedAmount.minorUnits
      ? "completed"
      : paid > 0
        ? "partial"
        : "missed";
  return {
    availableMinor,
    status,
    transferredAmount: money(paid, attemptedAmount.currency),
    reasonKind: status === "completed" ? null : "capacity:insufficient-funds",
  };
}
function minimumDatedCashAt(
  facts: CashFacts,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader,
): number {
  return Math.min(
    liveBoundaryMinimum(facts, payer, currency, occurredAt, readBalance),
    minimumOutcomeCashAt(facts, payer, currency, occurredAt, readBalance),
  );
}
function liveBoundaryMinimum(
  facts: CashFacts,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader,
): number {
  let minimum = Infinity;
  for (const asOfDate of [occurredAt, facts.onDate]) {
    const balance = readBalance(facts, payer, currency, {
      asOfDate,
      historySequenceExclusive: facts.records.nextSequence,
    });
    if (balance !== null) minimum = Math.min(minimum, balance);
  }
  return minimum;
}
function minimumOutcomeCashAt(
  facts: CashFacts,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader,
): number {
  let minimum = Infinity;
  const touching = resourceFlowsTouching(facts, payer);
  for (const outcome of resourceTransferOutcomesOfFlows(
    facts,
    touching.map((flow) => flow.id),
  )) {
    if (
      outcome.occurredAt >= occurredAt &&
      outcome.occurredAt <= facts.onDate
    ) {
      const balance = readBalance(facts, payer, currency, {
        asOfDate: makeIsoDate(outcome.occurredAt),
        historySequenceExclusive: outcome.sequence + 1,
      });
      if (balance !== null) minimum = Math.min(minimum, balance);
    }
  }
  return minimum;
}
