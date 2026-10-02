import { makeIsoDate } from "./dates";
import { money } from "./resources";
import {
  resourceFlowsTouching,
  resourcePositionAt,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import type {
  IsoDate,
  MoneyAmount,
  ResourcePositionOwner,
  ResourceOutcomeReasonKind,
  ResourceTransferOutcomeStatus,
  World,
  HistoricalCutoff,
  CurrencyCode,
} from "./types";

type DatedCashBalanceReader = (
  world: World,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  cutoff: HistoricalCutoff,
) => number | null;

const datedCashBalanceAt: DatedCashBalanceReader = (
  world,
  payer,
  currency,
  cutoff,
) =>
  resourcePositionAt(world, payer, currency, cutoff)?.liquidBalance
    .minorUnits ?? null;

/**
 * Reuse historical checkpoint readings within one forward-only payment batch.
 * Its writer appends outcomes; it cannot change the facts before a cached cutoff.
 * A changed account/flow/date frontier falls back to the canonical uncached read.
 */
export function createDatedCashPaymentReader(initial: World) {
  const balances = new Map<string, Map<number, number | null>>();
  const readBalance: DatedCashBalanceReader = (
    world,
    payer,
    currency,
    cutoff,
  ) => {
    if (
      world.id !== initial.id ||
      world.currentDate !== initial.currentDate ||
      world.history.resourcePositions !== initial.history.resourcePositions ||
      world.history.resourceFlows !== initial.history.resourceFlows
    )
      return datedCashBalanceAt(world, payer, currency, cutoff);
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
        datedCashBalanceAt(world, payer, currency, cutoff),
      );
    return readings.get(cutoff.historySequenceExclusive)!;
  };
  return (
    world: World,
    payer: ResourcePositionOwner,
    amount: MoneyAmount,
    onDate: IsoDate,
  ) => paymentFromDatedCash(world, payer, amount, onDate, readBalance);
}

/**
 * One dated-cash assessment for canonical payment writers. No transfer or
 * balance is created here. Preserve cash already spent after an overdue due
 * date: the payment cannot exceed the lowest recorded balance from then
 * through today. Later income cannot retrospectively fund an earlier bill.
 */
export function paymentFromDatedCash(
  world: World,
  payer: ResourcePositionOwner,
  attemptedAmount: MoneyAmount,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader = datedCashBalanceAt,
): {
  readonly availableMinor: number | null;
  readonly status: ResourceTransferOutcomeStatus;
  readonly transferredAmount: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
} {
  const openingBalance = readBalance(world, payer, attemptedAmount.currency, {
    asOfDate: occurredAt,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (openingBalance === null)
    return {
      availableMinor: null,
      status: "blocked",
      transferredAmount: money(0, attemptedAmount.currency),
      reasonKind: "capacity:money-unknown",
    };
  const checkpoints: HistoricalCutoff[] = [
    {
      asOfDate: occurredAt,
      historySequenceExclusive: world.history.nextSequence,
    },
    {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
  ];
  const touching = resourceFlowsTouching(world, payer);
  for (const outcome of resourceTransferOutcomesOfFlows(
    world,
    touching.map((flow) => flow.id),
  )) {
    if (
      outcome.occurredAt >= occurredAt &&
      outcome.occurredAt <= world.currentDate
    )
      checkpoints.push({
        asOfDate: makeIsoDate(outcome.occurredAt),
        historySequenceExclusive: outcome.sequence + 1,
      });
  }
  const availableMinor = Math.max(
    0,
    Math.min(
      ...checkpoints.flatMap((cutoff) => {
        const balance = readBalance(
          world,
          payer,
          attemptedAmount.currency,
          cutoff,
        );
        // Transfers before this position was opened do not establish its cash.
        return balance === null ? [] : [balance];
      }),
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
