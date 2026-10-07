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

type DatedCashMinimumReader = (
  world: World,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  onDate: IsoDate,
  readBalance: DatedCashBalanceReader,
) => number;

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
    // A live frontier changes after the next payment. Keep only immutable
    // historical checkpoints in this batch's reusable readings.
    if (cutoff.historySequenceExclusive === world.history.nextSequence)
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
  const readMinimum: DatedCashMinimumReader = (
    world,
    payer,
    currency,
    onDate,
    read,
  ) => {
    if (
      world.id !== initial.id ||
      world.currentDate !== initial.currentDate ||
      world.history.resourcePositions !== initial.history.resourcePositions ||
      world.history.resourceFlows !== initial.history.resourceFlows
    )
      return minimumDatedCashAt(world, payer, currency, onDate, read);
    const id =
      payer.kind === "person"
        ? payer.personId
        : payer.kind === "household"
          ? payer.householdId
          : payer.organizationId;
    const key = `${payer.kind}:${id}:${currency}:${onDate}`;
    const outcomes = world.history.resourceTransferOutcomes;
    let cached = minima.get(key);
    if (
      cached &&
      (outcomes.length < cached.outcomeCount ||
        (cached.outcomeCount > 0 &&
          outcomes[cached.outcomeCount - 1] !== cached.lastOutcome))
    ) {
      // A different history is outside the forward-only batch contract.
      balances.clear();
      minima.clear();
      cached = undefined;
    }
    if (!cached) {
      const minimum = minimumOutcomeCashAt(
        world,
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
          resourceFlowsTouching(world, payer).map((flow) => flow.id),
        ),
      });
      return Math.min(
        minimum,
        liveBoundaryMinimum(world, payer, currency, onDate, read),
      );
    }
    // Prior checkpoint cutoffs exclude appended payments and remain immutable.
    // Only new outcomes can add checkpoints; the two live boundary readings
    // still include every prior debit before this payment.
    let minimum = cached.minimum;
    for (let index = cached.outcomeCount; index < outcomes.length; index += 1) {
      const outcome = outcomes[index]!;
      if (
        cached.flowIds.has(outcome.resourceFlowId) &&
        outcome.occurredAt >= onDate &&
        outcome.occurredAt <= world.currentDate
      ) {
        const balance = read(world, payer, currency, {
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
      liveBoundaryMinimum(world, payer, currency, onDate, read),
    );
  };
  return (
    world: World,
    payer: ResourcePositionOwner,
    amount: MoneyAmount,
    onDate: IsoDate,
  ) =>
    paymentFromDatedCash(
      world,
      payer,
      amount,
      onDate,
      readBalance,
      readMinimum,
    );
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
  readMinimum: DatedCashMinimumReader = minimumDatedCashAt,
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
  const availableMinor = Math.max(
    0,
    readMinimum(
      world,
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

/** Canonical historical minimum, shared by uncached reads and batch intake. */
function minimumDatedCashAt(
  world: World,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader,
): number {
  return Math.min(
    liveBoundaryMinimum(world, payer, currency, occurredAt, readBalance),
    minimumOutcomeCashAt(world, payer, currency, occurredAt, readBalance),
  );
}

function liveBoundaryMinimum(
  world: World,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader,
): number {
  let minimum = Infinity;
  for (const asOfDate of [occurredAt, world.currentDate]) {
    const balance = readBalance(world, payer, currency, {
      asOfDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (balance !== null) minimum = Math.min(minimum, balance);
  }
  return minimum;
}

function minimumOutcomeCashAt(
  world: World,
  payer: ResourcePositionOwner,
  currency: CurrencyCode,
  occurredAt: IsoDate,
  readBalance: DatedCashBalanceReader,
): number {
  let minimum = Infinity;
  const touching = resourceFlowsTouching(world, payer);
  for (const outcome of resourceTransferOutcomesOfFlows(
    world,
    touching.map((flow) => flow.id),
  )) {
    if (
      outcome.occurredAt >= occurredAt &&
      outcome.occurredAt <= world.currentDate
    ) {
      const balance = readBalance(world, payer, currency, {
        asOfDate: makeIsoDate(outcome.occurredAt),
        historySequenceExclusive: outcome.sequence + 1,
      });
      // Transfers before this position was opened do not establish its cash.
      if (balance !== null) minimum = Math.min(minimum, balance);
    }
  }
  return minimum;
}
