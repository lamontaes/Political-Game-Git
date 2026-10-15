import { eventById } from "../event-index";
import { recordByStableKey, recordsByStringField } from "../history-index";
import { householdMembershipsAt } from "../life-queries";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { publicTaxAccountForJurisdiction } from "../tax-policy";
import type { EntityId, ResourceEndpoint, World } from "../types";
import { REFERRAL_TAG, PROSECUTION_ENDED_EVENT } from "./jail-terms";

export type CashBailPayer =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId };

export interface CashBailInput {
  readonly chargedEventId: EntityId;
  readonly courtId: string;
  readonly defendantId: EntityId;
  readonly payer: CashBailPayer;
  readonly amountMinorUnits: number;
}

/** Full cash only: commercial premiums and researched state deposit exceptions are separate. */
export function payFullCashBail(
  world: World,
  input: CashBailInput,
): {
  readonly world: World;
  readonly status: "paid" | "insufficient-funds" | "unsupported";
  readonly paymentFlowId: EntityId | null;
} {
  const charged = eventById(world, input.chargedEventId);
  const court = world.judiciary?.courts[input.courtId];
  const account =
    court?.jurisdictionId &&
    publicTaxAccountForJurisdiction(world, court.jurisdictionId);
  const currency = money(0, "USD").currency;
  const payer = input.payer;
  const authorizedPayer =
    payer.kind === "person"
      ? payer.personId === input.defendantId
      : householdMembershipsAt(world, input.defendantId).some(
          (row) => row.membership.householdId === payer.householdId,
        );
  if (
    !charged ||
    charged.type !== "justice.charged" ||
    charged.occurredAt > world.currentDate ||
    !charged.tags.includes(`justice.court:${input.courtId}`) ||
    !charged.tags.includes(
      `justice.cash-bail-amount:${input.amountMinorUnits}`,
    ) ||
    !charged.participants.some(
      (p) => p.role === "focus:defendant" && p.personId === input.defendantId,
    ) ||
    !court ||
    !account ||
    !authorizedPayer ||
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0 ||
    !resourcePositionAt(
      world,
      { kind: "organization", organizationId: account.organizationId },
      currency,
    )
  )
    return { world, status: "unsupported", paymentFlowId: null };
  const key = `cash-bail/v1:${charged.id}`;
  const prior = recordByStableKey(world.history.resourceFlows, key);
  if (prior) {
    const outcome = recordsByStringField(
      world.history.resourceTransferOutcomes,
      "resourceFlowId",
      prior.id,
    ).find((row) => row.status === "completed");
    if (
      JSON.stringify(prior.source) !== JSON.stringify(input.payer) ||
      prior.recipient.kind !== "organization" ||
      prior.recipient.organizationId !== account.organizationId ||
      outcome?.transferredAmount.minorUnits !== input.amountMinorUnits
    )
      throw new Error("Conflicting cash bail payment for a saved charge.");
    return { world, status: "paid", paymentFlowId: prior.id };
  }
  const position = resourcePositionAt(world, input.payer, currency);
  if (!position) return { world, status: "unsupported", paymentFlowId: null };
  if (position.liquidBalance.minorUnits < input.amountMinorUnits)
    return { world, status: "insufficient-funds", paymentFlowId: null };
  const amount = money(input.amountMinorUnits, "USD");
  let next = createResourceFlow(world, {
    stableKey: key,
    source: input.payer,
    recipient: { kind: "organization", organizationId: account.organizationId },
    startsAt: world.currentDate,
    amount,
    cadenceKind: "custom:cash-bail",
    basisKind: "custom:refundable-cash-bail",
    basisReference: { kind: "general" },
    restrictionKind: "custom:held-cash-bail",
    jurisdictionId: court.jurisdictionId,
    provenance: { kind: "simulated-event", eventId: charged.id },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${key}:paid`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: amount,
    transferredAmount: amount,
    status: "completed",
    reasonKind: null,
    note: `Full cash bail held by the government running saved court ${court.courtId}; commercial bond premiums are unsupported.`,
    provenance: flow.provenance,
  });
  return { world: next, status: "paid", paymentFlowId: flow.id };
}

/** Actual refundable balances reserved from a government's spendable cash. */
export function heldCashBailMinorUnits(
  world: World,
  organizationId: EntityId,
): number {
  return recordsByStringField(
    world.history.resourceFlows,
    "basisKind",
    "custom:refundable-cash-bail",
  )
    .filter(
      (flow) =>
        flow.basisKind === "custom:refundable-cash-bail" &&
        flow.recipient.kind === "organization" &&
        flow.recipient.organizationId === organizationId,
    )
    .reduce((total, flow) => {
      const paid = recordsByStringField(
        world.history.resourceTransferOutcomes,
        "resourceFlowId",
        flow.id,
      ).find((row) => row.status === "completed");
      const refund = recordByStableKey(
        world.history.resourceFlows,
        `cash-bail-refund/v1:${flow.id}`,
      );
      const returned =
        refund &&
        recordsByStringField(
          world.history.resourceTransferOutcomes,
          "resourceFlowId",
          refund.id,
        ).find((row) => row.status === "completed");
      return (
        total +
        (paid?.transferredAmount.minorUnits ?? 0) -
        (returned?.transferredAmount.minorUnits ?? 0)
      );
    }, 0);
}

/** Return the saved payer's actual deposit when its saved case closes. No guessed fee. */
export function refundCashBailAtCaseClose(
  world: World,
  endedEventId: EntityId,
): World {
  const ended = eventById(world, endedEventId);
  if (
    !ended ||
    ended.type !== PROSECUTION_ENDED_EVENT ||
    ended.occurredAt !== world.currentDate
  )
    return world;
  const referralTag = ended.tags.find((tag) => tag.startsWith(REFERRAL_TAG));
  if (!referralTag) return world;
  let next = world;
  for (const deposit of recordsByStringField(
    world.history.resourceFlows,
    "basisKind",
    "custom:refundable-cash-bail",
  )) {
    const charged =
      deposit.provenance.kind === "simulated-event"
        ? eventById(world, deposit.provenance.eventId)
        : null;
    if (!charged?.tags.includes(referralTag)) continue;
    const paid = recordsByStringField(
      world.history.resourceTransferOutcomes,
      "resourceFlowId",
      deposit.id,
    ).find((row) => row.status === "completed");
    if (!paid) continue;
    const key = `cash-bail-refund/v1:${deposit.id}`;
    if (recordByStableKey(next.history.resourceFlows, key)) continue;
    const source = deposit.recipient as ResourceEndpoint;
    if (
      source.kind !== "organization" ||
      !resourcePositionAt(next, source, paid.transferredAmount.currency) ||
      resourcePositionAt(next, source, paid.transferredAmount.currency)!
        .liquidBalance.minorUnits < paid.transferredAmount.minorUnits
    )
      continue;
    next = createResourceFlow(next, {
      stableKey: key,
      source,
      recipient: deposit.source,
      startsAt: next.currentDate,
      amount: paid.transferredAmount,
      cadenceKind: "custom:cash-bail-refund",
      basisKind: "custom:cash-bail-refund",
      basisReference: { kind: "general" },
      restrictionKind: "custom:return-cash-bail",
      jurisdictionId: deposit.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: ended.id },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:refunded`,
      resourceFlowId: flow.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      attemptedAmount: paid.transferredAmount,
      transferredAmount: paid.transferredAmount,
      status: "completed",
      reasonKind: null,
      note: "The case closed; the full saved cash deposit returns to its payer. No unsourced court-cost deduction is applied.",
      provenance: flow.provenance,
    });
  }
  return next;
}
