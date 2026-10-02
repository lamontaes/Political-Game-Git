import {
  aggregateCustomers,
  BUSINESS_REVENUE_BASIS,
} from "../business-receipt-counterparty";
import { organizationProfileAt } from "../life-queries";
import { recordById } from "../history-index";
import {
  currentResourceCutoff,
  resourceFlowsTouching,
  resourceTransferOutcomesForFlow,
  resourcePositionAt,
} from "../resource-queries";
import { paymentFromDatedCash } from "../resource-payments";
import {
  createResourceFlow,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import type { EntityId, IsoDate, World } from "../types";

export const TOWN_SALES_RECEIPT_BASIS = "custom:town-recorded-sales";

/** CTO Oct 2 ruling 4 admits saved quarterly business sales as cash receipts.
 * Already credited receipts are part of sales, never an additional credit.
 * The aggregate counterparty has no invented opening balance.
 */
export function recordTownSalesReceipts(
  world: World,
  town: EntityId,
  periodStartsAt: IsoDate,
  periodEndsAt: IsoDate,
  round: string,
  priceLevel: number,
): World {
  if (!Number.isFinite(priceLevel) || priceLevel <= 0)
    throw new Error(
      "Recorded sales require a positive nominal price conversion.",
    );
  const currency = makeCurrencyCode("USD");
  let next = world;
  for (const books of Object.values(world.townFinances?.businesses ?? {})) {
    if (
      (books.lastRound !== round && round !== `opening:${world.currentDate}`) ||
      organizationProfileAt(world, books.organizationId)
        ?.locationJurisdictionId !== town
    )
      continue;
    const stableKey = `town-sales:${books.organizationId}:${periodStartsAt}:${periodEndsAt}`;
    if (next.history.resourceFlows.some((flow) => flow.stableKey === stableKey))
      continue;
    const recipient = {
      kind: "organization" as const,
      organizationId: books.organizationId,
    };
    const excluded = resourceFlowsTouching(next, recipient)
      .filter(
        (flow) =>
          flow.recipient.kind === "organization" &&
          flow.recipient.organizationId === books.organizationId &&
          (flow.basisKind === BUSINESS_REVENUE_BASIS ||
            flow.basisKind === TOWN_SALES_RECEIPT_BASIS ||
            flow.basisKind === "custom:retail-purchase" ||
            flow.basisKind === "custom:living-costs" ||
            flow.basisKind.startsWith("custom:living-costs.") ||
            flow.basisReference.kind === "public-program" ||
            (flow.source.kind === "organization" &&
              (organizationProfileAt(next, flow.source.organizationId)
                ?.publicGovernmentIdentity !== undefined ||
                organizationProfileAt(
                  next,
                  flow.source.organizationId,
                )?.classification.endsWith(":government") ||
                organizationProfileAt(
                  next,
                  flow.source.organizationId,
                )?.classification.endsWith("-government")))),
      )
      .flatMap((flow) => resourceTransferOutcomesForFlow(next, flow.id))
      .filter(
        (outcome) =>
          (outcome.occurredAt > periodStartsAt ||
            (outcome.occurredAt === periodStartsAt &&
              outcome.periodStartsAt === outcome.periodEndsAt &&
              recordById(next.history.resourceFlows, outcome.resourceFlowId)
                ?.basisKind === TOWN_SALES_RECEIPT_BASIS)) &&
          outcome.occurredAt <= periodEndsAt &&
          outcome.transferredAmount.currency === currency &&
          outcome.transferredAmount.minorUnits > 0,
      );
    const grossMinor = Math.round((books.annualRevenue / 4) * priceLevel * 100);
    if (!Number.isSafeInteger(grossMinor) || grossMinor < 0)
      throw new Error(
        "Recorded quarterly sales must be nonnegative safe minor units.",
      );
    const alreadyPaidMinor = excluded.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    const amount = money(Math.max(0, grossMinor - alreadyPaidMinor), currency);
    if (amount.minorUnits === 0) continue;
    const customers = aggregateCustomers(next, town, periodStartsAt);
    next = customers.world;
    const source = {
      kind: "organization" as const,
      organizationId: customers.organizationId,
    };
    const provenance = {
      kind: "authored" as const,
      note: JSON.stringify({
        authority:
          "CTO 2026-10-02 ruling 4: recorded business sales are period receipts",
        organizationId: books.organizationId,
        round,
        openedAt: books.openedAt,
        annualRevenueConstantDollars: books.annualRevenue,
        basePriceIndex: world.townFinances?.basePriceIndex,
        nominalPriceLevel: priceLevel,
        quartersPerYear: 4,
        grossMinor,
        alreadyPaidMinor,
        excludedOutcomeIds: excluded.map((row) => row.id),
        playerLivingCostsIncludedInSales: true,
      }),
    };
    next = createResourceFlow(next, {
      stableKey,
      source,
      recipient,
      startsAt: periodStartsAt,
      amount,
      cadenceKind: "schedule:one-time",
      basisKind: TOWN_SALES_RECEIPT_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: town,
      provenance,
    });
    const flow = next.history.resourceFlows.at(-1)!;
    const tracked = resourcePositionAt(
      next,
      source,
      currency,
      currentResourceCutoff(next),
    );
    const payment = tracked
      ? paymentFromDatedCash(next, source, amount, periodEndsAt)
      : null;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${stableKey}:receipt`,
      resourceFlowId: flow.id,
      periodStartsAt,
      periodEndsAt,
      occurredAt: periodEndsAt,
      attemptedAmount: amount,
      transferredAmount: payment?.transferredAmount ?? amount,
      status: payment?.status ?? "completed",
      reasonKind: payment?.reasonKind ?? null,
      note: `Recorded sales for ${periodStartsAt} through ${periodEndsAt}; prior receipts included.`,
      provenance,
    });
  }
  return next;
}
