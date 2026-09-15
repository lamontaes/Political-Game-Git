import { canonicalJson } from "./canonical-json";
import { addDays, makeIsoDate } from "./dates";
import { currentMeasureProvisions } from "./legislative-politics";
import {
  publicTaxAccountForJurisdiction,
  taxPowerEvidenceFor,
} from "./tax-policy";
import { resourcePositionAt, resourceFlowTermsAt } from "./resource-queries";
import { createResourceFlow, recordResourceTransferOutcome } from "./resources";
import { recordWorldEvent } from "./world";
import { stateJurisdictionForKey } from "./life-places";
import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  ResourceEndpoint,
  World,
} from "./types";

/** Derived from an operative canonical appropriation, not a new ledger or
 * authority record. T's resolver owns program/price/administrative interpretation.
 */
export interface PublicFundingMandate {
  readonly version: string;
  readonly fundingId: EntityId;
  readonly measureId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly provisionIds: readonly EntityId[];
  readonly amount: MoneyAmount;
  readonly availableAt: IsoDate;
  readonly endsAt: IsoDate | null;
  readonly administrativeEventId: EntityId;
  readonly programKey: string;
}
export type PublicFundingResolver = (
  world: World,
  measureId: EntityId,
) =>
  | { readonly kind: "available"; readonly mandate: PublicFundingMandate }
  | { readonly kind: "unavailable"; readonly reason: string };
export interface PublicPaymentInput {
  readonly fundingId: EntityId;
  readonly measureId: EntityId;
  readonly expectedProvisionIds: readonly EntityId[];
  readonly operationKey: string;
  readonly requestedAmount: MoneyAmount;
  readonly recipient: ResourceEndpoint;
}
export type PublicPaymentResult =
  | {
      readonly kind: "paid";
      readonly world: World;
      readonly outcomeId: EntityId;
      readonly publicOrganizationId: EntityId;
    }
  | {
      readonly kind: "refused";
      readonly world: World;
      readonly reason: string;
    };
const flowKey = (input: PublicPaymentInput) =>
  `public-payment:${input.fundingId}:${input.operationKey}`;
export const administrativeMandateText = (programKey: string) =>
  `The state government shall administer this appropriation for ${programKey}; legislative sponsorship does not confer spending authority.`;
export const fundingAvailabilityText = (endsAt: IsoDate | null) =>
  endsAt === null
    ? "The amount appropriated by this Act remains available until expended."
    : `The amount appropriated by this Act remains available through ${endsAt}.`;
export const PUBLIC_FUNDING_DEFAULT_DATE_TEXT =
  "This Act takes effect ninety days after enactment.";
/** The one state whose sourced default effective date and acquired tax power
 * this funding contract has compiled. A reader names it; nothing infers it. */
export const PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY = "US-AK";

/** Pure shared checks also run on reload at the payment's sequence/date.
 * The adopted text must explicitly carry administrative/date/availability
 * mandates. Generic old appropriations are not silently promoted into them.
 */
export function assertPublicFundingMandate(
  world: World,
  mandate: PublicFundingMandate,
  sequenceExclusive = world.history.nextSequence,
  at: IsoDate = world.currentDate,
): void {
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.id === mandate.fundingId && row.sequence < sequenceExclusive,
  );
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === mandate.measureId && row.sequence < sequenceExclusive,
  );
  const historical = {
    ...world,
    history: {
      ...world.history,
      legislativeProvisions: world.history.legislativeProvisions?.filter(
        (row) => row.sequence < sequenceExclusive,
      ),
    },
  };
  const provisions = currentMeasureProvisions(historical, mandate.measureId);
  const ids = provisions.map((row) => row.id).sort();
  const amount = provisions.find(
    (row) => row.provisionKey === "amount-provided",
  );
  const admin = provisions.find(
    (row) => row.provisionKey === "administrative-mandate",
  );
  const availability = provisions.find(
    (row) => row.provisionKey === "availability",
  );
  const effective = provisions.find(
    (row) =>
      row.provisionKey === "effective-date" ||
      row.provisionKey === "transit-effective-date",
  );
  const power = taxPowerEvidenceFor(
    PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY,
  );
  const defaultDate =
    !!power &&
    measure?.jurisdictionId ===
      stateJurisdictionForKey(PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY)
        ?.id &&
    effective?.text === PUBLIC_FUNDING_DEFAULT_DATE_TEXT &&
    mandate.availableAt === addDays(enactment?.resolvedAt ?? at, 90);
  if (
    !mandate.version.trim() ||
    !/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/.test(mandate.programKey) ||
    !enactment ||
    enactment.outcome !== "enacted" ||
    enactment.measureId !== mandate.measureId ||
    enactment.resolvedAt > at ||
    !measure ||
    measure.subjectClass !== "appropriation" ||
    measure.jurisdictionId !== mandate.jurisdictionId ||
    canonicalJson(ids) !== canonicalJson(mandate.provisionIds) ||
    !Number.isSafeInteger(mandate.amount.minorUnits) ||
    mandate.amount.minorUnits <= 0 ||
    mandate.amount.currency !== "USD" ||
    amount?.fiscalExposureMinorUnits !== mandate.amount.minorUnits ||
    !admin?.text.startsWith(
      "The state government shall administer this appropriation",
    ) ||
    !(
      availability?.text === fundingAvailabilityText(mandate.endsAt) ||
      (availability?.text ===
        "The appropriation remains available for 365 days after its effective date. No payment may be made before its effective date or after its availability expires." &&
        mandate.endsAt === addDays(mandate.availableAt, 365))
    ) ||
    (enactment.effectiveAt === null
      ? !defaultDate
      : enactment.effectiveAt !== mandate.availableAt) ||
    mandate.administrativeEventId !== enactment.outcomeEventId ||
    makeIsoDate(mandate.availableAt) > at ||
    (mandate.endsAt !== null &&
      (makeIsoDate(mandate.endsAt) < mandate.availableAt ||
        mandate.endsAt < at))
  )
    throw new Error(
      "The public payment lacks a matching operative appropriation, administrative mandate or availability.",
    );
}

/** A canonical administrative spending mandate authorizes the government, not
 * the requesting member. Every successful operation debits the existing public
 * account once; cash absence/refusal writes no fake payment or opening money.
 */
export function settlePublicResourcePayment(
  world: World,
  input: PublicPaymentInput,
  resolveFunding: PublicFundingResolver,
): PublicPaymentResult {
  const refuse = (reason: string): PublicPaymentResult => ({
    kind: "refused",
    world,
    reason,
  });
  if (
    !input.operationKey.trim() ||
    !Number.isSafeInteger(input.requestedAmount.minorUnits) ||
    input.requestedAmount.minorUnits <= 0
  )
    return refuse(
      "A public payment needs a stable operation key and positive exact amount.",
    );
  const prior = world.history.resourceFlows.find(
    (row) => row.stableKey === flowKey(input),
  );
  if (prior) {
    const terms = resourceFlowTermsAt(world, prior.id);
    const outcome = world.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === prior.id && row.status === "completed",
    );
    if (
      prior.basisReference.kind !== "public-funding" ||
      prior.basisReference.mandate.measureId !== input.measureId ||
      canonicalJson(prior.basisReference.mandate.provisionIds) !==
        canonicalJson(input.expectedProvisionIds) ||
      canonicalJson(prior.recipient) !== canonicalJson(input.recipient) ||
      canonicalJson(terms?.amount) !== canonicalJson(input.requestedAmount) ||
      !outcome ||
      prior.source.kind !== "organization"
    )
      return refuse(
        "A public payment operation cannot be overwritten or replayed with different terms.",
      );
    return {
      kind: "paid",
      world,
      outcomeId: outcome.id,
      publicOrganizationId: prior.source.organizationId,
    };
  }
  const resolved = resolveFunding(world, input.measureId);
  if (resolved.kind !== "available") return refuse(resolved.reason);
  const mandate = resolved.mandate;
  if (
    mandate.fundingId !== input.fundingId ||
    mandate.measureId !== input.measureId ||
    canonicalJson(mandate.provisionIds) !==
      canonicalJson(input.expectedProvisionIds) ||
    mandate.amount.currency !== input.requestedAmount.currency
  )
    return refuse(
      "The requested funding identity, version or currency changed.",
    );
  try {
    assertPublicFundingMandate(world, mandate);
  } catch (error) {
    return refuse((error as Error).message);
  }
  const account = publicTaxAccountForJurisdiction(
    world,
    mandate.jurisdictionId,
  );
  if (!account)
    return refuse("No existing same-jurisdiction public receipts account.");
  if (
    input.recipient.kind === "organization" &&
    input.recipient.organizationId === account.organizationId
  )
    return refuse("The public account cannot pay itself.");
  if (
    input.recipient.kind === "organization" &&
    world.history.campaigns?.some(
      (row) =>
        input.recipient.kind === "organization" &&
        row.organizationId === input.recipient.organizationId,
    )
  )
    return refuse(
      "This public-purpose payment cannot fund a campaign account.",
    );
  if (
    input.recipient.kind === "organization" &&
    world.history.organizationProfiles.some(
      (row) =>
        input.recipient.kind === "organization" &&
        row.organizationId === input.recipient.organizationId &&
        row.effectiveAt <= world.currentDate &&
        row.classification === "custom:political-campaign",
    )
  )
    return refuse("Public-purpose payments cannot fund a campaign account.");
  const liquidity = resourcePositionAt(
    world,
    { kind: "organization", organizationId: account.organizationId },
    input.requestedAmount.currency,
  );
  if (
    !liquidity ||
    liquidity.liquidBalance.minorUnits < input.requestedAmount.minorUnits
  )
    return refuse(
      "Actual same-jurisdiction public cash is absent or insufficient; an appropriation or forecast is not cash.",
    );
  const spent = world.history.resourceTransferOutcomes
    .filter(
      (row) =>
        row.status === "completed" &&
        world.history.resourceFlows.some(
          (flow) =>
            flow.id === row.resourceFlowId &&
            flow.basisReference.kind === "public-funding" &&
            flow.basisReference.mandate.fundingId === mandate.fundingId,
        ),
    )
    .reduce(
      (total, row) => total + BigInt(row.transferredAmount.minorUnits),
      0n,
    );
  if (
    spent + BigInt(input.requestedAmount.minorUnits) >
    BigInt(mandate.amount.minorUnits)
  )
    return refuse("This payment exceeds the remaining enacted appropriation.");
  let next = recordWorldEvent(world, {
    stableKey: `event:${flowKey(input)}`,
    type: "fiscal.public-payment",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: mandate.jurisdictionId,
    involvedEntityIds: [mandate.measureId, account.organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fiscal"],
    summary: `An operative authored appropriation paid ${input.requestedAmount.minorUnits} ${input.requestedAmount.currency} minor units for ${mandate.programKey}. This records actual modeled public expenditure.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = createResourceFlow(next, {
    stableKey: flowKey(input),
    source: { kind: "organization", organizationId: account.organizationId },
    recipient: input.recipient,
    startsAt: next.currentDate,
    amount: input.requestedAmount,
    cadenceKind: "custom:public-payment",
    basisKind: "custom:authorized-public-payment",
    basisReference: {
      kind: "public-funding",
      mandate: structuredClone(mandate),
      operationKey: input.operationKey,
    },
    restrictionKind: "purpose:public-service",
    jurisdictionId: mandate.jurisdictionId,
    provenance: {
      kind: "simulated-event",
      eventId: next.history.events.at(-1)!.id,
    },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${flowKey(input)}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: input.requestedAmount,
    transferredAmount: input.requestedAmount,
    status: "completed",
    reasonKind: null,
    note: `Operative funding ${mandate.fundingId}; government administrative mandate, not member spending authority.`,
    provenance: flow.provenance,
  });
  return {
    kind: "paid",
    world: next,
    outcomeId: next.history.resourceTransferOutcomes.at(-1)!.id,
    publicOrganizationId: account.organizationId,
  };
}

export function assertPublicPaymentIntegrity(world: World): void {
  for (const flow of world.history.resourceFlows) {
    if (flow.basisReference.kind !== "public-funding") continue;
    const mandate = flow.basisReference.mandate;
    assertPublicFundingMandate(world, mandate, flow.sequence, flow.recordedAt);
    const account = publicTaxAccountForJurisdiction(
      world,
      mandate.jurisdictionId,
    );
    if (
      !account ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !== account.organizationId ||
      flow.jurisdictionId !== mandate.jurisdictionId ||
      flow.stableKey !==
        `public-payment:${mandate.fundingId}:${flow.basisReference.operationKey}`
    )
      throw new Error(
        "Public payment lost its public-account or operation binding.",
      );
    const outcomes = world.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flow.id,
    );
    if (outcomes.length > 1)
      throw new Error("A public payment operation cannot debit twice.");
    for (const outcome of outcomes) {
      const funds = resourcePositionAt(
        world,
        { kind: "organization", organizationId: account.organizationId },
        outcome.transferredAmount.currency,
        {
          asOfDate: outcome.occurredAt,
          historySequenceExclusive: outcome.sequence,
        },
      );
      const spent = world.history.resourceTransferOutcomes
        .filter(
          (row) =>
            row.sequence <= outcome.sequence &&
            row.status === "completed" &&
            world.history.resourceFlows.some(
              (other) =>
                other.id === row.resourceFlowId &&
                other.basisReference.kind === "public-funding" &&
                other.basisReference.mandate.fundingId === mandate.fundingId,
            ),
        )
        .reduce(
          (total, row) => total + BigInt(row.transferredAmount.minorUnits),
          0n,
        );
      if (
        outcome.status !== "completed" ||
        outcome.occurredAt !== flow.recordedAt ||
        !funds ||
        funds.liquidBalance.minorUnits < outcome.transferredAmount.minorUnits ||
        spent > BigInt(mandate.amount.minorUnits)
      )
        throw new Error(
          "Public expenditure exceeds recorded cash or operative funding.",
        );
    }
  }
}
