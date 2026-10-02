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
  const checkpoints = new Set<IsoDate>([occurredAt, world.currentDate]);
  const touching = resourceFlowsTouching(world, payer);
  for (const outcome of resourceTransferOutcomesOfFlows(
    world,
    touching.map((flow) => flow.id),
  )) {
    if (
      outcome.occurredAt > occurredAt &&
      outcome.occurredAt < world.currentDate
    )
      checkpoints.add(makeIsoDate(outcome.occurredAt));
  }
  const availableMinor = Math.max(
    0,
    Math.min(
      ...[...checkpoints].map(
        (asOfDate) =>
          resourcePositionAt(world, payer, attemptedAmount.currency, {
            asOfDate,
            historySequenceExclusive: world.history.nextSequence,
          })!.liquidBalance.minorUnits,
      ),
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
