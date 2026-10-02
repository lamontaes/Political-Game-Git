import { eventById } from "./event-index";
import {
  resourceFlowsTouching,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import type { CurrencyCode, EntityId, World } from "./types";

/** Actual completed payments attributed to one fundraiser, not promises. */
export function campaignFundraiserPayments(
  world: World,
  input: {
    readonly eventId: EntityId;
    readonly committeeOrganizationId: EntityId;
    readonly currency: CurrencyCode;
    readonly historySequenceExclusive?: number;
  },
) {
  const event = eventById(world, input.eventId);
  if (!event || event.occurredAt > world.currentDate)
    throw new Error("A fundraiser needs its recorded, dated event.");
  const flows = resourceFlowsTouching(world, {
    kind: "organization",
    organizationId: input.committeeOrganizationId,
  }).filter(
    (flow) =>
      flow.recipient.kind === "organization" &&
      flow.recipient.organizationId === input.committeeOrganizationId &&
      (flow.source.kind === "person" ||
        (flow.source.kind === "organization" &&
          flow.source.organizationId !== input.committeeOrganizationId)) &&
      flow.basisKind === "custom:campaign-contribution" &&
      flow.restrictionKind === "purpose:campaign" &&
      flow.provenance.kind === "simulated-event" &&
      flow.provenance.eventId === event.id,
  );
  const receipts = resourceTransferOutcomesOfFlows(
    world,
    flows.map((flow) => flow.id),
  ).filter(
    (outcome) =>
      outcome.status === "completed" &&
      outcome.occurredAt === event.occurredAt &&
      outcome.sequence <
        (input.historySequenceExclusive ?? world.history.nextSequence) &&
      outcome.transferredAmount.currency === input.currency,
  );
  return {
    event,
    flows,
    receipts,
    totalMinorUnits: receipts.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    ),
  };
}
