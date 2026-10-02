import { recordById } from "../history-index";
import { organizationProfileAt } from "../life-queries";
import { TOWN_SALES_RECEIPT_BASIS } from "../living-world/town-sales-receipts";
import { currentResourceCutoff } from "../resource-queries";
import type { EntityId, HistoricalCutoff, World } from "../types";

/** The paid sales input, before any cannabis allocation or tax rate.
 * The producer has already removed credited receipts. Neither annual books,
 * attempted transfers nor the town's taxable-sales index are paid dollars.
 */
export function recordedTownSalesTaxInput(
  world: World,
  outcomeId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
) {
  const unavailable = (reason: string) => ({
    kind: "unavailable" as const,
    reason,
  });
  const outcome = recordById(world.history.resourceTransferOutcomes, outcomeId);
  const flow = outcome
    ? recordById(world.history.resourceFlows, outcome.resourceFlowId)
    : null;
  if (
    !outcome ||
    !flow ||
    flow.basisKind !== TOWN_SALES_RECEIPT_BASIS ||
    flow.recipient.kind !== "organization" ||
    !flow.jurisdictionId ||
    !world.jurisdictions[flow.jurisdictionId] ||
    flow.sequence >= outcome.sequence ||
    outcome.sequence >= cutoff.historySequenceExclusive ||
    flow.recordedAt > cutoff.asOfDate ||
    outcome.occurredAt > cutoff.asOfDate ||
    outcome.occurredAt !== outcome.periodEndsAt ||
    outcome.periodStartsAt !== flow.startsAt ||
    outcome.periodStartsAt >= outcome.periodEndsAt ||
    (outcome.status !== "completed" && outcome.status !== "partial") ||
    outcome.transferredAmount.currency !== "USD" ||
    outcome.transferredAmount.minorUnits <= 0
  )
    return unavailable("No visible positive native recorded-sales receipt.");
  const profile = organizationProfileAt(world, flow.recipient.organizationId, {
    asOfDate: outcome.occurredAt,
    historySequenceExclusive: outcome.sequence,
  });
  if (!profile || profile.locationJurisdictionId !== flow.jurisdictionId)
    return unavailable("The receipt has no saved seller in its actual town.");
  return {
    kind: "recorded" as const,
    outcomeId: outcome.id,
    resourceFlowId: flow.id,
    payer: flow.recipient,
    jurisdictionId: flow.jurisdictionId,
    occurredAt: outcome.occurredAt,
    periodStartsAt: outcome.periodStartsAt,
    periodEndsAt: outcome.periodEndsAt,
    amount: outcome.transferredAmount,
    sourceRecordIds: [outcome.id, flow.id, profile.id],
  };
}
