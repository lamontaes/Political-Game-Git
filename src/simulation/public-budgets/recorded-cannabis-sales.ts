import { recordById } from "../history-index";
import { organizationProfileAt } from "../life-queries";
import { TOWN_SALES_RECEIPT_BASIS } from "../living-world/town-sales-receipts";
import { currentResourceCutoff } from "../resource-queries";
import share from "../../../data/research/money/cannabis-retail-sales-share.json" with { type: "json" };
import {
  stateKeyForJurisdiction,
  stateJurisdictionForKey,
} from "../life-places";
import { money } from "../resources";
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

/** Selected Oct 2 4:00 reuse option: saved retail receipts are the modeled
 * base. The cited WA taxable-retail share is an explicit estimate
 * of the cannabis portion, not evidence of a particular purchase or exemption.
 */
export function recordedCannabisSalesTaxInput(
  world: World,
  outcomeId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(world),
) {
  const input = recordedTownSalesTaxInput(world, outcomeId, cutoff);
  if (input.kind !== "recorded") return input;
  const profile = organizationProfileAt(world, input.payer.organizationId, {
    asOfDate: input.occurredAt,
    historySequenceExclusive: recordById(
      world.history.resourceTransferOutcomes,
      outcomeId,
    )!.sequence,
  });
  const stateKey = stateKeyForJurisdiction(
    world.jurisdictions[input.jurisdictionId]!,
  );
  const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
  if (
    profile?.classification !== "enterprise:retail" ||
    !state ||
    !world.jurisdictions[state.id]
  )
    return {
      kind: "unavailable" as const,
      reason: "No recorded retail seller and actual state tax jurisdiction.",
    };
  return {
    ...input,
    jurisdictionId: state.id,
    townJurisdictionId: input.jurisdictionId,
    amount: money(
      Math.round(
        (input.amount.minorUnits * share.numerator.amount) /
          share.denominator.amount,
      ),
      input.amount.currency,
    ),
    paidSalesAmount: input.amount,
    allocationNote: `Estimated cannabis portion of this paid retail receipt using ${share.geography} ${share.periodStartsAt} through ${share.periodEndsAt} taxable-retail share; exempt-sales detail is unrecorded. ${share.numerator.sourceUrl}`,
  };
}
