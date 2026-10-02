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
} from "./types";

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
): {
  readonly availableMinor: number | null;
  readonly status: ResourceTransferOutcomeStatus;
  readonly transferredAmount: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
} {
  const position = resourcePositionAt(world, payer, attemptedAmount.currency, {
    asOfDate: occurredAt,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (!position)
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
        const snapshot = resourcePositionAt(
          world,
          payer,
          attemptedAmount.currency,
          cutoff,
        );
        // Transfers before this position was opened do not establish its cash.
        return snapshot ? [snapshot.liquidBalance.minorUnits] : [];
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
