// PLACEHOLDER(research: federal-person-law-estimates): HUD payment standard and 30% gross recorded income approximate the adjusted-income benefit.
import rule from "../../data/research/housing/federal-voucher-estimate.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import { recordByStableKey } from "./history-index";
import { lawEffectStamp } from "./law-effect-stamp";
import { recordLawExposure } from "./law-exposure";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { housingTenureStateAt, resourcePositionAt } from "./resource-queries";
import { householdMembershipsAt } from "./life-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { publicTaxAccountForJurisdiction } from "./tax-policy";
import type { EntityId, IsoDate, World } from "./types";

export const FEDERAL_VOUCHER_QUESTION =
  "us-federal-positions:housing.vouchers-for-every-eligible-family";

export interface VoucherRentInput {
  readonly onDate: IsoDate;
  readonly tenancyId: EntityId;
  readonly leaseholderId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly grossRentMinor: number;
  readonly paymentStandardMinor: number;
  readonly monthlyIncomeMinor: number;
  readonly annualIncomeLimitMinor: number;
  readonly incomeEstimatedFrom?: string;
}

/** A voucher supplements the tenant's cash before the existing rent writer pays the landlord. */
export function payFederalHousingVoucher(
  world: World,
  input: VoucherRentInput,
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === FEDERAL_VOUCHER_QUESTION,
  );
  const law =
    proposition &&
    lawInForce(world, input.jurisdictionId, proposition.id, input.onDate);
  if (law?.answer !== "yes" || input.onDate > world.currentDate) return world;
  const values = [
    input.grossRentMinor,
    input.paymentStandardMinor,
    input.monthlyIncomeMinor,
    input.annualIncomeLimitMinor,
  ];
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0))
    return world;
  if (input.monthlyIncomeMinor * 12 > input.annualIncomeLimitMinor)
    return world;
  const entitled = Math.max(
    0,
    Math.min(input.grossRentMinor, input.paymentStandardMinor) -
      Math.round(input.monthlyIncomeMinor * rule.tenantIncomeShare),
  );
  if (entitled === 0) return world;
  const stableKey = `federal-voucher:${input.tenancyId}:${input.onDate.slice(0, 7)}`;
  if (
    recordByStableKey(
      world.history.resourceTransferOutcomes,
      `${stableKey}:paid`,
    )
  )
    return world;
  const tenancy = world.history.housingTenures.find(
    (row) => row.id === input.tenancyId,
  );
  const cutoff = {
    asOfDate: input.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  if (
    !tenancy ||
    !world.people[input.leaseholderId] ||
    tenancy.startedAt > input.onDate ||
    !tenancy.kind.startsWith("lease:") ||
    housingTenureStateAt(world, tenancy.id, cutoff)?.status !== "active"
  )
    return world;
  const holder = tenancy.holder;
  const heldByRecipient =
    holder.kind === "person"
      ? holder.personId === input.leaseholderId
      : holder.kind === "household" &&
        householdMembershipsAt(world, input.leaseholderId, cutoff).some(
          ({ membership, state }) =>
            membership.householdId === holder.householdId &&
            state.status === "resident" &&
            state.residenceRole === "primary",
        );
  const dwelling = world.history.dwellings.find(
    (row) => row.id === tenancy.dwellingId,
  );
  if (!heldByRecipient || dwelling?.jurisdictionId !== input.jurisdictionId)
    return world;
  const account = publicTaxAccountForJurisdiction(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
  );
  if (!account) return world;
  const source = {
    kind: "organization" as const,
    organizationId: account.organizationId,
  };
  const recipient = { kind: "person" as const, personId: input.leaseholderId };
  const cash = resourcePositionAt(world, source, "USD");
  if (!cash || !resourcePositionAt(world, recipient, "USD")) return world;
  const paid = Math.min(entitled, Math.max(0, cash.liquidBalance.minorUnits));
  if (paid === 0) return world;
  const provenance = {
    kind: "source-record" as const,
    reference: [rule.estimatedFrom, input.incomeEstimatedFrom]
      .filter(Boolean)
      .join("; "),
    asOf: input.onDate,
  };
  let next = createResourceFlow(world, {
    stableKey,
    source,
    recipient,
    startsAt: input.onDate,
    amount: money(entitled, "USD"),
    cadenceKind: "support:monthly",
    basisKind: "housing:voucher",
    basisReference: { kind: "housing", housingTenureId: input.tenancyId },
    restrictionKind: "purpose:housing",
    jurisdictionId: input.jurisdictionId,
    provenance,
  });
  const flow = next.history.resourceFlows.at(-1)!;
  const stamp = lawEffectStamp(law, {
    effectKind: "service-delivered",
    questionKey: FEDERAL_VOUCHER_QUESTION,
    jurisdictionId: input.jurisdictionId,
    appliedAt: input.onDate,
    sourceRecordIds: [input.tenancyId, flow.id],
  });
  next = recordResourceTransferOutcome(next, {
    stableKey: `${stableKey}:paid`,
    resourceFlowId: flow.id,
    periodStartsAt: input.onDate,
    periodEndsAt: input.onDate,
    occurredAt: input.onDate,
    attemptedAmount: money(entitled, "USD"),
    transferredAmount: money(paid, "USD"),
    status: paid === entitled ? "completed" : "partial",
    reasonKind: paid === entitled ? null : "capacity:insufficient-funds",
    note: FEDERAL_VOUCHER_QUESTION,
    provenance,
    lawEffectStamps: stamp ? [stamp] : [],
  });
  return recordLawExposure(next, {
    stableKey: `${stableKey}:exposure`,
    personId: input.leaseholderId,
    measureId: law.measureId,
    sectionKey: FEDERAL_VOUCHER_QUESTION,
    channel: "benefit",
    direction: "gain",
    amount: money(paid, "USD"),
    cadence: "monthly",
    sourceRecordId: next.history.resourceTransferOutcomes.at(-1)!.id,
  });
}
