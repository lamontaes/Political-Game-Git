import {
  createResourceFlow,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { currentResourceCutoff, resourcePositionAt } from "../resource-queries";
import { pressRecordsOfKind } from "./store";
import type { EntityId, World } from "../types";

const USD = makeCurrencyCode("USD");

/** Records the existing one-time purchase payment through the financial engine.
 * The caller supplies the actual reviewed asking terms, funded buyer, saved
 * acquisition event and seller; this adapter creates no cash or asking price.
 */
export function recordMediaPurchasePayment(
  world: World,
  input: {
    readonly stableKey: string;
    readonly sellerOrganizationId: EntityId;
    readonly sellerName: string;
    readonly outletName: string;
    readonly jurisdictionId: EntityId | null;
    readonly eventId: EntityId;
    readonly priceMinorUnits: number;
  } & (
    | {
        readonly buyerPersonId: EntityId;
        readonly buyerOrganizationId?: never;
        readonly decisionMakerPersonId?: never;
      }
    | {
        readonly buyerOrganizationId: EntityId;
        readonly decisionMakerPersonId: EntityId;
        readonly buyerPersonId?: never;
      }
  ),
): World {
  const buyer =
    input.buyerOrganizationId !== undefined
      ? {
          kind: "organization" as const,
          organizationId: input.buyerOrganizationId,
        }
      : { kind: "person" as const, personId: input.buyerPersonId };
  if (buyer.kind === "organization") {
    if (
      !world.people[input.decisionMakerPersonId!] ||
      !pressRecordsOfKind(world, "media-owner").some(
        (owner) =>
          owner.organizationId === buyer.organizationId &&
          owner.principalPersonId === input.decisionMakerPersonId,
      )
    )
      return world;
  } else if (!world.people[buyer.personId]) return world;
  const funds = resourcePositionAt(
    world,
    buyer,
    USD,
    currentResourceCutoff(world),
  );
  if (
    !funds ||
    !Number.isSafeInteger(input.priceMinorUnits) ||
    input.priceMinorUnits <= 0 ||
    funds.liquidBalance.minorUnits < input.priceMinorUnits
  )
    return world;
  let next = world;
  const amount = money(input.priceMinorUnits, USD);
  next = createResourceFlow(next, {
    stableKey: `${input.stableKey}:payment`,
    source: buyer,
    recipient: {
      kind: "organization",
      organizationId: input.sellerOrganizationId,
    },
    startsAt: next.currentDate,
    initialStatus: "active",
    amount,
    cadenceKind: "schedule:one-time",
    basisKind: "custom:outlet-purchase",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: input.eventId },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${input.stableKey}:paid`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    status: "completed",
    attemptedAmount: amount,
    transferredAmount: amount,
    reasonKind: null,
    note: `Paid to ${input.sellerName} for ${input.outletName}.`,
    provenance: { kind: "simulated-event", eventId: input.eventId },
  });
  return next;
}
