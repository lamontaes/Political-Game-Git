import { resolveTransitFunding } from "../simulation/transit-funding";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  World,
} from "../simulation/types";

type ContractCost = {
  readonly asOf: IsoDate;
  readonly firstPeriodAmount: MoneyAmount;
  readonly secondPeriodAmount: MoneyAmount;
};

export type TransitCashSnapshot =
  | { readonly kind: "authority-unavailable"; readonly reason: string }
  | { readonly kind: "already-requested"; readonly requestEventId: EntityId }
  | (ContractCost & {
      readonly kind: "account-missing" | "balance-missing";
      readonly reason: string;
    })
  | (ContractCost & {
      readonly kind: "recorded-cash";
      readonly publicOrganizationId: EntityId;
      readonly recordedLiquidBalance: MoneyAmount;
      readonly firstPeriodCash: "sufficient" | "insufficient";
    });

/**
 * Canonical read, not a payment preview or an actor's knowledge assertion.
 * The ordinary transit projector gates this read by the controlled office.
 * Nothing is reserved; due-time authority and payment remain with their writers.
 */
export function projectTransitCashSnapshot(
  world: World,
  measureId: EntityId,
): TransitCashSnapshot {
  const funding = resolveTransitFunding(world, measureId);
  if (funding.kind === "unavailable")
    return { kind: "authority-unavailable", reason: funding.reason };
  const request = world.history.events.find(
    (event) => event.stableKey === `transit-request:${measureId}`,
  );
  if (request) return { kind: "already-requested", requestEventId: request.id };

  const amount = funding.mandate.amount;
  const first = Math.floor(amount.minorUnits / 2);
  const cost: ContractCost = {
    asOf: world.currentDate,
    firstPeriodAmount: money(first, amount.currency),
    secondPeriodAmount: money(amount.minorUnits - first, amount.currency),
  };
  const account = publicTaxAccountForJurisdiction(
    world,
    funding.mandate.jurisdictionId,
  );
  if (!account)
    return {
      kind: "account-missing",
      ...cost,
      reason: "No existing same-jurisdiction public receipts account.",
    };
  const position = resourcePositionAt(
    world,
    { kind: "organization", organizationId: account.organizationId },
    amount.currency,
  );
  if (!position)
    return {
      kind: "balance-missing",
      ...cost,
      reason: "The public account has no recorded balance in this currency.",
    };
  return {
    kind: "recorded-cash",
    ...cost,
    publicOrganizationId: account.organizationId,
    recordedLiquidBalance: position.liquidBalance,
    firstPeriodCash:
      position.liquidBalance.minorUnits >= first
        ? "sufficient"
        : "insufficient",
  };
}
