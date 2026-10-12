/** Full retained transfer chronology, inclusive period collision, terms/earned joins, amounts, dated cash, debt and stamp DTO preparation. No World writer. */
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import { recordById, recordsWithFieldValue } from "./raw-record-index";
import { resourceFlowTermsAt as termsAt } from "./credential-pay";
import { resourcePositionAt as positionAt } from "./cash-positions";
import {
  validateEarnedLawPayAssessment as earnedCheck,
  type EarnedPayFacts,
} from "../laws/earned-pay-integrity";
import {
  assertOpenTaxonomyKey,
  RESOURCE_OUTCOME_REASON_NAMESPACES,
} from "../../simulation/taxonomy";
import type { payPayerAt as nativePayer } from "../../simulation/pay-coverage-predicates";
import type {
  CurrencyCode,
  EntityId,
  HistoricalCutoff,
  IsoDate,
  LifeRecordProvenance,
  MoneyAmount,
  ResourceEndpoint,
  ResourceOutcomeReasonKind,
  ResourceFlow,
  ResourceFlowTermsRecord,
  ResourcePositionOwner,
  ResourceTransferOutcome,
  ResourceTransferOutcomeStatus,
  World,
  EarnedLawPayAssessmentRecord,
} from "../../simulation/types";
const CURRENCY_CODE = /^[A-Z]{3}$/;
export interface ResourceSettlementFacts {
  readonly id: EntityId;
  readonly currentDate: IsoDate;
  readonly onDate: IsoDate;
  readonly records: World["history"];
  readonly payers: ReadonlyMap<string, ReturnType<typeof nativePayer>>;
  readonly earned: ReadonlyMap<EntityId, EarnedPayFacts>;
}
export const settlementSourceKey = (...keys: unknown[]) => JSON.stringify(keys);
function eventById(facts: ResourceSettlementFacts, id: EntityId) {
  return recordById(facts.records.events, id);
}
function payPayerAt(
  facts: ResourceSettlementFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  const key = settlementSourceKey(id, cutoff);
  if (!facts.payers.has(key)) throw Error("Missing raw pay payer receipt");
  return facts.payers.get(key)!;
}
function validateEarnedLawPayAssessment(
  facts: ResourceSettlementFacts,
  row: EarnedLawPayAssessmentRecord,
) {
  const source = facts.earned.get(row.id);
  if (!source) throw Error("Missing earned legal source facts");
  return earnedCheck(source, row);
}
function resourceFlowTermsAt(
  facts: ResourceSettlementFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  return termsAt(facts, id, cutoff);
}
function resourcePositionAt(
  facts: ResourceSettlementFacts,
  owner: ResourcePositionOwner,
  currency: CurrencyCode,
  cutoff: HistoricalCutoff,
) {
  return positionAt(facts, owner, currency, cutoff);
}
export function makeCurrencyCode(value: string): CurrencyCode {
  if (!CURRENCY_CODE.test(value)) {
    throw new Error(`Currency code must be three uppercase letters: ${value}`);
  }
  return value as CurrencyCode;
}
export interface RecordResourceTransferOutcomeInput {
  readonly earnedLawPayAssessmentId?: EntityId;
  readonly stableKey: string;
  readonly resourceFlowId: EntityId;
  readonly periodStartsAt: string;
  readonly periodEndsAt: string;
  readonly occurredAt: string;
  readonly status: ResourceTransferOutcomeStatus;
  readonly attemptedAmount: MoneyAmount;
  readonly transferredAmount: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
  readonly note: string | null;
  readonly provenance: LifeRecordProvenance;
}
// STOPGAP: economy.settlement-earned-frontier
export function resourceTransferTermsCutoff(
  facts: ResourceSettlementFacts,
  flow: ResourceFlow,
  periodStartsAt: IsoDate,
  periodEndsAt: IsoDate,
  provenance: LifeRecordProvenance,
  historySequenceExclusive: number = facts.records.nextSequence,
): HistoricalCutoff {
  const current = { asOfDate: periodStartsAt, historySequenceExclusive };
  if (provenance.kind !== "simulated-event") return current;
  const completed = eventById(facts, provenance.eventId);
  if (!completed || completed.sequence >= historySequenceExclusive)
    throw new Error("Resource provenance references an unavailable event.");
  if (completed.type !== "life-paths2.work-session") return current;
  const earnedCutoff = {
    asOfDate: completed.occurredAt,
    historySequenceExclusive: completed.sequence + 1,
  };
  const work =
    flow.basisReference.kind === "work"
      ? recordById(
          facts.records.workRelationships,
          flow.basisReference.workRelationshipId,
        )
      : undefined;
  if (
    !work ||
    flow.source.kind !== "organization" ||
    flow.source.organizationId !== payPayerAt(facts, work.id, earnedCutoff) ||
    flow.recipient.kind !== "person" ||
    flow.recipient.personId !== work.personId ||
    work.sequence >= completed.sequence ||
    flow.sequence >= completed.sequence ||
    !completed.involvedEntityIds.includes(work.id) ||
    !completed.involvedEntityIds.includes(work.personId) ||
    completed.occurredAt !== periodStartsAt ||
    completed.occurredAt !== periodEndsAt ||
    completed.occurredAt < flow.startsAt
  ) {
    throw new Error(
      "Earned transfer terms must bind the saved completed work.",
    );
  }
  return earnedCutoff;
}
export function prepareResourceTransferOutcome(
  facts: ResourceSettlementFacts,
  input: RecordResourceTransferOutcomeInput,
): ResourceTransferOutcome {
  const flow = requireRecord(
    facts.records.resourceFlows,
    input.resourceFlowId,
    "resource flow",
  );
  const periodStartsAt = makeIsoDate(input.periodStartsAt);
  const periodEndsAt = makeIsoDate(input.periodEndsAt);
  const occurredAt = pastOrCurrentDate(
    facts,
    input.occurredAt,
    "Resource transfer outcome",
  );
  if (
    periodStartsAt < flow.startsAt ||
    periodEndsAt < periodStartsAt ||
    occurredAt < periodEndsAt
  ) {
    throw new Error("Resource transfer period/outcome chronology is invalid.");
  }
  if (
    recordsWithFieldValue(
      facts.records.resourceTransferOutcomes,
      "resourceFlowId",
      flow.id,
    ).some((outcome) =>
      settlementPeriodsOverlap(
        periodStartsAt,
        periodEndsAt,
        outcome.periodStartsAt,
        outcome.periodEndsAt,
      ),
    )
  ) {
    throw new Error(
      "A resource flow cannot have overlapping committed settlement periods.",
    );
  }
  const terms = settlementTermsForPeriod(
    facts,
    flow,
    periodStartsAt,
    periodEndsAt,
    resourceTransferTermsCutoff(
      facts,
      flow,
      periodStartsAt,
      periodEndsAt,
      input.provenance,
    ),
  );
  if (!terms || terms.status !== "active") {
    throw new Error("A transfer outcome requires active resource-flow terms.");
  }
  validateMoney(input.attemptedAmount, "Attempted transfer", true);
  validateMoney(input.transferredAmount, "Transferred amount");
  const assessment =
    input.earnedLawPayAssessmentId === undefined
      ? undefined
      : recordById(
          facts.records.earnedLawPayAssessments ?? [],
          input.earnedLawPayAssessmentId,
        );
  if (input.earnedLawPayAssessmentId !== undefined) {
    if (!assessment) throw new Error("Earned pay assessment was not recorded.");
    validateEarnedLawPayAssessment(facts, assessment);
    const cutoff = resourceTransferTermsCutoff(
      facts,
      flow,
      periodStartsAt,
      periodEndsAt,
      input.provenance,
    );
    if (
      input.provenance.kind !== "simulated-event" ||
      input.provenance.eventId !== assessment.completionEventId ||
      assessment.sequence >= facts.records.nextSequence ||
      assessment.recordedAt > occurredAt ||
      assessment.recordedAt < assessment.earnedCutoff.asOfDate ||
      assessment.resourceFlowId !== flow.id ||
      assessment.earnedTermsId !== terms.id ||
      assessment.periodStartsAt !== periodStartsAt ||
      assessment.periodEndsAt !== periodEndsAt ||
      assessment.earnedCutoff.asOfDate !== cutoff.asOfDate ||
      assessment.earnedCutoff.historySequenceExclusive !==
        cutoff.historySequenceExclusive ||
      flow.basisReference.kind !== "work" ||
      flow.basisReference.workRelationshipId !==
        assessment.workRelationshipId ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !==
        payPayerAt(
          facts,
          assessment.workRelationshipId,
          assessment.earnedCutoff,
        ) ||
      flow.recipient.kind !== "person" ||
      flow.recipient.personId !== assessment.personId ||
      !sameMoney(assessment.contractualGross, terms.amount) ||
      assessment.assessedGross.currency !== terms.amount.currency ||
      assessment.assessedGross.minorUnits < terms.amount.minorUnits
    )
      throw new Error(
        "Earned pay assessment must bind this exact completed transfer.",
      );
  }
  const expectedAmount = assessment?.assessedGross ?? terms.amount;
  validateMoney(expectedAmount, "Expected earned transfer", true);
  if (!sameMoney(input.attemptedAmount, expectedAmount)) {
    throw new Error(
      "Attempted transfer must match the effective expected terms.",
    );
  }
  if (input.transferredAmount.currency !== input.attemptedAmount.currency) {
    throw new Error("Attempted and transferred currency must match.");
  }
  validateOutcomeAmounts(
    input.status,
    input.attemptedAmount,
    input.transferredAmount,
  );
  if (input.status === "completed") {
    if (input.reasonKind !== null)
      assertOpenTaxonomyKey(
        input.reasonKind,
        RESOURCE_OUTCOME_REASON_NAMESPACES,
        "Resource outcome reason",
      );
  } else {
    if (input.reasonKind === null)
      throw new Error("A non-completed outcome requires a structured reason.");
    assertOpenTaxonomyKey(
      input.reasonKind,
      RESOURCE_OUTCOME_REASON_NAMESPACES,
      "Resource outcome reason",
    );
  }
  assertOptional(input.note, "Resource outcome note");
  validateLifeProvenance(facts, input.provenance, occurredAt);
  const sourceOwner = endpointPositionOwner(flow.source);
  if (input.transferredAmount.minorUnits > 0) {
    const sourcePosition = resourcePositionAt(
      facts,
      sourceOwner,
      input.transferredAmount.currency,
      {
        asOfDate: occurredAt,
        historySequenceExclusive: facts.records.nextSequence,
      },
    );
    if (
      sourcePosition &&
      sourcePosition.liquidBalance.minorUnits <
        input.transferredAmount.minorUnits
    ) {
      throw new Error(
        "A committed transfer cannot overdraw a tracked liquid position.",
      );
    }
  }
  const obligation = facts.records.resourceObligations.find(
    (record) => record.resourceFlowId === flow.id && record.principal !== null,
  );
  if (obligation?.principal) {
    const outstanding = outstandingDebtAt(facts, obligation.id);
    if (
      outstanding &&
      input.transferredAmount.minorUnits > outstanding.minorUnits
    ) {
      throw new Error(
        "A debt payment cannot exceed the outstanding principal.",
      );
    }
  }
  const record: ResourceTransferOutcome = {
    ...input,
    id: createStableId(
      "resource-transfer-outcome",
      `${facts.id}:${input.stableKey}`,
    ),
    sequence: facts.records.nextSequence,
    periodStartsAt,
    periodEndsAt,
    occurredAt,
    attemptedAmount: { ...input.attemptedAmount },
    transferredAmount: { ...input.transferredAmount },
    provenance: { ...input.provenance },
  };
  const payStamps = assessment?.lawEffectStamps ?? terms.lawEffectStamps;
  if (
    flow.basisReference.kind === "work" &&
    input.transferredAmount.minorUnits > 0 &&
    payStamps?.length
  ) {
    return {
      ...record,
      lawEffectStamps: payStamps.map((stamp) => ({
        ...stamp,
        effectKind: "pay",
        appliedAt: occurredAt,
        sourceRecordIds: [
          ...new Set([
            ...(stamp.sourceRecordIds ?? []),
            terms.id,
            flow.id,
            ...(assessment ? [assessment.id] : []),
            record.id,
          ]),
        ],
      })),
    };
  }
  return record;
}
function settlementTermsForPeriod(
  facts: ResourceSettlementFacts,
  flow: ResourceFlow,
  periodStartsAt: IsoDate,
  periodEndsAt: IsoDate,
  cutoff: HistoricalCutoff = {
    asOfDate: periodStartsAt,
    historySequenceExclusive: facts.records.nextSequence,
  },
): ResourceFlowTermsRecord {
  const terms = resourceFlowTermsAt(facts, flow.id, cutoff);
  if (!terms || terms.status !== "active") {
    throw new Error("A transfer outcome requires active resource-flow terms.");
  }
  if (
    recordsWithFieldValue(
      facts.records.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    ).some(
      (record) =>
        record.sequence < cutoff.historySequenceExclusive &&
        record.effectiveAt > periodStartsAt &&
        record.effectiveAt <= periodEndsAt,
    )
  ) {
    throw new Error(
      "A resource transfer period cannot cross an unprorated terms change.",
    );
  }
  return terms;
}
// STOPGAP: economy.settlement-inclusive-interval
function settlementPeriodsOverlap(
  leftStartsAt: string,
  leftEndsAt: string,
  rightStartsAt: string,
  rightEndsAt: string,
): boolean {
  return leftStartsAt <= rightEndsAt && rightStartsAt <= leftEndsAt;
}
// STOPGAP: economy.settlement-money-and-principal
function validateOutcomeAmounts(
  status: ResourceTransferOutcomeStatus,
  attempted: MoneyAmount,
  transferred: MoneyAmount,
): void {
  if (
    status === "completed" &&
    transferred.minorUnits !== attempted.minorUnits
  ) {
    throw new Error("A completed outcome must transfer the attempted amount.");
  }
  if (
    status === "partial" &&
    !(
      transferred.minorUnits > 0 &&
      transferred.minorUnits < attempted.minorUnits
    )
  ) {
    throw new Error(
      "A partial outcome must transfer more than zero and less than attempted.",
    );
  }
  if (
    (status === "missed" || status === "blocked") &&
    transferred.minorUnits !== 0
  ) {
    throw new Error("A missed or blocked outcome transfers no resources.");
  }
}
function validateMoney(
  amount: MoneyAmount,
  label: string,
  positive = false,
): void {
  makeCurrencyCode(amount.currency);
  if (
    !Number.isSafeInteger(amount.minorUnits) ||
    amount.minorUnits < 0 ||
    (positive && amount.minorUnits === 0)
  ) {
    throw new Error(
      `${label} must use non-negative safe integer minor units${positive ? " greater than zero" : ""}.`,
    );
  }
}
function sameMoney(left: MoneyAmount, right: MoneyAmount): boolean {
  return (
    left.minorUnits === right.minorUnits && left.currency === right.currency
  );
}
function endpointPositionOwner(
  endpoint: ResourceEndpoint,
): ResourcePositionOwner {
  return { ...endpoint };
}
function pastOrCurrentDate(
  facts: ResourceSettlementFacts,
  value: string,
  label: string,
) {
  const date = makeIsoDate(value);
  if (date > facts.currentDate)
    throw new Error(`${label} cannot be in the future.`);
  return date;
}
// STOPGAP: economy.settlement-provenance-stamps
function validateLifeProvenance(
  facts: ResourceSettlementFacts,
  provenance: LifeRecordProvenance,
  effectiveAt: string,
): void {
  switch (provenance.kind) {
    case "authored":
      assertNonEmpty(provenance.note, "Authored resource provenance note");
      return;
    case "generated":
      assertNonEmpty(
        provenance.generatorKey,
        "Generated resource provenance key",
      );
      return;
    case "simulated-event": {
      const event = eventById(facts, provenance.eventId);
      if (
        !event ||
        event.sequence >= facts.records.nextSequence ||
        event.occurredAt > effectiveAt
      ) {
        throw new Error("Resource provenance references an unavailable event.");
      }
      return;
    }
    case "source-record":
      assertNonEmpty(provenance.reference, "Resource source-record reference");
      if (makeIsoDate(provenance.asOf) > effectiveAt)
        throw new Error(
          "Resource source provenance cannot postdate the record.",
        );
      return;
  }
}
function requireRecord<
  T extends {
    readonly id: EntityId;
  },
>(records: readonly T[], id: EntityId, label: string): T {
  const record = recordById(records, id);
  if (!record) throw new Error(`Missing ${label}: ${id}`);
  return record;
}
function assertOptional(value: string | null, label: string): void {
  if (value !== null) assertNonEmpty(value, label);
}
function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new Error(`${label} must be a non-empty string.`);
}
export function currentResourceCutoff(
  facts: ResourceSettlementFacts,
): HistoricalCutoff {
  return {
    asOfDate: facts.onDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
export function resourceTransferOutcomesForFlow(
  facts: ResourceSettlementFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceTransferOutcome[] {
  return facts.records.resourceTransferOutcomes.filter(
    (record) =>
      record.resourceFlowId === resourceFlowId &&
      availableOn(record, record.occurredAt, cutoff),
  );
}
export function outstandingDebtAt(
  facts: ResourceSettlementFacts,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): MoneyAmount | null {
  const obligation = facts.records.resourceObligations.find(
    (record) => record.id === resourceObligationId,
  );
  if (
    !obligation?.principal ||
    !availableOn(obligation, obligation.establishedAt, cutoff)
  ) {
    return null;
  }
  let paid = 0;
  for (const outcome of resourceTransferOutcomesForFlow(
    facts,
    obligation.resourceFlowId,
    cutoff,
  )) {
    if (
      outcome.sequence <= obligation.sequence ||
      outcome.occurredAt < obligation.establishedAt
    ) {
      continue;
    }
    paid = addExact(paid, outcome.transferredAmount.minorUnits);
  }
  let charged = 0;
  for (const charge of facts.records.debtCharges ?? []) {
    if (
      charge.resourceObligationId === obligation.id &&
      availableOn(charge, charge.chargedAt, cutoff)
    )
      charged = addExact(charged, charge.amount.minorUnits);
  }
  let reduced = 0;
  for (const terms of facts.records.loanTerms ?? []) {
    if (
      terms.resourceObligationId === obligation.id &&
      terms.principalReduction &&
      availableOn(terms, terms.effectiveAt, cutoff)
    ) {
      reduced = addExact(reduced, terms.principalReduction.minorUnits);
    }
  }
  for (const discharge of facts.records.loanDischarges ?? []) {
    if (
      discharge.resourceObligationId === obligation.id &&
      availableOn(discharge, discharge.effectiveAt, cutoff)
    )
      reduced = addExact(
        reduced,
        addExact(discharge.principal.minorUnits, discharge.interest.minorUnits),
      );
  }
  return queryMoney(
    Math.max(0, obligation.principal.minorUnits + charged - paid - reduced),
    obligation.principal.currency,
  );
}
function availableOn(
  record: {
    readonly sequence: number;
  },
  date: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    date <= cutoff.asOfDate && record.sequence < cutoff.historySequenceExclusive
  );
}
function addExact(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Exact-money arithmetic exceeded the safe integer range.");
  }
  return result;
}
function queryMoney(minorUnits: number, currency: CurrencyCode): MoneyAmount {
  return { minorUnits, currency };
}
