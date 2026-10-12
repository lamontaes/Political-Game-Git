/** KEEP saved-occurrence joins, chronology and allocation arithmetic. Public-account lookup is an explicit dated identity receipt. */
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  World,
} from "../../simulation/types";
import type { TaxBaseRecord } from "../../simulation/tax-types";
import { isTaxQuantity } from "../../simulation/tax-types";
import { canonicalJson } from "../../simulation/canonical-json";
export interface TaxOccurrenceFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly federalId: EntityId;
  readonly people: World["people"];
  readonly jurisdictions: World["jurisdictions"];
  readonly events: World["history"]["events"];
  readonly resourceTransferOutcomes: World["history"]["resourceTransferOutcomes"];
  readonly resourceFlows: World["history"]["resourceFlows"];
  readonly workRelationships: World["history"]["workRelationships"];
  readonly statutoryTaxLiabilities: NonNullable<
    World["history"]["statutoryTaxLiabilities"]
  >;
  readonly statutoryTaxPayments: NonNullable<
    World["history"]["statutoryTaxPayments"]
  >;
  readonly taxProposals: NonNullable<World["history"]["taxProposals"]>;
  readonly taxPolicies: NonNullable<World["history"]["taxPolicies"]>;
  readonly taxBases: NonNullable<World["history"]["taxBases"]>;
  readonly taxAssessments: NonNullable<World["history"]["taxAssessments"]>;
  readonly taxCollections: NonNullable<World["history"]["taxCollections"]>;
  readonly stateJurisdictions: ReadonlyMap<string, { readonly id: EntityId }>;
  readonly accounts: ReadonlyMap<
    string,
    { readonly organizationId: EntityId } | null
  >;
}
export function accountReceiptKey(id: EntityId, cutoff: HistoricalCutoff) {
  return JSON.stringify([id, cutoff.asOfDate, cutoff.historySequenceExclusive]);
}
function recordById<T extends { readonly id: EntityId }>(
  rows: readonly T[],
  id: EntityId,
) {
  return rows.find((row) => row.id === id);
}
function recordsByStringField<T, K extends keyof T>(
  rows: readonly T[],
  field: K,
  value: T[K],
) {
  return rows.filter((row) => row[field] === value);
}
export function taxBaseOccurrenceSource(
  facts: TaxOccurrenceFacts,
  sourceId: EntityId,
  cutoff: HistoricalCutoff = {
    asOfDate: facts.onDate,
    historySequenceExclusive: facts.nextSequence,
  },
) {
  const visible = (row: { recordedAt: string; sequence: number }) =>
    row.recordedAt <= cutoff.asOfDate &&
    row.sequence < cutoff.historySequenceExclusive;
  const event = recordById(facts.events, sourceId);
  if (event)
    return visible(event)
      ? {
          kind: "event" as const,
          occurredAt: event.occurredAt,
          recordedAt: event.recordedAt,
          sequence: event.sequence,
          jurisdictionId: event.jurisdictionId,
          sourceRecordIds: [event.id],
          eventRecord: event,
        }
      : null;
  const jurisdictionForAuthority = (authorityKey: string) => {
    const id =
      authorityKey === "US"
        ? facts.federalId
        : facts.stateJurisdictions.get(authorityKey)?.id;
    return id && facts.jurisdictions[id] ? id : null;
  };
  const liability = recordById(facts.statutoryTaxLiabilities ?? [], sourceId);
  if (liability) {
    const input = recordedPaycheckTaxInput(facts, liability.sourceOutcomeId);
    const jurisdictionId = jurisdictionForAuthority(liability.authorityKey);
    if (
      !visible(liability) ||
      input.kind !== "recorded" ||
      !input.statutoryLiabilityIds.includes(liability.id) ||
      !jurisdictionId ||
      liability.occurredAt > cutoff.asOfDate
    )
      return null;
    return {
      kind: "statutory-liability" as const,
      occurredAt: liability.occurredAt,
      recordedAt: liability.recordedAt,
      sequence: liability.sequence,
      jurisdictionId,
      payer: liability.payer,
      amount: liability.wages,
      liabilityIds: [liability.id],
      liabilityRecord: liability,
      paymentIds: input.statutoryCollections
        .filter(
          (row) =>
            row.liabilityId === liability.id &&
            visible(
              recordById(facts.statutoryTaxPayments ?? [], row.paymentId)!,
            ),
        )
        .map((row) => row.paymentId),
      sourceRecordIds: [
        liability.id,
        input.outcomeId,
        input.resourceFlowId,
        input.workRelationshipId,
      ],
    };
  }
  const allocations = recordsByStringField(
    facts.statutoryTaxPayments ?? [],
    "resourceOutcomeId",
    sourceId,
  );
  const transfer = recordById(facts.resourceTransferOutcomes, sourceId);
  const flow = transfer
    ? recordById(facts.resourceFlows, transfer.resourceFlowId)
    : null;
  if (
    allocations.length === 0 ||
    !transfer ||
    !flow ||
    transfer.sequence >= cutoff.historySequenceExclusive ||
    transfer.occurredAt > cutoff.asOfDate ||
    (transfer.status !== "completed" && transfer.status !== "partial") ||
    transfer.transferredAmount.minorUnits <= 0 ||
    flow.basisKind !== "custom:tax-withholding" ||
    flow.source.kind !== "person" ||
    flow.recipient.kind !== "organization" ||
    !flow.jurisdictionId ||
    flow.sequence >= transfer.sequence ||
    allocations.some(
      (row) => !visible(row) || row.sequence <= transfer.sequence,
    )
  )
    return null;
  const jurisdictionId = flow.jurisdictionId;
  const account =
    facts.accounts.get(accountReceiptKey(jurisdictionId, cutoff)) ?? null;
  if (!account || account.organizationId !== flow.recipient.organizationId)
    return null;
  for (const allocation of allocations) {
    const row = recordById(
      facts.statutoryTaxLiabilities ?? [],
      allocation.liabilityId,
    );
    if (
      !row ||
      !visible(row) ||
      row.sequence >= allocation.sequence ||
      taxBaseOccurrenceSource(facts, row.id, cutoff)?.kind !==
        "statutory-liability" ||
      row.liability === null ||
      allocation.amount.minorUnits > row.liability.minorUnits ||
      jurisdictionForAuthority(row.authorityKey) !== jurisdictionId ||
      canonicalJson(row.payer) !== canonicalJson(flow.source) ||
      allocation.amount.minorUnits <= 0 ||
      allocation.amount.currency !== transfer.transferredAmount.currency
    )
      return null;
  }
  if (
    allocations.reduce((sum, row) => sum + row.amount.minorUnits, 0) !==
    transfer.transferredAmount.minorUnits
  )
    return null;
  return {
    kind: "statutory-payment" as const,
    occurredAt: transfer.occurredAt,
    recordedAt: allocations.reduce(
      (latest, row) => (row.recordedAt > latest ? row.recordedAt : latest),
      allocations[0]!.recordedAt,
    ),
    sequence: allocations.reduce(
      (latest, row) => Math.max(latest, row.sequence),
      transfer.sequence,
    ),
    jurisdictionId,
    payer: flow.source,
    amount: transfer.transferredAmount,
    liabilityIds: allocations.map((row) => row.liabilityId),
    liabilityRecords: allocations.map((row) =>
      recordById(facts.statutoryTaxLiabilities ?? [], row.liabilityId)!,
    ),
    paymentIds: allocations.map((row) => row.id),
    paymentRecords: allocations,
    transferRecord: transfer,
    flowRecord: flow,
    sourceRecordIds: [
      transfer.id,
      flow.id,
      account.organizationId,
      ...allocations.flatMap((row) => [row.id, row.liabilityId]),
    ],
  };
}

export function taxBaseMatchesOccurrenceSource(
  base: Pick<
    TaxBaseRecord,
    | "occurredAt"
    | "recordedAt"
    | "sequence"
    | "jurisdictionId"
    | "payer"
    | "amount"
    | "baseKey"
  >,
  source: NonNullable<ReturnType<typeof taxBaseOccurrenceSource>>,
): boolean {
  return (
    base.occurredAt === source.occurredAt &&
    base.recordedAt >= source.recordedAt &&
    base.occurredAt <= base.recordedAt &&
    source.sequence < base.sequence &&
    source.jurisdictionId === base.jurisdictionId &&
    (source.kind === "event"
      ? base.recordedAt === base.occurredAt &&
        (source.eventRecord.type === "tax.declared-occurrence" ||
        source.eventRecord.type === "tax.corporate-income-assessed"
          ? source.eventRecord.context.choice ===
            canonicalJson({
              amount: base.amount,
              baseKey: base.baseKey,
              payer: base.payer,
            })
          : !isTaxQuantity(base.amount) ||
            (base.payer.kind === "person" &&
              source.eventRecord.involvedEntityIds.includes(
                base.payer.personId,
              ) &&
              source.eventRecord.context.choice ===
                canonicalJson({ amount: base.amount, baseKey: base.baseKey })))
      : canonicalJson(base.payer) === canonicalJson(source.payer) &&
        canonicalJson(base.amount) === canonicalJson(source.amount))
  );
}

export function recordedPaycheckTaxInput(
  facts: TaxOccurrenceFacts,
  outcomeId: EntityId,
) {
  const unavailable = (reason: string) => ({
    kind: "unavailable" as const,
    reason,
  });
  const outcome = recordById(facts.resourceTransferOutcomes, outcomeId);
  const flow = outcome
    ? recordById(facts.resourceFlows, outcome.resourceFlowId)
    : undefined;
  const work =
    flow?.basisReference.kind === "work"
      ? recordById(
          facts.workRelationships,
          flow.basisReference.workRelationshipId,
        )
      : undefined;
  if (
    !outcome ||
    !flow ||
    !work ||
    flow.source.kind !== "organization" ||
    flow.recipient.kind !== "person" ||
    work.organizationId !== flow.source.organizationId ||
    work.personId !== flow.recipient.personId ||
    !facts.people[work.personId] ||
    flow.sequence >= outcome.sequence ||
    work.sequence >= outcome.sequence ||
    outcome.occurredAt > facts.onDate ||
    (outcome.status !== "completed" && outcome.status !== "partial") ||
    outcome.transferredAmount.minorUnits <= 0
  )
    return unavailable("No saved positive payment to its actual worker.");
  const liabilities = recordsByStringField(
    facts.statutoryTaxLiabilities ?? [],
    "sourceOutcomeId",
    outcome.id,
  ).filter(
    (row) =>
      row.occurredAt === outcome.occurredAt &&
      row.sequence > outcome.sequence &&
      canonicalJson(row.wages) === canonicalJson(outcome.transferredAmount) &&
      ((row.payer.kind === "person" && row.payer.personId === work.personId) ||
        (row.payer.kind === "organization" &&
          row.payer.organizationId === work.organizationId)),
  );
  const payments = liabilities.flatMap((row) =>
    recordsByStringField(
      facts.statutoryTaxPayments ?? [],
      "liabilityId",
      row.id,
    ).filter((payment) => {
      const transfer = recordById(
        facts.resourceTransferOutcomes,
        payment.resourceOutcomeId,
      );
      return (
        transfer &&
        (transfer.status === "completed" || transfer.status === "partial") &&
        transfer.transferredAmount.minorUnits > 0 &&
        payment.sequence > transfer.sequence &&
        payment.amount.minorUnits > 0 &&
        payment.amount.currency === transfer.transferredAmount.currency &&
        recordsByStringField(
          facts.statutoryTaxPayments ?? [],
          "resourceOutcomeId",
          transfer.id,
        ).reduce((sum, allocation) => sum + allocation.amount.minorUnits, 0) <=
          transfer.transferredAmount.minorUnits
      );
    }),
  );
  return {
    kind: "recorded" as const,
    outcomeId: outcome.id,
    resourceFlowId: flow.id,
    workRelationshipId: work.id,
    personId: work.personId,
    organizationId: flow.source.organizationId,
    occurredAt: outcome.occurredAt,
    amount: outcome.transferredAmount,
    statutoryLiabilityIds: liabilities.map((row) => row.id),
    statutoryPaymentIds: payments.map((row) => row.id),
    statutoryCollections: payments.map((row) => ({
      paymentId: row.id,
      liabilityId: row.liabilityId,
      resourceOutcomeId: row.resourceOutcomeId,
      amount: row.amount,
    })),
  };
}

export function taxEntityAvailableAt(
  facts: TaxOccurrenceFacts,
  id: EntityId,
  at: string,
  sequenceExclusive: number,
): boolean {
  return taxRecordLists(facts).some((rows) =>
    recordsByStringField(rows, "id", id).some(
      (row) => row.recordedAt <= at && row.sequence < sequenceExclusive,
    ),
  );
}

function taxRecordLists(facts: TaxOccurrenceFacts): readonly (readonly {
  readonly id: EntityId;
  readonly recordedAt: string;
  readonly sequence: number;
}[])[] {
  const history = facts;
  return [
    history.taxProposals ?? EMPTY_TAX_ROWS,
    history.taxPolicies ?? EMPTY_TAX_ROWS,
    history.taxBases ?? EMPTY_TAX_ROWS,
    history.taxAssessments ?? EMPTY_TAX_ROWS,
    history.taxCollections ?? EMPTY_TAX_ROWS,
    history.statutoryTaxLiabilities ?? EMPTY_TAX_ROWS,
    history.statutoryTaxPayments ?? EMPTY_TAX_ROWS,
  ];
}

const EMPTY_TAX_ROWS: readonly never[] = [];
